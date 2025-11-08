// pages/api/generate-lesson-plan-pdf.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import chromium from '@sparticuz/chromium';
import type { Browser } from 'puppeteer-core';

interface LessonPlanData {
    [key: string]: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let browser: Browser | null = null;
    try {
        const {
            data,
            chapterOrTopicName = null
        } = req.body || {};

        const html = generateHTML(data, chapterOrTopicName);

        const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

        if (isProduction) {
            const executablePath = await chromium.executablePath();

            if (!executablePath) {
                throw new Error('Chromium executable path not found');
            }

            const puppeteerCore = (await import('puppeteer-core')).default;

            browser = await puppeteerCore.launch({
                args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
                executablePath,
                headless: true
            });
        } else {
            const puppeteer = (await import('puppeteer')).default;

            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu'
                ]
            });
        }

        const page = await browser.newPage();

        page.setDefaultNavigationTimeout(90000);
        page.setDefaultTimeout(90000);

        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Wait for fonts to load, especially for Hindi/Devanagari fonts
        try {
            await page.evaluate(async () => {
                // Wait for document fonts to be ready
                if ((document as any).fonts && (document as any).fonts.ready) {
                    await (document as any).fonts.ready;
                }
                
                // Load specific fonts to ensure they're available
                const fonts = [
                    '12pt "Noto Sans Devanagari"',
                    '12pt "Noto Serif Devanagari"'
                ];
                
                if ((document as any).fonts && (document as any).fonts.load) {
                    await Promise.all(
                        fonts.map(font => {
                            try {
                                return (document as any).fonts.load(font);
                            } catch (e) {
                                return Promise.resolve();
                            }
                        })
                    );
                }
                
                // Additional wait to ensure fonts are fully loaded and rendered
                await new Promise(resolve => setTimeout(resolve, 1500));
            });
        } catch (error) {
            console.warn('Font loading warning:', error);
            // Continue anyway - fonts might still work
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
        }

        // Check if there's any math content and wait accordingly
        const hasMathContent = await page.evaluate(() => {
            const mathElements = document.querySelectorAll('.math-content');
            if (mathElements.length === 0) return false;

            // Check if any math-content elements have LaTeX delimiters
            for (let el of mathElements) {
                const text = el.textContent || '';
                if (text.includes('$') || text.includes('\\(') || text.includes('\\[')) {
                    return true;
                }
            }
            return false;
        });

        if (hasMathContent) {
            // Wait for KaTeX to fully render only if there's math content
            try {
                await page.waitForFunction(() => {
                    if (typeof (window as any).renderMathInElement === 'undefined') {
                        return false;
                    }

                    const katexElements = document.querySelectorAll('.katex');
                    return katexElements.length > 0;
                }, { timeout: 30000 });

                // Additional wait for complete rendering
                await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
            } catch (error) {
                console.warn('KaTeX rendering timeout, proceeding with PDF generation');
                // Continue anyway - some content might have rendered
            }
        } else {
            // No math content, just wait a bit for general rendering
            await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
        }

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
            displayHeaderFooter: false,
            preferCSSPageSize: false
        });

        await browser.close();

        const filename = `lesson-plan-${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', String(pdfBuffer.length));
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.status(200);
        res.end(pdfBuffer);
        return;
    } catch (error) {
        if (browser) {
            await browser.close();
        }
        console.error('PDF Generation Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'Failed to generate PDF', details: message });
    }
}

function generateHTML(
    data: LessonPlanData | LessonPlanData[],
    chapterOrTopicName: string | null
): string {
    // Normalize data to array
    const lessonPlans: LessonPlanData[] = Array.isArray(data) ? data : [data];

    const escapeHtml = (text: string): string => {
        if (!text || typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    // Process markdown-style formatting (bold, italic)
    const processMarkdown = (text: string): string => {
        if (!text) return '';
        // Convert **text** to <strong>text</strong> (handle bold first)
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Convert *text* to <em>text</em> (handle italic)
        text = text.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
        // Remove any remaining standalone asterisks
        text = text.replace(/\*/g, '');
        return text;
    };

    // Check if text contains LaTeX/math content
    const hasMathDelimiters = (text: string): boolean => {
        if (!text) return false;
        return text.includes('$') || text.includes('\\(') || text.includes('\\[') ||
            text.includes('\\frac') || text.includes('\\sqrt') || text.includes('\\begin');
    };

    // Render content with math support
    const renderContent = (text: string): string => {
        if (!text) return '';
        const processed = processMarkdown(text);
        let escaped = processed
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/&lt;strong&gt;/g, '<strong>')
            .replace(/&lt;\/strong&gt;/g, '</strong>')
            .replace(/&lt;em&gt;/g, '<em>')
            .replace(/&lt;\/em&gt;/g, '</em>');

        if (hasMathDelimiters(text)) {
            return `<span class="math-content">${escaped}</span>`;
        }
        return escaped;
    };

    // Format multi-line content with bullet points
    const formatMultilineContent = (text: string, skipBullets: boolean = false): string => {
        if (!text) return '';
        const lines = text.split(/\\n|\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        return lines.map(line => {
            // Check if line starts with a number
            if (/^\d+\./.test(line)) {
                return `<div class="content-item numbered">${renderContent(line)}</div>`;
            }
            // Check if line already has a bullet marker - remove it and add our own
            if (/^[-•*]/.test(line)) {
                const cleanedLine = line.replace(/^[-•*]\s*/, '');
                if (skipBullets) {
                    return `<div class="content-item">${renderContent(cleanedLine)}</div>`;
                }
                return `<div class="content-item bullet">${renderContent(cleanedLine)}</div>`;
            }
            // Check if it's a task
            if (/^Task\s+\d+\./i.test(line)) {
                return `<div class="content-item task">${renderContent(line)}</div>`;
            }
            // Check if it's a question
            if (/^Q\d+\./i.test(line)) {
                return `<div class="content-item question">${renderContent(line)}</div>`;
            }
            // Check if it's an answer
            if (/^A\d+\./i.test(line)) {
                return `<div class="content-item answer">${renderContent(line)}</div>`;
            }
            // Default: add bullet point to all other lines (unless skipBullets is true)
            if (skipBullets) {
                return `<div class="content-item">${renderContent(line)}</div>`;
            }
            return `<div class="content-item bullet">${renderContent(line)}</div>`;
        }).join('');
    };

    // Render a lesson plan section
    const renderSection = (title: string, content: any, isMainTitle: boolean = false, skipBullets: boolean = false): string => {
        if (!content) return '';

        let html = '';
        const sectionClass = isMainTitle ? 'section main-section' : 'section';

        if (typeof content === 'string') {
            html = `
                <div class="${sectionClass}">
                    <h3 class="section-title ${isMainTitle ? 'main-title' : ''}">${escapeHtml(title)}</h3>
                    <div class="section-content">${formatMultilineContent(content, skipBullets)}</div>
                </div>
            `;
        } else if (Array.isArray(content)) {
            html = `
                <div class="${sectionClass}">
                    <h3 class="section-title ${isMainTitle ? 'main-title' : ''}">${escapeHtml(title)}</h3>
                    <div class="section-content">
                        ${content.map(item => {
                            if (typeof item === 'string') {
                                // Add bullet point to array items
                                return `<div class="content-item bullet">${renderContent(item)}</div>`;
                            } else if (typeof item === 'object' && item !== null) {
                                return Object.entries(item).map(([key, val]) => 
                                    `<div class="key-value-item">
                                        <span class="key">${escapeHtml(key.replace(/_/g, ' '))}:</span>
                                        <span class="value">${renderContent(String(val))}</span>
                                    </div>`
                                ).join('');
                            }
                            return '';
                        }).join('')}
                    </div>
                </div>
            `;
        } else if (typeof content === 'object' && content !== null) {
            // Handle objects like Step_by_Step_Instructional_Plan
            html = `
                <div class="${sectionClass}">
                    <h3 class="section-title ${isMainTitle ? 'main-title' : ''}">${escapeHtml(title)}</h3>
                    <div class="section-content">
                        ${Object.entries(content).map(([key, val]) => {
                            const stepTitle = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            return `
                                <div class="step-item">
                                    <div class="step-title">${escapeHtml(stepTitle)}</div>
                                    <div class="step-content">${formatMultilineContent(String(val))}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    };

    // Render a complete lesson plan
    const renderLessonPlan = (lessonPlan: LessonPlanData, index: number): string => {
        const sectionOrder = [
            'Lesson_Topic',
            'Learning_Objectives',
            'Learning_Outcomes',
            'Materials_Required',
            'Prerequisite_Competencies',
            'Prerequisite_Competency_Quiz_Questions_and_Answers',
            'Step_by_Step_Instructional_Plan',
            'Higher_Order_Thinking_Skills_HOTS',
            'Curriculum_Integration_and_Multidisciplinary_Perspectives',
            'Complex_Concepts_Teaching_Iterations',
            'Real_Life_Applications',
            'Enhanced_Recall_through_Repetition',
            'Summary_of_the_Lesson',
            'Home_Assessments',
            'Additional_Considerations',
            'Web_Resources',
            'Quiz_/_Assignment',
        ];

        let html = '';
        
        // Add lesson separator if not the first lesson
        if (index > 0) {
            html += '<div class="lesson-separator"></div>';
        }

        // Process each section in order
        sectionOrder.forEach((sectionKey) => {
            const value = lessonPlan[sectionKey];
            if (!value) return;

            const cleanKey = sectionKey
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());

            const isMainTitle = sectionKey === 'Lesson_Topic';
            const skipBullets = sectionKey === 'Lesson_Topic';
            
            if (sectionKey === 'Step_by_Step_Instructional_Plan' && typeof value === 'object') {
                html += renderSection(cleanKey, value, false);
            } else if (sectionKey === 'Quiz_/_Assignment' && Array.isArray(value)) {
                // Special handling for Quiz/Assignment
                value.forEach((item: any) => {
                    if (item.Quiz) {
                        html += renderSection('Assessment Quiz', item.Quiz, false);
                    }
                    if (item.Assignment) {
                        html += renderSection('Assignment Tasks', item.Assignment, false);
                    }
                });
            } else if (sectionKey === 'Web_Resources' && Array.isArray(value)) {
                html += `
                    <div class="section">
                        <h3 class="section-title">${escapeHtml(cleanKey)}</h3>
                        <div class="section-content">
                            ${value.map((resource: string) => 
                                resource && resource.trim() 
                                    ? `<div class="web-resource"><a href="${escapeHtml(resource)}" target="_blank">${escapeHtml(resource)}</a></div>`
                                    : ''
                            ).join('')}
                        </div>
                    </div>
                `;
            } else {
                html += renderSection(cleanKey, value, isMainTitle, skipBullets);
            }
        });

        return html;
    };

    // Generate main HTML
    const mainTitle = chapterOrTopicName 
        ? `${chapterOrTopicName} - Lesson Plan` 
        : 'Lesson Plan Report';

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lesson Plan</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Noto Sans Devanagari', 'Noto Serif Devanagari', 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            background: white;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .page-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 0;
        }

        .header {
            background: linear-gradient(135deg, #4682B4 0%, #6495ED 100%);
            color: white;
            padding: 20px;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .header-content {
            text-align: center;
        }

        .header-title {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .header-date {
            font-size: 10pt;
            opacity: 0.9;
        }

        .lesson-separator {
            page-break-before: always;
            margin-top: 20px;
        }

        .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .section.main-section {
            margin-top: 15px;
        }

        .section-title {
            font-size: 14pt;
            font-weight: bold;
            color: #4682B4;
            margin-bottom: 10px;
            padding: 8px 12px;
            background: #F0F8FF;
            border-left: 4px solid #4682B4;
        }

        .section-title.main-title {
            font-size: 16pt;
            background: #E6F3FF;
            padding: 10px 15px;
        }

        .section-content {
            padding: 0 12px;
            line-height: 1.8;
        }

        .content-item {
            margin-bottom: 8px;
            text-align: justify;
        }

        .content-item.numbered {
            padding-left: 20px;
        }

        .content-item.bullet {
            padding-left: 25px;
            position: relative;
            margin-bottom: 6px;
        }

        .content-item.bullet::before {
            content: "•";
            position: absolute;
            left: 8px;
            color: #4682B4;
            font-weight: bold;
            font-size: 14pt;
        }

        .content-item.task {
            padding-left: 20px;
            position: relative;
        }

        .content-item.task::before {
            content: "📝";
            position: absolute;
            left: 0;
        }

        .content-item.question {
            padding-left: 20px;
            position: relative;
        }

        .content-item.question::before {
            content: "📝";
            position: absolute;
            left: 0;
        }

        .content-item.answer {
            padding-left: 40px;
            position: relative;
        }

        .content-item.answer::before {
            content: "✓";
            position: absolute;
            left: 20px;
            color: #228B22;
        }

        .step-item {
            margin-bottom: 15px;
            padding: 10px;
            background: #F0F8FF;
            border-radius: 4px;
        }

        .step-title {
            font-weight: bold;
            color: #4682B4;
            margin-bottom: 5px;
        }

        .step-content {
            padding-left: 10px;
        }

        .key-value-item {
            margin-bottom: 8px;
            display: flex;
            gap: 10px;
        }

        .key-value-item .key {
            font-weight: bold;
            color: #6495ED;
            min-width: 150px;
        }

        .key-value-item .value {
            flex: 1;
        }

        .web-resource {
            margin-bottom: 8px;
            padding: 8px;
            background: #F0F8FF;
            border-radius: 4px;
        }

        .web-resource a {
            color: #4682B4;
            text-decoration: none;
            word-break: break-all;
        }

        .web-resource a:hover {
            text-decoration: underline;
        }

        /* KaTeX Math - INLINE RENDERING */
        .math-content {
            display: inline;
        }

        .katex {
            font-size: 1.3em !important;
            display: inline !important;
        }

        .katex-display {
            display: inline !important;
            margin: 0 !important;
            text-align: left !important;
        }

        /* Piecewise functions and matrices */
        .katex .vlist-t {
            display: inline-table !important;
            vertical-align: middle;
        }

        /* Ensure fractions are inline */
        .katex .mfrac {
            display: inline-block;
            vertical-align: middle;
        }

        /* Markdown formatting support */
        strong {
            font-weight: bold;
        }

        em {
            font-style: italic;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
            }

            .page-container {
                max-width: 100%;
            }

            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="header">
            <div class="header-content">
                <div class="header-title">${escapeHtml(mainTitle)}</div>
                <div class="header-date">Generated: ${currentDate}</div>
            </div>
        </div>

        ${lessonPlans.map((lessonPlan, index) => renderLessonPlan(lessonPlan, index)).join('')}
    </div>

    <script>
        window.addEventListener('load', function() {
            if (typeof renderMathInElement !== 'undefined') {
                renderMathInElement(document.body, {
                    delimiters: [
                        {left: '$$', right: '$$', display: false},
                        {left: '$', right: '$', display: false},
                        {left: '\\\\(', right: '\\\\)', display: false},
                        {left: '\\\\[', right: '\\\\]', display: false}
                    ],
                    throwOnError: false,
                    trust: true,
                    strict: false
                });
            }
        });
    </script>
</body>
</html>
    `;
}

