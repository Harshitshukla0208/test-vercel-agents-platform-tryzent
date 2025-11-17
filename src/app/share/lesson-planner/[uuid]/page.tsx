"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Head from "next/head"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    FileText,
    Loader2,
    Home,
    ExternalLink,
    AlertCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Users,
    BookOpen,
    Download,
    File,
    Paperclip,
} from "lucide-react"
import Link from "next/link"
import LogoImage from "@/assets/logo.jpeg"
import MathRenderer from "@/components/TestPaperGenerator/MathRenderer"
import "katex/dist/katex.min.css"

interface FileData {
    file_key: string
    signed_url: string
    expires_at: number
}

interface SharedLessonData {
    uuid: string
    createdAt: string
    userId: string
    agent_id: string
    execution_id: string
    user_inputs: Array<{
        variable: string
        variable_value: string
    }>
    file_data: FileData[]
    agent_outputs: any
    response_rating: number | null
    response_feedback: string | null
    filename: string | null
    updatedAt: string
}

interface SharedLessonDataResponse {
    status: boolean
    message: string
    data?: SharedLessonData
    error?: string
}

import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { convertLatexNotation } from "@/utils/mathUtils"

// MathText aligned with leoqui, with slightly larger math font
const MathText: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null
    const normalized = convertLatexNotation(text)
    return (
        <div className="math-text-wrapper">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{ p: ({ children }) => <span>{children}</span>, div: ({ children }) => <span>{children}</span> }}
            >
                {normalized}
            </ReactMarkdown>
            <style jsx>{`
                .math-text-wrapper :global(.katex) {
                    font-size: 1.3em !important;
                }
                .math-text-wrapper :global(.katex-display) {
                    font-size: 1.3em !important;
                }
            `}</style>
        </div>
    )
}

// Enhanced Formatted Text Component with proper bullet points
const FormattedText: React.FC<{ text: string; showBullets?: boolean }> = ({ text, showBullets = true }) => {
    if (!text) return null
    
    const normalized = text.replace(/\\n/g, '\n').trim()
    const lines = normalized.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) return null
    
    return (
        <div className="space-y-2">
            {lines.map((line, idx) => {
                const trimmedLine = line.trim()
                if (!trimmedLine) return null
                
                return (
                    <div key={idx} className="flex items-start gap-3">
                        {showBullets && (
                            <span className="text-purple-600 font-bold mt-1 flex-shrink-0">•</span>
                        )}
                        <div className="flex-1 text-sm leading-relaxed text-gray-800">
                            <MathText text={trimmedLine} />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

const SharedLessonPlan: React.FC = () => {
    const params = useParams()
    const uuid = params?.uuid as string
    const [sharedData, setSharedData] = useState<SharedLessonData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [configExpanded, setConfigExpanded] = useState(false)

    useEffect(() => {
        if (uuid) {
            fetchSharedData(uuid)
        }
    }, [uuid])

    const fetchSharedData = async (shareUuid: string) => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/get-shared-data/${shareUuid}`)
            const data: SharedLessonDataResponse = await response.json()

            if (data.status && data.data) {
                setSharedData(data.data)
            } else {
                setError(data.message || "Failed to load shared lesson content")
            }
        } catch (err) {
            console.error("Error fetching shared lesson data:", err)
            setError("Failed to load shared lesson content. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const formatUserInputs = (inputs: Array<{ variable: string; variable_value: string }>) => {
        const formatted: { [key: string]: any } = {}

        inputs.forEach((input) => {
            let value: string | boolean | number = input.variable_value

            if (value === "True") value = true
            if (value === "False") value = false
            if (!isNaN(Number(value)) && value !== "") {
                value = Number(value)
            }

            formatted[input.variable] = value
        })

        return formatted
    }

    const getFileExtension = (fileKey: string): string => {
        const extension = fileKey.split('.').pop()?.toLowerCase()
        return extension || 'file'
    }

    const getFileIcon = (fileKey: string) => {
        const extension = getFileExtension(fileKey)
        
        switch (extension) {
            case 'pdf':
                return <FileText className="w-4 h-4 text-blue-600" />
            case 'doc':
            case 'docx':
                return <FileText className="w-4 h-4 text-blue-600" />
            case 'txt':
                return <FileText className="w-4 h-4 text-gray-600" />
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return <File className="w-4 h-4 text-green-600" />
            default:
                return <File className="w-4 h-4 text-gray-600" />
        }
    }

    const getFileName = (fileKey: string): string => {
        // Extract filename from file_key
        const parts = fileKey.split('/')
        const filename = parts[parts.length - 1]
        
        // Remove UUID prefix if present
        const cleanName = filename.replace(/^_[a-f0-9]+_/, '')
        
        return cleanName || fileKey
    }

    const handleFileDownload = (fileData: FileData) => {
        try {
            const link = document.createElement('a')
            link.href = fileData.signed_url
            link.download = getFileName(fileData.file_key)
            link.target = '_blank'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error('Error downloading file:', error)
            // Fallback: open in new tab
            window.open(fileData.signed_url, '_blank')
        }
    }

    const isFileExpired = (expiresAt: number): boolean => {
        return Date.now() / 1000 > expiresAt
    }

    const renderUploadedFilesInConfig = () => {
        if (!sharedData?.file_data || sharedData.file_data.length === 0) {
            return null
        }

        return (
            <div className="col-span-1 lg:col-span-2">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    Uploaded Files ({sharedData.file_data.length})
                </h3>
                <div className="space-y-3">
                    {sharedData.file_data.map((fileData, index) => {
                        const fileName = getFileName(fileData.file_key)
                        const extension = getFileExtension(fileData.file_key)
                        const isExpired = isFileExpired(fileData.expires_at)
                        const expiryDate = new Date(fileData.expires_at * 1000)

                        return (
                            <div
                                key={index}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-2 sm:gap-0 ${
                                    isExpired ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                        {getFileIcon(fileData.file_key)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate overflow-x-auto block max-w-full" style={{wordBreak: 'break-all'}}>
                                            {fileName}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="uppercase">{extension}</span>
                                            <span>•</span>
                                            {isExpired ? (
                                                <span className="text-red-600 font-medium">
                                                    Link expired
                                                </span>
                                            ) : (
                                                <span>
                                                    Expires: {expiryDate.toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-row flex-wrap gap-2 mt-2 sm:mt-0">
                                    {!isExpired && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(fileData.signed_url, '_blank')}
                                                className="h-8 w-auto px-3 text-xs"
                                            >
                                                <ExternalLink className="w-4 h-4 mr-1" />
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleFileDownload(fileData)}
                                                className="h-8 w-auto px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                            >
                                                <Download className="w-4 h-4 mr-1" />
                                                Download
                                            </Button>
                                        </>
                                    )}
                                    {isExpired && (
                                        <span className="text-xs text-red-600 font-medium px-2 py-1 bg-red-100 rounded">
                                            Expired
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                {sharedData.file_data.some(file => isFileExpired(file.expires_at)) && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-800">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            Some file links have expired. Signed URLs are temporary and expire after a certain period for security reasons.
                        </p>
                    </div>
                )}
            </div>
        )
    }

    const renderUserConfiguration = (userInputs: { [key: string]: any }) => {
        const basicInfo = [
            { label: "Board", key: "Board" },
            { label: "Grade", key: "Grade" },
            { label: "Subject", key: "Subject" },
            { label: "Chapter", key: "Chapter_Name" },
            { label: "Language", key: "Language" },
        ]

        const lessonInfo = [
            { label: "Number of Lectures", key: "Number_of_Lecture" },
            { label: "Duration per Lecture", key: "Duration_of_Lecture", suffix: "minutes" },
            { label: "Class Strength", key: "Class_Strength", suffix: "students" },
            { label: "Quiz Included", key: "Quiz", type: "boolean" },
            { label: "Assignment Included", key: "Assignment", type: "boolean" },
            { label: "Structured Output", key: "Structured_Output", type: "boolean" },
        ]

        return (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4 sm:mb-6">
                <button
                    onClick={() => setConfigExpanded(!configExpanded)}
                    className="w-full p-3 sm:p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Lesson Configuration
                    </h2>
                    {configExpanded ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    )}
                </button>

                {configExpanded && (
                    <div className="p-3 sm:p-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {/* Basic Information */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h3>
                                <div className="space-y-2">
                                    {basicInfo.map((info) => {
                                        const value = userInputs[info.key]
                                        return value !== null && value !== undefined && value !== "" ? (
                                            <div
                                                key={info.key}
                                                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0"
                                            >
                                                <span className="text-xs sm:text-sm text-gray-600">{info.label}:</span>
                                                <span className="text-xs sm:text-sm font-medium text-gray-900">
                                                    {String(value)}
                                                </span>
                                            </div>
                                        ) : null
                                    })}
                                </div>
                            </div>

                            {/* Lesson Information */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Lesson Information</h3>
                                <div className="space-y-2">
                                    {lessonInfo.map((info) => {
                                        let value = userInputs[info.key]
                                        if (info.type === "boolean") {
                                            value = value ? "Yes" : "No"
                                        }

                                        return value !== null && value !== undefined && value !== "" ? (
                                            <div
                                                key={info.key}
                                                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0"
                                            >
                                                <span className="text-xs sm:text-sm text-gray-600">{info.label}:</span>
                                                <span className="text-xs sm:text-sm font-medium text-gray-900">
                                                    {String(value)} {info.suffix || ""}
                                                </span>
                                            </div>
                                        ) : null
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Uploaded Files Section within Configuration */}
                        {sharedData?.file_data && sharedData.file_data.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <div className="grid grid-cols-1">
                                    {renderUploadedFilesInConfig()}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    const extractLectures = (data: any) => {
        if (!data) return []

        const lectures = []

        if (Array.isArray(data)) {
            data.forEach((lesson, index) => {
                lectures.push({
                    key: `lesson_${index + 1}`,
                    title: `Lecture ${index + 1}`,
                    content: lesson,
                })
            })
        } else if (typeof data === "object") {
            Object.keys(data).forEach((key) => {
                if (key.toLowerCase().includes("lecture") || key.toLowerCase().includes("lesson")) {
                    lectures.push({
                        key,
                        title: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                        content: data[key],
                    })
                }
            })

            if (lectures.length === 0) {
                lectures.push({
                    key: "lesson_1",
                    title: "Lecture 1",
                    content: data,
                })
            }
        }

        return lectures
    }

    const renderValue = (value: any, path: string[] = [], level = 0): React.ReactNode => {
        if (value === null || value === undefined) {
            return <span className="text-xs sm:text-sm text-gray-400">null</span>
        }

        if (typeof value === "boolean") {
            return <span className="text-xs sm:text-sm text-purple-600 font-medium">{value.toString()}</span>
        }

        if (typeof value === "number") {
            return (
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200 shadow-sm">
                    <span className="text-slate-900 font-semibold text-sm">{value}</span>
                </div>
            )
        }

        if (typeof value === "string") {
            const lastKey = path[path.length - 1]?.toLowerCase() || ''
            const isWebResources = lastKey.includes("web") && lastKey.includes("resource")
            const isUrl = /^https?:\/\/.+/.test(value.trim())
            
            if (isWebResources || isUrl) {
                return (
                    <div className="text-xs sm:text-sm break-words text-gray-900 shadow-sm p-3 rounded-lg border border-blue-200 bg-blue-50">
                        <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-2 transition-colors duration-200"
                        >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span className="truncate">{value}</span>
                        </a>
                    </div>
                )
            }

            const isLongText = value.includes("###") || value.includes("**") || 
                              value.includes("\n") || value.includes("\\n") || 
                              value.length > 100

            if (isLongText) {
                const isQuizOrAssignment = /quiz|assignment/i.test(lastKey)
                const isPrerequisiteQuiz = /prerequisite.*quiz|quiz.*prerequisite/i.test(lastKey)

                if (isQuizOrAssignment || isPrerequisiteQuiz) {
                    const normalized = value.replace(/\\n/g, '\n').trim()
                    const lines = normalized.split('\n').filter((line) => line.trim())

                    return (
                        <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-gradient-to-br from-white to-purple-50">
                            <div className="space-y-4">
                                {lines.map((line, idx) => {
                                    const trimmedLine = line.trim()
                                    if (!trimmedLine) return null

                                    const isQuestion = /^Q\d+\./i.test(trimmedLine)
                                    const isAnswer = /^A\d+\./i.test(trimmedLine)
                                    const isTask = /^Task\s+\d+\./i.test(trimmedLine)
                                    const isTitle = trimmedLine.includes('Quiz') || trimmedLine.includes('Assignment') ||
                                        trimmedLine.includes('Total Questions') || trimmedLine.includes('Expected Outcome') ||
                                        trimmedLine.includes('Assessment Criteria')

                                    if (isTitle) {
                                        return (
                                            <div key={idx} className="font-semibold text-purple-700 text-base mt-2 mb-1">
                                                <MathText text={trimmedLine} />
                                            </div>
                                        )
                                    }

                                    if (isQuestion || isTask) {
                                        return (
                                            <div key={idx} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-blue-600 font-bold flex-shrink-0">📝</span>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-blue-900 mb-1">
                                                            <MathText text={trimmedLine} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    if (isAnswer) {
                                        return (
                                            <div key={idx} className="bg-green-50 rounded-lg p-3 border border-green-200 ml-6">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                                                    <div className="flex-1 text-green-900">
                                                        <MathText text={trimmedLine} />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <div key={idx} className="text-gray-700 text-sm pl-2">
                                            <MathText text={trimmedLine} />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                }

                return (
                    <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
                        <FormattedText text={value} showBullets={true} />
                    </div>
                )
            }

            return (
                <div className="text-sm text-gray-800 shadow-sm p-3 rounded-lg border border-gray-200 bg-white">
                    <MathText text={value} />
                </div>
            )
        }

        if (Array.isArray(value)) {
            const isWebResourcesArray = path.length > 0 && path[path.length - 1].toLowerCase().includes("web") && 
                                        path[path.length - 1].toLowerCase().includes("resource")
            
            if (isWebResourcesArray) {
                return (
                    <div className="space-y-3 mt-2">
                        {value.map((item, index) => {
                            if (typeof item === "string" && /^https?:\/\/.+/.test(item.trim())) {
                                return (
                                    <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                        <a
                                            href={item}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-2 transition-colors duration-200"
                                        >
                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            <span className="break-all">{item}</span>
                                        </a>
                                    </div>
                                )
                            }
                            return (
                                <div key={index} className="bg-white">
                                    {renderValue(item, [...path, index.toString()], level + 1)}
                                </div>
                            )
                        })}
                    </div>
                )
            }
            
            return (
                <div className="space-y-3 sm:space-y-4 mt-2">
                    {value.map((item, index) => (
                        <div key={index} className="bg-white">
                            {renderValue(item, [...path, index.toString()], level + 1)}
                        </div>
                    ))}
                </div>
            )
        }

        if (typeof value === "object") {
            return (
                <div className="space-y-3 sm:space-y-4 mt-2">
                    {Object.entries(value).map(([key, val]) => {
                        if (val === undefined || val === null) return null

                        const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                        const isTopLevel = level === 0

                        return (
                            <div key={key} className={`${isTopLevel ? "bg-white overflow-hidden" : "bg-white rounded-lg"}`}>
                                <div
                                    className={`px-3 sm:px-4 py-2 sm:py-3 ${isTopLevel
                                        ? "bg-gradient-to-r from-purple-100 to-violet-100 rounded-lg border border-purple-200"
                                        : "bg-gradient-to-r from-purple-100 to-violet-100 rounded-lg border border-purple-200"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {isTopLevel && (
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                                                <FileText className="w-2 h-2 sm:w-3 sm:h-3 text-purple-600" />
                                            </div>
                                        )}
                                        <h3
                                            className={`${isTopLevel ? "text-sm sm:text-base font-semibold" : "text-xs sm:text-sm font-medium"
                                                } text-gray-900`}
                                        >
                                            {formattedKey}
                                        </h3>
                                    </div>
                                </div>
                                <div className="p-3 sm:p-4">{renderValue(val, [...path, key], level + 1)}</div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        return <span className="text-xs sm:text-sm text-gray-700">{String(value)}</span>
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Shared Lesson Plan...</h2>
                    <p className="text-sm text-gray-600">Please wait while we fetch the content</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Content Not Found</h2>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                    <Link href="/">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Home className="w-4 h-4 mr-2" />
                            Go to Home
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    if (!sharedData) {
        return null
    }

    const userInputs = formatUserInputs(sharedData.user_inputs)
    const chapterName = userInputs.Chapter_Name || "Lesson Plan"
    const lectures = extractLectures(sharedData.agent_outputs)

    return (
        <>
            <Head>
                <title>{`Shared ${chapterName} Lesson Plan - AgentHub`}</title>
                <meta name="description" content={`View this ${chapterName} lesson plan created with AgentHub`} />
                <meta property="og:title" content={`Shared ${chapterName} Lesson Plan - AgentHub`} />
                <meta property="og:description" content={`View this ${chapterName} lesson plan created with AgentHub`} />
                <meta property="og:type" content="website" />
            </Head>

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Image src={LogoImage || "/placeholder.svg"} alt="logo" className="h-8 w-8 rounded-md" />
                                <div className="flex flex-col">
                                    <Link href='/'>
                                        <span className="text-lg font-bold text-gray-900">AgentHub</span>
                                    </Link>
                                    <span className="text-xs text-gray-500">
                                        by{" "}
                                        <a
                                            href="https://tryzent.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                        >
                                            Tryzent
                                        </a>
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href="/?scrollTo=agents">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4">
                                        <Home className="w-4 h-4 mr-1" />
                                        <span className="hidden sm:inline">Create Your Own</span>
                                        <span className="sm:hidden">Create</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto p-4">
                    {/* User Configuration with Uploaded Files */}
                    {renderUserConfiguration(userInputs)}

                    {/* Lesson Plan Content */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                Lesson Plan Details
                            </h2>

                            {lectures.length > 1 ? (
                                <Tabs defaultValue={lectures[0]?.key} className="w-full">
                                    <TabsList
                                        className={`grid w-full mb-4 sm:mb-6 ${lectures.length <= 2
                                            ? "grid-cols-2"
                                            : lectures.length <= 3
                                                ? "grid-cols-3"
                                                : lectures.length <= 4
                                                    ? "grid-cols-4"
                                                    : "grid-cols-5"
                                            }`}
                                    >
                                        {lectures.map((lecture, index) => (
                                            <TabsTrigger key={lecture.key} value={lecture.key} className="text-xs sm:text-sm">
                                                {lecture.title}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    {lectures.map((lecture) => (
                                        <TabsContent key={lecture.key} value={lecture.key} className="mt-0">
                                            {renderValue(lecture.content)}
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            ) : sharedData.agent_outputs ? (
                                renderValue(sharedData.agent_outputs)
                            ) : (
                                <div className="text-center py-6">
                                    <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                                    <h3 className="text-base font-medium text-gray-900 mb-2">Lesson Plan Generated</h3>
                                    <p className="text-sm text-gray-600">Your personalized lesson plan is ready!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="mt-6 sm:mt-8 text-center">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                                Want Your Own Personalized Lesson Plan?
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Create custom lesson plans tailored to your curriculum, grade level, and teaching requirements.
                            </p>
                            <Link href="/?scrollTo=agents">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Create My Lesson Plan
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SharedLessonPlan