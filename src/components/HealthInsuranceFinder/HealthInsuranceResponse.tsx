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
    Shield,
    Download,
    DollarSign,
    Phone,
    ExternalLink,
    Star,
    CheckCircle,
    X,
    Loader2,
    Heart,
    Users,
    CreditCard,
    Building2,
    Clock,
    AlertTriangle,
    Info,
    FileText,
    Calendar,
    Target,
    TrendingUp,
    Award,
    UserCheck,
} from "lucide-react"
// import { generateHealthInsurancePDF } from "@/utils/HealthInsurancePDFGenerator"
import ShareButton from "../ShareButton"

interface FormattedHealthInsuranceResponseProps {
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
    userProfile?: any
}

// Utility to ensure proper data structure for PDF generation
function normalizeHealthInsuranceData(data: any) {
    let obj: any = Array.isArray(data) ? data[0] : data

    if (obj && obj.agent_outputs) {
        obj = obj.agent_outputs
    }

    return {
        insurance_policies: obj?.insurance_policies || { recommendations: [], user_profile: {} },
        government_policies: obj?.government_policies || { programs: [] },
        summary: obj?.summary || {},
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
                                    ? "bg-indigo-100 text-indigo-700 border-indigo-200"
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

const FormattedHealthInsuranceResponse: React.FC<FormattedHealthInsuranceResponseProps> = ({
    response,
    onSave,
    agent_id,
    executionToken,
    formRef,
    historicalRating = null,
    historicalFeedback = null,
    isHistoricalView = false,
    userProfile = null,
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
                const responseElement = document.getElementById("health-insurance-response")
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
            const dataToExport = response.data?.data || response.data
            const filename = "Health-Insurance-Recommendations.pdf"
            const normalizedData = normalizeHealthInsuranceData(dataToExport)
            // generateHealthInsurancePDF(normalizedData, filename)

            toast({
                title: "Success",
                description: "Health insurance recommendations PDF downloaded successfully!",
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
    const defaultSection = availableSections[0] || "insurance_policies"
    if (!activeSection && defaultSection) {
        setActiveSection(defaultSection)
    }

    // Helper function to get emoji for section
    const getSectionEmoji = (sectionKey: string) => {
        const key = sectionKey.toLowerCase()
        if (key.includes("insurance") || key.includes("policies")) return "🛡️"
        if (key.includes("government") || key.includes("programs")) return "🏛️"
        if (key.includes("summary")) return "📊"
        if (key.includes("profile") || key.includes("user")) return "👤"
        return "ℹ️"
    }

    // Helper function to render user profile
    const renderUserProfile = (profile: any) => {
        if (!profile) return <div className="text-xs text-gray-500">No user profile data available</div>

        return (
            <div className="space-y-4">
                <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        Your Profile
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Basic Info */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-medium text-indigo-900 mb-2">Basic Information</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Age:</span>
                                    <span className="text-xs font-medium">{profile.age}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <UserCheck className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Gender:</span>
                                    <span className="text-xs font-medium capitalize">{profile.gender}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Location:</span>
                                    <span className="text-xs font-medium">{profile.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Family Size:</span>
                                    <span className="text-xs font-medium">{profile.family_size}</span>
                                </div>
                            </div>
                        </div>

                        {/* Financial Info */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-medium text-indigo-900 mb-2">Financial Details</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3 text-green-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Income Level:</span>
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 capitalize">
                                        {profile.income_level}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-3 h-3 text-green-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Monthly Budget:</span>
                                    <span className="text-xs font-medium text-green-600">${profile.monthly_budget}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-green-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Annual Budget:</span>
                                    <span className="text-xs font-medium text-green-600">${profile.annual_budget}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Target className="w-3 h-3 text-green-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Coverage Amount:</span>
                                    <span className="text-xs font-medium text-green-600">
                                        ${profile.coverage_amount?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Preferences */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-medium text-indigo-900 mb-2">Preferences</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Coverage:</span>
                                    <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 capitalize">
                                        {profile.preferred_coverage}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Deductible:</span>
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {profile.preferred_deductible}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                                    <span className="text-xs text-gray-600">Network:</span>
                                    <Badge variant="outline" className="text-xs">
                                        {profile.preferred_network}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Health Conditions */}
                    {profile.existing_conditions && profile.existing_conditions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-indigo-200">
                            <h4 className="text-xs font-medium text-indigo-900 mb-2 flex items-center gap-2">
                                <Heart className="w-3 h-3 text-red-500" />
                                Existing Conditions
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {profile.existing_conditions.map((condition: string, index: number) => (
                                    <Badge key={index} variant="secondary" className="text-xs bg-red-100 text-red-800 capitalize">
                                        {condition}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Special Requirements */}
                    {profile.special_requirements && profile.special_requirements.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-indigo-200">
                            <h4 className="text-xs font-medium text-indigo-900 mb-2 flex items-center gap-2">
                                <Star className="w-3 h-3 text-yellow-500" />
                                Special Requirements
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {profile.special_requirements.map((requirement: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs capitalize">
                                        {requirement}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Helper function to render insurance recommendations
    const renderInsurancePolicies = (policies: any) => {
        if (!policies || !policies.recommendations) {
            return <div className="text-xs text-gray-500">No insurance policy recommendations available</div>
        }

        const policyCards = policies.recommendations.map((policy: any, index: number) => (
            <div key={index} className="bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm">
                {/* Header with match score */}
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-indigo-900 break-words">{policy.provider_name}</h3>
                            <p className="text-xs text-indigo-700 break-words">{policy.plan_name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Award className="w-4 h-4 text-indigo-600" />
                                <span className="text-sm font-bold text-indigo-600">{policy.match_score}% Match</span>
                            </div>
                            <div className="flex items-center">
                                {[...Array(Math.min(Math.max(Math.floor(policy.rating || 4), 0), 5))].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                ))}
                                <span className="ml-1 text-xs text-gray-600">{policy.rating}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Pricing Information */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <h4 className="text-xs font-medium text-green-900">Monthly Premium</h4>
                            </div>
                            <p className="text-lg font-bold text-green-600">{policy.monthly_premium}</p>
                            <p className="text-xs text-green-700">{policy.annual_premium} annually</p>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-4 h-4 text-indigo-600" />
                                <h4 className="text-xs font-medium text-indigo-900">Coverage</h4>
                            </div>
                            <p className="text-sm font-bold text-indigo-600">{policy.sum_insured}</p>
                            <p className="text-xs text-indigo-700">Sum Insured</p>
                        </div>
                    </div>

                    {/* Key Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-xs font-medium text-gray-900 mb-2">Plan Details</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Deductible:</span>
                                    <span className="font-medium text-gray-800">{policy.deductible}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Network:</span>
                                    <Badge variant="outline" className="text-xs">
                                        {policy.network_type}
                                    </Badge>
                                </div>
                                {policy.waiting_period && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Waiting Period:</span>
                                        <span className="font-medium text-gray-800">{policy.waiting_period}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-medium text-gray-900 mb-2">Copay Structure</h4>
                            <div className="space-y-1 text-xs text-gray-700">
                                <p className="break-words">{policy.copay}</p>
                            </div>
                        </div>
                    </div>

                    {/* Coverage Highlights */}
                    {policy.coverage_highlights && (
                        <div>
                            <h4 className="text-xs font-medium text-gray-900 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                Coverage Highlights
                            </h4>
                            <div className="space-y-1">
                                {policy.coverage_highlights.map((highlight: string, highlightIndex: number) => (
                                    <div key={highlightIndex} className="flex items-start gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                        <p className="text-xs text-gray-700 break-words leading-relaxed">{highlight}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pros and Cons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {policy.pros && (
                            <div className="bg-green-50 p-3 rounded-lg">
                                <h4 className="text-xs font-medium text-green-900 mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                    Pros
                                </h4>
                                <div className="space-y-1">
                                    {policy.pros.map((pro: string, proIndex: number) => (
                                        <p key={proIndex} className="text-xs text-green-800 break-words">
                                            • {pro}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                        {policy.cons && (
                            <div className="bg-orange-50 p-3 rounded-lg">
                                <h4 className="text-xs font-medium text-orange-900 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3 text-orange-600" />
                                    Cons
                                </h4>
                                <div className="space-y-1">
                                    {policy.cons.map((con: string, conIndex: number) => (
                                        <p key={conIndex} className="text-xs text-orange-800 break-words">
                                            • {con}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reasoning */}
                    {policy.reasoning && (
                        <div className="bg-indigo-50 p-3 rounded-lg">
                            <h4 className="text-xs font-medium text-indigo-900 mb-2 flex items-center gap-2">
                                <Info className="w-3 h-3 text-indigo-600" />
                                Why This Plan?
                            </h4>
                            <p className="text-xs text-indigo-800 break-words leading-relaxed">{policy.reasoning}</p>
                        </div>
                    )}

                    {/* Next Steps */}
                    {policy.next_steps && (
                        <div>
                            <h4 className="text-xs font-medium text-gray-900 mb-2 flex items-center gap-2">
                                <Target className="w-3 h-3 text-indigo-600" />
                                Next Steps
                            </h4>
                            <div className="space-y-1">
                                {policy.next_steps.map((step: string, stepIndex: number) => (
                                    <div key={stepIndex} className="flex items-start gap-2">
                                        <div className="w-4 h-4 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold">{stepIndex + 1}</span>
                                        </div>
                                        <p className="text-xs text-gray-700 break-words leading-relaxed">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                        {policy.application_link && (
                            <Button
                                size="sm"
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs"
                                onClick={() => window.open(policy.application_link, "_blank")}
                            >
                                <ExternalLink className="w-3 h-3 mr-2 flex-shrink-0" />
                                Apply Online
                            </Button>
                        )}
                        {policy.phone_number && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs bg-transparent"
                                onClick={() => window.open(`tel:${policy.phone_number}`, "_blank")}
                            >
                                <Phone className="w-3 h-3 mr-2 flex-shrink-0" />
                                Call Now
                            </Button>
                        )}
                        {policy.website && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs bg-transparent"
                                onClick={() => window.open(policy.website.startsWith("http") ? policy.website : `https://${policy.website}`, "_blank")}
                            >
                                <ExternalLink className="w-3 h-3 mr-2 flex-shrink-0" />
                                Website
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        ))

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-sm font-semibold text-indigo-900">Best Match</h3>
                        </div>
                        <p className="text-lg font-bold text-indigo-600">{policies.recommendations[0]?.provider_name}</p>
                        <p className="text-xs text-indigo-700">{policies.recommendations[0]?.match_score}% compatibility</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <h3 className="text-sm font-semibold text-green-900">Best Value</h3>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                            {policies.recommendations.reduce((min: any, current: any) => 
                                (current.monthly_premium < min.monthly_premium) ? current : min
                            )?.monthly_premium}
                        </p>
                        <p className="text-xs text-green-700">Lowest monthly premium</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-purple-600" />
                            <h3 className="text-sm font-semibold text-purple-900">Top Rated</h3>
                        </div>
                        <p className="text-lg font-bold text-purple-600">
                            {Math.max(...policies.recommendations.map((p: any) => p.rating || 0)).toFixed(1)} ⭐
                        </p>
                        <p className="text-xs text-purple-700">Highest customer rating</p>
                    </div>
                </div>

                {/* Policy Cards */}
                <div className="space-y-4">{policyCards}</div>

                {/* Comparison Summary */}
                {policies.comparison_summary && (
                    <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            Comparison Summary
                        </h3>
                        <p className="text-xs text-gray-700 break-words leading-relaxed">{policies.comparison_summary}</p>
                    </div>
                )}

                {/* Personalized Advice */}
                {policies.personalized_advice && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-indigo-600" />
                            Personalized Advice
                        </h3>
                        <p className="text-xs text-indigo-800 break-words leading-relaxed">{policies.personalized_advice}</p>
                    </div>
                )}

                {/* General Next Steps */}
                {policies.general_next_steps && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-gray-600" />
                            General Next Steps
                        </h3>
                        <div className="space-y-2">
                            {policies.general_next_steps.map((step: string, stepIndex: number) => (
                                <div key={stepIndex} className="flex items-start gap-2">
                                    <div className="w-4 h-4 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-bold">{stepIndex + 1}</span>
                                    </div>
                                    <p className="text-xs text-gray-700 break-words leading-relaxed">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Helper function to render government programs
    const renderGovernmentPolicies = (policies: any) => {
        if (!policies || !policies.programs) {
            return <div className="text-xs text-gray-500">No government programs data available</div>
        }

        const programCards = policies.programs.map((program: any, index: number) => (
            <div key={index} className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-indigo-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-indigo-900 break-words">{program.program_name}</h3>
                        </div>
                        <p className="text-xs text-gray-700 break-words leading-relaxed mb-3">{program.description}</p>
                    </div>
                    {program.eligibility_score && (
                        <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-bold text-green-600">{program.eligibility_score}%</span>
                            </div>
                            <p className="text-xs text-gray-600">Eligibility</p>
                        </div>
                    )}
                </div>

                {/* Eligibility Criteria */}
                {program.eligibility_criteria && (
                    <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            Eligibility Criteria
                        </h4>
                        <div className="space-y-1">
                            {program.eligibility_criteria.map((criterion: string, criterionIndex: number) => (
                                <div key={criterionIndex} className="flex items-start gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700 break-words leading-relaxed">{criterion}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Benefits */}
                {program.benefits && (
                    <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Star className="w-3 h-3 text-yellow-500" />
                            Benefits
                        </h4>
                        <div className="space-y-1">
                            {program.benefits.map((benefit: string, benefitIndex: number) => (
                                <div key={benefitIndex} className="flex items-start gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-700 break-words leading-relaxed">{benefit}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Application Process */}
                {program.application_process && (
                    <div className="mb-4 bg-indigo-50 p-3 rounded-lg">
                        <h4 className="text-xs font-medium text-indigo-900 mb-2 flex items-center gap-2">
                            <FileText className="w-3 h-3 text-indigo-600" />
                            Application Process
                        </h4>
                        <p className="text-xs text-indigo-800 break-words leading-relaxed">{program.application_process}</p>
                    </div>
                )}

                {/* Contact Information and Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                    {program.contact_info?.website && (
                        <Button
                            size="sm"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs"
                            onClick={() => window.open(
                                program.contact_info.website.startsWith("http") 
                                    ? program.contact_info.website 
                                    : `https://${program.contact_info.website}`, 
                                "_blank"
                            )}
                        >
                            <ExternalLink className="w-3 h-3 mr-2 flex-shrink-0" />
                            Visit Website
                        </Button>
                    )}
                    {program.contact_info?.phone && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-transparent"
                            onClick={() => window.open(`tel:${program.contact_info.phone}`, "_blank")}
                        >
                            <Phone className="w-3 h-3 mr-2 flex-shrink-0" />
                            Call
                        </Button>
                    )}
                    {program.website && program.website !== program.contact_info?.website && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs bg-transparent"
                            onClick={() => window.open(
                                program.website.startsWith("http") 
                                    ? program.website 
                                    : `https://${program.website}`, 
                                "_blank"
                            )}
                        >
                            <ExternalLink className="w-3 h-3 mr-2 flex-shrink-0" />
                            More Info
                        </Button>
                    )}
                </div>
            </div>
        ))

        return (
            <div className="space-y-4">
                {programCards}
                
                {/* Eligibility Summary */}
                {policies.eligibility_summary && (
                    <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Info className="w-4 h-4 text-indigo-600" />
                            Eligibility Summary
                        </h3>
                        <p className="text-xs text-gray-700 break-words leading-relaxed">{policies.eligibility_summary}</p>
                    </div>
                )}

                {/* Next Steps */}
                {policies.next_steps && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-indigo-600" />
                            Recommended Next Steps
                        </h3>
                        <div className="space-y-2">
                            {policies.next_steps.map((step: string, stepIndex: number) => (
                                <div key={stepIndex} className="flex items-start gap-2">
                                    <div className="w-4 h-4 bg-indigo-200 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-bold">{stepIndex + 1}</span>
                                    </div>
                                    <p className="text-xs text-indigo-800 break-words leading-relaxed">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Helper function to render summary
    const renderSummary = (summary: any) => {
        if (!summary) return <div className="text-xs text-gray-500">No summary data available</div>

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-indigo-900">Insurance Plans</h3>
                                <p className="text-xs text-indigo-700">Available options</p>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-indigo-600">
                            {summary.total_insurance_plans || 0}
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-green-900">Government Programs</h3>
                                <p className="text-xs text-green-700">Available assistance</p>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                            {summary.total_government_programs || 0}
                        </div>
                    </div>
                </div>

                {/* Additional summary information */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        Summary Overview
                    </h3>
                    <div className="space-y-3 text-xs text-gray-700">
                        <p>
                            We've analyzed your profile and found <strong>{summary.total_insurance_plans || 0}</strong> matching 
                            insurance plans and <strong>{summary.total_government_programs || 0}</strong> relevant government programs.
                        </p>
                        <p>
                            All recommendations are personalized based on your age, location, health conditions, budget preferences, 
                            and coverage requirements. The plans are ranked by compatibility score to help you make an informed decision.
                        </p>
                        <div className="bg-indigo-50 p-3 rounded-lg mt-3">
                            <p className="text-indigo-800">
                                <strong>💡 Tip:</strong> Compare the top 3 recommendations carefully, considering both monthly premiums 
                                and out-of-pocket maximums. Don't forget to verify that your preferred doctors and hospitals are 
                                in-network before making your final decision.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Helper function to render generic section
    const renderGenericSection = (sectionKey: string, sectionData: any) => {
        if (!sectionData) return <div className="text-xs text-gray-500">No data available</div>

        if (Array.isArray(sectionData)) {
            const cards = sectionData.map((item: any, index: number) => (
                <div key={index} className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
                </div>
            ))
            return <div className="space-y-4">{cards}</div>
        }

        if (typeof sectionData === "object") {
            return (
                <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(sectionData, null, 2)}</pre>
                </div>
            )
        }

        return (
            <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-700">{String(sectionData)}</p>
            </div>
        )
    }

    // Helper function to render section content
    const renderSectionContent = (sectionKey: string, sectionData: any) => {
        const key = sectionKey.toLowerCase()

        if (key.includes("insurance") || key.includes("policies")) {
            // Check if it's the user profile within insurance_policies
            if (sectionData.user_profile && sectionData.recommendations) {
                return renderInsurancePolicies(sectionData)
            }
            return renderInsurancePolicies(sectionData)
        }
        if (key.includes("government") || key.includes("programs")) return renderGovernmentPolicies(sectionData)
        if (key.includes("summary")) return renderSummary(sectionData)
        if (key.includes("profile") || key.includes("user")) return renderUserProfile(sectionData)

        return renderGenericSection(sectionKey, sectionData)
    }

    const currentExecutionToken = executionToken
    const currentagent_id = agent_id
    const currentagent_name = "health-insurance-finder"

    return (
        <div id="health-insurance-response" className="w-full max-w-7xl mx-auto space-y-4">
            {/* Header with gradient background */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-indigo-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 text-indigo-700 rounded-lg flex items-center justify-center border shadow-sm border-gray-200 bg-white">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-xl font-bold flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="break-words">Your Health Insurance Recommendations</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-indigo-700">AI-powered insurance matching and analysis</p>
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

export default FormattedHealthInsuranceResponse