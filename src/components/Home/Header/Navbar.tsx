import { motion } from 'framer-motion';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { LogIn, LogOut, UserPlus } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';

const Navigation = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    useEffect(() => {
        // Check for access_token cookie when component mounts
        const accessToken = Cookies.get('access_token');
        setIsLoggedIn(!!accessToken);
    }, []);
    
    const handleLogout = () => {
        // Remove the access_token cookie
        Cookies.remove('access_token');
        setIsLoggedIn(false);
        // Show logout toast
        toast({
            className: cn(
                'fixed top-4 left-1/2 transform -translate-x-1/2 md:max-w-[420px]'
            ),
            title: "⚠️ Logged out!",
            description: "You have been successfully logged out.",
            variant: "default",
            duration: 3000,
        });
    };

    // Function to handle auth button clicks and set redirect destination for home page
    const handleAuthButtonClick = () => {
        // Set redirect to browse page since these buttons are from navigation/home
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('redirectAfterLogin', '/browse');
            sessionStorage.setItem('authFromHome', 'true');
        }
    };

    // Also set redirect destination when component mounts (for page refreshes)
    useEffect(() => {
        // If user is on auth page and no redirect is set, set it to browse
        if (typeof window !== 'undefined' && window.location.pathname === '/auth') {
            const existingRedirect = sessionStorage.getItem('redirectAfterLogin');
            if (!existingRedirect) {
                sessionStorage.setItem('redirectAfterLogin', '/browse');
                sessionStorage.setItem('authFromHome', 'true');
            }
        }
    }, []);
    
    return (
        <>
            <div className="flex items-center gap-2 sm:gap-3">
                {isLoggedIn ? (
                    <motion.button
                        onClick={handleLogout}
                        className="w-full sm:w-auto flex items-center justify-center h-9 sm:h-10 px-3 sm:px-6 py-2 sm:py-3 text-white text-xs sm:text-sm rounded-md gap-1 sm:gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            background: 'linear-gradient(90deg, #635EFD 0%, #A863F6 100%)',
                        }}
                    >
                        <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="whitespace-nowrap">Logout</span>
                    </motion.button>
                ) : (
                    <>
                        <Link 
                            href="/auth?view=signup&from=home"
                            onClick={handleAuthButtonClick}
                        >
                            <motion.button
                                className="[background-image:linear-gradient(90deg,#635EFD_0%,#A863F6_100%)] text-white hover:opacity-90 transition px-4 py-2 text-xs sm:px-6 sm:py-2 md:text-sm rounded-md"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="">Get Started</span>
                            </motion.button>
                        </Link>
                        <Link 
                            href="/auth?from=home"
                            onClick={handleAuthButtonClick}
                        >
                            <motion.button
                                className="[background-image:linear-gradient(90deg,#635EFD_0%,#A863F6_100%)] text-white hover:opacity-90 transition px-4 py-2 text-xs sm:px-6 sm:py-2 md:text-sm rounded-md"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="whitespace-nowrap">Sign In</span>
                            </motion.button>
                        </Link>
                    </>
                )}
                <Toaster />
            </div>
        </>
    );
};

export default Navigation;