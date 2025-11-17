"use client"

import type React from "react"
import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Settings,
    MapPin,
    Loader2,
    Calendar,
    Users,
    DollarSign,
    Plane,
    Car,
    Hotel,
    Utensils,
    Star,
    Navigation,
} from "lucide-react"
import axios from "axios"
import { toast } from "@/hooks/use-toast"
import { useRating } from "@/components/Content/RatingContext"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import ContactPopup from "@/components/ContactPopup"
import { useCreditsCheck } from "@/hooks/use-credits-checks"
import { clearFieldError, markErrorsAndScroll } from "@/utils/validationUX"

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

// Static dropdown options for travel fields
const STATIC_OPTIONS = {
    Budget: ["budget", "mid-range", "luxury", "ultra luxury"],
    Preferred_Transportation: ["airplane", "train", "bus", "car", "ship"],
    Preferred_Local_Transportation: ["cab", "public_transport", "rental_car", "walking", "bicycle"],
    Preferred_Accommodation: ["hotel", "resort", "hostel", "apartment", "guesthouse", "camping"],
    Traveling_Style: ["adventurous", "relaxed", "cultural", "luxury", "budget", "family", "romantic", "business", "pilgrimage", "spiritual"],
    Interests: [
        "sightseeing",
        "food",
        "adventure",
        "culture",
        "shopping",
        "nightlife",
        "nature",
        "history",
        "art",
        "sports",
    ],
    Number_of_Adults: ["1", "2", "3", "4", "5", "6", "7", "8"],
    Number_of_Children: ["0", "1", "2", "3", "4", "5"],
    Children_Ages: Array.from({ length: 18 }, (_, i) => (i + 1).toString()), // Ages 1-18
}

const DynamicTravelForm = forwardRef(({ agentData, onResponse, detailedDescription }: DynamicAgentFormProps, ref) => {
    const [formData, setFormData] = useState<{
        [key: string]: string | boolean | number | string[] | number[]
    }>({
        Travelling_From: "",
        Destination: "",
        Start_Date: "",
        End_Date: "",
        Number_of_Adults: "2",
        Number_of_Children: "0",
        Children_Ages: [] as number[],
        Budget: "",
        Preferred_Transportation: "",
        Preferred_Local_Transportation: "",
        Preferred_Accommodation: "",
        Dietary_Restrictions: "",
        Special_Requests: "",
        Traveling_Style: [] as string[],
        Interests: [] as string[],
    })

    const [loading, setLoading] = useState(false)
    const [locationLoading, setLocationLoading] = useState(false)
    const [agent_id, setagent_id] = useState<string>("")
    const [lastApiResponse, setLastApiResponse] = useState<any>(null)
    const { setExecutionData } = useRating()
    const [showContactPopup, setShowContactPopup] = useState(false)
    const { checkCreditsBeforeExecution } = useCreditsCheck()
    const [today, setToday] = useState<string>("");
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

    useEffect(() => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        setToday(`${yyyy}-${mm}-${dd}`);
    }, []);

    // Initialize form data with empty values and auto-detect location
    useEffect(() => {
        const initialData: { [key: string]: string | boolean | number | string[] | number[] } = {
            Travelling_From: "",
            Destination: "",
            Start_Date: "",
            End_Date: "",
            Number_of_Adults: "2",
            Number_of_Children: "0",
            Children_Ages: [],
            Budget: "",
            Preferred_Transportation: "",
            Preferred_Local_Transportation: "",
            Preferred_Accommodation: "",
            Dietary_Restrictions: "",
            Special_Requests: "",
            Traveling_Style: [],
            Interests: [],
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

            // Use reverse geocoding to get city name
            const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            )

            if (!response.ok) {
                throw new Error("Failed to get location details")
            }

            const locationData = await response.json()
            const city = locationData.city || locationData.locality || locationData.principalSubdivision

            if (city) {
                setFormData((prev) => ({
                    ...prev,
                    Travelling_From: city,
                }))

                toast({
                    title: "Location Detected",
                    description: `Your location has been set to ${city}`,
                    duration: 3000,
                })
            } else {
                throw new Error("Could not determine city name")
            }
        } catch (error) {
            console.error("Location detection error:", error)
            toast({
                title: "Location Detection Failed",
                description: "Please enter your departure city manually",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setLocationLoading(false)
        }
    }

    // Handle form field changes
    const handleInputChange = (variable: string, value: string | boolean | number | string[] | number[]) => {
        setFormData((prev) => {
            const newData = {
                ...prev,
                [variable]: value,
            }

            // Handle children ages when number of children changes
            if (variable === "Number_of_Children") {
                const numChildren = Number(value)
                if (numChildren === 0) {
                    newData.Children_Ages = []
                } else {
                    // Initialize children ages array with empty values
                    const currentAges = Array.isArray(prev.Children_Ages) ? (prev.Children_Ages as number[]) : []
                    const newAges = Array(numChildren)
                        .fill(0)
                        .map((_, index) => currentAges[index] || 0)
                    newData.Children_Ages = newAges
                }
            }

            return newData
        })
        clearFieldError(variable)
    }

    // Handle children age changes
    const handleChildAgeChange = (childIndex: number, age: number) => {
        setFormData((prev) => {
            const currentAges = Array.isArray(prev.Children_Ages) ? [...(prev.Children_Ages as number[])] : []
            currentAges[childIndex] = age
            return {
                ...prev,
                Children_Ages: currentAges,
            }
        })
        clearFieldError('Children_Ages')
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
                setCurrentThreadId(inputsObject.thread_id);
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
                    // Handle array strings like "['adventurous']"
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

            // Handle file data if provided
            if (fileData) {
                // This part of the original code did not have fileData handling,
                // so we'll keep it simple and only set it if provided.
                // The new_code's loadHistoryData also did not have fileData handling.
                // For now, we'll just set it if it's passed.
                // setFileData(fileData); // This state was removed, so this line is removed.
                // setS3FileUrls(fileData); // This state was removed, so this line is removed.
                // setFilePreviewUrls(fileData); // This state was removed, so this line is removed.
            }
        },

        forceUpdate: () => {
            setFormData((prev) => ({ ...prev }))
        },

        clearForm: () => {
            const resetData: { [key: string]: string | boolean | number | string[] | number[] } = {
                Travelling_From: "",
                Destination: "",
                Start_Date: "",
                End_Date: "",
                Number_of_Adults: "2",
                Number_of_Children: "0",
                Children_Ages: [],
                Budget: "",
                Preferred_Transportation: "",
                Preferred_Local_Transportation: "",
                Preferred_Accommodation: "",
                Dietary_Restrictions: "",
                Special_Requests: "",
                Traveling_Style: [],
                Interests: [],
            }
            setFormData(resetData)
            setCurrentThreadId(null);
        },

        updateLastApiResponse: (updatedData: any) => {
            setLastApiResponse(updatedData)
        },

        getLastApiResponse: () => {
            return lastApiResponse
        },

        getTravelDestination: () => {
            return formData.Destination ? String(formData.Destination) : null
        },

        createNew: () => {
            // Reset form data to initial state
            const resetData: { [key: string]: string | boolean | number | string[] | number[] } = {
                Travelling_From: "",
                Destination: "",
                Start_Date: "",
                End_Date: "",
                Budget: "",
                Number_of_Travelers: "",
                Number_of_Children: "",
                Children_Ages: [],
                Adults_Ages: [],
                Adults_Weights: [],
                Adults_Heights: [],
                Adults_Genders: [],
                Preferred_Transportation: "",
                Preferred_Local_Transportation: "",
                Preferred_Accommodation: "",
                Dietary_Restrictions: "",
                Special_Requests: "",
                Traveling_Style: [],
                Interests: [],
            }
            setFormData(resetData)
            setCurrentThreadId(null);

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
            Travelling_From: "",
            Destination: "",
            Start_Date: "",
            End_Date: "",
            Number_of_Adults: "2",
            Number_of_Children: "0",
            Children_Ages: [],
            Budget: "",
            Preferred_Transportation: "",
            Preferred_Local_Transportation: "",
            Preferred_Accommodation: "",
            Dietary_Restrictions: "",
            Special_Requests: "",
            Traveling_Style: [],
            Interests: [],
        }
        setFormData(resetData)
        setCurrentThreadId(null);
    }

    const handleCreateNew = () => {
        // Reset form data to initial state
        const resetData: { [key: string]: string | boolean | number | string[] | number[] } = {
            Travelling_From: "",
            Destination: "",
            Start_Date: "",
            End_Date: "",
            Budget: "",
            Number_of_Travelers: "",
            Number_of_Children: "",
            Children_Ages: [],
            Adults_Ages: [],
            Adults_Weights: [],
            Adults_Heights: [],
            Adults_Genders: [],
            Preferred_Transportation: "",
            Preferred_Local_Transportation: "",
            Preferred_Accommodation: "",
            Dietary_Restrictions: "",
            Special_Requests: "",
            Traveling_Style: [],
            Interests: [],
        }
        setFormData(resetData)
        setCurrentThreadId(null);

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
            "Travelling_From",
            "Destination",
            "Start_Date",
            "End_Date",
            "Budget",
            "Preferred_Transportation",
            "Preferred_Accommodation",
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

        // Validate children ages if children are selected
        const numChildren = Number(formData.Number_of_Children)
        if (numChildren > 0) {
            const childrenAges = Array.isArray(formData.Children_Ages) ? (formData.Children_Ages as number[]) : []
            const invalidAges = childrenAges.some((age, index) => index < numChildren && (!age || age <= 0))

            if (invalidAges) {
                markErrorsAndScroll(["Children_Ages"]) // container will be tagged
                toast({
                    title: "Validation Error",
                    description: "Please select ages for all children",
                    variant: "destructive",
                    duration: 3000,
                })
                return
            }
        }

        // Validate dates
        const startDate = new Date(String(formData.Start_Date))
        const endDate = new Date(String(formData.End_Date))

        if (startDate >= endDate) {
            markErrorsAndScroll(["End_Date"])
            toast({
                title: "Validation Error",
                description: "End date must be after start date",
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
                formDataToSend.append("thread_id", currentThreadId);
            }

            // Format the API parameters according to the sample payload
            const apiParams: any = {
                Travelling_From: formData.Travelling_From,
                Destination: formData.Destination,
                Start_Date: formData.Start_Date,
                End_Date: formData.End_Date,
                Number_of_Adults: Number(formData.Number_of_Adults) || 2,
                Number_of_Children: Number(formData.Number_of_Children) || 0,
                Children_Ages: numChildren > 0 ? (formData.Children_Ages as number[]).slice(0, numChildren) : [],
                Budget: formData.Budget,
                Preferred_Transportation: formData.Preferred_Transportation,
                Preferred_Local_Transportation: formData.Preferred_Local_Transportation,
                Preferred_Accommodation: formData.Preferred_Accommodation,
                Dietary_Restrictions: formData.Dietary_Restrictions || "None",
                Special_Requests: formData.Special_Requests || "None",
                Traveling_Style: Array.isArray(formData.Traveling_Style) ? formData.Traveling_Style : [],
                Interests: Array.isArray(formData.Interests) ? formData.Interests : [],
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
                        setCurrentThreadId(data.thread_id);
                    }

                    setExecutionData({
                        agent_id,
                        executionToken: data.execution_id,
                        response: data.data,
                    })

                    // Get destination name for response
                    const destinationName = String(formData.Destination)

                    onResponse({
                        data: data.data,
                        execution_id: data.execution_id,
                        agent_id: agent_id,
                        message: data.message,
                        status: data.status,
                        destinationName: destinationName,
                    })

                    toast({
                        title: "Success",
                        description: data.message || "Travel plan generated successfully!",
                        duration: 3000,
                    })
                } else {
                    throw new Error(data.error || "Failed to generate travel plan")
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
                description: "Failed to generate travel plan. Please try again.",
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

    // Get number of children for rendering age dropdowns
    const numChildren = Number(formData.Number_of_Children) || 0
    const childrenAges = Array.isArray(formData.Children_Ages) ? (formData.Children_Ages as number[]) : []

    return (
        <div className="bg-white">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <MapPin className="w-3 h-3 sm:w-5 sm:h-5 text-indigo-600" />
                        </div>
                        <div>
                            <div className="max-w-4xl">
                                <h2 className="text-sm font-bold text-gray-900">Travel Planner</h2>
                                <div className="text-xs text-gray-600 leading-relaxed">
                                    <p className="transition-all duration-200">
                                        {detailedDescription || "Create comprehensive travel plans with AI assistance"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-3 sm:p-5">
                {/* Travel Configuration Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <MapPin className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Travel Configuration</h3>
                            <p className="text-xs text-gray-500">Configure the parameters for your travel plan</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Travelling From with Location Detection */}
                        <div className="space-y-2 scroll-mt-header" data-field="Travelling_From">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Travelling From
                                <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    value={String(formData.Travelling_From || "")}
                                    onChange={(e) => handleInputChange("Travelling_From", e.target.value)}
                                    placeholder="Enter departure city"
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
                            <p className="text-xs text-gray-500">Click the location icon to auto-detect your city</p>
                        </div>

                        {/* Destination */}
                        <div className="space-y-2 scroll-mt-header" data-field="Destination">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Destination
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={String(formData.Destination || "")}
                                onChange={(e) => handleInputChange("Destination", e.target.value)}
                                placeholder="Enter destination city"
                                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>

                        {/* Start Date */}
                        <div className="space-y-2 scroll-mt-header" data-field="Start_Date">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Start Date
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="date"
                                min={today}
                                value={String(formData.Start_Date || "")}
                                onChange={(e) => handleInputChange("Start_Date", e.target.value)}
                                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>

                        {/* End Date */}
                        <div className="space-y-2 scroll-mt-header" data-field="End_Date">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                End Date
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="date"
                                min={today}
                                value={String(formData.End_Date || "")}
                                onChange={(e) => handleInputChange("End_Date", e.target.value)}
                                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>

                        {/* Number of Adults */}
                        <div className="space-y-2 scroll-mt-header" data-field="Number_of_Adults">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Number of Adults
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.Number_of_Adults || "")}
                                onValueChange={(value) => handleInputChange("Number_of_Adults", Number.parseInt(value))}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select adults" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Number_of_Adults.map((option) => (
                                        <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {option} {Number.parseInt(option) === 1 ? "Adult" : "Adults"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Number of Children */}
                        <div className="space-y-2 scroll-mt-header" data-field="Number_of_Children">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Number of Children
                            </Label>
                            <Select
                                value={String(formData.Number_of_Children || "")}
                                onValueChange={(value) => handleInputChange("Number_of_Children", Number.parseInt(value))}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select children" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Number_of_Children.map((option) => (
                                        <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {option} {Number.parseInt(option) === 1 ? "Child" : "Children"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dynamic Children Ages - Only show when children > 0 */}
                        {numChildren > 0 && (
                            <>
                                {Array.from({ length: numChildren }, (_, index) => (
                                    <div key={`child-age-${index}`} className="space-y-2 scroll-mt-header" data-field="Children_Ages">
                                        <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                            Child {index + 1} Age
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={String(childrenAges[index] || "")}
                                            onValueChange={(value) => handleChildAgeChange(index, Number.parseInt(value))}
                                        >
                                            <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                                <SelectValue placeholder="Select age" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                                {STATIC_OPTIONS.Children_Ages.map((age) => (
                                                    <SelectItem key={age} value={age} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                                        {age} {Number.parseInt(age) === 1 ? "year old" : "years old"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Budget */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Budget
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.Budget || "")}
                                onValueChange={(value) => handleInputChange("Budget", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select budget" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Budget.map((option) => (
                                        <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preferred Transportation */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Plane className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Preferred Transportation
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.Preferred_Transportation || "")}
                                onValueChange={(value) => handleInputChange("Preferred_Transportation", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select transportation" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Preferred_Transportation.map((option) => (
                                        <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preferred Local Transportation */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Car className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Local Transportation
                            </Label>
                            <Select
                                value={String(formData.Preferred_Local_Transportation || "")}
                                onValueChange={(value) => handleInputChange("Preferred_Local_Transportation", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select local transport" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Preferred_Local_Transportation.map((option) => (
                                        <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {option.replace(/_/g, " ").charAt(0).toUpperCase() + option.replace(/_/g, " ").slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preferred Accommodation */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Hotel className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Accommodation
                                <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={String(formData.Preferred_Accommodation || "")}
                                onValueChange={(value) => handleInputChange("Preferred_Accommodation", value)}
                            >
                                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200">
                                    <SelectValue placeholder="Select accommodation" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                                    {STATIC_OPTIONS.Preferred_Accommodation.map((option) => (
                                        <SelectItem key={option} value={option} className="hover:bg-indigo-50 focus:bg-indigo-50">
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dietary Restrictions */}
                        <div className="space-y-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Utensils className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Dietary Restrictions
                            </Label>
                            <Input
                                value={String(formData.Dietary_Restrictions || "")}
                                onChange={(e) => handleInputChange("Dietary_Restrictions", e.target.value)}
                                placeholder="e.g., vegetarian, gluten-free"
                                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>

                        {/* Special Requests */}
                        <div className="space-y-2 sm:col-span-2">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Special Requests
                            </Label>
                            <Input
                                value={String(formData.Special_Requests || "")}
                                onChange={(e) => handleInputChange("Special_Requests", e.target.value)}
                                placeholder="Any special requests or requirements"
                                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Travel Style Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Settings className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Travel Style</h3>
                            <p className="text-xs text-gray-500">Select your preferred travel styles (multiple allowed)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {STATIC_OPTIONS.Traveling_Style.map((style) => (
                            <div key={style} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`style-${style}`}
                                    checked={Array.isArray(formData.Traveling_Style) && (formData.Traveling_Style as string[]).includes(style)}
                                    onChange={(e) => handleMultiSelectChange("Traveling_Style", style, e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <Label htmlFor={`style-${style}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                                    {style.charAt(0).toUpperCase() + style.slice(1)}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Interests Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Star className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Interests</h3>
                            <p className="text-xs text-gray-500">Select your interests (multiple allowed)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                        {STATIC_OPTIONS.Interests.map((interest) => (
                            <div key={interest} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`interest-${interest}`}
                                    checked={Array.isArray(formData.Interests) && (formData.Interests as string[]).includes(interest)}
                                    onChange={(e) => handleMultiSelectChange("Interests", interest, e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <Label htmlFor={`interest-${interest}`} className="text-xs sm:text-xs text-gray-700 cursor-pointer">
                                    {interest.charAt(0).toUpperCase() + interest.slice(1)}
                                </Label>
                            </div>
                        ))}
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
                                Generating...
                            </>
                        ) : (
                            <>
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Generate Travel Plan
                            </>
                        )}
                    </Button>
                </div>
            </form>
            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
        </div>
    )
})

DynamicTravelForm.displayName = "DynamicTravelForm"

export default DynamicTravelForm
