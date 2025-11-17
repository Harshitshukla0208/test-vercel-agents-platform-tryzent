"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { History, Calendar, Clock, FileText, Zap, ChevronRight, AlertCircle, ChevronDown, Plus, Star } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import PopupLoader from "@/components/PopupLoader"
import Cookies from "js-cookie"

interface HistoryItem {
    execution_id: string
    thread_id: string
    user_inputs: Array<{
        variable: string
        variable_value: string
    }>
    createdAt?: string
    updatedAt?: string
    filename?: string | null
    agent_rating?: number
    agent_feedback?: string
}

interface ThreadGroup {
    [thread_id: string]: HistoryItem[]
}

interface TestPaperHistoryProps {
    onHistoryItemClick: (execution_id: string, agent_id: string) => Promise<void>
    containerRef?: React.RefObject<HTMLDivElement | null>
    refreshTrigger: number
    className?: string
    formHeight?: number
    responseHeight?: number
    onCreateNew?: () => void
    selectedExecutionId?: string // NEW: execution ID of currently selected history
    preventAutoSelect?: boolean  // NEW: Prevent auto-select after fresh generation
}

const TestPaperHistory: React.FC<TestPaperHistoryProps> = ({
    onHistoryItemClick,
    containerRef,
    refreshTrigger,
    className = "",
    formHeight = 0,
    responseHeight = 0,
    onCreateNew,
    selectedExecutionId,
    preventAutoSelect = false,
}) => {
    const [historyData, setHistoryData] = useState<ThreadGroup>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [agent_id, setAgentId] = useState<string>("")
    const [dynamicHeight, setDynamicHeight] = useState("600px")
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
    const shouldAutoSelectRef = useRef<boolean>(false)
    const [showHistoryLoader, setShowHistoryLoader] = useState(false)

    // Calculate dynamic height based on form and response sections
    useEffect(() => {
        const calculateHeight = () => {
            let targetHeight = 600 // Default minimum height

            // Get actual heights from DOM elements
            const formElement = document.querySelector("[data-form-section]") as HTMLElement
            const responseElement = document.querySelector("[data-response-section]") as HTMLElement

            let actualFormHeight = 0
            let actualResponseHeight = 0

            if (formElement) {
                actualFormHeight = formElement.getBoundingClientRect().height
            }

            if (responseElement) {
                actualResponseHeight = responseElement.getBoundingClientRect().height
            }

            // Use the actual heights if available, otherwise use props
            const currentFormHeight = actualFormHeight || formHeight
            const currentResponseHeight = actualResponseHeight || responseHeight

            if (currentFormHeight > 0 && currentResponseHeight > 0) {
                // When both sections exist, use the total height
                targetHeight = currentFormHeight + currentResponseHeight + 50 // Add some padding
            } else if (currentFormHeight > 0) {
                // When only form exists, match form height with some extra space
                targetHeight = Math.max(currentFormHeight + 100, 600)
            } else if (currentResponseHeight > 0) {
                // When only response exists, match response height
                targetHeight = Math.max(currentResponseHeight, 600)
            } else {
                // Fallback to viewport-based calculation
                const viewportHeight = window.innerHeight
                const headerHeight = 120
                const padding = 100
                const availableHeight = viewportHeight - headerHeight - padding
                targetHeight = Math.max(400, Math.min(800, availableHeight))
            }

            // Ensure reasonable bounds
            const finalHeight = Math.max(400, Math.min(1400, targetHeight))
            setDynamicHeight(`${finalHeight}px`)
        }

        // Initial calculation
        calculateHeight()

        // Recalculate after a short delay to ensure DOM is updated
        const timeoutId = setTimeout(calculateHeight, 200)

        // Add resize observer for better tracking
        const resizeObserver = new ResizeObserver(() => {
            setTimeout(calculateHeight, 100)
        })

        const formElement = document.querySelector("[data-form-section]")
        const responseElement = document.querySelector("[data-response-section]")

        if (formElement) resizeObserver.observe(formElement)
        if (responseElement) resizeObserver.observe(responseElement)

        return () => {
            clearTimeout(timeoutId)
            resizeObserver.disconnect()
        }
    }, [formHeight, responseHeight, refreshTrigger])

    useEffect(() => {
        // Extract agent_id from URL path
        const pathArray = window.location.pathname.split("/")
        const currentAgentId = pathArray[pathArray.length - 1]
        setAgentId(currentAgentId)

        if (currentAgentId) {
            fetchHistory(currentAgentId)
        }
    }, [refreshTrigger])

    // Refresh trigger effect
    useEffect(() => {
        if (refreshTrigger && agent_id) {
            // Mark that this fetch is user-triggered (new version/modification)
            shouldAutoSelectRef.current = true
            fetchHistory(agent_id)
        }
    }, [refreshTrigger, agent_id])

    // Auto-select latest item only when user triggered (refreshTrigger) and no current selection
    useEffect(() => {
        // SKIP auto-select if prevented (after fresh generation)
        if (preventAutoSelect) {
            console.log('🚫 TestPaperHistory: Auto-select PREVENTED (fresh generation)');
            shouldAutoSelectRef.current = false;  // Reset flag
            return;
        }
        
        if (!shouldAutoSelectRef.current) return
        if (Object.keys(historyData).length > 0 && !selectedExecutionId) {
            // Find the most recent item across all threads
            let mostRecentItem: HistoryItem | null = null
            let mostRecentDate = new Date(0)

            Object.entries(historyData).forEach(([threadId, items]: [string, HistoryItem[]]) => {
                if (Array.isArray(items) && items.length > 0) {
                    const latestItem: HistoryItem = items[items.length - 1] // Last item is the latest
                    const itemDate = new Date(latestItem.updatedAt || latestItem.createdAt || new Date())
                    if (itemDate > mostRecentDate) {
                        mostRecentDate = itemDate
                        mostRecentItem = latestItem
                    }
                }
            })

            // Auto-select the most recent item only for user-triggered updates and no current selection
            if (mostRecentItem && agent_id && "execution_id" in mostRecentItem) {
                console.log('✅ TestPaperHistory: Auto-selecting history item');
                setShowHistoryLoader(true)
                Promise.resolve(onHistoryItemClick((mostRecentItem as any).execution_id, agent_id))
                    .catch(() => {})
                    .finally(() => setShowHistoryLoader(false))
            }
            // Reset the flag
            shouldAutoSelectRef.current = false
        }
    }, [historyData, agent_id, onHistoryItemClick, selectedExecutionId, preventAutoSelect])

    const fetchHistory = async (agentId: string) => {
        try {
            setLoading(true)
            setError(null)

            const accessToken = Cookies.get("access_token")
            if (!accessToken) {
                throw new Error("Access token not found")
            }

            const response = await fetch(`/api/get-history/${agentId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            if (data.status && data.data) {
                setHistoryData(data.data)
            } else {
                throw new Error(data.message || "Failed to fetch history")
            }
        } catch (error) {
            console.error("Error fetching history:", error)
            setError(error instanceof Error ? error.message : "Failed to load history")
            toast({
                title: "Error",
                description: "Failed to load history. Please try again.",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setLoading(false)
        }
    }

    const getInputValue = (inputs: HistoryItem["user_inputs"], variable: string): string => {
        const input = inputs.find((item) => item.variable === variable)
        return input?.variable_value || ""
    }

    const formatDate = (dateString: string): string => {
        try {
            if (!dateString || dateString.trim() === '') {
                return 'Unknown date';
            }
            
            // Ensure the date string is treated as UTC
            let date: Date;
            
            // Check if it already has timezone indicator (Z or +/-)
            if (dateString.endsWith('Z') || dateString.includes('+') || (dateString.includes('-') && dateString.lastIndexOf('-') > 10)) {
                // Already has timezone info
                date = new Date(dateString);
            } else if (dateString.includes('T')) {
                // ISO format but no timezone - treat as UTC by adding Z
                date = new Date(dateString + 'Z');
            } else {
                // Other format without timezone - assume UTC
                date = new Date(dateString + ' UTC');
            }
            
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                // Display in local timezone
                return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })
            } else if (diffHrs > 0) {
                return `${diffHrs}h ${diffMins}m ago`
            } else if (diffMins > 0) {
                return `${diffMins}m ago`
            } else {
                return "Just now"
            }
        } catch (error) {
            console.error('Error formatting date:', error, 'Date string:', dateString);
            return dateString;
        }
    }

    const handleHistoryClick = async (item: HistoryItem) => {
        try {
            setShowHistoryLoader(true)
            await onHistoryItemClick(item.execution_id, agent_id)
            // toast({
            //     title: "History Loaded",
            //     description: "Previous test paper configuration has been loaded.",
            //     duration: 2000,
            // })
        } catch (error) {
            console.error("Error loading history item:", error)
            toast({
                title: "Error",
                description: "Failed to load history item. Please try again.",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setShowHistoryLoader(false)
        }
    }

    const toggleThreadExpansion = (threadId: string) => {
        const newExpanded = new Set(expandedThreads)
        if (newExpanded.has(threadId)) {
            newExpanded.delete(threadId)
        } else {
            newExpanded.add(threadId)
        }
        setExpandedThreads(newExpanded)
    }

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                        key={star} 
                        className={`w-3 h-3 ${
                            star <= rating 
                                ? "text-yellow-400 fill-yellow-400" 
                                : "text-gray-300"
                        }`}
                    />
                ))}
                <span className="ml-1 text-xs text-gray-600">({rating}/5)</span>
            </div>
        )
    }

    const getThreadSummary = (userInputs: HistoryItem["user_inputs"]) => {
        const summary: string[] = []

        // Add key fields to summary
        const keyFields = ['subject', 'grade', 'topic', 'chapter']
        keyFields.forEach(field => {
            const input = userInputs.find(input =>
                input.variable.toLowerCase().includes(field)
            )
            if (input && input.variable_value) {
                summary.push(`${input.variable.replace(/_/g, ' ')}: ${input.variable_value}`)
            }
        })

        return summary.slice(0, 2).join(' • ')
    }

    if (loading) {
        return (
            <div className={`space-y-4 ${className}`} style={{ height: dynamicHeight }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <History className="w-3 h-3 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Test Paper History</h3>
                        <p className="text-xs text-gray-500">Previous generations</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {[...Array(3)].map((_, index) => (
                        <Card key={index} className="border-indigo-200">
                            <CardContent className="p-3">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Skeleton className="h-5 w-12" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={`${className}`} style={{ height: dynamicHeight }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <History className="w-3 h-3 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Test Paper History</h3>
                        <p className="text-xs text-gray-500">Previous generations</p>
                    </div>
                </div>

                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Error loading history</span>
                        </div>
                        <p className="text-sm text-red-600 mb-3">{error}</p>
                        <Button
                            onClick={() => fetchHistory(agent_id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-100 bg-transparent"
                        >
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className={`${className}`} style={{ height: dynamicHeight }}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Test History</h2>
                        <p className="text-xs text-gray-600">Previous test papers & feedback</p>
                    </div>
                </div>
            </div>

            {/* Create New Button */}
            {onCreateNew && (
                <div className="p-3 border-b border-gray-100 bg-white">
                    <button
                        type="button"
                        onClick={onCreateNew}
                        className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create New
                    </button>
                </div>
            )}

            {Object.keys(historyData).length === 0 ? (
                <div className="p-6">
                    <Card className="border-gray-200">
                        <CardContent className="p-6 text-center">
                            <FileText className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                            <h4 className="text-sm font-medium text-gray-900 mb-2">No History Found</h4>
                            <p className="text-xs text-gray-500">Generate your first test paper to see it appear here.</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <ScrollArea style={{ height: `calc(${dynamicHeight} - ${onCreateNew ? '160px' : '120px'})` }}>
                    <div className="p-3 space-y-3">
                        {Object.entries(historyData).map(([threadId, items]) => {
                            if (!Array.isArray(items) || items.length === 0) return null

                            // Sort items by date to ensure latest is last (chronological order: oldest to newest)
                            const sortedItems = [...items].sort((a, b) => {
                                const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                                const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                                return dateA - dateB; // Oldest first, newest last
                            });

                            const latestItem = sortedItems[sortedItems.length - 1] // Last item is the latest
                            const isExpanded = expandedThreads.has(threadId)
                            const hasMultipleVersions = sortedItems.length > 1
                            const subjectName = getInputValue(latestItem.user_inputs, "subject")
                            const boardName = getInputValue(latestItem.user_inputs, "board")
                            const gradeName = getInputValue(latestItem.user_inputs, "grade")
                            const duration = getInputValue(latestItem.user_inputs, "duration")
                            const totalMarks = getInputValue(latestItem.user_inputs, "total_marks")
                            const isSelected = latestItem.execution_id === selectedExecutionId

                            return (
                                <div key={threadId} className="space-y-2">
                                    {/* Main Thread Card */}
                                    <div
                                        className={`group relative bg-white rounded-xl border-1 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-100 shadow-xl ring-2 ring-indigo-400'
                                                : 'border-gray-100 hover:border-gray-200'
                                        } ${isSelected ? 'after:absolute after:left-0 after:top-0 after:bottom-0 after:w-2 after:bg-indigo-600 after:rounded-l-xl after:content-[]' : ''}`}
                                        onClick={() => handleHistoryClick(latestItem)}
                                    >
                                        <div className="p-4">
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-3 gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                                        <FileText className="w-3 h-3 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            {subjectName ? subjectName.charAt(0).toUpperCase() + subjectName.slice(1) : 'Test Paper'}
                                                        </span>
                                                        <p className="text-xs text-gray-500">
                                                            {boardName ? boardName.toUpperCase() : ''} {gradeName ? `• Grade ${gradeName}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                {hasMultipleVersions && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            toggleThreadExpansion(threadId)
                                                        }}
                                                        className="pl-1 hover:bg-indigo-100 rounded transition-colors"
                                                    >
                                                        <ChevronDown
                                                            className={`w-4 h-4 text-indigo-600 transition-transform ${
                                                                isExpanded ? 'rotate-180' : ''
                                                            }`}
                                                        />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Metadata Badges */}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {boardName && (
                                                    <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                                                        {boardName.toUpperCase()}
                                                    </Badge>
                                                )}
                                                {gradeName && (
                                                    <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                                        Grade {gradeName}
                                                    </Badge>
                                                )}
                                                {subjectName && (
                                                    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                        {subjectName}
                                                    </Badge>
                                                )}
                                                    {hasMultipleVersions && (
                                                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                                            {sortedItems.length} version{sortedItems.length > 1 ? 's' : ''}
                                                        </Badge>
                                                    )}
                                            </div>

                                            {/* Rating and Feedback Display */}
                                            {(latestItem.agent_rating || latestItem.agent_feedback) && (
                                                <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg border">
                                                    {latestItem.agent_rating && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-medium text-gray-600">Rating</span>
                                                            {renderStars(latestItem.agent_rating)}
                                                        </div>
                                                    )}
                                                    {latestItem.agent_feedback && (
                                                        <div className="space-y-1">
                                                            <span className="text-xs font-medium text-gray-600">Feedback</span>
                                                            <p className="text-xs text-gray-700 bg-white p-2 rounded border text-left">
                                                                {latestItem.agent_feedback}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Stats Footer */}
                                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                <div className="flex items-center gap-4 text-xs text-gray-600">
                                                    {duration && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{duration}m</span>
                                                        </div>
                                                    )}
                                                    {totalMarks && (
                                                        <div className="flex items-center gap-1">
                                                            <Zap className="w-3 h-3" />
                                                            <span>{totalMarks} marks</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(latestItem.updatedAt || latestItem.createdAt || '')}
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Effect */}
                                        <div
                                            className={`absolute inset-0 rounded-xl transition-opacity duration-200 pointer-events-none ${
                                                isSelected
                                                    ? 'bg-indigo-500/5'
                                                    : 'bg-indigo-500/0 group-hover:bg-indigo-500/5'
                                            }`}
                                        />
                                    </div>

                                    {/* Version Dropdown */}
                                    {isExpanded && hasMultipleVersions && (
                                        <div className="ml-4 space-y-2 border-l-2 border-indigo-200 pl-4">
                                            {sortedItems.slice(0, -1).reverse().map((item, index) => {
                                                const itemSubjectName = getInputValue(item.user_inputs, "subject")
                                                const itemBoardName = getInputValue(item.user_inputs, "board")
                                                const itemGradeName = getInputValue(item.user_inputs, "grade")
                                                const itemDuration = getInputValue(item.user_inputs, "duration")
                                                const itemTotalMarks = getInputValue(item.user_inputs, "total_marks")
                                                const itemIsSelected = item.execution_id === selectedExecutionId
                                                // Version 1 is the most recent previous (second newest), Version 2 is next oldest, etc.
                                                const versionNumber = index + 1

                                                return (
                                                    <div
                                                        key={item.execution_id}
                                                        className={`group relative bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                                                            itemIsSelected
                                                                ? 'border-indigo-600 bg-indigo-100 shadow-xl'
                                                                : 'border-gray-100 hover:border-gray-200'
                                                        }`}
                                                        onClick={() => handleHistoryClick(item)}
                                                    >
                                                        <div className="p-3">
                                                            {/* Version Header */}
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-5 h-5 bg-indigo-100 rounded-md flex items-center justify-center">
                                                                    <FileText className="w-2.5 h-2.5 text-indigo-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-medium text-indigo-800">
                                                                            Version {versionNumber}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 truncate">
                                                                        {itemSubjectName || 'Test Paper'}
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    {formatDate(item.updatedAt || item.createdAt || '')}
                                                                </div>
                                                            </div>

                                                            {/* Version Badges */}
                                                            <div className="flex flex-wrap gap-1 mb-2">
                                                                {itemBoardName && (
                                                                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-200">
                                                                        {itemBoardName.toUpperCase()}
                                                                    </Badge>
                                                                )}
                                                                {itemGradeName && (
                                                                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200">
                                                                        Grade {itemGradeName}
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Version Rating */}
                                                            {(item.agent_rating || item.agent_feedback) && (
                                                                <div className="space-y-1 p-2 bg-gray-50 rounded border mb-2">
                                                                    {item.agent_rating && (
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs text-gray-600">Rating</span>
                                                                            {renderStars(item.agent_rating)}
                                                                        </div>
                                                                    )}
                                                                    {item.agent_feedback && (
                                                                        <div className="space-y-1">
                                                                            <span className="text-xs text-gray-600">Feedback</span>
                                                                            <p className="text-xs text-gray-700 bg-white p-1.5 rounded text-left line-clamp-2">
                                                                                {item.agent_feedback}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Version Stats */}
                                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                                <div className="flex items-center gap-3">
                                                                    {itemDuration && (
                                                                        <div className="flex items-center gap-1">
                                                                            <Clock className="w-2.5 h-2.5" />
                                                                            <span>{itemDuration}m</span>
                                                                        </div>
                                                                    )}
                                                                    {itemTotalMarks && (
                                                                        <div className="flex items-center gap-1">
                                                                            <Zap className="w-2.5 h-2.5" />
                                                                            <span>{itemTotalMarks} marks</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                            </div>
                                                        </div>

                                                        {/* Version Hover Effect */}
                                                        <div
                                                            className={`absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none ${
                                                                itemIsSelected
                                                                    ? 'bg-indigo-500/5'
                                                                    : 'bg-indigo-500/0 group-hover:bg-indigo-500/5'
                                                            }`}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            )}

            {/* Global loader for history item selection */}
            <PopupLoader open={showHistoryLoader} label="Loading history…" />
        </div>
    )
}

export default TestPaperHistory