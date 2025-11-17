// utils/pdfGenerator.ts
import jsPDF from 'jspdf';
import LogoImage from '../assets/logo.jpeg';

interface AudioAnalysisData {
    [key: string]: any;
}

export const generateBeautifulPDF = (data: AudioAnalysisData, filename: string = 'audio-analysis.pdf') => {
    const pdf = new jsPDF();

    // Page dimensions and styling
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Colors (RGB values) - Fixed TypeScript spread operator issue
    const colors = {
        primary: [59, 130, 246] as const,
        secondary: [99, 102, 241] as const,
        accent: [147, 51, 234] as const,
        text: [15, 23, 42] as const,
        lightText: [71, 85, 105] as const,
        background: [248, 250, 252] as const,
        white: [255, 255, 255] as const,
        success: [16, 185, 129] as const,
        warning: [245, 158, 11] as const,
        error: [239, 68, 68] as const
    };

    // Helper function to convert image to base64 with rounded corners
    const getLogoBase64 = (): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                const size = Math.min(img.width, img.height);
                canvas.width = size;
                canvas.height = size;

                // Fill background with primary color
                ctx.fillStyle = 'rgb(59, 130, 246)';
                ctx.fillRect(0, 0, size, size);

                // Create rounded rectangle path (rounded-xl effect)
                const radius = size * 0.15; // Equivalent to rounded-xl
                ctx.beginPath();
                ctx.roundRect(0, 0, size, size, radius);
                ctx.clip();

                // Draw image within rounded rectangle
                const offsetX = (img.width - size) / 2;
                const offsetY = (img.height - size) / 2;
                ctx.drawImage(img, -offsetX, -offsetY, img.width, img.height);

                try {
                    const base64 = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(base64);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Failed to load logo image'));
            img.src = typeof LogoImage === 'string' ? LogoImage : LogoImage.src;
        });
    };

    const getLogofooterBase64 = (): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                const size = Math.min(img.width, img.height);
                canvas.width = size;
                canvas.height = size;

                // Fill background with primary color
                ctx.fillStyle = 'rgb(59, 130, 246)';
                ctx.fillRect(0, 0, size, size);

                // Create rounded rectangle path (rounded-xl effect)
                const radius = size * 0.0; // Equivalent to rounded-xl
                ctx.beginPath();
                ctx.roundRect(0, 0, size, size, radius);
                ctx.clip();

                // Draw image within rounded rectangle
                const offsetX = (img.width - size) / 2;
                const offsetY = (img.height - size) / 2;
                ctx.drawImage(img, -offsetX, -offsetY, img.width, img.height);

                try {
                    const base64 = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(base64);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Failed to load logo image'));
            img.src = typeof LogoImage === 'string' ? LogoImage : LogoImage.src;
        });
    };

    // Helper function to sanitize text and remove problematic characters
    const sanitizeText = (text: string): string => {
        if (!text || typeof text !== 'string') return '';

        return text
            .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, '')
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            .replace(/[–—]/g, '-')
            .replace(/…/g, '...')
            .replace(/\u00A0/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number = 20): boolean => {
        if (yPosition + requiredSpace > pageHeight - margin - 25) {
            pdf.addPage();
            yPosition = margin;
            return true;
        }
        return false;
    };

    // IMPROVED: Calculate content height before rendering
    const calculateContentHeight = (content: any, key: string): number => {
        let estimatedHeight = 0;

        if (!isValidValue(content)) return 0;

        // Section header height
        estimatedHeight += 25;

        if (typeof content === 'string') {
            const lines = Math.ceil(content.length / 80); // Rough estimate
            estimatedHeight += lines * 12 + 10;
        } else if (Array.isArray(content)) {
            estimatedHeight += content.length * 15 + 20;
        } else if (typeof content === 'object') {
            estimatedHeight += Object.keys(content).length * 20 + 30;
        }

        return Math.min(estimatedHeight, 150); // Cap at reasonable estimate
    };


    // Helper function to add text with proper wrapping and encoding
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, fontStyle: string = 'normal'): number => {
        const sanitizedText = sanitizeText(text);
        if (!sanitizedText) return y;

        pdf.setFont('helvetica', fontStyle);
        pdf.setFontSize(fontSize);

        try {
            const lines = pdf.splitTextToSize(sanitizedText, maxWidth);
            const lineSpacing = fontSize * 0.4;
            let currentY = y;

            lines.forEach((line: string) => {
                if (currentY + lineSpacing > pageHeight - margin - 15) {
                    pdf.addPage();
                    currentY = margin;
                }
                pdf.text(line, x, currentY);
                currentY += lineSpacing;
            });

            return currentY + 3;
        } catch (error) {
            console.warn('Error rendering text:', error);
            const truncatedText = sanitizedText.substring(0, 100);
            pdf.text(truncatedText + (sanitizedText.length > 100 ? '...' : ''), x, y);
            return y + fontSize * 0.4 + 3;
        }
    };

    // Enhanced header with improved layout - MADE SMALLER AND MORE PROFESSIONAL
    const addHeaderWithLogo = async () => {
        try {
            // Thinner header for cleaner look (40px instead of 50px)
            pdf.setFillColor(...colors.primary);
            pdf.rect(0, 0, pageWidth, 40, 'F');
            // Get logo as base64 with rounded corners
            const logoBase64 = await getLogoBase64();
            // LEFT SIDE: Company logo and name only
            const logoSize = 10; // Smaller logo for thinner header
            const logoX = margin;
            const logoY = 6; // Centered vertically in thinner header
            // Add rounded company logo
            pdf.addImage(logoBase64, 'JPEG', logoX, logoY, logoSize, logoSize);
            // Company name "AgentHub" next to logo
            pdf.setTextColor(255, 255, 255); // White text
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12); // Compact size for thinner header
            pdf.text('AgentHub', logoX + logoSize + 3, logoY + 4);
            // "by Tryzent" text - small text below company name
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.text('by Tryzent', logoX + logoSize + 3, logoY + 8);
            // RIGHT SIDE: Primary title "Audio Notes Summarizer" - right aligned
            const rightSideX = pageWidth - margin;
            pdf.setTextColor(255, 255, 255); // White text
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(18); // Prominent size for main title
            const primaryTitle = 'Audio Notes Summarizer';
            const primaryTitleWidth = pdf.getTextWidth(primaryTitle);
            pdf.text(primaryTitle, rightSideX - primaryTitleWidth, logoY + 7);
            // Generated timestamp - right aligned, below main title
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8); // Clean readable size
            pdf.setTextColor(255, 255, 255); // White text
            const currentDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            const timestampText = `Generated: ${currentDate}`;
            const timestampWidth = pdf.getTextWidth(timestampText);
            pdf.text(timestampText, rightSideX - timestampWidth, logoY + 18);
            // LEFT SIDE: Secondary title "Audio Analysis Report" - below logo and company name
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10); // Balanced size for subtitle
            pdf.setTextColor(255, 255, 255); // White text
            const secondaryTitle = 'Audio Analysis Report';
            pdf.text(secondaryTitle, logoX, logoY + 20); // Left aligned below logo area
            yPosition = 50; // Adjusted for thinner header height
        } catch (error) {
            console.warn('Error adding logo to header, using fallback:', error);
            // Fallback to improved header without logo
            addHeaderFallback();
        }
    };

    // Fallback header without logo (updated layout) - MADE SMALLER
    const addHeaderFallback = () => {
        // Smaller header background
        pdf.setFillColor(...colors.primary);
        pdf.rect(0, 0, pageWidth, 45, 'F');

        // LEFT SIDE: Company logo placeholder and name
        pdf.setFillColor(255, 255, 255);
        pdf.circle(margin + 7, 19, 5, 'F'); // Smaller circle

        // Add "T" letter in the circle as logo placeholder
        pdf.setTextColor(...colors.primary);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12); // Reduced size
        pdf.text('T', margin + 5, 22);

        // Company name "Tryzent" next to logo placeholder
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text('Tryzent', margin + 16, 22);

        // CENTER: Agent name
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        const agentText = 'Audio Notes Summarizer';
        const agentWidth = pdf.getTextWidth(agentText);
        pdf.text(agentText, (pageWidth - agentWidth) / 2, 18);

        // RIGHT SIDE: Report title and subtitle
        const rightSideX = pageWidth - margin;

        // Main title - right aligned
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        const titleText = 'Audio Analysis Report';
        const titleWidth = pdf.getTextWidth(titleText);
        pdf.text(titleText, rightSideX - titleWidth, 22);

        // Subtitle with date - right aligned
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const subtitleText = `Generated: ${currentDate}`;
        const subtitleWidth = pdf.getTextWidth(subtitleText);
        pdf.text(subtitleText, rightSideX - subtitleWidth, 32);

        yPosition = 55;
    };

    // Add section header with page break protection
    const addSectionHeader = (title: string, level: number = 1, upcomingContentHeight: number = 0) => {
        const fontSize = level === 1 ? 14 : 12;
        const topPadding = level === 1 ? 8 : 6;
        const headerHeight = 25;

        // CRITICAL: Calculate total space needed (header + some content)
        const minContentSpace = Math.max(30, Math.min(upcomingContentHeight, 80));
        const totalSpaceNeeded = headerHeight + minContentSpace;

        // Check if we need a page break for header + content
        if (yPosition + totalSpaceNeeded > pageHeight - margin - 25) {
            pdf.addPage();
            yPosition = margin;
        }

        yPosition += topPadding;

        // Section background
        pdf.setFillColor(...colors.background);
        pdf.rect(margin - 3, yPosition - 6, pageWidth - 2 * margin + 6, 16, 'F');

        // Left border accent
        pdf.setFillColor(...colors.primary);
        pdf.rect(margin - 3, yPosition - 6, 2, 16, 'F');

        // Section title
        pdf.setTextColor(...colors.primary);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(fontSize);

        const cleanTitle = sanitizeText(title);
        pdf.text(cleanTitle, margin + 3, yPosition + 3);

        yPosition += 18;
    };

    // Add content with proper spacing
    const addContent = (content: string, indent: number = 0, style: 'normal' | 'bold' | 'italic' = 'normal') => {
        if (!content) return;

        // More conservative page break check for content
        const estimatedLines = Math.ceil(content.length / 80);
        const estimatedHeight = estimatedLines * 12;

        checkPageBreak(Math.min(estimatedHeight + 10, 50));

        const maxWidth = pageWidth - 2 * margin - indent;
        pdf.setTextColor(...colors.text);

        yPosition = addWrappedText(content, margin + indent, yPosition, maxWidth, 10, style);
    };

    // Add key-value pair with better formatting
    const addKeyValue = (key: string, value: string, indent: number = 0) => {
        if (!key || !value) return;

        // Ensure key-value pair stays together
        checkPageBreak(25);

        const keyWidth = 60;
        const maxValueWidth = pageWidth - 2 * margin - indent - keyWidth - 8;

        // Key (bold, colored)
        pdf.setTextColor(...colors.primary);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(`${sanitizeText(key)}:`, margin + indent, yPosition);

        // Value (normal text)
        pdf.setTextColor(...colors.text);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        yPosition = addWrappedText(value, margin + indent + keyWidth, yPosition, maxValueWidth, 10);
        yPosition += 5;
    };

    // Add bullet points with clean formatting
    const addBulletPoint = (text: string, indent: number = 10) => {
        if (!text) return;

        checkPageBreak(15);

        const bulletWidth = 8;
        const maxWidth = pageWidth - 2 * margin - indent - bulletWidth;

        // Bullet
        pdf.setTextColor(...colors.secondary);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('•', margin + indent, yPosition);

        // Text
        pdf.setTextColor(...colors.text);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        yPosition = addWrappedText(text, margin + indent + bulletWidth, yPosition, maxWidth, 10);
        yPosition += 3;
    };

    // Process transcription with improved formatting
    const processTranscription = (transcriptions: any[], title: string = 'Transcription') => {
        addSectionHeader(title);

        if (!transcriptions || transcriptions.length === 0) {
            addContent('No transcription available.', 8, 'italic');
            return;
        }

        transcriptions.forEach((transcription, index) => {
            if (index > 0) yPosition += 8;

            if (typeof transcription === 'string') {
                addContent(transcription, 8);
            } else if (typeof transcription === 'object') {
                Object.entries(transcription).forEach(([speaker, content]) => {
                    // Speaker header with page break protection
                    checkPageBreak(25);
                    pdf.setTextColor(...colors.accent);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(11);
                    pdf.text(`${sanitizeText(speaker)}:`, margin + 8, yPosition);
                    yPosition += 12;

                    // Content
                    addContent(content as string, 15);
                    yPosition += 6;
                });
            }
        });
    };

    // Process keyword frequency with clean layout
    const processKeywordFrequency = (keywords: string[]) => {
        addSectionHeader('Key Topics & Keywords');

        if (!keywords || keywords.length === 0) {
            addContent('No keywords identified.', 8, 'italic');
            return;
        }

        keywords.forEach((keyword) => {
            if (keyword.includes(': ')) {
                const [term, description] = keyword.split(': ', 2);
                if (term && description) {
                    addKeyValue(term.trim(), description.trim(), 8);
                } else {
                    addBulletPoint(keyword, 8);
                }
            } else {
                addBulletPoint(keyword, 8);
            }
        });
    };

    // Process action items with structured formatting
    const processActionItems = (items: string[]) => {
        addSectionHeader('Action Items');

        if (!items || items.length === 0) {
            addContent('No action items identified.', 8, 'italic');
            return;
        }

        items.forEach((item, index) => {
            // Ensure action item stays together
            checkPageBreak(40);

            // Action item number
            pdf.setTextColor(...colors.accent);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text(`${index + 1}.`, margin + 8, yPosition);
            yPosition += 12;

            const lines = item.split('\n');
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    if (trimmedLine.includes(': ')) {
                        const [label, value] = trimmedLine.split(': ', 2);
                        if (label && value) {
                            addKeyValue(label.trim(), value.trim(), 18);
                        } else {
                            addContent(trimmedLine, 18);
                        }
                    } else {
                        addContent(trimmedLine, 18);
                    }
                }
            });

            if (index < items.length - 1) yPosition += 8;
        });
    };

    // FIXED: Check if value is actually displayable
    const isValidValue = (value: any): boolean => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && Object.keys(value).length === 0) return false;
        return true;
    };

    // Main data processing function with custom order
    const processValue = (value: any, key: string, level: number = 1, isTranscription: boolean = false): void => {
        if (!isValidValue(value)) return;

        const cleanKey = sanitizeText(key).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (typeof value === 'boolean') {
            addKeyValue(cleanKey, value ? 'Yes' : 'No');
            return;
        }

        if (typeof value === 'number') {
            if (value === 0) return; // ⛔️ Skip rendering number 0
            addKeyValue(cleanKey, value.toString());
            return;
        }

        if (typeof value === 'string') {
            const cleanValue = sanitizeText(value);
            if (isTranscription || cleanKey.toLowerCase().includes('transcription') || cleanValue.length > 150) {
                addSectionHeader(cleanKey, level);
                addContent(cleanValue, 8);
            } else {
                addKeyValue(cleanKey, cleanValue);
            }
            return;
        }

        if (Array.isArray(value)) {
            const keyLower = key.toLowerCase();

            if (isTranscription || keyLower.includes('transcription')) {
                processTranscription(value, cleanKey);
            } else if (keyLower.includes('keyword') || keyLower.includes('frequency')) {
                processKeywordFrequency(value);
            } else if (keyLower.includes('action') || keyLower.includes('item')) {
                processActionItems(value);
            } else {
                addSectionHeader(cleanKey, level);

                if (value.length === 0) {
                    addContent('No items found.', 8, 'italic');
                } else {
                    value.forEach((item) => {
                        if (isValidValue(item)) {
                            if (typeof item === 'string') {
                                addBulletPoint(item);
                            } else if (typeof item === 'object' && item !== null) {
                                Object.entries(item).forEach(([subKey, subVal]) => {
                                    if (isValidValue(subVal)) {
                                        processValue(subVal, subKey, level + 1);
                                    }
                                });
                            }
                        }
                    });
                }
            }
            return;
        }

        if (typeof value === 'object') {
            const skipKeys = ['userId', 'agent_id', 'execution_id', 'user_inputs', 'file_data', 'response_rating', 'response_feedback', 'createdAt', 'filename', 'updatedAt'];
            if (skipKeys.includes(key)) return;

            if (level === 1) {
                addSectionHeader(cleanKey, level);
            }

            Object.entries(value).forEach(([subKey, subVal]) => {
                if (isValidValue(subVal) && !skipKeys.includes(subKey)) {
                    processValue(subVal, subKey, level + 1);
                }
            });
        }
    };

    // Add footer with page numbers and Tryzent branding (with logo)
    const addFooter = async () => {
        const pageCount = (pdf as any).internal.getNumberOfPages();
        try {
            const logoBase64 = await getLogofooterBase64();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                // Footer line
                pdf.setDrawColor(...colors.primary);
                pdf.setLineWidth(0.3);
                pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
                // Footer content
                pdf.setTextColor(...colors.lightText);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                // Left: Larger logo + Tryzent branding
                const footerLogoSize = 5;
                pdf.addImage(logoBase64, 'JPEG', margin, pageHeight - 17, footerLogoSize, footerLogoSize);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Tryzent', margin + footerLogoSize + 1, pageHeight - 13.5);
                pdf.setFont('helvetica', 'normal');
                // pdf.text('Audio Analysis Report', margin + footerLogoSize + 20, pageHeight - 13.5);
                // Right: page numbers
                const pageText = `Page ${i} of ${pageCount}`;
                const pageTextWidth = pdf.getTextWidth(pageText);
                pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 13.5);
                // Center: date
                const dateText = new Date().toLocaleDateString();
                const dateTextWidth = pdf.getTextWidth(dateText);
                pdf.text(dateText, (pageWidth - dateTextWidth) / 2, pageHeight - 13.5);
            }
        } catch (error) {
            console.warn('Error adding logo to footer, using fallback:', error);
            // Fallback footer without logo
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setDrawColor(...colors.primary);
                pdf.setLineWidth(0.3);
                pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
                pdf.setTextColor(...colors.lightText);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(8);
                pdf.text('Tryzent', margin, pageHeight - 13.5);
                pdf.setFont('helvetica', 'normal');
                pdf.text('Audio Analysis Report', margin + 25, pageHeight - 13.5);
                const pageText = `Page ${i} of ${pageCount}`;
                const pageTextWidth = pdf.getTextWidth(pageText);
                pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 13.5);
                const dateText = new Date().toLocaleDateString();
                const dateTextWidth = pdf.getTextWidth(dateText);
                pdf.text(dateText, (pageWidth - dateTextWidth) / 2, pageHeight - 13.5);
            }
        }
    };

    // Main PDF generation function
    const generatePDF = async () => {
        try {
            // Generate PDF content with logo
            await addHeaderWithLogo();

            // FIXED: Process data with proper structure handling
            const processedData = data?.data || data;

            if (processedData && typeof processedData === 'object') {
                // CRITICAL FIX: Handle the nested Details structure
                let outputData;
                let transcriptionData = null;

                // Check if we have the nested structure with Details
                if (processedData.Details && typeof processedData.Details === 'object') {
                    outputData = processedData.Details;
                } else {
                    outputData = processedData.agent_outputs || processedData;
                }

                // Extract transcription from the main level (not inside Details)
                if (processedData.Transcription && isValidValue(processedData.Transcription)) {
                    transcriptionData = processedData.Transcription;
                } else if (outputData.Transcription && isValidValue(outputData.Transcription)) {
                    transcriptionData = outputData.Transcription;
                }

                // Process Summary FIRST if it exists
                if (outputData.Summary && isValidValue(outputData.Summary)) {
                    processValue(outputData.Summary, 'Summary');
                    yPosition += 5;
                }

                // Process other sections in order (excluding Summary and Transcription)
                const sectionOrder = [
                    'Speaker_Identification',
                    'Entity_Detection',
                    'Decisions',
                    'Keyword_Frequency',
                    'Sentiment_Analysis',
                    'Key_Topics',
                    'Action_Items',
                    'Structured_Output'
                ];

                sectionOrder.forEach(sectionKey => {
                    if (outputData.hasOwnProperty(sectionKey) && isValidValue(outputData[sectionKey])) {
                        processValue(outputData[sectionKey], sectionKey);
                        yPosition += 5;
                    }
                });

                // Process any remaining sections (except Summary, Transcription, and system fields)
                Object.entries(outputData).forEach(([key, value]) => {
                    const excludedKeys = ['Summary', 'Transcription', ...sectionOrder, 'userId', 'agent_id', 'execution_id', 'user_inputs', 'file_data', 'response_rating', 'response_feedback', 'createdAt', 'filename', 'updatedAt'];
                    if (!excludedKeys.includes(key) && isValidValue(value)) {
                        processValue(value, key);
                        yPosition += 5;
                    }
                });

                // CRITICAL: Add Transcription at the VERY END
                if (transcriptionData) {
                    yPosition += 10; // Add space before transcription
                    processValue(transcriptionData, 'Transcription', 1, true);
                }
            } else {
                addSectionHeader('Analysis Results');
                addContent('No analysis data available.', 8, 'italic');
            }

            // Add footer to all pages
            await addFooter();

            // Save the PDF
            pdf.save(filename);

            return { success: true, message: 'PDF generated successfully with logo' };

        } catch (error) {
            console.error('Error generating PDF:', error);
            return { success: false, message: 'Failed to generate PDF', error };
        }
    };

    // Return the async function to be called
    return generatePDF();
};

// Utility function to convert image to base64 (for external logo integration)
export const imageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Enhanced HTML to PDF generator with better error handling
export const generatePDFFromHTML = async (elementId: string, filename: string = 'audio-analysis.pdf') => {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Element with ID '${elementId}' not found`);
        }

        // Dynamically import html2canvas
        let html2canvas;
        try {
            html2canvas = (await import('html2canvas')).default;
        } catch (importError) {
            throw new Error('Failed to load html2canvas library. Please ensure it is installed.');
        }

        // Store original styles
        const originalStyle = {
            position: element.style.position,
            left: element.style.left,
            top: element.style.top,
            zIndex: element.style.zIndex,
            visibility: element.style.visibility
        };

        // Prepare element for capture
        element.style.position = 'absolute';
        element.style.left = '0';
        element.style.top = '0';
        element.style.zIndex = '9999';
        element.style.visibility = 'visible';

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                logging: false,
                backgroundColor: '#ffffff',
                removeContainer: false,
                imageTimeout: 30000,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById(elementId);
                    if (clonedElement) {
                        clonedElement.style.fontFamily = 'Arial, Helvetica, sans-serif';
                        clonedElement.style.fontSize = '14px';
                        clonedElement.style.lineHeight = '1.4';
                    }
                }
            });

            // Restore original styles
            Object.assign(element.style, originalStyle);

            const imgData = canvas.toDataURL('image/png', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const imgWidth = pdfWidth - (2 * margin);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = margin;

            // Add first page
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= (pdfHeight - (2 * margin));

            // Add additional pages if content is longer
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= (pdfHeight - (2 * margin));
            }

            // Add simple footer with Tryzent branding
            const pageCount = (pdf as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setTextColor(100, 100, 100);
                pdf.setFontSize(8);
                pdf.text('Tryzent', 15, pdfHeight - 8);
                pdf.text(`Page ${i} of ${pageCount}`, pdfWidth - 25, pdfHeight - 8);
            }

            pdf.save(filename);
            return { success: true, message: 'Visual PDF generated successfully' };

        } catch (renderError) {
            // Restore styles even on error
            Object.assign(element.style, originalStyle);
            throw renderError;
        }

    } catch (error) {
        console.error('Error generating visual PDF:', error);
        return {
            success: false,
            message: `Failed to generate visual PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error
        };
    }
};
