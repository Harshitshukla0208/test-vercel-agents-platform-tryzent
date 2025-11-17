"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Head from "next/head"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
    Activity,
    Calendar,
    Target,
    CheckCircle,
    Info,
    Users,
    Loader2,
    Home,
    Clock,
    Dumbbell,
    ChevronDown,
    ChevronUp,
    Timer,
    Repeat,
    SunMedium
} from "lucide-react"
import Link from "next/link"
import LogoImage from "@/assets/logo.jpeg"
import YoutubeLogo from "@/assets/icons8-youtube.svg"

interface SharedWorkoutData {
    uuid: string
    createdAt: string
    userId: string
    agent_id: string
    execution_id: string
    user_inputs: Array<{
        variable: string
        variable_value: string
    }>
    file_data: any[]
    agent_outputs: any
    response_rating: number | null
    response_feedback: string | null
    filename: string | null
    updatedAt: string
}

interface SharedWorkoutDataResponse {
    status: boolean
    message: string
    data?: SharedWorkoutData
    error?: string
}

const SharedWorkoutPlan: React.FC = () => {
    const params = useParams()
    const uuid = params?.uuid as string
    const [sharedData, setSharedData] = useState<SharedWorkoutData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [configExpanded, setConfigExpanded] = useState(false)

    useEffect(() => {
        if (uuid) {
            fetchSharedData(uuid)
        }
    }, [uuid])

    const fetchSharedData = async (shareUuid: string) => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/get-shared-data/${shareUuid}`)
            const data: SharedWorkoutDataResponse = await response.json()

            if (data.status && data.data) {
                setSharedData(data.data)
            } else {
                setError(data.message || "Failed to load shared workout content")
            }
        } catch (err) {
            console.error("Error fetching shared workout data:", err)
            setError("Failed to load shared workout content. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const formatUserInputs = (inputs: Array<{ variable: string; variable_value: string }>) => {
        const formatted: { [key: string]: any } = {}

        inputs.forEach((input) => {
            let value: string | string[] | { [key: string]: any } | boolean | null | number = input.variable_value

            // Parse array strings
            if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
                try {
                    const parsed = JSON.parse(value.replace(/'/g, '"'))
                    value = Array.isArray(parsed) ? parsed : value
                } catch {
                    // If parsing fails, clean up the string manually
                    const cleanedValue = value
                        .slice(1, -1)
                        .split(",")
                        .map((item: string) => item.trim().replace(/'/g, ""))
                        .filter((item: string) => item !== "None" && item !== "")
                    value = cleanedValue
                }
            }

            // Parse object strings
            if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
                try {
                    value = JSON.parse(value.replace(/'/g, '"'))
                } catch {
                    // Keep as string if parsing fails
                }
            }

            // Parse boolean strings
            if (value === "True") value = true
            if (value === "False") value = false
            if (value === "None") value = null

            // Parse numbers
            if (typeof value === "string" && !isNaN(Number(value)) && value !== "") {
                value = Number(value)
            }

            formatted[input.variable] = value
        })

        return formatted
    }

    const renderUserConfiguration = (userInputs: { [key: string]: any }) => {
        const basicInfo = [
            { label: "User Type", key: "user_type" },
            { label: "Age", key: "age", suffix: "years" },
            { label: "Height", key: "height", suffix: "cm" },
            { label: "Weight", key: "weight", suffix: "kg" },
            { label: "Gender", key: "gender" },
            { label: "Fitness Level", key: "fitness_level" },
        ]

        const workoutInfo = [
            { label: "Days Per Week", key: "available_days_per_week", suffix: "days" },
            { label: "Time Per Day", key: "available_time_per_day", suffix: "minutes" },
            { label: "Program Duration", key: "total_weeks", suffix: "weeks" },
            { label: "Gym Access", key: "gym_access", type: "boolean" },
            { label: "Outdoor Preference", key: "outdoor_preference", type: "boolean" },
        ]

        return (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4 sm:mb-6">
                <button
                    onClick={() => setConfigExpanded(!configExpanded)}
                    className="w-full p-3 sm:p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Workout Configuration
                    </h2>
                    {configExpanded ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    )}
                </button>

                {configExpanded && (
                    <div className="p-3 sm:p-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {/* Basic Information */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h3>
                                <div className="space-y-2">
                                    {basicInfo.map((info) => {
                                        let displayValue = userInputs[info.key]
                                        if (Array.isArray(displayValue) && displayValue.length === 1) {
                                            displayValue = displayValue[0]
                                        }
                                        if (Array.isArray(displayValue) && displayValue.length > 1) {
                                            displayValue = displayValue.join(", ")
                                        }

                                        return displayValue !== null && displayValue !== undefined && displayValue !== "" ? (
                                            <div
                                                key={info.key}
                                                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0"
                                            >
                                                <span className="text-xs sm:text-sm text-gray-600">{info.label}:</span>
                                                <span className="text-xs sm:text-sm font-medium text-gray-900">
                                                    {String(displayValue)} {info.suffix || ""}
                                                </span>
                                            </div>
                                        ) : null
                                    })}
                                </div>
                            </div>

                            {/* Workout Information */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Workout Information</h3>
                                <div className="space-y-2">
                                    {workoutInfo.map((info) => {
                                        let displayValue = userInputs[info.key]
                                        if (info.type === "boolean") {
                                            displayValue = displayValue ? "Yes" : "No"
                                        }

                                        return displayValue !== null && displayValue !== undefined && displayValue !== "" ? (
                                            <div
                                                key={info.key}
                                                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0"
                                            >
                                                <span className="text-xs sm:text-sm text-gray-600">{info.label}:</span>
                                                <span className="text-xs sm:text-sm font-medium text-gray-900">
                                                    {String(displayValue)} {info.suffix || ""}
                                                </span>
                                            </div>
                                        ) : null
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Arrays - Goals, Equipment, etc. */}
                        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                            {userInputs.fitness_goals &&
                                Array.isArray(userInputs.fitness_goals) &&
                                userInputs.fitness_goals.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Fitness Goals</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {userInputs.fitness_goals.map((goal: string, index: number) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {goal}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {userInputs.home_equipment &&
                                Array.isArray(userInputs.home_equipment) &&
                                userInputs.home_equipment.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Home Equipment</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {userInputs.home_equipment.map((equipment: string, index: number) => (
                                                <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700">
                                                    {equipment}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {userInputs.health_conditions &&
                                Array.isArray(userInputs.health_conditions) &&
                                userInputs.health_conditions.length > 0 &&
                                !userInputs.health_conditions.includes("none") && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Health Conditions</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {userInputs.health_conditions.map((condition: string, index: number) => (
                                                <Badge key={index} variant="outline" className="text-xs bg-red-50 text-red-700">
                                                    {condition}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>

                        {/* Special Requests & Comments */}
                        {(userInputs.special_requests || userInputs.additional_comments) && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                {userInputs.special_requests && (
                                    <div className="mb-2">
                                        <span className="text-sm font-medium text-gray-700">Special Requests: </span>
                                        <span className="text-sm text-gray-600">{userInputs.special_requests}</span>
                                    </div>
                                )}
                                {userInputs.additional_comments && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">Additional Comments: </span>
                                        <span className="text-sm text-gray-600">{userInputs.additional_comments}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    const renderWeeklyDetails = (weeklyData: any) => {
        // Handle new format: weekly_plan array or weekly_details
        let weeklyDetails = weeklyData.weekly_plan || weeklyData.weekly_details || weeklyData

        if (!weeklyDetails || !Array.isArray(weeklyDetails)) {
            return <div className="text-xs text-gray-500">No weekly details available</div>
        }

        return (
            <div className="space-y-4">
                <Tabs defaultValue={`week-${weeklyDetails[0]?.week || 1}`} className="w-full">
                    <div className="bg-indigo-50 p-2 rounded-md">
                        <TabsList className="h-auto bg-transparent p-0 w-full flex-wrap justify-start">
                            <div
                                className={`grid gap-1 w-full ${weeklyDetails.length === 1
                                    ? "grid-cols-1"
                                    : weeklyDetails.length === 2
                                        ? "grid-cols-2"
                                        : weeklyDetails.length === 3
                                            ? "grid-cols-3"
                                            : weeklyDetails.length === 4
                                                ? "grid-cols-2 sm:grid-cols-4"
                                                : weeklyDetails.length === 5
                                                    ? "grid-cols-5"
                                                    : weeklyDetails.length === 6
                                                        ? "grid-cols-3 sm:grid-cols-6"
                                                        : weeklyDetails.length <= 8
                                                            ? "grid-cols-4 sm:grid-cols-8"
                                                            : "grid-cols-4 sm:grid-cols-12"
                                    }`}
                            >
                                {weeklyDetails.map((week: any, weekIndex: number) => (
                                    <TabsTrigger
                                        key={weekIndex}
                                        value={`week-${week.week}`}
                                        className="text-xs flex items-center justify-center gap-1 p-2 rounded data-[state=active]:bg-white data-[state=active]:shadow transition-all duration-200 h-auto min-h-[2.5rem]"
                                    >
                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                        <span className="hidden sm:inline whitespace-nowrap">Week {week.week}</span>
                                        <span className="sm:hidden">Week{week.week}</span>
                                    </TabsTrigger>
                                ))}
                            </div>
                        </TabsList>
                    </div>

                    {/* Week Content */}
                    {weeklyDetails.map((week: any, weekIndex: number) => (
                        <TabsContent key={weekIndex} value={`week-${week.week}`} className="mt-4">
                            <div className="bg-white overflow-hidden">
                                {/* Week Header */}
                                <div className="bg-white p-3 border-b mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                                            <Calendar className="w-3 h-3 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-blue-900">Week {week.week}</h3>
                                            <p className="text-xs text-blue-800">{week.days?.length || 0} workout days</p>
                                        </div>
                                    </div>
                                </div>

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
                                                            className="text-xs flex items-center justify-center gap-1 p-2 rounded data-[state=active]:bg-white data-[state=active]:shadow transition-all duration-200 h-auto min-h-[2.5rem]"
                                                        >
                                                            <SunMedium className="hidden sm:inline w-3 h-3 flex-shrink-0" />
                                                            <span className="hidden sm:inline whitespace-nowrap">Day {day.day}</span>
                                                            <span className="sm:hidden">Day {day.day}</span>
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
                                                    <div className="bg-white p-3 rounded-md border border-blue-200">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                                                                <Dumbbell className="w-3 h-3 text-blue-600" />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <h4 className="text-sm font-medium text-gray-900 mb-1 sm:mb-1">Day {day.day}</h4>
                                                                <p className="text-xs text-gray-600 leading-relaxed sm:leading-normal">( {day.focus} )</p>
                                                            </div>
                                                        </div>

                                                        {day.day_summary && (
                                                            <p className="text-xs text-gray-700 leading-relaxed">{day.day_summary}</p>
                                                        )}
                                                    </div>

                                                    {/* Activities */}
                                                    <div className="space-y-3">
                                                        {day.activities?.map((activity: any, activityIndex: number) => (
                                                            <div
                                                                key={activityIndex}
                                                                className="bg-white border border-gray-200 rounded-md p-4 sm:p-3"
                                                            >
                                                                {/* Activity Header */}
                                                                <div className="space-y-3 sm:space-y-2">
                                                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                                                        <div className="flex-1">
                                                                            <h6 className="text-sm sm:text-sm font-medium text-gray-900 mb-2 sm:mb-1">
                                                                                {activityIndex + 1}. {activity.name}
                                                                            </h6>
                                                                            <p className="text-xs sm:text-xs text-gray-600 leading-relaxed sm:leading-normal">
                                                                                {activity.description}
                                                                            </p>
                                                                        </div>
                                                                        {activity.how_to_link && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="mt-3 sm:mt-0 sm:ml-3 text-sm sm:text-xs h-10 sm:h-8 px-4 sm:px-3 bg-transparent shrink-0 w-full sm:w-auto border-gray-200 hover:bg-red-50"
                                                                                onClick={() => window.open(activity.how_to_link, "_blank")}
                                                                            >
                                                                                <Image
                                                                                    src={YoutubeLogo || "/placeholder.svg"}
                                                                                    alt="youtube-logo"
                                                                                    className="w-5 h-5 sm:w-4 sm:h-4 mr-2 sm:mr-1"
                                                                                />
                                                                                <span>Watch Tutorial</span>
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 mt-4 sm:mt-3">
                                                                    {(() => {
                                                                        const items = []
                                                                        let itemCount = 0

                                                                        if (activity.sets) {
                                                                            itemCount++
                                                                            items.push(
                                                                                <div
                                                                                    key="sets"
                                                                                    className="bg-blue-50 p-3 sm:p-2.5 rounded-lg sm:rounded text-center min-h-[60px] sm:min-h-[50px]"
                                                                                >
                                                                                    <div className="flex items-center justify-center gap-1.5 sm:gap-1 mb-1.5 sm:mb-1">
                                                                                        <Repeat className="w-4 h-4 sm:w-3 sm:h-3 text-blue-600" />
                                                                                        <span className="text-xs sm:text-xs font-medium text-blue-900">Sets</span>
                                                                                    </div>
                                                                                    <span className="text-base sm:text-base font-semibold sm:font-medium text-blue-700">
                                                                                        {activity.sets}
                                                                                    </span>
                                                                                </div>,
                                                                            )
                                                                        }

                                                                        if (activity.reps) {
                                                                            itemCount++
                                                                            items.push(
                                                                                <div
                                                                                    key="reps"
                                                                                    className="bg-green-50 p-3 sm:p-2.5 rounded-lg sm:rounded text-center min-h-[60px] sm:min-h-[50px]"
                                                                                >
                                                                                    <div className="flex items-center justify-center gap-1.5 sm:gap-1 mb-1.5 sm:mb-1">
                                                                                        <Target className="w-4 h-4 sm:w-3 sm:h-3 text-green-600" />
                                                                                        <span className="text-xs sm:text-xs font-medium text-green-900">Reps</span>
                                                                                    </div>
                                                                                    <span className="text-base sm:text-base font-semibold sm:font-medium text-green-700">
                                                                                        {activity.reps}
                                                                                    </span>
                                                                                </div>,
                                                                            )
                                                                        }

                                                                        if (activity.duration_minutes) {
                                                                            itemCount++
                                                                            items.push(
                                                                                <div
                                                                                    key="duration"
                                                                                    className="bg-orange-50 p-3 sm:p-2.5 rounded-lg sm:rounded text-center min-h-[60px] sm:min-h-[50px]"
                                                                                >
                                                                                    <div className="flex items-center justify-center gap-1.5 sm:gap-1 mb-1.5 sm:mb-1">
                                                                                        <Timer className="w-4 h-4 sm:w-3 sm:h-3 text-orange-600" />
                                                                                        <span className="text-xs sm:text-xs font-medium text-orange-900">
                                                                                            Duration
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="text-base sm:text-base font-semibold sm:font-medium text-orange-700">
                                                                                        {activity.duration_minutes}m
                                                                                    </span>
                                                                                </div>,
                                                                            )
                                                                        }

                                                                        // Move estimated time display below equipment with badge styling

                                                                        if (activity.rest_seconds) {
                                                                            itemCount++
                                                                            const isOddOnMobile = itemCount % 2 === 1

                                                                            items.push(
                                                                                <div
                                                                                    key="rest"
                                                                                    className={`bg-purple-50 p-3 sm:p-2.5 rounded-lg sm:rounded text-center min-h-[60px] sm:min-h-[50px] ${isOddOnMobile ? "col-span-2 sm:col-span-1" : ""
                                                                                        }`}
                                                                                >
                                                                                    <div className="flex items-center justify-center gap-1.5 sm:gap-1 mb-1.5 sm:mb-1">
                                                                                        <Clock className="w-4 h-4 sm:w-3 sm:h-3 text-purple-600" />
                                                                                        <span className="text-xs sm:text-xs font-medium text-purple-900">Rest</span>
                                                                                    </div>
                                                                                    <span className="text-base sm:text-base font-semibold sm:font-medium text-purple-700">
                                                                                        {activity.rest_seconds}s
                                                                                    </span>
                                                                                </div>,
                                                                            )
                                                                        }

                                                                        return items
                                                                    })()}
                                                                </div>

                                                                {activity.equipment && (
                                                                    <div className="mb-2 mt-2 flex flex-col sm:flex-row gap-1 sm:gap-2 sm:justify-start sm:items-center">
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
                                                                    <div className="mb-3 -mt-1 flex flex-col sm:flex-row gap-1 sm:gap-2 sm:justify-start sm:items-center">
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

                                                                {activity.tips && activity.tips.length > 0 && (
                                                                    <div className="bg-yellow-50 border border-yellow-200 p-3 sm:p-2 rounded">
                                                                        <h6 className="text-xs sm:text-xs font-medium text-yellow-900 mb-2 sm:mb-1 flex items-center gap-1">
                                                                            <CheckCircle className="w-4 h-4 sm:w-3 sm:h-3" />
                                                                            Tips:
                                                                        </h6>
                                                                        <ul className="space-y-1">
                                                                            {activity.tips.map((tip: string, tipIndex: number) => (
                                                                                <li
                                                                                    key={tipIndex}
                                                                                    className="text-xs sm:text-xs text-yellow-800 flex items-start gap-1"
                                                                                >
                                                                                    <span className="text-yellow-600 mt-0.5">•</span>
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
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                </div>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Shared Workout Plan...</h2>
                    <p className="text-sm text-gray-600">Please wait while we fetch the content</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Content Not Found</h2>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                    <Link href="/">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Home className="w-4 h-4 mr-2" />
                            Go to Home
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    if (!sharedData) {
        return null
    }

    const userInputs = formatUserInputs(sharedData.user_inputs)
    const workoutType = userInputs.user_type || "Workout Plan"

    // Enhanced data processing for the new response format
    let dataToDisplay = sharedData.agent_outputs

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

    return (
        <>
            <Head>
                <title>{`Shared ${workoutType} Workout Plan - AgentHub`}</title>
                <meta name="description" content={`View this personalized ${workoutType} workout plan created with AgentHub`} />
                <meta property="og:title" content={`Shared ${workoutType} Workout Plan - AgentHub`} />
                <meta
                    property="og:description"
                    content={`View this personalized ${workoutType} workout plan created with AgentHub`}
                />
                <meta property="og:type" content="website" />
            </Head>

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Image src={LogoImage || "/placeholder.svg"} alt="logo" className="h-8 w-8 rounded-md" />
                                <div className="flex flex-col">
                                    <Link href="/">
                                        <span className="text-lg font-bold text-gray-900">AgentHub</span>
                                    </Link>
                                    <span className="text-xs text-gray-500">
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
                            <div className="flex items-center gap-2">
                                <Link href="/?scrollTo=agents">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4">
                                        <Home className="w-4 h-4 mr-1" />
                                        <span className="hidden sm:inline">Create Your Own</span>
                                        <span className="sm:hidden">Create</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto p-4">
                    {/* Shared Content Header */}
                    {/* <div className="bg-white border border-blue-200 text-gray-800 p-4 rounded-lg mb-4 sm:mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Activity className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-medium flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    Shared {workoutType.charAt(0).toUpperCase() + workoutType.slice(1)} Workout Plan
                                </h1>
                                <p className="text-xs text-gray-600">
                                    AI-powered fitness planning • Shared on {new Date(sharedData.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-xs text-blue-800">
                                <Info className="w-3 h-3 inline mr-1" />
                                This is a shared workout plan. Create your own personalized plan by visiting our homepage.
                            </p>
                        </div>
                    </div> */}

                    {/* User Configuration */}
                    {renderUserConfiguration(userInputs)}

                    {/* Workout Plan Content */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                Workout Plan Details
                            </h2>
                            {(dataToDisplay?.weekly_details && Array.isArray(dataToDisplay.weekly_details)) ||
                                (dataToDisplay?.weekly_plan && Array.isArray(dataToDisplay.weekly_plan)) ? (
                                renderWeeklyDetails(dataToDisplay)
                            ) : (
                                <div className="text-center py-6">
                                    <Activity className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                                    <h3 className="text-base font-medium text-gray-900 mb-2">Workout Plan Generated</h3>
                                    <p className="text-sm text-gray-600">Your personalized workout plan is ready!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="mt-6 sm:mt-8 text-center">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                                Want Your Own Personalized Workout Plan?
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Create a custom workout plan tailored to your specific fitness level, goals, and equipment.
                            </p>
                            <Link href="/?scrollTo=agents">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Activity className="w-4 h-4 mr-2" />
                                    Create My Workout Plan
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SharedWorkoutPlan
