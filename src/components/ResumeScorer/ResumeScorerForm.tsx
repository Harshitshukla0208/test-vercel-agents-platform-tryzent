"use client"

import type React from "react"
import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Settings,
    FileText,
    Loader2,
    Upload,
    Star,
    X,
    Eye,
    ChevronLeft,
    ChevronRight,
    PlusCircle,
    Briefcase,
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

interface FilePreview {
    file: File
    url: string
    name: string
}

const DynamicResumeForm = forwardRef(({ agentData, onResponse, detailedDescription }: DynamicAgentFormProps, ref) => {
    const [formData, setFormData] = useState<{
        [key: string]: string | boolean | number | string[] | number[]
    }>({
        Job_Description: "",
        Job_Role: "",
        Special_Instructions: "",
    })

    const [loading, setLoading] = useState(false)
    const [agent_id, setagent_id] = useState<string>("4f398724-bcb0-5d57-b523-a9bc6055b968")
    const [lastApiResponse, setLastApiResponse] = useState<any>(null)
    const { setExecutionData } = useRating()
    const [showContactPopup, setShowContactPopup] = useState(false)
    const { checkCreditsBeforeExecution } = useCreditsCheck()
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)

    // File handling states
    const [resumeFiles, setResumeFiles] = useState<File[]>([])
    const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null)
    const [resumePreviews, setResumePreviews] = useState<FilePreview[]>([])
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
    const [useTextInput, setUseTextInput] = useState(true)
    const [originalJobDescriptionFileName, setOriginalJobDescriptionFileName] = useState<string>("")

    // Add state for historical files
    const [historicalFiles, setHistoricalFiles] = useState<any[]>([])

    const clearHistoricalFilesIfNeeded = (triggerSource?: string) => {
        if (historicalFiles.length === 0) {
            return
        }

        setHistoricalFiles([])
        setOriginalJobDescriptionFileName("")

        if (!jobDescriptionFile) {
            setUseTextInput(true)
        }

        toast({
            title: "Historical files removed",
            description: "Please upload fresh resume and job description files before submitting any changes.",
            duration: 3000,
        })

        console.log("Cleared historical files due to:", triggerSource || "unspecified change")
    }

    const router = useRouter()

    // Initialize form data
    useEffect(() => {
        const initialData: { [key: string]: string | boolean | number | string[] | number[] } = {
            Job_Description: "",
            Job_Role: "",
            Special_Instructions: "",
        }
        setFormData(initialData)
    }, [])

    // Handle form field changes
    const handleInputChange = (variable: string, value: string | boolean | number | string[] | number[]) => {
        clearHistoricalFilesIfNeeded(`form input change: ${variable}`)
        setFormData((prev) => ({
            ...prev,
            [variable]: value,
        }))
        clearFieldError(variable)
    }

    // Fixed handleResumeUpload function
    const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        clearHistoricalFilesIfNeeded("resume upload attempt")

        console.log("Selected files:", files.map(f => ({ name: f.name, size: f.size, type: f.type })))

        // Validate file types
        const invalidFiles = files.filter(file => file.type !== 'application/pdf')
        if (invalidFiles.length > 0) {
            toast({
                title: "Invalid File Type",
                description: "Only PDF files are allowed for resumes",
                variant: "destructive",
                duration: 3000,
            })
            // Reset the input
            e.target.value = ''
            return
        }

        // Check for duplicate files based on name and size
        const existingFiles = resumeFiles.map(f => `${f.name}-${f.size}`)
        const newFiles = files.filter(file => !existingFiles.includes(`${file.name}-${file.size}`))
        
        if (newFiles.length === 0) {
            toast({
                title: "Duplicate Files",
                description: "All selected files are already uploaded",
                variant: "destructive",
                duration: 3000,
            })
            e.target.value = ''
            return
        }

        if (newFiles.length < files.length) {
            toast({
                title: "Some Files Skipped",
                description: `${files.length - newFiles.length} duplicate files were skipped`,
                duration: 3000,
            })
        }

        console.log("New files to add:", newFiles.map(f => ({ name: f.name, size: f.size })))

        // Update resume files state
        setResumeFiles(prev => {
            const updated = [...prev, ...newFiles]
            console.log("Updated resumeFiles state:", updated.map(f => ({ name: f.name, size: f.size })))
            return updated
        })

        // Create preview URLs for new files only
        const newPreviews = newFiles.map(file => ({
            file,
            url: URL.createObjectURL(file),
            name: file.name
        }))

        setResumePreviews(prev => {
            const updated = [...prev, ...newPreviews]
            console.log("Updated resumePreviews state:", updated.map(p => p.name))
            return updated
        })
        
        // Reset the input to allow selecting the same files again if needed
        e.target.value = ''

        toast({
            title: "Files Uploaded",
            description: `${newFiles.length} resume(s) uploaded successfully`,
            duration: 3000,
        })
    }

    // Handle job description file upload
    const handleJobDescriptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        clearHistoricalFilesIfNeeded("job description upload attempt")

        if (file.type !== 'application/pdf') {
            toast({
                title: "Invalid File Type",
                description: "Only PDF files are allowed for job descriptions",
                variant: "destructive",
                duration: 3000,
            })
            e.target.value = ''
            return
        }

        // Rename file to TRYZENT_JD.pdf
        setOriginalJobDescriptionFileName(file.name);
        const renamedFile = new File([file], "TRYZENT_JD.pdf", { type: file.type })
        setJobDescriptionFile(renamedFile)
        setUseTextInput(false)
        clearFieldError("Job_Description")

        // Reset the input
        e.target.value = ''

        toast({
            title: "Job Description Uploaded",
            description: "PDF uploaded and renamed to TRYZENT_JD.pdf",
            duration: 3000,
        })
    }

    // Remove resume file
    const removeResumeFile = (index: number) => {
        const fileToRemove = resumePreviews[index]
        URL.revokeObjectURL(fileToRemove.url)

        setResumeFiles(prev => {
            const updated = prev.filter((_, i) => i !== index)
            console.log("After removal, resumeFiles:", updated.map(f => ({ name: f.name, size: f.size })))
            return updated
        })
        setResumePreviews(prev => prev.filter((_, i) => i !== index))

        if (currentPreviewIndex >= resumePreviews.length - 1) {
            setCurrentPreviewIndex(Math.max(0, resumePreviews.length - 2))
        }
    }

    // Remove job description file
    const removeJobDescriptionFile = () => {
        setJobDescriptionFile(null)
        setUseTextInput(true)
    }

    // Open PDF in new tab
    const openPDFInNewTab = (file: File) => {
        const url = URL.createObjectURL(file)
        window.open(url, '_blank')
        // Clean up URL after a delay to allow the browser to use it
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    // Carousel navigation
    const nextPreview = () => {
        setCurrentPreviewIndex((prev) => (prev + 1) % resumePreviews.length)
    }

    const prevPreview = () => {
        setCurrentPreviewIndex((prev) => (prev - 1 + resumePreviews.length) % resumePreviews.length)
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

            Object.keys(inputsObject).forEach((key) => {
                const value = inputsObject[key]
                if (typeof value === "boolean") {
                    newFormData[key] = value
                } else if (typeof value === "number") {
                    newFormData[key] = value
                } else if (Array.isArray(value)) {
                    newFormData[key] = value
                } else if (typeof value === "string") {
                    newFormData[key] = value
                } else {
                    newFormData[key] = String(value)
                }
            })

            setFormData(newFormData)
            if (Array.isArray(fileData)) {
                setHistoricalFiles(fileData)
                // Toggle to PDF upload if JD file is present
                const hasJD = fileData.some(f => /JD|TRYZENT_JD/i.test(f.file_key))
                if (hasJD) {
                    setUseTextInput(false)
                } else if (newFormData.Job_Description && String(newFormData.Job_Description).trim().length > 0) {
                    setUseTextInput(true)
                }
            } else {
                setHistoricalFiles([])
                if (newFormData.Job_Description && String(newFormData.Job_Description).trim().length > 0) {
                    setUseTextInput(true)
                }
            }
        },

        forceUpdate: () => {
            setFormData((prev) => ({ ...prev }))
        },

        clearForm: () => {
            const resetData: { [key: string]: string | boolean | number | string[] | number[] } = {
                Job_Description: "",
                Job_Role: "",
                Special_Instructions: "",
            }
            setFormData(resetData)
            setCurrentThreadId(null)
            // Clear files and previews
            resumePreviews.forEach(preview => URL.revokeObjectURL(preview.url))
            setResumeFiles([])
            setJobDescriptionFile(null)
            setResumePreviews([])
            setCurrentPreviewIndex(0)
            setUseTextInput(true)
            setHistoricalFiles([])
        },

        updateLastApiResponse: (updatedData: any) => {
            setLastApiResponse(updatedData)
        },

        getLastApiResponse: () => {
            return lastApiResponse
        },

        createNew: () => {
            const resetData: { [key: string]: string | boolean | number | string[] | number[] } = {
                Job_Description: "",
                Job_Role: "",
                Special_Instructions: "",
            }
            setFormData(resetData)
            setCurrentThreadId(null)
            // Clear files and previews
            resumePreviews.forEach(preview => URL.revokeObjectURL(preview.url))
            setResumeFiles([])
            setJobDescriptionFile(null)
            setResumePreviews([])
            setCurrentPreviewIndex(0)
            setUseTextInput(true)
            setHistoricalFiles([])
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
            Job_Description: "",
            Job_Role: "",
            Special_Instructions: "",
        }
        setFormData(resetData)
        setCurrentThreadId(null)
        // Clear files and previews
        resumePreviews.forEach(preview => URL.revokeObjectURL(preview.url))
        setResumeFiles([])
        setJobDescriptionFile(null)
        setResumePreviews([])
        setCurrentPreviewIndex(0)
        setUseTextInput(true)
        setHistoricalFiles([])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        console.log("=== FORM SUBMISSION DEBUG ===")
        console.log("Resume files count:", resumeFiles.length)
        console.log("Resume files:", resumeFiles.map(f => ({ name: f.name, size: f.size, type: f.type })))
        console.log("Job description file:", jobDescriptionFile ? { name: jobDescriptionFile.name, size: jobDescriptionFile.size } : null)
        console.log("Use text input:", useTextInput)

        const hasCredits = await checkCreditsBeforeExecution()
        if (!hasCredits) {
            setShowContactPopup(true)
            return
        }

        // Validation
        const missingFields: string[] = []

        // Validate Job Role
        if (!formData.Job_Role) {
            missingFields.push("Job_Role")
        }

        // Validate Job Description (either text with min 100 words or file)
        if (useTextInput) {
            const jobDescText = String(formData.Job_Description || "").trim()
            if (!jobDescText) {
                missingFields.push("Job_Description")
            } else {
                const wordCount = jobDescText.split(/\s+/).filter(word => word.length > 0).length
                if (wordCount < 100) {
                    markErrorsAndScroll(["Job_Description"])
                    toast({
                        title: "Validation Error",
                        description: `Job Description must be at least 100 words. Current: ${wordCount} words`,
                        variant: "destructive",
                        duration: 3000,
                    })
                    return
                }
            }
        } else if (!jobDescriptionFile) {
            missingFields.push("Job_Description")
        }

        // Validate Resume files
        if (resumeFiles.length === 0) {
            missingFields.push("Resume_Files")
        }

        if (missingFields.length > 0) {
            markErrorsAndScroll(missingFields)
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
                Job_Role: formData.Job_Role,
                Special_Instructions: formData.Special_Instructions || "",
            }

            // Add Job_Description only if using text input
            if (useTextInput) {
                apiParams.Job_Description = formData.Job_Description
            }

            console.log("API params:", apiParams)

            const apiParamsArray = [apiParams]
            formDataToSend.append("api_params", JSON.stringify(apiParamsArray))

            // Add resume files - CRITICAL SECTION
            console.log("Adding resume files to FormData...")
            resumeFiles.forEach((file, index) => {
                console.log(`Appending resume file ${index + 1}:`, {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                })
                // Append with explicit filename to ensure proper multipart encoding
                formDataToSend.append("files", file, file.name)
            })

            // Add job description file if using file input
            if (!useTextInput && jobDescriptionFile) {
                console.log("Appending job description file:", {
                    name: jobDescriptionFile.name,
                    size: jobDescriptionFile.size,
                    type: jobDescriptionFile.type
                })
                formDataToSend.append("files", jobDescriptionFile, jobDescriptionFile.name)
            }

            // Debug FormData contents
            console.log("=== FormData Debug ===")
            const formDataEntries: any[] = []
            for (let pair of formDataToSend.entries()) {
                if (pair[1] instanceof File) {
                    formDataEntries.push([pair[0], `File: ${pair[1].name} (${pair[1].size} bytes, ${pair[1].type})`])
                } else {
                    formDataEntries.push([pair[0], pair[1]])
                }
            }
            console.table(formDataEntries)

            console.log("Making API request...")

            try {
                const { data } = await axios.post("/api/execute-agent", formDataToSend, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                    timeout: 300000,
                    // Add request interceptor for debugging
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
                        console.log(`Upload Progress: ${percentCompleted}%`)
                    },
                })

                console.log("API Response:", data)

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
                        description: data.message || "Resume scoring completed successfully!",
                        duration: 3000,
                    })
                } else {
                    throw new Error(data.error || "Failed to score resume")
                }
            } catch (axiosError) {
                console.error("API Request Error:", axiosError)
                
                if (axios.isAxiosError(axiosError)) {
                    if (axiosError.response?.status === 401) {
                        handleTokenExpiration()
                        return
                    }

                    const errorMessage =
                        axiosError.response?.data?.error || axiosError.response?.data?.message || axiosError.message

                    console.error("API Error Details:", {
                        status: axiosError.response?.status,
                        statusText: axiosError.response?.statusText,
                        data: axiosError.response?.data,
                        config: {
                            url: axiosError.config?.url,
                            method: axiosError.config?.method,
                            headers: axiosError.config?.headers,
                        }
                    })

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
            console.error("General Error:", err)
            
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"

            onResponse({
                error: errorMessage,
            })

            toast({
                title: "Error",
                description: "Failed to score resume. Please try again.",
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

    // Utility function to clean up historical file names
    function getDisplayFileName(fileKey: string) {
        // Remove leading underscores and hash-like prefixes, keep the readable part
        const parts = decodeURIComponent(fileKey).split("_");
        if (parts.length > 2) {
            // Find the first part that contains a space or .pdf (likely the real name)
            const readable = parts.find(p => /[\s\.]/.test(p));
            if (readable) return readable.trim();
        }
        // Fallback: just return the last part after the last '/'
        return decodeURIComponent(fileKey.split("/").pop() || "Historical File");
    }

    // Cleanup effect for preview URLs
    useEffect(() => {
        return () => {
            // Clean up all preview URLs when component unmounts
            resumePreviews.forEach(preview => URL.revokeObjectURL(preview.url))
        }
    }, [])

    return (
        <div className="bg-white rounded-xl">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-3 h-3 sm:w-5 sm:h-5 text-indigo-600" />
                        </div>
                        <div>
                            <div className="max-w-4xl">
                                <h2 className="text-sm font-bold text-gray-900">Resume Scorer</h2>
                                <div className="text-xs text-gray-600 leading-relaxed">
                                    <p className="transition-all duration-200">
                                        {detailedDescription || "Analyze and score resumes against job descriptions with AI assistance"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-3 sm:p-5">
                {/* Job Configuration Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Job Configuration</h3>
                            <p className="text-xs text-gray-500">Configure the job details and requirements</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Job Role */}
                        <div className="space-y-2 scroll-mt-header" data-field="Job_Role">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Job Role
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={String(formData.Job_Role || "")}
                                onChange={(e) => handleInputChange("Job_Role", e.target.value)}
                                placeholder="e.g., Software Engineer, Data Scientist"
                                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>

                        {/* Special Instructions */}
                        <div className="space-y-2 scroll-mt-header" data-field="Special_Instructions">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Special Instructions
                            </Label>
                            <Input
                                value={String(formData.Special_Instructions || "")}
                                onChange={(e) => handleInputChange("Special_Instructions", e.target.value)}
                                placeholder="e.g., NodeJS, ReactJS, NextJS, Javascript"
                                className="h-10 sm:h-12 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Job Description Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <FileText className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Job Description</h3>
                            <p className="text-xs text-gray-500">Provide job description via text (min 100 words) or upload PDF</p>
                        </div>
                    </div>

                    {/* Toggle buttons */}
                    <div className="flex gap-2 mb-4">
                        <Button
                            type="button"
                            onClick={() => {
                                clearHistoricalFilesIfNeeded("switch to text input")
                                setUseTextInput(true)
                                setJobDescriptionFile(null)
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${useTextInput
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            Write Text
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                clearHistoricalFilesIfNeeded("switch to PDF upload")
                                setUseTextInput(false)
                                setFormData(prev => ({ ...prev, Job_Description: "" }))
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${!useTextInput
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            Upload PDF
                        </Button>
                    </div>

                    {useTextInput ? (
                        <div className="space-y-2 scroll-mt-header" data-field="Job_Description">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Job Description Text
                                <span className="text-xs text-gray-500">(minimum 100 words)</span>
                            </Label>
                            <Textarea
                                value={String(formData.Job_Description || "")}
                                onChange={(e) => handleInputChange("Job_Description", e.target.value)}
                                placeholder="Enter detailed job description with requirements, responsibilities, and qualifications..."
                                className="min-h-32 text-xs sm:text-xs border-2 border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl bg-white hover:border-indigo-300 transition-all duration-200 resize-y"
                                rows={8}
                            />
                            <p className="text-xs text-gray-500">
                                Word count: {String(formData.Job_Description || "").trim().split(/\s+/).filter(word => word.length > 0).length}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 scroll-mt-header" data-field="Job_Description">
                            <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Upload className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                                Upload Job Description PDF
                            </Label>

                            {!jobDescriptionFile && historicalFiles.some(f => /JD|TRYZENT_JD/i.test(f.file_key)) && (
                                <div className="border-2 border-indigo-200 rounded-xl p-4 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-8 h-8 text-indigo-600" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {getDisplayFileName(historicalFiles.find(f => /JD|TRYZENT_JD/i.test(f.file_key)).file_key)}
                                                </p>
                                                <p className="text-xs text-gray-500">Historical File</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                onClick={() => window.open(historicalFiles.find(f => /JD|TRYZENT_JD/i.test(f.file_key)).signed_url, '_blank')}
                                                className="p-2 bg-white hover:bg-indigo-100 text-indigo-600 rounded-lg"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!jobDescriptionFile ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-all duration-200">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <Label htmlFor="job-description-upload" className="cursor-pointer">
                                        <span className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                                            Click to upload job description
                                        </span>
                                        <span className="text-xs text-gray-500 block mt-1">PDF files only</span>
                                    </Label>
                                    <Input
                                        id="job-description-upload"
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleJobDescriptionUpload}
                                        className="hidden"
                                    />
                                </div>
                            ) : (
                                <div className="border-2 border-indigo-200 rounded-xl p-4 bg-white">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-8 h-8 text-indigo-600" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{originalJobDescriptionFileName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {(jobDescriptionFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                onClick={() => openPDFInNewTab(jobDescriptionFile)}
                                                className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={removeJobDescriptionFile}
                                                className="p-2 bg-white hover:bg-indigo-100 text-indigo-600 rounded-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Resume Upload Section */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Upload className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Resume Upload</h3>
                            <p className="text-xs text-gray-500">Upload resume files for scoring</p>
                        </div>
                    </div>

                    <div className="space-y-2 scroll-mt-header" data-field="Resume_Files">
                        <Label className="text-xs sm:text-xs font-semibold text-gray-800 flex items-center gap-2">
                            <Upload className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                            Resume Files
                            <span className="text-red-500">*</span>
                        </Label>

                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-all duration-200">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <Label htmlFor="resume-upload" className="cursor-pointer">
                                <span className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                                    Click to upload resumes
                                </span>
                                <span className="text-xs text-gray-500 block mt-1">PDF files only, multiple files allowed</span>
                            </Label>
                            <Input
                                id="resume-upload"
                                type="file"
                                accept=".pdf"
                                multiple
                                onChange={handleResumeUpload}
                                className="hidden"
                            />
                        </div>

                        {/* Resume Previews List */}
                        {(resumePreviews.length > 0 || historicalFiles.length > 0) && (
                            <div className="mt-4 space-y-3">
                                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                                    Uploaded Resumes ({resumePreviews.length + historicalFiles.filter(f => !/JD|TRYZENT_JD/i.test(f.file_key)).length})
                                </h4>
                                {/* Historical files (excluding JD) */}
                                {historicalFiles.filter(f => !/JD|TRYZENT_JD/i.test(f.file_key)).map((file, index) => (
                                    <div key={file.file_key} className="border-2 border-indigo-200 rounded-xl p-4 bg-white flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-8 h-8 text-indigo-600" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{getDisplayFileName(file.file_key)}</p>
                                                <p className="text-xs text-gray-500">Historical File</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                onClick={() => window.open(file.signed_url, '_blank')}
                                                className="p-2 bg-white hover:bg-indigo-100 text-indigo-600 rounded-lg"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {/* Local uploaded files */}
                                {resumePreviews.map((preview, index) => (
                                    <div key={index} className="border-2 border-indigo-200 rounded-xl p-4 bg-white flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-8 h-8 text-indigo-600" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{preview.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {(preview.file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                onClick={() => openPDFInNewTab(preview.file)}
                                                className="p-2 bg-white hover:bg-indigo-100 text-indigo-600 rounded-lg"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => removeResumeFile(index)}
                                                className="p-2 bg-white hover:bg-indigo-100 text-indigo-600 rounded-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                Scoring...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                Score Resumes
                            </>
                        )}
                    </Button>
                </div>
            </form>
            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
        </div>
    )
})

DynamicResumeForm.displayName = "DynamicResumeForm"

export default DynamicResumeForm