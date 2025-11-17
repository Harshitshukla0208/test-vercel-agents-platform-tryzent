import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const HealthInsuranceFinderLoader = () => {
    return (
        <div className="flex flex-col items-center space-y-6">
            {/* Floating Shield Icon */}
            <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <Shield className="w-12 h-12 text-indigo-600" />
            </motion.div>
            
            {/* Progress Bar */}
            <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-indigo-600 rounded-full"
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

export default HealthInsuranceFinderLoader;