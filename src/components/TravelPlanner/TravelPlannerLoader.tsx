import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

export const TravelPlannerLoader = () => {
    return (
        <div className="flex flex-col items-center space-y-6">
            {/* Floating Map Pin Icon */}
            <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <MapPin className="w-12 h-12 text-blue-600" />
            </motion.div>

            {/* Progress Bar */}
            <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
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
            </div>
        </div>
    );
};
