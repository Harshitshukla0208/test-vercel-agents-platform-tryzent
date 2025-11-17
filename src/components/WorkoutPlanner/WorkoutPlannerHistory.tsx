"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { RefreshCcw, Clock, Dumbbell, ChevronDown, Plus } from "lucide-react"
import { usePathname, useSearchParams } from "next/navigation"
import HistorySkeletonLoader from "@/components/Content/HistoryComponentSkeleton"
import PopupLoader from "@/components/PopupLoader"

interface VariableInput {
    variable: string
    variable_value: string
}

interface HistoryItem {
    execution_id: string
    thread_id: string
    user_inputs: VariableInput[]
    createdAt?: string
    updatedAt?: string
}

interface ThreadGroup {
    [thread_id: string]: HistoryItem[]
}

interface HistoryResponse {
    status: boolean
    message: string
    data: ThreadGroup
}

interface ApiError {
    error: string
}

interface WorkoutHistorySidebarProps {
    onHistoryItemClick: (executionToken: string, agent_id: string) => void
    containerRef?: React.RefObject<HTMLDivElement | null>
    refreshTrigger?: number
    onCreateNew?: () => void
}

const WorkoutHistorySidebar: React.FC<WorkoutHistorySidebarProps> = ({
    onHistoryItemClick,
    containerRef,
    refreshTrigger,
    onCreateNew,
}) => {
    const [history, setHistory] = useState<ThreadGroup>({})
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedItem, setSelectedItem] = useState<string | null>(null)
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
    const [maxHeight, setMaxHeight] = useState<string>("920px")
    const sidebarRef = useRef<HTMLDivElement>(null)
    const shouldAutoSelectRef = useRef<boolean>(false)
    const [showHistoryLoader, setShowHistoryLoader] = useState(false)

    // Safe navigation hooks usage
    const searchParams = useSearchParams()
    const pathname = usePathname()

    // Safe parameter extraction
    const agentType = searchParams ? (searchParams.get("agentType") ?? "Other") : "Other"

    // Safe pathname parsing
    const pathArray = pathname?.split("/").filter(Boolean) || []
    const agent_id = pathArray.length > 0 ? pathArray[pathArray.length - 1] : ""

    // Helper function to normalize user inputs
    const normalizeUserInputs = (userInputs: any[]): VariableInput[] => {
        if (!Array.isArray(userInputs)) return []

        return userInputs.filter((input) => {
            return (
                input &&
                typeof input.variable === "string" &&
                typeof input.variable_value === "string" &&
                input.variable !== "agent_id" &&
                input.variable !== "Agent_inputs"
            )
        })
    }

    const fetchHistory = async () => {
        if (!agent_id) {
            setError("Agent ID not found in URL")
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/get-history/${agent_id}`)

            if (!response.ok) {
                throw new Error(`Failed to fetch history: ${response.status} ${response.statusText}`)
            }

            const result = (await response.json()) as HistoryResponse | ApiError

            if ("error" in result) {
                throw new Error(result.error)
            }

            if (!result.data || typeof result.data !== "object") {
                throw new Error("Invalid response format")
            }

            // Process the data to handle the new thread-based structure
            const processedData: ThreadGroup = {}
            Object.entries(result.data).forEach(([threadId, items]) => {
                if (Array.isArray(items)) {
                    processedData[threadId] = items.map((item) => ({
                        ...item,
                        user_inputs: normalizeUserInputs(item.user_inputs),
                    }))
                }
            })

            setHistory(processedData)
        } catch (err) {
            console.error("History fetch error:", err)
            setError(err instanceof Error ? err.message : "An error occurred while fetching history")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (agent_id) {
            fetchHistory()
        }
    }, [agent_id])

    // Refresh trigger effect
    useEffect(() => {
        if (refreshTrigger && agent_id) {
            // Mark that this fetch is user-triggered (new version/modification)
            shouldAutoSelectRef.current = true
            fetchHistory()
        }
    }, [refreshTrigger, agent_id])

    // Auto-select latest item only when user triggered (refreshTrigger)
    useEffect(() => {
        if (!shouldAutoSelectRef.current) return
        if (Object.keys(history).length > 0) {
            // Find the most recent item across all threads
            let mostRecentItem: HistoryItem | null = null
            let mostRecentDate = new Date(0)

            Object.values(history).forEach((items: HistoryItem[]) => {
                if (Array.isArray(items) && items.length > 0) {
                    const sortedItems = [...items].sort((a, b) => {
                        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
                        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
                        return dateA - dateB
                    })
                    const latestItem = sortedItems[sortedItems.length - 1]
                    const itemDate = new Date(latestItem.updatedAt || latestItem.createdAt || new Date())
                    if (itemDate > mostRecentDate) {
                        mostRecentDate = itemDate
                        mostRecentItem = latestItem
                    }
                }
            })

            // Auto-select the most recent item only for user-triggered updates
            if (mostRecentItem && (mostRecentItem as any).execution_id) {
                setSelectedItem((mostRecentItem as any).execution_id)
            }
            // Reset the flag
            shouldAutoSelectRef.current = false;
        }
    }, [history]);

    useEffect(() => {
        const updateHeight = () => {
            if (containerRef?.current) {
                const containerHeight = containerRef.current.offsetHeight
                if (containerHeight > 0) {
                    setMaxHeight(`${containerHeight + 330}px`)
                }
            }
        }

        updateHeight()

        const handleResize = () => updateHeight()
        window.addEventListener("resize", handleResize)

        let observer: MutationObserver | null = null
        if (containerRef?.current) {
            observer = new MutationObserver(updateHeight)
            observer.observe(containerRef.current, {
                attributes: true,
                childList: true,
                subtree: true,
            })
        }

        return () => {
            window.removeEventListener("resize", handleResize)
            observer?.disconnect()
        }
    }, [containerRef])

    const loadHistoryItem = (execution_id: string, agentId: string) => {
        if (!agentId || !execution_id) return

        setShowHistoryLoader(true)
        Promise.resolve(onHistoryItemClick(execution_id, agentId))
            .catch((error) => {
                console.error("Error loading history item:", error)
            })
            .finally(() => setShowHistoryLoader(false))
    }

    const handleHistoryClick = (execution_id: string) => {
        if (!agent_id || !execution_id) return

        setSelectedItem(execution_id)
        loadHistoryItem(execution_id, agent_id)
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

    const formatDate = (dateString: string) => {
        try {
            if (!dateString || dateString.trim() === "") {
                return "Unknown date"
            }

            let date: Date

            if (
                dateString.endsWith("Z") ||
                dateString.includes("+") ||
                (dateString.includes("-") && dateString.lastIndexOf("-") > 10)
            ) {
                date = new Date(dateString)
            } else if (dateString.includes("T")) {
                date = new Date(`${dateString}Z`)
            } else {
                date = new Date(`${dateString} UTC`)
            }

            const now = new Date()
            let diffMs = now.getTime() - date.getTime()

            if (diffMs < 0) {
                diffMs = 0
            }

            const diffMins = Math.floor(diffMs / (1000 * 60))
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

            if (diffDays > 0) {
                return date.toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                })
            }

            if (diffHrs > 0) {
                const remainingMins = diffMins - diffHrs * 60
                return `${diffHrs}h${remainingMins > 0 ? ` ${remainingMins}m` : ""} ago`
            }

            if (diffMins > 0) {
                return `${diffMins}m ago`
            }

            return "Just now"
        } catch (error) {
            console.error("Error formatting date:", error, "Date string:", dateString)
            return "Invalid date"
        }
    }

    const getDisplayValue = (variable: string, value: string) => {
        // Format variable names for better display
        const formattedVariable = variable.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        return { variable: formattedVariable, value }
    }

    const getWorkoutType = (inputs: VariableInput[]) => {
        const userTypeInput = inputs.find((input) => input.variable.toLowerCase() === "user_type")
        return userTypeInput ? userTypeInput.variable_value : "Workout Plan"
    }

    const getPrimaryDisplayField = (inputs: VariableInput[]) => {
        const userTypeInput = inputs.find((input) => input.variable.toLowerCase() === "user_type")
        if (userTypeInput) {
            return { type: "user_type", value: userTypeInput.variable_value, icon: Dumbbell }
        }
        return null
    }

    const getPrimaryFields = (inputs: VariableInput[]) => {
        const primaryFields = ["fitness_level", "total_weeks", "available_days_per_week"]
        return inputs.filter((input) => primaryFields.includes(input.variable))
    }

    const getSecondaryFields = (inputs: VariableInput[]) => {
        const excludeFields = ["user_type", "fitness_level", "total_weeks", "available_days_per_week"]
        return inputs.filter((input) => !excludeFields.includes(input.variable))
    }

    const getThreadSummary = (userInputs: VariableInput[]) => {
        const summary: string[] = []

        // Add key fields to summary
        const keyFields = ["workout_type", "fitness_goal", "duration", "intensity"]
        keyFields.forEach((field) => {
            const input = userInputs.find((input) => input.variable.toLowerCase().includes(field))
            if (input && input.variable_value) {
                summary.push(`${input.variable.replace(/_/g, " ")}: ${input.variable_value}`)
            }
        })

        return summary.slice(0, 2).join(" • ")
    }

    return (
        <>
            <div className="w-72 bg-transparent h-full" ref={sidebarRef}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-indigo-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Workout History</h2>
                        <p className="text-xs text-gray-600">Previous fitness plans & feedback</p>
                    </div>
                </div>
            </div>

            {/* Create New Button */}
            {onCreateNew && (
                <div className="p-3 border-b border-gray-100 bg-white">
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedItem(null)
                            shouldAutoSelectRef.current = false
                            onCreateNew()
                        }}
                        className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create New
                    </button>
                </div>
            )}

            {/* Content */}
            <div
                className="flex-1 overflow-y-auto"
                style={{
                    height: maxHeight,
                    minHeight: "400px",
                }}
            >
                <div className="p-3">
                    {isLoading && <HistorySkeletonLoader />}
                    {error && (
                        <div className="text-indigo-500 text-xs text-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            {error}
                        </div>
                    )}
                    {!agent_id && !isLoading && (
                        <div className="text-gray-500 text-xs text-center p-3">No agent ID found in URL</div>
                    )}
                    {!isLoading && !error && agent_id && (
                        <div className="space-y-3">
                            {Object.keys(history).length === 0 ? (
                                <div className="text-gray-500 text-xs text-center p-6">
                                    <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                                    No workout plans found
                                </div>
                            ) : (
                                Object.entries(history).map(([threadId, items]) => {
                                    if (!Array.isArray(items) || items.length === 0) return null
                                    const sortedItems = [...items].sort((a, b) => {
                                        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
                                        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
                                        return dateA - dateB
                                    })

                                    const latestItem = sortedItems[sortedItems.length - 1]
                                    const isExpanded = expandedThreads.has(threadId)
                                    const hasMultipleVersions = sortedItems.length > 1
                                    const workoutType = getWorkoutType(latestItem.user_inputs)
                                    const isSelected = selectedItem === latestItem.execution_id
                                    const primaryDisplayField = getPrimaryDisplayField(latestItem.user_inputs)
                                    const primaryFields = getPrimaryFields(latestItem.user_inputs)
                                    const secondaryFields = getSecondaryFields(latestItem.user_inputs)

                                    return (
                                        <div key={threadId} className="space-y-2">
                                            {/* Main Thread Card */}
                                            <div
                                                className={`group relative bg-white rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                                                        ? "border-indigo-500 bg-indigo-50 shadow-lg"
                                                        : "border-gray-100 hover:border-gray-200"
                                                    }`}
                                                onClick={() => handleHistoryClick(latestItem.execution_id)}
                                            >
                                                <div className="p-4">
                                                    {/* Workout Header */}
                                                    <div className="flex items-start justify-between mb-3">
                                                        {primaryDisplayField ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                                    <primaryDisplayField.icon className="w-5 h-5 text-white" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                                                                        {primaryDisplayField.value
                                                                            .charAt(0)
                                                                            .toUpperCase() +
                                                                            primaryDisplayField.value.slice(1)}{" "}
                                                                        Workout
                                                                    </h3>
                                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                                        Fitness Plan
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                                    <Dumbbell className="w-5 h-5 text-indigo-600" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-sm font-semibold text-gray-900">
                                                                        {workoutType}
                                                                    </h3>
                                                                    <p className="text-xs text-gray-500">Fitness Plan</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {hasMultipleVersions && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    toggleThreadExpansion(threadId)
                                                                }}
                                                                className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors"
                                                            >
                                                                <ChevronDown
                                                                    className={`w-4 h-4 text-indigo-600 transition-transform ${isExpanded ? "rotate-180" : ""
                                                                        }`}
                                                                />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Primary Fields */}
                                                    {primaryFields.length > 0 && (
                                                        <div className="space-y-2 mb-3">
                                                            {primaryFields.map((input, idx) => {
                                                                const { variable, value } = getDisplayValue(
                                                                    input.variable,
                                                                    input.variable_value
                                                                )
                                                                return (
                                                                    <div key={idx} className="flex justify-between items-center">
                                                                        <span className="text-xs text-gray-600 font-medium">
                                                                            {variable}
                                                                        </span>
                                                                        <span className="text-xs text-indigo-700 font-semibold bg-indigo-100 px-2 py-1 rounded-md">
                                                                            {value || "N/A"}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            })}

                                                            {/* Show +more if there are additional fields */}
                                                            {secondaryFields.length > 0 && (
                                                                <div className="text-xs text-gray-400 font-medium">
                                                                    +{secondaryFields.length} more field
                                                                    {secondaryFields.length > 1 ? "s" : ""}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Version Badge */}
                                                    {hasMultipleVersions && (
                                                        <div className="mb-3">
                                                            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs font-medium">
                                                                {sortedItems.length} version{sortedItems.length > 1 ? "s" : ""}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Footer */}
                                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="text-xs text-gray-500 font-medium">
                                                            {formatDate(latestItem.updatedAt || latestItem.createdAt || '')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Hover Effect */}
                                                <div
                                                    className={`absolute inset-0 rounded-xl transition-opacity duration-200 pointer-events-none ${isSelected
                                                            ? "bg-indigo-500/5"
                                                            : "bg-indigo-500/0 group-hover:bg-indigo-500/5"
                                                        }`}
                                                />
                                            </div>

                                            {/* Version Dropdown */}
                                            {isExpanded && hasMultipleVersions && (
                                                <div className="ml-6 space-y-2 border-l-2 border-indigo-200 pl-4">
                                                    {sortedItems
                                                        .slice(0, -1)
                                                        .reverse()
                                                        .map((item, index) => {
                                                            const itemWorkoutType = getWorkoutType(item.user_inputs)
                                                            const itemIsSelected = selectedItem === item.execution_id
                                                            const versionNumber = index + 1 // Version 1 is most recent previous, Version 2 is next, etc.

                                                            return (
                                                                <div
                                                                    key={item.execution_id}
                                                                    className={`group relative bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${itemIsSelected
                                                                            ? "border-indigo-300 bg-indigo-25 shadow-md"
                                                                            : "border-gray-100 hover:border-indigo-200"
                                                                        }`}
                                                                    onClick={() => handleHistoryClick(item.execution_id)}
                                                                >
                                                                    <div className="p-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                                                    <Dumbbell className="w-4 h-4 text-indigo-600" />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm font-medium text-indigo-800">
                                                                                        Version {versionNumber}
                                                                                    </div>
                                                                                    <div className="text-xs text-gray-500 truncate">
                                                                                        {itemWorkoutType}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <div className="text-xs text-gray-500 font-medium">
                                                                                    {formatDate(item.updatedAt || item.createdAt || '')}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Version card hover effect */}
                                                                    <div
                                                                        className={`absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none ${itemIsSelected
                                                                                ? "bg-indigo-500/5"
                                                                                : "bg-indigo-500/0 group-hover:bg-indigo-500/3"
                                                                            }`}
                                                                    />
                                                                </div>
                                                            )
                                                        })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
            </div>
            <PopupLoader open={showHistoryLoader} label="Loading history…" />
        </>
    )
}

export default WorkoutHistorySidebar