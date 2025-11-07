"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import DietResponseLoader from "./DietResponseLoader"
import { toast } from "@/hooks/use-toast"
import RatingFeedback from "@/components/Content/RatingFeedback"
import HistoricalRatingFeedback from "@/components/Content/HistoricalRatingFeedback"
import { createDietPDFFromResponse } from "@/utils/DietPlannerPDFGenerator"
import YouTubeIcon from "@/assets/icons8-youtube.svg"
import Image from "next/image"
import ShareButton from "../ShareButton"
import {
  Utensils,
  Download,
  Calendar,
  Target,
  Activity,
  CheckCircle,
  Info,
  Loader2,
  X,
  AlertCircle,
  ChefHat,
  Share2,
} from "lucide-react"

interface FormattedDietResponseProps {
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
  dietType?: string | null
}

const FormattedDietResponse: React.FC<FormattedDietResponseProps> = ({
  response,
  onSave,
  agent_id,
  executionToken,
  formRef,
  historicalRating = null,
  historicalFeedback = null,
  isHistoricalView = false,
  dietType = null,
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
        const responseElement = document.getElementById("diet-plan-response")
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
      if (formRef?.current?.getLastApiResponse) {
        const lastResponse = formRef.current.getLastApiResponse()
        if (lastResponse) {
          userInputs = lastResponse
        }
      }

      // For historical data, try to reconstruct user inputs from the current form data
      if (isHistoricalView && formRef?.current) {
        // Try to get form data directly
        const formData = formRef.current.formData || {}
        userInputs = {
          age: formData.age,
          height: formData.height,
          weight: formData.weight,
          gender: formData.gender,
          diet_goal: formData.diet_goal,
          country: formData.country,
          dietary_preferences: formData.dietary_preferences,
          allergies: formData.allergies,
          calorie_goal: formData.calorie_goal,
          macro_goals: formData.macro_goals,
          meals_per_day: formData.meals_per_day,
          total_weeks: formData.total_weeks,
        }
      }

      // Generate and download PDF
      const filename = `${dietType || "diet"}-plan-${new Date().toISOString().split("T")[0]}.pdf`
      createDietPDFFromResponse(dataToDisplay, userInputs, filename)

      toast({
        title: "Success",
        description: "Diet plan is being generated! Please allow popups if prompted.",
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
       }
     } catch (err: any) {
       toast({ title: "Error", description: err?.message || "Failed to continue generation", variant: "destructive" })
     } finally {
       setIsContinuing(false)
       setShareResetSignal((prev) => prev + 1)
     }
   }

  if (response.loading) {
    return <DietResponseLoader />
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
          <div className="bg-blue-50 p-2 rounded-md">
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
                        <p className="text-xs text-blue-800">{isAvailable ? (week?.days?.length || 0) : 0} meal days</p>
                      </div>
                    </div>
                  </div>

                  {!isAvailable ? (
                    <div className="p-4">
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-center">
                        <p className="text-xs text-blue-800 mb-3">Content will be generated for this week.</p>
                        <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white" onClick={handleContinueGeneration} disabled={isContinuing}>
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
                                    <Utensils className="hidden sm:inline w-3 h-3 flex-shrink-0" />
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
                                      <Utensils className="w-3 h-3 text-blue-600" />
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
                                              className="mt-2 sm:mt-0 sm:ml-2 text-xs h-6 px-2 bg-transparent"
                                              onClick={() => window.open(meal.google_resource, "_blank")}
                                            >
                                              <Image
                                                src={YouTubeIcon || "/placeholder.svg"}
                                                alt="youtube icon"
                                                className="w-4 h-4 mr-1"
                                              />
                                              Watch Recipe
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

                                        {/* Ingredients */}
                                        {meal.ingredients && meal.ingredients.length > 0 && (
                                          <div className="mb-2">
                                            <h6 className="text-xs font-medium text-gray-900 mb-1 flex items-center gap-1">
                                              <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                                                <Utensils className="w-3 h-3 text-blue-600" />
                                              </div>
                                              Ingredients:
                                            </h6>
                                            <div className="flex flex-wrap gap-1">
                                              {meal.ingredients.map((ingredient: string, ingredientIndex: number) => (
                                                <Badge
                                                  key={ingredientIndex}
                                                  variant="outline"
                                                  className="text-xs px-2 py-0.5"
                                                >
                                                  {ingredient}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Instructions */}
                                        {meal.instructions && (
                                          <div className="mb-2">
                                            <h6 className="text-xs font-medium text-gray-900 mb-1 flex items-center gap-1">
                                              <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                                                <ChefHat className="w-3 h-3 text-green-600" />
                                              </div>
                                              Instructions:
                                            </h6>
                                            <p className="text-xs text-gray-600 leading-relaxed">{meal.instructions}</p>
                                          </div>
                                        )}

                                        {meal.tips && meal.tips.length > 0 && (
                                          <div className="bg-yellow-50 border border-yellow-200 p-3 sm:p-2 rounded">
                                            <h6 className="text-sm sm:text-xs font-medium text-yellow-900 mb-2 sm:mb-1 flex items-center gap-1">
                                              <AlertCircle className="w-4 h-4 sm:w-3 sm:h-3" />
                                              Tips:
                                            </h6>
                                            <ul className="space-y-2 sm:space-y-1">
                                              {meal.tips.map((tip: string, tipIndex: number) => (
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
                                    </div>
                                  ))}
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
  const currentagent_name = "diet-planner"

  return (
    <div id="diet-plan-response" className="w-full max-w-7xl space-y-4">
      {/* Lighter Header */}
      <div className="bg-white border border-blue-200 text-gray-800 p-3 sm:p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-medium flex items-center gap-2 truncate">
                <span className="truncate">
                  Your Personalized Diet Plan
                  {dietType && ` - ${dietType.charAt(0).toUpperCase() + dietType.slice(1)}`}
                </span>
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                AI-powered nutrition planning •{" "}
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
              />
            )}
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-xs whitespace-nowrap"
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
              <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-2">Diet Plan Generated</h3>
              <p className="text-sm text-gray-600">Your personalized diet plan is ready!</p>
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

export default FormattedDietResponse