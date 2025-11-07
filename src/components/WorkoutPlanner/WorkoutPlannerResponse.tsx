"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import ResponseLoader from "./WorkoutResponseLoader"
import { toast } from "@/hooks/use-toast"
import RatingFeedback from "@/components/Content/RatingFeedback"
import HistoricalRatingFeedback from "@/components/Content/HistoricalRatingFeedback"
import { createWorkoutPDFFromResponse } from "@/utils/WorkoutPlannerPDFGenerator"
import {
    Dumbbell,
    Download,
    Calendar,
    Clock,
    Target,
    Activity,
    CheckCircle,
    Info,
    Loader2,
    X,
    Timer,
    Repeat,
    Users,
    AlertCircle,
    Play,
    SunMedium
} from "lucide-react"
import ShareButton from "../ShareButton"
import YoutubeIcon from '@/assets/icons8-youtube.svg'
import Image from "next/image"

interface FormattedWorkoutResponseProps {
    response: {
        loading?: boolean
        error?: string
        data?: any
    }
    onSave?: (data: any) => void
    agent_id?: string
    executionToken?: string
    accessToken?: string
    formRef?: React.RefObject<any>
    historicalRating?: number | null
    historicalFeedback?: string | null
    isHistoricalView?: boolean
    workoutType?: string | null
}

const FormattedWorkoutResponse: React.FC<FormattedWorkoutResponseProps> = ({
    response,
    onSave,
    agent_id,
    executionToken,
    formRef,
    historicalRating = null,
    historicalFeedback = null,
    isHistoricalView = false,
    workoutType = null,
}) => {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [isContinuing, setIsContinuing] = useState(false)
    const [rating, setRating] = useState<number>(0)
    const [feedback, setFeedback] = useState<string>("")
    const [shareResetSignal, setShareResetSignal] = useState(0)

    // Auto-scroll to response when data loads
    useEffect(() => {
        if (response.data && !response.loading) {
            setTimeout(() => {
                const responseElement = document.getElementById("workout-plan-response")
                if (responseElement) {
                    responseElement.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    })
                }
            }, 100)
        }
    }, [response.data, response.loading])

    // Initialize historical data if provided
    useEffect(() => {
        if (historicalRating !== null) {
            setRating(historicalRating)
        }

        if (historicalFeedback !== null) {
            setFeedback(historicalFeedback)
        }
    }, [historicalRating, historicalFeedback])

    const handleDownloadPDF = async () => {
        setIsGeneratingPDF(true)
        try {
            // Get user inputs from form if available
            let userInputs = {}
            if (formRef?.current?.getUserRequest) {
                userInputs = formRef.current.getUserRequest()
            } else if (formRef?.current?.getLastApiResponse) {
                const lastResponse = formRef.current.getLastApiResponse()
                if (lastResponse) {
                    userInputs = lastResponse
                }
            }

            // For historical data, try to reconstruct user inputs from the current form data
            if (isHistoricalView && formRef?.current?.getFormData) {
                // Try to get form data directly
                const formData = formRef.current.getFormData()
                userInputs = {
                    user_type: formData.user_type,
                    fitness_level: formData.fitness_level,
                    total_weeks: formData.total_weeks,
                    available_days_per_week: formData.available_days_per_week,
                    available_time_per_day: formData.available_time_per_day,
                    fitness_goals: formData.fitness_goals,
                    gym_access: formData.gym_access,
                    home_equipment: formData.home_equipment,
                    gym_equipment: formData.gym_equipment,
                    health_conditions: formData.health_conditions,
                }
            }

            // Generate and download PDF
            const filename = `${workoutType || "workout"}-plan-${new Date().toISOString().split("T")[0]}.pdf`
            createWorkoutPDFFromResponse(dataToDisplay, userInputs, filename)

            toast({
                title: "Success",
                description: "Workout plan is being generated! Please allow popups if prompted.",
                duration: 3000,
            })
        } catch (error) {
            console.error("Error generating PDF:", error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to generate PDF. Please try again.",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    // Continue generation function
    const handleContinueGeneration = async () => {
        try {
            setIsContinuing(true)
            const meta = formRef?.current?.getMetaData?.()
            const userReq = formRef?.current?.getUserRequest?.()
            const threadId = formRef?.current?.getThreadId?.()

            if (!meta || !userReq || !threadId || !agent_id || !executionToken) {
                toast({ title: "Missing data", description: "Cannot continue. Please regenerate.", variant: "destructive" })
                setIsContinuing(false)
                return
            }

            // Build continuation params
            const apiParamsArray = [
                {
                    meta_data: meta,
                    user_request: userReq,
                },
            ]

            const formData = new FormData()
            formData.append("agent_id", agent_id || "")
            formData.append("access_token", (document.cookie.match(/(?:^|; )access_token=([^;]+)/)?.[1] && decodeURIComponent(document.cookie.match(/(?:^|; )access_token=([^;]+)/)![1])) || "")
            formData.append("thread_id", threadId)
            formData.append("execution_id", executionToken || "")
            formData.append("api_params", JSON.stringify(apiParamsArray))

            const res = await fetch("/api/continue-execute-agent", { method: "POST", body: formData })
            const json = await res.json()
            if (!res.ok || !json.status) {
                throw new Error(json.error || json.message || "Failed to continue")
            }

            // After continuation completes, fetch merged history by executionToken
            const historyRes = await fetch(`/api/get-agent-history/${executionToken}?agent_id=${agent_id}`)
            const historyJson = await historyRes.json()
            if (!historyRes.ok || !historyJson.status) {
                throw new Error(historyJson.error || historyJson.message || "Failed to fetch updated history")
            }

            const outputs = historyJson.data?.agent_outputs
            if (outputs) {
                // Update parent via onSave if available
                const updated = Array.isArray(outputs) ? outputs : [outputs]
                onSave?.(updated)
                toast({ title: "Completed", description: "Remaining weeks generated." })
                setShareResetSignal((prev) => prev + 1)
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Failed to continue generation", variant: "destructive" })
        } finally {
            setIsContinuing(false)
            setShareResetSignal((prev) => prev + 1)
        }
    }

    if (response.loading) {
        return <ResponseLoader />
    }

    if (response.error) {
        return (
            <div className="w-full p-3 sm:p-4 text-red-600 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    <h3 className="text-sm font-medium">Error</h3>
                </div>
                <p className="text-xs">{response.error}</p>
            </div>
        )
    }

    let dataToDisplay = response.data?.data || response.data

    // Enhanced data processing for the new response format
    if (dataToDisplay && typeof dataToDisplay === "object") {
        // Handle array responses
        if (Array.isArray(dataToDisplay) && dataToDisplay.length > 0) {
            dataToDisplay = dataToDisplay[0]
        }

        // Handle nested data structures
        if (dataToDisplay.agent_outputs) {
            dataToDisplay = dataToDisplay.agent_outputs
        }

        // Handle the weekly_plan format (new structure)
        if (dataToDisplay.weekly_plan && Array.isArray(dataToDisplay.weekly_plan)) {
            // Convert weekly_plan to weekly_details for compatibility
            dataToDisplay.weekly_details = dataToDisplay.weekly_plan
        }

        // Handle the legacy weekly_details format
        if (dataToDisplay.weekly_details && Array.isArray(dataToDisplay.weekly_details)) {
            // This is the format we work with - keep it as is
        }
    }

    if (!dataToDisplay) {
        return null
    }

    // Helper function to render weekly details with improved structure
    const renderWeeklyDetails = (weeklyData: any) => {
        // Handle new format: weekly_plan array or weekly_details
        let weeklyDetails = weeklyData.weekly_plan || weeklyData.weekly_details || weeklyData

        if (!weeklyDetails || !Array.isArray(weeklyDetails)) {
            return <div className="text-xs text-gray-500">No weekly details available</div>
        }

        // Get metadata for total weeks calculation
        const meta = dataToDisplay.meta_data || formRef?.current?.getMetaData?.()
        const totalWeeks: number = meta?.phase_plan?.total_weeks || weeklyDetails.length
        const availableWeekNumbers = new Set(weeklyDetails.map((w: any) => w.week))

        const allWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)

        return (
            <div className="space-y-4">
                <Tabs defaultValue={`week-1`} className="w-full">
                    <div className="bg-indigo-50 p-2 rounded-md">
                        <TabsList className="h-auto bg-transparent p-0 w-full flex-wrap justify-start">
                            <div
                                className={`grid gap-1 w-full ${totalWeeks <= 2
                                    ? "grid-cols-2"
                                    : totalWeeks <= 3
                                        ? "grid-cols-3"
                                        : totalWeeks <= 4
                                            ? "grid-cols-4"
                                            : totalWeeks <= 6
                                                ? "grid-cols-3 sm:grid-cols-6"
                                                : "grid-cols-4 sm:grid-cols-8"
                                    }`}
                            >
                                {allWeeks.map((weekNumber: number) => (
                                    <TabsTrigger
                                        key={weekNumber}
                                        value={`week-${weekNumber}`}
                                        className="text-xs flex items-center justify-center gap-1 p-2 rounded data-[state=active]:bg-white data-[state=active]:shadow transition-all duration-200 h-auto"
                                        onClick={() => { }}
                                    >
                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                        <span className="hidden sm:inline whitespace-nowrap">Week {weekNumber}</span>
                                        <span className="sm:hidden">Week{weekNumber}</span>
                                    </TabsTrigger>
                                ))}
                            </div>
                        </TabsList>
                    </div>

                    {/* Week Content */}
                    {allWeeks.map((weekNumber: number) => {
                        const week = weeklyDetails.find((w: any) => w.week === weekNumber)
                        const isAvailable = availableWeekNumbers.has(weekNumber)
                        return (
                            <TabsContent key={weekNumber} value={`week-${weekNumber}`} className="mt-4">
                                <div className="bg-white overflow-hidden">
                                    {/* Week Header */}
                                    <div className="bg-white p-3 border-b mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                                                <Calendar className="w-3 h-3 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-medium text-blue-900">Week {weekNumber}</h3>
                                                <p className="text-xs text-blue-800">{isAvailable ? (week?.days?.length || 0) : 0} workout days</p>
                                            </div>
                                        </div>
                                    </div>

                                    {!isAvailable ? (
                                        <div className="p-4">
                                            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-md text-center">
                                                <p className="text-xs text-indigo-800 mb-3">Content will be generated for this week.</p>
                                                <Button size="sm" className="bg-indigo-700 hover:bg-indigo-800 text-white" onClick={handleContinueGeneration} disabled={isContinuing}>
                                                    {isContinuing ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>Continue Generating</>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Week Summary */}
                                            {(week.weekly_overview || week.weekly_summary) && (
                                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-md mb-3">
                                                    <div className="flex items-start gap-2">
                                                        <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <Info className="w-2 h-2 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-medium text-blue-900 mb-1">Week Overview</h4>
                                                            <p className="text-xs text-blue-800 leading-relaxed">{week.weekly_overview || week.weekly_summary}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="p-1">
                                                {/* Day Tabs - Custom Multi-row Layout with proper TabsList */}
                                                <Tabs defaultValue={`day-${week.days?.[0]?.day || 1}`} className="w-full">
                                                    <div className="bg-indigo-50 p-2 rounded-md mb-3">
                                                        <TabsList className="h-auto bg-transparent p-0 w-full flex-wrap justify-start">
                                                            <div
                                                                className={`grid gap-1 w-full ${week.days.length === 1
                                                                    ? "grid-cols-1"
                                                                    : week.days.length === 2
                                                                        ? "grid-cols-2"
                                                                        : week.days.length === 3
                                                                            ? "grid-cols-3"
                                                                            : week.days.length === 4
                                                                                ? "grid-cols-2 sm:grid-cols-4"
                                                                                : week.days.length === 5
                                                                                    ? "grid-cols-5"
                                                                                    : week.days.length === 6
                                                                                        ? "grid-cols-3 sm:grid-cols-6"
                                                                                        : week.days.length === 7
                                                                                            ? "grid-cols-4 sm:grid-cols-7"
                                                                                            : week.days.length <= 8
                                                                                                ? "grid-cols-4 sm:grid-cols-8"
                                                                                                : "grid-cols-4 sm:grid-cols-12"
                                                                    }`}
                                                            >
                                                                {week.days?.map((day: any, dayIndex: number) => (
                                                                    <TabsTrigger
                                                                        key={dayIndex}
                                                                        value={`day-${day.day}`}
                                                                        className="text-xs flex items-center justify-center gap-1 p-2 rounded data-[state=active]:bg-white data-[state=active]:shadow transition-all duration-200 h-auto"
                                                                    >
                                                                        <SunMedium className="hidden sm:inline w-3 h-3 flex-shrink-0" />
                                                                        <span className="hidden sm:inline whitespace-nowrap">Day {day.day}</span>
                                                                        <span className="sm:hidden">Day{day.day}</span>
                                                                    </TabsTrigger>
                                                                ))}
                                                            </div>
                                                        </TabsList>
                                                    </div>

                                                    {/* Day Content */}
                                                    {week.days?.map((day: any, dayIndex: number) => (
                                                        <TabsContent key={dayIndex} value={`day-${day.day}`} className="mt-0">
                                                            <div className="space-y-3">
                                                                {/* Day Header */}
                                                                <div className="bg-white p-3 rounded-md border border-indigo-200">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="w-5 h-5 bg-indigo-100 rounded flex items-center justify-center">
                                                                            <Activity className="w-3 h-3 text-indigo-600" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-medium text-indigo-900">Day {day.day}</h4>
                                                                            <p className="text-xs text-indigo-800">{day.focus}</p>
                                                                        </div>
                                                                    </div>

                                                                    {day.day_summary && (
                                                                        <p className="text-xs text-gray-700 leading-relaxed">{day.day_summary}</p>
                                                                    )}
                                                                </div>

                                                                {/* Single Card for All Activities */}
                                                                <div className="bg-white border border-gray-200 rounded-md p-3">
                                                                    <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                                                        <Dumbbell className="w-3 h-3 text-gray-600" />
                                                                        Exercises ({day.activities?.length || 0})
                                                                    </h5>

                                                                    <div className="space-y-4">
                                                                        {day.activities?.map((activity: any, actIndex: number) => (
                                                                            <div key={actIndex} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                                                                                {/* Activity Header with Link Button */}
                                                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-2 mb-3 sm:mb-2">
                                                                                    <div className="flex-1">
                                                                                        <h6 className="text-base sm:text-sm font-medium text-gray-900 mb-2 sm:mb-1">
                                                                                            {actIndex + 1}. {activity.name}
                                                                                        </h6>
                                                                                        <p className="text-xs sm:text-xs text-gray-600 leading-relaxed">
                                                                                            {activity.description}
                                                                                        </p>
                                                                                    </div>
                                                                                    {activity.how_to_link && (
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            className="w-full sm:w-auto sm:ml-2 text-xs sm:text-xs h-9 sm:h-6 px-4 sm:px-2 bg-transparent"
                                                                                            onClick={() => window.open(activity.how_to_link, "_blank")}
                                                                                        >
                                                                                            <Image src={YoutubeIcon} alt='youtube-icon' className="w-4 h-4 sm:w-3 sm:h-3 mr-2 sm:mr-1 text-red-600" />
                                                                                            Watch tutorial
                                                                                        </Button>
                                                                                    )}
                                                                                </div>

                                                                                {/* Activity Stats - Mobile Responsive Grid */}
                                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                                                                    {(() => {
                                                                                        const items = []
                                                                                        let itemCount = 0

                                                                                        if (activity.sets) {
                                                                                            itemCount++
                                                                                            items.push(
                                                                                                <div key="sets" className="bg-blue-50 p-2.5 sm:p-2 rounded text-center">
                                                                                                    <div className="flex items-center justify-center gap-1 mb-1">
                                                                                                        <Repeat className="w-3 h-3 sm:w-2 sm:h-2 text-blue-600" />
                                                                                                        <span className="text-xs font-medium text-blue-900">Sets</span>
                                                                                                    </div>
                                                                                                    <span className="text-sm sm:text-sm font-medium text-blue-700">
                                                                                                        {activity.sets}
                                                                                                    </span>
                                                                                                </div>,
                                                                                            )
                                                                                        }

                                                                                        if (activity.reps) {
                                                                                            itemCount++
                                                                                            items.push(
                                                                                                <div key="reps" className="bg-green-50 p-2.5 sm:p-2 rounded text-center">
                                                                                                    <div className="flex items-center justify-center gap-1 mb-1">
                                                                                                        <Target className="w-3 h-3 sm:w-2 sm:h-2 text-green-600" />
                                                                                                        <span className="text-xs font-medium text-green-900">Reps</span>
                                                                                                    </div>
                                                                                                    <span className="text-sm sm:text-sm font-medium text-green-700">
                                                                                                        {activity.reps}
                                                                                                    </span>
                                                                                                </div>,
                                                                                            )
                                                                                        }

                                                                                        if (activity.duration_minutes) {
                                                                                            itemCount++
                                                                                            items.push(
                                                                                                <div key="duration" className="bg-orange-50 p-2.5 sm:p-2 rounded text-center">
                                                                                                    <div className="flex items-center justify-center gap-1 mb-1">
                                                                                                        <Timer className="w-3 h-3 sm:w-2 sm:h-2 text-orange-600" />
                                                                                                        <span className="text-xs font-medium text-orange-900">Duration</span>
                                                                                                    </div>
                                                                                                    <span className="text-sm sm:text-sm font-medium text-orange-700">
                                                                                                        {activity.duration_minutes}min
                                                                                                    </span>
                                                                                                </div>,
                                                                                            )
                                                                                        }

                                                                                        // Move estimated time below equipment with badge styling

                                                                                        if (activity.rest_seconds) {
                                                                                            itemCount++
                                                                                            const isLastItem = itemCount === items.length + 1
                                                                                            const isOddOnMobile = itemCount % 2 === 1
                                                                                            const isOddOnDesktop = itemCount % 4 === 1 && itemCount > 1

                                                                                            items.push(
                                                                                                <div
                                                                                                    key="rest"
                                                                                                    className={`bg-purple-50 p-2.5 sm:p-2 rounded text-center ${isOddOnMobile ? "col-span-2 sm:col-span-1" : ""} ${isOddOnDesktop ? "sm:col-span-4" : ""}`}
                                                                                                >
                                                                                                    <div className="flex items-center justify-center gap-1 mb-1">
                                                                                                        <Clock className="w-3 h-3 sm:w-2 sm:h-2 text-purple-600" />
                                                                                                        <span className="text-xs font-medium text-purple-900">Rest</span>
                                                                                                    </div>
                                                                                                    <span className="text-sm sm:text-sm font-medium text-purple-700">
                                                                                                        {activity.rest_seconds}s
                                                                                                    </span>
                                                                                                </div>,
                                                                                            )
                                                                                        }

                                                                                        return items
                                                                                    })()}
                                                                                </div>

                                                                                {/* Equipment - Mobile Responsive */}
                                                                                {activity.equipment && (
                                                                                    <div className="mb-2 flex flex-col sm:flex-row gap-2 sm:gap-2 sm:justify-start sm:items-center">
                                                                                        <div className="flex items-center gap-1">
                                                                                            <Dumbbell className="w-3 h-3 text-gray-600" />
                                                                                            <span className="text-xs sm:text-xs font-medium text-gray-900">Equipment Required:</span>
                                                                                        </div>
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="text-xs sm:text-xs px-3 py-1 sm:px-2 sm:py-0.5 w-fit"
                                                                                        >
                                                                                            {activity.equipment}
                                                                                        </Badge>
                                                                                    </div>
                                                                                )}

                                                                                {activity.estimated_time_minutes && (
                                                                                    <div className="mb-3 -mt-1 flex flex-col sm:flex-row gap-2 sm:gap-2 sm:justify-start sm:items-center">
                                                                                        <div className="flex items-center gap-1">
                                                                                            <Clock className="w-3 h-3 text-gray-600" />
                                                                                            <span className="text-xs sm:text-xs font-medium text-gray-900">Estimated time:</span>
                                                                                        </div>
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="text-xs sm:text-xs px-3 py-1 sm:px-2 sm:py-0.5 w-fit"
                                                                                        >
                                                                                            {activity.estimated_time_minutes} min
                                                                                        </Badge>
                                                                                    </div>
                                                                                )}

                                                                                {/* Tips - Mobile Responsive */}
                                                                                {activity.tips && activity.tips.length > 0 && (
                                                                                    <div className="bg-yellow-50 border border-yellow-200 p-3 sm:p-2 rounded">
                                                                                        <h6 className="text-sm sm:text-xs font-medium text-yellow-900 mb-2 sm:mb-1 flex items-center gap-1">
                                                                                            <AlertCircle className="w-4 h-4 sm:w-3 sm:h-3" />
                                                                                            Tips:
                                                                                        </h6>
                                                                                        <ul className="space-y-2 sm:space-y-1">
                                                                                            {activity.tips.map((tip: string, tipIndex: number) => (
                                                                                                <li
                                                                                                    key={tipIndex}
                                                                                                    className="text-xs sm:text-xs text-yellow-800 flex items-start gap-2 sm:gap-1 leading-relaxed"
                                                                                                >
                                                                                                    <CheckCircle className="w-4 h-4 sm:w-3 sm:h-3 mt-0.5 flex-shrink-0 text-yellow-600" />
                                                                                                    <span>{tip}</span>
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TabsContent>
                                                    ))}
                                                </Tabs>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        )
                    })}
                </Tabs>
            </div>
        )
    }

    // Determine if we have weekly data (either new weekly_plan or old weekly_details format)
    const hasWeeklyData = (dataToDisplay.weekly_plan && Array.isArray(dataToDisplay.weekly_plan)) ||
        (dataToDisplay.weekly_details && Array.isArray(dataToDisplay.weekly_details))

    const currentExecutionToken = executionToken
    const currentagent_id = agent_id
    const currentagent_name = "workout-planner"

    return (
        <div id="workout-plan-response" className="w-full max-w-7xl space-y-4">
            {/* Lighter Header */}
            <div className="bg-white border border-indigo-200 text-gray-800 p-3 sm:p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base sm:text-lg font-medium flex items-center gap-2 truncate">
                                {workoutType === "group" && <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}
                                <span className="truncate">
                                    {workoutType
                                        ? `Your ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1)} Workout Plan`
                                        : "Your Personalized Workout Plan"}
                                </span>
                            </h1>
                            <p className="text-xs text-gray-600 mt-0.5">
                                AI-powered fitness planning •{" "}
                                {hasWeeklyData ? `${(dataToDisplay.weekly_plan || dataToDisplay.weekly_details)?.length} weeks` : "Custom program"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                        {currentExecutionToken && currentagent_id && (
                            <ShareButton
                                key={`share-${currentExecutionToken}-${shareResetSignal}`}
                                agentId={currentagent_id}
                                executionToken={currentExecutionToken}
                                agentName={currentagent_name}
                                className="bg-indigo-50 text-indigo-700 border border-indigo-300 hover:bg-indigo-100"
                            />
                        )}
                        <Button
                            size="sm"
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPDF}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 text-xs whitespace-nowrap"
                        >
                            {isGeneratingPDF ? (
                                <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    <span className="hidden xs:inline">Generating...</span>
                                    <span className="xs:hidden">...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-3 h-3 mr-1" />
                                    <span className="hidden xs:inline">Download PDF</span>
                                    <span className="xs:hidden">Download PDF</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {hasWeeklyData ? (
                    // Handle both new weekly_plan and old weekly_details formats
                    <div className="p-4">{renderWeeklyDetails(dataToDisplay)}</div>
                ) : (
                    // Fallback for other formats
                    <div className="p-4">
                        <div className="text-center py-6">
                            <Dumbbell className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-base font-medium text-gray-900 mb-2">Workout Plan Generated</h3>
                            <p className="text-sm text-gray-600">Your personalized workout plan is ready!</p>
                        </div>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {JSON.stringify(dataToDisplay, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* Ratings and Feedback Section */}
            <div className="">
                {isHistoricalView ? (
                    <HistoricalRatingFeedback
                        key={`historical-feedback-${executionToken}`}
                        agent_id={agent_id || ""}
                        executionToken={executionToken || ""}
                        initialRating={rating}
                        initialFeedback={feedback}
                        agentOutputs={dataToDisplay}
                        onUpdate={(updatedRating, updatedFeedback) => {
                            setRating(updatedRating)
                            setFeedback(updatedFeedback)
                        }}
                        isDisabled={false}
                    />
                ) : (
                    <RatingFeedback
                        key={`feedback-${executionToken}`}
                        agent_id={agent_id || ""}
                        executionToken={executionToken || ""}
                        response={dataToDisplay}
                        onUpdate={(updatedRating, updatedFeedback) => {
                            setRating(updatedRating)
                            setFeedback(updatedFeedback)
                        }}
                        isDisabled={false}
                    />
                )}
            </div>
        </div>
    )
}

export default FormattedWorkoutResponse