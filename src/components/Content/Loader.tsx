'use client';

interface AgentInput {
    variable: string;
    datatype: string;
    variable_description: string;
    Required: boolean;
}

interface Agent {
    agent_id: string;
    agent_Name: string;
    agent_description: string;
    agent_Inputs: AgentInput[];
    agent_Type: string;
    agent_endpoint?: string;
    execution_credit?: string;
}

interface LessonPlanLoaderProps {
    isVisible?: boolean;
}

export default function LessonPlanLoader({ isVisible = true }: LessonPlanLoaderProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            
            {/* Popup container */}
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mx-4 max-w-xs sm:max-w-sm w-full animate-fade-in">
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Loader circle */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                        <svg
                            className="w-16 h-16 sm:w-20 sm:h-20 text-purple-500 animate-spin-slow"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 animate-pulse-custom opacity-80"></div>
                    </div>
                    
                    {/* Text content */}
                    <div className="space-y-3">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 animate-float">
                            Generating...
                        </h2>
                        <p className="text-sm text-gray-600 opacity-80 leading-relaxed px-2">
                            Please wait while we create your perfect response
                        </p>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes spin-slow {
                    to {
                        transform: rotate(-360deg);
                    }
                }
                
                @keyframes pulse-custom {
                    0% {
                        transform: scale(0.95);
                        opacity: 0.5;
                    }
                    50% {
                        transform: scale(1);
                        opacity: 0.8;
                    }
                    100% {
                        transform: scale(0.95);
                        opacity: 0.5;
                    }
                }
                
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
                
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                
                .animate-spin-slow {
                    animation: spin-slow 4s linear infinite;
                }
                
                .animate-pulse-custom {
                    animation: pulse-custom 1.5s ease-in-out infinite;
                }
                
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
