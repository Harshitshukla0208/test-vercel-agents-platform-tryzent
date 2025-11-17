import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { HomeIcon, HistoryIcon, X } from "lucide-react";
import DynamicAgentForm from "./FormSection";
import logo from "../../assets/logo.jpeg";
import { Button } from "../ui/button";
import FormattedResponse from "./FormattedResponse";
import HistorySidebar from "./HistorySection";
import MobileHistorySidebar from "./MobileHistorySidebar"; // Import the new mobile sidebar
import Link from "next/link";
import CreditsDisplay from "./CreditsDisplay";
import dynamic from "next/dynamic";
import animation from '../../assets/Animation - 1739630018837.json'
import DownloadSection from "./DownloadSection";
import { RatingProvider } from "./RatingContext";

interface AgentInput {
    variable: string;
    datatype: string;
    variable_description: string;
    Required: boolean;
}

interface Agent {
    agent_id?: string;
    agent_Name: string;
    agent_description: string;
    agent_Inputs: AgentInput[];
    agent_Type: string;
    agent_endpoint?: string;
    execution_credit?: string;
    http_method?: string;
    file_input?: boolean;
    agent_rating?: number;
    execution_count?: number;
    createdAt?: string;
    updatedAt?: string;
}

export default function Screen1() {
    const pathname = usePathname();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [agent, setAgent] = useState<Agent | null>(null);
    const [response, setResponse] = useState<any>(null);
    const [fileName, setFileName] = useState<any>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [currentExecutionToken, setCurrentExecutionToken] = useState<string>('');
    const [currentagent_id, setCurrentagent_id] = useState<string>('');
    const formRef = useRef<any>(null);
    const formattedResponseRef = useRef<HTMLDivElement>(null);
    const [historicalRating, setHistoricalRating] = useState<number | null>(null);
    const [historicalFeedback, setHistoricalFeedback] = useState<string | null>(null);
    const [isHistoricalView, setIsHistoricalView] = useState<boolean>(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showDownload, setShowDownload] = useState(false);
    const [downloadableResponse, setDownloadableResponse] = useState<any>(null);

    // Mobile drawer state
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleHistoryItemClick = async (execution_id: string, agent_id: string) => {
        try {
            // Reset states first before loading new data
            setIsLoadingHistory(true);
            setResponse(null);
            setHistoricalRating(null);
            setHistoricalFeedback(null);

            // Set new tokens
            setCurrentExecutionToken(execution_id);
            setCurrentagent_id(agent_id);
            setIsHistoricalView(true);

            const response = await fetch(`/api/get-agent-history/${execution_id}?agent_id=${agent_id}`);

            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }

            const apiResponse = await response.json();

            if (!apiResponse.status) {
                throw new Error(apiResponse.message || 'Failed to fetch history data');
            }

            const data = apiResponse.data;

            // Process historical inputs
            if (formRef.current?.loadHistoryData) {
                let inputsToLoad = null;

                if (data.user_inputs) {
                    inputsToLoad = data.user_inputs;
                }
                else if (data.Agent_inputs && Array.isArray(data.Agent_inputs)) {
                    inputsToLoad = data.Agent_inputs;
                }
                else if (data.inputs) {
                    inputsToLoad = data.inputs;
                }
                else if (data.execution_data?.user_inputs) {
                    inputsToLoad = data.execution_data.user_inputs;
                }

                if (inputsToLoad) {
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

                    formRef.current.loadHistoryData(inputsToLoad, data.file_data);
                    // Force re-render by triggering a small delay
                    setTimeout(() => {
                        if (formRef.current?.forceUpdate) {
                            formRef.current.forceUpdate();
                        }
                    }, 100);
                } else {
                    console.warn('No valid input data found in history response');
                    console.log('Available keys in data:', Object.keys(data));
                }
            } else {
                console.error('Form ref or loadHistoryData method not available');
            }

            // Handle agent outputs
            if (data.agent_outputs) {
                const formattedOutputs = formatAgentOutputs(data.agent_outputs);

                setResponse({
                    data: formattedOutputs,
                    loading: false
                });

                setShowDownload(true);
                setDownloadableResponse(formattedOutputs[0] || formattedOutputs);

                if (formRef.current?.updateLastApiResponse) {
                    formRef.current.updateLastApiResponse(formattedOutputs);
                }
            }

            // Set filename - prioritize actual file name from file_data
            if (data.file_data && data.file_data.length > 0) {
                // Extract filename from file_key or use a default
                const fileKey = data.file_data[0].file_key;
                if (fileKey) {
                    // Extract filename from the file_key (format: userId/_hash_filename)
                    const parts = fileKey.split('_');
                    if (parts.length >= 3) {
                        setFileName(parts.slice(2).join('_')); // Join back in case filename has underscores
                    } else {
                        setFileName('historical_file');
                    }
                } else {
                    setFileName('historical_file');
                }
            } else {
                setFileName('historical_response');
            }

            // Store rating & feedback
            setHistoricalRating(data.response_rating || null);
            setHistoricalFeedback(data.response_feedback || null);
        } catch (error) {
            console.error('Error loading history:', error);
            setError('Failed to load history item');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Enhanced overlay click handler with better UX
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            setIsMobileDrawerOpen(false);
        }
    };

    // Enhanced history button click with haptic feedback
    const handleHistoryButtonClick = () => {
        // Haptic feedback for supported devices
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
        setIsMobileDrawerOpen(true);
    };

    // Close mobile drawer when history item is selected
    const handleMobileHistoryItemSelect = () => {
        setIsMobileDrawerOpen(false);
    };

    // Enhanced escape key handler and body scroll prevention
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMobileDrawerOpen) {
                setIsMobileDrawerOpen(false);
            }
        };

        if (isMobileDrawerOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent scrolling on the background
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = `-${window.scrollY}px`;
        } else {
            document.removeEventListener('keydown', handleEscape);
            // Restore scrolling
            const scrollY = document.body.style.top;
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
        };
    }, [isMobileDrawerOpen]);

    // Helper function to format agent_outputs object into expected array structure
    const formatAgentOutputs = (agentOutputs: any) => {
        if (!agentOutputs) return [];

        // If it's already an array, return as is
        if (Array.isArray(agentOutputs)) {
            return agentOutputs;
        }

        // Handle the specific structure from your API response
        const formattedOutput: any = {};

        // Include all properties from agent_outputs
        Object.keys(agentOutputs).forEach(key => {
            formattedOutput[key] = agentOutputs[key];
        });

        // Handle gpt_tasks specifically if it exists
        if (agentOutputs.gpt_tasks) {
            // Extract the content from gpt_tasks
            if (agentOutputs.gpt_tasks.content) {
                formattedOutput.content = agentOutputs.gpt_tasks.content;
            }

            // Keep the full gpt_tasks object for reference
            formattedOutput.gpt_tasks = agentOutputs.gpt_tasks;

            // Handle additional metadata from gpt_tasks
            if (agentOutputs.gpt_tasks.response_metadata) {
                formattedOutput.response_metadata = agentOutputs.gpt_tasks.response_metadata;
            }

            if (agentOutputs.gpt_tasks.usage_metadata) {
                formattedOutput.usage_metadata = agentOutputs.gpt_tasks.usage_metadata;
            }
        }

        // Handle other specific fields from your API response
        if (agentOutputs.audio_url) {
            formattedOutput.audio_url = agentOutputs.audio_url;
        }

        if (agentOutputs.transcription) {
            formattedOutput.transcription = agentOutputs.transcription;
        }

        return [formattedOutput];
    };

    useEffect(() => {
        fetchAgentData();
    }, []);

    const fetchAgentData = async () => {
        const pathArray = pathname ? pathname.split('/') : [];
        const agent_id = pathArray[pathArray.length - 1];

        if (!agent_id) {
            setError('Agent token not provided in the URL');
            setLoading(false);
            return;
        }

        try {
            // Updated API endpoint to match your backend (removed 's' from agents)
            const response = await axios.get<{
                status: boolean;
                message: string;
                data: Agent | null;
            }>(`/api/get-agent-details/${agent_id}`);

            if (response.data.status && response.data.data) {
                // Ensure execution_credit is always a string to match FormSection expectations
                const fetchedData: Agent = {
                    ...response.data.data,
                    execution_credit: response.data.data.execution_credit !== undefined
                        ? String(response.data.data.execution_credit)
                        : undefined
                };
                setAgent(fetchedData);
            } else {
                console.error("API returned null data or status false");
                setError(`Agent not found or inaccessible. Status: ${response.data.status}, Message: ${response.data.message}`);
            }

        } catch (error) {
            console.error("Error fetching agent data:", error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    setError("Authentication failed. Please log in again.");
                } else if (error.response?.status === 404) {
                    setError("Agent not found. Please check the URL.");
                } else if (error.response?.status === 400) {
                    setError("Invalid agent ID format. Please check the URL.");
                } else {
                    setError(`API Error: ${error.response?.status} - ${error.response?.statusText || 'Unknown error'}`);
                }
            } else {
                setError("Network error occurred while fetching agent data.");
            }
        } finally {
            setLoading(false);
        }
    }

    const handleSaveComplete = (updatedData: any) => {
        const updatedFirstItem = Array.isArray(updatedData) ? updatedData[0] : updatedData;

        setResponse((prev: any) => ({
            ...prev,
            data: updatedData
        }));

        setDownloadableResponse(updatedFirstItem);

        if (formRef.current) {
            formRef.current.updateLastApiResponse(updatedFirstItem);
        }
    };

    // Handler for new form submissions
    const handleFormResponse = (res: any) => {
        if (res === null) {
            // Reset case - clear everything
            setResponse(null);
            setShowDownload(false);
            setDownloadableResponse(null);
            setCurrentExecutionToken('');
            setCurrentagent_id('');
            setHistoricalRating(null);
            setHistoricalFeedback(null);
            setIsHistoricalView(false);
            return;
        }
        
        if (res.loading) {
            setResponse({ data: null, loading: true });
            setShowDownload(false); // Hide the download section while loading
        } else {
            setResponse({ data: res.data, loading: false });
            setShowDownload(true); // Show the download section when response appears
            setDownloadableResponse(res.data[0]);

            if (res.execution_id) {
                setCurrentExecutionToken(res.execution_id);
            }
            if (res.agent_id) {
                setCurrentagent_id(res.agent_id);
            }

            setRefreshTrigger(prev => prev + 1);
            setHistoricalRating(null);
            setHistoricalFeedback(null);
            setIsHistoricalView(false);
        }
    };

    // Add loading state display
    if (loading) {
        return (
            <main className="relative min-h-screen bg-white">
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#7c3aed]"></div>
                        <p className="mt-4 text-gray-600">Loading agent data...</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen bg-white">
            {/* Custom Styles */}
            <style jsx>{`
                /* Mobile-optimized backdrop blur */
                .mobile-drawer-backdrop {
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    background: rgba(0, 0, 0, 0.4);
                }
                
                /* Mobile drawer content with smooth scrolling */
                .mobile-drawer-content {
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                    touch-action: pan-y;
                }
                
                /* Enhanced button animations */
                @keyframes mobile-pulse-glow {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.6);
                    }
                    50% {
                        box-shadow: 0 0 0 12px rgba(124, 58, 237, 0);
                    }
                }
                
                .mobile-history-btn-pulse {
                    animation: mobile-pulse-glow 2.5s infinite;
                }
                
                /* Prevent text selection during drawer interactions */
                .drawer-no-select {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                }
            `}</style>

            {/* Mobile History Drawer - Completely redesigned for mobile */}
            {isMobileDrawerOpen && (
                <div
                    ref={overlayRef}
                    className={`fixed inset-0 z-[65] md:hidden transition-all duration-300 ease-out mobile-drawer-backdrop ${
                        isMobileDrawerOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={handleOverlayClick}
                >
                    <div
                        ref={drawerRef}
                        className={`fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out mobile-drawer-content ${
                            isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                        style={{
                            borderTopRightRadius: '16px',
                            borderBottomRightRadius: '16px'
                        }}
                    >
                        {/* Close button - positioned absolutely for better UX */}
                        {/* <button
                            onClick={() => setIsMobileDrawerOpen(false)}
                            className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors bg-white shadow-sm border border-gray-200"
                            aria-label="Close History"
                        >
                            <X className="h-5 w-5 text-gray-600" />
                        </button> */}

                        {/* Mobile History Sidebar Content */}
                        <div className="h-full pt-2">
                            <MobileHistorySidebar
                                onHistoryItemClick={handleHistoryItemClick}
                                refreshTrigger={refreshTrigger}
                                onItemSelect={handleMobileHistoryItemSelect}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile History Button - Enhanced for better mobile experience */}
            <button
                onClick={handleHistoryButtonClick}
                className={`fixed left-4 bottom-6 z-40 md:hidden
                    bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white p-4 rounded-full shadow-xl
                    hover:from-[#6d28d9] hover:to-[#7c3aed] transition-all duration-300 ease-out
                    hover:scale-110 active:scale-95 hover:shadow-2xl
                    ${isMobileDrawerOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100 mobile-history-btn-pulse'}
                    transform border-2 border-white/20
                `}
                aria-label="Open History"
                style={{
                    filter: isMobileDrawerOpen ? 'none' : 'drop-shadow(0 10px 25px rgba(124, 58, 237, 0.4))'
                }}
            >
                <HistoryIcon className="h-5 w-5" />
            </button>

            {/* Navbar */}
            <div>
                <nav className="bg-[#1F1726] px-4 py-2">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-1">
                            <Image src={logo} alt="logo" className="h-5 w-5 rounded-md" />
                            <h1 className="text-lg font-semibold text-white">Tryzent</h1>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <CreditsDisplay
                                className="relative top-0 right-0"
                                refreshInterval={5 * 60 * 1000}
                            />
                            <Link href='/'>
                                <Button className="bg-[#7c3aed] hover:bg-[#6d28d9] h-9 text-sm px-2 sm:px-4">
                                    <HomeIcon className="h-2 w-2 mr-1" />
                                    <span className="xs:inline">Home</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </nav>

                {/* Banner Section */}
                <div className="bg-[#1F1726] text-white py-4 sm:py-8 px-4 relative z-0">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between">
                        <div className="flex-1 pr-0 sm:pr-4 text-center sm:text-left mb-4 sm:mb-0">
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{agent?.agent_Name}</h1>
                            <p className="text-sm text-gray-300 mb-4 max-w-3xl line-clamp-3">
                                {agent?.agent_description}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden md:block h-32 w-40 sm:h-44 sm:w-56">
                                <Lottie
                                    animationData={animation}
                                    loop={true}
                                    autoplay={true}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Container */}
            <RatingProvider>
                <div className="max-w-7xl mx-auto px-4 relative">
                    <div className="relative flex flex-col md:flex-row gap-4 z-10 -mt-4 sm:-mt-10 mb-8">
                        {/* History Sidebar - Hidden on mobile, visible on desktop */}
                        <div className="hidden md:block md:sticky md:top-4 w-full md:w-auto mb-4 md:mb-0">
                            <Card className="w-auto md:w-full bg-white shadow-md rounded-lg p-0">
                                <HistorySidebar
                                    onHistoryItemClick={handleHistoryItemClick}
                                    containerRef={formattedResponseRef}
                                    refreshTrigger={refreshTrigger}
                                    onCreateNew={() => formRef.current?.createNew?.()}
                                    createNewClassName="h-7 px-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs rounded-md"
                                />
                            </Card>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 w-full overflow-hidden">
                            <Card className="w-full bg-white shadow-md rounded-lg p-4">
                                <h2 className="text-sm font-semibold mb-2">
                                    Generate a {agent?.agent_Name || 'Plan'}
                                </h2>
                                {agent && (
                                    <DynamicAgentForm
                                        ref={formRef}
                                        agentData={agent}
                                        onResponse={handleFormResponse}
                                    />
                                )}
                            </Card>
                            {/* Display API Response */}
                            <div ref={formattedResponseRef} className="mt-5 w-full overflow-x-auto">
                                {response && (
                                    <div className="w-full">
                                        <FormattedResponse
                                            key={`formatted-response-${currentExecutionToken || 'new'}`}
                                            response={response}
                                            executionToken={currentExecutionToken}
                                            agent_id={currentagent_id}
                                            onSave={handleSaveComplete}
                                            formRef={formRef}
                                            historicalRating={historicalRating}
                                            historicalFeedback={historicalFeedback}
                                            isHistoricalView={isHistoricalView}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Download Section */}
                    {showDownload && response && (
                        <DownloadSection
                            response={downloadableResponse || response.data}
                            fileName={fileName}
                        />
                    )}
                </div>
            </RatingProvider>
        </main>
    );
}

// Load Lottie only on the client to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
