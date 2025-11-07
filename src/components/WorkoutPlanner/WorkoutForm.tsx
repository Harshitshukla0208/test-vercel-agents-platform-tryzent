"use client"

import React from "react"
import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NotebookPen, Settings, Dumbbell, Loader2, Calendar, Users, Target, Clock, Building, Heart, Activity, ChevronDown, ChevronUp, User } from "lucide-react"
import axios from "axios"
import { toast } from "@/hooks/use-toast"
import { useRating } from "@/components/Content/RatingContext"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import ContactPopup from "@/components/ContactPopup"
import { useCreditsCheck } from "@/hooks/use-credits-checks"
import { markErrorsAndScroll, clearFieldError } from "@/utils/validationUX"

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

interface DynamicWorkoutFormProps {
    agentData: Agent
    onResponse: (response: any) => void
    Detailed_description?: string
}

// Static dropdown options for workout fields
const STATIC_OPTIONS = {
    user_type: ["individual", "group"],
    fitness_level: ["beginner", "intermediate", "advanced"],
    fitness_goals: [
        "weight loss",
        "muscle gain",
        "endurance",
        "strength",
        "flexibility",
        "general fitness",
        "team building",
        "rehabilitation",
    ],
    available_days_per_week: ["1", "2", "3", "4", "5", "6", "7"],
    available_time_per_day: ["15", "30", "45", "60", "75", "90", "120"],
    home_equipment: [
        "bodyweight",
        "dumbbells",
        "resistance bands",
        "yoga mat",
        "kettlebells",
        "pull-up bar",
        "exercise ball",
        "foam roller",
    ],
    gym_equipment: [
        "barbell",
        "cable machine",
        "treadmill",
        "elliptical",
        "rowing machine",
        "leg press",
        "smith machine",
        "free weights",
    ],
    health_conditions: [
        "none",
        "asthma",
        "diabetes",
        "high blood pressure",
        "heart condition",
        "arthritis",
        "back problems",
        "knee problems",
    ],
    total_weeks: ["2", "4", "6", "8", "12"],
    gender: ["male", "female", "other"],
    group_size: ["2", "3", "4", "5", "6", "7", "8", "9", "10"],
}

// Move PersonDetails component outside to prevent recreation on every render
const PersonDetails = React.memo(({
    personIndex,
    ages,
    heights,
    weights,
    genders,
    isOpen,
    onToggle,
    onInputChange,
    userType
}: {
    personIndex: number
    ages: any[]
    heights: any[]
    weights: any[]
    genders: string[]
    isOpen: boolean
    onToggle: () => void
    onInputChange: (variable: string, index: number, value: string | number) => void
    userType: string
}) => {
    return (
        <div className="mb-4 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200">
            {/* Person Header - Clickable */}
            <div
                onClick={onToggle}
                className="flex items-center justify-between p-4 bg-white hover:from-indigo-100 hover:to-indigo-150 cursor-pointer transition-all duration-200"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                            {userType === "group" ? `Person ${personIndex + 1}` : "Personal Details"}
                        </h4>
                        <p className="text-xs text-gray-600">
                            {ages[personIndex] && genders[personIndex]
                                ? `${ages[personIndex]} years, ${genders[personIndex]}`
                                : "Click to add details"
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${ages[personIndex] && heights[personIndex] && weights[personIndex] && genders[personIndex]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {ages[personIndex] && heights[personIndex] && weights[personIndex] && genders[personIndex]
                            ? 'Complete'
                            : 'Incomplete'
                        }
                    </span>
                    {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Person Details Content - Collapsible */}
            {isOpen && (
                <div className="p-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Age */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-indigo-600" />
                                Age
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                value={ages[personIndex] || ""}
                                onChange={(e) => onInputChange("age", personIndex, e.target.value)}
                                placeholder="Enter age"
                                className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>

                        {/* Height */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Activity className="w-3 h-3 text-indigo-600" />
                                Height (cm)
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                value={heights[personIndex] || ""}
                                onChange={(e) => onInputChange("height", personIndex, e.target.value)}
                                placeholder="Enter height in cm"
                                className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>

                        {/* Weight */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Activity className="w-3 h-3 text-indigo-600" />
                                Weight (kg)
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                value={weights[personIndex] || ""}
                                onChange={(e) => onInputChange("weight", personIndex, e.target.value)}
                                placeholder="Enter weight in kg"
                                className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>

                        {/* Gender */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Users className="w-3 h-3 text-indigo-600" />
                                Gender
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={genders[personIndex] || ""}
                                onValueChange={(value) => onInputChange("gender", personIndex, value)}
                            >
                                <SelectTrigger className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.gender.map((option) => (
                                        <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
})

PersonDetails.displayName = "PersonDetails"

const DynamicWorkoutForm = forwardRef(
    ({ agentData, onResponse, Detailed_description }: DynamicWorkoutFormProps, ref) => {
        const [formData, setFormData] = useState<{
            [key: string]: string | boolean | number | string[] | number[] | null | object
        }>({
            user_type: "",
            group_size: null,
            age: [],
            height: [],
            weight: [],
            gender: [],
            fitness_level: "",
            fitness_goals: [],
            available_days_per_week: "",
            available_time_per_day: "",
            gym_access: false,
            home_equipment: [],
            gym_equipment: [],
            outdoor_preference: false,
            health_conditions: [],
            special_instructions: "",
            total_weeks: "",
            injury_history: {},
        })

        const [loading, setLoading] = useState(false)
        const [agent_id, setagent_id] = useState<string>("")
        const [lastApiResponse, setLastApiResponse] = useState<any>(null)
        const { setExecutionData } = useRating()
        const [showContactPopup, setShowContactPopup] = useState(false)
        const { checkCreditsBeforeExecution } = useCreditsCheck()
        const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)

        // State for managing which person dropdowns are open - default to open
        const [openPersonDropdowns, setOpenPersonDropdowns] = useState<{ [key: number]: boolean }>({})

        // Initialize form data with empty values
        useEffect(() => {
            const initialData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {
                user_type: "",
                group_size: null,
                age: [],
                height: [],
                weight: [],
                gender: [],
                fitness_level: "",
                fitness_goals: [],
                available_days_per_week: "",
                available_time_per_day: "",
                gym_access: false,
                home_equipment: [],
                gym_equipment: [],
                outdoor_preference: false,
                health_conditions: [],
                special_instructions: "",
                total_weeks: "",
                injury_history: {},
            }

            setFormData(initialData)
        }, [])

        const router = useRouter()

        // Optimize toggle person dropdown with useCallback
        const togglePersonDropdown = useCallback((personIndex: number) => {
            setOpenPersonDropdowns(prev => ({
                ...prev,
                [personIndex]: !prev[personIndex]
            }))
        }, [])

        // Handle form field changes
        const handleInputChange = (variable: string, value: string | boolean | number | string[] | number[] | null) => {
            setFormData((prev) => {
                const newData = {
                    ...prev,
                    [variable]: value,
                }

                // Handle user type changes
                if (variable === "user_type") {
                    if (value === "individual") {
                        newData.group_size = null
                        newData.age = [""]
                        newData.height = [""]
                        newData.weight = [""]
                        newData.gender = [""]
                        // Open the single person dropdown by default
                        setOpenPersonDropdowns({ 0: true })
                    } else if (value === "group") {
                        newData.group_size = ""
                        newData.age = []
                        newData.height = []
                        newData.weight = []
                        newData.gender = []
                        // Close all person dropdowns
                        setOpenPersonDropdowns({})
                    }
                }

                // Handle group size changes
                if (variable === "group_size" && typeof value === "string" && value !== "") {
                    const size = parseInt(value)
                    if (!isNaN(size)) {
                        newData.age = Array(size).fill("")
                        newData.height = Array(size).fill("")
                        newData.weight = Array(size).fill("")
                        newData.gender = Array(size).fill("")

                        // Initialize dropdowns state - open all by default
                        const dropdownState: { [key: number]: boolean } = {}
                        for (let i = 0; i < size; i++) {
                            dropdownState[i] = true // Open all person dropdowns by default
                        }
                        setOpenPersonDropdowns(dropdownState)
                    }
                }

                // Handle gym access changes
                if (variable === "gym_access") {
                    if (value === true) {
                        newData.gym_equipment = []
                        newData.home_equipment = []
                    } else {
                        newData.home_equipment = []
                        newData.gym_equipment = []
                    }
                }

                return newData
            })
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

        // Optimize array input changes with useCallback to prevent unnecessary re-renders
        const handleArrayInputChange = useCallback((variable: string, index: number, value: string | number) => {
            setFormData((prev) => {
                const currentArray = Array.isArray(prev[variable]) ? [...(prev[variable] as any[])] : []

                // Ensure the array is large enough
                while (currentArray.length <= index) {
                    currentArray.push("")
                }

                // Convert to appropriate type
                if (variable === "age" || variable === "height" || variable === "weight") {
                    currentArray[index] = value === "" ? "" : Number(value)
                } else {
                    currentArray[index] = value
                }

                return {
                    ...prev,
                    [variable]: currentArray,
                }
            })
        }, [])

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
                        newFormData[key] =
                            key === "group_size" ? null : key === "injury_history" ? {} : Array.isArray(formData[key]) ? [] : ""
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
                        // Handle boolean strings
                        if (key === "gym_access" || key === "outdoor_preference") {
                            newFormData[key] = parseBooleanString(value)
                        }
                        // Special handling for equipment arrays and other array fields
                        else if (
                            key === "home_equipment" ||
                            key === "gym_equipment" ||
                            key === "fitness_goals" ||
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
                        } else if (key === "age" || key === "height" || key === "weight" || key === "gender") {
                            // Handle array fields for group data
                            if (value.startsWith("[") && value.endsWith("]")) {
                                try {
                                    const parsed = JSON.parse(value.replace(/'/g, '"'))
                                    newFormData[key] = Array.isArray(parsed) ? parsed : [value]
                                } catch {
                                    newFormData[key] = [value]
                                }
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

                console.log("Loading history data:", newFormData)
                setFormData(newFormData)

                // Set up dropdowns based on loaded data
                if (newFormData.user_type === "individual") {
                    setOpenPersonDropdowns({ 0: true })
                } else if (newFormData.user_type === "group" && newFormData.group_size) {
                    const size = typeof newFormData.group_size === "string" ? parseInt(newFormData.group_size) : newFormData.group_size as number
                    if (!isNaN(size)) {
                        const dropdownState: { [key: number]: boolean } = {}
                        for (let i = 0; i < size; i++) {
                            dropdownState[i] = true
                        }
                        setOpenPersonDropdowns(dropdownState)
                    }
                }

                // Handle file data if provided
                if (fileData) {
                    // This part of the logic needs to be adapted to handle fileData and s3FileUrls/filePreviewUrls
                    // For now, we'll just set the state variables directly if fileData is provided
                }
            },

            forceUpdate: () => {
                setFormData((prev) => ({ ...prev }))
            },

            clearForm: () => {
                const resetData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {
                    user_type: "",
                    group_size: null,
                    age: [],
                    height: [],
                    weight: [],
                    gender: [],
                    fitness_level: "",
                    fitness_goals: [],
                    available_days_per_week: "",
                    available_time_per_day: "",
                    gym_access: false,
                    home_equipment: [],
                    gym_equipment: [],
                    outdoor_preference: false,
                    health_conditions: [],
                    special_instructions: "",
                    total_weeks: "",
                    injury_history: {},
                }
                setFormData(resetData)
                setCurrentThreadId(null)
                setOpenPersonDropdowns({})
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
                    user_type: formData.user_type,
                    group_size: formData.user_type === "group" ? (typeof formData.group_size === "string" ? parseInt(formData.group_size) : formData.group_size) : null,
                    age: Array.isArray(formData.age) ? (formData.age as any[]).map(val => val === "" ? null : (typeof val === "string" ? parseInt(val) : val)).filter(val => val !== null) : [],
                    height: Array.isArray(formData.height) ? (formData.height as any[]).map(val => val === "" ? null : (typeof val === "string" ? parseInt(val) : val)).filter(val => val !== null) : [],
                    weight: Array.isArray(formData.weight) ? (formData.weight as any[]).map(val => val === "" ? null : (typeof val === "string" ? parseInt(val) : val)).filter(val => val !== null) : [],
                    gender: Array.isArray(formData.gender) ? (formData.gender as string[]).filter(val => val !== "") : [],
                    fitness_level: formData.fitness_level,
                    fitness_goals: Array.isArray(formData.fitness_goals) ? formData.fitness_goals : [],
                    available_days_per_week: formData.available_days_per_week ? Number(formData.available_days_per_week) : null,
                    available_time_per_day: formData.available_time_per_day ? Number(formData.available_time_per_day) : null,
                    gym_access: Boolean(formData.gym_access),
                    home_equipment: formData.gym_access ? null : (Array.isArray(formData.home_equipment) ? formData.home_equipment : []),
                    gym_equipment: formData.gym_access ? (Array.isArray(formData.gym_equipment) ? formData.gym_equipment : []) : null,
                    outdoor_preference: Boolean(formData.outdoor_preference),
                    health_conditions: Array.isArray(formData.health_conditions) ? formData.health_conditions : [],
                    special_instructions: formData.special_instructions || "",
                    total_weeks: formData.total_weeks ? Number(formData.total_weeks) : null,
                    injury_history: formData.injury_history || {},
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

            getWorkoutType: () => {
                return formData.user_type ? String(formData.user_type) : null
            },
            getFormData: () => {
                return formData
            },

            createNew: () => {
                // Reset form data to initial state
                const resetData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {
                    user_type: "",
                    group_size: null,
                    age: [],
                    height: [],
                    weight: [],
                    gender: [],
                    fitness_level: "",
                    fitness_goals: [],
                    available_days_per_week: "",
                    available_time_per_day: "",
                    gym_access: false,
                    home_equipment: [],
                    gym_equipment: [],
                    outdoor_preference: false,
                    health_conditions: [],
                    special_instructions: "",
                    total_weeks: "",
                    injury_history: {},
                }
                setFormData(resetData)
                setCurrentThreadId(null)
                setOpenPersonDropdowns({})

                // Reset the parent component's response state
                onResponse(null)
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
                user_type: "",
                group_size: null,
                age: [],
                height: [],
                weight: [],
                gender: [],
                fitness_level: "",
                fitness_goals: [],
                available_days_per_week: "",
                available_time_per_day: "",
                gym_access: false,
                home_equipment: [],
                gym_equipment: [],
                outdoor_preference: false,
                health_conditions: [],
                special_instructions: "",
                total_weeks: "",
                injury_history: {},
            }
            setFormData(resetData)
            setCurrentThreadId(null)
            setOpenPersonDropdowns({})
        }

        const handleCreateNew = () => {
            // Reset form data to initial state
            const resetData: { [key: string]: string | boolean | number | string[] | number[] | null | object } = {
                user_type: "",
                group_size: null,
                age: [],
                height: [],
                weight: [],
                gender: [],
                fitness_level: "",
                fitness_goals: [],
                available_days_per_week: "",
                available_time_per_day: "",
                gym_access: false,
                home_equipment: [],
                gym_equipment: [],
                outdoor_preference: false,
                health_conditions: [],
                special_instructions: "",
                total_weeks: "",
                injury_history: {},
            }
            setFormData(resetData)
            setCurrentThreadId(null)
            setOpenPersonDropdowns({})

            // Reset the parent component's response state
            onResponse(null)
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
                "user_type",
                "fitness_level",
                "fitness_goals",
                "available_days_per_week",
                "available_time_per_day",
                "total_weeks",
            ]

            const missingFields = requiredFields.filter((field) => {
                if (field === "fitness_goals") {
                    return !Array.isArray(formData[field]) || (formData[field] as string[]).length === 0
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
                    user_type: formData.user_type,
                    group_size: formData.user_type === "group" ? (typeof formData.group_size === "string" ? parseInt(formData.group_size) : formData.group_size) : null,
                    age: Array.isArray(formData.age) ? (formData.age as any[]).map(val => val === "" ? null : (typeof val === "string" ? parseInt(val) : val)).filter(val => val !== null) : [],
                    height: Array.isArray(formData.height) ? (formData.height as any[]).map(val => val === "" ? null : (typeof val === "string" ? parseInt(val) : val)).filter(val => val !== null) : [],
                    weight: Array.isArray(formData.weight) ? (formData.weight as any[]).map(val => val === "" ? null : (typeof val === "string" ? parseInt(val) : val)).filter(val => val !== null) : [],
                    gender: Array.isArray(formData.gender) ? (formData.gender as string[]).filter(val => val !== "") : [],
                    fitness_level: formData.fitness_level,
                    fitness_goals: Array.isArray(formData.fitness_goals) ? formData.fitness_goals : [],
                    available_days_per_week: Number(formData.available_days_per_week),
                    available_time_per_day: Number(formData.available_time_per_day),
                    gym_access: Boolean(formData.gym_access),
                    home_equipment: formData.gym_access
                        ? null
                        : Array.isArray(formData.home_equipment)
                            ? formData.home_equipment
                            : [],
                    gym_equipment: formData.gym_access
                        ? Array.isArray(formData.gym_equipment)
                            ? formData.gym_equipment
                            : []
                        : null,
                    outdoor_preference: Boolean(formData.outdoor_preference),
                    health_conditions: Array.isArray(formData.health_conditions) ? formData.health_conditions : [],
                    special_instructions: formData.special_instructions || "",
                    total_weeks: Number(formData.total_weeks),
                    injury_history: formData.injury_history || {},
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

                        // Get workout type for response
                        const workoutType = String(formData.user_type)

                        onResponse({
                            data: data.data,
                            execution_id: data.execution_id,
                            agent_id: agent_id,
                            message: data.message,
                            status: data.status,
                            workoutType: workoutType,
                        })

                        toast({
                            title: "Success",
                            description: data.message || "Workout plan generated successfully!",
                            duration: 3000,
                        })
                    } else {
                        throw new Error(data.error || "Failed to generate workout plan")
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
                    description: "Failed to generate workout plan. Please try again.",
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

        // Get group size for rendering individual inputs
        const groupSize = formData.user_type === "group" ? (typeof formData.group_size === "string" ? parseInt(formData.group_size) : (formData.group_size as number)) || 0 : (formData.user_type === "individual" ? 1 : 0)
        const ages = Array.isArray(formData.age) ? (formData.age as any[]) : []
        const heights = Array.isArray(formData.height) ? (formData.height as any[]) : []
        const weights = Array.isArray(formData.weight) ? (formData.weight as any[]) : []
        const genders = Array.isArray(formData.gender) ? (formData.gender as string[]) : []

        return (
            <div className="bg-white">
                {/* Header */}
                <div className="p-3 sm:p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2 sm:gap-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Dumbbell className="w-3 h-3 sm:w-5 sm:h-5 text-indigo-600" />
                            </div>
                            <div>
                                <div className="max-w-4xl">
                                    <h2 className="text-sm font-bold text-gray-900">Workout Planner</h2>
                                    <div className="text-xs text-gray-600 leading-relaxed">
                                        <p className="transition-all duration-200">
                                            {Detailed_description || "Create personalized workout plans with AI assistance"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-3 sm:p-5">
                    {/* Workout Configuration Section */}
                    <div className="mb-4 sm:mb-5">
                        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Settings className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Workout Configuration</h3>
                                <p className="text-xs text-gray-500">Configure the parameters for your workout plan</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {/* User Type */}
                            <div className="space-y-2 scroll-mt-header" data-field="user_type">
                                <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                    <Users className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                    User Type
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={String(formData.user_type || "")}
                                    onValueChange={(value) => handleInputChange("user_type", value)}
                                >
                                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                        <SelectValue placeholder="Select user type" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                        {STATIC_OPTIONS.user_type.map((option) => (
                                            <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                                {option.charAt(0).toUpperCase() + option.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Group Size - Only show when user_type is group */}
                            {formData.user_type === "group" && (
                                <div className="space-y-2 scroll-mt-header" data-field="group_size">
                                    <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                        Group Size
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={String(formData.group_size || "")}
                                        onValueChange={(value) => handleInputChange("group_size", value)}
                                    >
                                        <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                            <SelectValue placeholder="Select group size" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                            {STATIC_OPTIONS.group_size.map((option) => (
                                                <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                                    {option} People
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Fitness Level */}
                            <div className="space-y-2 scroll-mt-header" data-field="fitness_level">
                                <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                    <Target className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                    Fitness Level
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={String(formData.fitness_level || "")}
                                    onValueChange={(value) => handleInputChange("fitness_level", value)}
                                >
                                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                        <SelectValue placeholder="Select fitness level" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                        {STATIC_OPTIONS.fitness_level.map((option) => (
                                            <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                                {option.charAt(0).toUpperCase() + option.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Available Days Per Week */}
                            <div className="space-y-2 scroll-mt-header" data-field="available_days_per_week">
                                <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                    Days Per Week
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={String(formData.available_days_per_week || "")}
                                    onValueChange={(value) => handleInputChange("available_days_per_week", value)}
                                >
                                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                        <SelectValue placeholder="Select days per week" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                        {STATIC_OPTIONS.available_days_per_week.map((option) => (
                                            <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                                {option} {Number(option) === 1 ? "Day" : "Days"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Available Time Per Day */}
                            <div className="space-y-2 scroll-mt-header" data-field="available_time_per_day">
                                <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                    Time Per Day (minutes)
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={String(formData.available_time_per_day || "")}
                                    onValueChange={(value) => handleInputChange("available_time_per_day", value)}
                                >
                                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                        <SelectValue placeholder="Select time per day" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                        {STATIC_OPTIONS.available_time_per_day.map((option) => (
                                            <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                                {option} Minutes
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Gym Access */}
                            <div className="space-y-2 scroll-mt-header" data-field="total_weeks">
                                <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                    <Building className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                    Gym Access
                                </Label>
                                <Select
                                    value={String(formData.gym_access)}
                                    onValueChange={(value) => handleInputChange("gym_access", value === "true")}
                                >
                                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                        <SelectValue placeholder="Do you have gym access?" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                        <SelectItem value="true" className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            Yes, I have gym access
                                        </SelectItem>
                                        <SelectItem value="false" className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            No, home workouts only
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Outdoor Preference */}
                            <div className="space-y-2">
                                <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                    Outdoor Preference
                                </Label>
                                <Select
                                    value={String(formData.outdoor_preference)}
                                    onValueChange={(value) => handleInputChange("outdoor_preference", value === "true")}
                                >
                                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                        <SelectValue placeholder="Do you prefer outdoor activities?" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                        <SelectItem value="true" className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            Yes, I prefer outdoor activities
                                        </SelectItem>
                                        <SelectItem value="false" className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            No, indoor activities are fine
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Total Weeks */}
                            <div className="space-y-2">
                                <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                    Program Duration (weeks)
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={String(formData.total_weeks || "")}
                                    onValueChange={(value) => handleInputChange("total_weeks", value)}
                                >
                                    <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                        <SelectValue placeholder="Select program duration" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                        {STATIC_OPTIONS.total_weeks.map((option) => (
                                            <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                                {option} {Number(option) === 1 ? "Week" : "Weeks"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Personal Details Section - Show for individual or group */}
                    {formData.user_type && groupSize > 0 && (
                        <div className="mb-4 sm:mb-5">
                            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                                    <User className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        {formData.user_type === "group" ? "Group Members Details" : "Personal Details"}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {formData.user_type === "group"
                                            ? "Add details for each group member"
                                            : "Add your personal information"
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Render Person Details */}
                            <div className="space-y-4">
                                {Array.from({ length: groupSize }, (_, index) => (
                                    <PersonDetails
                                        key={index}
                                        personIndex={index}
                                        ages={ages}
                                        heights={heights}
                                        weights={weights}
                                        genders={genders}
                                        isOpen={openPersonDropdowns[index] !== false}
                                        onToggle={() => togglePersonDropdown(index)}
                                        onInputChange={handleArrayInputChange}
                                        userType={formData.user_type as string}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fitness Goals Section */}
                    <div className="mb-4 sm:mb-5">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Target className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Fitness Goals</h3>
                                <p className="text-xs text-gray-500">
                                    Select your fitness goals (multiple allowed) <span className="text-red-500">*</span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 scroll-mt-header" data-field="fitness_goals">
                            {STATIC_OPTIONS.fitness_goals.map((goal) => (
                                <div key={goal} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`goal-${goal}`}
                                        checked={
                                            Array.isArray(formData.fitness_goals) && (formData.fitness_goals as string[]).includes(goal)
                                        }
                                        onChange={(e) => handleMultiSelectChange("fitness_goals", goal, e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <Label htmlFor={`goal-${goal}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                                        {goal.charAt(0).toUpperCase() + goal.slice(1)}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Equipment Section */}
                    <div className="mb-4 sm:mb-5">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Dumbbell className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Available Equipment</h3>
                                <p className="text-xs text-gray-500">Select equipment you have access to (multiple allowed)</p>
                            </div>
                        </div>

                        {formData.gym_access ? (
                            <div>
                                <h4 className="text-xs font-medium text-gray-900 mb-2">Gym Equipment</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                    {STATIC_OPTIONS.gym_equipment.map((equipment) => (
                                        <div key={equipment} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`gym-${equipment}`}
                                                checked={
                                                    Array.isArray(formData.gym_equipment) &&
                                                    (formData.gym_equipment as string[]).includes(equipment)
                                                }
                                                onChange={(e) => handleMultiSelectChange("gym_equipment", equipment, e.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                            />
                                            <Label htmlFor={`gym-${equipment}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                                                {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h4 className="text-xs font-medium text-gray-900 mb-2">Home Equipment</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                    {STATIC_OPTIONS.home_equipment.map((equipment) => (
                                        <div key={equipment} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`home-${equipment}`}
                                                checked={
                                                    Array.isArray(formData.home_equipment) &&
                                                    (formData.home_equipment as string[]).includes(equipment)
                                                }
                                                onChange={(e) => handleMultiSelectChange("home_equipment", equipment, e.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                            />
                                            <Label htmlFor={`home-${equipment}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                                                {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Health Conditions Section */}
                    <div className="mb-4 sm:mb-5">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Heart className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Health Conditions</h3>
                                <p className="text-xs text-gray-500">Select any health conditions (multiple allowed)</p>
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
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <Label htmlFor={`condition-${condition}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                                        {condition.charAt(0).toUpperCase() + condition.slice(1)}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Special Instructions */}
                    <div className="space-y-2 sm:col-span-2 mb-2 sm:mb-5 mt-1 sm:mt-2">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                                <NotebookPen className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Special Instructions</h3>
                                <p className="text-xs text-gray-500">Any additional instructions or preferences</p>
                            </div>
                        </div>
                        <Input
                            value={String(formData.special_instructions || "")}
                            onChange={(e) => handleInputChange("special_instructions", e.target.value)}
                            placeholder="Any special instructions, preferences, or requirements"
                            className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                        />
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
                            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin h-4 w-4 sm:h-5 mr-2" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                    Generate Workout Plan
                                </>
                            )}
                        </Button>
                    </div>
                </form>
                <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
            </div>
        )
    },
)

DynamicWorkoutForm.displayName = "DynamicWorkoutForm"

export default DynamicWorkoutForm