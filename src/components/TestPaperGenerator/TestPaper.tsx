"use client"
import { useEffect, useRef, useState } from "react"
import type React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import axios from "axios"
import { Home, HistoryIcon } from "lucide-react"
import TestPaperForm from "./TestPaperForm"
import { Button } from "../ui/button"
import TestPaperResponse from "./TestPaperResponse"
import Link from "next/link"
import CreditsDisplay from "@/components/Content/CreditsDisplay"
import { RatingProvider } from "@/components/Content/RatingContext"
import TestPaperHistory from "./TestPaperHistory"
import TestPaperMobileHistory from "./MobileHistory"
import LogoImage from "@/assets/logo.jpeg"
import SupportButton from "../SupportBtn"
import ContactPopup from "../ContactPopup"
import { LessonPlannerLoader } from "../LessonPlanner/LessonPlannerLoader"

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

export default function TestPaperGeneratorScreen() {
    const pathname = usePathname()
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [agent, setAgent] = useState<Agent | null>(null)
    const [response, setResponse] = useState<any>(null)
    const [currentExecutionToken, setCurrentExecutionToken] = useState<string>("")
    const [currentagent_id, setCurrentagent_id] = useState<string>("")
    const formRef = useRef<any>(null)
    const justGeneratedExecutionRef = useRef<string>("")  // Track just-generated execution to prevent form overwrite
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
    const drawerRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const formattedResponseRef = useRef<HTMLDivElement>(null)
    const [formHeight, setFormHeight] = useState(0)
    const [responseHeight, setResponseHeight] = useState(0)
    const [currentFormDataForResponse, setCurrentFormDataForResponse] = useState<any>({}) // New state for response header
    const [currentMarksBreakdownForResponse, setCurrentMarksBreakdownForResponse] = useState<any>({}) // New state for marks breakdown
    const [showContactPopup, setShowContactPopup] = useState(false)
    const [showLoader, setShowLoader] = useState(true);
    const [generationCounter, setGenerationCounter] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [preventHistoryAutoSelect, setPreventHistoryAutoSelect] = useState(false);  // Prevent auto-select after generation

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (!loading) {
            // Delay hiding the loader by 3 seconds when loading becomes false
            timer = setTimeout(() => {
                setShowLoader(false);
            }, 1000);
        }

        return () => clearTimeout(timer);
    }, [loading]);

    useEffect(() => {
        fetchAgentData()
    }, [])

    // Measure form and response heights for history section
    useEffect(() => {
        const measureHeights = () => {
            const formElement = document.querySelector("[data-form-section]") as HTMLElement
            const responseElement = document.querySelector("[data-response-section]") as HTMLElement

            if (formElement) {
                setFormHeight(formElement.offsetHeight)
            }
            if (responseElement) {
                setResponseHeight(responseElement.offsetHeight)
            }
        }

        measureHeights()
        window.addEventListener("resize", measureHeights)

        // Use ResizeObserver for better height tracking
        const resizeObserver = new ResizeObserver(measureHeights)
        const formElement = document.querySelector("[data-form-section]")
        const responseElement = document.querySelector("[data-response-section]")

        if (formElement) resizeObserver.observe(formElement)
        if (responseElement) resizeObserver.observe(responseElement)

        return () => {
            window.removeEventListener("resize", measureHeights)
            resizeObserver.disconnect()
        }
    }, [response])

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

    const handleHistoryItemClick = async (execution_id: string, agent_id: string, skipFormLoad: boolean = false) => {
        try {
            setIsLoadingHistory(true)
            setResponse(null)
            
            // Check if this execution was just generated (should not overwrite form)
            const isJustGenerated = execution_id === justGeneratedExecutionRef.current
            console.log('handleHistoryItemClick:', { 
                execution_id, 
                justGenerated: justGeneratedExecutionRef.current, 
                isJustGenerated 
            });
            
            // If user manually clicks a different history item, allow future auto-selects
            if (!isJustGenerated && !skipFormLoad) {
                justGeneratedExecutionRef.current = "";
                setPreventHistoryAutoSelect(false);  // Allow auto-select for future history browsing
                console.log('User clicked different history item, cleared just-generated flag');
            }
            
            setCurrentExecutionToken(execution_id)
            setCurrentagent_id(agent_id)
            const response = await fetch(`/api/get-agent-history/${execution_id}?agent_id=${agent_id}`)
            if (!response.ok) {
                throw new Error("Failed to fetch history")
            }
            const apiResponse = await response.json()
            if (!apiResponse.status) {
                throw new Error(apiResponse.message || "Failed to fetch history data")
            }
            const data = apiResponse.data
            
            // Only load form data if this is NOT the just-generated execution
            // This prevents the history auto-select from overwriting the current form values
            const shouldLoadFormData = !skipFormLoad && 
                                      !isJustGenerated && 
                                      data.user_inputs && 
                                      formRef.current?.loadHistoryData
            
            if (shouldLoadFormData) {
                let threadId = null;
                if (data.thread_id) {
                    threadId = data.thread_id;
                } else if (data.user_inputs.find((input: any) => input.variable === 'thread_id')) {
                    threadId = data.user_inputs.find((input: any) => input.variable === 'thread_id')?.variable_value;
                }
                let inputsToLoad = data.user_inputs;
                if (threadId && !inputsToLoad.some((x: any) => x.variable === 'thread_id')) {
                    // Ensure thread_id is present in user_inputs for loadHistoryData
                    inputsToLoad = [...data.user_inputs, { variable: 'thread_id', variable_value: threadId }];
                }
                console.log('✅ Loading historical form data for execution:', execution_id);
                await formRef.current.loadHistoryData(inputsToLoad, data.file_data)
                // Capture both form data and marks breakdown for historical view
                if (formRef.current?.formData) {
                    setCurrentFormDataForResponse(formRef.current.formData)
                }
                if (formRef.current?.marksBreakdown) {
                    setCurrentMarksBreakdownForResponse(formRef.current.marksBreakdown)
                }
            } else {
                console.log('⏭️ Skipping form data load for just-generated execution:', execution_id);
                // For just-generated execution, keep the form as-is (user's current input)
            }
            
            if (data.agent_outputs) {
                const formattedOutputs = formatAgentOutputs(data.agent_outputs)
                setResponse({
                    data: formattedOutputs,
                    loading: false,
                    historicalRating: data.response_rating !== undefined ? data.response_rating : data.agent_rating,
                    historicalFeedback: data.response_feedback !== undefined ? data.response_feedback : data.agent_feedback,
                })
            }
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

    const handleFormResponse = (res: any) => {
        console.log('handleFormResponse received', res);

        // Case 1: Explicit clear request (from createNew)
        if (res === null) {
            console.log('TestPaper: Clearing all response state');
            setResponse(null);
            setCurrentExecutionToken("");
            setCurrentagent_id("");
            setCurrentFormDataForResponse(null);
            setCurrentMarksBreakdownForResponse(null);
            justGeneratedExecutionRef.current = "";  // Clear just-generated flag
            setPreventHistoryAutoSelect(false);  // Allow auto-select for history browsing
            setIsGenerating(false);
            setGenerationCounter(prev => prev + 1);
            return;
        }

        // Case 2: Start of new generation (loading state)
        if (res.loading) {
            console.log('TestPaper: Starting new generation - clearing old data');
            
            // Clear old response data
            setResponse(null);
            setCurrentExecutionToken("");
            setCurrentagent_id("");
            setCurrentFormDataForResponse(null);
            setCurrentMarksBreakdownForResponse(null);
            justGeneratedExecutionRef.current = "";  // Clear just-generated flag for new generation
            setPreventHistoryAutoSelect(true);  // PREVENT auto-select for fresh generation
            setIsGenerating(true);
            setGenerationCounter(prev => prev + 1);
            return;
        }

        // Case 3: Generation complete - new data received
        if (res.data) {
            console.log('TestPaper: Received new response data with form config', res.formData);

            const formattedNewResponse = formatAgentOutputs(res.data);

            // Set execution identifiers first
            if (res.execution_id) {
                setCurrentExecutionToken(res.execution_id);
                // Mark this execution as just generated - prevents history auto-select from overwriting form
                justGeneratedExecutionRef.current = res.execution_id;
                console.log('TestPaper: Marked execution as just generated:', res.execution_id);
            }
            if (res.agent_id) setCurrentagent_id(res.agent_id);

            // Use form data from response (captured at submission time)
            // This ensures we use the exact configuration that was submitted
            if (res.formData) {
                console.log('TestPaper: Using form data from response:', res.formData);
                setCurrentFormDataForResponse(res.formData);
            } else if (formRef.current?.formData) {
                // Fallback to ref if not provided (for backward compatibility)
                console.log('TestPaper: Fallback - using form data from ref');
                setCurrentFormDataForResponse(formRef.current.formData);
            }
            
            if (res.marksBreakdown) {
                setCurrentMarksBreakdownForResponse(res.marksBreakdown);
            } else if (formRef.current?.marksBreakdown) {
                setCurrentMarksBreakdownForResponse(formRef.current.marksBreakdown);
            }

            // Set the new response data
            setResponse({
                data: formattedNewResponse,
                loading: false,
                historicalRating: null,
                historicalFeedback: null
            });

            // Update generation counter and refresh history
            setGenerationCounter(prev => prev + 1);
            setRefreshTrigger(prev => prev + 1);
            setIsGenerating(false);
        }
    };

    const handleSaveComplete = (updatedData: any) => {
        setResponse((prev: any) => ({
            ...prev,
            data: updatedData,
        }))
        // Refresh history after successful save/edit
        setRefreshTrigger(prev => prev + 1)
    }

    if (loading || showLoader) {
        return (
            <main className="flex flex-col items-center justify-center h-screen w-screen">
                <h2 className="text-xl font-semibold text-gray-700 mb-6">Test Paper Generator</h2>
                <LessonPlannerLoader />
                <p className="text-gray-500 text-sm mt-4 text-center">
                    Generate Test Papers...
                </p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="relative min-h-screen bg-gray-50">
                <div className="flex items-center justify-center h-screen p-4">
                    <div className="text-center">
                        <div className="text-red-600 text-lg sm:text-xl mb-4">Error</div>
                        <p className="text-sm sm:text-base text-gray-600">{error}</p>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="relative min-h-screen bg-gray-50">
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
                            <TestPaperMobileHistory
                                onHistoryItemClick={handleHistoryItemClick}
                                refreshTrigger={refreshTrigger}
                                onItemSelect={handleMobileHistoryItemSelect}
                                preventAutoSelect={preventHistoryAutoSelect}
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
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
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
                                <TestPaperHistory
                                    onHistoryItemClick={handleHistoryItemClick}
                                    containerRef={formattedResponseRef}
                                    refreshTrigger={refreshTrigger}
                                    formHeight={formHeight}
                                    responseHeight={responseHeight}
                                    onCreateNew={() => formRef.current?.createNew?.()}
                                    selectedExecutionId={currentExecutionToken}
                                    preventAutoSelect={preventHistoryAutoSelect}
                                />
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 min-w-0">
                            {/* Form Section */}
                            <div data-form-section className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
                                {agent && (
                                    <TestPaperForm
                                        ref={formRef}
                                        agentData={agent}
                                        onResponse={handleFormResponse}
                                        Detailed_description={agent.Detailed_description}
                                    />
                                )}
                            </div>

                            {/* Response Section */}
                            <div data-response-section ref={formattedResponseRef} className="w-full">
                                {isGenerating ? (
                                    <TestPaperResponse 
                                        key={`loading-${generationCounter}`}
                                        isGenerating={true} 
                                        response={{}}
                                        currentFormData={formRef.current?.formData}
                                        currentMarksBreakdown={formRef.current?.marksBreakdown}
                                    />
                                ) : response?.data ? (
                                    <TestPaperResponse
                                        key={`response-${generationCounter}-${currentExecutionToken}`}
                                        response={response}
                                        executionToken={currentExecutionToken}
                                        agent_id={currentagent_id}
                                        onSave={handleSaveComplete}
                                        formRef={formRef}
                                        historicalRating={response.historicalRating}
                                        historicalFeedback={response.historicalFeedback}
                                        isHistoricalView={!!response.historicalRating || !!response.historicalFeedback}
                                        isGenerating={false}
                                        currentFormData={currentFormDataForResponse || formRef.current?.formData}
                                        currentMarksBreakdown={currentMarksBreakdownForResponse || formRef.current?.marksBreakdown}
                                    />
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </RatingProvider>
            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="support" />
        </main>
    )
}