"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Head from "next/head"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { FileText, Loader2, Home, ExternalLink, AlertCircle, Info } from "lucide-react"
import Link from "next/link"
import LogoImage from "@/assets/logo.jpeg"
import MathRenderer from "@/components/TestPaperGenerator/MathRenderer"

interface SharedTestPaperData {
    uuid: string
    createdAt: string
    userId: string
    agent_id: string
    execution_id: string
    user_inputs: Array<{
        variable: string
        variable_value: string
    }>
    file_data: any[]
    agent_outputs: any
    response_rating: number | null
    response_feedback: string | null
    filename: string | null
    updatedAt: string
}

interface SharedTestPaperDataResponse {
    status: boolean
    message: string
    data?: SharedTestPaperData
    error?: string
}

const SharedTestPaper: React.FC = () => {
    const params = useParams()
    const uuid = params?.uuid as string
    const [sharedData, setSharedData] = useState<SharedTestPaperData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
            const data: SharedTestPaperDataResponse = await response.json()

            if (data.status && data.data) {
                setSharedData(data.data)
            } else {
                setError(data.message || "Failed to load shared test paper content")
            }
        } catch (err) {
            console.error("Error fetching shared test paper data:", err)
            setError("Failed to load shared test paper content. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const formatUserInputs = (inputs: Array<{ variable: string; variable_value: string }>) => {
        const formatted: { [key: string]: any } = {}

        inputs.forEach((input) => {
            let value: string | string[] | { [key: string]: any } = input.variable_value

            if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
                try {
                    const parsed = JSON.parse(value.replace(/'/g, '"'))
                    value = Array.isArray(parsed) ? parsed : value
                } catch {
                    const cleanedValue = value
                        .slice(1, -1)
                        .split(",")
                        .map((item: string) => item.trim().replace(/'/g, ""))
                    value = cleanedValue
                }
            }

            if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
                try {
                    value = JSON.parse(value.replace(/'/g, '"'))
                } catch {
                    // Keep as string if parsing fails
                }
            }

            formatted[input.variable] = value
        })

        return formatted
    }

    const parseOptions = (questionText: string) => {
        const optionsMatch = questionText.match(/Options?:\s*([\s\S]*)/)
        if (!optionsMatch) return null

        const optionsText = optionsMatch[1]
        const options: { [key: string]: string } = {}

        const lines = optionsText.split("\n").filter((line) => line.trim() !== "")

        if (lines.length > 0) {
            lines.forEach((line) => {
                const match = line.trim().match(/^([A-D])[).]\s*(.+)/)
                if (match) {
                    const [, letter, text] = match
                    options[letter.toLowerCase()] = text.trim()
                }
            })
        } else {
            const optionMatches = optionsText.match(/([A-D])[).]\s*([^A-D]+?)(?=\s*[A-D][).]|$)/g)
            if (optionMatches) {
                optionMatches.forEach((match) => {
                    const [, letter, text] = match.match(/([A-D])[).]\s*(.+)/) || []
                    if (letter && text) {
                        options[letter.toLowerCase()] = text.trim()
                    }
                })
            }
        }

        return Object.keys(options).length > 0 ? options : null
    }

    const renderTestPaperContent = (data: any, userInputs: any) => {
        if (!data) return null

        // Handle case where data is an array (extract first element)
        let dataToRender = data
        if (Array.isArray(data) && data.length > 0) {
            dataToRender = data[0]
        }

        const gradeLevel = Number.parseInt(userInputs.grade) || 0
        const showWritingLines = gradeLevel <= 4

        const renderSection = (sectionKey: string, sectionTitle: string, questions: any[]) => {
            if (!questions || questions.length === 0) return null

            return (
                <div className="mb-6 sm:mb-8">
                    <h3 className="text-sm sm:text-base font-bold mb-3 sm:mb-4 underline">{sectionTitle}</h3>
                    <div className="space-y-4 sm:space-y-6">
                        {questions.map((question: any, index: number) => {
                            try {
                                const questionObj = Array.isArray(question) ? question[0] : question
                                if (!questionObj || typeof questionObj !== 'object') {
                                    return null
                                }
                                
                                const questionKeys = Object.keys(questionObj)
                                if (questionKeys.length === 0) {
                                    return null
                                }
                                
                                const questionKey = questionKeys[0]
                                const questionText = questionObj[questionKey]
                                
                                // Ensure questionText is a string
                                const safeQuestionText = questionText != null ? String(questionText) : ''
                                const options = questionObj.options || parseOptions(safeQuestionText)
                                const cleanQuestionText = safeQuestionText.split(/Options?:/)[0].trim()

                                return (
                                    <div key={index} className="mb-4 sm:mb-6">
                                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                                            <div className="font-medium flex-1 text-sm sm:text-base">
                                                {questionKey}. <MathRenderer content={cleanQuestionText} className="inline" />
                                            </div>
                                        </div>
                                        {options && (
                                            <div className="ml-4 sm:ml-6 space-y-3 sm:space-y-4">
                                                {Object.entries(options).map(([optionKey, optionValue]) => (
                                                    <div key={optionKey} className="leading-relaxed text-sm flex items-start gap-2 mb-2">
                                                        <span className="mr-2 font-medium flex-shrink-0">{optionKey.toUpperCase()})</span>
                                                        <span className="flex-1 min-w-0">
                                                            <MathRenderer content={String(optionValue || '')} className="inline" />
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    {showWritingLines && !options && (
                                        <div className="mt-2 sm:mt-3 ml-4 sm:ml-6">
                                            {sectionKey === "Very_Short_Answers" && (
                                                <div className="border-b border-gray-400 h-6 sm:h-8"></div>
                                            )}
                                            {sectionKey === "Short_Answers" && (
                                                <div className="space-y-2">
                                                    <div className="border-b border-gray-400 h-5 sm:h-6"></div>
                                                    <div className="border-b border-gray-400 h-5 sm:h-6"></div>
                                                    <div className="border-b border-gray-400 h-5 sm:h-6"></div>
                                                </div>
                                            )}
                                            {(sectionKey === "Long_Answers" || sectionKey === "Case_Studies") && (
                                                <div className="space-y-2">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div key={i} className="border-b border-gray-400 h-5 sm:h-6"></div>
                                                    ))}
                                                </div>
                                            )}
                                            {sectionKey === "Very_Long_Answers" && (
                                                <div className="space-y-2">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div key={i} className="border-b border-gray-400 h-5 sm:h-6"></div>
                                                    ))}
                                                </div>
                                            )}
                                            {(sectionKey === "MCQs" ||
                                                sectionKey === "True_False_Questions" ||
                                                sectionKey === "Fill_in_the_Blanks") && <div className="text-sm">Answer: ___________</div>}
                                        </div>
                                    )}
                                    {showWritingLines && options && (
                                        <div className="mt-2 sm:mt-3 ml-4 sm:ml-6 text-sm">Answer: ___________</div>
                                    )}
                                    </div>
                                )
                            } catch (error) {
                                console.error(`Error rendering question ${index}:`, error, question)
                                return (
                                    <div key={index} className="mb-4 sm:mb-6 text-red-500 text-sm">
                                        Error rendering question {index + 1}
                                    </div>
                                )
                            }
                        })}
                    </div>
                </div>
            )
        }

        return (
            <div className="bg-white p-4 sm:p-6 md:p-8 font-mono text-sm leading-relaxed">
                {/* Test Paper Header */}
                <div className="text-center mb-6 sm:mb-8 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-lg sm:text-xl font-bold mb-2">TEST PAPER</h1>
                    <div className="text-sm sm:text-base">
                        <div className="mb-2">
                            Subject:{" "}
                            <MathRenderer content={userInputs.subject ? String(userInputs.subject).charAt(0).toUpperCase() + String(userInputs.subject).slice(1) : "_________________"} className="inline" />{" "}
                            Class: <MathRenderer content={userInputs.grade ? String(userInputs.grade) : "_______"} className="inline" /> Time: <MathRenderer content={userInputs.test_duration ? String(userInputs.test_duration) : "_______"} className="inline" /> minutes
                        </div>
                        <div>Maximum Marks: <MathRenderer content={userInputs.total_marks ? String(userInputs.total_marks) : "_______"} className="inline" /> Date: _____________</div>
                    </div>
                </div>

                {/* General Instructions */}
                {dataToRender.General_Instructions && (
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-sm sm:text-base font-bold mb-3 underline">GENERAL INSTRUCTIONS:</h2>
                        <div className="whitespace-pre-line text-xs sm:text-sm leading-relaxed">
                            <MathRenderer content={dataToRender.General_Instructions ? String(dataToRender.General_Instructions).trim() : ''} />
                        </div>
                    </div>
                )}

                {/* Question Sections */}
                <div className="space-y-6 sm:space-y-8">
                    {dataToRender.MCQs && dataToRender.MCQs.length > 0 && (
                        <div>
                            {renderSection("MCQs", "SECTION A: MULTIPLE CHOICE QUESTIONS", dataToRender.MCQs)}
                        </div>
                    )}

                    {dataToRender.True_False_Questions && dataToRender.True_False_Questions.length > 0 && (
                        <div>
                            {renderSection("True_False_Questions", "SECTION B: TRUE/FALSE QUESTIONS", dataToRender.True_False_Questions)}
                        </div>
                    )}

                    {dataToRender.Fill_in_the_Blanks && dataToRender.Fill_in_the_Blanks.length > 0 && (
                        <div>
                            {renderSection("Fill_in_the_Blanks", "SECTION C: FILL IN THE BLANKS", dataToRender.Fill_in_the_Blanks)}
                        </div>
                    )}

                    {dataToRender.Very_Short_Answers && dataToRender.Very_Short_Answers.length > 0 && (
                        <div>
                            {renderSection("Very_Short_Answers", "SECTION D: VERY SHORT ANSWER QUESTIONS", dataToRender.Very_Short_Answers)}
                        </div>
                    )}

                    {dataToRender.Short_Answers && dataToRender.Short_Answers.length > 0 && (
                        <div>
                            {renderSection("Short_Answers", "SECTION E: SHORT ANSWER QUESTIONS", dataToRender.Short_Answers)}
                        </div>
                    )}

                    {dataToRender.Long_Answers && dataToRender.Long_Answers.length > 0 && (
                        <div>
                            {renderSection("Long_Answers", "SECTION F: LONG ANSWER QUESTIONS", dataToRender.Long_Answers)}
                        </div>
                    )}

                    {dataToRender.Very_Long_Answers && dataToRender.Very_Long_Answers.length > 0 && (
                        <div>
                            {renderSection("Very_Long_Answers", "SECTION G: VERY LONG ANSWER QUESTIONS", dataToRender.Very_Long_Answers)}
                        </div>
                    )}

                    {dataToRender.Case_Studies && dataToRender.Case_Studies.length > 0 && (
                        <div>
                            {renderSection("Case_Studies", "SECTION H: CASE STUDY QUESTIONS", dataToRender.Case_Studies)}
                        </div>
                    )}
                </div>

                {/* Answer Key */}
                {dataToRender.Answers && (
                    <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t-2 border-gray-800">
                        <h3 className="text-sm sm:text-base font-bold mb-4 sm:mb-6 underline">ANSWER KEY</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
                            {Object.entries(dataToRender.Answers).map(([key, value]) => {
                                try {
                                    return (
                                        <div key={key} className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold text-gray-700">Q{key}:</span>
                                                <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                                                    <MathRenderer content={value != null ? String(value) : ''} className="inline" />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                } catch (error) {
                                    console.error(`Error rendering answer ${key}:`, error, value)
                                    return (
                                        <div key={key} className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold text-gray-700">Q{key}:</span>
                                                <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                                                    Error rendering answer
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            })}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Shared Test Paper...</h2>
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
    const subject = userInputs.subject || "Test Paper"

    return (
        <>
            <Head>
                <title>{`Shared ${subject} Test Paper - AgentHub`}</title>
                <meta name="description" content={`View this ${subject} test paper created with AgentHub`} />
                <meta property="og:title" content={`Shared ${subject} Test Paper - AgentHub`} />
                <meta property="og:description" content={`View this ${subject} test paper created with AgentHub`} />
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
                    {/* <div className="bg-white border border-blue-200 text-gray-800 p-4 rounded-lg mb-4 sm:mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-medium flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    Shared {subject.charAt(0).toUpperCase() + subject.slice(1)} Test Paper
                                </h1>
                                <p className="text-xs text-gray-600">
                                    AI-generated test paper • Shared on {new Date(sharedData.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-xs text-blue-800">
                                <Info className="w-3 h-3 inline mr-1" />
                                This is a shared test paper. Create your own personalized test paper by visiting our homepage.
                            </p>
                        </div>
                    </div> */}

                    {/* Test Paper Content */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                Test Paper Content
                            </h2>
                            {sharedData.agent_outputs ? (
                                (() => {
                                    try {
                                        return renderTestPaperContent(sharedData.agent_outputs, userInputs)
                                    } catch (error) {
                                        console.error('Error rendering test paper content:', error)
                                        return (
                                            <div className="text-center py-6">
                                                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                                                <h3 className="text-base font-medium text-gray-900 mb-2">Error Rendering Content</h3>
                                                <p className="text-sm text-gray-600">There was an error displaying the test paper content. Please try refreshing the page.</p>
                                            </div>
                                        )
                                    }
                                })()
                            ) : (
                                <div className="text-center py-6">
                                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                                    <h3 className="text-base font-medium text-gray-900 mb-2">Test Paper Generated</h3>
                                    <p className="text-sm text-gray-600">Your personalized test paper is ready!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="mt-6 sm:mt-8 text-center">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                                Want Your Own Personalized Test Paper?
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Create custom test papers tailored to your curriculum, grade level, and requirements.
                            </p>
                            <Link href="/?scrollTo=agents">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Create My Test Paper
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SharedTestPaper
