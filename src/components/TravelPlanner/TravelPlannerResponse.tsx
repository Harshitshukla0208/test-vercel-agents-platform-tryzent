"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import ResponseLoader from "./ResponseLoader"
import { toast } from "@/hooks/use-toast"
import RatingFeedback from "@/components/Content/RatingFeedback"
import HistoricalRatingFeedback from "@/components/Content/HistoricalRatingFeedback"
import {
    MapPin,
    Download,
    Calendar,
    Clock,
    DollarSign,
    Plane,
    Hotel,
    Utensils,
    Star,
    CheckCircle,
    AlertTriangle,
    ExternalLink,
    Phone,
    Info,
    Building,
    Car,
    Loader2,
    X,
    Smartphone,
    Globe,
    FileText,
} from "lucide-react"
import { generateEnhancedTravelItineraryPDF } from "@/utils/TravelPlannerPDFGenerator"
import Image from "next/image"
import googleMapsIcon from "@/assets/google-maps.png"
import playStoreIcon from "@/assets/playstore.png"
import appStoreIcon from "@/assets/app-store.png"
import ShareButton from "../ShareButton"

interface FormattedTravelResponseProps {
    response: {
        loading?: boolean
        error?: string
        data?: any
    }
    onSave?: (data: any) => void
    agent_id?: string
    executionToken?: string
    accessToken?: string
    formRef?: React.RefObject<any>
    historicalRating?: number | null
    historicalFeedback?: string | null
    isHistoricalView?: boolean
    destinationName?: string | null
}

// Utility to ensure TravelData structure for PDF generation
function normalizeTravelData(data: any) {
    // If data is an array, use the first object
    let obj: any = Array.isArray(data) ? data[0] : data

    // If agent_outputs exists, use it as the main data object
    if (obj && obj.agent_outputs) {
        obj = obj.agent_outputs
    }

    return {
        Itinerary: obj?.Itinerary || { days: [] },
        "Visa Info": obj?.["Visa Info"] || { required: false, visa_type: "", required_documents: [] },
        Transportation: obj?.Transportation || { options: [] },
        Hotels: obj?.Hotels || { options: [] },
        Restaurants: obj?.Restaurants || { options: [] },
        Places: obj?.Places || { options: [] },
        Tips: obj?.Tips || { sections: [] },
        Budget: obj?.Budget || { items: [], total: "", note: "" },
    }
}

const MobileTabsGrid: React.FC<{
    sections: string[]
    activeSection: string
    onSectionChange: (section: string) => void
    getSectionEmoji: (section: string) => string
}> = ({ sections, activeSection, onSectionChange, getSectionEmoji }) => {
    return (
        <div className="bg-white p-2">
            <div className="grid grid-cols-3 gap-1.5">
                {sections.map((section) => {
                    const emoji = getSectionEmoji(section)
                    const isActive = activeSection === section
                    const displayName = section.replace(/([A-Z])/g, " $1").trim()

                    return (
                        <button
                            key={section}
                            onClick={() => onSectionChange(section)}
                            className={`
                                flex items-center justify-start gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 min-h-[36px] border
                                ${isActive
                                    ? "bg-blue-100 text-blue-700 border-blue-200"
                                    : "bg-gray-50 text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-gray-200"
                                }
                            `}
                        >
                            <span className="text-sm leading-none flex-shrink-0">{emoji}</span>
                            <span className="text-center leading-tight text-xs font-medium truncate">{displayName}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

const FormattedTravelResponse: React.FC<FormattedTravelResponseProps> = ({
    response,
    onSave,
    agent_id,
    executionToken,
    formRef,
    historicalRating = null,
    historicalFeedback = null,
    isHistoricalView = false,
    destinationName = null,
}) => {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [rating, setRating] = useState<number>(0)
    const [feedback, setFeedback] = useState<string>("")
    const [activeSection, setActiveSection] = useState<string>("")
    const [isMobile, setIsMobile] = useState(false)

    // Auto-scroll to response when data loads
    useEffect(() => {
        if (response.data && !response.loading) {
            setTimeout(() => {
                const responseElement = document.getElementById("travel-plan-response")
                if (responseElement) {
                    responseElement.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    })
                }
            }, 100)
        }
    }, [response.data, response.loading])

    // Initialize historical data if provided
    useEffect(() => {
        if (historicalRating !== null) {
            setRating(historicalRating)
        }

        if (historicalFeedback !== null) {
            setFeedback(historicalFeedback)
        }
    }, [historicalRating, historicalFeedback])

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const handleDownloadPDF = async () => {
        setIsGeneratingPDF(true)
        try {
            // The PDF utility expects TravelData structure and a filename
            const dataToExport = response.data?.data || response.data
            const filename = destinationName ? `Travel-Plan-${destinationName}.pdf` : "Travel-Plan.pdf"
            const normalizedData = normalizeTravelData(dataToExport)
            generateEnhancedTravelItineraryPDF(normalizedData, filename)

            toast({
                title: "Success",
                description: "Travel plan PDF downloaded successfully!",
                duration: 3000,
            })
        } catch (error) {
            console.error("Error generating PDF:", error)
            toast({
                title: "Error",
                description: "Failed to generate PDF. Please try again.",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    // Helper function to render Google Maps link with beautiful styling
    const renderGoogleMapsLink = (location: string, googleMapsLink?: string) => {
        if (!googleMapsLink && !location) return null

        const mapsUrl = googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`

        return (
            <Button
                size="sm"
                variant="outline"
                className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-900 hover:bg-blue-100 hover:border-blue-300 flex items-center gap-1"
                onClick={() => window.open(mapsUrl, "_blank")}
            >
                <Image
                    src={googleMapsIcon || "/placeholder.svg"}
                    alt="Google Maps"
                    width={16}
                    height={16}
                    className="inline-block mr-1"
                />
                View on Maps
            </Button>
        )
    }

    // Component for rendering app icon with fallback - Fixed CORS issue
    const AppIcon: React.FC<{ app: any; size?: number }> = ({ app, size = 40 }) => {
        const [iconUrl, setIconUrl] = useState<string | null>(null)
        const [isLoading, setIsLoading] = useState(true)
        const [hasError, setHasError] = useState(false)

        useEffect(() => {
            const fetchAppIcon = async () => {
                setIsLoading(true)
                setHasError(false)

                try {
                    // Use a CORS proxy or server-side endpoint to fetch app metadata
                    // This avoids the CORS issue with direct iTunes API calls
                    if (app.ios_download_link) {
                        const appIdMatch = app.ios_download_link.match(/id(\d+)/)
                        if (appIdMatch) {
                            const appId = appIdMatch[1]

                            try {
                                // Use a CORS proxy service or your own backend endpoint
                                const proxyUrl = `/api/app-metadata?appId=${appId}`
                                const response = await fetch(proxyUrl)

                                if (response.ok) {
                                    const data = await response.json()
                                    if (data.results && data.results.length > 0) {
                                        const appData = data.results[0]
                                        const iconUrl = appData.artworkUrl512 || appData.artworkUrl100 || appData.artworkUrl60
                                        if (iconUrl) {
                                            setIconUrl(iconUrl)
                                            setIsLoading(false)
                                            return
                                        }
                                    }
                                }
                            } catch (proxyError) {
                                console.log("Proxy fetch failed, using fallback")
                            }
                        }
                    }

                    // Fallback to generic app icon
                    setHasError(true)
                    setIsLoading(false)
                } catch (error) {
                    console.error("Error fetching app icon:", error)
                    setHasError(true)
                    setIsLoading(false)
                }
            }

            fetchAppIcon()
        }, [app.ios_download_link, app.google_play_download_link])

        if (isLoading) {
            return (
                <div
                    className="bg-gray-200 rounded-lg flex items-center justify-center animate-pulse"
                    style={{ width: size, height: size }}
                >
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
            )
        }

        if (hasError || !iconUrl) {
            return (
                <div className="bg-blue-100 rounded-lg flex items-center justify-center" style={{ width: size, height: size }}>
                    <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
            )
        }

        return (
            <Image
                src={iconUrl || "/placeholder.svg"}
                alt={`${app.name} icon`}
                width={size}
                height={size}
                className="rounded-lg shadow-sm border border-gray-200"
                onError={() => {
                    setHasError(true)
                    setIconUrl(null)
                }}
                unoptimized={true}
            />
        )
    }

    const renderAppStoreLinks = (app: any) => {
        return (
            <div className="flex flex-col gap-2 mt-3">
                <div className="flex gap-2">
                    {app.ios_download_link && (
                        <Button
                            size="sm"
                            className="flex-1 bg-green-100 hover:bg-green-200 text-green-900 border border-green-300 text-xs flex items-center justify-center gap-1 px-2 py-1 h-8"
                            onClick={() => window.open(app.ios_download_link, "_blank")}
                        >
                            <Image
                                src={appStoreIcon || "/placeholder.svg"}
                                alt="App Store"
                                width={14}
                                height={14}
                                className="flex-shrink-0"
                            />
                            <span className="truncate">App Store</span>
                        </Button>
                    )}
                    {app.google_play_download_link && (
                        <Button
                            size="sm"
                            className="flex-1 bg-green-100 hover:bg-green-200 text-green-900 border border-green-300 text-xs flex items-center justify-center gap-1 px-2 py-1 h-8"
                            onClick={() => window.open(app.google_play_download_link, "_blank")}
                        >
                            <Image
                                src={playStoreIcon || "/placeholder.svg"}
                                alt="Google Play"
                                width={14}
                                height={14}
                                className="flex-shrink-0"
                            />
                            <span className="truncate">Google Play</span>
                        </Button>
                    )}
                </div>
                {app.website && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-green-700 bg-green-100 border-green-300 hover:text-green-900 hover:bg-green-200 flex items-center justify-center gap-1 h-8"
                        onClick={() => window.open(app.website, "_blank")}
                    >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Website</span>
                    </Button>
                )}
            </div>
        )
    }

    if (response.loading) {
        return <ResponseLoader />
    }

    if (response.error) {
        return (
            <div className="w-full p-4 sm:p-6 text-red-600 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    <h3 className="font-semibold">Error</h3>
                </div>
                <p className="text-xs sm:text-sm">{response.error}</p>
            </div>
        )
    }

    let dataToDisplay = response.data?.data || response.data

    // Safety check for data structure
    if (dataToDisplay && typeof dataToDisplay === "object") {
        // Ensure all rating values are valid numbers
        const sanitizeRatings = (obj: any): any => {
            if (Array.isArray(obj)) {
                return obj.map(sanitizeRatings)
            } else if (obj && typeof obj === "object") {
                const sanitized = { ...obj }
                if ("rating" in sanitized && typeof sanitized.rating !== "undefined") {
                    const rating = Number(sanitized.rating)
                    sanitized.rating = isNaN(rating) ? 4 : Math.min(Math.max(rating, 0), 5)
                }
                Object.keys(sanitized).forEach((key) => {
                    sanitized[key] = sanitizeRatings(sanitized[key])
                })
                return sanitized
            }
            return obj
        }

        dataToDisplay = sanitizeRatings(dataToDisplay)
    }

    if (Array.isArray(dataToDisplay) && dataToDisplay.length === 1 && typeof dataToDisplay[0] === "object") {
        dataToDisplay = dataToDisplay[0]
    }

    if (!dataToDisplay) {
        return null
    }

    // Get available sections dynamically
    const availableSections = Object.keys(dataToDisplay).filter(
        (key) => dataToDisplay[key] && typeof dataToDisplay[key] === "object" && dataToDisplay[key] !== null,
    )

    // Set default active section
    const defaultSection = availableSections[0] || "itinerary"
    if (!activeSection && defaultSection) {
        setActiveSection(defaultSection)
    }

    // Helper function to get emoji for section
    const getSectionEmoji = (sectionKey: string) => {
        const key = sectionKey.toLowerCase()
        if (key.includes("itinerary")) return "📅"
        if (key.includes("hotel")) return "🏨"
        if (key.includes("restaurant")) return "🍽️"
        if (key.includes("flight") || key.includes("transportation")) return "✈️"
        if (key.includes("place")) return "📍"
        if (key.includes("budget")) return "💰"
        if (key.includes("tip")) return "💡"
        if (key.includes("visa")) return "📋"
        if (key.includes("app")) return "📱"
        if (key.includes("weather")) return "☀️"
        if (key.includes("currency")) return "💳"
        if (key.includes("emergency")) return "🛡️"
        if (key.includes("culture")) return "🌍"
        if (key.includes("language")) return "💬"
        if (key.includes("shopping")) return "🛍️"
        if (key.includes("entertainment")) return "🎵"
        if (key.includes("transport")) return "🚗"
        return "ℹ️"
    }

    // Helper function to render itinerary with carousel
    const renderItinerary = (itinerary: any) => {
        if (!itinerary || !itinerary.days) return <div className="text-xs text-gray-500">No itinerary data available</div>

        const dayCards = itinerary.days.map((day: any, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-0">
                <div className="bg-blue-100 text-gray-800 p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 text-blue-600 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold truncate">
                                Day {day.day} - {day.date}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-4 space-y-4">
                    {day.activities?.map((activity: any, actIndex: number) => (
                        <div key={actIndex}>
                            {actIndex > 0 && <div className="border-t border-gray-200 mb-4"></div>}

                            <div className="min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-1 break-words">{activity.title}</h4>
                                        <p className="text-xs text-gray-600 mb-2 break-words">{activity.subtitle}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-xs font-bold text-green-600 break-words">{activity.price}</div>
                                        {activity.booking_required && (
                                            <Badge variant="destructive" className="mt-1 text-xs">
                                                Booking Required
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-2">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 flex-shrink-0" />
                                        <span className="break-words">{activity.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                        <span className="break-words">{activity.duration}</span>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-700 mb-2 break-words leading-relaxed">{activity.detail}</p>

                                {activity.tips && activity.tips.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                                        <h5 className="text-xs font-medium text-blue-900 mb-2 flex items-center gap-2">
                                            <Info className="w-3 h-3 flex-shrink-0" />
                                            Pro Tips:
                                        </h5>
                                        <div className="space-y-1">
                                            {activity.tips.map((tip: any, tipIndex: number) => (
                                                <div key={tipIndex} className="text-xs text-blue-800 flex items-start gap-2 py-1">
                                                    <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                    <span className="break-words">{tip.tip}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activity.book_link && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <Button
                                            size="sm"
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
                                            onClick={() => window.open(activity.book_link, "_blank")}
                                        >
                                            <ExternalLink className="w-3 h-3 mr-2 flex-shrink-0" />
                                            Book Now
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))

        return <div className="space-y-4">{dayCards}</div>
    }

    // Helper function to render hotels with carousel
    const renderHotels = (hotels: any) => {
        if (!hotels || !hotels.options) return <div className="text-xs text-gray-500">No hotel data available</div>

        const hotelCards = hotels.options.map((hotel: any, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-0">
                <div className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                <h3 className="text-sm font-semibold text-gray-900 break-words">{hotel.name}</h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center">
                                        {[...Array(Math.min(Math.max(Math.floor(hotel.rating || 5), 0), 5))].map((_, i) => (
                                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        ))}
                                        <span className="ml-1 text-xs text-gray-600">{hotel.rating}</span>
                                    </div>
                                    {renderGoogleMapsLink(hotel.location, hotel.google_maps_link)}
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-2 flex items-start gap-1">
                                <Building className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{hotel.location}</span>
                            </p>
                            <p className="text-xs text-gray-700 break-words leading-relaxed">{hotel.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-blue-600 break-words">{hotel.price_per_night}</div>
                            <p className="text-xs text-gray-600">per night</p>
                        </div>
                    </div>

                    {hotel.amenities && (
                        <div className="mb-3">
                            <h4 className="text-xs font-medium text-gray-900 mb-2">Amenities</h4>
                            <div className="flex flex-wrap gap-1">
                                {hotel.amenities.slice(0, 6).map((amenity: any, amenityIndex: number) => (
                                    <Badge
                                        key={amenityIndex}
                                        variant="secondary"
                                        className="text-xs bg-blue-100 text-blue-800 break-words"
                                    >
                                        {amenity.name || amenity}
                                    </Badge>
                                ))}
                                {hotel.amenities.length > 6 && (
                                    <Badge variant="outline" className="text-xs">
                                        +{hotel.amenities.length - 6} more
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                        {hotel.booking_link && (
                            <Button
                                size="sm"
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                                onClick={() => window.open(hotel.booking_link, "_blank")}
                            >
                                <ExternalLink className="w-3 h-3 mr-2 flex-shrink-0" />
                                Book Online
                            </Button>
                        )}
                        {hotel.call_link && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs bg-transparent"
                                onClick={() => window.open(`tel:${hotel.call_link}`, "_blank")}
                            >
                                <Phone className="w-3 h-3 mr-2 flex-shrink-0" />
                                Call
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        ))

        return <div className="space-y-4">{hotelCards}</div>
    }

    // Helper function to render restaurants with carousel
    const renderRestaurants = (restaurants: any) => {
        if (!restaurants || !restaurants.options)
            return <div className="text-xs text-gray-500">No restaurant data available</div>

        const restaurantCards = restaurants.options.map((restaurant: any, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Utensils className="w-3 h-3 text-orange-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 break-words">{restaurant.name}</h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <div className="flex items-center">
                                {[...Array(Math.min(Math.max(Math.floor(restaurant.rating || 4), 0), 5))].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                ))}
                                <span className="ml-1 text-xs text-gray-600">{restaurant.rating}</span>
                            </div>
                            {renderGoogleMapsLink(restaurant.location, restaurant.google_maps_link)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-2">
                            <span className="break-words">{restaurant.cuisine}</span>
                            <span className="break-words">{restaurant.price_level}</span>
                            {restaurant.reservation_required && (
                                <Badge variant="destructive" className="text-xs">
                                    Reservation Required
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2 break-words">{restaurant.location}</p>
                        <p className="text-xs text-gray-700 mb-2 break-words leading-relaxed">{restaurant.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-green-600 break-words">{restaurant.price_per_person}</div>
                        <p className="text-xs text-gray-600">per person</p>
                    </div>
                </div>

                {restaurant.specialties && (
                    <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-2">Specialties</h4>
                        <div className="flex flex-wrap gap-1">
                            {restaurant.specialties.map((specialty: any, specIndex: number) => (
                                <Badge key={specIndex} variant="outline" className="text-xs break-words">
                                    {specialty.name || specialty}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {restaurant.dietary_options && (
                    <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-2">Dietary Options</h4>
                        <div className="flex flex-wrap gap-1">
                            {restaurant.dietary_options.map((option: any, optIndex: number) => (
                                <Badge key={optIndex} variant="secondary" className="text-xs bg-green-100 text-green-800 break-words">
                                    {option.name || option}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                    {restaurant.booking_link && (
                        <Button
                            size="sm"
                            className="flex-1 bg-green-500 hover:bg-green-600 text-xs"
                            onClick={() => window.open(restaurant.booking_link, "_blank")}
                        >
                            <ExternalLink className="w-3 h-3 mr-2 flex-shrink-0" />
                            Make Reservation
                        </Button>
                    )}
                    {restaurant.call_link && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-transparent"
                            onClick={() => window.open(`tel:${restaurant.call_link}`, "_blank")}
                        >
                            <Phone className="w-3 h-3 mr-2 flex-shrink-0" />
                            Call
                        </Button>
                    )}
                </div>
            </div>
        ))

        return <div className="space-y-4">{restaurantCards}</div>
    }

    // Helper function to render transportation with carousel
    const renderTransportation = (transportation: any) => {
        if (!transportation || !transportation.options)
            return <div className="text-xs text-gray-500">No transportation data available</div>

        const transportCards = transportation.options.map((transport: any, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            {transport.mode === "flight" ? (
                                <Plane className="w-4 h-4 text-blue-600" />
                            ) : (
                                <Car className="w-4 h-4 text-blue-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-xs font-semibold text-gray-900">{transport.provider || transport.name}</h3>
                            <p className="text-xs text-gray-600">{transport.name || transport.mode}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-blue-600">{transport.price}</div>
                        {transport.per_person && <p className="text-xs text-gray-600">per person</p>}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                        <p className="text-xs text-gray-600">Departure</p>
                        <p className="text-xs font-medium">{transport.departure_time}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-600">Duration</p>
                        <p className="text-xs font-medium">{transport.duration}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-600">Arrival</p>
                        <p className="text-xs font-medium">{transport.arrival_time}</p>
                    </div>
                </div>

                {transport.notes && <p className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded">{transport.notes}</p>}

                <div className="flex gap-2">
                    {transport.booking_link && (
                        <Button
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                            onClick={() => window.open(transport.booking_link, "_blank")}
                        >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            Book Online
                        </Button>
                    )}
                    {transport.call_link && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-transparent"
                            onClick={() => window.open(`tel:${transport.call_link}`, "_blank")}
                        >
                            <Phone className="w-3 h-3 mr-2" />
                            Call
                        </Button>
                    )}
                </div>
            </div>
        ))

        return <div className="space-y-4">{transportCards}</div>
    }

    // Helper function to render places with carousel
    const renderPlaces = (places: any) => {
        if (!places || !places.options) return <div className="text-xs text-gray-500">No places data available</div>

        const placeCards = places.options.map((place: any, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm w-full">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <div className="flex gap-2 mb-2 items-center">
                            <h3 className="text-xs font-semibold text-gray-900 mb-1">{place.name}</h3>
                            {renderGoogleMapsLink(place.name, place.google_maps_link)}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            {place.type && (
                                <div className="mb-3">
                                    <Badge
                                        variant="secondary"
                                        className="flex justify-center items-center text-xs w-full bg-gray-100 text-gray-700 font-medium"
                                    >
                                        {place.type}
                                    </Badge>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center">
                            {[...Array(Math.min(Math.max(Math.floor(place.rating || 4), 0), 5))].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                            <span className="ml-1 text-xs text-gray-600">{place.rating}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-indigo-700">{place.price || "Free"}</div>
                    </div>
                </div>
                <p className="text-xs text-gray-700 mb-3">{place.description}</p>
                {place.best_time_to_visit && (
                    <p className="text-xs text-gray-600 mb-3">
                        <strong>Best time to visit:</strong> {place.best_time_to_visit}
                    </p>
                )}
                <div className="flex gap-2">
                    {place.booking_link && (
                        <Button
                            size="sm"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs"
                            onClick={() => window.open(place.booking_link, "_blank")}
                        >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            Book Tickets
                        </Button>
                    )}
                </div>
            </div>
        ))

        return <div className="space-y-4">{placeCards}</div>
    }

    // Helper function to render budget
    const renderBudget = (budget: any) => {
        if (!budget) return <div className="text-xs text-gray-500">No budget data available</div>

        return (
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Budget Breakdown
                    </h3>
                    <p className="text-xs text-gray-600 mb-4">Estimated costs for your trip</p>

                    {budget.items && (
                        <div className="space-y-2">
                            {budget.items.map((item: any, index: number) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between py-2 border-b border-green-200 last:border-b-0"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-green-200 rounded-lg flex items-center justify-center">
                                            {item.category.toLowerCase().includes("flight") && <Plane className="w-3 h-3 text-green-700" />}
                                            {item.category.toLowerCase().includes("hotel") && <Hotel className="w-3 h-3 text-green-700" />}
                                            {item.category.toLowerCase().includes("food") && <Utensils className="w-3 h-3 text-green-700" />}
                                            {item.category.toLowerCase().includes("transport") && <Car className="w-3 h-3 text-green-700" />}
                                            {!["flight", "hotel", "food", "transport"].some((keyword) =>
                                                item.category.toLowerCase().includes(keyword),
                                            ) && <DollarSign className="w-3 h-3 text-green-700" />}
                                        </div>
                                        <span className="text-xs font-medium text-gray-900">{item.category}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-green-600">{item.amount}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {budget.total && (
                        <div className="mt-4 pt-3 border-t border-green-300">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-900">Total Estimated Cost</span>
                                <span className="text-sm font-bold text-green-600">{budget.total}</span>
                            </div>
                            {budget.note && <p className="text-xs text-gray-600 mt-2">{budget.note}</p>}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Helper function to render tips
    const renderTips = (tips: any) => {
        if (!tips || !tips.sections) return <div className="text-xs text-gray-500">No tips data available</div>

        return (
            <div className="space-y-4">
                {tips.sections.map((section: any, index: number) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            {section.title === "Do's" && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {section.title === "Don'ts" && <AlertTriangle className="w-4 h-4 text-red-600" />}
                            {!["Do's", "Don'ts"].includes(section.title) && <Info className="w-4 h-4 text-blue-600" />}
                            {section.title}
                        </h3>

                        <div className="space-y-2">
                            {section.tips.map((tip: string, tipIndex: number) => (
                                <div key={tipIndex} className="flex items-start gap-2">
                                    <div
                                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${section.title === "Do's"
                                                ? "bg-green-500"
                                                : section.title === "Don'ts"
                                                    ? "bg-red-500"
                                                    : "bg-blue-500"
                                            }`}
                                    />
                                    <p className="text-xs text-gray-700 leading-relaxed">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // Helper function to render visa info
    const renderVisaInfo = (visaInfo: any) => {
        if (!visaInfo) return <div className="text-xs text-gray-500">No visa information available</div>

        return (
            <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Visa Information</h3>
                            {visaInfo.required && (
                                <Badge variant="destructive" className="mt-1 text-xs">
                                    Visa Required
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <h4 className="text-xs font-medium text-gray-900 mb-1">Visa Type</h4>
                            <p className="text-xs text-gray-700">{visaInfo.visa_type}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-medium text-gray-900 mb-1">Processing Time</h4>
                            <p className="text-xs text-gray-700">{visaInfo.processing_time}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-medium text-gray-900 mb-1">Cost</h4>
                            <p className="text-xs text-gray-700">{visaInfo.cost}</p>
                        </div>
                    </div>

                    {visaInfo.urgent_processing_available && (
                        <div className="bg-orange-50 p-3 rounded-lg mb-4">
                            <h4 className="text-xs font-medium text-orange-900 mb-2">Urgent Processing Available</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="font-medium">Processing Time:</span> {visaInfo.urgent_processing_time}
                                </div>
                                <div>
                                    <span className="font-medium">Additional Cost:</span> {visaInfo.urgent_processing_cost}
                                </div>
                            </div>
                        </div>
                    )}

                    {visaInfo.required_documents && (
                        <div className="mb-4">
                            <h4 className="text-xs font-medium text-gray-900 mb-2">Required Documents</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                {visaInfo.required_documents.map((doc: string, index: number) => (
                                    <div key={index} className="flex items-center gap-2 text-xs text-gray-700">
                                        <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                                        {doc}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {visaInfo.apply_link && (
                            <Button
                                size="sm"
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                                onClick={() => window.open(visaInfo.apply_link, "_blank")}
                            >
                                <ExternalLink className="w-3 h-3 mr-2" />
                                Apply for Visa
                            </Button>
                        )}
                        {visaInfo.urgent_apply_link && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs bg-transparent"
                                onClick={() => window.open(visaInfo.urgent_apply_link, "_blank")}
                            >
                                <ExternalLink className="w-3 h-3 mr-2" />
                                Urgent Processing
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Helper function to render local apps with enhanced download links and app icons
    const renderLocalApps = (localApps: any) => {
        if (!localApps || !localApps.options)
            return <div className="text-xs text-gray-500">No local apps data available</div>

        const appCards = localApps.options.map((app: any, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-w-0 max-w-sm">
                <div className="flex items-start gap-3 mb-3">
                    {/* App Icon */}
                    <AppIcon app={app} size={48} />

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-sm font-semibold text-gray-900 break-words">{app.name}</h3>
                            <Badge variant="outline" className="text-xs break-words">
                                {app.type}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                                {[...Array(Math.min(Math.max(Math.floor(app.rating || 4), 0), 5))].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                ))}
                                <span className="ml-1 text-xs text-gray-600">{app.rating}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-gray-700 mb-3 break-words leading-relaxed">{app.description}</p>
                {app.price_info && (
                    <p className="text-xs text-gray-600 mb-3 break-words">
                        <strong>Pricing:</strong> {app.price_info}
                    </p>
                )}

                {app.supported_platforms && (
                    <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-900 mb-2">Available On</h4>
                        <div className="flex flex-wrap gap-1">
                            {app.supported_platforms.map((platform: string, platformIndex: number) => (
                                <Badge
                                    key={platformIndex}
                                    variant="secondary"
                                    className="text-xs bg-green-100 text-green-800 break-words"
                                >
                                    {platform}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {renderAppStoreLinks(app)}
            </div>
        ))

        // Use proper grid layout on desktop, carousel on mobile
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 justify-items-center">
                {appCards}
            </div>
        )
    }

    // Helper function to render generic section
    const renderGenericSection = (sectionKey: string, sectionData: any) => {
        if (!sectionData) return <div className="text-xs text-gray-500">No data available</div>

        // Handle different data structures
        if (Array.isArray(sectionData)) {
            const cards = sectionData.map((item: any, index: number) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                </div>
            ))
            return <div className="space-y-4">{cards}</div>
        }

        if (typeof sectionData === "object") {
            return (
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(sectionData, null, 2)}</pre>
                </div>
            )
        }

        return (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-700">{String(sectionData)}</p>
            </div>
        )
    }

    // Helper function to render section content
    const renderSectionContent = (sectionKey: string, sectionData: any) => {
        const key = sectionKey.toLowerCase()

        if (key.includes("itinerary")) return renderItinerary(sectionData)
        if (key.includes("hotel")) return renderHotels(sectionData)
        if (key.includes("restaurant")) return renderRestaurants(sectionData)
        if (key.includes("transportation") || key.includes("flight")) return renderTransportation(sectionData)
        if (key.includes("place")) return renderPlaces(sectionData)
        if (key.includes("budget")) return renderBudget(sectionData)
        if (key.includes("tip")) return renderTips(sectionData)
        if (key.includes("visa")) return renderVisaInfo(sectionData)
        if (key.includes("app")) return renderLocalApps(sectionData)

        return renderGenericSection(sectionKey, sectionData)
    }

    const currentExecutionToken = executionToken
    const currentagent_id = agent_id
    const currentagent_name = "travel-planner"

    return (
        <div id="travel-plan-response" className="w-full max-w-7xl mx-auto space-y-4">
            {/* Header with gradient background and Google Maps button */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-indigo-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 text-indigo-700 rounded-lg flex items-center justify-center border shadow-sm border-gray-200 bg-white">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="break-words">
                                    {destinationName ? `Your Perfect Trip to ${destinationName}` : "Your Travel Plan"}
                                </span>
                                {destinationName && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            window.open(
                                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationName)}`,
                                                "_blank",
                                            )
                                        }
                                        className="text-xs items-center gap-1 mt-2 sm:mt-0 sm:ml-2 bg-white hover:bg-gray-50 self-start sm:self-auto whitespace-nowrap hidden sm:flex"
                                    >
                                        <Image
                                            src={googleMapsIcon || "/placeholder.svg"}
                                            alt="Google Maps"
                                            width={16}
                                            height={16}
                                            className="inline-block mr-2 flex-shrink-0"
                                        />
                                        View on Maps
                                    </Button>
                                )}
                            </h1>
                            <p className="text-xs sm:text-sm text-indigo-700">AI-powered travel planning insights</p>
                        </div>
                    </div>
                    <div className="flex xs:flex-row gap-2 w-full sm:w-auto">
                        {currentExecutionToken && currentagent_id && (
                            <ShareButton
                                agentId={currentagent_id}
                                executionToken={currentExecutionToken}
                                agentName={currentagent_name}
                                className="w-full xs:w-auto"
                            />
                        )}
                        <Button
                            size="sm"
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPDF}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex-1 sm:flex-none min-h-[32px]"
                        >
                            {isGeneratingPDF ? (
                                <>
                                    <Loader2 className="w-3 h-3 mr-2 animate-spin flex-shrink-0" />
                                    <span className="hidden xs:inline">Generating...</span>
                                    <span className="xs:hidden">...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-3 h-3 mr-2 flex-shrink-0" />
                                    <span className="hidden xs:inline">Download PDF</span>
                                    <span className="xs:hidden">Download PDF</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content with Dynamic Tabs */}
            <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm">
                <Tabs value={activeSection || defaultSection} onValueChange={setActiveSection} className="w-full">
                    {/* Desktop TabsList - Hidden on mobile */}
                    <TabsList
                        className={`hidden md:grid w-full bg-gray-50 p-0 rounded-none border-b border-indigo-200`}
                        style={{ gridTemplateColumns: `repeat(${availableSections.length}, minmax(0, 1fr))` }}
                    >
                        {availableSections.map((section) => {
                            const emoji = getSectionEmoji(section)
                            return (
                                <TabsTrigger
                                    key={section}
                                    value={section}
                                    className="text-xs flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm px-1 py-1"
                                >
                                    <span>{emoji}</span>
                                    <span className="hidden lg:inline truncate">{section.replace(/([A-Z])/g, " $1").trim()}</span>
                                </TabsTrigger>
                            )
                        })}
                    </TabsList>

                    {/* Mobile Tabs Grid - Only visible on mobile */}
                    <div className="md:hidden">
                        <MobileTabsGrid
                            sections={availableSections}
                            activeSection={activeSection || defaultSection}
                            onSectionChange={setActiveSection}
                            getSectionEmoji={getSectionEmoji}
                        />
                    </div>

                    <div className="p-4 sm:p-4">
                        {availableSections.map((section) => (
                            <TabsContent key={section} value={section} className="mt-0">
                                {renderSectionContent(section, dataToDisplay[section])}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </div>

            {/* Ratings and Feedback Section */}
            <div className="">
                {isHistoricalView ? (
                    <HistoricalRatingFeedback
                        key={`historical-feedback-${executionToken}`}
                        agent_id={agent_id || ""}
                        executionToken={executionToken || ""}
                        initialRating={rating}
                        initialFeedback={feedback}
                        agentOutputs={dataToDisplay}
                        onUpdate={(updatedRating, updatedFeedback) => {
                            setRating(updatedRating)
                            setFeedback(updatedFeedback)
                        }}
                        isDisabled={false}
                    />
                ) : (
                    <RatingFeedback
                        key={`feedback-${executionToken}`}
                        agent_id={agent_id || ""}
                        executionToken={executionToken || ""}
                        response={dataToDisplay}
                        onUpdate={(updatedRating, updatedFeedback) => {
                            setRating(updatedRating)
                            setFeedback(updatedFeedback)
                        }}
                        isDisabled={false}
                    />
                )}
            </div>
        </div>
    )
}

export default FormattedTravelResponse
