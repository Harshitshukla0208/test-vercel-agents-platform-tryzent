import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { HistoryIcon, Brain, Home } from "lucide-react";
import DynamicAgentForm from "./AudioForm";
import { Button } from "../ui/button";
import FormattedResponse from "./AudioResponse";
import HistorySidebar from "./AudioHistory";
import Link from "next/link";
import CreditsDisplay from "../Content/CreditsDisplay";
import Image from "next/image";
import LogoImage from '@/assets/logo.jpeg'
import MobileAudioHistoryDrawer from "./MobileHistoryComponent";
import LessonPlanLoader from "../Content/Loader";
import Footer from "../Home/Footer";
import { RatingProvider } from "../Content/RatingContext";
import SupportButton from "../SupportBtn";
import ContactPopup from "../ContactPopup";
import { AudioNoteSummarizerLoader } from "./AudioNotesLoader";

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
    Detailed_description?: string
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

export function AudioNoteSummarizer() {
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
    const [showContactPopup, setShowContactPopup] = useState(false)
    const [showLoader, setShowLoader] = useState(true);

    // Mobile drawer state - This is the key state for controlling the mobile sidebar
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

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

    // Auto-scroll function with smooth behavior
    const scrollToResponse = () => {
        if (formattedResponseRef.current) {
            // Small delay to ensure DOM is fully rendered
            setTimeout(() => {
                formattedResponseRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
            }, 100);
        }
    };

    // Auto-scroll effect when response changes
    useEffect(() => {
        if (response && response.data && !response.loading) {
            scrollToResponse();
        }
    }, [response]);

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

    // Handler for new form submissions with auto-scroll
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

            // Auto-scroll to response after setting the data
            // The useEffect will handle the actual scrolling
        }
    };

    // Add loading state display
    if (loading || showLoader) {
        return (
            <main className="flex flex-col items-center justify-center h-screen w-screen">
                <h2 className="text-xl font-semibold text-gray-700 mb-6">Audio Note Summarizer</h2>
                <AudioNoteSummarizerLoader />
                <p className="text-gray-500 text-sm mt-4 text-center">
                    Process Audio Notes...
                </p>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen bg-gray-50">
            {/* Enhanced Mobile-First CSS */}
            <style jsx>{`
                /* Base mobile styles */
                .mobile-drawer-backdrop {
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    background: rgba(0, 0, 0, 0.5);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .mobile-drawer-content {
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                    touch-action: pan-y;
                    transform: translateX(0);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .mobile-drawer-enter {
                    transform: translateX(-100%);
                }
                
                .mobile-drawer-exit {
                    transform: translateX(-100%);
                }
                
                /* Mobile button animations */
                @keyframes mobile-pulse-glow {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.7);
                        transform: scale(1);
                    }
                    50% {
                        box-shadow: 0 0 0 15px rgba(124, 58, 237, 0);
                        transform: scale(1.05);
                    }
                }
                
                .mobile-history-btn-pulse {
                    animation: mobile-pulse-glow 3s infinite;
                }
                
                .drawer-no-select {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                }

                /* Smooth scrolling */
                html {
                    scroll-behavior: smooth;
                }

                /* Mobile viewport optimizations */
                @media (max-width: 768px) {
                    body {
                        overflow-x: hidden;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
                    
                    .mobile-touch-target {
                        min-height: 48px;
                        min-width: 48px;
                        touch-action: manipulation;
                    }
                    
                    .mobile-safe-area {
                        padding-left: max(1rem, env(safe-area-inset-left));
                        padding-right: max(1rem, env(safe-area-inset-right));
                    }
                    
                    .mobile-scroll-optimize {
                        -webkit-overflow-scrolling: touch;
                        transform: translateZ(0);
                        will-change: transform;
                    }
                }

                /* Small mobile devices */
                @media (max-width: 480px) {
                    .xs-padding {
                        padding: 0.75rem;
                    }
                    
                    .xs-text-size {
                        font-size: 0.875rem;
                        line-height: 1.25rem;
                    }
                    
                    .xs-button-size {
                        height: 2.5rem;
                        padding: 0.5rem 1rem;
                    }
                }

                /* Landscape mobile optimization */
                @media (max-width: 896px) and (orientation: landscape) {
                    .landscape-mobile-height {
                        max-height: 85vh;
                    }
                    
                    .landscape-mobile-header {
                        padding-top: 0.5rem;
                        padding-bottom: 0.5rem;
                    }
                }

                /* Tablet breakpoint */
                @media (min-width: 768px) and (max-width: 1023px) {
                    .tablet-spacing {
                        padding: 1.5rem;
                    }
                }

                /* Focus states for accessibility */
                .mobile-focus:focus {
                    outline: 2px solid #7c3aed;
                    outline-offset: 2px;
                }

                /* Improve tap targets */
                @media (hover: none) and (pointer: coarse) {
                    .mobile-tap-target {
                        min-height: 44px;
                        min-width: 44px;
                    }
                }
            `}</style>

            {/* Mobile History Drawer - Only shows when isMobileDrawerOpen is true */}
            {isMobileDrawerOpen && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 z-50 md:hidden lg:hidden mobile-drawer-backdrop"
                    onClick={handleOverlayClick}
                    role="dialog"
                    aria-modal="true"
                    aria-label="History Sidebar"
                >
                    <div
                        ref={drawerRef}
                        className={`
                            fixed left-0 top-0 h-full w-4/5 max-w-sm bg-white shadow-2xl
                            mobile-drawer-content drawer-no-select
                            ${isMobileDrawerOpen ? '' : 'mobile-drawer-exit'}
                        `}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MobileAudioHistoryDrawer
                            onHistoryItemClick={(execution_id: string, agent_id: string) => {
                                handleHistoryItemClick(execution_id, agent_id);
                                handleMobileHistoryItemSelect();
                            }}
                            refreshTrigger={refreshTrigger}
                            onItemSelect={handleMobileHistoryItemSelect}
                            onCreateNew={() => {
                                setCurrentExecutionToken('');
                                formRef.current?.createNew?.();
                                handleMobileHistoryItemSelect(); // Close the mobile sidebar
                            }}
                            currentExecutionId={currentExecutionToken}
                        />
                    </div>
                </div>
            )}

            {/* Mobile History Button - Enhanced responsive design */}
            <button
                onClick={handleHistoryButtonClick}
                className={`
                    fixed z-40 md:hidden lg:hidden mobile-touch-target mobile-focus
                    bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white rounded-full
                    shadow-xl hover:from-[#6d28d9] hover:to-[#7c3aed]
                    transition-all duration-300 ease-out hover:scale-110 active:scale-95
                    hover:shadow-2xl border-2 border-white/20
                    flex items-center justify-center
                    ${isMobileDrawerOpen ? 
                        'opacity-0 pointer-events-none scale-90' : 
                        'opacity-100 scale-100 mobile-history-btn-pulse'
                    }
                    
                    /* Responsive sizing and positioning */
                    w-12 h-12 left-3 bottom-4
                    xs:w-14 xs:h-14 xs:left-4 xs:bottom-5
                    sm:w-16 sm:h-16 sm:left-4 sm:bottom-6
                `}
                style={{
                    filter: isMobileDrawerOpen ? 'none' : 'drop-shadow(0 10px 25px rgba(124, 58, 237, 0.4))',
                    bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
                    left: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))'
                }}
                aria-label="Open History Sidebar"
                type="button"
            >
                <HistoryIcon className="h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7" />
            </button>

            {/* Header - Fully responsive with safe area support */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 mobile-safe-area landscape-mobile-header">
                <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-2 xs:py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Image src={LogoImage} alt='logo' className='h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded-md' />
                            <div className="flex flex-col">
                                <Link href='/'>
                                    <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">AgentHub</span>
                                </Link>
                                <span className="text-xs sm:text-xs text-gray-500 leading-none">
                                    by{' '}
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
                        <div className="flex items-center gap-1 xs:gap-2 sm:gap-6 flex-shrink-0">
                            <CreditsDisplay
                                className="relative top-0 right-0 text-xs xs:text-xs sm:text-sm"
                                refreshInterval={5 * 60 * 1000}
                            />
                            <SupportButton
                                onClick={() => setShowContactPopup(true)}
                                className="text-[#7c3aed] hover:text-[#7c3aed] border-[#7c3aed] hover:border-[#7c3aed] mobile-tap-target"
                            />
                            
                            <Link href="/">
                                <Button className="bg-[#7c3aed] hover:bg-[#6d28d9] mobile-touch-target mobile-focus
                                h-7 xs:h-8 sm:h-9 text-xs xs:text-xs sm:text-sm 
                                px-2 xs:px-2 sm:px-4 rounded-md xs-button-size">
                                    <Home className="h-3 w-3 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-0 xs:mr-0 sm:mr-1" />
                                    <span className="hidden xs:hidden sm:inline">Home</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Container - Enhanced responsive layout */}
            <RatingProvider>
                <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-8 mobile-safe-area tablet-spacing">
                    <div className="flex flex-col lg:flex-row gap-3 xs:gap-4 sm:gap-6 lg:gap-8">

                        {/* Desktop History Sidebar - Hidden on mobile and tablet */}
                        <div className="hidden lg:block flex-shrink-0">
                            <HistorySidebar
                                onHistoryItemClick={handleHistoryItemClick}
                                containerRef={formattedResponseRef}
                                refreshTrigger={refreshTrigger}
                                onCreateNew={() => {
                                    setCurrentExecutionToken('');
                                    formRef.current?.createNew?.();
                                }}
                                currentExecutionId={currentExecutionToken}
                            />
                        </div>

                        {/* Main Content - Fully responsive with mobile optimizations */}
                        <div className="flex-1 space-y-3 xs:space-y-4 sm:space-y-6 min-w-0 mobile-scroll-optimize">
                            {/* Dynamic Agent Form - Mobile optimized */}
                            <Card className="w-full bg-white shadow-sm rounded-lg xs:rounded-xl border border-gray-200 
                            overflow-hidden xs-padding">
                                {agent && (
                                    <div className="mobile-text-optimize">
                                        <DynamicAgentForm
                                            ref={formRef}
                                            agentData={agent}
                                            onResponse={handleFormResponse}
                                            Detailed_description={agent.Detailed_description}
                                        />
                                    </div>
                                )}
                            </Card>

                            {/* Display API Response - Mobile optimized */}
                            <div 
                                ref={formattedResponseRef} 
                                className="w-full scroll-mt-16 xs:scroll-mt-20 landscape-mobile-height" 
                                id="response-section"
                            >
                                {response && (
                                    <div className="w-full mobile-scroll-optimize">
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
                </div>
            </RatingProvider>

            {/* Mobile-specific bottom padding to account for floating button */}
            <div className="h-20 xs:h-24 sm:h-0 md:hidden lg:hidden" aria-hidden="true"></div>
            
            <Footer />
            
            <ContactPopup 
                isOpen={showContactPopup} 
                onClose={() => setShowContactPopup(false)} 
                trigger="credits" 
            />
        </main>
    );
}

export default AudioNoteSummarizer