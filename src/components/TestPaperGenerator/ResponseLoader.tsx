'use client';

import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

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

interface TravelPlannerLoaderProps {
    isVisible?: boolean;
}

export default function TravelPlannerLoader({ isVisible = true }: TravelPlannerLoaderProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            {/* Popup container */}
            <div className="relative bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 mx-3 sm:mx-4 max-w-xs sm:max-w-sm md:max-w-md w-full animate-fade-in">
                <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
                    {/* Floating Map Pin Icon */}
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center">
                        <motion.div
                            animate={{ y: [-8, 8, -8] }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <BookOpen className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 text-blue-600" />
                        </motion.div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-24 sm:w-32 md:w-36 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full animate-progress"></div>
                    </div>

                    {/* Text content */}
                    <div className="space-y-2 sm:space-y-3">
                        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
                            Preparing Your Test Paper...                        
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 opacity-80 leading-relaxed px-1 sm:px-2">
                            Formulating questions, balancing difficulty, and fine-tuning every details 📝                        </p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes progress {
                    0% {
                        width: 0%;
                        transform: translateX(-100%);
                    }
                    50% {
                        width: 100%;
                        transform: translateX(0%);
                    }
                    100% {
                        width: 100%;
                        transform: translateX(100%);
                    }
                }
                
                @keyframes pulse-custom {
                    0% {
                        transform: scale(0.9);
                        opacity: 0.3;
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 0.6;
                    }
                    100% {
                        transform: scale(0.9);
                        opacity: 0.3;
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
                
                .animate-progress {
                    animation: progress 3s ease-in-out infinite;
                }
                
                .animate-pulse-custom {
                    animation: pulse-custom 2s ease-in-out infinite;
                }
                
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
