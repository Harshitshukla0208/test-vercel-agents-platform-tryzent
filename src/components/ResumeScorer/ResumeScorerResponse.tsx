"use client"
import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ResponseLoader from "./ResumeResponseLoader"
import { toast } from "@/hooks/use-toast"
import RatingFeedback from "@/components/Content/RatingFeedback"
import HistoricalRatingFeedback from "@/components/Content/HistoricalRatingFeedback"
import {
    Download,
    X,
    Loader2,
    Search,
    Filter,
    Eye,
    EyeOff,
    ExternalLink,
    FileText,
    CheckCircle,
    AlertTriangle,
    Target,
    Award,
    Briefcase,
    GraduationCap,
    Code
} from "lucide-react"
import ShareButton from "../ShareButton"
import { downloadResumeScorerPDF } from "@/utils/ResumeScorerPDFGenerator"

interface ResumeData {
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
    signed_url?: string
    [key: string]: any
}

interface FileData {
    file_key: string
    signed_url: string
    expires_at: number
}

interface FormattedResumeScorerResponseProps {
    response: {
        loading?: boolean
        error?: string
        data?: ResumeData[]
    }
    onSave?: (data: any) => void
    agent_id?: string
    executionToken?: string
    accessToken?: string
    formRef?: React.RefObject<any>
    historicalRating?: number | null
    historicalFeedback?: string | null
    isHistoricalView?: boolean
    jobTitle?: string | null
    fileData?: FileData[]
    isSharePage?: boolean
}

// Dynamic filter type based on actual recommendations
type DynamicFilter = {
    key: string
    label: string
    count: number
    color: string
    bgColor: string
    borderColor: string
}

// Circular Progress Component
const CircularProgress: React.FC<{
    value: number
    size?: number
    strokeWidth?: number
}> = ({ value, size = 80, strokeWidth = 6 }) => {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (value / 100) * circumference

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#3b82f6"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-in-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">{value}</span>
            </div>
        </div>
    )
}

// Detail Section Component
const ResumeDetailSection: React.FC<{
    resume: ResumeData
    onClose: () => void
}> = ({ resume, onClose }) => {
    const renderBorderedGroup = (matchedData: string[], missingData: string[], matchedLabel: string, missingLabel: string, matchedIcon: React.ReactNode, missingIcon: React.ReactNode) => (
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        {matchedIcon}
                        {matchedLabel} ({matchedData.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {matchedData.map((item, idx) => (
                            <Badge key={idx} variant="secondary" className="text-sm bg-green-100 text-green-800 hover:bg-green-200 px-3 py-1">
                                {item}
                            </Badge>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        {missingIcon}
                        {missingLabel} ({missingData.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {missingData.map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-sm border-red-200 text-red-700 px-3 py-1">
                                {item}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div id="resume-detail-section" className="bg-white border border-gray-200 rounded-xl shadow-sm p-2 sm:p-5 space-y-4 sm:space-y-6">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <CircularProgress value={resume.ats_score || 0} size={60} />
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                            {resume.resume || "Resume Analysis"}
                        </h3>
                        <Badge className={`text-xs sm:text-sm px-2 sm:px-3 py-1 mt-1 border ${resume.recommendation?.toLowerCase().includes("excellent") || resume.recommendation?.toLowerCase().includes("perfect")
                            ? "bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                            : resume.recommendation?.toLowerCase().includes("very good") || resume.recommendation?.toLowerCase().includes("good")
                                ? "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
                                : resume.recommendation?.toLowerCase().includes("fair")
                                    ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
                                    : "bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
                            }`}>
                            {resume.recommendation || 'No recommendation'}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {resume.signed_url && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(resume.signed_url, '_blank')}
                            className="text-xs sm:text-sm hidden sm:flex border border-gray-300 hover:border-gray-400"
                        >
                            <ExternalLink className="w-4 h-4 mr-1 sm:mr-2" />
                            View Resume
                        </Button>
                    )}
                    {resume.signed_url && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(resume.signed_url, '_blank')}
                            className="text-xs flex sm:hidden p-2 border border-gray-300 hover:border-gray-400"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-2"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                </div>
            </div>

            {/* Summary Section */}
            {resume.summary && (
                <div className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-white">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Summary
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                        {resume.summary}
                    </p>
                </div>
            )}

            {/* Reasoning Section */}
            {resume.reasoning && resume.reasoning.length > 0 && (
                <div className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-white">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                        Score Analysis
                    </h4>
                    <div className="space-y-2 sm:space-y-3">
                        {resume.reasoning.map((reason, idx) => (
                            <div key={idx} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 sm:p-3 rounded border border-gray-200">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-1 sm:mt-2 flex-shrink-0" />
                                <span className="leading-relaxed">{reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Keywords Section */}
            {renderBorderedGroup(
                resume.matched_keywords || [],
                resume.missing_keywords || [],
                "Matched Keywords",
                "Missing Keywords",
                <Code className="w-5 h-5 text-green-600" />,
                <Code className="w-5 h-5 text-red-600" />
            )}

            {/* Skills Section */}
            {renderBorderedGroup(
                resume.matched_skills || [],
                resume.missing_skills || [],
                "Matched Skills",
                "Missing Skills",
                <CheckCircle className="w-5 h-5 text-green-600" />,
                <CheckCircle className="w-5 h-5 text-red-600" />
            )}

            {/* Experience Section */}
            {renderBorderedGroup(
                resume.matched_experience || [],
                resume.missing_experience || [],
                "Relevant Experience",
                "Missing Experience",
                <Briefcase className="w-5 h-5 text-green-600" />,
                <Briefcase className="w-5 h-5 text-red-600" />
            )}

            {/* Qualifications Section */}
            {renderBorderedGroup(
                resume.matched_qualifications || [],
                resume.missing_qualifications || [],
                "Matched Qualifications",
                "Missing Qualifications",
                <GraduationCap className="w-5 h-5 text-green-600" />,
                <GraduationCap className="w-5 h-5 text-red-600" />
            )}


            {/* Recommended Job Titles */}
            {resume.recommmended_job_titles && resume.recommmended_job_titles.length > 0 && (
                <div className="border border-gray-300 rounded-lg p-3 sm:p-4 bg-white">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Recommended Job Titles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {resume.recommmended_job_titles.map((title, idx) => (
                            <Badge key={idx} className="text-xs sm:text-sm bg-blue-100 text-blue-800 border border-blue-300 px-2 hover:bg-blue-200 sm:px-3 py-1">
                                {title}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

const FormattedResumeScorerResponse: React.FC<FormattedResumeScorerResponseProps> = ({
    response,
    onSave,
    agent_id,
    executionToken,
    formRef,
    historicalRating = null,
    historicalFeedback = null,
    isHistoricalView = false,
    jobTitle = null,
    fileData = [],
    isSharePage = false
}) => {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [rating, setRating] = useState<number>(0)
    const [feedback, setFeedback] = useState<string>("")
    const [isMobile, setIsMobile] = useState(false)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [selectedFilter, setSelectedFilter] = useState<string>('all')
    const [selectedResume, setSelectedResume] = useState<ResumeData | null>(null)
    const [historicalFileData, setHistoricalFileData] = useState<FileData[]>([])

    // Fetch historical data to get signed URLs
    const fetchHistoricalData = useCallback(async () => {
        if (!agent_id || !executionToken || historicalFileData.length > 0) return

        try {
            let response = await fetch(`/api/get-agent-history/${executionToken}?agent_id=${agent_id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!response.ok) {
                response = await fetch(`/api/agents/${agent_id}/history/${executionToken}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                })
            }

            if (response.ok) {
                const data = await response.json()
                const fileData = data?.data?.file_data || data?.file_data
                if (Array.isArray(fileData)) {
                    setHistoricalFileData(fileData)
                }
            }
        } catch (error) {
            console.error('Failed to fetch historical data:', error)
        }
    }, [agent_id, executionToken, historicalFileData.length])

    const normalize = (str: string) =>
        decodeURIComponent(str)
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

    const stripHashPrefix = (fileName: string) => fileName.replace(/^_[a-f0-9]{16,}_/, '')

    const resumeDataWithUrls = useMemo(() => {
        const dataToUse = response.data || []
        const fileDataToUse = (fileData.length > 0 ? fileData : historicalFileData)

        return dataToUse.map((resume, idx) => {
            let matchingFile = fileDataToUse.find(file => {
                const fileName = stripHashPrefix((file.file_key.split('/').pop() || ''))
                return (
                    normalize(fileName) === normalize(resume.resume) ||
                    normalize(fileName).includes(normalize(resume.resume)) ||
                    normalize(resume.resume).includes(normalize(fileName))
                )
            })
            if (!matchingFile && fileDataToUse.length === 1 && dataToUse.length === 1) {
                matchingFile = fileDataToUse[0]
            }
            return {
                ...resume,
                signed_url: matchingFile?.signed_url
            }
        })
    }, [response.data, fileData, historicalFileData])

    // Dynamic analytics based on actual data
    const dynamicFilters = useMemo(() => {
        if (resumeDataWithUrls.length === 0) return []

        const totalResumes = resumeDataWithUrls.length

        // Get unique recommendations from actual data
        const recommendationCounts = resumeDataWithUrls.reduce((acc, resume) => {
            const recommendation = resume.recommendation?.toLowerCase() || 'no recommendation'
            acc[recommendation] = (acc[recommendation] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        // Map recommendations to display format with colors
        const getRecommendationDisplay = (rec: string, count: number) => {
            const lower = rec.toLowerCase()

            if (lower.includes('excellent') || lower.includes('perfect')) {
                return {
                    key: rec,
                    label: 'Excellent',
                    count,
                    color: 'text-green-600',
                    bgColor: '',
                    borderColor: 'border-green-300'
                }
            } else if (lower.includes('very good')) {
                return {
                    key: rec,
                    label: 'Very Good',
                    count,
                    color: 'text-emerald-600',
                    bgColor: '',
                    borderColor: 'border-emerald-300'
                }
            } else if (lower.includes('good')) {
                return {
                    key: rec,
                    label: 'Good',
                    count,
                    color: 'text-blue-600',
                    bgColor: '',
                    borderColor: 'border-blue-300'
                }
            } else if (lower.includes('fair')) {
                return {
                    key: rec,
                    label: 'Fair',
                    count,
                    color: 'text-yellow-600',
                    bgColor: '',
                    borderColor: 'border-yellow-300'
                }
            } else if (lower.includes('poor') || lower.includes('weak')) {
                return {
                    key: rec,
                    label: 'Poor',
                    count,
                    color: 'text-red-600',
                    bgColor: '',
                    borderColor: 'border-red-300'
                }
            } else {
                // Default case for any other recommendation
                return {
                    key: rec,
                    label: rec.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                    count,
                    color: 'text-gray-600',
                    bgColor: '',
                    borderColor: 'border-gray-300'
                }
            }
        }

        const filters: DynamicFilter[] = [
            {
                key: 'all',
                label: 'All Resumes',
                count: totalResumes,
                color: 'text-indigo-600',
                bgColor: '',
                borderColor: 'border-indigo-300'
            }
        ]

        // Add dynamic recommendation filters
        Object.entries(recommendationCounts).forEach(([rec, count]) => {
            filters.push(getRecommendationDisplay(rec, count))
        })

        return filters
    }, [resumeDataWithUrls])

    // Filter resumes based on selected filter
    const filteredResumes = useMemo(() => {
        return resumeDataWithUrls.filter(resume => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                const searchableText = [
                    resume.resume,
                    resume.summary,
                    resume.recommendation,
                    ...(resume.matched_skills || []),
                    ...(resume.matched_keywords || [])
                ].join(' ').toLowerCase()

                if (!searchableText.includes(query)) return false
            }

            // Recommendation filter
            if (selectedFilter === 'all') return true

            const recommendation = resume.recommendation?.toLowerCase() || 'no recommendation'
            return recommendation === selectedFilter.toLowerCase()
        })
    }, [resumeDataWithUrls, searchQuery, selectedFilter])

    useEffect(() => {
        if (response.data && !response.loading) {
            fetchHistoricalData()
            setTimeout(() => {
                const responseElement = document.getElementById("resume-scorer-response")
                if (responseElement) {
                    responseElement.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    })
                }
            }, 100)
        }
    }, [response.data, response.loading, fetchHistoricalData])

    useEffect(() => {
        if (historicalRating !== null) setRating(historicalRating)
        if (historicalFeedback !== null) setFeedback(historicalFeedback)
    }, [historicalRating, historicalFeedback])

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const handleDownloadPDF = async () => {
        setIsGeneratingPDF(true)
        try {
            const resumeData = {
                agent_outputs: resumeDataWithUrls,
                user_inputs: jobTitle ? [{ variable: "Job_Role", variable_value: jobTitle }] : [],
            }
            const userConfig = {
                job_role: jobTitle || undefined,
                total_resumes: resumeDataWithUrls.length,
            }
            const filename = `Resume-Analysis-Report-${new Date().toISOString().split('T')[0]}.pdf`
            await downloadResumeScorerPDF(resumeData, userConfig, filename)
            toast({
                title: "Success",
                description: "Resume analysis PDF downloaded successfully!",
                duration: 3000,
            })
        } catch (error) {
            console.error("Error generating PDF report:", error)
            toast({
                title: "Error",
                description: "Failed to generate PDF report. Please try again.",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const handleResumeClick = (resume: ResumeData) => {
        setSelectedResume(resume)
    }

    const handleCloseDetail = () => {
        setSelectedResume(null)
    }

    const handleFilterClick = (filterKey: string) => {
        setSelectedFilter(selectedFilter === filterKey ? 'all' : filterKey)
        setSelectedResume(null)
    }

    useEffect(() => {
        if (selectedResume) {
            setTimeout(() => {
                const detailSection = document.getElementById("resume-detail-section")
                if (detailSection) {
                    detailSection.scrollIntoView({ behavior: "smooth", block: "start" })
                }
            }, 100)
        }
    }, [selectedResume])

    if (response.loading) {
        return <ResponseLoader />
    }

    if (response.error) {
        return (
            <div className="w-full p-4 sm:p-6 text-red-600 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    <h3 className="font-semibold text-sm sm:text-base">Error</h3>
                </div>
                <p className="text-xs sm:text-sm">{response.error}</p>
            </div>
        )
    }

    if (!resumeDataWithUrls.length) {
        return (
            <div className="w-full p-6 sm:p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                <Search className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-sm sm:text-base">No Resume Data</h3>
                <p className="text-xs sm:text-sm">No resume analysis data was found in the response.</p>
            </div>
        )
    }

    // Calculate grid columns based on filter count for responsiveness
    const getGridCols = () => {
        const filterCount = dynamicFilters.length
        if (filterCount <= 2) return 'grid-cols-2'
        if (filterCount <= 3) return 'grid-cols-3'
        if (filterCount <= 4) return 'grid-cols-2 sm:grid-cols-4'
        if (filterCount <= 5) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
    }

    return (
        <div id="resume-scorer-response" className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0">
            {/* Header */}
            {!isSharePage && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-800 p-3 sm:p-4 rounded-xl shadow-sm border border-blue-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 text-blue-700 rounded-lg flex items-center justify-center border border-gray-200 shadow-sm bg-white flex-shrink-0">
                                <Filter className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-base sm:text-lg md:text-xl font-bold truncate">
                                    {jobTitle ? `Resume Analysis - ${jobTitle}` : "Resume Scoring Analysis"}
                                </h1>
                                <p className="text-xs sm:text-sm text-blue-700">
                                    {dynamicFilters.length > 0 ? `${dynamicFilters[0].count} candidates analyzed` : "AI-powered resume screening"}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                            {executionToken && agent_id && (
                                <ShareButton
                                    agentId={agent_id}
                                    executionToken={executionToken}
                                    agentName="resume-scorer"
                                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                                />
                            )}
                            <Button
                                size="sm"
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm flex-1 sm:flex-none min-h-[32px] sm:min-h-[36px]"
                            >
                                {isGeneratingPDF ? (
                                    <>
                                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin flex-shrink-0" />
                                        <span className="hidden xs:inline">Generating...</span>
                                        <span className="xs:hidden">...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                                        <span>Download</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic Filter Overview */}
            {dynamicFilters.length > 0 && (
                <div className={`grid ${getGridCols()} gap-2 sm:gap-3 lg:gap-4`}>
                    {dynamicFilters.map((filter) => (
                        <div
                            key={filter.key}
                            className={`bg-white border rounded-lg sm:rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-all duration-200 hover:shadow-md ${selectedFilter === filter.key
                                ? `${filter.bgColor} ${filter.borderColor} shadow-md`
                                : 'border-gray-200 hover:border-blue-300'
                                }`}
                            onClick={() => handleFilterClick(filter.key)}
                        >
                            <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${selectedFilter === filter.key ? filter.color : 'text-gray-600'
                                }`}>
                                {filter.count}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1 leading-tight">
                                {filter.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Active Filter Display */}
            {(selectedFilter !== 'all' || searchQuery) && (
                <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-xs sm:text-sm font-medium text-blue-700">Active Filters:</span>
                    {selectedFilter !== 'all' && (
                        <Badge
                            className="bg-blue-100 text-blue-800 border-blue-300 cursor-pointer hover:bg-blue-200 text-xs sm:text-sm"
                            onClick={() => setSelectedFilter('all')}
                        >
                            {dynamicFilters.find(f => f.key === selectedFilter)?.label} <X className="w-3 h-3 ml-1" />
                        </Badge>
                    )}
                    {searchQuery && (
                        <Badge
                            className="bg-blue-100 text-blue-800 border-blue-300 cursor-pointer hover:bg-blue-200 text-xs sm:text-sm"
                            onClick={() => setSearchQuery('')}
                        >
                            Search: "{searchQuery}" <X className="w-3 h-3 ml-1" />
                        </Badge>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setSelectedFilter('all')
                            setSearchQuery('')
                        }}
                        className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm h-auto p-1"
                    >
                        Clear All
                    </Button>
                </div>
            )}

            {/* Search Controls */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search resumes, skills, keywords..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Resume List */}
            <div className="space-y-3 sm:space-y-4">
                {filteredResumes.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-white rounded-xl border border-gray-200">
                        <Search className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-sm sm:text-base">No resumes match your current filters</p>
                    </div>
                ) : (
                    filteredResumes.map((resume, index) => {
                        const isSelected = selectedResume?.resume === resume.resume && selectedResume?.ats_score === resume.ats_score
                        return (
                            <div
                                key={`${resume.resume}-${index}`}
                                className={`bg-white border rounded-xl shadow-sm overflow-hidden cursor-pointer transition-all duration-200 ${isSelected
                                    ? 'border-blue-500 shadow-lg ring-2 ring-blue-200 bg-blue-50/30'
                                    : 'border-gray-200 hover:shadow-md hover:border-blue-300'
                                    }`}
                                onClick={() => handleResumeClick(resume)}
                            >
                                <div className="p-3 sm:p-4">
                                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                            <div className="flex-shrink-0">
                                                <CircularProgress value={resume.ats_score || 0} size={isMobile ? 60 : 80} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`text-sm sm:text-base font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'
                                                    }`}>
                                                    {resume.resume || `Resume ${index + 1}`}
                                                </h3>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-2">
                                                    <Badge className={`text-xs sm:text-sm px-2 sm:px-3 py-1 w-fit ${resume.recommendation?.toLowerCase().includes("excellent") || resume.recommendation?.toLowerCase().includes("perfect")
                                                        ? "bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                                                        : resume.recommendation?.toLowerCase().includes("very good") || resume.recommendation?.toLowerCase().includes("good")
                                                            ? "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
                                                            : resume.recommendation?.toLowerCase().includes("fair")
                                                                ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
                                                                : "bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
                                                        }`}>
                                                        {resume.recommendation || 'No recommendation'}
                                                    </Badge>
                                                    {resume.matched_skills && (
                                                        <span className={`text-xs sm:text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'
                                                            }`}>
                                                            {resume.matched_skills.length} skills matched
                                                        </span>
                                                    )}
                                                </div>
                                                {resume.summary && (
                                                    <p className={`text-xs sm:text-sm mt-2 line-clamp-2 ${isSelected ? 'text-blue-700' : 'text-gray-600'
                                                        }`}>
                                                        {resume.summary}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {resume.signed_url && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            window.open(resume.signed_url, '_blank')
                                                        }}
                                                        className="text-xs sm:text-sm hidden sm:flex"
                                                    >
                                                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                                        View Resume
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            window.open(resume.signed_url, '_blank')
                                                        }}
                                                        className="text-xs flex sm:hidden p-2"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Detail Section */}
            {selectedResume && (
                <ResumeDetailSection
                    resume={selectedResume}
                    onClose={handleCloseDetail}
                />
            )}

            {/* Ratings and Feedback Section (hidden on share page) */}
            {!isSharePage && (
                <div className="mt-6">
                    {isHistoricalView ? (
                        <HistoricalRatingFeedback
                            key={`historical-feedback-${executionToken}`}
                            agent_id={agent_id || ""}
                            executionToken={executionToken || ""}
                            initialRating={rating}
                            initialFeedback={feedback}
                            agentOutputs={resumeDataWithUrls}
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
                            response={resumeDataWithUrls}
                            onUpdate={(updatedRating, updatedFeedback) => {
                                setRating(updatedRating)
                                setFeedback(updatedFeedback)
                            }}
                            isDisabled={false}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

export default FormattedResumeScorerResponse