"use client"

import type React from "react"
import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Utensils, Loader2, Calendar, Users, Target, Clock, Building, Heart, Activity } from "lucide-react"
import axios from "axios"
import { toast } from "@/hooks/use-toast"
import { useRating } from "@/components/Content/RatingContext"
import { markErrorsAndScroll, clearFieldError } from "@/utils/validationUX"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import ContactPopup from "@/components/ContactPopup"
import { useCreditsCheck } from "@/hooks/use-credits-checks"

interface AgentInput {
  variable: string
  datatype: string
  variable_description: string
  Required: boolean
}

interface Agent {
  agent_Inputs: AgentInput[]
  agent_endpoint?: string
  execution_credit?: string
}

interface DynamicDietFormProps {
  agentData: Agent
  onResponse: (response: any) => void
  Detailed_description?: string
}

// Static dropdown options for diet fields
const STATIC_OPTIONS = {
  gender: ["male", "female", "other"],
  diet_goal: ["weight loss", "weight gain", "muscle gain", "maintenance"],
  your_activity_level: ["sedentary", "light", "moderate", "active", "very active"],
  country: [
    "United States",
    "Canada",
    "United Kingdom",
    "Australia",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "India",
    "China",
    "Japan",
    "Brazil",
    "Mexico",
    "Other",
  ],
  dietary_preferences: [
    "vegetarian",
    "Ovo-vegetarian (Eggs allowed)",
    "vegan",
    "non-vegetarian",
    "pescatarian",
    "keto",
    "paleo",
    "mediterranean",
    "low-carb",
    "high protein",
    "gluten-free",
    "dairy-free",
  ],
  allergies: ["none", "gluten", "dairy", "nuts", "shellfish", "eggs", "soy", "fish", "peanuts", "sesame"],
  meals_per_day: ["2", "3", "4", "5", "6"],
  available_cooking_time_per_day: ["15", "30", "45", "60", "90", "120", "180"],
  kitchen_equipment: [
    "stove",
    "oven",
    "microwave",
    "blender",
    "food processor",
    "air fryer",
    "slow cooker",
    "pressure cooker",
    "grill",
    "steamer",
    "toaster",
  ],
  health_conditions: [
    "none",
    "diabetes",
    "high blood pressure",
    "heart disease",
    "high cholesterol",
    "thyroid issues",
    "digestive issues",
    "food sensitivities",
    "kidney disease",
  ],
  total_weeks: ["1", "2", "4", "6", "8", "12"],
}

const DynamicDietForm = forwardRef(({ agentData, onResponse, Detailed_description }: DynamicDietFormProps, ref) => {
  const [formData, setFormData] = useState<{
    [key: string]: string | boolean | number | string[] | number[] | null | object
  }>({
    age: "",
    height: "",
    weight: "",
    gender: "",
    diet_goal: "",
    your_activity_level: "",
    country: "",
    custom_country: "",
    dietary_preferences: [],
    allergies: [],
    meals_per_day: "",
    available_cooking_time_per_day: "",
    kitchen_equipment: [],
    health_conditions: [],
    special_instructions: "",
    total_weeks: "",
  })

  const [loading, setLoading] = useState(false)
  const [agent_id, setagent_id] = useState<string>("")
  const [lastApiResponse, setLastApiResponse] = useState<any>(null)
  const { setExecutionData } = useRating()
  const [showContactPopup, setShowContactPopup] = useState(false)
  const { checkCreditsBeforeExecution } = useCreditsCheck()
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)

  // Initialize form data with empty values
  useEffect(() => {
    const initialData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {
      age: "",
      height: "",
      weight: "",
      gender: "",
      diet_goal: "",
      your_activity_level: "",
      country: "",
      custom_country: "",
      dietary_preferences: [],
      allergies: [],
      meals_per_day: "",
      available_cooking_time_per_day: "",
      kitchen_equipment: [],
      health_conditions: [],
      special_instructions: "",
      total_weeks: "",
    }

    setFormData(initialData)
  }, [])

  const router = useRouter()

  // Handle form field changes
  const handleInputChange = (variable: string, value: string | boolean | number | string[] | number[] | null) => {
    setFormData((prev) => ({
      ...prev,
      [variable]: value,
    }))
    clearFieldError(variable)
  }

  // Handle multi-select changes
  const handleMultiSelectChange = (variable: string, value: string, isChecked: boolean) => {
    setFormData((prev) => {
      const currentValues = Array.isArray(prev[variable]) ? (prev[variable] as string[]) : []

      if (isChecked) {
        return {
          ...prev,
          [variable]: [...currentValues, value],
        }
      } else {
        return {
          ...prev,
          [variable]: currentValues.filter((item) => item !== value),
        }
      }
    })
    clearFieldError(variable)
  }

  // Helper function to safely parse array strings and handle special values
  const parseArrayString = (value: string): string[] => {
    if (!value || value === "None" || value === "null") return []

    // Handle different array string formats
    try {
      // Remove outer brackets and quotes, then split by comma
      const cleaned = value.replace(/^\[|\]$/g, "").replace(/'/g, '"')
      if (cleaned.trim() === "" || cleaned.trim() === "None") return []

      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(`[${cleaned}]`)
        return Array.isArray(parsed) ? parsed.map(String).filter((item) => item !== "None") : []
      } catch {
        // Fallback: split by comma and clean up
        return cleaned
          .split(",")
          .map((item) => item.trim().replace(/"/g, ""))
          .filter((item) => item !== "None" && item !== "")
      }
    } catch {
      // Last resort: return as single item array if not None
      return value === "None" ? [] : [value]
    }
  }

  // Helper function to parse boolean strings
  const parseBooleanString = (value: string): boolean => {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      return value.toLowerCase() === "true"
    }
    return false
  }

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    loadHistoryData: (historyInputs: any, fileData?: any) => {
      if (!historyInputs) return

      let inputsObject: { [key: string]: any } = {}

      if (Array.isArray(historyInputs)) {
        historyInputs.forEach((item: any) => {
          if (item.variable && item.variable_value !== undefined) {
            inputsObject[item.variable] = item.variable_value
          }
        })
      } else if (typeof historyInputs === "object") {
        inputsObject = historyInputs
      } else {
        return
      }

      // Extract thread_id if available
      if (inputsObject.thread_id) {
        setCurrentThreadId(inputsObject.thread_id)
      }

      const newFormData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {}

      // Process each input and set appropriate values
      Object.keys(inputsObject).forEach((key) => {
        const value = inputsObject[key]

        if (value === null || value === undefined || value === "None") {
          newFormData[key] = Array.isArray(formData[key]) ? [] : ""
          return
        }

        if (typeof value === "boolean") {
          newFormData[key] = value
        } else if (typeof value === "number") {
          newFormData[key] = value
        } else if (Array.isArray(value)) {
          newFormData[key] = value
        } else if (typeof value === "object") {
          newFormData[key] = value
        } else if (typeof value === "string") {
          // Special handling for equipment arrays and other array fields
          if (
            key === "dietary_preferences" ||
            key === "allergies" ||
            key === "kitchen_equipment" ||
            key === "health_conditions"
          ) {
            if (value === "None" || value === "null") {
              newFormData[key] = []
            } else if (value.startsWith("[") && value.endsWith("]")) {
              newFormData[key] = parseArrayString(value)
            } else if (value.includes(",")) {
              // Handle comma-separated values
              newFormData[key] = value
                .split(",")
                .map((item) => item.trim())
                .filter((item) => item !== "None" && item !== "")
            } else if (value.trim() === "" || value === "None") {
              newFormData[key] = []
            } else {
              newFormData[key] = [value]
            }
          } else if (value.startsWith("{") && value.endsWith("}")) {
            try {
              const parsedObject = JSON.parse(value.replace(/'/g, '"'))
              newFormData[key] = parsedObject
            } catch {
              newFormData[key] = {}
            }
          } else {
            newFormData[key] = value
          }
        } else {
          newFormData[key] = String(value)
        }
      })

      console.log("Loading history data:", newFormData) // Debug log
      setFormData(newFormData)

      // Handle file data if provided
      if (fileData) {
        // This part of the logic needs to be adapted to handle fileData and s3FileUrls/filePreviewUrls
        // For now, we'll just set the state, but the actual file handling will be more complex
        // setFileData(fileData)
        // setS3FileUrls(fileData)
        // setFilePreviewUrls(fileData)
      }
    },

    forceUpdate: () => {
      setFormData((prev) => ({ ...prev }))
    },

    clearForm: () => {
      const resetData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {
        age: "",
        height: "",
        weight: "",
        gender: "",
        diet_goal: "",
        your_activity_level: "",
        country: "",
        custom_country: "",
        dietary_preferences: [],
        allergies: [],
        meals_per_day: "",
        available_cooking_time_per_day: "",
        kitchen_equipment: [],
        health_conditions: [],
        special_instructions: "",
        total_weeks: "",
      }
      setFormData(resetData)
      setCurrentThreadId(null)
    },

    updateLastApiResponse: (updatedData: any) => {
      setLastApiResponse(updatedData)
    },

    getLastApiResponse: () => {
      return lastApiResponse
    },

    getThreadId: () => {
      return currentThreadId
    },

    getUserRequest: () => {
      // Build the same shape used for execution
      return {
        age: Number(formData.age),
        height: Number(formData.height),
        weight: Number(formData.weight),
        gender: formData.gender,
        diet_goal: formData.diet_goal,
        your_activity_level: formData.your_activity_level,
        country: formData.country === "Other" ? formData.custom_country : formData.country,
        dietary_preferences: Array.isArray(formData.dietary_preferences) ? formData.dietary_preferences : [],
        allergies: Array.isArray(formData.allergies) ? formData.allergies : [],
        meals_per_day: Number(formData.meals_per_day),
        available_cooking_time_per_day: Number(formData.available_cooking_time_per_day) || 60,
        kitchen_equipment: Array.isArray(formData.kitchen_equipment) ? formData.kitchen_equipment : [],
        health_conditions: Array.isArray(formData.health_conditions) ? formData.health_conditions : [],
        special_instructions: formData.special_instructions || "",
        total_weeks: Number(formData.total_weeks),
      }
    },

    getMetaData: () => {
      if (!lastApiResponse) return null
      // lastApiResponse may be an array or object
      const data = Array.isArray(lastApiResponse) ? lastApiResponse[0] : lastApiResponse
      if (!data) return null
      if (data.meta_data) return data.meta_data
      if (data.data?.meta_data) return data.data.meta_data
      if (data.agent_outputs?.meta_data) return data.agent_outputs.meta_data
      return null
    },

    getDietType: () => {
      return formData.diet_goal ? String(formData.diet_goal) : null
    },
    getFormData: () => {
      return formData
    },

    createNew: () => {
      // Reset form data to initial state
      const resetData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {
        age: "",
        height: "",
        weight: "",
        gender: "",
        diet_goal: "",
        your_activity_level: "",
        country: "",
        custom_country: "",
        dietary_preferences: [],
        allergies: [],
        meals_per_day: "",
        available_cooking_time_per_day: "",
        kitchen_equipment: [],
        health_conditions: [],
        special_instructions: "",
        total_weeks: "",
      }
      setFormData(resetData)

      // Reset the parent component's response state
      onResponse(null)
      setCurrentThreadId(null)
    },
  }))

  // Extract agent token from URL path
  useEffect(() => {
    const path = window.location.pathname
    const token = path.split("/").pop() || ""
    setagent_id(token)
  }, [])

  const handleClearAll = () => {
    const resetData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {
      age: "",
      height: "",
      weight: "",
      gender: "",
      diet_goal: "",
      your_activity_level: "",
      country: "",
      custom_country: "",
      dietary_preferences: [],
      allergies: [],
      meals_per_day: "",
      available_cooking_time_per_day: "",
      kitchen_equipment: [],
      health_conditions: [],
      special_instructions: "",
      total_weeks: "",
    }
    setFormData(resetData)
    setCurrentThreadId(null)
  }

  const handleCreateNew = () => {
    // Reset form data to initial state
    const resetData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {
      age: "",
      height: "",
      weight: "",
      gender: "",
      diet_goal: "",
      your_activity_level: "",
      country: "",
      custom_country: "",
      dietary_preferences: [],
      allergies: [],
      meals_per_day: "",
      available_cooking_time_per_day: "",
      kitchen_equipment: [],
      health_conditions: [],
      special_instructions: "",
      total_weeks: "",
    }
    setFormData(resetData)

    // Reset the parent component's response state
    onResponse(null)
    setCurrentThreadId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const hasCredits = await checkCreditsBeforeExecution()
    if (!hasCredits) {
      setShowContactPopup(true)
      return
    }

    // Validation
    const requiredFields = [
      "age",
      "height",
      "weight", 
      "gender",
      "diet_goal",
      "your_activity_level",
      "country",
      "dietary_preferences",
      "meals_per_day",
      "total_weeks",
    ]

    const missingFields = requiredFields.filter((field) => {
      if (field === "dietary_preferences") {
        return !Array.isArray(formData[field]) || (formData[field] as string[]).length === 0
      }
      if (field === "country") {
        return !formData[field] || (formData[field] === "Other" && !formData.custom_country)
      }
      return !formData[field]
    })

    if (missingFields.length > 0) {
      markErrorsAndScroll(missingFields as string[])
      toast({
        title: "Validation Error",
        description: `Please fill in: ${missingFields.join(", ").replace(/_/g, " ")}`,
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    try {
      setLoading(true)
      onResponse({ loading: true })

      const accessToken = Cookies.get("access_token")
      if (!accessToken) {
        toast({
          title: "Authentication Error",
          description: "Access token not found. Please log in again.",
          variant: "destructive",
          duration: 3000,
        })
        handleTokenExpiration()
        setLoading(false)
        return
      }

      const formDataToSend = new FormData()
      formDataToSend.append("agent_id", agent_id)
      formDataToSend.append("access_token", accessToken)

      // Add thread_id if we have one from history
      if (currentThreadId) {
        formDataToSend.append("thread_id", currentThreadId)
      }

      // Format the API parameters according to the sample payload
      const apiParams: any = {
        age: Number(formData.age),
        height: Number(formData.height),
        weight: Number(formData.weight),
        gender: formData.gender,
        diet_goal: formData.diet_goal,
        your_activity_level: formData.your_activity_level,
        country: formData.country === "Other" ? formData.custom_country : formData.country,
        dietary_preferences: Array.isArray(formData.dietary_preferences) ? formData.dietary_preferences : [],
        allergies: Array.isArray(formData.allergies) ? formData.allergies : [],
        meals_per_day: Number(formData.meals_per_day),
        available_cooking_time_per_day: Number(formData.available_cooking_time_per_day) || 60,
        kitchen_equipment: Array.isArray(formData.kitchen_equipment) ? formData.kitchen_equipment : [],
        health_conditions: Array.isArray(formData.health_conditions) ? formData.health_conditions : [],
        special_instructions: formData.special_instructions || "",
        total_weeks: Number(formData.total_weeks),
      }

      console.log("Submitting API params:", apiParams)

      const apiParamsArray = [apiParams]
      formDataToSend.append("api_params", JSON.stringify(apiParamsArray))

      try {
        const { data } = await axios.post("/api/execute-agent", formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 300000,
        })

        if (data.status) {
          setLastApiResponse(data.data)

          // Update thread_id if returned from API
          if (data.thread_id) {
            setCurrentThreadId(data.thread_id)
          }

          setExecutionData({
            agent_id,
            executionToken: data.execution_id,
            response: data.data,
          })

          // Get diet type for response
          const dietType = String(formData.diet_goal)

          onResponse({
            data: data.data,
            execution_id: data.execution_id,
            agent_id: agent_id,
            message: data.message,
            status: data.status,
            dietType: dietType,
          })

          toast({
            title: "Success",
            description: data.message || "Diet plan generated successfully!",
            duration: 3000,
          })
        } else {
          throw new Error(data.error || "Failed to generate diet plan")
        }
      } catch (axiosError) {
        if (axios.isAxiosError(axiosError)) {
          if (axiosError.response?.status === 401) {
            handleTokenExpiration()
            return
          }

          const errorMessage =
            axiosError.response?.data?.error || axiosError.response?.data?.message || axiosError.message

          toast({
            title: "Request Error",
            description: errorMessage,
            variant: "destructive",
            duration: 3000,
          })

          onResponse({
            error: errorMessage,
            status: axiosError.response?.status,
          })
        } else {
          throw axiosError
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"

      onResponse({
        error: errorMessage,
      })

      toast({
        title: "Error",
        description: "Failed to generate diet plan. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTokenExpiration = () => {
    Cookies.remove("access_token", { path: "/" })
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please login again to continue.",
      variant: "destructive",
      duration: 5000,
    })
    router.push("/auth")
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Utensils className="w-3 h-3 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <div className="max-w-4xl">
                <h2 className="text-sm font-bold text-gray-900">Diet Planner</h2>
                <div className="text-xs text-gray-600 leading-relaxed">
                  <p className="transition-all duration-200">
                    {Detailed_description || "Create personalized diet plans with AI assistance"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-3 sm:p-5">
        {/* Personal Information Section */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Personal Information</h3>
              <p className="text-xs text-gray-500">Basic details for personalized nutrition planning</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Age */}
            <div className="space-y-2 scroll-mt-header" data-field="age">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Age
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="16"
                max="80"
                value={String(formData.age || "")}
                onChange={(e) => handleInputChange("age", e.target.value)}
                placeholder="Enter your age"
                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200"
              />
            </div>

            {/* Height */}
            <div className="space-y-2 scroll-mt-header" data-field="height">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Height (cm)
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="140"
                max="220"
                value={String(formData.height || "")}
                onChange={(e) => handleInputChange("height", e.target.value)}
                placeholder="Enter height in cm"
                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200"
              />
            </div>

            {/* Weight */}
            <div className="space-y-2 scroll-mt-header" data-field="weight">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Weight (kg)
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="40"
                max="200"
                value={String(formData.weight || "")}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                placeholder="Enter weight in kg"
                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2 scroll-mt-header" data-field="gender">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Gender
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.gender || "")}
                onValueChange={(value) => handleInputChange("gender", value)}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.gender.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Diet Goal */}
            <div className="space-y-2 scroll-mt-header" data-field="diet_goal">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Diet Goal
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.diet_goal || "")}
                onValueChange={(value) => handleInputChange("diet_goal", value)}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select diet goal" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.diet_goal.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activity Level */}
            <div className="space-y-2 scroll-mt-header" data-field="your_activity_level">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Activity Level
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.your_activity_level || "")}
                onValueChange={(value) => handleInputChange("your_activity_level", value)}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select activity level" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.your_activity_level.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div className="space-y-2 scroll-mt-header" data-field="country">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Building className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Country
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.country || "")}
                onValueChange={(value) => {
                  handleInputChange("country", value)
                  if (value !== "Other") {
                    handleInputChange("custom_country", "")
                  }
                }}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.country.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom Country Input - Show when "Other" is selected */}
              {formData.country === "Other" && (
                <Input
                  type="text"
                  value={String(formData.custom_country || "")}
                  onChange={(e) => handleInputChange("custom_country", e.target.value)}
                  placeholder="Please specify your country"
                  className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200"
                />
              )}
            </div>
          </div>
        </div>

        {/* Meal Planning Section */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Meal Planning</h3>
              <p className="text-xs text-gray-500">Configure your meal schedule and cooking preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Meals Per Day */}
            <div className="space-y-2 scroll-mt-header" data-field="meals_per_day">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Utensils className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Meals Per Day
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.meals_per_day || "")}
                onValueChange={(value) => handleInputChange("meals_per_day", value)}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select meals per day" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.meals_per_day.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option} {Number(option) === 1 ? "Meal" : "Meals"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cooking Time */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Cooking Time (minutes/day)
              </Label>
              <Select
                value={String(formData.available_cooking_time_per_day || "")}
                onValueChange={(value) => handleInputChange("available_cooking_time_per_day", value)}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select cooking time" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.available_cooking_time_per_day.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option} Minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Program Duration */}
            <div className="space-y-2 scroll-mt-header" data-field="total_weeks">
              <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Program Duration (weeks)
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.total_weeks || "")}
                onValueChange={(value) => handleInputChange("total_weeks", value)}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select program duration" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.total_weeks.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option} {Number(option) === 1 ? "Week" : "Weeks"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Dietary Preferences Section */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Dietary Preferences</h3>
              <p className="text-xs text-gray-500">
                Select your dietary preferences (multiple allowed) <span className="text-red-500">*</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {STATIC_OPTIONS.dietary_preferences.map((preference) => (
              <div key={preference} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`preference-${preference}`}
                  checked={
                    Array.isArray(formData.dietary_preferences) &&
                    (formData.dietary_preferences as string[]).includes(preference)
                  }
                  onChange={(e) => handleMultiSelectChange("dietary_preferences", preference, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <Label htmlFor={`preference-${preference}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                  {preference.charAt(0).toUpperCase() + preference.slice(1)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Allergies Section */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Allergies & Restrictions</h3>
              <p className="text-xs text-gray-500">Select any food allergies or restrictions (multiple allowed)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {STATIC_OPTIONS.allergies.map((allergy) => (
              <div key={allergy} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`allergy-${allergy}`}
                  checked={Array.isArray(formData.allergies) && (formData.allergies as string[]).includes(allergy)}
                  onChange={(e) => handleMultiSelectChange("allergies", allergy, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <Label htmlFor={`allergy-${allergy}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                  {allergy.charAt(0).toUpperCase() + allergy.slice(1)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Kitchen Equipment Section */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Settings className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Kitchen Equipment</h3>
              <p className="text-xs text-gray-500">Select equipment you have available (multiple allowed)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {STATIC_OPTIONS.kitchen_equipment.map((equipment) => (
              <div key={equipment} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`equipment-${equipment}`}
                  checked={
                    Array.isArray(formData.kitchen_equipment) &&
                    (formData.kitchen_equipment as string[]).includes(equipment)
                  }
                  onChange={(e) => handleMultiSelectChange("kitchen_equipment", equipment, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <Label htmlFor={`equipment-${equipment}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                  {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Health Conditions Section */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Health Conditions</h3>
              <p className="text-xs text-gray-500">Select any relevant health conditions (multiple allowed)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {STATIC_OPTIONS.health_conditions.map((condition) => (
              <div key={condition} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`condition-${condition}`}
                  checked={
                    Array.isArray(formData.health_conditions) &&
                    (formData.health_conditions as string[]).includes(condition)
                  }
                  onChange={(e) => handleMultiSelectChange("health_conditions", condition, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <Label htmlFor={`condition-${condition}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                  {condition.charAt(0).toUpperCase() + condition.slice(1)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Special Instructions Section */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Target className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Special Instructions</h3>
              <p className="text-xs text-gray-500">Any additional dietary requirements or preferences</p>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              value={String(formData.special_instructions || "")}
              onChange={(e) => handleInputChange("special_instructions", e.target.value)}
              placeholder="e.g., I'm a bodybuilder looking to gain lean muscle mass. I train 6 days a week."
              className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 pt-4 border-t-2 border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAll}
            className="w-full sm:w-auto text-gray-600 border-2 border-gray-200 hover:bg-gray-50 bg-transparent px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-200 hover:border-gray-300"
          >
            Clear All Fields
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 sm:h-5 mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Utensils className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Generate Diet Plan
              </>
            )}
          </Button>
        </div>
      </form>
      <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
    </div>
  )
})

DynamicDietForm.displayName = "DynamicDietForm"

export default DynamicDietForm