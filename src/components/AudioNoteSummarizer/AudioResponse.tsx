"use client"

import type React from "react"
import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import RatingFeedback from "../Content/RatingFeedback"
import HistoricalRatingFeedback from "../Content/HistoricalRatingFeedback"
import { generateBeautifulPDF, generatePDFFromHTML } from "../../utils/pdfGenerator"
import {
    FileText,
    Users,
    Hash,
    Building,
    Briefcase,
    CheckCircle,
    Target,
    Brain,
    Activity,
    Lightbulb,
    UserCheck,
    BarChart3,
    Search,
    AlertCircle,
    Volume2,
    Speaker,
    ChevronDown,
    ChevronUp,
    Download,
} from "lucide-react"
import ResponseLoader from "./ResponseLoader"
import ShareButton from "../ShareButton"

interface FormattedResponseProps {
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
}

const AudioResponse: React.FC<FormattedResponseProps> = ({
    response,
    onSave,
    agent_id,
    executionToken,
    formRef,
    historicalRating = null,
    historicalFeedback = null,
    isHistoricalView = false,
}) => {
    const [rating, setRating] = useState<number>(0)
    const [feedback, setFeedback] = useState<string>("")
    const [isTranscriptionCollapsed, setIsTranscriptionCollapsed] = useState<boolean>(false)
    const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState<boolean>(false)

    // PDF generation states
    const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false)
    const [pdfStatus, setPdfStatus] = useState<{
        type: 'idle' | 'success' | 'error' | 'info'
        message: string
    } | null>(null)

    // Helper function to normalize data structure
    const normalizeData = (data: any) => {
        if (!data) return null

        // If data is an array with one element, extract the first element
        if (Array.isArray(data) && data.length === 1) {
            return data[0]
        }

        // If data is an array with multiple elements, return as is
        if (Array.isArray(data)) {
            return data
        }

        // If data is already an object, return as is
        return data
    }

    // Get normalized data for rendering
    const getNormalizedResponseData = () => {
        const rawData = response.data?.data || response.data
        return normalizeData(rawData)
    }

    // Initialize historical data if provided
    useEffect(() => {
        if (historicalRating !== null) {
            setRating(historicalRating)
        }
        if (historicalFeedback !== null) {
            setFeedback(historicalFeedback)
        }
    }, [historicalRating, historicalFeedback])

    const handleDownloadPDF = async (method: 'structured' | 'visual' = 'structured') => {
        setIsGeneratingPDF(true)
        setPdfStatus({ type: 'info', message: 'Preparing PDF...' })

        try {
            // Create filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
            const filename = `audio-analysis-${timestamp}.pdf`

            if (method === 'structured') {
                // Use structured PDF generation
                setPdfStatus({ type: 'info', message: 'Generating structured PDF...' })

                const analysisData = getNormalizedResponseData()

                if (!analysisData) {
                    throw new Error('No analysis data available for PDF generation')
                }

                const result = generateBeautifulPDF(analysisData, filename)

                if (result && !(await result).success) {
                    throw new Error((await result).message || 'Failed to generate structured PDF')
                }

                console.log("Data ---> ", response)
                console.log("Normalized Data ---> ", analysisData)

                setPdfStatus({
                    type: 'success',
                    message: 'PDF downloaded successfully!'
                })

            } else {
                // Use visual PDF generation (HTML to PDF)
                setPdfStatus({ type: 'info', message: 'Capturing visual content...' })

                const result = await generatePDFFromHTML('audio-analysis-content', filename)

                if (!result.success) {
                    throw new Error(result.message || 'Failed to generate visual PDF')
                }

                setPdfStatus({
                    type: 'success',
                    message: 'Visual PDF downloaded successfully!'
                })
            }

            // Clear success message after 3 seconds
            setTimeout(() => {
                setPdfStatus(null)
            }, 3000)

        } catch (error) {
            console.error('PDF generation error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            setPdfStatus({
                type: 'error',
                message: `PDF generation failed: ${errorMessage}`
            })

            // Clear error message after 5 seconds
            setTimeout(() => {
                setPdfStatus(null)
            }, 5000)
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const renderMarkdown = (content: string) => (
        <ReactMarkdown
            className="prose prose-slate max-w-none prose-headings:font-inter prose-headings:font-medium prose-headings:text-slate-800 prose-p:font-inter prose-p:text-slate-900 prose-p:leading-relaxed prose-ul:font-inter prose-ul:text-slate-900 prose-li:leading-relaxed"
            components={{
                h3: ({ children }) => <h3 className="text-lg font-inter font-medium mt-4 mb-2 text-slate-800">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                li: ({ children }) => <li className="text-slate-900 leading-relaxed font-inter text-sm">{children}</li>,
                p: ({ children }) => <p className="text-slate-900 leading-relaxed mb-3 font-inter text-sm">{children}</p>,
            }}
        >
            {content}
        </ReactMarkdown>
    )

    const getIconForKey = (key: string) => {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes("transcription")) return <Volume2 className="w-5 h-5 text-purple-700" />
        if (lowerKey.includes("summary")) return <FileText className="w-5 h-5 text-purple-600" />
        if (lowerKey.includes("speaker")) return <UserCheck className="w-5 h-5 text-blue-600" />
        if (lowerKey.includes("person") || lowerKey.includes("people")) return <Users className="w-5 h-5 text-blue-600" />
        if (lowerKey.includes("organization")) return <Building className="w-5 h-5 text-blue-600" />
        if (lowerKey.includes("project")) return <Briefcase className="w-5 h-5 text-blue-600" />
        if (lowerKey.includes("keyword") || lowerKey.includes("frequency"))
            return <Hash className="w-5 h-5 text-blue-600" />
        if (lowerKey.includes("entity") || lowerKey.includes("detection"))
            return <Search className="w-5 h-5 text-purple-600" />
        if (lowerKey.includes("decision")) return <CheckCircle className="w-5 h-5 text-blue-600" />
        if (lowerKey.includes("sentiment")) return <Brain className="w-5 h-5 text-purple-600" />
        if (lowerKey.includes("action") || lowerKey.includes("item")) return <Target className="w-5 h-5 text-purple-600" />
        if (lowerKey.includes("topic") || lowerKey.includes("key")) return <Lightbulb className="w-5 h-5 text-blue-800" />
        return <Activity className="w-5 h-5 text-slate-500" />
    }

    const getHeaderBackgroundForKey = (key: string) => {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes("transcription")) return "bg-gradient-to-r from-purple-100 to-violet-100"
        if (lowerKey.includes("summary")) return "bg-gradient-to-r from-purple-100 to-violet-100"
        if (lowerKey.includes("speaker")) return "bg-gradient-to-r from-blue-100 to-indigo-100"
        if (lowerKey.includes("person") || lowerKey.includes("people")) return "bg-gradient-to-r from-blue-100 to-indigo-100"
        if (lowerKey.includes("organization")) return "bg-gradient-to-r from-blue-100 to-indigo-100"
        if (lowerKey.includes("project")) return "bg-gradient-to-r from-blue-100 to-indigo-100"
        if (lowerKey.includes("keyword") || lowerKey.includes("frequency"))
            return "bg-gradient-to-r from-blue-100 to-indigo-100"
        if (lowerKey.includes("entity") || lowerKey.includes("detection"))
            return "bg-gradient-to-r from-purple-100 to-violet-100"
        if (lowerKey.includes("decision")) return "bg-gradient-to-r from-blue-100 to-indigo-100"
        if (lowerKey.includes("sentiment")) return "bg-gradient-to-r from-purple-100 to-violet-100"
        if (lowerKey.includes("action") || lowerKey.includes("item")) return "bg-gradient-to-r from-purple-100 to-violet-100"
        if (lowerKey.includes("topic") || lowerKey.includes("key")) return "bg-gradient-to-r from-blue-100 to-indigo-100"
        return "bg-gradient-to-r from-slate-50 to-gray-50"
    }

    const renderKeywordFrequency = (keywords: string[]) => {
        return (
            <div className="space-y-3">
                {keywords.map((keyword, index) => {
                    const [term, description] = keyword.split(": ")
                    return (
                        <div key={index} className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                    <Hash className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-inter font-semibold text-slate-800 mb-1 text-sm tracking-tight">{term}</h4>
                                    <p className="text-slate-600 font-inter text-sm leading-relaxed">{description}</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderTranscription = (transcriptions: any[]) => {
        const PREVIEW_HEIGHT = 200; // Height in pixels for the preview

        return (
            <div className="bg-white">
                <div
                    className="bg-gradient-to-r from-purple-100 to-violet-100 px-4 py-3 border-b border-gray-200 rounded-xl cursor-pointer hover:from-purple-200 hover:to-violet-200 transition-colors"
                    onClick={() => setIsTranscriptionCollapsed(!isTranscriptionCollapsed)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
                                <Volume2 className="w-5 h-5 text-purple-700" />
                            </div>
                            <h3 className="text-base font-inter font-semibold text-slate-800 tracking-tight">Transcription</h3>
                        </div>
                        {isTranscriptionCollapsed ? (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                        ) : (
                            <ChevronUp className="w-5 h-5 text-slate-600" />
                        )}
                    </div>
                </div>
                {!isTranscriptionCollapsed && (
                    <div className="p-4">
                        <div className="relative">
                            {/* Transcription Content */}
                            <div
                                className={`space-y-4 transition-all duration-300 ${!isTranscriptionExpanded ? `overflow-hidden` : ''
                                    }`}
                                style={!isTranscriptionExpanded ? { maxHeight: `${PREVIEW_HEIGHT}px` } : {}}
                            >
                                {transcriptions.map((transcription, index) => (
                                    <div key={index} className="rounded-lg p-3 border border-slate-200 shadow-sm bg-white">
                                        {Object.entries(transcription).map(([speaker, content]) => (
                                            <div key={speaker} className="space-y-2">
                                                <div className="text-slate-900 font-inter text-sm leading-relaxed">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <div className="p-1.5 bg-blue-50 rounded-lg">
                                                            <Speaker className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <span className="font-semibold text-slate-800 tracking-tight">{speaker}:</span>
                                                    </div>
                                                    <div className="ml-8 text-slate-900 font-medium">{content as React.ReactNode}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Gradient Blur Overlay - Only show when not expanded */}
                            {!isTranscriptionExpanded && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 pointer-events-none"
                                    style={{
                                        height: '100px',
                                        background: 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.7) 40%, rgba(255, 255, 255, 0.95) 80%, rgba(255, 255, 255, 1) 100%)',
                                    }}
                                />
                            )}
                        </div>

                        {/* Read More/Read Less Button - Always visible and solid */}
                        <div className="flex justify-center mt-6 relative z-10">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsTranscriptionExpanded(!isTranscriptionExpanded);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-200 to-violet-200 text-slate-800 font-semibold text-sm rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                            >
                                {isTranscriptionExpanded ? (
                                    <>
                                        <ChevronUp className="w-4 h-4" />
                                        Show Less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-4 h-4" />
                                        Read More
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const renderEntityList = (entities: string[], entityType: string) => {
        if (!entities || entities.length === 0) {
            return (
                <div className="text-slate-500 bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <span className="italic font-inter text-sm">None identified</span>
                </div>
            )
        }

        return (
            <div className="space-y-2">
                {entities.map((entity, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <span className="text-slate-900 font-inter text-sm font-medium">{entity}</span>
                    </div>
                ))}
            </div>
        )
    }

    const renderActionItems = (items: string[]) => {
        return (
            <div className="space-y-4">
                {items.map((item, index) => {
                    // Parse the action item string
                    const parts = item.split('. Assigned by: ');
                    const mainContent = parts[0];
                    const assignmentPart = parts[1];

                    // Extract priority if it exists at the beginning (any word followed by colon)
                    const priorityMatch = mainContent.match(/^([A-Za-z-]+):\s*(.+)$/);
                    const priority = priorityMatch ? priorityMatch[1] : null;
                    const description = priorityMatch ? priorityMatch[2] : mainContent;

                    // Extract assigned by and assigned to
                    let assignedBy = null;
                    let assignedTo = null;

                    if (assignmentPart) {
                        const assignedToParts = assignmentPart.split('. Assigned to: ');
                        assignedBy = assignedToParts[0];
                        assignedTo = assignedToParts[1];
                    }

                    return (
                        <div key={index} className="rounded-lg p-4 border border-purple-200 shadow-sm bg-white">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-purple-50 rounded-lg">
                                    <Target className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-inter font-semibold text-slate-800 text-sm tracking-tight">
                                            Action Item #{index + 1}
                                        </h4>
                                        {priority && (
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${priority.toLowerCase() === 'urgent'
                                                ? 'bg-red-100 text-red-700 border-red-200'
                                                : priority.toLowerCase() === 'important'
                                                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                                                    : priority.toLowerCase().includes('non-urgent') || priority.toLowerCase() === 'low'
                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                        : priority.toLowerCase() === 'high'
                                                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                            : 'bg-blue-100 text-blue-700 border-blue-200'
                                                }`}>
                                                {priority}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-900 font-inter text-sm leading-relaxed">{description}</p>
                                    {(assignedBy || assignedTo) && (
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-500 font-medium">
                                            {assignedBy && <span>Assigned By: {assignedBy}</span>}
                                            {assignedTo && <span>Assigned To: {assignedTo}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }
    const renderValue = (value: any, key = ""): React.ReactNode => {
        if (value === null || value === undefined) {
            return (
                <div className="text-slate-500 bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <span className="italic font-inter text-sm">No data available</span>
                </div>
            )
        }

        if (typeof value === "boolean") {
            return (
                <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm ${value
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                >
                    {value ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {value ? "True" : "False"}
                </div>
            )
        }

        if (typeof value === "number") {
            return (
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200 shadow-sm">
                    <span className="text-slate-900 font-inter font-semibold text-sm">{value}</span>
                </div>
            )
        }

        if (typeof value === "string") {
            // Handle markdown content
            if (value.includes("###") || value.includes("**") || value.includes("\n")) {
                return <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">{renderMarkdown(value)}</div>
            }

            return (
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p className="text-slate-900 font-inter text-sm leading-relaxed whitespace-pre-wrap font-medium">{value}</p>
                </div>
            )
        }

        if (Array.isArray(value)) {
            // Special handling for different array types
            if (key === "Transcription") {
                return renderTranscription(value)
            }

            if (key === "Keyword_Frequency") {
                return renderKeywordFrequency(value)
            }

            if (key === "Action_Items") {
                return renderActionItems(value)
            }

            // Handle entity arrays
            if (key.includes("Entity") || key.includes("Speaker") || key.includes("Decision")) {
                return renderEntityList(value, key)
            }

            return (
                <div className="space-y-3">
                    {value.map((item, index) => (
                        <div key={index} className="bg-white">
                            {renderValue(item, `${key}_${index}`)}
                        </div>
                    ))}
                </div>
            )
        }

        if (typeof value === "object") {
            // Separate transcription from other entries
            const entries = Object.entries(value)
            const transcriptionEntry = entries.find(([key]) => key.toLowerCase().includes("transcription"))
            const otherEntries = entries.filter(([key]) => !key.toLowerCase().includes("transcription"))

            // Filter out "Details" key and flatten its content
            const processedEntries = otherEntries.reduce((acc, [subKey, subVal]) => {
                if (subKey.toLowerCase() === "details" && typeof subVal === "object" && subVal !== null) {
                    // Flatten details content
                    Object.entries(subVal).forEach(([detailKey, detailVal]) => {
                        if (detailVal !== undefined && detailVal !== null) {
                            acc.push([detailKey, detailVal])
                        }
                    })
                } else if (subVal !== undefined && subVal !== null) {
                    acc.push([subKey, subVal])
                }
                return acc
            }, [] as [string, any][])

            return (
                <div className="space-y-6">
                    {/* Render other entries first */}
                    {processedEntries.map(([subKey, subVal]) => {
                        const formattedKey = subKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                        const icon = getIconForKey(subKey)
                        const headerBackground = getHeaderBackgroundForKey(subKey)

                        return (
                            <div key={subKey} className="bg-white">
                                <div className={`${headerBackground} px-4 py-3 border-b border-gray-200 rounded-xl`}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">{icon}</div>
                                        <h3 className="text-base font-inter font-semibold text-slate-800 tracking-tight">{formattedKey}</h3>
                                    </div>
                                </div>
                                <div className="p-4">{renderValue(subVal, subKey)}</div>
                            </div>
                        )
                    })}

                    {/* Render transcription last if it exists */}
                    {transcriptionEntry && (
                        <div key="transcription">
                            {renderValue(transcriptionEntry[1], transcriptionEntry[0])}
                        </div>
                    )}
                </div>
            )
        }

        return (
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <span className="text-slate-900 font-inter text-sm">{String(value)}</span>
            </div>
        )
    }

    if (response.error) {
        return (
            <div className="w-full max-w-6xl font-inter">
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-1.5 bg-red-100 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-red-800 font-inter tracking-tight">Error Processing Request</h3>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-red-200 shadow-sm">
                        <p className="text-red-800 font-inter text-sm">{response.error}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (response.loading) {
        return (
            <ResponseLoader />
        )
    }

    const currentExecutionToken = executionToken
    const currentagent_id = agent_id
    const currentagent_name = 'audio-note-summarizer'

    return (
        <div className="w-full max-w-6xl space-y-6 font-inter">
            {/* PDF Status Message */}
            {pdfStatus && (
                <div className={`p-4 rounded-lg border ${pdfStatus.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : pdfStatus.type === 'error'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                    <p className="text-sm font-medium">{pdfStatus.message}</p>
                </div>
            )}

            {/* Main Analysis Results Container */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm" id="audio-analysis-content">
                {/* Header with Download Button */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 rounded-t-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 flex-shrink-0">
                                <FileText className="text-blue-600 w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-800 font-inter tracking-tight truncate">
                                    Audio Analysis Results
                                </h1>
                                <p className="text-slate-600 text-sm font-inter truncate">
                                    AI-powered transcription and insights
                                </p>
                            </div>
                        </div>
                        {currentExecutionToken && currentagent_id && (
                            <ShareButton agentId={currentagent_id} executionToken={currentExecutionToken} agentName={currentagent_name} />
                        )}
                        {/* Download Button */}
                        <button
                            onClick={() => handleDownloadPDF('structured')}
                            disabled={isGeneratingPDF}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap flex-shrink-0 ${isGeneratingPDF
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                                }`}
                        >
                            {isGeneratingPDF ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="hidden xs:inline">Generating...</span>
                                    <span className="xs:hidden">...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    <span className="xs:inline">Download PDF</span>
                                    {/* <span className="xs:hidden">PDF</span> */}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-2">{renderValue(response.data?.data || response.data)}</div>
            </div>

            {/* Ratings and Feedback Section */}
            <div>
                {isHistoricalView ? (
                    <HistoricalRatingFeedback
                        key={`historical-feedback-${executionToken}`}
                        agent_id={agent_id || ""}
                        executionToken={executionToken || ""}
                        initialRating={rating}
                        initialFeedback={feedback}
                        agentOutputs={response.data?.data || response.data}
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
                        response={response.data?.data || response.data}
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

export default AudioResponse
