"use client"
import Image from "next/image"
import LogoImage from "@/assets/logo.jpeg"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import axios from "axios"
import { HistoryIcon, Home, FileText } from "lucide-react"
import DynamicResumeScorerForm from "./ResumeScorerForm"
import { Button } from "../ui/button"
import FormattedResumeScorerResponse from "./ResumeScorerResponse"
import ResumeScorerHistorySidebar from "./ResumeScorerHistory"
import MobileResumeScorerHistorySidebar from "./MobileHistoryComponent"
import Link from "next/link"
import CreditsDisplay from "@/components/Content/CreditsDisplay"
import { RatingProvider } from "@/components/Content/RatingContext"
import SupportButton from "../SupportBtn"
import ContactPopup from "../ContactPopup"
import { ResumeScorerLoader } from "./ResumeScorerLoader"

interface AgentInput {
    variable: string
    datatype: string
    variable_description: string
    Required: boolean
}

interface Agent {
    agent_id?: string
    agent_Name: string
    agent_description: string
    Detailed_description?: string
    agent_Inputs: AgentInput[]
    agent_Type: string
    agent_endpoint?: string
    execution_credit?: string
    http_method?: string
    file_input?: boolean
    agent_rating?: number
    execution_count?: number
    createdAt?: string
    updatedAt?: string
}

export default function ResumeScorerScreen() {
    const pathname = usePathname()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [agent, setAgent] = useState<Agent | null>(null)
    const [response, setResponse] = useState<any>(null)
    const [fileName, setFileName] = useState<any>(null)
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [currentExecutionToken, setCurrentExecutionToken] = useState<string>("")
    const [currentagent_id, setCurrentagent_id] = useState<string>("")
    const [currentCandidateName, setCurrentCandidateName] = useState<string | null>(null)
    const formRef = useRef<any>(null)
    const formattedResponseRef = useRef<HTMLDivElement>(null)
    const [historicalRating, setHistoricalRating] = useState<number | null>(null)
    const [historicalFeedback, setHistoricalFeedback] = useState<string | null>(null)
    const [isHistoricalView, setIsHistoricalView] = useState<boolean>(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [showDownload, setShowDownload] = useState(false)
    const [downloadableResponse, setDownloadableResponse] = useState<any>(null)
    const [showContactPopup, setShowContactPopup] = useState(false)

    // Mobile drawer state
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
    const drawerRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const [showLoader, setShowLoader] = useState(true)

    useEffect(() => {
        let timer: NodeJS.Timeout

        if (!loading) {
            // Delay hiding the loader by 2 seconds when loading becomes false
            timer = setTimeout(() => {
                setShowLoader(false)
            }, 1000)
        }

        return () => clearTimeout(timer)
    }, [loading])

    const handleHistoryItemClick = async (execution_id: string, agent_id: string) => {
        try {
            setIsLoadingHistory(true)
            setResponse(null)
            setHistoricalRating(null)
            setHistoricalFeedback(null)
            setCurrentCandidateName(null)

            setCurrentExecutionToken(execution_id)
            setCurrentagent_id(agent_id)
            setIsHistoricalView(true)

            const response = await fetch(`/api/get-agent-history/${execution_id}?agent_id=${agent_id}`)

            if (!response.ok) {
                throw new Error("Failed to fetch history")
            }

            const apiResponse = await response.json()

            if (!apiResponse.status) {
                throw new Error(apiResponse.message || "Failed to fetch history data")
            }

            const data = apiResponse.data

            // Extract candidate name from historical data
            let candidateName = null
            if (data.user_inputs) {
                // Look for candidate name or similar field
                const nameInput = data.user_inputs.find((input: any) =>
                    input.variable.toLowerCase().includes('name') ||
                    input.variable.toLowerCase().includes('candidate') ||
                    input.variable.toLowerCase().includes('applicant')
                )
                if (nameInput) {
                    candidateName = nameInput.variable_value
                }
            }
            setCurrentCandidateName(candidateName)

            // Process historical inputs
            let inputsToLoad = null
            if (data.user_inputs) {
                inputsToLoad = data.user_inputs
            } else if (data.Agent_inputs && Array.isArray(data.Agent_inputs)) {
                inputsToLoad = data.Agent_inputs
            } else if (data.inputs) {
                inputsToLoad = data.inputs
            } else if (data.execution_data?.user_inputs) {
                inputsToLoad = data.execution_data.user_inputs
            }

            if (inputsToLoad && formRef.current?.loadHistoryData) {
                // Extract thread_id if available
                let threadId = null;
                if (data.thread_id) {
                    threadId = data.thread_id;
                } else if (inputsToLoad.find((input: any) => input.variable === 'thread_id')) {
                    threadId = inputsToLoad.find((input: any) => input.variable === 'thread_id')?.variable_value;
                }

                // Add thread_id to inputs if found
                if (threadId) {
                    inputsToLoad = [...inputsToLoad, { variable: 'thread_id', variable_value: threadId }];
                }

                formRef.current.loadHistoryData(inputsToLoad, data.file_data)

                // Force update after a short delay
                setTimeout(() => {
                    if (formRef.current?.forceUpdate) {
                        formRef.current.forceUpdate()
                    }
                }, 100)
            } else {
                console.warn("No valid input data found in history response")
                console.log("Available keys in data:", Object.keys(data))
            }

            // Process agent outputs
            if (data.agent_outputs) {
                const formattedOutputs = formatAgentOutputs(data.agent_outputs)

                setResponse({
                    data: formattedOutputs,
                    loading: false,
                })

                setShowDownload(true)
                setDownloadableResponse(formattedOutputs[0] || formattedOutputs)

                if (formRef.current?.updateLastApiResponse) {
                    formRef.current.updateLastApiResponse(formattedOutputs)
                }
            }

            // Set filename based on resume or candidate data
            if (data.file_data && data.file_data.length > 0) {
                const fileKey = data.file_data[0].file_key
                if (fileKey) {
                    const parts = fileKey.split("_")
                    if (parts.length >= 3) {
                        setFileName(parts.slice(2).join("_"))
                    } else {
                        setFileName("historical_resume")
                    }
                } else {
                    setFileName("historical_resume")
                }
            } else {
                setFileName(candidateName || "resume_analysis")
            }

            setHistoricalRating(data.response_rating || null)
            setHistoricalFeedback(data.response_feedback || null)
        } catch (error) {
            console.error("Error loading history:", error)
            setError("Failed to load history item")
        } finally {
            setIsLoadingHistory(false)
        }
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            setIsMobileDrawerOpen(false)
        }
    }

    const handleHistoryButtonClick = () => {
        if ("vibrate" in navigator) {
            navigator.vibrate(50)
        }
        setIsMobileDrawerOpen(true)
    }

    const handleMobileHistoryItemSelect = () => {
        setIsMobileDrawerOpen(false)
    }

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isMobileDrawerOpen) {
                setIsMobileDrawerOpen(false)
            }
        }

        if (isMobileDrawerOpen) {
            document.addEventListener("keydown", handleEscape)
            document.body.style.overflow = "hidden"
            document.body.style.position = "fixed"
            document.body.style.width = "100%"
            document.body.style.top = `-${window.scrollY}px`
        } else {
            document.removeEventListener("keydown", handleEscape)
            const scrollY = document.body.style.top
            document.body.style.overflow = ""
            document.body.style.position = ""
            document.body.style.width = ""
            document.body.style.top = ""
            if (scrollY) {
                window.scrollTo(0, Number.parseInt(scrollY || "0") * -1)
            }
        }

        return () => {
            document.removeEventListener("keydown", handleEscape)
            document.body.style.overflow = ""
            document.body.style.position = ""
            document.body.style.width = ""
            document.body.style.top = ""
        }
    }, [isMobileDrawerOpen])

    const formatAgentOutputs = (agentOutputs: any) => {
        if (!agentOutputs) return []

        if (Array.isArray(agentOutputs)) {
            return agentOutputs
        }

        const formattedOutput: any = {}

        Object.keys(agentOutputs).forEach((key) => {
            formattedOutput[key] = agentOutputs[key]
        })

        if (agentOutputs.gpt_tasks) {
            if (agentOutputs.gpt_tasks.content) {
                formattedOutput.content = agentOutputs.gpt_tasks.content
            }

            formattedOutput.gpt_tasks = agentOutputs.gpt_tasks

            if (agentOutputs.gpt_tasks.response_metadata) {
                formattedOutput.response_metadata = agentOutputs.gpt_tasks.response
            }

            if (agentOutputs.gpt_tasks.usage_metadata) {
                formattedOutput.usage_metadata = agentOutputs.gpt_tasks.usage_metadata
            }
        }

        return [formattedOutput]
    }

    useEffect(() => {
        fetchAgentData()
    }, [])

    const fetchAgentData = async () => {
        const pathArray = pathname ? pathname.split("/") : []
        const agent_id = pathArray[pathArray.length - 1]

        if (!agent_id) {
            setError("Agent token not provided in the URL")
            setLoading(false)
            return
        }

        try {
            const response = await axios.get<{
                status: boolean
                message: string
                data: Agent | null
            }>(`/api/get-agent-details/${agent_id}`)

            if (response.data.status && response.data.data) {
                const fetchedData: Agent = {
                    ...response.data.data,
                    execution_credit:
                        response.data.data.execution_credit !== undefined ? String(response.data.data.execution_credit) : undefined,
                }
                setAgent(fetchedData)
            } else {
                console.error("API returned null data or status false")
                setError(`Agent not found or inaccessible. Status: ${response.data.status}, Message: ${response.data.message}`)
            }
        } catch (error) {
            console.error("Error fetching agent data:", error)
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    setError("Authentication failed. Please log in again.")
                } else if (error.response?.status === 404) {
                    setError("Agent not found. Please check the URL.")
                } else if (error.response?.status === 400) {
                    setError("Invalid agent ID format. Please check the URL.")
                } else {
                    setError(`API Error: ${error.response?.status} - ${error.response?.statusText || "Unknown error"}`)
                }
            } else {
                setError("Network error occurred while fetching agent data.")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSaveComplete = (updatedData: any) => {
        const updatedFirstItem = Array.isArray(updatedData) ? updatedData[0] : updatedData

        setResponse((prev: any) => ({
            ...prev,
            data: updatedData,
        }))

        setDownloadableResponse(updatedFirstItem)

        if (formRef.current) {
            formRef.current.updateLastApiResponse(updatedFirstItem)
        }
    }

    const handleFormResponse = (res: any) => {
        if (res === null) {
            // Reset case - clear everything
            setResponse(null);
            setShowDownload(false);
            setDownloadableResponse(null);
            setCurrentExecutionToken('');
            setCurrentagent_id('');
            setCurrentCandidateName(null);
            setHistoricalRating(null);
            setHistoricalFeedback(null);
            setIsHistoricalView(false);
            return;
        }

        if (res.loading) {
            setResponse({ data: null, loading: true })
            setShowDownload(false)
        } else {
            setResponse({ data: res.data, loading: false })
            setShowDownload(true)
            setDownloadableResponse(res.data[0])

            if (res.execution_id) {
                setCurrentExecutionToken(res.execution_id)
            }
            if (res.agent_id) {
                setCurrentagent_id(res.agent_id)
            }

            // Set candidate name from form response
            if (res.candidateName) {
                setCurrentCandidateName(res.candidateName)
                setFileName(res.candidateName)
            }

            setRefreshTrigger((prev) => prev + 1)
            setHistoricalRating(null)
            setHistoricalFeedback(null)
            setIsHistoricalView(false)
        }
    }

    if (loading || showLoader) {
        return (
            <main className="flex flex-col items-center justify-center h-screen w-screen bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="flex items-center gap-3 mb-6">
                    {/* <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                    </div> */}
                    <h2 className="text-xl font-semibold text-gray-700">Resume Scorer</h2>
                </div>
                <ResumeScorerLoader />
                <p className="text-gray-500 text-sm mt-4 text-center">
                    Analyzing Your Resumes...
                </p>
            </main>
        )
    }

    if (error) {
        return (
            <main className="relative min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="flex items-center justify-center h-screen p-4">
                    <div className="text-center bg-white rounded-xl p-8 shadow-lg border border-indigo-200">
                        <div className="text-red-600 text-lg sm:text-xl mb-4 flex items-center justify-center gap-2">
                            <FileText className="w-6 h-6" />
                            Error
                        </div>
                        <p className="text-sm sm:text-base text-gray-600">{error}</p>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="relative min-h-screen bg-white">
            {/* Mobile History Drawer */}
            {isMobileDrawerOpen && (
                <div
                    ref={overlayRef}
                    className={`fixed inset-0 z-[65] md:hidden transition-all duration-300 ease-out ${isMobileDrawerOpen ? "opacity-100" : "opacity-0"
                        }`}
                    style={{
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        background: "rgba(0, 0, 0, 0.4)",
                    }}
                    onClick={handleOverlayClick}
                >
                    <div
                        ref={drawerRef}
                        className={`fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out ${isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
                            }`}
                        style={{
                            borderTopRightRadius: "16px",
                            borderBottomRightRadius: "16px",
                        }}
                    >
                        <div className="h-full pt-2">
                            <MobileResumeScorerHistorySidebar
                                onHistoryItemClick={handleHistoryItemClick}
                                refreshTrigger={refreshTrigger}
                                onItemSelect={handleMobileHistoryItemSelect}
                                selectedExecutionId={currentExecutionToken}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile History Button */}
            <button
                onClick={handleHistoryButtonClick}
                className={`fixed left-4 bottom-6 z-40 md:hidden
                    bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 sm:p-4 rounded-full shadow-xl
                    hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 ease-out
                    hover:scale-110 active:scale-95 hover:shadow-2xl
                    ${isMobileDrawerOpen ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100"}
                    transform border-2 border-white/20
                `}
                aria-label="Open History"
            >
                <HistoryIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Header */}
            <header className="bg-white border-b border-indigo-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-2 xs:py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 xs:gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <Image
                                    src={LogoImage || "/placeholder.svg"}
                                    alt="logo"
                                    className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded-md"
                                />
                                <div className="flex flex-col">
                                    <Link href='/'>
                                        <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">AgentHub</span>
                                    </Link>
                                    <span className="text-xs sm:text-xs text-gray-500 leading-none">
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
                        </div>
                        <div className="flex items-center gap-1 xs:gap-2 sm:gap-6 flex-shrink-0">
                            <CreditsDisplay
                                className="relative top-0 right-0 text-xs xs:text-xs sm:text-sm"
                                refreshInterval={5 * 60 * 1000}
                            />
                            <SupportButton
                                onClick={() => setShowContactPopup(true)}
                                className="text-indigo-600 hover:text-indigo-900 border-indigo-200 hover:border-indigo-300"
                            />
                            <Link href="/">
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white
                                h-7 xs:h-8 sm:h-9 text-xs xs:text-xs sm:text-sm 
                                px-2 xs:px-2 sm:px-4 rounded-md"
                                >
                                    <Home className="h-3 w-3 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-0 xs:mr-0 sm:mr-1" />
                                    <span className="hidden xs:hidden sm:inline">Home</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <RatingProvider>
                <div className="max-w-7xl mx-auto p-3 sm:p-4">
                    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                        {/* History Sidebar - Hidden on mobile, visible on desktop */}
                        <div className="hidden lg:block lg:w-72 flex-shrink-0">
                            <div className="sticky top-24">
                                <ResumeScorerHistorySidebar
                                    onHistoryItemClick={handleHistoryItemClick}
                                    containerRef={formattedResponseRef}
                                    refreshTrigger={refreshTrigger}
                                    onCreateNew={() => formRef.current?.createNew?.()}
                                    selectedExecutionId={currentExecutionToken}
                                />
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 min-w-0">
                            {/* Form Section */}
                            <div className="bg-white rounded-xl shadow-sm border border-indigo-200 mb-4 sm:mb-6">
                                {agent && (
                                    <DynamicResumeScorerForm
                                        ref={formRef}
                                        agentData={agent}
                                        onResponse={handleFormResponse}
                                        detailedDescription={agent.Detailed_description}
                                    />
                                )}
                            </div>

                            {/* Response Section */}
                            <div ref={formattedResponseRef} className="w-full">
                                {response && (
                                    <FormattedResumeScorerResponse
                                        key={`formatted-response-${currentExecutionToken || "new"}`}
                                        response={response}
                                        executionToken={currentExecutionToken}
                                        agent_id={currentagent_id}
                                        onSave={handleSaveComplete}
                                        formRef={formRef}
                                        historicalRating={historicalRating}
                                        historicalFeedback={historicalFeedback}
                                        isHistoricalView={isHistoricalView}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </RatingProvider>
            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
        </main>
    )
}