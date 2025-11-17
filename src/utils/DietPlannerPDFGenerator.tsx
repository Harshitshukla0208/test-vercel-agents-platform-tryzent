import jsPDF from "jspdf"
import type { StaticImageData } from "next/image"
import logoImage from "../assets/logo.jpeg"
import youtubeLogoImage from "../assets/icons8-youtube.svg"

// Extend jsPDF type to include autoTable
declare module "jspdf" {
    interface jsPDF {
        autoTable: (options: any) => void
    }
}

interface Meal {
    name: string
    description: string
    calories?: number
    macros?: any
    ingredients?: string[]
    instructions?: string
    tips?: string[]
    google_resource?: string
}

interface Day {
    day: number
    focus: string
    day_summary?: string
    daily_summary?: string // Added for backward compatibility
    meals: Meal[]
}

interface Week {
    week: number
    weekly_summary?: string
    weekly_overview?: string // Added for backward compatibility
    days: Day[]
}

interface DietData {
    weekly_details: Week[]
}

interface UserConfig {
    age?: number
    height?: number
    weight?: number
    gender?: string
    diet_goal?: string
    country?: string
    dietary_preferences?: string[]
    allergies?: string[]
    calorie_goal?: number
    macro_goals?: any
    meals_per_day?: number
    available_cooking_time_per_day?: number
    kitchen_equipment?: string[]
    health_conditions?: string[]
    total_weeks?: number
}

export class DietPDFGenerator {
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
    private youtubeLogoBase64: string | null = null
    private youtubeLogoLoaded = false
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
        // Updated color scheme with blue colors for diet planner
        this.primaryColor = "#2D3748" // Dark gray-blue
        this.primaryBlue = "#4F7CFF" // Blue color for diet planner
        this.secondaryColor = "#6B7280" // Medium gray
        this.accentColor = "#10B981" // Green accent

        // Updated color palette with blue
        this.colors = {
            primary: [45, 55, 72], // #2D3748
            primaryBlue: [79, 124, 255], // #4F7CFF - Blue for diet planner
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
    }

    // Improved logo loading with proper async handling and Next.js image import compatibility
    private async initializeLogo(): Promise<void> {
        try {
            console.log("Initializing logo...")

            // Access the .src property of the imported image module
            const imgSrc = (logoImage as StaticImageData).src

            if (imgSrc) {
                console.log("Logo image source found:", imgSrc)

                // If imgSrc is already a data URL, use it directly
                if (typeof imgSrc === "string" && imgSrc.startsWith("data:")) {
                    this.logoBase64 = imgSrc
                    this.logoLoaded = true
                    console.log("Logo loaded as data URL directly from import")
                    return
                }

                // Create a promise-based image loader
                await new Promise<void>((resolve, reject) => {
                    const img = new Image()
                    img.crossOrigin = "anonymous" // Handle CORS issues

                    img.onload = () => {
                        try {
                            // Create canvas to convert image to base64
                            const canvas = document.createElement("canvas")
                            const ctx = canvas.getContext("2d")

                            if (!ctx) {
                                reject(new Error("Canvas context not available"))
                                return
                            }

                            canvas.width = img.width
                            canvas.height = img.height

                            // Add blue background with increased corner radius
                            ctx.fillStyle = `rgb(${this.colors.primaryBlue[0]}, ${this.colors.primaryBlue[1]}, ${this.colors.primaryBlue[2]})`
                            ctx.fillRect(0, 0, canvas.width, canvas.height)

                            // Add rounded corners with increased radius
                            const cornerRadius = 18 // Increased from 10 for more rounding
                            ctx.beginPath()
                            ctx.roundRect(0, 0, canvas.width, canvas.height, cornerRadius)
                            ctx.clip() // Clip subsequent drawing to this path

                            // Redraw the background within the clipped area
                            ctx.fillStyle = `rgb(${this.colors.primaryBlue[0]}, ${this.colors.primaryBlue[1]}, ${this.colors.primaryBlue[2]})`
                            ctx.fillRect(0, 0, canvas.width, canvas.height)

                            ctx.drawImage(img, 0, 0) // Draw image within the clipped path
                            // Get base64 data
                            const dataURL = canvas.toDataURL("image/jpeg", 0.9)
                            this.logoBase64 = dataURL
                            this.logoLoaded = true
                            console.log("Logo successfully converted to base64 with blue background")
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

                    img.src = imgSrc // Use the extracted src
                })
            }
        } catch (error) {
            console.warn("Failed to load logo image:", error)
            this.logoBase64 = null
            this.logoLoaded = false
        }
    }

    // Initialize YouTube logo
    private async initializeYoutubeLogo(): Promise<void> {
        try {
            console.log("Initializing YouTube logo...")

            // Access the .src property of the imported image module
            const imgSrc = (youtubeLogoImage as StaticImageData).src

            if (imgSrc) {
                console.log("YouTube logo image source found:", imgSrc)

                // If imgSrc is already a data URL, use it directly
                if (typeof imgSrc === "string" && imgSrc.startsWith("data:")) {
                    this.youtubeLogoBase64 = imgSrc
                    this.youtubeLogoLoaded = true
                    console.log("YouTube logo loaded as data URL directly from import")
                    return
                }

                // Create a promise-based image loader
                await new Promise<void>((resolve, reject) => {
                    const img = new Image()
                    img.crossOrigin = "anonymous" // Handle CORS issues

                    img.onload = () => {
                        try {
                            // Create canvas to convert image to base64
                            const canvas = document.createElement("canvas")
                            const ctx = canvas.getContext("2d")

                            if (!ctx) {
                                reject(new Error("Canvas context not available"))
                                return
                            }

                            canvas.width = img.width
                            canvas.height = img.height

                            // Draw image directly without background
                            ctx.drawImage(img, 0, 0)
                            
                            // Get base64 data
                            const dataURL = canvas.toDataURL("image/png", 0.9)
                            this.youtubeLogoBase64 = dataURL
                            this.youtubeLogoLoaded = true
                            console.log("YouTube logo successfully converted to base64")
                            resolve()
                        } catch (error) {
                            console.error("Error converting YouTube logo to base64:", error)
                            reject(error)
                        }
                    }

                    img.onerror = (error) => {
                        console.error("Error loading YouTube logo:", error)
                        reject(new Error("Failed to load YouTube logo"))
                    }

                    img.src = imgSrc // Use the extracted src
                })
            }
        } catch (error) {
            console.warn("Failed to load YouTube logo:", error)
            this.youtubeLogoBase64 = null
            this.youtubeLogoLoaded = false
        }
    }

    // Create fallback YouTube logo as SVG
    private createFallbackYoutubeLogo(): string {
        const svgLogo = `
            <svg width="16" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 12">
                <rect width="16" height="12" rx="2" fill="#FF0000"/>
                <polygon points="6,3 6,9 11,6" fill="white"/>
            </svg>
        `
        return "data:image/svg+xml;base64," + btoa(svgLogo)
    }

    // Better base64 logo setter with validation
    public setLogoFromBase64(base64String: string): void {
        try {
            // Validate base64 string
            if (base64String && (base64String.startsWith("data:image/") || base64String.startsWith("/9j/"))) {
                this.logoBase64 = base64String.startsWith("data:") ? base64String : `data:image/jpeg;base64,${base64String}`
                this.logoLoaded = true
                console.log("Logo set from base64 string")
            } else {
                throw new Error("Invalid base64 image format")
            }
        } catch (error) {
            console.error("Error setting logo from base64:", error)
            this.logoBase64 = null
            this.logoLoaded = false
        }
    }

    // Improved file loading with better error handling
    public async setLogoFromFile(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith("image/")) {
                reject(new Error("File is not an image"))
                return
            }

            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const result = e.target?.result as string
                    if (result) {
                        this.logoBase64 = result
                        this.logoLoaded = true
                        console.log("Logo loaded from file")
                        resolve()
                    } else {
                        reject(new Error("Failed to read file"))
                    }
                } catch (error) {
                    reject(error)
                }
            }
            reader.onerror = () => reject(new Error("FileReader error"))
            reader.readAsDataURL(file)
        })
    }

    // Enhanced fallback logo with primary blue and increased rounding
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
                <circle cx="25" cy="18" r="6" fill="white" opacity="0.9"/>
                <rect x="15" y="26" width="20" height="3" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="18" y="31" width="14" height="2" rx="1" fill="white" opacity="0.7"/>
                <text x="25" y="44" font-family="Arial, sans-serif" font-size="7" font-weight="bold" 
                        text-anchor="middle" fill="white">DIET</text>
            </svg>
        `
        return "data:image/svg+xml;base64," + btoa(svgLogo)
    }

    private addNewPageIfNeeded(requiredHeight = 25): void {
        if (this.currentY + requiredHeight > this.pageHeight - this.margin - 20) {
            this.doc.addPage()
            this.currentY = this.margin + 10
        }
    }

    private setColor(color: string): void {
        const hex = color.replace("#", "")
        const r = Number.parseInt(hex.substr(0, 2), 16)
        const g = Number.parseInt(hex.substr(2, 2), 16)
        const b = Number.parseInt(hex.substr(4, 2), 16)
        this.doc.setTextColor(r, g, b)
    }

    private setFillColor(color: string): void {
        const hex = color.replace("#", "")
        const r = Number.parseInt(hex.substr(0, 2), 16)
        const g = Number.parseInt(hex.substr(2, 2), 16)
        const b = Number.parseInt(hex.substr(4, 2), 16)
        this.doc.setFillColor(r, g, b)
    }

    private resetColor(): void {
        this.doc.setTextColor(0, 0, 0)
    }

    // Enhanced header with primary blue
    private addHeader(): void {
        // Header background with primary blue gradient
        this.doc.setFillColor(...this.colors.primaryBlue)
        this.doc.rect(0, 0, this.pageWidth, 35, "F")

        // Logo section
        const logoX = this.margin
        const logoY = 8
        const logoSize = 20
        let logoAdded = false

        // Try to add the pre-loaded base64 logo
        if (this.logoLoaded && this.logoBase64) {
            try {
                // Determine format from base64 string
                let format: "JPEG" | "PNG" | "SVG" = "JPEG" // Default to JPEG
                if (this.logoBase64.includes("data:image/png")) {
                    format = "PNG"
                } else if (this.logoBase64.includes("data:image/svg")) {
                    format = "SVG"
                }

                this.doc.addImage(this.logoBase64, format, logoX, logoY, logoSize, logoSize)
                logoAdded = true
                console.log("Logo added successfully from pre-loaded base64 with format:", format)
            } catch (error) {
                console.error("Failed to add pre-loaded base64 logo:", error)
            }
        }

        // Use enhanced fallback if logo still not added
        if (!logoAdded) {
            try {
                const fallbackLogo = this.createFallbackLogo()
                this.doc.addImage(fallbackLogo, "SVG", logoX, logoY, logoSize, logoSize)
                logoAdded = true
                console.log("Fallback SVG logo added")
            } catch (error) {
                console.error("Even fallback logo failed:", error)

                // Final fallback: styled text box with primary blue and increased rounding
                this.doc.setFillColor(...this.colors.primaryBlue)
                this.doc.roundedRect(logoX, logoY, logoSize, logoSize, 5, 5, "F")

                // Logo text
                this.doc.setTextColor(255, 255, 255)
                this.doc.setFontSize(8)
                this.doc.setFont("helvetica", "bold")
                this.doc.text("DIET", logoX + logoSize / 2, logoY + logoSize / 2 + 2, { align: "center" })
                console.log("Final fallback text logo created with blue background")
            }
        }

        // Company name and tagline
        this.doc.setTextColor(255, 255, 255)
        this.doc.setFontSize(16)
        this.doc.setFont("helvetica", "bold")
        this.doc.text("AgentHub", logoX + logoSize + 8, logoY + 11)

        this.doc.setFontSize(8)
        this.doc.setFont("helvetica", "normal")
        this.doc.setTextColor(255, 255, 255)
        this.doc.text("by Tryzent", logoX + logoSize + 8, logoY + 16)

        // Right side: Diet Plan Title
        const titleX = this.pageWidth - this.margin
        const titleY = logoY

        this.doc.setTextColor(255, 255, 255)
        this.doc.setFontSize(14)
        this.doc.setFont("helvetica", "bold")
        this.doc.text("Personal Diet Plan", titleX, titleY + 12, { align: "right" })

        this.doc.setFontSize(8)
        this.doc.setFont("helvetica", "normal")
        const currentDate = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        this.doc.text(`Generated: ${currentDate}`, titleX, titleY + 20, { align: "right" })

        this.resetColor()
        this.currentY = 45
    }

    // Enhanced footer
    private async addFooter(): Promise<void> {
        const pageCount = this.doc.getNumberOfPages()

        try {
            const logoBase64 = await this.getFooterLogoBase64()

            for (let i = 1; i <= pageCount; i++) {
                this.doc.setPage(i)

                // Footer line with primary blue
                this.doc.setDrawColor(...this.colors.primaryBlue)
                this.doc.setLineWidth(0.5)
                this.doc.line(this.margin, this.pageHeight - 18, this.pageWidth - this.margin, this.pageHeight - 18)

                // Footer content
                this.doc.setTextColor(...this.colors.lightText)
                this.doc.setFont("helvetica", "normal")
                this.doc.setFontSize(8)

                // Left: Logo and branding
                const footerLogoSize = 5
                const logoX = this.margin
                const logoY = this.pageHeight - 16

                // Logo without background
                this.doc.addImage(logoBase64, "JPEG", logoX, logoY, footerLogoSize, footerLogoSize)
                this.doc.setFont("helvetica", "bold")
                this.doc.text("Tryzent", logoX + footerLogoSize + 1, this.pageHeight - 12.5)

                // Right: Page numbers
                const pageText = `Page ${i} of ${pageCount}`
                const pageTextWidth = this.doc.getTextWidth(pageText)
                this.doc.text(pageText, this.pageWidth - this.margin - pageTextWidth, this.pageHeight - 12)
            }
        } catch (error) {
            console.warn("Error adding logo to footer:", error)
            // Fallback footer
            for (let i = 1; i <= pageCount; i++) {
                this.doc.setPage(i)
                this.doc.setDrawColor(...this.colors.primaryBlue)
                this.doc.setLineWidth(0.5)
                this.doc.line(this.margin, this.pageHeight - 18, this.pageWidth - this.margin, this.pageHeight - 18)

                this.doc.setTextColor(...this.colors.lightText)
                this.doc.setFont("helvetica", "bold")
                this.doc.setFontSize(8)
                this.doc.text("Tryzent", this.margin, this.pageHeight - 12)

                const pageText = `Page ${i} of ${pageCount}`
                const pageTextWidth = this.doc.getTextWidth(pageText)
                this.doc.text(pageText, this.pageWidth - this.margin - pageTextWidth, this.pageHeight - 12)
            }
        }
    }

    // Add the footer logo method with primary blue
    private async getFooterLogoBase64(): Promise<string> {
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

                ctx.fillStyle = `rgb(${this.colors.primaryBlue[0]}, ${this.colors.primaryBlue[1]}, ${this.colors.primaryBlue[2]})`
                ctx.fillRect(0, 0, size, size)

                const radius = size * 0.0 // No rounded corners for footer logo
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

            // Use the same logo source as the header
            const imgSrc = (logoImage as StaticImageData).src
            img.src = imgSrc
        })
    }

    private addTitle(text: string, fontSize = 18): void {
        this.addNewPageIfNeeded(20)
        this.setColor(this.primaryBlue)
        this.doc.setFontSize(fontSize)
        this.doc.setFont("helvetica", "bold")

        // Add subtle underline with primary blue
        this.doc.text(text, this.margin, this.currentY)
        const textWidth = this.doc.getTextWidth(text)
        this.setFillColor(this.primaryBlue)
        this.doc.rect(this.margin, this.currentY + 2, textWidth, 0.5, "F")

        this.resetColor()
        this.currentY += 18
    }

    private addSubtitle(text: string, fontSize = 13): void {
        this.addNewPageIfNeeded(15)
        this.setColor(this.primaryColor)
        this.doc.setFontSize(fontSize)
        this.doc.setFont("helvetica", "bold")
        this.doc.text(text, this.margin, this.currentY)
        this.resetColor()
        this.currentY += 10
    }

    private addText(text: string, fontSize = 10, indent = 0, color = "#000000"): void {
        this.addNewPageIfNeeded(10)
        this.setColor(color)
        this.doc.setFontSize(fontSize)
        this.doc.setFont("helvetica", "normal")

        const maxWidth = this.pageWidth - this.margin * 2 - indent
        const lines = this.doc.splitTextToSize(text, maxWidth)

        for (const line of lines) {
            this.addNewPageIfNeeded(8)
            this.doc.text(line, this.margin + indent, this.currentY)
            this.currentY += 6
        }
        this.resetColor()
        this.currentY += 5
    }

    // Improved bullet point with proper spacing
    private addBulletPoint(text: string, fontSize = 9): void {
        this.addNewPageIfNeeded(8)
        this.doc.setFontSize(fontSize)
        this.doc.setFont("helvetica", "normal")

        const maxWidth = this.pageWidth - this.margin * 2 - 10
        const lines = this.doc.splitTextToSize(text, maxWidth)

        // Add bullet point with primary blue color
        this.setColor(this.primaryBlue)
        this.doc.setFontSize(fontSize + 2)
        this.doc.text("•", this.margin + 5, this.currentY)
        this.resetColor()

        this.doc.setFontSize(fontSize)
        for (let i = 0; i < lines.length; i++) {
            this.addNewPageIfNeeded(6)
            this.doc.text(lines[i], this.margin + 12, this.currentY)
            this.currentY += 5
        }
        this.currentY += 3
    }

    private addSectionHeader(text: string, color: string): void {
        this.addNewPageIfNeeded(20)

        const boxHeight = 12
        const boxWidth = this.pageWidth - this.margin * 2
        const cornerRadius = 3

        // Add rounded rectangle background
        this.setFillColor(color)
        this.doc.roundedRect(this.margin, this.currentY - 8, boxWidth, boxHeight, cornerRadius, cornerRadius, "F")

        // Add text
        this.setColor("#FFFFFF")
        this.doc.setFontSize(12)
        this.doc.setFont("helvetica", "bold")
        this.doc.text(text, this.margin + 8, this.currentY)

        this.resetColor()
        this.currentY += 15
    }

    // Improved meal info with clean white background
    private addMealInfo(meal: Meal): void {
        const info: string[] = []
        if (meal.calories) info.push(`Calories: ${meal.calories}`)
        if (meal.macros) {
            if (meal.macros.protein) info.push(`Protein: ${meal.macros.protein}g`)
            if (meal.macros.carbs) info.push(`Carbs: ${meal.macros.carbs}g`)
            if (meal.macros.fat) info.push(`Fat: ${meal.macros.fat}g`)
        }

        if (info.length > 0) {
            this.addNewPageIfNeeded(25)

            // Calculate the maximum width needed for content
            this.doc.setFontSize(10)
            this.doc.setFont("helvetica", "normal")
            let maxTextWidth = 0

            info.forEach((stat) => {
                const textWidth = this.doc.getTextWidth(`• ${stat}`)
                if (textWidth > maxTextWidth) {
                    maxTextWidth = textWidth
                }
            })

            // Calculate box dimensions based on content
            const rowHeight = 6
            const topBottomPadding = 5
            const leftRightPadding = 8
            const rightMargin = 10
            const innerTopMargin = 1.5
            const boxHeight = (info.length * rowHeight) + topBottomPadding + innerTopMargin
            const boxWidth = maxTextWidth + leftRightPadding + rightMargin

            // Position the box with left margin
            const boxX = this.margin + 5
            const boxY = this.currentY - 2

            // White background with reduced border radius
            this.setFillColor("#FFFFFF")
            this.doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "F")

            // Blue border with reduced thickness
            this.doc.setDrawColor(...this.colors.primaryBlue)
            this.doc.setLineWidth(0.4)
            this.doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "S")

            // Set text properties
            this.doc.setTextColor(0, 0, 0)
            this.doc.setFontSize(10)
            this.doc.setFont("helvetica", "normal")

            // Display each stat with bullet points
            const startX = boxX + 6
            let currentStatY = boxY + 6 + innerTopMargin

            info.forEach((stat) => {
                // Add blue bullet point
                this.doc.setTextColor(...this.colors.primaryBlue)
                this.doc.text("•", startX, currentStatY)

                // Add the stat text with proper spacing after bullet (black text)
                this.doc.setTextColor(0, 0, 0)
                this.doc.text(stat, startX + 6, currentStatY)
                currentStatY += rowHeight
            })

            this.resetColor()
            this.currentY += boxHeight + 8
        }
    }

    private addWeeklyPlan(week: Week): void {
        this.addNewPageIfNeeded(35)

        // Week header with primary blue
        this.addSectionHeader(`WEEK ${week.week}`, this.primaryBlue)

        // Week summary/overview with better formatting and proper spacing
        if (week.weekly_overview || week.weekly_summary) {
            this.addSubtitle("Week Overview")
            this.addText(week.weekly_overview || week.weekly_summary || "", 10, 0, this.primaryColor)
            // Add proper spacing after week overview
            this.currentY += 8
        }

        // Days with improved spacing
        week.days.forEach((day, index) => {
            this.addDayPlan(day)
            if (index < week.days.length - 1) {
                this.currentY += 8
            }
        })
    }

    private addDayPlan(day: Day): void {
        this.addNewPageIfNeeded(30)

        // Day header using primary blue
        this.addSectionHeader(`DAY ${day.day} • ${day.focus.toUpperCase()}`, this.primaryBlue)

        // Day summary/overview with improved spacing
        if (day.day_summary || day.daily_summary) {
            this.addText(day.day_summary || day.daily_summary || "", 10, 5, this.primaryColor)
        }

        // Meals with better organization
        day.meals.forEach((meal, index) => {
            this.addMeal(meal, index + 1)
        })
    }

    private addMeal(meal: Meal, mealNumber: number): void {
        this.addNewPageIfNeeded(20)

        // Meal header with number using primary blue
        this.setColor(this.primaryBlue)
        this.doc.setFontSize(12)
        this.doc.setFont("helvetica", "bold")
        this.doc.text(`${mealNumber}.`, this.margin, this.currentY)
        this.doc.text(meal.name, this.margin + 8, this.currentY)
        this.resetColor()
        this.currentY += 8

        // Description with better formatting
        if (meal.description) {
            this.addText(meal.description || "", 10, 8, this.primaryColor)
        }

        // Nutrition info in a clean formatted box
        this.addMealInfo(meal)

        // Ingredients with improved formatting
        if (meal.ingredients && meal.ingredients.length > 0) {
            this.addSubtitle("Ingredients")
            meal.ingredients.forEach((ingredient) => {
                this.addBulletPoint(ingredient)
            })
        }

        // Instructions with better formatting
        if (meal.instructions) {
            this.addSubtitle("Instructions")
            this.addText(meal.instructions || "", 10, 8, this.primaryColor)
        }

        // Tips with improved formatting
        if (meal.tips && meal.tips.length > 0) {
            this.addSubtitle("Tips & Guidelines")
            meal.tips.forEach((tip) => {
                this.addBulletPoint(tip)
            })
        }

        // Enhanced resource link with YouTube logo
        if (meal.google_resource) {
            this.addNewPageIfNeeded(15)

            // Add a background box for the resource link
            const linkBoxWidth = this.pageWidth - this.margin * 2 - 16
            const linkBoxHeight = 10

            // Light blue background for resource link
            this.doc.setFillColor(240, 248, 255) // Very light blue
            this.doc.roundedRect(this.margin + 8, this.currentY - 3, linkBoxWidth, linkBoxHeight, 2, 2, "F")

            // Blue border
            this.doc.setDrawColor(...this.colors.primaryBlue)
            this.doc.setLineWidth(0.3)
            this.doc.roundedRect(this.margin + 8, this.currentY - 3, linkBoxWidth, linkBoxHeight, 2, 2, "S")

            // YouTube logo and text
            const logoSize = 4
            const logoX = this.margin + 13
            const logoY = this.currentY + 0.15
            let logoAdded = false

            // Try to add the YouTube logo
            if (this.youtubeLogoLoaded && this.youtubeLogoBase64) {
                try {
                    // Determine format from base64 string
                    let format: "JPEG" | "PNG" | "SVG" = "PNG" // Default to PNG for YouTube logo
                    if (this.youtubeLogoBase64.includes("data:image/jpeg")) {
                        format = "JPEG"
                    } else if (this.youtubeLogoBase64.includes("data:image/svg")) {
                        format = "SVG"
                    }

                    this.doc.addImage(this.youtubeLogoBase64, format, logoX, logoY, logoSize, logoSize)
                    logoAdded = true
                    console.log("YouTube logo added successfully")
                } catch (error) {
                    console.error("Failed to add YouTube logo:", error)
                }
            }

            // Use fallback YouTube logo if original didn't load
            if (!logoAdded) {
                try {
                    const fallbackYoutubeLogo = this.createFallbackYoutubeLogo()
                    this.doc.addImage(fallbackYoutubeLogo, "SVG", logoX, logoY, logoSize, logoSize)
                    logoAdded = true
                    console.log("Fallback YouTube logo added")
                } catch (error) {
                    console.error("Even fallback YouTube logo failed:", error)
                }
            }

            // Resource text with proper spacing for logo
            this.setColor(this.primaryBlue)
            this.doc.setFontSize(10)
            this.doc.setFont("helvetica", "bold")

            // Add clickable link text with space for logo
            const linkText = "Watch Recipe"
            const textX = logoAdded ? logoX + logoSize + 3 : logoX
            this.doc.textWithLink(linkText, textX, this.currentY + 3, {
                url: meal.google_resource
            })

            // Add underline to make it more obvious it's a link
            const linkWidth = this.doc.getTextWidth(linkText)
            this.doc.setDrawColor(...this.colors.primaryBlue)
            this.doc.setLineWidth(0.2)
            this.doc.line(textX, this.currentY + 4, textX + linkWidth, this.currentY + 4)

            this.resetColor()
            this.currentY += linkBoxHeight + 5
        }

        this.currentY += 8
    }

    public async generatePDF(dietData: DietData, userConfig: UserConfig = {}): Promise<jsPDF> {
        try {
            await this.initializeLogo() // Await logo initialization before adding header
            await this.initializeYoutubeLogo() // Await YouTube logo initialization

            // Reset document
            this.currentY = this.margin

            // Add professional header with logo
            this.addHeader()

            // Add weekly plans with improved formatting
            if (dietData.weekly_details && dietData.weekly_details.length > 0) {
                dietData.weekly_details.forEach((week, index) => {
                    if (index > 0) {
                        this.doc.addPage()
                        this.currentY = this.margin + 10
                    }
                    this.addWeeklyPlan(week)
                })
            }

            // Add professional footer to all pages
            await this.addFooter()

            return this.doc
        } catch (error) {
            console.error("Error generating PDF:", error)
            throw new Error("Failed to generate PDF. Please check your data and try again.")
        }
    }

    public async downloadPDF(
        dietData: DietData,
        userConfig: UserConfig = {},
        filename = "diet-plan.pdf",
    ): Promise<void> {
        const pdf = await this.generatePDF(dietData, userConfig)
        pdf.save(filename)
    }

    public async getPDFBlob(dietData: DietData, userConfig: UserConfig = {}): Promise<Blob> {
        const pdf = await this.generatePDF(dietData, userConfig)
        return pdf.output("blob")
    }

    public async getPDFDataURL(dietData: DietData, userConfig: UserConfig = {}): Promise<string> {
        const pdf = await this.generatePDF(dietData, userConfig)
        return pdf.output("dataurlstring")
    }
}

// Utility functions for easy usage (now async)
export const generateDietPDF = async (dietData: DietData, userConfig: UserConfig = {}): Promise<jsPDF> => {
    const generator = new DietPDFGenerator()
    return await generator.generatePDF(dietData, userConfig)
}

export const downloadDietPDF = async (
    dietData: DietData,
    userConfig: UserConfig = {},
    filename = "diet-plan.pdf",
): Promise<void> => {
    const generator = new DietPDFGenerator()
    await generator.downloadPDF(dietData, userConfig, filename)
}

export const getDietPDFBlob = async (dietData: DietData, userConfig: UserConfig = {}): Promise<Blob> => {
    const generator = new DietPDFGenerator()
    return await generator.getPDFBlob(dietData, userConfig)
}

// Enhanced example usage function (now async)
export const createDietPDFFromResponse = async (
    apiResponse: any,
    userInputs: any = {},
    filename?: string,
): Promise<void> => {
    try {
        // Extract diet data from API response
        let dietData: DietData

        if (apiResponse.weekly_details) {
            dietData = { weekly_details: apiResponse.weekly_details }
        } else if (apiResponse.weekly_plan) {
            dietData = { weekly_details: apiResponse.weekly_plan }
        } else if (apiResponse.data?.weekly_details) {
            dietData = { weekly_details: apiResponse.data.weekly_details }
        } else if (apiResponse.data?.weekly_plan) {
            dietData = { weekly_details: apiResponse.data.weekly_plan }
        } else {
            throw new Error("Invalid diet data format")
        }

        // Extract user configuration
        const userConfig: UserConfig = {
            age: userInputs.age,
            height: userInputs.height,
            weight: userInputs.weight,
            gender: userInputs.gender,
            diet_goal: userInputs.diet_goal,
            country: userInputs.country,
            dietary_preferences: userInputs.dietary_preferences,
            allergies: userInputs.allergies,
            calorie_goal: userInputs.calorie_goal,
            macro_goals: userInputs.macro_goals,
            meals_per_day: userInputs.meals_per_day,
            available_cooking_time_per_day: userInputs.available_cooking_time_per_day,
            kitchen_equipment: userInputs.kitchen_equipment,
            health_conditions: userInputs.health_conditions,
            total_weeks: userInputs.total_weeks,
        }

        // Generate filename if not provided
        const pdfFilename =
            filename || `${userConfig.diet_goal || "diet"}-plan-${new Date().toISOString().split("T")[0]}.pdf`

        // Download the PDF
        await downloadDietPDF(dietData, userConfig, pdfFilename)
    } catch (error) {
        console.error("Error generating diet PDF:", error)
        throw new Error("Failed to generate diet PDF. Please check the data format.")
    }
}
