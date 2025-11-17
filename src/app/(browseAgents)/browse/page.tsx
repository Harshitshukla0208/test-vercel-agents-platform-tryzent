"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft, Loader2, LogOut, Filter } from "lucide-react"
import Link from "next/link"
import axios from "axios"
import SingleCard from "@/components/Home/Cards/SingleCard"
import Footer from "@/components/Home/Footer"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import LogoImage from '@/assets/logo.jpeg'

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

interface ErrorDetails {
    message: string
    details?: string
}

interface AgentState {
    agents: Agent[]
    loading: boolean
    error: ErrorDetails | null
    totalAgents: number
    currentPage: number
    totalPages: number
    hasMore: boolean
    initialLoad: boolean
    searchLoading: boolean
}

interface SearchParams {
    page?: number
    page_size?: number
    name?: string
    category?: string
}

// Helper function to get cookie value
const getCookie = (name: string): string | null => {
    if (typeof window === "undefined") return null

    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
        return parts.pop()?.split(";").shift() || null
    }
    return null
}

// Loading skeleton component for SingleCard
const SingleCardSkeleton = () => (
    <div className="bg-white border border-gray-100 rounded-xl p-6 animate-pulse w-full max-w-sm mx-auto h-80 flex flex-col shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl"></div>
            <div className="w-20 h-6 bg-gray-100 rounded-full"></div>
        </div>
        <div className="w-3/4 h-6 bg-gray-100 rounded-lg mb-3"></div>
        <div className="w-full h-4 bg-gray-100 rounded mb-2"></div>
        <div className="w-2/3 h-4 bg-gray-100 rounded mb-6"></div>
        <div className="w-32 h-4 bg-gray-100 rounded mb-2"></div>
        <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-4">
                <div className="w-12 h-4 bg-gray-100 rounded"></div>
                <div className="w-16 h-4 bg-gray-100 rounded"></div>
            </div>
            <div className="w-20 h-9 bg-gray-100 rounded-lg"></div>
        </div>
    </div>
)

export default function BrowseAgents() {
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("All")
    const [sortBy, setSortBy] = useState("popular")
    const [pageSize, setPageSize] = useState(20)
    const [state, setState] = useState<AgentState>({
        agents: [],
        loading: true,
        error: null,
        totalAgents: 0,
        currentPage: 1,
        totalPages: 0,
        hasMore: false,
        initialLoad: false,
        searchLoading: false,
    })
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
    const [allCategories, setAllCategories] = useState<string[]>([])
    const [isMobile, setIsMobile] = useState(false)

    // Check for access_token on component mount and when cookies change
    useEffect(() => {
        const checkAuthStatus = () => {
            const accessToken = getCookie("access_token")
            setIsLoggedIn(!!accessToken)
        }

        checkAuthStatus()

        const handleStorageChange = () => {
            checkAuthStatus()
        }

        window.addEventListener("storage", handleStorageChange)

        const interval = setInterval(checkAuthStatus, 1000)

        return () => {
            window.removeEventListener("storage", handleStorageChange)
            clearInterval(interval)
        }
    }, [])

    // Fetch agents from API with search parameters
    const fetchAgents = useCallback(async (params: SearchParams = {}, isLoadMore = false) => {
        try {
            setState((prev) => ({
                ...prev,
                loading: true,
                searchLoading: !!params.name || !!params.category,
                error: null,
            }))

            const searchParams = new URLSearchParams()

            if (params.page) searchParams.append("page", params.page.toString())
            if (params.page_size) searchParams.append("page_size", params.page_size.toString())
            if (params.name) searchParams.append("name", params.name)
            if (params.category && params.category !== "All") {
                searchParams.append("category", params.category)
            }

            const url = `/api/dashboard${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
            const { data } = await axios.get(url)

            if (data && Array.isArray(data.data)) {
                setState((prev) => ({
                    ...prev,
                    agents: isLoadMore ? [...prev.agents, ...data.data] : data.data,
                    totalAgents: data.meta?.total_records || data.data.length,
                    currentPage: data.meta?.page || params.page || 1,
                    totalPages:
                        data.meta?.total_pages ||
                        Math.ceil((data.meta?.total_records || data.data.length) / (params.page_size || 20)),
                    hasMore: data.data.length === (params.page_size || 20),
                    loading: false,
                    searchLoading: false,
                    error: null,
                    initialLoad: true,
                }))
            } else {
                throw new Error("Invalid response format from API")
            }
        } catch (error) {
            console.error("Error fetching agents:", error)

            let errorDetails: ErrorDetails = {
                message: "Failed to fetch agents",
            }

            if (axios.isAxiosError(error) && error.response?.data) {
                errorDetails = {
                    message: error.response.data.error || "Failed to fetch agents",
                    details: error.response.data.details,
                }
            }

            setState((prev) => ({
                ...prev,
                loading: false,
                searchLoading: false,
                error: errorDetails,
                initialLoad: true,
            }))
        }
    }, [])

    // Fetch all categories dynamically from API
    const fetchCategories = useCallback(async () => {
        try {
            // Fetch a large number of agents to get all categories
            const { data } = await axios.get(`/api/dashboard?page=1&page_size=1000`)
            if (data && Array.isArray(data.data)) {
                const categories: string[] = Array.from(
                    new Set(
                        data.data
                            .map((agent: Agent): string => agent.agent_Category ?? "")
                            .filter((category: string): category is string => category !== ""),
                    ),
                )

                setAllCategories(["All", ...categories.sort()])
            }
        } catch (error) {
            console.error("Error fetching categories:", error)
            // Fallback to default categories if API fails
            setAllCategories(["All", "Education", "Audio", "Travel", "Fitness", "General"])
        }
    }, [])

    // Initial load - fetch categories and agents
    useEffect(() => {
        fetchCategories()
        fetchAgents({
            page: 1,
            page_size: pageSize,
        })
    }, [fetchAgents, fetchCategories, pageSize])

    // Debounced search function
    const debouncedSearch = useCallback(
        (searchValue: string, category: string) => {
            if (searchTimeout) {
                clearTimeout(searchTimeout)
            }

            const timeout = setTimeout(() => {
                fetchAgents({
                    page: 1,
                    page_size: pageSize,
                    name: searchValue.trim() || undefined,
                    category: category !== "All" ? category : undefined,
                })
            }, 500) // 500ms delay

            setSearchTimeout(timeout)
        },
        [fetchAgents, pageSize, searchTimeout],
    )

    // Handle search input change
    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchTerm(value)
            debouncedSearch(value, selectedCategory)
        },
        [debouncedSearch, selectedCategory],
    )

    // Handle category change
    const handleCategoryChange = useCallback(
        (category: string) => {
            setSelectedCategory(category)
            debouncedSearch(searchTerm, category)
        },
        [debouncedSearch, searchTerm],
    )

    // Sort agents locally (since API handles search/filter)
    const sortedAgents = useMemo(() => {
        const sorted = [...state.agents]

        return sorted.sort((a, b) => {
            if (sortBy === "popular") return b.execution_count - a.execution_count
            if (sortBy === "rating") return b.agent_rating - a.agent_rating
            if (sortBy === "name") return a.agent_Name.localeCompare(b.agent_Name)
            if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            return 0
        })
    }, [state.agents, sortBy])

    // Load more agents (pagination)
    const loadMoreAgents = useCallback(() => {
        if (state.loading || !state.hasMore) return

        const nextPage = state.currentPage + 1
        fetchAgents(
            {
                page: nextPage,
                page_size: pageSize,
                name: searchTerm.trim() || undefined,
                category: selectedCategory !== "All" ? selectedCategory : undefined,
            },
            true,
        )
    }, [state.loading, state.hasMore, state.currentPage, pageSize, fetchAgents, searchTerm, selectedCategory])

    // Get featured agents (top 4 by rating and execution count)
    const featuredAgents = useMemo(() => {
        return state.agents
            .filter((agent) => agent.agent_rating >= 3.5 && agent.execution_count > 10)
            .sort((a, b) => b.agent_rating * b.execution_count - a.agent_rating * a.execution_count)
            .slice(0, 4)
    }, [state.agents])

    // Clear filters and search
    const clearFilters = useCallback(() => {
        setSearchTerm("")
        setSelectedCategory("All")
        setSortBy("popular")
        fetchAgents({
            page: 1,
            page_size: pageSize,
        })
    }, [fetchAgents, pageSize])

    // Clear search timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout)
            }
        }
    }, [searchTimeout])

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
            document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
            setIsLoggedIn(false)
            window.location.href = "/auth"
        }
    }

    const getOptimalColumns = (itemCount: number, isMobile = false) => {
        if (isMobile) return 1
        if (itemCount <= 3) return itemCount
        if (itemCount <= 6) return 3
        if (itemCount <= 8) return 4
        if (itemCount <= 12) return 4
        return Math.min(5, Math.ceil(Math.sqrt(itemCount)))
    }

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener("resize", checkMobile)

        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const optimalColumns = getOptimalColumns(sortedAgents.length, isMobile)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <Image
                                src={LogoImage}
                                alt="AgentHub Logo"
                                width={28}
                                height={28}
                                className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg shadow-sm"
                            />
                            <div className="flex flex-col">
                                <Link href='/'>
                                    <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">AgentHub</span>
                                </Link>
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

                        <div className="flex-1 max-w-md mx-4 sm:mx-8 hidden md:block">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                {state.searchLoading && (
                                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 h-4 w-4 animate-spin" />
                                )}
                                <Input
                                    placeholder="Search AI agents..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-10 pr-10 py-2 text-sm rounded-lg border-gray-200 bg-white/90 shadow-sm hover:shadow-md focus:shadow-md transition-shadow w-full"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            {isLoggedIn ? (
                                <motion.button
                                    onClick={handleLogout}
                                    className="flex gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium shadow-sm hover:shadow-md"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">Logout</span>
                                </motion.button>
                            ) : (
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Link href="/auth?view=signup">
                                        <motion.button
                                            className="border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <span className="hidden sm:inline">Get Started</span>
                                            <span className="sm:hidden">Get Started</span>
                                        </motion.button>
                                    </Link>
                                    <Link href="/auth">
                                        <motion.button
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg font-medium shadow-sm hover:shadow-md"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Sign In
                                        </motion.button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <section className="relative py-4 px-2 sm:py-8 lg:py-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
                <div className="relative max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-6 sm:mb-8"
                    >
                        <Link
                            href="/"
                            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors group mb-4 sm:mb-6 text-sm sm:text-base"
                        >
                            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Home
                        </Link>

                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                            Discover AI
                            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {" "}
                                Agents
                            </span>
                        </h1>

                        <p className="text-sm sm:text-lg lg:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
                            Explore our comprehensive collection of AI agents designed to automate tasks, boost productivity, and
                            transform your workflow across every industry.
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="py-2 sm:py-2 px-4 bg-white/60 backdrop-blur-sm border-y border-gray-100">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col space-y-3 sm:space-y-4">
                        <div className="flex justify-center md:hidden">
                            <div className="relative w-full max-w-2xl">
                                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                                {state.searchLoading && (
                                    <Loader2 className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-blue-600 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                                )}
                                <Input
                                    placeholder="Search for AI agents..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-4 text-xs sm:text-base rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md focus:shadow-md transition-shadow w-full"
                                />
                            </div>
                        </div>

                        <div className="flex flex-row sm:flex-row items-center justify-center gap-2 sm:gap-3 lg:gap-8">
                            <div className="flex items-center gap-1 sm:gap-3">
                                <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                <span className="text-xs sm:text-sm font-medium text-gray-700">Category:</span>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    className="border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white shadow-sm hover:shadow-md focus:shadow-md transition-shadow min-w-[50px] sm:min-w-[140px]"
                                >
                                    {allCategories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-3">
                                <span className="text-xs sm:text-sm font-medium text-gray-700">Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white shadow-sm hover:shadow-md focus:shadow-md transition-shadow min-w-[80px] sm:min-w-[160px]"
                                >
                                    <option value="popular">Most Popular</option>
                                    <option value="rating">Highest Rated</option>
                                    <option value="name">Name A-Z</option>
                                    <option value="newest">Newest</option>
                                </select>
                            </div>
                        </div>

                        <AnimatePresence>
                            {!state.loading && state.initialLoad && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-center"
                                >
                                    <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                                        {state.totalAgents > 0 ? (
                                            <>
                                                {state.agents.length} of {state.totalAgents} agents
                                                {searchTerm && ` matching "${searchTerm}"`}
                                                {selectedCategory !== "All" && ` in ${selectedCategory}`}
                                            </>
                                        ) : (
                                            "No agents found"
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {state.loading && !state.initialLoad && (
                <section className="py-16 px-4">
                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center mb-12"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                            </div>
                            <span className="text-lg text-gray-600 mt-4 font-medium">Loading AI agents...</span>
                        </motion.div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, index) => (
                                <SingleCardSkeleton key={index} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {state.error && (
                <section className="py-16 px-4">
                    <div className="max-w-md mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border border-red-100 rounded-2xl p-8 shadow-lg"
                        >
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{state.error.message}</h3>
                            {state.error.details && <p className="text-gray-600 text-sm mb-6">{state.error.details}</p>}
                            <Button
                                onClick={() => fetchAgents({ page: 1, page_size: pageSize })}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
                            >
                                Try Again
                            </Button>
                        </motion.div>
                    </div>
                </section>
            )}

            {state.initialLoad && !state.error && (
                <section className="py-6 sm:py-12 px-4 min-h-[60vh]">
                    <div className="max-w-7xl mx-auto">
                        {sortedAgents.length > 0 ? (
                            <div className="space-y-6 sm:space-y-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <div
                                        className={`grid gap-4 sm:gap-6 justify-items-center ${isMobile
                                            ? "grid-cols-1"
                                            : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-${Math.min(optimalColumns, 4)}`
                                            }`}
                                    >
                                        {sortedAgents.map((agent, index) => (
                                            <motion.div
                                                key={agent.agent_id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                                className="w-full max-w-sm"
                                            >
                                                <SingleCard
                                                    title={agent.agent_Name}
                                                    description={agent.agent_description}
                                                    executionCount={agent.execution_count}
                                                    executionCredit={agent.execution_credit}
                                                    rating={agent.agent_rating}
                                                    agent_id={agent.agent_id}
                                                    agent_Type={agent.agent_Type}
                                                    agent_Category={agent.agent_Category}
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12 sm:py-20"
                            >
                                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                    <Search className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">No agents found</h3>
                                <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-4">
                                    {searchTerm || selectedCategory !== "All"
                                        ? "We couldn't find any agents matching your criteria. Try adjusting your search terms or filters."
                                        : "No agents are available at the moment. Please check back later."}
                                </p>
                                {(searchTerm || selectedCategory !== "All") && (
                                    <Button
                                        onClick={clearFilters}
                                        variant="outline"
                                        className="border-gray-300 text-gray-600 hover:bg-gray-50 bg-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all text-sm sm:text-base"
                                    >
                                        Clear All Filters
                                    </Button>
                                )}
                            </motion.div>
                        )}

                        {state.hasMore && !state.loading && sortedAgents.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mt-12 sm:mt-16"
                            >
                                <Button
                                    onClick={loadMoreAgents}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all font-medium"
                                    disabled={state.loading}
                                >
                                    {state.loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                                            <span className="text-sm sm:text-base">Loading more agents...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-sm sm:text-base">Load More Agents</span>
                                            <span className="ml-2 text-blue-100 text-xs sm:text-sm">
                                                ({state.totalAgents - state.agents.length} remaining)
                                            </span>
                                        </>
                                    )}
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </section>
            )}

            {/* Footer */}
            <Footer />
        </div>
    )
}
