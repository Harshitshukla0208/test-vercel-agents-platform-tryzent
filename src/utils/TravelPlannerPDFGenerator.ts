import jsPDF from "jspdf"
import type { StaticImageData } from "next/image"
import logoImage from "../assets/logo.jpeg"

interface Activity {
    title: string
    subtitle: string
    time: string
    duration: string
    price: string
    booking_required: boolean
    detail: string
    tips?: { tip: string }[]
    book_link?: string | null
}

interface Day {
    day: number
    date: string
    activities: Activity[]
}

interface TransportationOption {
    mode_type: string
    mode: string
    provider: string
    name: string
    departure_location: string
    arrival_location: string
    departure_time: string
    arrival_time: string
    duration: string
    price: string
    booking_link?: string | null
    per_person: boolean
    notes: string
}

interface HotelOption {
    name: string
    rating: number
    location: string
    description: string
    amenities: { name: string }[]
    price_per_night: string
    booking_link?: string | null
    google_maps_link?: string | null
}

interface RestaurantOption {
    name: string
    cuisine: string
    price_level: string
    rating: number
    location: string
    open_time: string
    description: string
    specialties: { name: string }[]
    dietary_options: { name: string }[]
    price_per_person: string
    reservation_required: boolean
    google_maps_link?: string | null
}

interface PlaceOption {
    name: string
    type: string
    rating: number
    description: string
    best_time_to_visit: string
    price: string
    booking_link?: string | null
}

interface BudgetItem {
    category: string
    amount: string
}

interface TravelData {
    destination?: string
    Itinerary: {
        days: Day[]
    }
    "Visa Info": {
        required: boolean
        visa_type: string
        required_documents: string[]
    }
    Transportation: {
        options: TransportationOption[]
    }
    Hotels: {
        options: HotelOption[]
    }
    Restaurants: {
        options: RestaurantOption[]
    }
    Places: {
        options: PlaceOption[]
    }
    Tips: {
        sections: {
            title: string
            tips: string[]
        }[]
    }
    Budget: {
        items: BudgetItem[]
        total: string
        note: string
    }
}

class EnhancedTravelItineraryPDFGenerator {
    private pdf: jsPDF
    private currentY: number
    private pageHeight: number
    private pageWidth: number
    private margin: number
    private contentWidth: number
    private lineHeight: number
    private logoBase64: string | null = null
    private logoLoaded = false
    private colors: {
        primary: [number, number, number]
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
        this.pdf = new jsPDF("p", "pt", "a4")
        this.pageHeight = this.pdf.internal.pageSize.height
        this.pageWidth = this.pdf.internal.pageSize.width
        this.margin = 40
        this.contentWidth = this.pageWidth - 2 * this.margin
        this.currentY = this.margin
        this.lineHeight = 14

        // Professional color palette
        this.colors = {
            primary: [25, 47, 89],
            secondary: [52, 144, 220],
            accent: [255, 193, 7],
            text: [33, 37, 41],
            lightText: [108, 117, 125],
            background: [248, 249, 250],
            lightBackground: [255, 255, 255],
            success: [40, 167, 69],
            warning: [255, 193, 7],
            error: [220, 53, 69],
            border: [222, 226, 230],
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

                            // Add this block for rounded corners
                            const cornerRadius = 10 // Adjust this value for more or less rounding
                            ctx.beginPath()
                            ctx.roundRect(0, 0, canvas.width, canvas.height, cornerRadius)
                            ctx.clip() // Clip subsequent drawing to this path

                            ctx.drawImage(img, 0, 0) // Draw image within the clipped path
                            // Get base64 data
                            const dataURL = canvas.toDataURL("image/jpeg", 0.9)
                            this.logoBase64 = dataURL
                            this.logoLoaded = true
                            console.log("Logo successfully converted to base64")
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

    // Enhanced fallback logo with better design
    private createFallbackLogo(): string {
        const svgLogo = `
            <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#1A2F59;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#3490DC;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="50" height="50" rx="12" fill="url(#grad1)"/>
                <circle cx="25" cy="20" r="8" fill="white" opacity="0.9"/>
                <path d="M12 35 Q25 28 38 35 Q38 40 25 42 Q12 40 12 35" fill="white" opacity="0.9"/>
                <text x="25" y="46" font-family="Arial, sans-serif" font-size="8" font-weight="bold" 
                        text-anchor="middle" fill="white">TRAVEL</text>
            </svg>
        `
        return "data:image/svg+xml;base64," + btoa(svgLogo)
    }

    private addNewPageIfNeeded(requiredHeight = 50): void {
        if (this.currentY + requiredHeight > this.pageHeight - 80) {
            this.addNewPage()
        }
    }

    private addNewPage(): void {
        this.pdf.addPage()
        this.currentY = this.margin + 20
    }

    private setFont(size: number, style: "normal" | "bold" = "normal"): void {
        this.pdf.setFont("helvetica", style)
        this.pdf.setFontSize(size)
    }

    private addSpacer(height = 12): void {
        this.currentY += height
    }

    private wrapText(text: string, maxWidth: number): string[] {
        if (!text) return [""]

        const words = text.split(" ")
        const lines: string[] = []
        let currentLine = ""

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const textWidth = this.pdf.getTextWidth(testLine)

            if (textWidth > maxWidth && currentLine) {
                lines.push(currentLine)
                currentLine = word
            } else {
                currentLine = testLine
            }
        }

        if (currentLine) {
            lines.push(currentLine)
        }

        return lines
    }

    // Completely rewritten logo handling in header to use pre-loaded base64
    private addPageHeader(destination?: string): void {
        // Header background
        this.pdf.setFillColor(...this.colors.primary)
        this.pdf.rect(0, 0, this.pageWidth, 90, "F")

        // Logo section
        const logoX = this.margin
        const logoY = 20
        const logoSize = 50
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

                this.pdf.addImage(this.logoBase64, format, logoX, logoY, logoSize, logoSize)
                logoAdded = true
                console.log("Logo added successfully from pre-loaded base64 with format:", format)
            } catch (error) {
                console.error("Failed to add pre-loaded base64 logo:", error)
            }
        }

        // Use enhanced fallback if logo still not added (e.g., if initializeLogo failed)
        if (!logoAdded) {
            try {
                const fallbackLogo = this.createFallbackLogo()
                this.pdf.addImage(fallbackLogo, "SVG", logoX, logoY, logoSize, logoSize)
                logoAdded = true
                console.log("Fallback SVG logo added")
            } catch (error) {
                console.error("Even fallback logo failed:", error)

                // Final fallback: styled text box
                this.pdf.setFillColor(...this.colors.accent)
                this.pdf.roundedRect(logoX, logoY, logoSize, logoSize, 8, 8, "F")

                // Add shadow effect
                this.pdf.setFillColor(0, 0, 0, 0.2)
                this.pdf.roundedRect(logoX + 2, logoY + 2, logoSize, logoSize, 8, 8, "F")

                // Main logo box
                this.pdf.setFillColor(...this.colors.accent)
                this.pdf.roundedRect(logoX, logoY, logoSize, logoSize, 8, 8, "F")

                // Logo text
                this.pdf.setTextColor(...this.colors.primary)
                this.setFont(16, "bold")
                this.pdf.text("AH", logoX + logoSize / 2, logoY + logoSize / 2 + 5, { align: "center" })
                console.log("Final fallback text logo created")
            }
        }

        // Company name and tagline
        this.pdf.setTextColor(255, 255, 255)
        this.setFont(18, "bold")
        this.pdf.text("AgentHub", logoX + logoSize + 15, logoY + 20)

        this.setFont(10, "normal")
        this.pdf.setTextColor(200, 200, 200)
        this.pdf.text("by Tryzent", logoX + logoSize + 15, logoY + 35)

        // Right side: Travel Guide Title
        const titleX = this.pageWidth - this.margin
        const titleY = logoY

        this.pdf.setTextColor(255, 255, 255)
        this.setFont(16, "bold")

        const headerText = destination ? `Travel Guide: ${destination}` : "Complete Travel Itinerary"

        const maxTitleWidth = 280
        if (this.pdf.getTextWidth(headerText) > maxTitleWidth) {
            const titleLines = this.wrapText(headerText, maxTitleWidth)
            titleLines.forEach((line, index) => {
                this.pdf.text(line, titleX, titleY + 20 + index * 18, { align: "right" })
            })
        } else {
            this.pdf.text(headerText, titleX, titleY + 25, { align: "right" })
        }

        // Bottom accent line
        // this.pdf.setDrawColor(...this.colors.accent)
        // this.pdf.setLineWidth(3)
        // this.pdf.line(this.margin, 85, this.pageWidth - this.margin, 85)

        this.currentY = 110
    }

    private addSectionHeader(title: string): void {
        this.addSpacer(20)
        this.addNewPageIfNeeded(60)

        this.pdf.setFillColor(...this.colors.background)
        this.pdf.rect(this.margin - 8, this.currentY - 8, this.contentWidth + 16, 35, "F")

        this.pdf.setFillColor(...this.colors.accent)
        this.pdf.rect(this.margin - 8, this.currentY - 8, 4, 35, "F")

        this.setFont(16, "bold")
        this.pdf.setTextColor(...this.colors.primary)
        this.pdf.text(title, this.margin + 8, this.currentY + 15)

        // this.pdf.setDrawColor(...this.colors.border)
        // this.pdf.setLineWidth(0.5)
        // this.pdf.line(this.margin, this.currentY + 22, this.margin + this.contentWidth, this.currentY + 22)

        this.currentY += 45
    }

    private addSubHeader(text: string, size = 14): void {
        this.addNewPageIfNeeded(35)
        this.addSpacer(15)

        this.setFont(size, "bold")
        this.pdf.setTextColor(...this.colors.secondary)
        this.pdf.text(text, this.margin, this.currentY)

        const textWidth = this.pdf.getTextWidth(text)
        this.pdf.setDrawColor(...this.colors.secondary)
        this.pdf.setLineWidth(0.5)
        this.pdf.line(this.margin, this.currentY + 3, this.margin + textWidth, this.currentY + 3)

        this.currentY += 25
    }

    private addInfoCard(title: string, content: { [key: string]: string }, links?: { [key: string]: string }): void {
        const cardPadding = 12
        const lineHeight = 16
        const titleHeight = 22

        let contentLines = 0
        const maxKeyWidth = 90
        const maxValueWidth = this.contentWidth - 2 * cardPadding - maxKeyWidth - 10

        Object.entries(content).forEach(([key, value]) => {
            if (value) {
                const valueLines = this.wrapText(value.toString(), maxValueWidth)
                contentLines += Math.max(1, valueLines.length)
            }
        })

        if (links) {
            Object.values(links).forEach((url) => {
                if (url) contentLines += 1
            })
        }

        const cardHeight = titleHeight + contentLines * lineHeight + cardPadding * 2 + 8

        this.addNewPageIfNeeded(cardHeight + 15)

        this.pdf.setFillColor(...this.colors.lightBackground)
        this.pdf.rect(this.margin, this.currentY, this.contentWidth, cardHeight, "F")

        this.pdf.setDrawColor(...this.colors.border)
        this.pdf.setLineWidth(0.5)
        this.pdf.rect(this.margin, this.currentY, this.contentWidth, cardHeight, "S")

        this.pdf.setFillColor(...this.colors.primary)
        this.pdf.rect(this.margin, this.currentY, this.contentWidth, titleHeight, "F")

        this.setFont(10, "bold")
        this.pdf.setTextColor(255, 255, 255)
        this.pdf.text(title, this.margin + cardPadding, this.currentY + cardPadding + 6)

        let yOffset = this.currentY + titleHeight + 22

        Object.entries(content).forEach(([key, value]) => {
            if (value) {
                this.setFont(9, "bold")
                this.pdf.setTextColor(...this.colors.lightText)
                this.pdf.text(key + ":", this.margin + cardPadding, yOffset)

                this.setFont(9, "normal")
                this.pdf.setTextColor(...this.colors.text)

                const lines = this.wrapText(value.toString(), maxValueWidth)

                lines.forEach((line: string, index: number) => {
                    this.pdf.text(line, this.margin + cardPadding + maxKeyWidth, yOffset + index * lineHeight)
                })

                yOffset += Math.max(lines.length * lineHeight, lineHeight)
            }
        })

        if (links) {
            Object.entries(links).forEach(([key, url]) => {
                if (url) {
                    this.setFont(9, "bold")
                    this.pdf.setTextColor(...this.colors.lightText)
                    this.pdf.text(key + ":", this.margin + cardPadding, yOffset)

                    this.setFont(8, "normal")
                    this.pdf.setTextColor(...this.colors.secondary)

                    const displayUrl = url.length > 45 ? url.substring(0, 42) + "..." : url
                    this.pdf.textWithLink(displayUrl, this.margin + cardPadding + maxKeyWidth, yOffset, { url })

                    yOffset += lineHeight
                }
            })
        }

        this.currentY += cardHeight + 1
    }

    private addTextBlock(text: string, backgroundColor?: [number, number, number]): void {
        if (!text) return

        const padding = 12
        this.setFont(9, "normal")

        const maxWidth = this.contentWidth - 2 * padding
        const lines = this.wrapText(text, maxWidth)
        const blockHeight = lines.length * this.lineHeight + 2 * padding

        this.addNewPageIfNeeded(blockHeight + 10)

        const bgColor = backgroundColor || this.colors.background
        this.pdf.setFillColor(...bgColor)
        this.pdf.rect(this.margin, this.currentY, this.contentWidth, blockHeight, "F")

        this.pdf.setDrawColor(...this.colors.border)
        this.pdf.setLineWidth(0.3)
        this.pdf.rect(this.margin, this.currentY, this.contentWidth, blockHeight, "S")

        this.pdf.setTextColor(...this.colors.text)
        let yOffset = this.currentY + padding + 10

        lines.forEach((line: string) => {
            this.pdf.text(line, this.margin + padding, yOffset)
            yOffset += this.lineHeight
        })

        this.currentY += blockHeight + 22
    }

    private addBulletList(items: string[], title?: string): void {
        if (title) {
            this.setFont(11, "bold")
            this.pdf.setTextColor(...this.colors.text)
            this.pdf.text(title, this.margin, this.currentY)
            this.currentY += 18
        }

        items.forEach((item) => {
            if (!item) return

            this.addNewPageIfNeeded(20)

            this.pdf.setFillColor(...this.colors.secondary)
            this.pdf.circle(this.margin + 6, this.currentY - 2, 1.5, "F")

            this.setFont(9, "normal")
            this.pdf.setTextColor(...this.colors.text)

            const maxWidth = this.contentWidth - 20
            const lines = this.wrapText(item, maxWidth)

            lines.forEach((line: string, index: number) => {
                this.pdf.text(line, this.margin + 16, this.currentY + index * this.lineHeight)
            })

            this.currentY += Math.max(lines.length * this.lineHeight, this.lineHeight) + 6
        })
    }

    private generateItinerary(data: TravelData): void {
        this.addSectionHeader("ITINERARY")

        data.Itinerary.days.forEach((day, dayIndex) => {
            const dayDate = new Date(day.date)
            const formattedDate = dayDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            })

            this.addSubHeader(`Day ${day.day} - ${formattedDate}`, 16)

            day.activities.forEach((activity) => {
                const activityInfo: { [key: string]: string } = {
                    Time: activity.time || "N/A",
                    Duration: activity.duration || "N/A",
                    Price: activity.price || "N/A",
                    Booking: activity.booking_required ? "Required" : "Walk-in Available",
                }

                const links: { [key: string]: string } = {}
                if (activity.book_link) {
                    links["Booking Link"] = activity.book_link
                }

                this.addInfoCard(`${activity.title} - ${activity.subtitle}`, activityInfo, links)

                if (activity.detail) {
                    this.addTextBlock(activity.detail)
                }

                if (activity.tips && activity.tips.length > 0) {
                    this.addBulletList(
                        activity.tips.map((tip) => tip.tip),
                        "Helpful Tips:",
                    )
                }
            })
        })
    }

    private generateTransportation(data: TravelData): void {
        this.addSectionHeader("TRANSPORTATION OPTIONS")

        data.Transportation.options.forEach((transport) => {
            const transportInfo: { [key: string]: string } = {
                Provider: transport.provider || "N/A",
                Route: `${transport.departure_location || ""} to ${transport.arrival_location || ""}`,
                Departure: transport.departure_time || "N/A",
                Arrival: transport.arrival_time || "N/A",
                Duration: transport.duration || "N/A",
                Price: `${transport.price || "N/A"}${transport.per_person ? " per person" : ""}`,
            }

            const links: { [key: string]: string } = {}
            if (transport.booking_link) {
                links["Book Now"] = transport.booking_link
            }

            this.addInfoCard(`${transport.mode} - ${transport.name}`, transportInfo, links)

            if (transport.notes) {
                this.addTextBlock(transport.notes)
            }
        })
    }

    private generateAccommodation(data: TravelData): void {
        this.addSectionHeader("ACCOMMODATION")

        data.Hotels.options.forEach((hotel) => {
            this.currentY += 18

            this.addNewPageIfNeeded(35)
            this.setFont(14, "bold")
            this.pdf.setTextColor(...this.colors.primary)
            this.pdf.text(hotel.name, this.margin, this.currentY)

            this.currentY += 12

            const hotelInfo: { [key: string]: string } = {
                Location: hotel.location || "N/A",
                Price: `${hotel.price_per_night || "N/A"} per night`,
                Rating: `${hotel.rating}/5 stars`,
            }

            const links: { [key: string]: string } = {}
            if (hotel.booking_link) {
                links["Book Now"] = hotel.booking_link
            }
            if (hotel.google_maps_link) {
                links["View on Maps"] = hotel.google_maps_link
            }

            this.addInfoCard("Hotel Details", hotelInfo, links)

            if (hotel.description) {
                this.addTextBlock(hotel.description)
            }

            if (hotel.amenities && hotel.amenities.length > 0) {
                this.addBulletList(
                    hotel.amenities.map((amenity) => amenity.name),
                    "Amenities:",
                )
            }
        })
    }

    private generateDining(data: TravelData): void {
        this.addSectionHeader("DINING RECOMMENDATIONS")

        data.Restaurants.options.forEach((restaurant) => {
            // Restaurant header with stars
            this.currentY += 18

            this.addNewPageIfNeeded(35)
            this.setFont(14, "bold")
            this.pdf.setTextColor(...this.colors.primary)
            this.pdf.text(restaurant.name, this.margin, this.currentY)

            this.currentY += 13

            const restaurantInfo: { [key: string]: string } = {
                Cuisine: restaurant.cuisine || "N/A",
                Location: restaurant.location || "N/A",
                Hours: restaurant.open_time || "N/A",
                Price: `${restaurant.price_per_person || "N/A"} per person`,
                Reservation: restaurant.reservation_required ? "Required" : "Walk-ins Welcome",
            }

            const links: { [key: string]: string } = {}
            if (restaurant.google_maps_link) {
                links["View on Maps"] = restaurant.google_maps_link
            }

            this.addInfoCard("Restaurant Details", restaurantInfo, links)

            if (restaurant.description) {
                this.addTextBlock(restaurant.description)
            }

            if (restaurant.specialties && restaurant.specialties.length > 0) {
                this.addBulletList(
                    restaurant.specialties.map((specialty) => specialty.name),
                    "Must-Try Dishes:",
                )
            }

            if (restaurant.dietary_options && restaurant.dietary_options.length > 0) {
                this.addBulletList(
                    restaurant.dietary_options.map((option) => option.name),
                    "Dietary Options:",
                )
            }
        })
    }

    private generateAttractions(data: TravelData): void {
        this.addSectionHeader("PLACES TO VISIT")

        data.Places.options.forEach((place) => {
            // Place header with stars
            this.currentY += 18

            this.addNewPageIfNeeded(35)
            this.setFont(14, "bold")
            this.pdf.setTextColor(...this.colors.primary)
            this.pdf.text(place.name, this.margin, this.currentY)

            this.currentY += 13

            const placeInfo: { [key: string]: string } = {
                Type: place.type || "N/A",
                Price: place.price || "N/A",
                "Best Time": place.best_time_to_visit || "N/A",
            }

            const links: { [key: string]: string } = {}
            if (place.booking_link) {
                links["Book Tickets"] = place.booking_link
            }

            this.addInfoCard("Attraction Details", placeInfo, links)

            if (place.description) {
                this.addTextBlock(place.description)
            }
        })
    }

    private generateTips(data: TravelData): void {
        this.addSectionHeader("TRAVEL TIPS & RECOMMENDATIONS")

        data.Tips.sections.forEach((section) => {
            if (section.title && section.tips) {
                this.addSubHeader(section.title, 12)
                this.addBulletList(section.tips)
                this.addSpacer(15)
            }
        })
    }

    private drawTableHeader(startY: number, colWidth: number): number {
        const rowHeight = 22

        // Header background
        this.pdf.setFillColor(...this.colors.primary)
        this.pdf.rect(this.margin, startY, this.contentWidth, rowHeight, "F")

        // Header text
        this.setFont(11, "bold")
        this.pdf.setTextColor(255, 255, 255)
        this.pdf.text("Category", this.margin + 12, startY + 14)
        this.pdf.text("Amount", this.margin + colWidth + 12, startY + 14)

        // Header borders
        this.pdf.setDrawColor(...this.colors.primary)
        this.pdf.setLineWidth(0.5)
        this.pdf.rect(this.margin, startY, this.contentWidth, rowHeight, "S")

        return startY + rowHeight
    }

    private drawTableRow(item: BudgetItem, startY: number, colWidth: number, rowHeight: number, isEven: boolean): number {
        // Alternate row background
        if (isEven) {
            this.pdf.setFillColor(...this.colors.background)
            this.pdf.rect(this.margin, startY, this.contentWidth, rowHeight, "F")
        }

        // Cell borders
        this.pdf.setDrawColor(...this.colors.border)
        this.pdf.setLineWidth(0.3)
        this.pdf.rect(this.margin, startY, colWidth, rowHeight, "S")
        this.pdf.rect(this.margin + colWidth, startY, colWidth, rowHeight, "S")

        // Cell content
        this.setFont(9, "normal")
        this.pdf.setTextColor(...this.colors.text)

        // Category (wrap if too long)
        const categoryLines = this.wrapText(item.category, colWidth - 20)
        this.pdf.text(categoryLines[0], this.margin + 12, startY + 14)

        // Amount
        this.setFont(9, "bold")
        this.pdf.setTextColor(...this.colors.success)
        this.pdf.text(item.amount, this.margin + colWidth + 12, startY + 14)

        return startY + rowHeight
    }

    private drawTotalRow(total: string, startY: number, colWidth: number, rowHeight: number): number {
        // Total row background
        this.pdf.setFillColor(...this.colors.accent)
        this.pdf.rect(this.margin, startY, this.contentWidth, rowHeight, "F")

        // Total row border
        this.pdf.setDrawColor(...this.colors.accent)
        this.pdf.setLineWidth(0.5)
        this.pdf.rect(this.margin, startY, this.contentWidth, rowHeight, "S")

        // Total text
        this.setFont(12, "bold")
        this.pdf.setTextColor(255, 255, 255)
        this.pdf.text("TOTAL", this.margin + 12, startY + 16)
        this.pdf.text(total, this.margin + colWidth + 12, startY + 16)

        return startY + rowHeight
    }

    private generateBudget(data: TravelData): void {
        this.addSectionHeader("BUDGET BREAKDOWN")

        const rowHeight = 22
        const colWidth = this.contentWidth / 2
        const headerHeight = 22
        const totalRowHeight = 26

        // Calculate how many rows we can fit on the current page
        const availableHeight = this.pageHeight - this.currentY - 100 // Leave space for footer
        const maxRowsPerPage = Math.floor((availableHeight - headerHeight - totalRowHeight) / rowHeight)

        let currentRowIndex = 0
        let tableStartY = this.currentY
        let needsHeader = true

        // Process budget items in chunks that fit on pages
        while (currentRowIndex < data.Budget.items.length) {
            // Check if we need a new page or header
            if (needsHeader) {
                // Make sure we have enough space for header + at least one row + total
                const requiredSpace = headerHeight + rowHeight + totalRowHeight + 40
                this.addNewPageIfNeeded(requiredSpace)

                tableStartY = this.currentY
                tableStartY = this.drawTableHeader(tableStartY, colWidth)
                needsHeader = false
            }

            // Calculate how many rows we can fit on current page
            const remainingHeight = this.pageHeight - tableStartY - 100
            const remainingRows = data.Budget.items.length - currentRowIndex
            const rowsToProcess = Math.min(Math.floor((remainingHeight - totalRowHeight) / rowHeight), remainingRows)

            // If we can't fit even one row, start new page
            if (rowsToProcess <= 0) {
                this.addNewPage()
                needsHeader = true
                continue
            }

            // Draw the rows for this page
            for (let i = 0; i < rowsToProcess; i++) {
                const item = data.Budget.items[currentRowIndex + i]
                const isEven = (currentRowIndex + i) % 2 === 0
                tableStartY = this.drawTableRow(item, tableStartY, colWidth, rowHeight, isEven)
            }

            currentRowIndex += rowsToProcess

            // If this is the last batch, draw the total row
            if (currentRowIndex >= data.Budget.items.length) {
                // Check if we have space for total row
                if (tableStartY + totalRowHeight > this.pageHeight - 100) {
                    this.addNewPage()
                    tableStartY = this.currentY
                    tableStartY = this.drawTableHeader(tableStartY, colWidth)
                }

                tableStartY = this.drawTotalRow(data.Budget.total, tableStartY, colWidth, totalRowHeight)
                this.currentY = tableStartY + 20
            } else {
                // More rows to process, need new page
                this.addNewPage()
                needsHeader = true
            }
        }

        // Add budget note if present
        if (data.Budget.note) {
            this.addSpacer(10)
            this.addTextBlock(data.Budget.note, [255, 248, 220])
        }
    }

    private generateVisaInfo(data: TravelData): void {
        this.addSectionHeader("VISA & DOCUMENTATION")

        const visaInfo: { [key: string]: string } = {
            "Visa Required": data["Visa Info"].required ? "Yes" : "No",
            "Visa Type": data["Visa Info"].visa_type || "N/A",
        }

        this.addInfoCard("Visa Information", visaInfo)

        this.currentY += 18

        if (data["Visa Info"].required_documents && data["Visa Info"].required_documents.length > 0) {
            this.addBulletList(data["Visa Info"].required_documents, "Required Documents:")
        }
    }

    private addFooter(): void {
        const totalPages = (this.pdf as any).internal.getNumberOfPages() // Use getNumberOfPages() for total pages

        for (let i = 1; i <= totalPages; i++) {
            this.pdf.setPage(i)

            // Footer background
            this.pdf.setFillColor(...this.colors.primary)
            this.pdf.rect(0, this.pageHeight - 30, this.pageWidth, 30, "F")

            // Footer content
            this.setFont(8, "normal")
            this.pdf.setTextColor(255, 255, 255)

            const generatedText = `Generated on ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })}`

            this.pdf.text(generatedText, this.margin, this.pageHeight - 15)
            this.pdf.text(`Page ${i} of ${totalPages}`, this.pageWidth - this.margin, this.pageHeight - 15, {
                align: "right",
            })
        }
    }

    public async generatePDF(data: TravelData, filename = "travel-itinerary.pdf"): Promise<void> {
        try {
            await this.initializeLogo() // Await logo initialization before adding header

            // Extract destination from the data
            let destination = data.destination

            if (!destination && data.Transportation?.options?.length > 0) {
                const firstTransport = data.Transportation.options[0]
                destination = firstTransport.arrival_location
            }

            // Add header with destination
            this.addPageHeader(destination)

            // Generate all sections with proper spacing
            if (data.Itinerary?.days?.length > 0) {
                this.generateItinerary(data)
            }

            if (data.Transportation?.options?.length > 0) {
                this.generateTransportation(data)
            }

            if (data.Hotels?.options?.length > 0) {
                this.generateAccommodation(data)
            }

            if (data.Restaurants?.options?.length > 0) {
                this.generateDining(data)
            }

            if (data.Places?.options?.length > 0) {
                this.generateAttractions(data)
            }

            if (data.Tips?.sections?.length > 0) {
                this.generateTips(data)
            }

            if (data.Budget?.items?.length > 0) {
                this.generateBudget(data)
            }

            if (data["Visa Info"]) {
                this.generateVisaInfo(data)
            }

            // Add footer to all pages
            this.addFooter()

            // Save the PDF
            this.pdf.save(filename)
        } catch (error) {
            console.error("Error generating PDF:", error)
            throw new Error("Failed to generate PDF. Please check your data and try again.")
        }
    }
}

// Usage function
export async function generateEnhancedTravelItineraryPDF(data: TravelData, filename?: string): Promise<void> {
    const generator = new EnhancedTravelItineraryPDFGenerator()
    await generator.generatePDF(data, filename) // Await the PDF generation
}

// Export the class for advanced usage
export { EnhancedTravelItineraryPDFGenerator, type TravelData }
