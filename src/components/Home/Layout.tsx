'use client'
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Banner from '../Home/Banner';
import Cards from './Cards/CardsGrid';
import Footer from './Footer';
import Header from './Header/Header';
import axios from 'axios';

// Skeleton Card Component
const SkeletonCard = () => (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-300"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
        </div>
        <div className="p-4 space-y-4">
            <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/5"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-10 bg-gray-100 rounded w-full"></div>
        </div>
    </div>
);

// Types 
interface ErrorDetails {
    message: string;
    details?: string;
}

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
    agent_rating: number;
    execution_count: number;
    execution_credit: number;
    agent_file: boolean;
    createdAt: string;
    updatedAt: string;
    agent_endpoint?: string;
}

const Layout = () => {
    const [state, setState] = useState<{
        agents: Agent[];
        loading: boolean;
        error: ErrorDetails | null;
    }>({
        agents: [],
        loading: true,
        error: null
    });

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            // Slight delay to ensure smooth loading experience
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                const { data } = await axios.get('/api/dashboard');

                if (isMounted) {
                    setState(prevState => ({
                        ...prevState,
                        agents: data.data || [],
                        loading: false,
                        error: null
                    }));
                }
            } catch (error) {
                let errorDetails: ErrorDetails = {
                    message: 'Failed to fetch agents'
                };

                if (axios.isAxiosError(error) && error.response?.data) {
                    errorDetails = {
                        message: error.response.data.error || 'Failed to fetch agents',
                        details: error.response.data.details
                    };
                }

                if (isMounted) {
                    setState(prevState => ({
                        ...prevState,
                        agents: [],
                        loading: false,
                        error: errorDetails
                    }));
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />
            <main className="flex-grow">
                <section className="w-full bg-[#1F1726]">
                    <div className="container mx-auto px-4 flex justify-center items-center py-0">
                        <Banner />
                    </div>
                </section>

                <section className="container mx-auto px-4 py-12">
                    <div className="w-full max-w-7xl mx-auto">
                        <AnimatePresence mode="wait">
                            {state.loading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                                >
                                    {[...Array(6)].map((_, index) => (
                                        <SkeletonCard key={index} />
                                    ))}
                                </motion.div>
                            ) : state.error ? (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="text-center py-12"
                                >
                                    <p className="text-red-600 font-medium mb-2">
                                        {state.error.message}
                                    </p>
                                    {state.error.details && (
                                        <p className="text-gray-600 text-sm">
                                            {state.error.details}
                                        </p>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="cards"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                >
                                    <Cards agents={state.agents} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default Layout;
