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
    Utensils,
    Calendar,
    Target,
    Activity,
    CheckCircle,
    Info,
    ChefHat,
    Users,
    AlertCircle,
    Loader2,
    Home,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import Link from "next/link"
import LogoImage from "@/assets/logo.jpeg"
import YoutubeLogo from "@/assets/icons8-youtube.svg"

interface SharedData {
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

interface SharedDataResponse {
    status: boolean
    message: string
    data?: SharedData
    error?: string
}

const SharedDietPlan: React.FC = () => {
    const params = useParams()
    const uuid = params?.uuid as string
    const [sharedData, setSharedData] = useState<SharedData | null>(null)
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
            const data: SharedDataResponse = await response.json()

            if (data.status && data.data) {
                setSharedData(data.data)
            } else {
                setError(data.message || "Failed to load shared content")
            }
        } catch (err) {
            console.error("Error fetching shared data:", err)
            setError("Failed to load shared content. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const formatUserInputs = (inputs: Array<{ variable: string; variable_value: string }>) => {
        const formatted: { [key: string]: any } = {}

        inputs.forEach((input) => {
            let value: string | string[] | { [key: string]: any } = input.variable_value

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

            formatted[input.variable] = value
        })

        return formatted
    }

    const renderUserConfiguration = (userInputs: { [key: string]: any }) => {
        const basicInfo = [
            { label: "Age", key: "age", suffix: "years" },
            { label: "Height", key: "height", suffix: "cm" },
            { label: "Weight", key: "weight", suffix: "kg" },
            { label: "Gender", key: "gender" },
            { label: "Diet Goal", key: "diet_goal" },
            { label: "Country", key: "country" },
        ]

        const nutritionInfo = [
            { label: "Daily Calories", key: "calorie_goal", suffix: "calories" },
            { label: "Meals Per Day", key: "meals_per_day" },
            { label: "Program Duration", key: "total_weeks", suffix: "weeks" },
            { label: "Cooking Time", key: "available_cooking_time_per_day", suffix: "min/day" },
        ]

        return (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4 sm:mb-6">
                <button
                    onClick={() => setConfigExpanded(!configExpanded)}
                    className="w-full p-3 sm:p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Diet Configuration
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
                                    {basicInfo.map(
                                        (info) =>
                                            userInputs[info.key] && (
                                                <div
                                                    key={info.key}
                                                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0"
                                                >
                                                    <span className="text-xs sm:text-sm text-gray-600">{info.label}:</span>
                                                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                                                        {userInputs[info.key]} {info.suffix || ""}
                                                    </span>
                                                </div>
                                            ),
                                    )}
                                </div>
                            </div>

                            {/* Nutrition Goals */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Nutrition Goals</h3>
                                <div className="space-y-2">
                                    {nutritionInfo.map(
                                        (info) =>
                                            userInputs[info.key] && (
                                                <div
                                                    key={info.key}
                                                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0"
                                                >
                                                    <span className="text-xs sm:text-sm text-gray-600">{info.label}:</span>
                                                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                                                        {userInputs[info.key]} {info.suffix || ""}
                                                    </span>
                                                </div>
                                            ),
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Arrays - Dietary Preferences, Allergies, etc. */}
                        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                            {userInputs.dietary_preferences &&
                                Array.isArray(userInputs.dietary_preferences) &&
                                userInputs.dietary_preferences.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Dietary Preferences</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {userInputs.dietary_preferences.map((pref: string, index: number) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {pref}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            {userInputs.allergies && Array.isArray(userInputs.allergies) && userInputs.allergies.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Allergies</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {userInputs.allergies.map((allergy: string, index: number) => (
                                            <Badge key={index} variant="outline" className="text-xs bg-red-50 text-red-700">
                                                {allergy}
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
        // Support both new weekly_plan and older weekly_details formats
        const weeklyDetails = weeklyData?.weekly_plan || weeklyData?.weekly_details || weeklyData

        if (!weeklyDetails || !Array.isArray(weeklyDetails)) {
            return <div className="text-xs text-gray-500">No weekly details available</div>
        }

        return (
            <div className="space-y-4">
                <Tabs defaultValue={`week-${weeklyDetails[0]?.week || 1}`} className="w-full">
                    <div className="bg-blue-50 p-2 rounded-md">
                        <TabsList className="h-auto bg-transparent p-0 w-full flex-wrap justify-start">
                            <div
                                className={`grid gap-1 w-full ${weeklyDetails.length <= 2
                                    ? "grid-cols-2"
                                    : weeklyDetails.length <= 3
                                        ? "grid-cols-3"
                                        : weeklyDetails.length <= 4
                                            ? "grid-cols-4"
                                            : weeklyDetails.length <= 6
                                                ? "grid-cols-3 sm:grid-cols-6"
                                                : "grid-cols-4 sm:grid-cols-8"
                                    }`}
                            >
                                {weeklyDetails.map((week: any, weekIndex: number) => (
                                    <TabsTrigger
                                        key={weekIndex}
                                        value={`week-${week.week}`}
                                        className="text-xs flex items-center justify-center gap-1 p-2 rounded data-[state=active]:bg-white data-[state=active]:shadow transition-all duration-200 h-auto"
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
                                            <p className="text-xs text-blue-800">{week.days?.length || 0} meal days</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Week Summary */}
                                {(week.weekly_overview || week.weekly_summary) && (
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
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
                                        <div className="bg-blue-50 p-2 rounded-md mb-3">
                                            <TabsList className="h-auto bg-transparent p-0 w-full flex-wrap justify-start">
                                                <div
                                                    className={`grid gap-1 w-full ${(week.days?.length || 0) <= 2
                                                        ? "grid-cols-2"
                                                        : (week.days?.length || 0) <= 4
                                                            ? "grid-cols-4"
                                                            : "grid-cols-4 sm:grid-cols-7"
                                                        }`}
                                                >
                                                    {week.days?.map((day: any, dayIndex: number) => (
                                                        <TabsTrigger
                                                            key={dayIndex}
                                                            value={`day-${day.day}`}
                                                            className="text-xs flex items-center justify-center gap-1 p-2 rounded data-[state=active]:bg-white data-[state=active]:shadow transition-all duration-200 h-auto"
                                                        >
                                                            <ChefHat className="hidden sm:inline w-3 h-3 flex-shrink-0" />
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
                                                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                                                                <ChefHat className="w-3 h-3 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-medium text-blue-900">Day {day.day}</h4>
                                                                <p className="text-xs text-blue-800">{day.meals?.length || 0} meals planned</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Day Summary */}
                                                    {(day.day_summary || day.daily_summary) && (
                                                        <div className="bg-green-50 border border-green-100 p-3 rounded-md">
                                                            <div className="flex items-start gap-2">
                                                                <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                    <Info className="w-2 h-2 text-green-600" />
                                                                </div>
                                                                <div>
                                                                    <h5 className="text-xs font-medium text-green-900 mb-1">Daily Overview</h5>
                                                                    <p className="text-xs text-green-800 leading-relaxed">{day.day_summary || day.daily_summary}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Meals */}
                                                    <div className="space-y-3">
                                                        {day.meals?.map((meal: any, mealIndex: number) => (
                                                            <div key={mealIndex} className="bg-white border border-gray-200 rounded-md p-4 sm:p-3">
                                                                <div className="space-y-3 sm:space-y-2">
                                                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-2">
                                                                        <div className="flex-1">
                                                                            <h6 className="text-base sm:text-sm font-medium text-gray-900 mb-2 sm:mb-1">
                                                                                {mealIndex + 1}. {meal.name}
                                                                            </h6>
                                                                            <p className="text-xs sm:text-xs text-gray-600 leading-relaxed">
                                                                                {meal.description}
                                                                            </p>
                                                                        </div>
                                                                        {meal.google_resource && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="mt-3 sm:mt-0 sm:ml-3 text-xs sm:text-xs h-10 sm:h-8 px-4 sm:px-3 bg-transparent shrink-0 w-full sm:w-auto border-gray-200 hover:bg-red-50"
                                                                                onClick={() => window.open(meal.google_resource, "_blank")}
                                                                            >
                                                                                <Image
                                                                                    src={YoutubeLogo || "/placeholder.svg"}
                                                                                    alt="youtube-icon"
                                                                                    className="w-5 h-5 sm:w-4 sm:h-4 mr-2 sm:mr-1"
                                                                                />
                                                                                <span>Watch Recipe</span>
                                                                            </Button>
                                                                        )}
                                                                    </div>

                                                                    <div className="grid sm:grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                                                        {meal.calories && (
                                                                            <div className="bg-green-50 p-2.5 sm:p-2 rounded text-center">
                                                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                                                    <Target className="w-3 h-3 sm:w-2 sm:h-2 text-green-600" />
                                                                                    <span className="text-xs font-medium text-green-900">Calories</span>
                                                                                </div>
                                                                                <span className="text-sm font-medium text-green-700">{meal.calories}</span>
                                                                            </div>
                                                                        )}
                                                                        {meal.macros?.protein && (
                                                                            <div className="bg-blue-50 p-2.5 sm:p-2 rounded text-center">
                                                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                                                    <Activity className="w-3 h-3 sm:w-2 sm:h-2 text-blue-600" />
                                                                                    <span className="text-xs font-medium text-blue-900">Protein</span>
                                                                                </div>
                                                                                <span className="text-sm font-medium text-blue-700">{meal.macros.protein}g</span>
                                                                            </div>
                                                                        )}
                                                                        {meal.macros?.carbs && (
                                                                            <div className="bg-purple-50 p-2.5 sm:p-2 rounded text-center">
                                                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                                                    <Target className="w-3 h-3 sm:w-2 sm:h-2 text-purple-600" />
                                                                                    <span className="text-xs font-medium text-purple-900">Carbs</span>
                                                                                </div>
                                                                                <span className="text-sm font-medium text-purple-700">{meal.macros.carbs}g</span>
                                                                            </div>
                                                                        )}
                                                                        {meal.macros?.fat && (
                                                                            <div className="bg-orange-50 p-2.5 sm:p-2 rounded text-center">
                                                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                                                    <Activity className="w-3 h-3 sm:w-2 sm:h-2 text-orange-600" />
                                                                                    <span className="text-xs font-medium text-orange-900">Fat</span>
                                                                                </div>
                                                                                <span className="text-sm font-medium text-orange-700">{meal.macros.fat}g</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {meal.ingredients && meal.ingredients.length > 0 && (
                                                                        <div className="mb-3 sm:mb-2">
                                                                            <h6 className="text-sm sm:text-xs font-medium text-gray-900 mb-2 sm:mb-1 flex items-center gap-1">
                                                                                <Activity className="w-4 h-4 sm:w-3 sm:h-3" />
                                                                                Ingredients:
                                                                            </h6>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {meal.ingredients
                                                                                    .slice(0, 3)
                                                                                    .map((ingredient: string, ingredientIndex: number) => (
                                                                                        <Badge
                                                                                            key={ingredientIndex}
                                                                                            variant="outline"
                                                                                            className="text-xs px-2 py-0.5"
                                                                                        >
                                                                                            {ingredient}
                                                                                        </Badge>
                                                                                    ))}
                                                                                {meal.ingredients.length > 3 && (
                                                                                    <Badge variant="outline" className="text-xs px-2 py-0.5 text-gray-500">
                                                                                        +{meal.ingredients.length - 3} more
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {meal.instructions && (
                                                                        <div className="mb-3 sm:mb-2">
                                                                            <h6 className="text-sm sm:text-xs font-medium text-gray-900 mb-2 sm:mb-1 flex items-center gap-1">
                                                                                <ChefHat className="w-4 h-4 sm:w-3 sm:h-3" />
                                                                                Instructions:
                                                                            </h6>
                                                                            <p className="text-xs sm:text-xs text-gray-600 leading-relaxed line-clamp-2">
                                                                                {meal.instructions}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {meal.tips && meal.tips.length > 0 && (
                                                                        <div className="bg-yellow-50 border border-yellow-200 p-3 sm:p-2 rounded">
                                                                            <h6 className="text-sm sm:text-xs font-medium text-yellow-900 mb-2 sm:mb-1 flex items-center gap-1">
                                                                                <AlertCircle className="w-4 h-4 sm:w-3 sm:h-3" />
                                                                                Tips:
                                                                            </h6>
                                                                            <ul className="space-y-2 sm:space-y-1">
                                                                                {meal.tips.slice(0, 2).map((tip: string, tipIndex: number) => (
                                                                                    <li key={tipIndex} className="text-xs text-yellow-800 flex items-start gap-1">
                                                                                        <CheckCircle className="w-4 h-4 sm:w-3 sm:h-3 mt-0.5 flex-shrink-0 text-yellow-600" />
                                                                                        <span className="line-clamp-1">{tip}</span>
                                                                                    </li>
                                                                                ))}
                                                                                {meal.tips.length > 2 && (
                                                                                    <li className="text-xs text-yellow-700">+{meal.tips.length - 2} more tips</li>
                                                                                )}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                </div>
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
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Shared Diet Plan...</h2>
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
                        <AlertCircle className="w-8 h-8 text-red-600" />
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
    const dietType = userInputs.diet_goal || "Diet Plan"

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
                <title>{`Shared ${dietType} Diet Plan - AgentHub`}</title>
                <meta name="description" content={`View this personalized ${dietType} diet plan created with AgentHub`} />
                <meta property="og:title" content={`Shared ${dietType} Diet Plan - AgentHub`} />
                <meta
                    property="og:description"
                    content={`View this personalized ${dietType} diet plan created with AgentHub`}
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
                                <Utensils className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-medium flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    Shared {dietType.charAt(0).toUpperCase() + dietType.slice(1)} Diet Plan
                                </h1>
                                <p className="text-xs text-gray-600">
                                    AI-powered nutrition planning • Shared on {new Date(sharedData.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-xs text-blue-800">
                                <Info className="w-3 h-3 inline mr-1" />
                                This is a shared diet plan. Create your own personalized plan by visiting our homepage.
                            </p>
                        </div>
                    </div> */}

                    {/* User Configuration */}
                    {renderUserConfiguration(userInputs)}

                    {/* Diet Plan Content */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4">
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                Diet Plan Details
                            </h2>
                            {(dataToDisplay?.weekly_details && Array.isArray(dataToDisplay.weekly_details)) ||
                             (dataToDisplay?.weekly_plan && Array.isArray(dataToDisplay.weekly_plan)) ? (
                                renderWeeklyDetails(dataToDisplay)
                            ) : (
                                <div className="text-center py-6">
                                    <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                                    <h3 className="text-base font-medium text-gray-900 mb-2">Diet Plan Generated</h3>
                                    <p className="text-sm text-gray-600">Your personalized diet plan is ready!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="mt-6 sm:mt-8 text-center">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                                Want Your Own Personalized Diet Plan?
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Create a custom diet plan tailored to your specific needs, goals, and preferences.
                            </p>
                            <Link href="/?scrollTo=agents">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Utensils className="w-4 h-4 mr-2" />
                                    Create My Diet Plan
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SharedDietPlan
