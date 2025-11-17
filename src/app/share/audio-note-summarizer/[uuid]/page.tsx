"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import Head from "next/head"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Volume2,
    Loader2,
    Home,
    ExternalLink,
    AlertCircle,
    Info,
    Play,
    Pause,
    Speaker,
    Hash,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Users,
} from "lucide-react"
import Link from "next/link"
import LogoImage from "@/assets/logo.jpeg"

interface SharedAudioData {
    uuid: string
    createdAt: string
    userId: string
    agent_id: string
    execution_id: string
    user_inputs: Array<{
        variable: string
        variable_value: string
    }>
    file_data: Array<{
        file_key: string
        signed_url: string
    }>
    agent_outputs: any
    response_rating: number | null
    response_feedback: string | null
    filename: string | null
    updatedAt: string
}

interface SharedAudioDataResponse {
    status: boolean
    message: string
    data?: SharedAudioData
    error?: string
}

const SharedAudioAnalysis: React.FC = () => {
    const params = useParams()
    const uuid = params?.uuid as string
    const [sharedData, setSharedData] = useState<SharedAudioData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [configExpanded, setConfigExpanded] = useState(false)
    const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef<HTMLAudioElement>(null)

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
            const data: SharedAudioDataResponse = await response.json()

            if (data.status && data.data) {
                setSharedData(data.data)
            } else {
                setError(data.message || "Failed to load shared audio content")
            }
        } catch (err) {
            console.error("Error fetching shared audio data:", err)
            setError("Failed to load shared audio content. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const formatUserInputs = (inputs: Array<{ variable: string; variable_value: string }>) => {
        const formatted: { [key: string]: any } = {}

        inputs.forEach((input) => {
            let value: string | boolean = input.variable_value

            if (value === "True") value = true
            if (value === "False") value = false

            formatted[input.variable] = value
        })

        return formatted
    }

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause()
            } else {
                audioRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    const renderUserConfiguration = (userInputs: { [key: string]: any }) => {
        const analysisOptions = [
            { label: "Structured Output", key: "Structured_Output", type: "boolean" },
            { label: "Summary", key: "Summary", type: "boolean" },
            { label: "Speaker Identification", key: "Speaker_Identification", type: "boolean" },
            { label: "Entity Detection", key: "Entity_Detection", type: "boolean" },
            { label: "Decisions", key: "Decisions", type: "boolean" },
            { label: "Keyword Frequency", key: "Keyword_Frequency", type: "boolean" },
            { label: "Sentiment Analysis", key: "Sentiment_Analysis", type: "boolean" },
            { label: "Key Topics", key: "Key_Topics", type: "boolean" },
            { label: "Action Items", key: "Action_Items", type: "boolean" },
        ]

        return (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4 sm:mb-6">
                <button
                    onClick={() => setConfigExpanded(!configExpanded)}
                    className="w-full p-3 sm:p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Personalized Inputs
                    </h2>
                    {configExpanded ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    )}
                </button>

                {configExpanded && (
                    <div className="p-3 sm:p-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {analysisOptions.map((option) => {
                                const value = userInputs[option.key]
                                if (value === undefined || value === null) return null

                                return (
                                    <div
                                        key={option.key}
                                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 p-2 bg-gray-50 rounded"
                                    >
                                        <span className="text-xs sm:text-sm text-gray-600">{option.label}:</span>
                                        <Badge
                                            variant={value ? "default" : "secondary"}
                                            className={`text-xs ${value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
                                        >
                                            {value ? "Enabled" : "Disabled"}
                                        </Badge>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        )
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
                                    <h4 className="font-semibold text-slate-800 mb-1 text-sm">{term}</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderTranscription = (transcriptions: any[]) => {
        const PREVIEW_HEIGHT = 200

        return (
            <div className="bg-white">
                <div
                    className="bg-gradient-to-r from-purple-100 to-violet-100 px-4 py-3 border-b border-gray-200 rounded-xl cursor-pointer hover:from-purple-200 hover:to-violet-200 transition-colors"
                    onClick={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
                                <Volume2 className="w-5 h-5 text-purple-700" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-800">Transcription</h3>
                        </div>
                        {isTranscriptionExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-600" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                        )}
                    </div>
                </div>
                {isTranscriptionExpanded && (
                    <div className="p-4">
                        <div className="relative">
                            <div
                                className={`space-y-4 transition-all duration-300 ${!isTranscriptionExpanded ? `overflow-hidden` : ""}`}
                                style={!isTranscriptionExpanded ? { maxHeight: `${PREVIEW_HEIGHT}px` } : {}}
                            >
                                {transcriptions.map((transcription, index) => (
                                    <div key={index} className="rounded-lg p-3 border border-slate-200 shadow-sm bg-white">
                                        {Object.entries(transcription).map(([speaker, content]) => (
                                            <div key={speaker} className="space-y-2">
                                                <div className="text-slate-900 text-sm leading-relaxed">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <div className="p-1.5 bg-blue-50 rounded-lg">
                                                            <Speaker className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <span className="font-semibold text-slate-800">{speaker}:</span>
                                                    </div>
                                                    <div className="ml-8 text-slate-900 font-medium">{content as React.ReactNode}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const renderValue = (value: any, key = ""): React.ReactNode => {
        if (value === null || value === undefined) {
            return (
                <div className="text-slate-500 bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <span className="italic text-sm">No data available</span>
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

        if (typeof value === "string") {
            return (
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <p className="text-slate-900 text-sm leading-relaxed whitespace-pre-wrap font-medium">{value}</p>
                </div>
            )
        }

        if (Array.isArray(value)) {
            if (key === "Transcription") {
                return renderTranscription(value)
            }

            if (key === "Keyword_Frequency") {
                return renderKeywordFrequency(value)
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
            const entries = Object.entries(value)
            const transcriptionEntry = entries.find(([key]) => key.toLowerCase().includes("transcription"))
            const otherEntries = entries.filter(([key]) => !key.toLowerCase().includes("transcription"))

            const processedEntries = otherEntries.reduce(
                (acc, [subKey, subVal]) => {
                    if (subKey.toLowerCase() === "details" && typeof subVal === "object" && subVal !== null) {
                        Object.entries(subVal).forEach(([detailKey, detailVal]) => {
                            if (detailVal !== undefined && detailVal !== null) {
                                acc.push([detailKey, detailVal])
                            }
                        })
                    } else if (subVal !== undefined && subVal !== null) {
                        acc.push([subKey, subVal])
                    }
                    return acc
                },
                [] as [string, any][],
            )

            return (
                <div className="space-y-6">
                    {processedEntries.map(([subKey, subVal]) => {
                        const formattedKey = subKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())

                        return (
                            <div key={subKey} className="bg-white">
                                <div className="bg-gradient-to-r from-purple-100 to-violet-100 px-4 py-3 border-b border-gray-200 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
                                            <Volume2 className="w-5 h-5 text-purple-700" />
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-800">{formattedKey}</h3>
                                    </div>
                                </div>
                                <div className="p-4">{renderValue(subVal, subKey)}</div>
                            </div>
                        )
                    })}

                    {transcriptionEntry && (
                        <div key="transcription">{renderValue(transcriptionEntry[1], transcriptionEntry[0])}</div>
                    )}
                </div>
            )
        }

        return (
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <span className="text-slate-900 text-sm">{String(value)}</span>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Shared Audio Analysis...</h2>
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
    const audioFile = sharedData.file_data?.[0]

    const audioPlayerStyles = `
        audio::-webkit-media-controls-panel {
            background-color: white;
        }

        audio::-webkit-media-controls-download-button {
            display: none;
        }

        audio::-webkit-media-controls-enclosure {
            overflow: hidden;
        }

        /* Firefox */
        audio::-moz-media-controls-download-button {
            display: none;
        }
    `;

    return (
        <>
            <Head>
                <title>Shared Audio Analysis - AgentHub</title>
                <meta name="description" content="View this audio analysis created with AgentHub" />
                <meta property="og:title" content="Shared Audio Analysis - AgentHub" />
                <meta property="og:description" content="View this audio analysis created with AgentHub" />
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
                    {/* Shared Content Header */}


                    {/* Audio Player */}
                    {audioFile && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 sm:mb-6">
                            <style dangerouslySetInnerHTML={{ __html: audioPlayerStyles }} />
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                Audio File
                            </h2>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <Button onClick={toggleAudio} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </Button>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{sharedData.filename || "Audio File"}</p>
                                    <audio
                                        ref={audioRef}
                                        src={audioFile.signed_url}
                                        onEnded={() => setIsPlaying(false)}
                                        onPause={() => setIsPlaying(false)}
                                        onPlay={() => setIsPlaying(true)}
                                        controls
                                        controlsList="nodownload"
                                        className="w-full mt-2"
                                        style={{
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* User Configuration */}
                    {renderUserConfiguration(userInputs)}

                    {/* Analysis Results */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                Analysis Results
                            </h2>
                            {sharedData.agent_outputs ? (
                                renderValue(sharedData.agent_outputs)
                            ) : (
                                <div className="text-center py-6">
                                    <Volume2 className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                                    <h3 className="text-base font-medium text-gray-900 mb-2">Audio Analysis Complete</h3>
                                    <p className="text-sm text-gray-600">Your audio analysis is ready!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="mt-6 sm:mt-8 text-center">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Want Your Own Audio Analysis?</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Upload your audio files and get AI-powered transcription, summaries, and insights.
                            </p>
                            <Link href="/?scrollTo=agents">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Volume2 className="w-4 h-4 mr-2" />
                                    Analyze My Audio
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SharedAudioAnalysis
