"use client"

import type React from "react"
import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Settings,
    Shield,
    Loader2,
    User,
    DollarSign,
    Heart,
    Building,
    Users,
    MapPin,
    Navigation,
} from "lucide-react"
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

interface DynamicAgentFormProps {
    agentData: Agent
    onResponse: (response: any) => void
    detailedDescription?: string
}

// Static dropdown options for health insurance fields
const STATIC_OPTIONS = {
    Gender: ["male", "female", "non-binary", "prefer_not_to_say"],
    Country: ["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Other"],
    Income_Level: ["low", "middle", "high", "very_high"],
    Employment_Status: ["employed", "self-employed", "unemployed", "retired", "student"],
    Family_Size: ["1", "2", "3", "4", "5", "6", "7", "8+"],
    Existing_Conditions: [
        "hypertension",
        "diabetes",
        "heart_disease",
        "asthma",
        "arthritis",
        "cancer",
        "mental_health",
        "chronic_pain",
        "kidney_disease",
        "liver_disease",
        "thyroid_disorder",
        "high_cholesterol",
        "obesity",
        "sleep_apnea",
        "none"
    ],
    Preferred_Coverage_Type: ["basic", "standard", "premium", "comprehensive"],
    Coverage_Amount: [
        "100000",
        "250000",
        "500000",
        "750000",
        "1000000",
        "1500000",
        "2000000",
        "unlimited"
    ],
    Budget_Monthly: [
        "0-100",
        "100-200",
        "200-300",
        "300-400",
        "400-500",
        "500-750",
        "750-1000",
        "1000+"
    ],
    Budget_Annual: [
        "0-1200",
        "1200-2400",
        "2400-3600",
        "3600-4800",
        "4800-6000",
        "6000-9000",
        "9000-12000",
        "12000+"
    ],
    Preferred_Deductible: ["low", "medium", "high", "very_high"],
    Preferred_Network_Type: ["HMO", "PPO", "EPO", "POS", "no_preference"],
    Age_Ranges: Array.from({ length: 83 }, (_, i) => (i + 18).toString()), // Ages 18-100
}

const DynamicHealthInsuranceForm = forwardRef(({ agentData, onResponse, detailedDescription }: DynamicAgentFormProps, ref) => {
    const [formData, setFormData] = useState<{
        [key: string]: string | boolean | number | string[] | number[]
    }>({
        age: 30,
        gender: "",
        country: "",
        city: "",
        income_level: "",
        employment_status: "",
        family_size: "1",
        existing_conditions: [] as string[],
        preferred_coverage_type: "",
        coverage_amount: "",
        budget_monthly: "",
        budget_annual: "",
        preferred_deductible: "",
        preferred_network_type: "",
        special_requirements: "",
    })

    const [loading, setLoading] = useState(false)
    const [locationLoading, setLocationLoading] = useState(false)
    const [agent_id, setagent_id] = useState<string>("")
    const [lastApiResponse, setLastApiResponse] = useState<any>(null)
    const { setExecutionData } = useRating()
    const [showContactPopup, setShowContactPopup] = useState(false)
    const { checkCreditsBeforeExecution } = useCreditsCheck()
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)

    // Initialize form data and auto-detect location
    useEffect(() => {
        const initialData: { [key: string]: string | boolean | number | string[] | number[] } = {
            age: 30,
            gender: "",
            country: "",
            city: "",
            income_level: "",
            employment_status: "",
            family_size: "1",
            existing_conditions: [],
            preferred_coverage_type: "",
            coverage_amount: "",
            budget_monthly: "",
            budget_annual: "",
            preferred_deductible: "",
            preferred_network_type: "",
            special_requirements: "",
        }

        setFormData(initialData)

        // Auto-detect location on page load
        detectLocation()
    }, [])

    const router = useRouter()

    // Auto-detect user location
    const detectLocation = async () => {
        setLocationLoading(true)
        try {
            if (!navigator.geolocation) {
                throw new Error("Geolocation is not supported by this browser")
            }

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000, // 5 minutes
                })
            })

            const { latitude, longitude } = position.coords

            // Use reverse geocoding to get city and country
            const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            )

            if (!response.ok) {
                throw new Error("Failed to get location details")
            }

            const locationData = await response.json()
            const city = locationData.city || locationData.locality || locationData.principalSubdivision
            const country = locationData.countryName

            if (city && country) {
                setFormData((prev) => ({
                    ...prev,
                    city: city,
                    country: STATIC_OPTIONS.Country.includes(country) ? country : "Other",
                }))

                toast({
                    title: "Location Detected",
                    description: `Your location has been set to ${city}, ${country}`,
                    duration: 3000,
                })
            } else {
                throw new Error("Could not determine location details")
            }
        } catch (error) {
            console.error("Location detection error:", error)
            toast({
                title: "Location Detection Failed",
                description: "Please enter your location manually",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setLocationLoading(false)
        }
    }

    // Handle form field changes
    const handleInputChange = (variable: string, value: string | boolean | number | string[] | number[]) => {
        setFormData((prev) => ({
            ...prev,
            [variable]: value,
        }))
    }

    // Handle multi-select changes for existing conditions
    const handleMultiSelectChange = (variable: string, value: string, isChecked: boolean) => {
        setFormData((prev) => {
            const currentValues = Array.isArray(prev[variable]) ? (prev[variable] as string[]) : []

            if (value === "none") {
                // If "none" is selected, clear all other conditions
                return {
                    ...prev,
                    [variable]: isChecked ? ["none"] : [],
                }
            }

            if (isChecked) {
                // Remove "none" if any other condition is selected
                const filteredValues = currentValues.filter(item => item !== "none")
                return {
                    ...prev,
                    [variable]: [...filteredValues, value],
                }
            } else {
                return {
                    ...prev,
                    [variable]: currentValues.filter((item) => item !== value),
                }
            }
        })
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

            const newFormData: { [key: string]: string | boolean | number | string[] | number[] } = {}

            // Process each input and set appropriate values
            Object.keys(inputsObject).forEach((key) => {
                const value = inputsObject[key]
                if (typeof value === "boolean") {
                    newFormData[key] = value
                } else if (typeof value === "number") {
                    newFormData[key] = value
                } else if (Array.isArray(value)) {
                    newFormData[key] = value
                } else if (typeof value === "string") {
                    // Handle array strings like "['hypertension', 'diabetes']"
                    if (value.startsWith("[") && value.endsWith("]")) {
                        try {
                            const parsedArray = JSON.parse(value.replace(/'/g, '"'))
                            newFormData[key] = Array.isArray(parsedArray) ? parsedArray : [value]
                        } catch {
                            newFormData[key] = [value]
                        }
                    } else {
                        newFormData[key] = value
                    }
                } else {
                    newFormData[key] = String(value)
                }
            })

            setFormData(newFormData)
        },

        forceUpdate: () => {
            setFormData((prev) => ({ ...prev }))
        },

        clearForm: () => {
            const resetData: { [key: string]: string | boolean | number | string[] | number[] } = {
                age: 30,
                gender: "",
                country: "",
                city: "",
                income_level: "",
                employment_status: "",
                family_size: "1",
                existing_conditions: [],
                preferred_coverage_type: "",
                coverage_amount: "",
                budget_monthly: "",
                budget_annual: "",
                preferred_deductible: "",
                preferred_network_type: "",
                special_requirements: "",
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

        createNew: () => {
            // Reset form data to initial state
            const resetData: { [key: string]: string | boolean | number | string[] | number[] } = {
                age: 30,
                gender: "",
                country: "",
                city: "",
                income_level: "",
                employment_status: "",
                family_size: "1",
                existing_conditions: [],
                preferred_coverage_type: "",
                coverage_amount: "",
                budget_monthly: "",
                budget_annual: "",
                preferred_deductible: "",
                preferred_network_type: "",
                special_requirements: "",
            }
            setFormData(resetData)
            setCurrentThreadId(null)

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
        const resetData: { [key: string]: string | boolean | number | string[] | number[] } = {
            age: 30,
            gender: "",
            country: "",
            city: "",
            income_level: "",
            employment_status: "",
            family_size: "1",
            existing_conditions: [],
            preferred_coverage_type: "",
            coverage_amount: "",
            budget_monthly: "",
            budget_annual: "",
            preferred_deductible: "",
            preferred_network_type: "",
            special_requirements: "",
        }
        setFormData(resetData)
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
            "gender",
            "country",
            "city",
            "income_level",
            "employment_status",
            "family_size",
            "preferred_coverage_type",
        ]

        const missingFields = requiredFields.filter((field) => !formData[field])

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

        // Validate age range
        const age = Number(formData.age)
        if (age < 18 || age > 100) {
            markErrorsAndScroll(["age"]) 
            toast({
                title: "Validation Error",
                description: "Age must be between 18 and 100",
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

            // Format the API parameters
            const apiParams: any = {
                age: Number(formData.age),
                gender: formData.gender,
                country: formData.country,
                city: formData.city,
                income_level: formData.income_level,
                employment_status: formData.employment_status,
                family_size: Number(formData.family_size),
                existing_conditions: Array.isArray(formData.existing_conditions) ? formData.existing_conditions : [],
                preferred_coverage_type: formData.preferred_coverage_type,
                coverage_amount: formData.coverage_amount ? Number(formData.coverage_amount) : null,
                budget_monthly: formData.budget_monthly || null,
                budget_annual: formData.budget_annual || null,
                preferred_deductible: formData.preferred_deductible || null,
                preferred_network_type: formData.preferred_network_type || null,
                special_requirements: formData.special_requirements || "None",
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

                    onResponse({
                        data: data.data,
                        execution_id: data.execution_id,
                        agent_id: agent_id,
                        message: data.message,
                        status: data.status,
                    })

                    toast({
                        title: "Success",
                        description: data.message || "Health insurance recommendations generated successfully!",
                        duration: 3000,
                    })
                } else {
                    throw new Error(data.error || "Failed to generate health insurance recommendations")
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
                description: "Failed to generate health insurance recommendations. Please try again.",
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
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Shield className="w-3 h-3 sm:w-5 sm:h-5 text-indigo-600" />
                        </div>
                        <div>
                            <div className="max-w-4xl">
                                <h2 className="text-sm font-bold text-gray-900">Health Insurance Finder</h2>
                                <div className="text-xs text-gray-600 leading-relaxed">
                                    <p className="transition-all duration-200">
                                        {detailedDescription || "Find the best health insurance plans tailored to your needs and budget"}
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
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <User className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Personal Information</h3>
                            <p className="text-xs text-gray-500">Tell us about yourself to find the best coverage</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Age */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Age
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.age || "")}
                                onValueChange={(value) => handleInputChange("age", Number(value))}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select age" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl max-h-60">
                                    {STATIC_OPTIONS.Age_Ranges.map((age) => (
                                        <SelectItem key={age} value={age} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {age} years old
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Gender */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Gender
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.gender || "")}
                                onValueChange={(value) => handleInputChange("gender", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Gender.map((option) => (
                                        <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Country */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Country
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.country || "")}
                                onValueChange={(value) => handleInputChange("country", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Country.map((country) => (
                                        <SelectItem key={country} value={country} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {country}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* City */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                City
                                <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    value={String(formData.city || "")}
                                    onChange={(e) => handleInputChange("city", e.target.value)}
                                    placeholder="Enter your city"
                                    className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200 pr-12"
                                />
                                <Button
                                    type="button"
                                    onClick={detectLocation}
                                    disabled={locationLoading}
                                    className="absolute right-1 top-1 h-8 w-8 sm:h-10 sm:w-10 p-0 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 border-0"
                                >
                                    {locationLoading ? (
                                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                    ) : (
                                        <Navigation className="h-3 w-3 sm:h-4 sm:w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500">Click the location icon to auto-detect</p>
                        </div>

                        {/* Income Level */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Income Level
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.income_level || "")}
                                onValueChange={(value) => handleInputChange("income_level", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select income level" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Income_Level.map((level) => (
                                        <SelectItem key={level} value={level} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {level.charAt(0).toUpperCase() + level.slice(1)} Income
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Employment Status */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Building className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Employment Status
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.employment_status || "")}
                                onValueChange={(value) => handleInputChange("employment_status", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select employment status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Employment_Status.map((status) => (
                                        <SelectItem key={status} value={status} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Family Size */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Family Size
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.family_size || "")}
                                onValueChange={(value) => handleInputChange("family_size", Number(value.replace("+", "")))}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select family size" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Family_Size.map((size) => (
                                        <SelectItem key={size} value={size} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {size === "1" ? "Just me" : `${size} ${size.includes("+") ? "or more" : ""} people`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Health Information Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Heart className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Health Information</h3>
                            <p className="text-xs text-gray-500">Help us understand your health needs</p>
                        </div>
                    </div>

                    {/* Existing Conditions */}
                    <div className="space-y-3">
                        <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                            <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                            Existing Health Conditions
                        </Label>
                        <p className="text-xs text-gray-500">Select all that apply (or select "None" if no conditions)</p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {STATIC_OPTIONS.Existing_Conditions.map((condition) => (
                                <div key={condition} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`condition-${condition}`}
                                        checked={Array.isArray(formData.existing_conditions) && (formData.existing_conditions as string[]).includes(condition)}
                                        onChange={(e) => handleMultiSelectChange("existing_conditions", condition, e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <Label htmlFor={`condition-${condition}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                                        {condition.replace(/_/g, " ").split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Coverage Preferences Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Coverage Preferences</h3>
                            <p className="text-xs text-gray-500">Define your ideal insurance coverage</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Preferred Coverage Type */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Coverage Type
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.preferred_coverage_type || "")}
                                onValueChange={(value) => handleInputChange("preferred_coverage_type", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select coverage type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Preferred_Coverage_Type.map((type) => (
                                        <SelectItem key={type} value={type} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {type.charAt(0).toUpperCase() + type.slice(1)} Coverage
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Coverage Amount */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Coverage Amount
                            </Label>
                            <Select
                                value={String(formData.coverage_amount || "")}
                                onValueChange={(value) => handleInputChange("coverage_amount", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select coverage amount" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Coverage_Amount.map((amount) => (
                                        <SelectItem key={amount} value={amount} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {amount === "unlimited" ? "Unlimited" : `${Number(amount).toLocaleString()}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preferred Deductible */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Preferred Deductible
                            </Label>
                            <Select
                                value={String(formData.preferred_deductible || "")}
                                onValueChange={(value) => handleInputChange("preferred_deductible", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select deductible preference" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Preferred_Deductible.map((deductible) => (
                                        <SelectItem key={deductible} value={deductible} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {deductible.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Deductible
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preferred Network Type */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Building className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Network Type
                            </Label>
                            <Select
                                value={String(formData.preferred_network_type || "")}
                                onValueChange={(value) => handleInputChange("preferred_network_type", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select network type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Preferred_Network_Type.map((network) => (
                                        <SelectItem key={network} value={network} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {network === "no_preference" ? "No Preference" : network.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Budget Information Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Budget Information</h3>
                            <p className="text-xs text-gray-500">Help us find plans within your budget</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {/* Monthly Budget */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Monthly Budget Range
                            </Label>
                            <Select
                                value={String(formData.budget_monthly || "")}
                                onValueChange={(value) => handleInputChange("budget_monthly", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select monthly budget" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Budget_Monthly.map((budget) => (
                                        <SelectItem key={budget} value={budget} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            ${budget}/month
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Annual Budget */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Annual Budget Range
                            </Label>
                            <Select
                                value={String(formData.budget_annual || "")}
                                onValueChange={(value) => handleInputChange("budget_annual", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select annual budget" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Budget_Annual.map((budget) => (
                                        <SelectItem key={budget} value={budget} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            ${budget}/year
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Special Requirements Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Settings className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Special Requirements</h3>
                            <p className="text-xs text-gray-500">Any specific needs or preferences</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                            <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                            Special Requirements or Notes
                        </Label>
                        <Input
                            value={String(formData.special_requirements || "")}
                            onChange={(e) => handleInputChange("special_requirements", e.target.value)}
                            placeholder="e.g., Need coverage for prescription drugs, mental health services, maternity care..."
                            className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
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
                        className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                Finding Plans...
                            </>
                        ) : (
                            <>
                                <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Find Health Insurance Plans
                            </>
                        )}
                    </Button>
                </div>
            </form>
            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
        </div>
    )
})

DynamicHealthInsuranceForm.displayName = "DynamicHealthInsuranceForm"

export default DynamicHealthInsuranceForm

