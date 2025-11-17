import jsPDF from "jspdf"
import type { StaticImageData } from "next/image"
import logoImage from "../assets/logo.jpeg"

// Extend jsPDF type to include autoTable
declare module "jspdf" {
    interface jsPDF {
        autoTable: (options: any) => void
    }
}

interface ResumeAnalysis {
    ats_score: number
    recommendation: string
    reasoning: string[]
    summary: string
    matched_keywords: string[]
    missing_keywords: string[]
    matched_skills: string[]
    missing_skills: string[]
    matched_qualifications: string[]
    missing_qualifications: string[]
    matched_experience: string[]
    missing_experience: string[]
    recommmended_job_titles: string[]
    resume: string
}

interface UserInputs {
    Job_Role?: string
    Special_Instructions?: string
}

interface ResumeData {
    userId?: string
    agent_id?: string
    execution_id?: string
    thread_id?: string
    user_inputs?: { variable: string; variable_value: string }[]
    file_data?: { file_key: string; signed_url: string; expires_at: number }[]
    agent_outputs?: ResumeAnalysis[]
    response_rating?: any
    response_feedback?: any
    createdAt?: string
    filename?: string
    updatedAt?: string
}

interface UserConfig {
    job_role?: string
    special_instructions?: string
    total_resumes?: number
}

export class ResumeScorerPDFGenerator {
    private doc: jsPDF
    private pageWidth: number
    private pageHeight: number
    private margin: number
    private currentY: number
    private primaryColor: string
    private secondaryColor: string
    private accentColor: string
    private primaryBlue: string
    private logoBase64: string | null = null
    private logoLoaded = false
    
    private colors: {
        primary: [number, number, number]
        primaryBlue: [number, number, number]
        secondary: [number, number, number]
        accent: [number, number, number]
        text: [number, number, number]
        lightText: [number, number, number]
        background: [number, number, number]
        lightBackground: [number, number, number]
        success: [number, number, number]
        warning: [number, number, number]
        error: [number, number, number]
        border: [number, number, number]
    }

    constructor() {
        this.doc = new jsPDF("p", "mm", "a4")
        this.pageWidth = this.doc.internal.pageSize.getWidth()
        this.pageHeight = this.doc.internal.pageSize.getHeight()
        this.margin = 20
        this.currentY = this.margin
        
        // Updated color scheme with blue colors for resume scorer
        this.primaryColor = "#2D3748" // Dark gray-blue
        this.primaryBlue = "#4F7CFF" // Blue color for resume scorer
        this.secondaryColor = "#6B7280" // Medium gray
        this.accentColor = "#10B981" // Green accent

        // Updated color palette with blue
        this.colors = {
            primary: [45, 55, 72], // #2D3748
            primaryBlue: [79, 124, 255], // #4F7CFF - Blue for resume scorer
            secondary: [107, 114, 128], // #6B7280
            accent: [16, 185, 129], // #10B981
            text: [17, 24, 39], // #111827
            lightText: [107, 114, 128], // #6B7280
            background: [255, 255, 255], // #FFFFFF - Pure white
            lightBackground: [255, 255, 255], // #FFFFFF - Pure white
            success: [16, 185, 129], // #10B981
            warning: [245, 158, 11], // #F59E0B
            error: [239, 68, 68], // #EF4444
            border: [229, 231, 235], // #E5E7EB
        }
        
        this.initializeDocument()
    }

    /**
     * Clean text by removing or replacing problematic characters
     */
    private cleanText(text: string): string {
        if (!text) return ""
        
        // Replace common problematic characters
        return text
            .replace(/[\u2018\u2019]/g, "'") // Smart single quotes to apostrophe
            .replace(/[\u201C\u201D]/g, '"') // Smart double quotes to regular quotes
            .replace(/\u2014/g, "--") // Em dash to double hyphen
            .replace(/\u2013/g, "-") // En dash to hyphen
            .replace(/\u2026/g, "...") // Ellipsis
            .replace(/[\u00A0]/g, " ") // Non-breaking space to regular space
            .replace(/[\u200B-\u200D\uFEFF]/g, "") // Zero-width spaces
            .replace(/~/g, " approx. ") // Tilde to "approx."
            .replace(/[^\x00-\x7F]/g, (char) => {
                // Replace other non-ASCII characters with ASCII equivalents where possible
                const replacements: { [key: string]: string } = {
                    "é": "e", "è": "e", "ê": "e", "ë": "e",
                    "á": "a", "à": "a", "â": "a", "ä": "a",
                    "í": "i", "ì": "i", "î": "i", "ï": "i",
                    "ó": "o", "ò": "o", "ô": "o", "ö": "o",
                    "ú": "u", "ù": "u", "û": "u", "ü": "u",
                    "ñ": "n", "ç": "c"
                }
                return replacements[char] || ""
            })
            .trim()
    }

    /**
     * Initialize document with consistent settings
     */
    private initializeDocument(): void {
        // Set consistent font from the start
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(10)
        this.doc.setTextColor(0, 0, 0)
        this.doc.setLineHeightFactor(1.3) // Balanced line height for better readability
        
        this.doc.setProperties({
            title: "Resume Analysis Report",
            creator: "AgentHub by Tryzent"
        })
    }

    /**
     * Simplified text rendering with character cleaning
     */
    private addTextSafe(
        text: string,
        x: number,
        y: number,
        options: {
            fontSize?: number
            fontStyle?: "normal" | "bold" | "italic" | "bolditalic"
            color?: [number, number, number]
            align?: "left" | "center" | "right"
            maxWidth?: number
            lineSpacing?: number
        } = {}
    ): number {
        // Clean the text first
        const cleanedText = this.cleanText(text)
        
        // Apply font settings
        const fontSize = options.fontSize || 10
        const fontStyle = options.fontStyle || "normal"
        const color = options.color || [0, 0, 0]
        const align = options.align || "left"
        const lineSpacing = options.lineSpacing || (fontSize * 0.4) // Balanced line spacing for readability
        
        // Always use helvetica for consistency
        this.doc.setFont("helvetica", fontStyle)
        this.doc.setFontSize(fontSize)
        this.doc.setTextColor(color[0], color[1], color[2])
        
        let textHeight: number
        
        if (options.maxWidth) {
            const lines = this.doc.splitTextToSize(cleanedText, options.maxWidth)
            
            lines.forEach((line: string, index: number) => {
                const yPos = y + (index * lineSpacing)
                this.doc.text(line, x, yPos, { align: align })
            })
            
            textHeight = lines.length * lineSpacing
        } else {
            this.doc.text(cleanedText, x, y, { align: align })
            textHeight = lineSpacing
        }
        
        // Always reset to normal after rendering
        this.doc.setFont("helvetica", "normal")
        this.doc.setFontSize(10)
        this.doc.setTextColor(0, 0, 0)
        
        return textHeight
    }

    /**
     * Add wrapped text with consistent formatting
     */
    private addWrappedText(
        text: string,
        fontSize: number = 10,
        indent: number = 0,
        fontStyle: "normal" | "bold" | "italic" | "bolditalic" = "normal",
        color: [number, number, number] = [0, 0, 0]
    ): void {
        this.addNewPageIfNeeded(fontSize * 2)
        
        const maxWidth = this.pageWidth - this.margin * 2 - indent
        const textHeight = this.addTextSafe(text, this.margin + indent, this.currentY, {
            fontSize,
            fontStyle,
            color,
            maxWidth,
            lineSpacing: fontSize * 0.4
        })
        
        this.currentY += textHeight + 5 // Balanced spacing after wrapped text
    }

    private async initializeLogo(): Promise<void> {
        try {
            const imgSrc = (logoImage as StaticImageData).src

            if (imgSrc) {
                if (typeof imgSrc === "string" && imgSrc.startsWith("data:")) {
                    this.logoBase64 = imgSrc
                    this.logoLoaded = true
                    return
                }

                await new Promise<void>((resolve, reject) => {
                    const img = new Image()
                    img.crossOrigin = "anonymous"

                    img.onload = () => {
                        try {
                            const canvas = document.createElement("canvas")
                            const ctx = canvas.getContext("2d")

                            if (!ctx) {
                                reject(new Error("Canvas context not available"))
                                return
                            }

                            canvas.width = img.width
                            canvas.height = img.height

                            ctx.fillStyle = `rgb(${this.colors.primaryBlue[0]}, ${this.colors.primaryBlue[1]}, ${this.colors.primaryBlue[2]})`
                            ctx.fillRect(0, 0, canvas.width, canvas.height)

                            const cornerRadius = 18
                            ctx.beginPath()
                            ctx.roundRect(0, 0, canvas.width, canvas.height, cornerRadius)
                            ctx.clip()

                            ctx.fillStyle = `rgb(${this.colors.primaryBlue[0]}, ${this.colors.primaryBlue[1]}, ${this.colors.primaryBlue[2]})`
                            ctx.fillRect(0, 0, canvas.width, canvas.height)

                            ctx.drawImage(img, 0, 0)
                            const dataURL = canvas.toDataURL("image/jpeg", 0.9)
                            this.logoBase64 = dataURL
                            this.logoLoaded = true
                            resolve()
                        } catch (error) {
                            console.error("Error converting image to base64:", error)
                            reject(error)
                        }
                    }

                    img.onerror = (error) => {
                        console.error("Error loading image:", error)
                        reject(new Error("Failed to load image"))
                    }

                    img.src = imgSrc
                })
            }
        } catch (error) {
            console.warn("Failed to load logo image:", error)
            this.logoBase64 = null
            this.logoLoaded = false
        }
    }

    private createFallbackLogo(): string {
        const svgLogo = `
            <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#4F7CFF;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#6B8FFF;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="50" height="50" rx="18" fill="url(#grad1)"/>
                <rect x="15" y="12" width="20" height="14" rx="2" fill="white" opacity="0.9"/>
                <rect x="17" y="15" width="16" height="2" rx="1" fill="#4F7CFF"/>
                <rect x="17" y="18" width="12" height="1.5" rx="0.75" fill="#4F7CFF"/>
                <rect x="17" y="21" width="14" height="1.5" rx="0.75" fill="#4F7CFF"/>
                <text x="25" y="44" font-family="Arial, sans-serif" font-size="7" font-weight="bold" 
                        text-anchor="middle" fill="white">RESUME</text>
            </svg>
        `
        return "data:image/svg+xml;base64," + btoa(svgLogo)
    }

    private addNewPageIfNeeded(requiredHeight = 25): void {
        const footerSpace = 25 // Reduced footer space
        const availableSpace = this.pageHeight - this.currentY - this.margin - footerSpace
        
        if (requiredHeight > availableSpace) {
            this.doc.addPage()
            this.currentY = this.margin + 5 // Reduced top margin on new page
            // Reset font on new page
            this.doc.setFont("helvetica", "normal")
            this.doc.setFontSize(10)
            this.doc.setTextColor(0, 0, 0)
        }
    }

    private setFillColor(color: string): void {
        const hex = color.replace("#", "")
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        this.doc.setFillColor(r, g, b)
    }

    private addHeader(): void {
        // Header background
        this.doc.setFillColor(...this.colors.primaryBlue)
        this.doc.rect(0, 0, this.pageWidth, 35, "F")

        // Logo section
        const logoX = this.margin
        const logoY = 8
        const logoSize = 20
        let logoAdded = false

        if (this.logoLoaded && this.logoBase64) {
            try {
                let format: "JPEG" | "PNG" | "SVG" = "JPEG"
                if (this.logoBase64.includes("data:image/png")) {
                    format = "PNG"
                } else if (this.logoBase64.includes("data:image/svg")) {
                    format = "SVG"
                }

                this.doc.addImage(this.logoBase64, format, logoX, logoY, logoSize, logoSize)
                logoAdded = true
            } catch (error) {
                console.error("Failed to add logo:", error)
            }
        }

        if (!logoAdded) {
            try {
                const fallbackLogo = this.createFallbackLogo()
                this.doc.addImage(fallbackLogo, "SVG", logoX, logoY, logoSize, logoSize)
            } catch (error) {
                // Final fallback: text box
                this.doc.setFillColor(...this.colors.primaryBlue)
                this.doc.roundedRect(logoX, logoY, logoSize, logoSize, 5, 5, "F")
                
                this.addTextSafe("RESUME", logoX + logoSize / 2, logoY + logoSize / 2 + 2, {
                    fontSize: 7,
                    fontStyle: "bold",
                    color: [255, 255, 255],
                    align: "center"
                })
            }
        }

        // Header text
        this.addTextSafe("AgentHub", logoX + logoSize + 8, logoY + 11, {
            fontSize: 16,
            fontStyle: "bold",
            color: [255, 255, 255]
        })

        this.addTextSafe("by Tryzent", logoX + logoSize + 8, logoY + 16, {
            fontSize: 8,
            fontStyle: "normal",
            color: [255, 255, 255]
        })

        // Right side title
        const titleX = this.pageWidth - this.margin
        this.addTextSafe("Resume Analysis Report", titleX, logoY + 12, {
            fontSize: 14,
            fontStyle: "bold",
            color: [255, 255, 255],
            align: "right"
        })

        const currentDate = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        
        this.addTextSafe(`Generated: ${currentDate}`, titleX, logoY + 20, {
            fontSize: 8,
            fontStyle: "normal",
            color: [255, 255, 255],
            align: "right"
        })

        this.currentY = 45 // Reduced starting Y position
    }

    private async addFooter(): Promise<void> {
        const pageCount = this.doc.getNumberOfPages()

        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i)

            // Footer line
            this.doc.setDrawColor(...this.colors.primaryBlue)
            this.doc.setLineWidth(0.5)
            this.doc.line(this.margin, this.pageHeight - 18, this.pageWidth - this.margin, this.pageHeight - 18)

            // Footer text
            this.addTextSafe("Tryzent", this.margin, this.pageHeight - 12, {
                fontSize: 8,
                fontStyle: "bold",
                color: this.colors.lightText
            })

            const pageText = `Page ${i} of ${pageCount}`
            this.addTextSafe(pageText, this.pageWidth - this.margin, this.pageHeight - 12, {
                fontSize: 8,
                fontStyle: "normal",
                color: this.colors.lightText,
                align: "right"
            })
        }
    }

    private addTitle(text: string, fontSize = 18): void {
        this.addNewPageIfNeeded(25)
        
        this.addTextSafe(text, this.margin, this.currentY, {
            fontSize,
            fontStyle: "bold",
            color: this.colors.primaryBlue
        })
        
        // Add underline
        this.setFillColor(this.primaryBlue)
        const lineWidth = this.pageWidth - this.margin * 2
        this.doc.rect(this.margin, this.currentY + 2, lineWidth, 0.5, "F")

        this.currentY += 12 // Balanced spacing after title
    }

    private addSubtitle(text: string, fontSize = 13): void {
        this.addNewPageIfNeeded(18)
        
        this.addTextSafe(text, this.margin, this.currentY, {
            fontSize,
            fontStyle: "bold",
            color: this.colors.primary
        })
        
        this.currentY += 18 // Balanced spacing after subtitle
    }

    private addBulletPoint(text: string): void {
        this.addNewPageIfNeeded(12)
        
        const bulletX = this.margin + 5
        const textX = this.margin + 12
        const maxWidth = this.pageWidth - this.margin * 2 - 12
        
        // Add bullet
        this.addTextSafe("•", bulletX, this.currentY, {
            fontSize: 10,
            fontStyle: "normal",
            color: this.colors.primaryBlue
        })
        
        // Add wrapped text
        const textHeight = this.addTextSafe(text, textX, this.currentY, {
            fontSize: 10,
            fontStyle: "normal",
            color: [0, 0, 0],
            maxWidth,
            lineSpacing: 4.5 // Balanced line spacing
        })
        
        this.currentY += textHeight + 4 // Balanced spacing between bullet points
    }

    private addSectionHeader(text: string, color: string): void {
        this.addNewPageIfNeeded(20)

        const boxHeight = 11 // Balanced box height
        const boxWidth = this.pageWidth - this.margin * 2
        const cornerRadius = 3

        // Add background
        this.setFillColor(color)
        this.doc.roundedRect(this.margin, this.currentY - 7, boxWidth, boxHeight, cornerRadius, cornerRadius, "F")

        // Add text
        this.addTextSafe(text, this.margin + 8, this.currentY, {
            fontSize: 11,
            fontStyle: "bold",
            color: [255, 255, 255]
        })

        this.currentY += 14 // Balanced spacing after section header
    }

    private addSectionGap(gap = 8): void { // Balanced default gap
        this.currentY += gap
    }

    private addScoreBox(score: number, recommendation: string): void {
        this.addNewPageIfNeeded(30) // Reduced space requirement

        const boxWidth = 140
        const boxHeight = 18 // Slightly reduced height
        const boxX = this.margin
        const boxY = this.currentY - 5

        // Background
        this.doc.setFillColor(245, 247, 250)
        this.doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 4, 4, "F")

        // Score text
        this.addTextSafe(`Score: ${score}/100`, boxX + 8, boxY + 7, {
            fontSize: 14,
            fontStyle: "bold",
            color: this.colors.text
        })

        // Recommendation
        this.addTextSafe(`${recommendation}`, boxX + 8, boxY + 13, {
            fontSize: 10,
            fontStyle: "normal",
            color: this.colors.text
        })

        this.currentY += boxHeight + 6 // Reduced spacing after score box
    }

    private addSectionWithTwoColumnParagraphs(
        sectionTitle: string,
        leftTitle: string,
        leftItems: string[],
        rightTitle: string,
        rightItems: string[],
        color: string
    ): void {
        const gutter = 10
        const columnWidth = (this.pageWidth - this.margin * 2 - gutter) / 2
        
        const leftText = leftItems.length > 0 ? leftItems.join(", ") : "None"
        const rightText = rightItems.length > 0 ? rightItems.join(", ") : "None"
        
        // Calculate required space
        const estimatedLines = Math.max(
            Math.ceil(leftText.length / 55),
            Math.ceil(rightText.length / 55)
        )
        const requiredHeight = 30 + (estimatedLines * 7) + 12
        
        this.addNewPageIfNeeded(requiredHeight)
        
        // Section header
        this.addSectionHeader(sectionTitle, color)
        
        // Column titles
        const titleY = this.currentY
        
        this.addTextSafe(leftTitle, this.margin, titleY, {
            fontSize: 10,
            fontStyle: "bold",
            color: [17, 24, 39]
        })
        
        this.addTextSafe(rightTitle, this.margin + columnWidth + gutter, titleY, {
            fontSize: 10,
            fontStyle: "bold",
            color: [17, 24, 39]
        })
        
        this.currentY = titleY + 10 // Balanced spacing after column titles
        
        // Column content
        const contentY = this.currentY
        
        const leftHeight = this.addTextSafe(leftText, this.margin, contentY, {
            fontSize: 9.5, // Slightly larger for readability
            fontStyle: "normal",
            color: [17, 24, 39],
            maxWidth: columnWidth,
            lineSpacing: 4.5 // Better line spacing for readability
        })
        
        const rightHeight = this.addTextSafe(rightText, this.margin + columnWidth + gutter, contentY, {
            fontSize: 9.5, // Slightly larger for readability
            fontStyle: "normal",
            color: [17, 24, 39],
            maxWidth: columnWidth,
            lineSpacing: 4.5 // Better line spacing for readability
        })
        
        this.currentY = contentY + Math.max(leftHeight, rightHeight) + 10 // Balanced spacing after columns
    }

    private addKeywordAnalysis(matched: string[], missing: string[]): void {
        this.addSectionWithTwoColumnParagraphs(
            "KEYWORD ANALYSIS",
            `Matched Keywords (${matched.length})`,
            matched,
            `Missing Keywords (${missing.length})`,
            missing,
            this.primaryBlue
        )
    }

    private addSkillsAnalysis(matched: string[], missing: string[]): void {
        this.addSectionWithTwoColumnParagraphs(
            "SKILLS ANALYSIS",
            `Matched Skills (${matched.length})`,
            matched,
            `Missing Skills (${missing.length})`,
            missing,
            this.primaryBlue
        )
    }

    private addQualificationsAnalysis(matched: string[], missing: string[]): void {
        this.addSectionWithTwoColumnParagraphs(
            "QUALIFICATIONS ANALYSIS",
            `Matched Qualifications (${matched.length})`,
            matched,
            `Missing Qualifications (${missing.length})`,
            missing,
            this.primaryBlue
        )
    }

    private addExperienceAnalysis(matched: string[], missing: string[]): void {
        this.addSectionWithTwoColumnParagraphs(
            "EXPERIENCE ANALYSIS",
            `Relevant Experience (${matched.length})`,
            matched,
            `Missing Experience (${missing.length})`,
            missing,
            this.primaryBlue
        )
    }

    private addRecommendations(jobTitles: string[]): void {
        // Calculate total space needed with reduced spacing
        let totalSpaceNeeded = 20
        jobTitles.forEach(title => {
            const estimatedLines = Math.ceil(title.length / 65)
            totalSpaceNeeded += (estimatedLines * 5) + 5
        })

        this.addNewPageIfNeeded(Math.min(totalSpaceNeeded, 80))

        this.addSectionHeader("RECOMMENDED JOB TITLES", this.primaryBlue)

        // Add each job title as a bullet point
        jobTitles.forEach(title => {
            this.addBulletPoint(title)
        })
        
        this.currentY += 4 // Reduced spacing after recommendations
    }

    private addReasoning(reasoning: string[]): void {
        this.addNewPageIfNeeded(25)
        this.addSectionHeader("DETAILED REASONING", this.primaryBlue)
        
        reasoning.forEach((reason, index) => {
            const numberedReason = `${index + 1}. ${reason}`
            this.addWrappedText(numberedReason, 10, 0, "normal", [17, 24, 39])
            this.currentY += 3 // Small breathing space between reasoning points
        })
    }

    private addResumeAnalysis(analysis: ResumeAnalysis, resumeIndex: number): void {
        this.addNewPageIfNeeded(45)

        // Resume header
        this.addTitle(`Resume ${resumeIndex + 1}: ${analysis.resume}`)

        // Score box
        this.addScoreBox(analysis.ats_score, analysis.recommendation)

        // Summary
        this.addSectionHeader("SUMMARY", this.primaryBlue)
        this.addWrappedText(analysis.summary, 10, 5, "normal", [17, 24, 39])
        this.addSectionGap(8) // Balanced gap

        // Detailed Reasoning
        if (analysis.reasoning && analysis.reasoning.length) {
            this.addReasoning(analysis.reasoning)
            this.addSectionGap(8) // Balanced gap
        }

        // Analysis sections with balanced spacing
        this.addKeywordAnalysis(analysis.matched_keywords, analysis.missing_keywords)
        this.addSectionGap(8) // Balanced gap
        
        this.addSkillsAnalysis(analysis.matched_skills, analysis.missing_skills)
        this.addSectionGap(8) // Balanced gap
        
        this.addQualificationsAnalysis(analysis.matched_qualifications, analysis.missing_qualifications)
        this.addSectionGap(8) // Balanced gap
        
        this.addExperienceAnalysis(analysis.matched_experience, analysis.missing_experience)
        this.addSectionGap(8) // Balanced gap
        
        this.addRecommendations(analysis.recommmended_job_titles)
    }

    public async generatePDF(resumeData: ResumeData, userConfig: UserConfig = {}): Promise<jsPDF> {
        try {
            await this.initializeLogo()
            
            // Initialize document state
            this.currentY = this.margin
            
            // Reset font at start
            this.doc.setFont("helvetica", "normal")
            this.doc.setFontSize(10)
            this.doc.setTextColor(0, 0, 0)

            // Add header
            this.addHeader()

            // Add job requirements if available
            if (userConfig.job_role || userConfig.special_instructions) {
                this.addSectionHeader("JOB REQUIREMENTS", this.primaryBlue)
                
                if (userConfig.job_role) {
                    this.addSubtitle("Target Role")
                    this.addWrappedText(userConfig.job_role, 10, 5, "normal", [17, 24, 39])
                    this.addSectionGap(4) // Reduced gap
                }
                
                if (userConfig.special_instructions) {
                    this.addSubtitle("Special Requirements")
                    this.addWrappedText(userConfig.special_instructions, 10, 5, "normal", [17, 24, 39])
                    this.addSectionGap(6) // Reduced gap
                }
            }
            
            // Add resume analyses
            if (resumeData.agent_outputs && resumeData.agent_outputs.length > 0) {
                resumeData.agent_outputs.forEach((analysis, index) => {
                    if (index > 0) {
                        this.doc.addPage()
                        this.currentY = this.margin + 5 // Reduced top margin on new page
                        this.doc.setFont("helvetica", "normal")
                        this.doc.setFontSize(10)
                        this.doc.setTextColor(0, 0, 0)
                    }
                    this.addResumeAnalysis(analysis, index)
                })
            }

            // Add footer
            await this.addFooter()

            return this.doc
        } catch (error) {
            console.error("Error generating PDF:", error)
            throw new Error("Failed to generate PDF. Please check your data and try again.")
        }
    }

    public async downloadPDF(
        resumeData: ResumeData,
        userConfig: UserConfig = {},
        filename = "resume-analysis-report.pdf"
    ): Promise<void> {
        const pdf = await this.generatePDF(resumeData, userConfig)
        pdf.save(filename)
    }

    public async getPDFBlob(resumeData: ResumeData, userConfig: UserConfig = {}): Promise<Blob> {
        const pdf = await this.generatePDF(resumeData, userConfig)
        return pdf.output("blob")
    }

    public async getPDFDataURL(resumeData: ResumeData, userConfig: UserConfig = {}): Promise<string> {
        const pdf = await this.generatePDF(resumeData, userConfig)
        return pdf.output("dataurlstring")
    }
}

// Utility functions for easy usage (now async)
export const generateResumeScorerPDF = async (resumeData: ResumeData, userConfig: UserConfig = {}): Promise<jsPDF> => {
    const generator = new ResumeScorerPDFGenerator()
    return await generator.generatePDF(resumeData, userConfig)
}

export const downloadResumeScorerPDF = async (
    resumeData: ResumeData,
    userConfig: UserConfig = {},
    filename = "resume-analysis-report.pdf",
): Promise<void> => {
    const generator = new ResumeScorerPDFGenerator()
    await generator.downloadPDF(resumeData, userConfig, filename)
}

export const getResumeScorerPDFBlob = async (resumeData: ResumeData, userConfig: UserConfig = {}): Promise<Blob> => {
    const generator = new ResumeScorerPDFGenerator()
    return await generator.getPDFBlob(resumeData, userConfig)
}

// Enhanced example usage function for resume scorer
export const createResumeScorerPDFFromResponse = async (
    apiResponse: any,
    userInputs: any = {},
    filename?: string,
): Promise<void> => {
    try {
        // Extract resume data from API response
        let resumeData: ResumeData

        if (apiResponse.data) {
            resumeData = apiResponse.data
        } else if (apiResponse.agent_outputs) {
            resumeData = apiResponse
        } else {
            throw new Error("Invalid resume data format")
        }

        // Extract user configuration from user_inputs
        const userConfig: UserConfig = {}
        
        if (resumeData.user_inputs) {
            resumeData.user_inputs.forEach(input => {
                if (input.variable === "Job_Role") {
                    userConfig.job_role = input.variable_value
                } else if (input.variable === "Special_Instructions") {
                    userConfig.special_instructions = input.variable_value
                }
            })
        }

        // Override with direct userInputs if provided
        if (userInputs.Job_Role) userConfig.job_role = userInputs.Job_Role
        if (userInputs.Special_Instructions) userConfig.special_instructions = userInputs.Special_Instructions
        if (userInputs.total_resumes) userConfig.total_resumes = userInputs.total_resumes

        // Generate filename if not provided
        const pdfFilename = filename || `resume-analysis-${new Date().toISOString().split("T")[0]}.pdf`

        // Download the PDF
        await downloadResumeScorerPDF(resumeData, userConfig, pdfFilename)
    } catch (error) {
        console.error("Error generating resume scorer PDF:", error)
        throw new Error("Failed to generate resume scorer PDF. Please check the data format.")
    }
}