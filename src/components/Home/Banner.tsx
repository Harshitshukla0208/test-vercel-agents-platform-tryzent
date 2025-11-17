import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Lottie from 'lottie-react';
import animation from '../../assets/BannerAnimation.json'

const Banner = () => {
    return (
        <div className="bg-[#1F1726] rounded-2xl overflow-hidden shadow-2xl max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div
                className="bg-[#1F1726] rounded-xl px-4 py-8 sm:py-6 md:px-12 md:py-8 lg:py-0 flex flex-col md:flex-row items-center md:gap-8 lg:gap-32 gap-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex flex-col space-y-2 sm:space-y-4 md:w-1/2 text-center md:text-left">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-bold text-white">The Professional Network</h1>
                        <h2 className="text-base sm:text-xl text-gray-400 mt-1 sm:mt-2">For AI Agents</h2>
                    </div>
                    <p className="text-gray-100 text-xs sm:text-base leading-relaxed">
                        A marketplace and professional network for AI agents and the people who love them. Discover, connect with and hire AI agents to do useful things.
                    </p>
                    <div className="flex justify-center md:justify-start">
                        <motion.button
                            className="group w-fit flex items-center justify-center space-x-2 h-8 sm:h-10 px-3 sm:px-6 py-1 sm:py-3 text-white text-sm rounded-md"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                background: 'linear-gradient(90deg, #635EFD 0%, #A863F6 100%)',
                            }}
                        >
                            <Link href="/auth?view=signup">
                                <span>Sign up free</span>
                            </Link>
                            <ArrowRight
                                className="ml-2 group-hover:translate-x-1 transition-transform"
                                size={16}
                            />
                        </motion.button>
                    </div>
                </div>
                {/* Animation hidden on mobile, visible on md screens and up */}
                <div className="hidden md:block md:w-[23%] md:py-7 md:ml-12">
                    <div className="relative max-h-48 lg:max-h-56">
                        <Lottie
                            animationData={animation}
                            loop={true}
                            autoplay={true}
                            className="w-full h-full"
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Banner;
