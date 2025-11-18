import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export const AudioNoteSummarizerLoader = () => {
    const [, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    return 0; // Reset to create a continuous loop
                }
                return prev + 1;
            });
        }, 20); // Faster loading - completes in 2 seconds

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center space-y-6">
            {/* Audio Waveform */}
            <div className="flex items-center space-x-1">
                {[12, 24, 16, 32, 20, 28, 14, 22, 18].map((height, index) => (
                    <motion.div
                        key={index}
                        className="w-1 bg-[#714B90] rounded-full"
                        style={{ height: `${height}px` }}
                        animate={{
                            scaleY: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: index * 0.1,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            {/* Progress Bar */}
            {/* <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-blue-600 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                        duration: 1.7,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div> */}
        </div>
    );
};
