// pages/api/generate-test-paper-pdf.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import chromium from '@sparticuz/chromium';
import type { Browser } from 'puppeteer-core';

interface TestPaperData {
    General_Instructions?: string;
    MCQs?: any[];
    True_False_Questions?: any[];
    Fill_in_the_Blanks?: any[];
    Very_Short_Answers?: any[];
    Short_Answers?: any[];
    Long_Answers?: any[];
    Very_Long_Answers?: any[];
    Case_Studies?: any[];
    Answers?: { [key: string]: string };
}

interface MarksBreakdown {
    marks_of_each_mcqs?: number;
    marks_of_each_truth_False_questions?: number;
    marks_of_each_fill_in_the_blanks?: number;
    marks_of_each_very_short_answers?: number;
    marks_of_each_short_answer?: number;
    marks_of_each_long_answer?: number;
    marks_of_each_very_long_answer?: number;
    marks_of_each_case_studies?: number;
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
            subject = 'Test Paper',
            grade = '',
            totalMarks = '',
            duration = '',
            marksBreakdown = {},
            schoolName = '',
            examinationName = '',
            schoolLogoBase64 = null
        } = req.body || {};

        const html = generateHTML(
            data,
            subject,
            grade,
            totalMarks,
            duration,
            marksBreakdown,
            schoolName,
            examinationName,
            schoolLogoBase64
        );

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
                if ((document as any).fonts && (document as any).fonts.ready) {
                    await (document as any).fonts.ready;
                }

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

                await new Promise(resolve => setTimeout(resolve, 1500));
            });
        } catch (error) {
            console.warn('Font loading warning:', error);
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

        const filename = `test-paper-${new Date().toISOString().split('T')[0]}.pdf`;
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
    data: TestPaperData,
    subject: string,
    grade: string,
    totalMarks: string,
    duration: string,
    marksBreakdown: MarksBreakdown,
    schoolName: string,
    examinationName: string,
    schoolLogoBase64: string | null
): string {
    const gradeLevel = parseInt(grade) || 0;
    const showAnswerLines = gradeLevel <= 4;

    const getMarksForQuestionType = (sectionKey: string): number | null => {
        const marksMap: { [key: string]: keyof MarksBreakdown } = {
            MCQs: 'marks_of_each_mcqs',
            True_False_Questions: 'marks_of_each_truth_False_questions',
            Fill_in_the_Blanks: 'marks_of_each_fill_in_the_blanks',
            Very_Short_Answers: 'marks_of_each_very_short_answers',
            Short_Answers: 'marks_of_each_short_answer',
            Long_Answers: 'marks_of_each_long_answer',
            Very_Long_Answers: 'marks_of_each_very_long_answer',
            Case_Studies: 'marks_of_each_case_studies',
        };

        const marksKey = marksMap[sectionKey];
        return marksKey && marksBreakdown[marksKey] ? marksBreakdown[marksKey] : null;
    };

    const parseOptions = (questionText: string) => {
        const optionsMatch = questionText.match(/Options?:\s*([\s\S]*)/);
        if (!optionsMatch) return null;

        const optionsText = optionsMatch[1];
        const options: { [key: string]: string } = {};
        const lines = optionsText.split('\n').filter(line => line.trim() !== '');

        if (lines.length > 0) {
            lines.forEach(line => {
                const match = line.trim().match(/^([A-D])[).]\s*(.+)/);
                if (match) {
                    const [, letter, text] = match;
                    options[letter.toLowerCase()] = text.trim();
                }
            });
        } else {
            const optionMatches = optionsText.match(/([A-D])[).]\s*([^A-D]+?)(?=\s*[A-D][).]|$)/g);
            if (optionMatches) {
                optionMatches.forEach(match => {
                    const [, letter, text] = match.match(/([A-D])[).]\s*(.+)/) || [];
                    if (letter && text) {
                        options[letter.toLowerCase()] = text.trim();
                    }
                });
            }
        }

        return Object.keys(options).length > 0 ? options : null;
    };

    const escapeHtml = (text: unknown): string => {
        if (text === null || text === undefined) return '';
        const value = typeof text === 'string' ? text : String(text);
        if (!value) return '';
        return value
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
        // Convert *text* to <em>text</em> (handle italic, including single characters like *p*, *x*)
        text = text.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
        // Remove any remaining standalone asterisks that weren't part of matched pairs
        text = text.replace(/\*/g, '');
        return text;
    };

    // Check if text contains LaTeX/math content
    const hasMathDelimiters = (text: string): boolean => {
        if (!text) return false;
        return text.includes('$') || text.includes('\\(') || text.includes('\\[') ||
            text.includes('\\frac') || text.includes('\\sqrt');
    };

    // Render inline content without table parsing (used for table cells)
    const renderInlineContent = (text: string): string => {
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

    // Convert markdown-like tables to HTML tables
    const convertMarkdownTables = (text: string): string => {
        const blocks = text.split(/\n\n/);
        const converted = blocks.map(block => {
            const lines = block.trim().split(/\n/).filter(l => l.trim().length > 0);
            if (lines.length >= 2 && lines[0].includes('|') && /\|\s*[-:]+/.test(lines[1])) {
                const parseRow = (row: string): string[] => {
                    const inner = row.replace(/^\|/, '').replace(/\|$/, '');
                    return inner.split('|').map(c => c.trim());
                };

                const header = parseRow(lines[0]);
                const dataLines = lines.slice(2);
                const thead = `<thead><tr>${header.map(h => `<th>${renderInlineContent(h)}</th>`).join('')}</tr></thead>`;
                const tbodyRows = dataLines.map(dl => `<tr>${parseRow(dl).map(c => `<td>${renderInlineContent(c)}</td>`).join('')}</tr>`).join('');
                return `<table class="styled-table">${thead}<tbody>${tbodyRows}</tbody></table>`;
            }
            return block;
        });
        return converted.join('\n\n');
    };

    // Render content with table support, markdown and inline math
    const renderContent = (text: string): string => {
        if (!text) return '';
        const withTables = convertMarkdownTables(text);
        if (withTables.includes('<table')) {
            return withTables;
        }
        return renderInlineContent(text);
    };

    // Format instructions with proper line breaks
    const formatInstructions = (text: string): string => {
        if (!text) return '';
        // Replace \n with actual line breaks, remove excessive whitespace
        const lines = text.split(/\\n|\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        return lines.map(line => {
            // Check if line starts with a number (numbered instruction)
            if (/^\d+\./.test(line)) {
                return `<div class="instruction-item">${renderContent(line)}</div>`;
            }
            return `<div class="instruction-item">${renderContent(line)}</div>`;
        }).join('');
    };

    const renderAnswerLines = (numLines: number): string => {
        let lines = '';
        for (let i = 0; i < numLines; i++) {
            lines += '<div class="answer-line"></div>';
        }
        return lines;
    };

    const renderSection = (sectionKey: string, sectionTitle: string, questions: any[]): string => {
        if (!questions || questions.length === 0) return '';

        const marksPerQuestion = getMarksForQuestionType(sectionKey);
        let html = `
            <div class="section">
                <h3 class="section-title">${sectionTitle}</h3>
                <div class="questions-container">
        `;

        questions.forEach((question, index) => {
            const questionObj = Array.isArray(question) ? question[0] : question;
            const questionKey = Object.keys(questionObj)[0];
            const questionTextRaw = questionObj[questionKey];
            const questionText = typeof questionTextRaw === 'string' ? questionTextRaw : String(questionTextRaw ?? '');
            const options = questionObj.options || parseOptions(questionText);
            const cleanQuestionText = questionText.split(/Options?:/)[0].trim();

            html += `
                <div class="question-block">
                    <div class="question-header">
                        <div class="question-text">
                            <span class="question-number">${questionKey}.</span>
                            <span class="question-content">${renderContent(cleanQuestionText)}</span>
                        </div>
                        ${marksPerQuestion ? `<span class="marks-badge">(${marksPerQuestion} mark${marksPerQuestion !== 1 ? 's' : ''})</span>` : ''}
                    </div>
            `;

            if (options) {
                html += '<div class="options-container">';
                Object.entries(options).forEach(([optionKey, optionValue]) => {
                    html += `
                        <div class="option">
                            <span class="option-letter">${optionKey.toUpperCase()})</span>
                            <span class="option-content">${renderContent(String(optionValue))}</span>
                        </div>
                    `;
                });
                html += '</div>';

                if (showAnswerLines) {
                    html += `
                        <div class="mcq-answer-space">
                            <span class="answer-label">Answer:</span>
                            <span class="answer-underline"></span>
                        </div>
                    `;
                }
            }

            if (showAnswerLines && !options) {
                html += '<div class="answer-space">';

                if (sectionKey === 'True_False_Questions' || sectionKey === 'Fill_in_the_Blanks') {
                    html += `
                        <div class="single-line-answer">
                            <span class="answer-label">Ans:</span>
                            <span class="answer-line-long"></span>
                        </div>
                    `;
                } else if (sectionKey === 'Very_Short_Answers') {
                    html += renderAnswerLines(2);
                } else if (sectionKey === 'Short_Answers') {
                    html += renderAnswerLines(3);
                } else if (sectionKey === 'Long_Answers') {
                    html += renderAnswerLines(5);
                } else if (sectionKey === 'Very_Long_Answers') {
                    html += renderAnswerLines(7);
                } else if (sectionKey === 'Case_Studies') {
                    html += renderAnswerLines(6);
                }

                html += '</div>';
            }

            html += '</div>';
        });

        html += '</div></div>';
        return html;
    };

    const safeSubject = escapeHtml(subject);
    const safeGrade = escapeHtml(grade);
    const safeTotalMarks = escapeHtml(totalMarks);
    const safeDuration = escapeHtml(duration);
    const safeSchoolName = schoolName ? escapeHtml(schoolName) : '';
    const safeExaminationName = examinationName ? escapeHtml(examinationName) : '';
    const hasSchoolName = Boolean(schoolName && schoolName.trim());
    const hasExaminationName = Boolean(examinationName && examinationName.trim());

    return `
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Paper</title>
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
            line-height: 1.5;
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
            text-align: center;
            margin-bottom: 10px;
            page-break-inside: avoid;
        }

        .header-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 5px;
        }

        .school-logo {
            max-height: 50px;
            max-width: 70px;
            object-fit: contain;
        }

        .header-text {
            flex: 1;
            text-align: center;
        }

        .school-name {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 3px;
        }

        .examination-name {
            font-size: 11pt;
            margin-bottom: 5px;
        }

        .test-paper-title {
            font-size: 13pt;
            font-weight: bold;
            margin: 5px 0;
        }

        .info-bar {
            border: 1px solid #000;
            padding: 8px;
            margin-bottom: 10px;
            page-break-inside: avoid;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }

        .info-row:last-child {
            margin-bottom: 0;
        }

        .info-item {
            font-size: 10pt;
        }

        .info-label {
            font-weight: bold;
            margin-right: 5px;
        }

        .underline-field {
            display: inline-block;
            min-width: 100px;
            margin-left: 5px;
        }

        .separator {
            border-top: 1px solid #000;
            margin: 10px 0;
        }

        .instructions {
            margin-bottom: 12px;
        }

        .instructions-title {
            font-size: 11pt;
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 6px;
        }

        .instructions-content {
            font-size: 10pt;
            line-height: 1.5;
        }

        .instruction-item {
            margin-bottom: 4px;
            text-align: justify;
        }

        .instruction-item:last-child {
            margin-bottom: 0;
        }

        .section {
            margin-bottom: 20px;
            /* Allow sections to flow across pages to avoid large gaps after instructions */
        }

        .section-title {
            font-size: 12pt;
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 15px;
            page-break-after: avoid;
        }

        .questions-container {
            margin-left: 0;
        }

        .question-block {
            margin-bottom: 15px;
            page-break-inside: avoid;
        }

        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6px;
            line-height: 1.4;
        }

        .question-text {
            flex: 1;
            padding-right: 15px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }

        .question-number {
            font-weight: bold;
            flex-shrink: 0;
            min-width: 25px;
            line-height: 1.4;
        }

        .question-content {
            flex: 1;
            line-height: 1.4;
            word-wrap: break-word;
        }

        .marks-badge {
            font-size: 11pt;
            font-weight: normal;
            white-space: nowrap;
            flex-shrink: 0;
            align-self: flex-start;
        }

        .options-container {
            margin-left: 30px;
            margin-top: 6px;
        }

        .option {
            margin-bottom: 4px;
            display: flex;
            align-items: flex-start;
            line-height: 1.4;
            gap: 5px;
        }

        .option-letter {
            min-width: 25px;
            flex-shrink: 0;
            padding-top: 1px;
        }

        .option-content {
            flex: 1;
            line-height: 1.4;
        }

        .answer-space {
            margin-top: 10px;
            margin-left: 30px;
        }

        .answer-line {
            border-bottom: 1px solid #888;
            height: 20px;
            margin-bottom: 5px;
        }

        .single-line-answer {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }

        .answer-label {
            font-weight: bold;
            margin-right: 10px;
        }

        .answer-line-long {
            flex: 1;
            border-bottom: 1px solid #000;
            height: 20px;
        }

        .mcq-answer-space {
            margin-top: 10px;
            margin-left: 30px;
            display: flex;
            align-items: center;
        }

        .answer-underline {
            display: inline-block;
            width: 100px;
            border-bottom: 1px solid #000;
            margin-left: 10px;
            height: 20px;
        }

        .answer-key {
            page-break-before: always;
            margin-top: 30px;
        }

        .answer-key-title {
            font-size: 12pt;
            font-weight: bold;
            text-align: center;
            text-decoration: underline;
            margin-bottom: 20px;
        }

        .answers-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .answer-item {
            padding: 10px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            page-break-inside: avoid;
        }

        .answer-key-question {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .answer-key-value {
            font-size: 11pt;
        }

        /* Tables */
        .styled-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 12px;
            font-size: 10pt;
            page-break-inside: avoid;
        }

        .styled-table th, .styled-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
        }

        .styled-table thead th {
            background: #f2f2f2;
            font-weight: bold;
        }

        /* KaTeX Math - INLINE RENDERING */
        .math-content {
            display: inline;
        }

        .katex {
            font-size: 1em !important;
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

            /* Keep individual questions and the instruction block intact,
               but allow entire sections to split across pages so we don't
               leave large gaps after instructions. */
            .question-block, .instructions {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="header">
            <div class="header-content">
                ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" class="school-logo">` : ''}
                <div class="header-text">
                    ${hasSchoolName ? `<div class="school-name">${safeSchoolName}</div>` : '<div class="test-paper-title">TEST PAPER</div>'}
                    ${hasExaminationName ? `<div class="examination-name">${safeExaminationName}</div>` : ''}
                </div>
            </div>
        </div>

        <div class="info-bar">
            <div class="info-row">
                <div class="info-item">
                    <span class="info-label">Class:</span>
                    <span>${safeGrade}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Subject:</span>
                    <span>${safeSubject}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Max Marks:</span>
                    <span>${safeTotalMarks}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Time:</span>
                    <span>${safeDuration ? `${safeDuration} min` : ''}</span>
                </div>
            </div>
            <div class="info-row">
                <div class="info-item">
                    <span class="info-label">Name:</span>
                    <span class="underline-field"></span>
                </div>
                <div class="info-item">
                    <span class="info-label">Roll No.:</span>
                    <span class="underline-field"></span>
                </div>
                <div class="info-item">
                    <span class="info-label">Date:</span>
                    <span class="underline-field"></span>
                </div>
            </div>
        </div>

        ${data.General_Instructions ? `
        <div class="separator"></div>
        <div class="instructions">
            <div class="instructions-title">GENERAL INSTRUCTIONS:</div>
            <div class="instructions-content">${formatInstructions(data.General_Instructions)}</div>
        </div>
        <div class="separator"></div>
        ` : ''}

        ${data.MCQs ? renderSection('MCQs', 'SECTION A: MULTIPLE CHOICE QUESTIONS', data.MCQs) : ''}
        ${data.True_False_Questions ? renderSection('True_False_Questions', 'SECTION B: TRUE/FALSE QUESTIONS', data.True_False_Questions) : ''}
        ${data.Fill_in_the_Blanks ? renderSection('Fill_in_the_Blanks', 'SECTION C: FILL IN THE BLANKS', data.Fill_in_the_Blanks) : ''}
        ${data.Very_Short_Answers ? renderSection('Very_Short_Answers', 'SECTION D: VERY SHORT ANSWER QUESTIONS', data.Very_Short_Answers) : ''}
        ${data.Short_Answers ? renderSection('Short_Answers', 'SECTION E: SHORT ANSWER QUESTIONS', data.Short_Answers) : ''}
        ${data.Long_Answers ? renderSection('Long_Answers', 'SECTION F: LONG ANSWER QUESTIONS', data.Long_Answers) : ''}
        ${data.Very_Long_Answers ? renderSection('Very_Long_Answers', 'SECTION G: VERY LONG ANSWER QUESTIONS', data.Very_Long_Answers) : ''}
        ${data.Case_Studies ? renderSection('Case_Studies', 'SECTION H: CASE STUDY QUESTIONS', data.Case_Studies) : ''}

        ${data.Answers && Object.keys(data.Answers).length > 0 ? `
        <div class="answer-key">
            <div class="answer-key-title">ANSWER KEY</div>
            <div class="answers-grid">
                ${Object.entries(data.Answers).map(([key, value]) => `
                    <div class="answer-item">
                        <div class="answer-key-question">Q${key}:</div>
                        <div class="answer-key-value">${renderContent(String(value))}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
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