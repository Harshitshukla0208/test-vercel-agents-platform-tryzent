// utils/pdfGenerator.ts
import jsPDF from "jspdf"
import LogoImage from "../assets/logo.jpeg"

interface LessonPlanData {
    [key: string]: any
}

interface QuizAssignment {
    Quiz?: string
    Assignment?: string
}

export const generateLessonPlanPDF = (
    data: LessonPlanData[],
    filename = "lesson-plan.pdf",
    chapterOrTopicName?: string | null,
) => {
    const pdf = new jsPDF()

    // Page dimensions and styling
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    let yPosition = margin

    // Updated color scheme with primary blue for header and main headings
    const colors = {
        primary: [70, 130, 180] as const, // Steel Blue - for header background and main headings
        secondary: [100, 149, 237] as const, // Cornflower Blue
        accent: [30, 144, 255] as const, // Dodger Blue
        text: [33, 37, 41] as const, // Dark Gray
        lightText: [108, 117, 125] as const, // Medium Gray
        background: [248, 249, 250] as const, // Light Gray
        white: [255, 255, 255] as const,
        lightBlue: [240, 248, 255] as const, // Alice Blue
    }

    // Helper function to get logo base64
    const getLogoBase64 = (): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    reject(new Error("Canvas context not available"))
                    return
                }

                const size = Math.min(img.width, img.height)
                canvas.width = size
                canvas.height = size

                ctx.fillStyle = "rgb(70, 130, 180)"
                ctx.fillRect(0, 0, size, size)

                const radius = size * 0.1
                ctx.beginPath()
                ctx.roundRect(0, 0, size, size, radius)
                ctx.clip()

                const offsetX = (img.width - size) / 2
                const offsetY = (img.height - size) / 2
                ctx.drawImage(img, -offsetX, -offsetY, img.width, img.height)

                try {
                    const base64 = canvas.toDataURL("image/jpeg", 0.9)
                    resolve(base64)
                } catch (error) {
                    reject(error)
                }
            }
            img.onerror = () => reject(new Error("Failed to load logo image"))
            img.src = typeof LogoImage === "string" ? LogoImage : LogoImage.src
        })
    }

    const getLogofooterBase64 = (): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    reject(new Error("Canvas context not available"))
                    return
                }

                const size = Math.min(img.width, img.height)
                canvas.width = size
                canvas.height = size

                ctx.fillStyle = "rgb(70, 130, 180)"
                ctx.fillRect(0, 0, size, size)

                const radius = size * 0.0
                ctx.beginPath()
                ctx.roundRect(0, 0, size, size, radius)
                ctx.clip()

                const offsetX = (img.width - size) / 2
                const offsetY = (img.height - size) / 2
                ctx.drawImage(img, -offsetX, -offsetY, img.width, img.height)

                try {
                    const base64 = canvas.toDataURL("image/jpeg", 0.9)
                    resolve(base64)
                } catch (error) {
                    reject(error)
                }
            }
            img.onerror = () => reject(new Error("Failed to load logo image"))
            img.src = typeof LogoImage === "string" ? LogoImage : LogoImage.src
        })
    }

    // Text sanitization
    const sanitizeText = (text: string): string => {
        if (!text || typeof text !== "string") return ""

        return text
            .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, "")
            .replace(/[""]/g, '"')
            .replace(/['']/g, "'")
            .replace(/[–—]/g, "-")
            .replace(/…/g, "...")
            .replace(/\u00A0/g, " ")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\s+/g, " ")
            .trim()
    }

    // Page break check
    const checkPageBreak = (requiredSpace = 20): boolean => {
        if (yPosition + requiredSpace > pageHeight - margin - 25) {
            pdf.addPage()
            yPosition = margin
            return true
        }
        return false
    }

    // Optimized text wrapper with reduced spacing
    const addWrappedText = (
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        fontSize = 10,
        fontStyle = "normal",
    ): number => {
        const sanitizedText = sanitizeText(text)
        if (!sanitizedText) return y

        pdf.setFont("helvetica", fontStyle)
        pdf.setFontSize(fontSize)

        try {
            const lines = pdf.splitTextToSize(sanitizedText, maxWidth)
            const lineSpacing = fontSize * 0.35 // Reduced line spacing
            let currentY = y

            lines.forEach((line: string) => {
                if (currentY + lineSpacing > pageHeight - margin - 15) {
                    pdf.addPage()
                    currentY = margin
                }
                pdf.text(line, x, currentY)
                currentY += lineSpacing
            })

            return currentY + 2 // Reduced gap after text
        } catch (error) {
            console.warn("Error rendering text:", error)
            const truncatedText = sanitizedText.substring(0, 100)
            pdf.text(truncatedText + (sanitizedText.length > 100 ? "..." : ""), x, y)
            return y + fontSize * 0.35 + 2
        }
    }

    // Updated header layout with primary blue background and dynamic title
    const addLessonPlanHeader = async () => {
        try {
            // Header background - using primary blue
            pdf.setFillColor(...colors.primary)
            pdf.rect(0, 0, pageWidth, 35, "F")
            const logoBase64 = await getLogoBase64()
            // Logo
            const logoSize = 10
            const logoX = margin
            const logoY = 5
            pdf.addImage(logoBase64, "JPEG", logoX, logoY, logoSize, logoSize)
            // Company name
            pdf.setTextColor(255, 255, 255)
            pdf.setFont("helvetica", "bold")
            pdf.setFontSize(12)
            pdf.text("AgentHub", logoX + logoSize + 3, logoY + 5)
            // "by Tryzent" text - small text below company name
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(8)
            pdf.text("by Tryzent", logoX + logoSize + 3, logoY + 9)
            // Main title - centered, use chapter/topic name if available
            pdf.setFont("helvetica", "bold")
            pdf.setFontSize(16)
            const mainTitle = chapterOrTopicName ? `${chapterOrTopicName} - Lesson Plan` : "Lesson Plan Report"
            const titleWidth = pdf.getTextWidth(mainTitle)
            pdf.text(mainTitle, (pageWidth - titleWidth) / 2, logoY + 18)
            // Date - right aligned
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(8)
            const currentDate = new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })
            const dateText = `Generated: ${currentDate}`
            const dateWidth = pdf.getTextWidth(dateText)
            pdf.text(dateText, pageWidth - margin - dateWidth, logoY + 25)
            yPosition = 45
        } catch (error) {
            console.warn("Error adding logo to header:", error)
            addLessonPlanHeaderFallback()
        }
    }
    // Fallback header with primary blue background and dynamic title
    const addLessonPlanHeaderFallback = () => {
        pdf.setFillColor(...colors.primary)
        pdf.rect(0, 0, pageWidth, 35, "F")

        pdf.setTextColor(255, 255, 255)
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(14)
        pdf.text("Tryzent", margin, 15)

        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(16)
        const titleText = chapterOrTopicName ? `${chapterOrTopicName} - Lesson Plan` : "Lesson Plan Report"
        const titleWidth = pdf.getTextWidth(titleText)
        pdf.text(titleText, (pageWidth - titleWidth) / 2, 25)

        yPosition = 45
    }

    // Updated section headers - with left strip only for main lesson titles
    const addSectionHeader = (title: string, level = 1, isMainLessonTitle = false) => {
        const fontSize = level === 1 ? 12 : 10
        const headerHeight = level === 1 ? 18 : 15
        const topPadding = level === 1 ? 6 : 4

        checkPageBreak(headerHeight + 15)
        yPosition += topPadding

        if (level === 1) {
            // Main section with blue background
            pdf.setFillColor(...colors.lightBlue)
            pdf.rect(margin - 2, yPosition - 4, pageWidth - 2 * margin + 4, headerHeight - 2, "F")

            // Only add LEFT strip if it's a main lesson title
            if (isMainLessonTitle) {
                pdf.setFillColor(...colors.primary)
                pdf.rect(margin - 2, yPosition - 4, 3, headerHeight - 2, "F")
            }
        } else {
            // Sub-section with lighter background - NO strips at all
            pdf.setFillColor(250, 250, 250)
            pdf.rect(margin - 1, yPosition - 3, pageWidth - 2 * margin + 2, headerHeight - 2, "F")
        }

        // Section title - use primary blue for main lesson titles
        if (isMainLessonTitle) {
            pdf.setTextColor(...colors.primary)
        } else {
            pdf.setTextColor(...colors.primary)
        }
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(fontSize)

        const cleanTitle = sanitizeText(title)
        const titleX = isMainLessonTitle ? margin + 6 : margin + 2
        pdf.text(cleanTitle, titleX, yPosition + 3)

        yPosition += headerHeight - 2
    }

    // Content formatting without symbols
    const addEducationalContent = (content: string, indent = 0, style: "normal" | "bold" | "italic" = "normal") => {
        if (!content) return

        const lines = content.split("\n").filter((line) => line.trim())

        lines.forEach((line, index) => {
            const trimmedLine = line.trim()
            if (!trimmedLine) return

            checkPageBreak(12)

            const maxWidth = pageWidth - 2 * margin - indent

            pdf.setTextColor(...colors.text)
            pdf.setFont("helvetica", style)
            yPosition = addWrappedText(trimmedLine, margin + indent, yPosition, maxWidth, 9, style)

            if (index < lines.length - 1) yPosition += 1 // Reduced gap between lines
        })
    }

    // Key-value formatting
    const addKeyValue = (key: string, value: string, indent = 0) => {
        if (!key || !value) return

        checkPageBreak(20)

        const keyWidth = 60
        const maxValueWidth = pageWidth - 2 * margin - indent - keyWidth - 5

        // Key
        pdf.setTextColor(...colors.secondary)
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(9)
        pdf.text(`${sanitizeText(key)}:`, margin + indent, yPosition)

        // Value
        pdf.setTextColor(...colors.text)
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        yPosition = addWrappedText(value, margin + indent + keyWidth, yPosition, maxValueWidth, 9)
        yPosition += 3 // Reduced gap
    }

    // Step-by-step instructions without symbols
    const addStepByStepInstructions = (instructions: any) => {
        if (!instructions || typeof instructions !== "object") return

        addSectionHeader("Step-by-Step Instructional Plan", 1)

        let stepCounter = 1
        Object.entries(instructions).forEach(([stepKey, stepValue]) => {
            if (!stepValue) return

            checkPageBreak(20)

            const stepTitle = sanitizeText(stepKey)
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())

            // Step background
            pdf.setFillColor(...colors.lightBlue)
            pdf.rect(margin - 1, yPosition - 2, pageWidth - 2 * margin + 2, 12, "F")

            // Step number
            pdf.setTextColor(...colors.primary)
            pdf.setFont("helvetica", "bold")
            pdf.setFontSize(10)
            pdf.text(`${stepCounter}.`, margin + 2, yPosition + 4)

            // Step title
            pdf.setTextColor(...colors.primary)
            pdf.setFont("helvetica", "bold")
            pdf.setFontSize(10)
            pdf.text(stepTitle, margin + 12, yPosition + 4)

            yPosition += 15

            // Step content
            addEducationalContent(stepValue as string, 8)
            yPosition += 4
            stepCounter++
        })
    }

    // Quiz and assignment formatting
    const addQuizAssignment = (quizAssignment: QuizAssignment[]) => {
        if (!quizAssignment || !Array.isArray(quizAssignment)) return

        quizAssignment.forEach((item, index) => {
            if (item.Quiz) {
                addSectionHeader("Assessment Quiz", 1)
                yPosition += 2
                addEducationalContent(item.Quiz, 5)
                yPosition += 6
            }

            if (item.Assignment) {
                addSectionHeader("Assignment Tasks", 1)
                yPosition += 2
                addEducationalContent(item.Assignment, 5)
                yPosition += 6
            }
        })
    }

    // Bullet points without symbols
    const addEducationalBulletPoint = (text: string, indent = 8) => {
        if (!text) return

        checkPageBreak(12)

        const bulletWidth = 8
        const maxWidth = pageWidth - 2 * margin - indent - bulletWidth

        // Simple bullet
        pdf.setTextColor(...colors.secondary)
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(9)
        pdf.text("-", margin + indent, yPosition)

        // Content
        pdf.setTextColor(...colors.text)
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        yPosition = addWrappedText(text, margin + indent + bulletWidth, yPosition, maxWidth, 9)
        yPosition += 2 // Reduced gap
    }

    // Web resources formatting
    const addWebResources = (resources: string[]) => {
        if (!resources || !Array.isArray(resources) || resources.length === 0) return

        addSectionHeader("Web Resources & References", 1)

        resources.forEach((resource, index) => {
            if (resource && resource.trim()) {
                checkPageBreak(12)

                pdf.setTextColor(...colors.secondary)
                pdf.setFont("helvetica", "normal")
                pdf.setFontSize(8)
                const maxWidth = pageWidth - 2 * margin - 10
                yPosition = addWrappedText(resource.trim(), margin + 5, yPosition, maxWidth, 8)
                yPosition += 3
            }
        })
    }

    // Clean footer
    const addEducationalFooter = async () => {
    const pageCount = (pdf as any).internal.getNumberOfPages()
    try {
        const logoBase64 = await getLogofooterBase64()
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i)
            // Footer line
            pdf.setDrawColor(...colors.primary)
            pdf.setLineWidth(0.5)
            pdf.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)
            // Footer content
            pdf.setTextColor(...colors.lightText)
            pdf.setFont("helvetica", "normal")
            pdf.setFontSize(8)
            // Left: Logo and branding
            const footerLogoSize = 5
            const logoX = margin
            const logoY = pageHeight - 16
            // Logo without background
            pdf.addImage(logoBase64, "JPEG", logoX, logoY, footerLogoSize, footerLogoSize)
            pdf.setFont("helvetica", "bold")
            pdf.text("Tryzent", logoX + footerLogoSize + 1, pageHeight - 12.5)
            // Right: Page numbers
            const pageText = `Page ${i} of ${pageCount}`
            const pageTextWidth = pdf.getTextWidth(pageText)
            pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 12)
        }
    } catch (error) {
        console.warn("Error adding logo to footer:", error)
        // Fallback footer
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i)
            pdf.setDrawColor(...colors.primary)
            pdf.setLineWidth(0.5)
            pdf.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)
            pdf.setTextColor(...colors.lightText)
            pdf.setFont("helvetica", "bold")
            pdf.setFontSize(8)
            pdf.text("Tryzent", margin, pageHeight - 12)
            const pageText = `Page ${i} of ${pageCount}`
            const pageTextWidth = pdf.getTextWidth(pageText)
            pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 12)
        }
    }
}

    // Check if value is valid for display
    const isValidValue = (value: any): boolean => {
        if (value === null || value === undefined) return false
        if (typeof value === "string" && value.trim() === "") return false
        if (typeof value === "number" && (isNaN(value) || !isFinite(value))) return false
        if (Array.isArray(value) && value.length === 0) return false
        if (typeof value === "object" && Object.keys(value).length === 0) return false
        return true
    }

    // Main lesson plan processing function
    const processLessonPlan = (lessonPlan: any, lessonNumber: number) => {
        if (!lessonPlan || typeof lessonPlan !== "object") return

        // Add lesson separator if not the first lesson
        if (lessonNumber > 1) {
            pdf.addPage()
            yPosition = margin
        }

        // Process lesson topic as main header with primary blue color and RIGHT strip
        if (lessonPlan.Lesson_Topic) {
            addSectionHeader(`Lesson ${lessonNumber}: ${lessonPlan.Lesson_Topic}`, 1, true)
            yPosition += 2
        }

        // Define the order of sections for logical flow
        const sectionOrder = [
            "Learning_Objectives",
            "Learning_Outcomes",
            "Materials_Required",
            "Prerequisite_Competencies",
            "Prerequisite_Competency_Quiz_Questions_and_Answers",
            "Step_by_Step_Instructional_Plan",
            "Higher_Order_Thinking_Skills_HOTS",
            "Curriculum_Integration_and_Multidisciplinary_Perspectives",
            "Complex_Concepts_Teaching_Iterations",
            "Real_Life_Applications",
            "Enhanced_Recall_through_Repetition",
            "Summary_of_the_Lesson",
            "Home_Assessments",
            "Additional_Considerations",
            "Web_Resources",
            "Quiz_/_Assignment",
        ]

        // Process each section in order
        sectionOrder.forEach((sectionKey) => {
            const value = lessonPlan[sectionKey]
            if (!isValidValue(value)) return

            const cleanKey = sanitizeText(sectionKey)
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())

            // Special handling for different types of content
            if (sectionKey === "Step_by_Step_Instructional_Plan" && typeof value === "object") {
                addStepByStepInstructions(value)
            } else if (sectionKey === "Quiz_/_Assignment" && Array.isArray(value)) {
                addQuizAssignment(value)
            } else if (sectionKey === "Web_Resources" && Array.isArray(value)) {
                addWebResources(value)
            } else if (typeof value === "string") {
                addSectionHeader(cleanKey, 1, false) // false = not main lesson title
                addEducationalContent(value, 5)
                yPosition += 4
            } else if (Array.isArray(value)) {
                addSectionHeader(cleanKey, 1, false) // false = not main lesson title
                value.forEach((item: any) => {
                    if (typeof item === "string") {
                        addEducationalBulletPoint(item, 5)
                    } else if (typeof item === "object" && item !== null) {
                        Object.entries(item).forEach(([subKey, subValue]) => {
                            if (isValidValue(subValue)) {
                                addKeyValue(subKey, subValue as string, 5)
                            }
                        })
                    }
                })
                yPosition += 4
            } else if (typeof value === "object") {
                addSectionHeader(cleanKey, 1, false) // false = not main lesson title
                Object.entries(value).forEach(([subKey, subValue]) => {
                    if (isValidValue(subValue)) {
                        const subKeyClean = sanitizeText(subKey)
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())
                        addKeyValue(subKeyClean, subValue as string, 5)
                    }
                })
                yPosition += 4
            }
        })
    }

    // Main PDF generation function
    const generatePDF = async () => {
        try {
            // Add header
            await addLessonPlanHeader()

            // Process lesson plan data
            if (Array.isArray(data) && data.length > 0) {
                data.forEach((lessonPlan, index) => {
                    processLessonPlan(lessonPlan, index + 1)
                })
            } else if (typeof data === "object") {
                processLessonPlan(data, 1)
            } else {
                addSectionHeader("Lesson Plan Data", 1)
                addEducationalContent("No lesson plan data available.", 5, "italic")
            }

            // Add footer
            await addEducationalFooter()

            // Save PDF
            pdf.save(filename)

            return { success: true, message: "Lesson plan PDF generated successfully" }
        } catch (error) {
            console.error("Error generating lesson plan PDF:", error)
            return { success: false, message: "Failed to generate lesson plan PDF", error }
        }
    }

    return generatePDF()
}

// Keep the original function for backward compatibility
export const generateBeautifulPDF = (data: any, filename = "audio-analysis.pdf") => {
    // Check if data looks like lesson plan data
    if (Array.isArray(data) && data.length > 0 && data[0].Lesson_Topic) {
        return generateLessonPlanPDF(data, filename)
    }

    // Check if single object has lesson plan structure
    if (data && typeof data === "object" && (data.Lesson_Topic || data.Learning_Objectives)) {
        return generateLessonPlanPDF([data], filename)
    }

    // Fall back to original audio analysis PDF generator
    const pdf = new jsPDF()
    return { success: false, message: "Please use the lesson plan specific generator for this data type" }
}
