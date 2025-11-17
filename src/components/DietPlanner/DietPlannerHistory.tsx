"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { RefreshCcw, Clock, Utensils, ChevronDown, Plus, BookOpen } from "lucide-react"
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

interface DietHistorySidebarProps {
  onHistoryItemClick: (executionToken: string, agent_id: string) => void
  containerRef?: React.RefObject<HTMLDivElement | null>
  refreshTrigger?: number
  onCreateNew?: () => void
  selectedExecutionId?: string
  preventAutoSelect?: boolean
}

const DietHistorySidebar: React.FC<DietHistorySidebarProps> = ({
  onHistoryItemClick,
  containerRef,
  refreshTrigger,
  onCreateNew,
  selectedExecutionId,
  preventAutoSelect = false,
}) => {
  const [history, setHistory] = useState<ThreadGroup>({})
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [internalSelectedItem, setInternalSelectedItem] = useState<string | null>(null)
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

      // Process ALL data - no thread/item filtering
      const processedData: ThreadGroup = {}
      console.log("Raw API response data:", result.data)
      
      Object.entries(result.data).forEach(([threadId, items]) => {
        console.log(`Processing thread ${threadId}:`, items)
        
        // Handle ANY data structure
        let itemsToProcess: any[] = []
        
        if (Array.isArray(items)) {
          itemsToProcess = items
        } else if (items && typeof items === 'object') {
          itemsToProcess = [items] // Single item
        } else if (items) {
          itemsToProcess = [{ raw_data: items }] // Any other data
        }
        
        if (itemsToProcess.length > 0) {
          const processedItems = itemsToProcess.map((item: any, index: number) => ({
            execution_id: item?.execution_id || `${threadId}_${index}`,
            thread_id: item?.thread_id || threadId,
            createdAt: item?.createdAt || item?.created_at || new Date().toISOString(),
            updatedAt: item?.updatedAt || item?.updated_at || undefined,
            user_inputs: normalizeUserInputs(item?.user_inputs || []),
            ...item
          })) as HistoryItem[]
          
          // Sort items by date (newest first) - latest on top
          processedItems.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
            const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
            return dateB - dateA // Descending order (newest first)
          })
          
          processedData[threadId] = processedItems
          console.log(`Thread ${threadId} processed:`, processedItems.length, "items")
        }
      })
      
      console.log("Final processed data:", processedData)
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

  useEffect(() => {
    if (selectedExecutionId === undefined) return
    if (selectedExecutionId === "") {
      setInternalSelectedItem(null)
      return
    }
    setInternalSelectedItem(selectedExecutionId)
  }, [selectedExecutionId])

  const loadHistoryItem = useCallback((execution_id: string, agentId: string) => {
    if (!agentId || !execution_id) return

    setShowHistoryLoader(true)
    Promise.resolve(onHistoryItemClick(execution_id, agentId))
      .catch((error) => {
        console.error("Error loading history item:", error)
      })
      .finally(() => setShowHistoryLoader(false))
  }, [onHistoryItemClick])

  // Auto-select latest item only when user triggered (refreshTrigger)
  useEffect(() => {
    if (!shouldAutoSelectRef.current) return
    if (preventAutoSelect) {
      shouldAutoSelectRef.current = false
      return
    }
    if (!agent_id) {
      shouldAutoSelectRef.current = false
      return
    }
    if (Object.keys(history).length > 0) {
      // Find the most recent item across all threads
      let mostRecentItem: HistoryItem | null = null
      let mostRecentDate = new Date(0)

      Object.entries(history).forEach(([threadId, items]: [string, HistoryItem[]]) => {
        if (Array.isArray(items) && items.length > 0) {
          const latestItem: HistoryItem = items[0] // First item is the latest (newest first)
          const itemDate = new Date(latestItem.updatedAt || latestItem.createdAt || new Date())
          if (itemDate > mostRecentDate) {
            mostRecentDate = itemDate
            mostRecentItem = latestItem
          }
        }
      })

      // Auto-select the most recent item only for user-triggered updates
        if (mostRecentItem && "execution_id" in mostRecentItem) {
        const executionId = (mostRecentItem as HistoryItem).execution_id
        setInternalSelectedItem(executionId)
        if (!selectedExecutionId) {
          void loadHistoryItem(executionId, agent_id)
        }
      }
      // Reset the flag
      shouldAutoSelectRef.current = false
    }
  }, [history, agent_id, loadHistoryItem, selectedExecutionId, preventAutoSelect])

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

  const handleHistoryClick = (execution_id: string) => {
    if (!agent_id || !execution_id) return

    setInternalSelectedItem(execution_id)
    loadHistoryItem(execution_id, agent_id)
  }

  const handleCreateNew = () => {
    setInternalSelectedItem(null)
    onCreateNew?.()
  }

  const resolvedSelectedId = selectedExecutionId ?? internalSelectedItem ?? null

  const toggleThreadExpansion = (threadId: string) => {
    const newExpanded = new Set(expandedThreads)
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId)
    } else {
      newExpanded.add(threadId)
    }
    setExpandedThreads(newExpanded)
  }

  const formatDate = (dateString: string): string => {
    try {
      if (!dateString || dateString.trim() === "") {
        return "Unknown date"
      }

      let date: Date

      // Ensure the date string is treated as UTC
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

      if (Number.isNaN(date.getTime())) {
        return "Invalid date"
      }

      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays > 0) {
        return date.toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
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
      return dateString
    }
  }

  const getDisplayValue = (variable: string, value: string) => {
    // Format variable names for better display
    const formattedVariable = variable.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    return { variable: formattedVariable, value }
  }

  const getDietType = (inputs: VariableInput[]) => {
    const dietGoalInput = inputs.find((input) => input.variable.toLowerCase() === "diet_goal")
    return dietGoalInput ? dietGoalInput.variable_value : "diet-plan"
  }

  const getPrimaryDisplayField = (inputs: VariableInput[]) => {
    const dietGoalInput = inputs.find((input) => input.variable.toLowerCase() === "diet_goal")
    if (dietGoalInput) {
      return {
        value: dietGoalInput.variable_value,
        icon: Utensils
      }
    }
    return null
  }

  const getPrimaryFields = (inputs: VariableInput[]) => {
    const primaryFields = ["calorie_goal", "total_weeks", "meals_per_day"]
    return inputs.filter((input) => primaryFields.includes(input.variable))
  }

  const getSecondaryFields = (inputs: VariableInput[]) => {
    const excludeFields = ["diet_goal", "calorie_goal", "total_weeks", "meals_per_day"]
    return inputs.filter((input) => !excludeFields.includes(input.variable))
  }

  const getThreadSummary = (userInputs: VariableInput[]) => {
    const summary: string[] = []

    // Add key fields to summary
    const keyFields = ['diet_goal', 'calorie_goal', 'total_weeks', 'meals_per_day']
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

  return (
    <>
      <div className="w-72 bg-transparent h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Diet History</h2>
            <p className="text-xs text-gray-600">Previous meal plans & feedback</p>
          </div>
        </div>
      </div>

      {/* Create New Button */}
      {onCreateNew && (
        <div className="p-3 border-b border-gray-100 bg-white">
          <button
            type="button"
            onClick={handleCreateNew}
            className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
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
            <div className="text-red-500 text-xs text-center p-3 bg-red-50 rounded-lg border border-red-100">
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
                  No diet plans found
                </div>
              ) : (
                Object.entries(history).map(([threadId, items]: [string, HistoryItem[]]) => {
                  console.log(`Rendering thread ${threadId}:`, items)
                  
                  // Show ALL threads - minimal validation
                  if (!items) return null
                  
                  const itemsArray = Array.isArray(items) ? items : [items]
                  // Only filter out completely empty/null items
                  const validItems = itemsArray.filter(item => item)
                  
                  console.log(`Thread ${threadId}: Displaying ${validItems.length} items`)

                  // Show thread even if no valid items (for debugging)
                  if (validItems.length === 0) {
                    return (
                      <div key={threadId} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm text-yellow-800">
                          Thread {threadId}: No displayable items
                        </div>
                      </div>
                    )
                  }

                  // Sort items by date (newest first) - latest on top
                  const sortedItems = [...validItems].sort((a, b) => {
                    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
                    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
                    return dateB - dateA // Descending order (newest first)
                  })
                  
                  const latestItem: HistoryItem = sortedItems[0] // First item is the latest (newest)
                  const isExpanded = expandedThreads.has(threadId)
                  const hasMultipleVersions = sortedItems.length > 1
                  const dietType = getDietType(latestItem.user_inputs)
                  const isSelected = resolvedSelectedId === latestItem.execution_id
                  const primaryDisplayField = getPrimaryDisplayField(latestItem.user_inputs)
                  const primaryFields = getPrimaryFields(latestItem.user_inputs)
                  const secondaryFields = getSecondaryFields(latestItem.user_inputs)

                  return (
                    <div key={threadId} className="space-y-2">
                      {/* Main Thread Card */}
                      <div
                        className={`group relative bg-white rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                        onClick={() => handleHistoryClick(latestItem.execution_id)}
                      >
                        <div className="p-4 pb-2">
                          {/* Diet Header with Version Toggle */}
                          <div className="flex items-start gap-2 mb-2.5">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                              {primaryDisplayField ? (
                                <primaryDisplayField.icon className="w-4 h-4 text-white" />
                              ) : (
                                <Utensils className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                                {primaryDisplayField 
                                  ? `${primaryDisplayField.value.charAt(0).toUpperCase() + primaryDisplayField.value.slice(1)} Diet`
                                  : dietType
                                }
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">Nutrition Plan</p>
                            </div>
                            {/* Version Toggle Button - Now part of header and on extreme right */}
                            {hasMultipleVersions && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleThreadExpansion(threadId)
                                }}
                                className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                              >
                                <ChevronDown
                                  className={`w-4 h-4 text-blue-600 transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                            )}
                          </div>

                          {/* Primary Fields */}
                          <div className="space-y-1.5 mb-2.5">
                            {primaryFields.map((input, idx) => {
                              const { variable, value } = getDisplayValue(input.variable, input.variable_value)
                              return (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500 font-medium">{variable}</span>
                                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                                    {value || "N/A"}
                                  </span>
                                </div>
                              )
                            })}

                            {/* Show +more if there are additional fields */}
                            {secondaryFields.length > 0 && (
                              <div className="text-xs text-gray-400">+{secondaryFields.length} more fields</div>
                            )}
                          </div>

                          {/* Version Badge */}
                          {hasMultipleVersions && (
                            <div className="mb-2">
                              <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-700">
                                {sortedItems.length - 1} version{sortedItems.length - 1 > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{formatDate(latestItem.updatedAt || latestItem.createdAt || '')}</span>
                          </div>
                        </div>

                        {/* Hover Effect */}
                        <div className={`
                          absolute inset-0 rounded-xl transition-opacity duration-200 pointer-events-none 
                          ${isSelected ? 'bg-blue-500/5' : 'bg-blue-500/0 group-hover:bg-blue-500/5'}
                        `} />
                      </div>

                      {/* Version Dropdown */}
                      {isExpanded && hasMultipleVersions && (
                        <div className="ml-6 space-y-2 border-l-2 border-blue-200 pl-4">
                          {sortedItems.slice(1).map((item: HistoryItem, index: number) => {
                            const itemPrimaryDisplayField = getPrimaryDisplayField(item.user_inputs)
                            const itemDietType = getDietType(item.user_inputs)
                            const itemIsSelected = resolvedSelectedId === item.execution_id
                            const versionNumber = index + 1 // Version 1 is second newest, Version 2 is third newest, etc.

                            return (
                              <div
                                key={item.execution_id}
                                className={`group relative bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                  itemIsSelected
                                    ? 'border-blue-300 bg-blue-50 shadow-md'
                                    : 'border-gray-100 hover:border-blue-200'
                                }`}
                                onClick={() => handleHistoryClick(item.execution_id)}
                              >
                                <div className="p-3">
                                  {/* Version Header */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                        {itemPrimaryDisplayField ? (
                                          <itemPrimaryDisplayField.icon className="w-3 h-3 text-blue-600" />
                                        ) : (
                                          <Utensils className="w-3 h-3 text-blue-600" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-blue-700">
                                          Version {versionNumber}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium">
                                      {formatDate(item.updatedAt || item.createdAt || '')}
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="space-y-1">
                                    {itemPrimaryDisplayField && (
                                      <div className="text-sm text-gray-800 font-medium truncate">
                                        {itemPrimaryDisplayField.value.charAt(0).toUpperCase() + itemPrimaryDisplayField.value.slice(1)} Diet
                                      </div>
                                    )}
                                    {itemDietType && (
                                      <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md inline-block">
                                        {itemDietType}
                                      </div>
                                    )}
                                  </div>

                                  {/* Selection indicator */}
                                  {itemIsSelected && (
                                    <div className="absolute -left-1 top-3 w-1 h-6 bg-blue-500 rounded-r-full"></div>
                                  )}
                                </div>

                                {/* Hover Effect */}
                                <div className={`absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none ${
                                  itemIsSelected
                                    ? 'bg-blue-500/5'
                                    : 'bg-blue-500/0 group-hover:bg-blue-500/5'
                                }`} />
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

export default DietHistorySidebar