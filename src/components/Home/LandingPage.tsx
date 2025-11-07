"use client"

import React, { useState, useEffect } from "react"
import { Zap, Bot, LogOut, ArrowRight, Shield, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "../ui/badge"
import axios from "axios"
import Image from "next/image"
import LogoImage from "@/assets/logo.jpeg"
import Cards from "./Cards/CardsGrid"
import Link from "next/link"
import Footer from "./Footer"
import { Button } from "../ui/button"
import ContactSection from "../ContactSection"

const SkeletonCard = () => (
    <motion.div
        className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm animate-pulse"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gray-300"></div>
                <div className="h-3 sm:h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
        </div>
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="space-y-2 sm:space-y-3">
                <div className="h-2.5 sm:h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-2.5 sm:h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-2.5 sm:h-3 bg-gray-200 rounded w-4/5"></div>
            </div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 sm:h-10 bg-gray-100 rounded w-full"></div>
        </div>
    </motion.div>
)

interface ErrorDetails {
    message: string
    details?: string
}

interface AgentInput {
    variable: string
    datatype: string
    variable_description: string
    Required: boolean
}

interface Agent {
    agent_id: string
    agent_Name: string
    agent_description: string
    agent_Inputs: AgentInput[]
    agent_Type: string
    agent_rating: number
    execution_count: number
    execution_credit: number
    agent_file: boolean
    createdAt: string
    updatedAt: string
    agent_endpoint?: string
    agent_Category?: string
}

interface PaginationMeta {
    total_records: number
    page: number
    page_size: number
    total_pages: number
}

// Pagination Component
const Pagination: React.FC<{
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    loading?: boolean
}> = ({ currentPage, totalPages, onPageChange, loading = false }) => {
    const getPageNumbers = () => {
        const pages = []
        const maxVisiblePages = 5

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, "...", totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
            }
        }

        return pages
    }

    if (totalPages <= 1) return null

    return (
        <div className="flex justify-center items-center gap-2 mt-8">
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="flex items-center gap-1"
            >
                <ChevronLeft className="h-4 w-4" />
                Previous
            </Button>

            <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                        {page === "..." ? (
                            <span className="px-2 text-gray-500">...</span>
                        ) : (
                            <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => onPageChange(page as number)}
                                disabled={loading}
                                className={`min-w-[40px] ${currentPage === page ? "bg-blue-600 text-white hover:bg-blue-700" : "hover:bg-gray-50"
                                    }`}
                            >
                                {page}
                            </Button>
                        )}
                    </React.Fragment>
                ))}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="flex items-center gap-1"
            >
                Next
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}

// Simple animation variants
const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
}

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1,
        },
    },
}

export default function TryzentLanding() {
    const [isVisible, setIsVisible] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    const [state, setState] = useState<{
        agents: Agent[]
        loading: boolean
        error: ErrorDetails | null
        pagination: PaginationMeta
    }>({
        agents: [],
        loading: true,
        error: null,
        pagination: {
            total_records: 0,
            page: 1,
            page_size: 6, // Show 6 agents per page for featured section
            total_pages: 0,
        },
    })

    // Function to check if user is logged in by checking cookies
    const checkAuthStatus = () => {
        if (typeof window !== "undefined") {
            const cookies = document.cookie.split(";")
            const accessTokenCookie = cookies.find((cookie) => cookie.trim().startsWith("access_token="))
            return !!accessTokenCookie
        }
        return false
    }

    // Function to handle logout
    const handleLogout = () => {
        if (typeof window !== "undefined") {
            // Remove access_token cookie
            document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

            // Optionally remove other auth-related cookies
            document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

            // Update state
            setIsLoggedIn(false)

            // Redirect to login page or refresh
            window.location.href = "/auth"
        }
    }

    // Function to fetch agents with pagination
    const fetchAgents = async (page = 1, pageSize = 6) => {
        try {
            setState((prevState) => ({
                ...prevState,
                loading: true,
                error: null,
            }))

            const { data } = await axios.get("/api/dashboard", {
                params: {
                    page,
                    page_size: pageSize,
                },
            })

            setState((prevState) => ({
                ...prevState,
                agents: data.data || [],
                loading: false,
                error: null,
                pagination: data.meta || {
                    total_records: 0,
                    page: 1,
                    page_size: pageSize,
                    total_pages: 0,
                },
            }))
        } catch (error) {
            let errorDetails: ErrorDetails = {
                message: "Failed to fetch agents",
            }

            if (axios.isAxiosError(error) && error.response?.data) {
                errorDetails = {
                    message: error.response.data.error || "Failed to fetch agents",
                    details: error.response.data.details,
                }
            }

            setState((prevState) => ({
                ...prevState,
                agents: [],
                loading: false,
                error: errorDetails,
            }))
        }
    }

    // Handle page change
    const handlePageChange = (page: number) => {
        if (page !== state.pagination.page && page >= 1 && page <= state.pagination.total_pages) {
            fetchAgents(page, state.pagination.page_size)

            // Smooth scroll to agents section
            const agentsSection = document.getElementById("agents-section")
            if (agentsSection) {
                agentsSection.scrollIntoView({ behavior: "smooth" })
            }
        }
    }

    useEffect(() => {
        let isMounted = true

        const initializeData = async () => {
            // Slight delay to ensure smooth loading experience
            await new Promise((resolve) => setTimeout(resolve, 500))

            if (isMounted) {
                fetchAgents(1, 6) // Start with page 1, 6 items per page
            }
        }

        initializeData()

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 100)

        // Check authentication status on component mount
        setIsLoggedIn(checkAuthStatus())

        // Check for scroll parameter in URL
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search)
            const scrollTo = urlParams.get("scrollTo")

            if (scrollTo === "agents") {
                // Wait a bit for the page to load, then scroll
                setTimeout(() => {
                    handleScrollToAgents()
                    // Clean up the URL parameter
                    const newUrl = window.location.pathname
                    window.history.replaceState({}, document.title, newUrl)
                }, 300)
            }
        }

        return () => clearTimeout(timer)
    }, [])

    const handleScrollToAgents = () => {
        const agentsSection = document.getElementById("agents-section")
        if (agentsSection) {
            agentsSection.scrollIntoView({ behavior: "smooth" })
        }
    }

    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_2.5rem] sm:bg-[size:6rem_4rem]">
                <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_600px_at_50%_200px,#d5c5ff,transparent)] sm:bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)]"></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-50 px-3 py-3 sm:px-4 sm:py-4 lg:px-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Image
                            src={LogoImage || "/placeholder.svg"}
                            alt="logo"
                            className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 rounded-md"
                        />
                        <div className="flex flex-col">
                            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">AgentHub</span>
                            <span className="text-xs sm:text-sm text-gray-500 leading-none">
                                by{" "}
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
                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                        {isLoggedIn ? (
                            <motion.button
                                onClick={handleLogout}
                                className="flex gap-1.5 sm:gap-2 justify-center items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 transition px-3 py-2 sm:px-4 sm:py-2 lg:px-6 lg:py-2 text-xs sm:text-sm lg:text-sm rounded-lg font-medium shadow-lg"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="xs:inline">Logout</span>
                            </motion.button>
                        ) : (
                            <>
                                <Link href="/auth?view=signup">
                                    <motion.button
                                        className="border border-blue-600 text-blue-600 hover:bg-blue-50 transition px-3 py-2 sm:px-4 sm:py-2 lg:px-4 lg:py-2 text-xs sm:text-sm lg:text-sm rounded-lg font-medium"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <span className="xs:inline">Get Started</span>
                                    </motion.button>
                                </Link>
                                <Link href="/auth">
                                    <motion.button
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 transition px-3 py-2 sm:px-4 sm:py-2 lg:px-6 lg:py-2 text-xs sm:text-sm lg:text-sm rounded-lg font-medium shadow-lg"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Sign In
                                    </motion.button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <motion.section
                className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <div className="container mx-auto text-center max-w-5xl">
                    <motion.div
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Badge className="mb-4 sm:mb-6 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm">
                            ✨ New agents added every week ✨
                        </Badge>
                    </motion.div>

                    <motion.h1
                        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight px-2"
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        Empowering Everyone Through{" "}
                        <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-500 bg-clip-text text-transparent">
                            Intelligent
                        </span>{" "}
                        AI Agents
                    </motion.h1>

                    <motion.p
                        className="text-base sm:text-lg lg:text-xl text-gray-600 mb-8 sm:mb-10 leading-relaxed max-w-4xl mx-auto px-2"
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        Leading AI agent marketplace with ready-to-use AI systems for professionals, businesses, and individuals. We
                        deliver cutting-edge AI agents that automate tasks, boost productivity, and solve real-world problems for
                        everyone.
                    </motion.p>

                    <motion.div
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4"
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        transition={{ delay: 0.5 }}
                    >
                        <motion.div variants={fadeInUp} transition={{ duration: 0.6 }}>
                            <Link target="_blank" href="https://calendly.com/tryzent-tech/30min">
                                <Button
                                    size="lg"
                                    className="w-full sm:w-auto text-base sm:text-base px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg"
                                >
                                    Build Custom Agent
                                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                            </Link>
                        </motion.div>

                        <motion.div variants={fadeInUp} transition={{ duration: 0.6 }}>
                            <Link href="/browse">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full sm:w-auto text-base sm:text-base px-6 sm:px-8 py-3 sm:py-4 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white rounded-lg"
                                >
                                    Explore Our Agents
                                </Button>
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.section>

            {/* Features Section */}
            <motion.section
                className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gray-50"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <div className="container mx-auto">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Why Choose AgentHub?</h2>
                        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
                            We deliver cutting-edge AI agents that drive innovation and productivity
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
                        <motion.div
                            className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm"
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">Ready to Use</h3>
                            <p className="text-sm sm:text-base text-gray-600">
                                All agents are tested and ready to integrate immediately into your workflow
                            </p>
                        </motion.div>
                        <motion.div
                            className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm"
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <Users className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">Expert Collaboration</h3>
                            <p className="text-sm sm:text-base text-gray-600">
                                Built in collaboration with Subject Matter Experts to meet real-world requirements and industry
                                standards
                            </p>
                        </motion.div>
                        <motion.div
                            className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm sm:col-span-2 lg:col-span-1"
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-purple-600" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">Enterprise Grade</h3>
                            <p className="text-sm sm:text-base text-gray-600">
                                Every agent is reviewed for quality, security, and enterprise reliability
                            </p>
                        </motion.div>
                    </div>
                </div>
            </motion.section>

            {/* AI Agents Section */}
            <section id="agents-section" className="relative z-10 py-12 sm:py-16 lg:py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center mb-8 sm:mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                            Featured AI Agents
                        </h2>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                            Discover our most popular AI agents, ready to integrate into your workflow
                        </p>
                    </motion.div>

                    <section className="container mx-auto px-4 py-8 sm:py-12">
                        <div className="w-full max-w-7xl mx-auto">
                            <AnimatePresence mode="wait">
                                {state.loading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
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
                                        className="text-center py-8 sm:py-12 px-4"
                                    >
                                        <p className="text-red-600 font-medium mb-2 text-sm sm:text-base">{state.error.message}</p>
                                        {state.error.details && <p className="text-gray-600 text-xs sm:text-sm">{state.error.details}</p>}
                                        <Button
                                            onClick={() => fetchAgents(state.pagination.page, state.pagination.page_size)}
                                            className="mt-4"
                                            variant="outline"
                                        >
                                            Try Again
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="cards"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{ duration: 0.6 }}
                                    >
                                        <Cards agents={state.agents} />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Pagination Component */}
                            {!state.loading && !state.error && (
                                <Pagination
                                    currentPage={state.pagination.page}
                                    totalPages={state.pagination.total_pages}
                                    onPageChange={handlePageChange}
                                    loading={state.loading}
                                />
                            )}
                        </div>
                    </section>
                </div>

                {/* Browse All Agents Button */}
                <div className="text-center mt-10">
                    <Link href="/browse">
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50 bg-white rounded-lg px-8 py-3"
                        >
                            Browse All Agents
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Services Preview */}
            <motion.section
                className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gray-50"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <Bot className="h-6 w-6 text-blue-600" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Custom Agent Development</h3>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <Zap className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">AI Agent Marketplace</h3>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                <Shield className="h-6 w-6 text-purple-600" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Enterprise Solutions</h3>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* CTA Section */}
            <motion.section
                className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <div className="container mx-auto text-center max-w-3xl">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                        Ready to Boost Your Productivity?
                    </h2>
                    <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 sm:mb-8 px-4">
                        Join thousands of professionals, businesses, and individuals already using our AI agents to automate tasks
                        and streamline their workflows.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                        <Link target="_blank" href="https://calendly.com/tryzent-tech/30min">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg px-6 sm:px-8 py-3 sm:py-4"
                            >
                                Schedule Demo
                                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.section>

            <ContactSection />

            <Footer />

            <style jsx>{`
                .laptop-container {
                    width: 100%;
                    max-width: 100%;
                }

                .laptop-screen {
                    width: 100%;
                    transform: none;
                    transition: none;
                }

                @media (max-width: 640px) {
                    .laptop-container {
                        padding: 0 8px;
                    }
                }

                /* Custom breakpoint for very small screens */
                @media (min-width: 475px) {
                    .xs\\:inline {
                        display: inline;
                    }
                    .xs\\:hidden {
                        display: none;
                    }
                }
            `}</style>
        </div>
    )
}
