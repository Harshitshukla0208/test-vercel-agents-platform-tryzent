"use client"

import type React from "react"
import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Settings,
  BookOpen,
  Loader2,
  GraduationCap,
  School,
  BookMarked,
  Hash,
  Clock,
  Users,
  Globe,
  FileText,
  Upload,
  X,
  Download,
  ExternalLink,
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
  Detailed_description?: string
}

interface DropdownData {
  boards: string[]
  grades: string[]
  subjects: string[]
  chapters: Array<[string, string]>
}

interface LoadingStates {
  boards: boolean
  grades: boolean
  subjects: boolean
  chapters: boolean
}

interface FileData {
  file_key: string
  signed_url: string
  expires_at: number
  original_filename?: string // Add this to store the original filename
}

// Static dropdown options for non-dynamic fields
const STATIC_OPTIONS = {
  Number_of_Lecture: ["1", "2", "3", "4"],
  Duration_of_Lecture: ["15", "20", "30", "40", "45", "60"],
  Language: ["english", "hindi"],
  Class_Strength: ["10", "15", "20", "25", "30", "35", "40", "45", "50", "60"],
}

const DynamicAgentForm = forwardRef(({ agentData, onResponse, Detailed_description }: DynamicAgentFormProps, ref) => {
  const [planningMode, setPlanningMode] = useState<"chapter" | "topic">("chapter")
  const [formData, setFormData] = useState<{
    [key: string]: string | boolean | number
  }>({})
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileData, setFileData] = useState<FileData[]>([])
  const [historicalFileName, setHistoricalFileName] = useState<string>("")
  const [s3FileUrls, setS3FileUrls] = useState<string[]>([])
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)

  const [dropdownData, setDropdownData] = useState<DropdownData>({
    boards: [],
    grades: [],
    subjects: [],
    chapters: [],
  })

  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    boards: false,
    grades: false,
    subjects: false,
    chapters: false,
  })

  // New state to track historical values that should be displayed even when not in dropdown options
  const [historicalValues, setHistoricalValues] = useState<{
    Board?: string
    Grade?: string
    Subject?: string
    Chapter_Number?: string
  }>({})

  const [loading, setLoading] = useState(false)
  const [agent_id, setagent_id] = useState<string>("")
  const [lastApiResponse, setLastApiResponse] = useState<any>(null)
  const { setExecutionData } = useRating()
  const [showContactPopup, setShowContactPopup] = useState(false)
  const { checkCreditsBeforeExecution } = useCreditsCheck()
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  // Helper function to extract filename from file_key or URL
  const extractFilenameFromKey = (fileKey: string): string => {
    // Extract filename from the file key
    // Example: "71438d0a-8041-7076-2020-7ca42e8539d9/_8cc54081b08a4922bb7bbb5baf02921b_2.pdf"
    const parts = fileKey.split('/')
    if (parts.length > 1) {
      const filename = parts[parts.length - 1]
      // Remove the hash prefix if it exists (everything before the first underscore after hash)
      const cleanFilename = filename.replace(/^_[a-f0-9]+_/, '')
      return cleanFilename || filename
    }
    return fileKey
  }

  // Function to download historical file
  const downloadHistoricalFile = async () => {
    if (!fileData || fileData.length === 0) {
      toast({
        title: "No file to download",
        description: "No historical file is available for download.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    setIsDownloading(true)
    
    try {
      const file = fileData[0]
      const filename = extractFilenameFromKey(file.file_key)
      
      // Check if the signed URL is expired
      const currentTime = Math.floor(Date.now() / 1000)
      if (file.expires_at && currentTime > file.expires_at) {
        toast({
          title: "File link expired",
          description: "The download link has expired. Please regenerate the lesson plan to get a new link.",
          variant: "destructive",
          duration: 5000,
        })
        return
      }

      // Create a temporary link to download the file
      const response = await fetch(file.signed_url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }

      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)

      toast({
        title: "File downloaded",
        description: `${filename} has been downloaded successfully.`,
        duration: 3000,
      })
    } catch (error) {
      console.error('Error downloading file:', error)
      toast({
        title: "Download failed",
        description: "Failed to download the file. The link may have expired or the file may no longer be available.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // Function to open file in new tab
  const openFileInNewTab = () => {
    if (!fileData || fileData.length === 0) {
      toast({
        title: "No file to view",
        description: "No historical file is available to view.",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    const file = fileData[0]
    
    // Check if the signed URL is expired
    const currentTime = Math.floor(Date.now() / 1000)
    if (file.expires_at && currentTime > file.expires_at) {
      toast({
        title: "File link expired",
        description: "The view link has expired. Please regenerate the lesson plan to get a new link.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    window.open(file.signed_url, '_blank')
  }

  // Initialize form data with empty values
  useEffect(() => {
    const initialData: { [key: string]: string | boolean | number } = {
      Board: "",
      Grade: "",
      Subject: "",
      Chapter_Number: "",
      Topic: "",
      Sub_Topic: "",
      Number_of_Lecture: "",
      Duration_of_Lecture: "",
      Language: "",
      Class_Strength: "",
      Quiz: false,
      Assignment: false,
      Structured_Output: true, // Always true and hidden
    }

    setFormData(initialData)

    // Load initial boards data
    fetchBoards()
  }, [])

  const router = useRouter()

  // Fetch boards data
  const fetchBoards = async () => {
    setLoadingStates((prev) => ({ ...prev, boards: true }))
    try {
      const response = await fetch("/api/dropdown-values")
      const data = await response.json()

      if (data.status && data.data?.status) {
        setDropdownData((prev) => ({ ...prev, boards: data.data.data }))
      } else {
        throw new Error(data.error || "Failed to fetch boards")
      }
    } catch (error) {
      console.error("Error fetching boards:", error)
      toast({
        title: "Error",
        description: "Failed to load boards. Please refresh the page.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, boards: false }))
    }
  }

  // Fetch grades based on selected board
  const fetchGrades = async (board: string) => {
    if (!board) return

    setLoadingStates((prev) => ({ ...prev, grades: true }))
    try {
      const response = await fetch(`/api/dropdown-values?board=${encodeURIComponent(board)}`)
      const data = await response.json()

      if (data.status && data.data?.status) {
        setDropdownData((prev) => ({
          ...prev,
          grades: data.data.data,
          subjects: [],
          chapters: [],
        }))

        // Only reset form data if not loading historical data
        if (!historicalValues.Grade) {
          setFormData((prev) => ({
            ...prev,
            Grade: "",
            Subject: "",
            Chapter_Number: "",
          }))
        }
      } else {
        throw new Error(data.error || "Failed to fetch grades")
      }
    } catch (error) {
      console.error("Error fetching grades:", error)
      toast({
        title: "Error",
        description: "Failed to load grades for selected board.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, grades: false }))
    }
  }

  // Fetch subjects based on selected board and grade
  const fetchSubjects = async (board: string, grade: string) => {
    if (!board || !grade) return

    setLoadingStates((prev) => ({ ...prev, subjects: true }))
    try {
      const response = await fetch(
        `/api/dropdown-values?board=${encodeURIComponent(board)}&grade=${encodeURIComponent(grade)}`,
      )
      const data = await response.json()

      if (data.status && data.data?.status) {
        setDropdownData((prev) => ({
          ...prev,
          subjects: data.data.data,
          chapters: [],
        }))

        // Only reset form data if not loading historical data
        if (!historicalValues.Subject) {
          setFormData((prev) => ({
            ...prev,
            Subject: "",
            Chapter_Number: "",
          }))
        }
      } else {
        throw new Error(data.error || "Failed to fetch subjects")
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      toast({
        title: "Error",
        description: "Failed to load subjects for selected grade.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, subjects: false }))
    }
  }

  // Fetch chapters based on selected board, grade, and subject
  const fetchChapters = async (board: string, grade: string, subject: string) => {
    if (!board || !grade || !subject) return

    setLoadingStates((prev) => ({ ...prev, chapters: true }))
    try {
      const response = await fetch(
        `/api/dropdown-values?board=${encodeURIComponent(board)}&grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}`,
      )
      const data = await response.json()

      if (data.status && data.data?.status) {
        setDropdownData((prev) => ({
          ...prev,
          chapters: data.data.data,
        }))

        // Only reset form data if not loading historical data
        if (!historicalValues.Chapter_Number) {
          setFormData((prev) => ({
            ...prev,
            Chapter_Number: "",
          }))
        }
      } else {
        throw new Error(data.error || "Failed to fetch chapters")
      }
    } catch (error) {
      console.error("Error fetching chapters:", error)
      toast({
        title: "Error",
        description: "Failed to load chapters for selected subject.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, chapters: false }))
    }
  }

  // Handle form field changes with cascade loading
  const handleInputChange = async (variable: string, value: string | boolean | number) => {
    setFormData((prev) => ({
      ...prev,
      [variable]: value,
    }))
    clearFieldError(variable)

    // Handle cascade loading for dynamic dropdowns
    if (variable === "Board" && typeof value === "string") {
      await fetchGrades(value)
    } else if (variable === "Grade" && typeof value === "string") {
      const board = formData.Board as string
      if (board) {
        await fetchSubjects(board, value)
      }
    } else if (variable === "Subject" && typeof value === "string") {
      const board = formData.Board as string
      const grade = formData.Grade as string
      if (board && grade && planningMode === "chapter") {
        await fetchChapters(board, grade, value)
      }
    }
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === "application/pdf") {
        setUploadedFile(file)
        setHistoricalFileName("") // Clear historical filename when new file is uploaded
        setFileData([]) // Clear historical file data when new file is uploaded
        toast({
          title: "File uploaded",
          description: `${file.name} has been uploaded successfully.`,
          duration: 3000,
        })
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file only.",
          variant: "destructive",
          duration: 3000,
        })
      }
    }
  }

  // Handle file removal
  const handleFileRemove = () => {
    setUploadedFile(null)
    setHistoricalFileName("")
    setFileData([])
    // Reset the file input
    const fileInput = document.getElementById("pdf-upload-inline") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const handlePlanningModeChange = (mode: "chapter" | "topic") => {
    setPlanningMode(mode)
    setUploadedFile(null)
    setHistoricalFileName("")
    setFileData([])

    // Reset relevant form fields but keep Structured_Output always true
    if (mode === "topic") {
      setFormData((prev) => ({
        ...prev,
        Chapter_Number: "",
        Topic: "",
        Sub_Topic: "",
        Structured_Output: true, // Always true
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        Topic: "",
        Sub_Topic: "",
        Structured_Output: true, // Always true
      }))
    }
    // clear any previous field errors when switching modes
    clearFieldError('Chapter_Number')
    clearFieldError('Topic')
  }

  // Helper function to get display value for dropdowns
  const getDisplayValue = (field: string, value: string) => {
    if (!value) return ""

    switch (field) {
      case "Board":
        return dropdownData.boards.includes(value) ? value.toUpperCase() : value.toUpperCase()
      case "Grade":
        return dropdownData.grades.includes(value) ? `Grade ${value}` : `Grade ${value}`
      case "Subject":
        return dropdownData.subjects.includes(value)
          ? value.charAt(0).toUpperCase() + value.slice(1)
          : value.charAt(0).toUpperCase() + value.slice(1)
      case "Chapter_Number":
        const chapter = dropdownData.chapters.find((ch) => ch[0] === value)
        return chapter ? `${chapter[0]}. ${chapter[1]}` : `Chapter ${value}`
      default:
        return value
    }
  }

  // Helper function to check if option exists in dropdown
  const optionExists = (field: string, value: string) => {
    if (!value) return false

    switch (field) {
      case "Board":
        return dropdownData.boards.includes(value)
      case "Grade":
        return dropdownData.grades.includes(value)
      case "Subject":
        return dropdownData.subjects.includes(value)
      case "Chapter_Number":
        return dropdownData.chapters.some((ch) => ch[0] === value)
      default:
        return false
    }
  }

  // Helper function to get chapter name or topic for PDF
  const getChapterOrTopicName = () => {
    if (planningMode === "topic" && formData.Topic) {
      return String(formData.Topic)
    } else if (planningMode === "chapter" && formData.Chapter_Number) {
      const selectedChapter = dropdownData.chapters.find((chapter) => chapter[0] === formData.Chapter_Number)
      return selectedChapter ? selectedChapter[1] : `Chapter ${formData.Chapter_Number}`
    }
    return null
  }

  // Get the current file display name
  const getCurrentFileName = () => {
    if (uploadedFile) {
      return uploadedFile.name
    }
    if (historicalFileName) {
      return historicalFileName
    }
    return null
  }

  // Check if there's a file (either uploaded or historical)
  const hasFile = () => {
    return uploadedFile !== null || historicalFileName !== ""
  }

  // Check if there's a historical file that can be downloaded
  const hasHistoricalFile = () => {
    return fileData && fileData.length > 0 && historicalFileName !== ""
  }

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    loadHistoryData: (historyInputs: any, fileDataParam?: any) => {
      if (!historyInputs) return

      let inputsObject: { [key: string]: any } = {}

      if (Array.isArray(historyInputs)) {
        historyInputs.forEach((item) => {
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

      const newFormData: { [key: string]: string | boolean | number } = {}
      const newHistoricalValues: { [key: string]: string } = {}

      // Process each input and set appropriate values
      Object.keys(inputsObject).forEach((key) => {
        const value = inputsObject[key]
        if (typeof value === "boolean") {
          newFormData[key] = value
        } else if (typeof value === "number") {
          newFormData[key] = value
        } else {
          newFormData[key] = String(value)

          // Store historical values for API-dependent fields
          if (["Board", "Grade", "Subject", "Chapter_Number"].includes(key)) {
            newHistoricalValues[key] = String(value)
          }
        }
      })

      // Set historical values before form data
      setHistoricalValues(newHistoricalValues)

      // Determine planning mode based on data
      if (newFormData.Topic) {
        setPlanningMode("topic")
      } else {
        setPlanningMode("chapter")
      }

      setFormData(newFormData)

      // Handle file data if provided
      if (fileDataParam && Array.isArray(fileDataParam) && fileDataParam.length > 0) {
        const fileInfo = fileDataParam[0] as FileData
        setFileData(fileDataParam)
        setS3FileUrls([fileInfo.signed_url])
        setFilePreviewUrls([fileInfo.signed_url])
        
        // Extract and set the historical filename
        const filename = extractFilenameFromKey(fileInfo.file_key)
        setHistoricalFileName(filename)
        
        // Clear any currently uploaded file since we're loading historical data
        setUploadedFile(null)

        console.log('Historical file loaded:', {
          filename,
          signed_url: fileInfo.signed_url,
          expires_at: fileInfo.expires_at,
          current_time: Math.floor(Date.now() / 1000)
        })
      }

      // Trigger cascade loading for historical data
      const board = newFormData.Board as string
      const grade = newFormData.Grade as string
      const subject = newFormData.Subject as string

      if (board) {
        fetchGrades(board).then(() => {
          if (grade) {
            fetchSubjects(board, grade).then(() => {
              if (subject) {
                fetchChapters(board, grade, subject)
              }
            })
          }
        })
      }
    },

    forceUpdate: () => {
      setFormData((prev) => ({ ...prev }))
    },

    clearForm: () => {
      const resetData: { [key: string]: string | boolean | number } = {
        Board: "",
        Grade: "",
        Subject: "",
        Chapter_Number: "",
        Topic: "",
        Sub_Topic: "",
        Number_of_Lecture: "",
        Duration_of_Lecture: "",
        Language: "",
        Class_Strength: "",
        Quiz: false,
        Assignment: false,
        Structured_Output: true,
      }
      setFormData(resetData)
      setHistoricalValues({})
      setPlanningMode("chapter")
      setUploadedFile(null)
      setHistoricalFileName("")
      setFileData([])
      setCurrentThreadId(null)

      // Reset dropdown data except boards
      setDropdownData((prev) => ({
        ...prev,
        grades: [],
        subjects: [],
        chapters: [],
      }))
    },

    updateLastApiResponse: (updatedData: any) => {
      setLastApiResponse(updatedData)
    },

    getLastApiResponse: () => {
      return lastApiResponse
    },

    // New method to get chapter/topic name
    getChapterOrTopicName: getChapterOrTopicName,

    createNew: () => {
      // Reset form data to initial state
      setFormData({
        Board: "",
        Grade: "",
        Subject: "",
        Chapter_Number: "",
        Topic: "",
        Sub_Topic: "",
        Number_of_Lecture: "",
        Duration_of_Lecture: "",
        Language: "",
        Class_Strength: "",
        Quiz: false,
        Assignment: false,
        Structured_Output: true,
      })

      // Reset dropdown data except boards
      setDropdownData((prev) => ({
        ...prev,
        grades: [],
        subjects: [],
        chapters: [],
      }))

      // Reset uploaded file
      setUploadedFile(null)
      setHistoricalFileName("")
      setFileData([])
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
    const resetData: { [key: string]: string | boolean | number } = {
      Board: "",
      Grade: "",
      Subject: "",
      Chapter_Number: "",
      Topic: "",
      Sub_Topic: "",
      Number_of_Lecture: "",
      Duration_of_Lecture: "",
      Language: "",
      Class_Strength: "",
      Quiz: false,
      Assignment: false,
      Structured_Output: true,
    }
    setFormData(resetData)
    setHistoricalValues({})
    setPlanningMode("chapter")
    setUploadedFile(null)
    setHistoricalFileName("")
    setFileData([])
    setCurrentThreadId(null)

    // Reset dropdown data except boards
    setDropdownData((prev) => ({
      ...prev,
      grades: [],
      subjects: [],
      chapters: [],
    }))
  }

  const handleCreateNew = () => {
    // Reset form data to initial state
    setFormData({
      Board: "",
      Grade: "",
      Subject: "",
      Chapter_Number: "",
      Topic: "",
      Sub_Topic: "",
      Number_of_Lecture: "",
      Duration_of_Lecture: "",
      Language: "",
      Class_Strength: "",
      Quiz: false,
      Assignment: false,
      Structured_Output: true,
    })

    // Reset dropdown data except boards
    setDropdownData((prev) => ({
      ...prev,
      grades: [],
      subjects: [],
      chapters: [],
    }))

    // Reset uploaded file
    setUploadedFile(null)
    setHistoricalFileName("")
    setFileData([])
    setCurrentThreadId(null)

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
    const requiredFields =
      planningMode === "chapter"
        ? ["Board", "Grade", "Subject", "Chapter_Number"]
        : ["Board", "Grade", "Subject", "Topic"]

    const missingFields = requiredFields.filter((field) => !formData[field])

    if (missingFields.length > 0) {
      markErrorsAndScroll(missingFields as string[])
      toast({
        title: "Validation Error",
        description: `Please fill in: ${missingFields.join(", ")}`,
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

      // Use actual form data instead of hardcoded values
      const apiParams: any = {
        Board: formData.Board,
        Grade: formData.Grade,
        Subject: formData.Subject,
        Number_of_Lecture: Number(formData.Number_of_Lecture) || 1,
        Duration_of_Lecture: Number(formData.Duration_of_Lecture) || 20,
        Class_Strength: Number(formData.Class_Strength) || 20,
        Language: formData.Language,
        Quiz: Boolean(formData.Quiz),
        Assignment: Boolean(formData.Assignment),
        Structured_Output: true, // Always true
      }

      // Add Sub_Topic if provided
      if (formData.Sub_Topic) {
        apiParams.Sub_Topic = formData.Sub_Topic
      }

      if (planningMode === "chapter") {
        apiParams.Chapter_Number = formData.Chapter_Number
        // Add Chapter_Name from the selected chapter
        const selectedChapter = dropdownData.chapters.find((chapter) => chapter[0] === formData.Chapter_Number)
        if (selectedChapter) {
          apiParams.Chapter_Name = selectedChapter[1]
        }
      } else {
        apiParams.Topic = formData.Topic
      }

      const apiParamsArray = [apiParams]
      formDataToSend.append("api_params", JSON.stringify(apiParamsArray))

      // Add file if uploaded for topic mode (prioritize new upload over historical)
      if (planningMode === "topic" && uploadedFile) {
        formDataToSend.append("file", uploadedFile)
      }

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

          // Get chapter/topic name for response
          const chapterOrTopicName = getChapterOrTopicName()

          onResponse({
            data: data.data,
            execution_id: data.execution_id,
            agent_id: agent_id,
            message: data.message,
            status: data.status,
            chapterOrTopicName: chapterOrTopicName, // Pass the chapter/topic name
          })

          toast({
            title: "Success",
            description: data.message || "Lesson plan generated successfully!",
            duration: 3000,
          })
        } else {
          throw new Error(data.error || "Failed to generate lesson plan")
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
        description: "Failed to generate lesson plan. Please try again.",
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

  const formatChapterDisplay = (chapter: [string, string]) => {
    return `${chapter[0]}. ${chapter[1]}`
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-100">
        <div className="flex gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-3 h-3 sm:w-5 text-blue-600" />
          </div>
          <div>
            <div className="max-w-4xl">
              <h2 className="text-base sm:text-base font-bold text-gray-900">Lesson Planner</h2>
              <div className="text-xs sm:text-xs text-gray-600 leading-relaxed">
                <p className="transition-all duration-200">
                  {Detailed_description || "Create comprehensive lesson planners with AI assistance"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-3 sm:p-5">
        {/* Planning Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Settings className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-base font-bold text-gray-900">Planning Mode</h3>
              <p className="text-xs sm:text-xs text-gray-500">Choose your lesson planning approach</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-100 shadow-sm">
            <button
              type="button"
              onClick={() => handlePlanningModeChange("chapter")}
              className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 ${planningMode === "chapter"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200"
                : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200"
                }`}
            >
              <BookMarked className="w-3 h-3 sm:w-4 sm:h-4" />
              <div className="text-left">
                <div className="text-xs sm:text-sm font-semibold">By Chapter</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handlePlanningModeChange("topic")}
              className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 ${planningMode === "topic"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200"
                : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-200"
                }`}
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <div className="text-left">
                <div className="text-xs sm:text-sm font-semibold">By Topic</div>
              </div>
            </button>
          </div>
        </div>

        {/* Lesson Configuration Section */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-base font-bold text-gray-900">Lesson Configuration</h3>
              <p className="text-xs sm:text-xs text-gray-500">Configure the parameters for your lesson plan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Board */}
            <div className="space-y-2 scroll-mt-header" data-field="Board">
              <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                <School className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Board
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.Board || "")}
                onValueChange={(value) => handleInputChange("Board", value)}
                disabled={loadingStates.boards}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder={loadingStates.boards ? "Loading boards..." : "Select board"}>
                    {formData.Board ? getDisplayValue("Board", String(formData.Board)) : null}
                  </SelectValue>
                  {loadingStates.boards && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-600" />}
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {/* Show historical value if it doesn't exist in dropdown */}
                  {formData.Board && !optionExists("Board", String(formData.Board)) && (
                    <SelectItem
                      value={String(formData.Board)}
                      className="hover:bg-blue-50 focus:bg-blue-50 text-orange-600 font-medium"
                    >
                      {getDisplayValue("Board", String(formData.Board))} (Historical)
                    </SelectItem>
                  )}
                  {dropdownData.boards.map((board) => (
                    <SelectItem key={board} value={board} className="hover:bg-blue-50 focus:bg-blue-50">
                      {board.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade */}
            <div className="space-y-2 scroll-mt-header" data-field="Grade">
              <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Grade
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.Grade || "")}
                onValueChange={(value) => handleInputChange("Grade", value)}
                disabled={loadingStates.grades || !formData.Board}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue
                    placeholder={
                      !formData.Board
                        ? "Select board first"
                        : loadingStates.grades
                          ? "Loading grades..."
                          : "Select grade"
                    }
                  >
                    {formData.Grade ? getDisplayValue("Grade", String(formData.Grade)) : null}
                  </SelectValue>
                  {loadingStates.grades && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-600" />}
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {/* Show historical value if it doesn't exist in dropdown */}
                  {formData.Grade && !optionExists("Grade", String(formData.Grade)) && (
                    <SelectItem
                      value={String(formData.Grade)}
                      className="hover:bg-blue-50 focus:bg-blue-50 text-orange-600 font-medium"
                    >
                      {getDisplayValue("Grade", String(formData.Grade))} (Historical)
                    </SelectItem>
                  )}
                  {dropdownData.grades.map((grade) => (
                    <SelectItem key={grade} value={grade} className="hover:bg-blue-50 focus:bg-blue-50">
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2 scroll-mt-header" data-field="Subject">
              <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Subject
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.Subject || "")}
                onValueChange={(value) => handleInputChange("Subject", value)}
                disabled={loadingStates.subjects || !formData.Grade}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue
                    placeholder={
                      !formData.Grade
                        ? "Select grade first"
                        : loadingStates.subjects
                          ? "Loading subjects..."
                          : "Select subject"
                    }
                  >
                    {formData.Subject ? getDisplayValue("Subject", String(formData.Subject)) : null}
                  </SelectValue>
                  {loadingStates.subjects && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-600" />}
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {/* Show historical value if it doesn't exist in dropdown */}
                  {formData.Subject && !optionExists("Subject", String(formData.Subject)) && (
                    <SelectItem
                      value={String(formData.Subject)}
                      className="hover:bg-blue-50 focus:bg-blue-50 text-orange-600 font-medium"
                    >
                      {getDisplayValue("Subject", String(formData.Subject))} (Historical)
                    </SelectItem>
                  )}
                  {dropdownData.subjects.map((subject) => (
                    <SelectItem key={subject} value={subject} className="hover:bg-blue-50 focus:bg-blue-50">
                      {subject.charAt(0).toUpperCase() + subject.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chapter Number (only for "By Chapter" mode) */}
            {planningMode === "chapter" && (
              <div className="space-y-2 scroll-mt-header" data-field="Chapter_Number">
                <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  Chapter
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={String(formData.Chapter_Number || "")}
                  onValueChange={(value) => handleInputChange("Chapter_Number", value)}
                  disabled={loadingStates.chapters || !formData.Subject}
                >
                  <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                    <SelectValue
                      placeholder={
                        !formData.Subject
                          ? "Select subject first"
                          : loadingStates.chapters
                            ? "Loading chapters..."
                            : "Select chapter"
                      }
                    >
                      {formData.Chapter_Number
                        ? getDisplayValue("Chapter_Number", String(formData.Chapter_Number))
                        : null}
                    </SelectValue>
                    {loadingStates.chapters && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-600" />}
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                    {/* Show historical value if it doesn't exist in dropdown */}
                    {formData.Chapter_Number && !optionExists("Chapter_Number", String(formData.Chapter_Number)) && (
                      <SelectItem
                        value={String(formData.Chapter_Number)}
                        className="hover:bg-blue-50 focus:bg-blue-50 text-orange-600 font-medium"
                      >
                        {getDisplayValue("Chapter_Number", String(formData.Chapter_Number))} (Historical)
                      </SelectItem>
                    )}
                    {dropdownData.chapters.map((chapter) => (
                      <SelectItem key={chapter[0]} value={chapter[0]} className="hover:bg-blue-50 focus:bg-blue-50">
                        {formatChapterDisplay(chapter)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sub Topic (for chapter mode) */}
            {planningMode === "chapter" && (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  Sub Topic
                  <span className="text-gray-400 text-xs">(Optional)</span>
                </Label>
                <Input
                  value={String(formData.Sub_Topic || "")}
                  onChange={(e) => handleInputChange("Sub_Topic", e.target.value)}
                  placeholder="Enter sub topic name"
                  className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200"
                />
              </div>
            )}

            {/* Topic (only for "By Topic" mode) */}
            {planningMode === "topic" && (
              <>
                <div className="space-y-2 scroll-mt-header" data-field="Topic">
                  <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    Topic
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={String(formData.Topic || "")}
                    onChange={(e) => handleInputChange("Topic", e.target.value)}
                    placeholder="Enter topic name"
                    className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200"
                  />
                </div>

                {/* Sub Topic (for topic mode) */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    Sub Topic
                    <span className="text-gray-400 text-xs">(Optional)</span>
                  </Label>
                  <Input
                    value={String(formData.Sub_Topic || "")}
                    onChange={(e) => handleInputChange("Sub_Topic", e.target.value)}
                    placeholder="Enter sub topic name"
                    className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200"
                  />
                </div>

                {/* File Upload - Integrated with form fields */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Upload className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    Reference Material
                    <span className="text-gray-400 text-xs">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <div className="h-10 sm:h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 hover:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all duration-200 group cursor-pointer">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        id="pdf-upload-inline"
                      />
                      <div className="flex h-full px-3 sm:px-4 items-center justify-between">
                        {hasFile() ? (
                          <>
                            <div className="flex items-center gap-2 text-green-700 flex-1 min-w-0">
                              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                                <FileText className="w-2 h-2 sm:w-3 sm:h-3 text-green-600" />
                              </div>
                              <span className="text-xs sm:text-sm font-medium truncate" title={getCurrentFileName() || ""}>
                                {getCurrentFileName()}
                              </span>
                              {historicalFileName && !uploadedFile && (
                                <span className="text-xs text-blue-600 font-medium flex-shrink-0">(Uploaded file)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              {/* Download and View buttons for historical files */}
                              {hasHistoricalFile() && !uploadedFile && (
                                <>
                                  {/* <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      downloadHistoricalFile()
                                    }}
                                    disabled={isDownloading}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors z-20 relative"
                                    title="Download file"
                                  >
                                    {isDownloading ? (
                                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                                    )}
                                  </button> */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openFileInNewTab()
                                    }}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors z-20 relative"
                                    title="Open in new tab"
                                  >
                                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFileRemove()
                                }}
                                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors z-20 relative"
                                title="Remove file"
                              >
                                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 group-hover:text-blue-700">
                            <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs sm:text-sm font-medium">Choose PDF file</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {hasFile() && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Number of Lectures */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Number of Lectures
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.Number_of_Lecture || "")}
                onValueChange={(value) => handleInputChange("Number_of_Lecture", Number.parseInt(value))}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select lectures" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.Number_of_Lecture.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option} {Number.parseInt(option) === 1 ? "Lecture" : "Lectures"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration of Lecture */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Duration (of each lecture)
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.Duration_of_Lecture || "")}
                onValueChange={(value) => handleInputChange("Duration_of_Lecture", Number.parseInt(value))}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.Duration_of_Lecture.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class Strength - Always Input Box */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Class Strength
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={String(formData.Class_Strength || "")}
                onChange={(e) => handleInputChange("Class_Strength", Number.parseInt(e.target.value) || "")}
                placeholder="Enter class size"
                className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200"
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                Language
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.Language || "")}
                onValueChange={(value) => handleInputChange("Language", value)}
              >
                <SelectTrigger className="h-10 sm:h-12 text-xs sm:text-sm border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white hover:border-blue-300 transition-all duration-200">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-gray-100 shadow-xl">
                  {STATIC_OPTIONS.Language.map((option) => (
                    <SelectItem key={option} value={option} className="hover:bg-blue-50 focus:bg-blue-50">
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Additional Options */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Settings className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-base font-bold text-gray-900">Additional Options</h3>
              <p className="text-xs sm:text-xs text-gray-500">Customize your lesson plan features</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Quiz Toggle */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl border border-green-100 hover:border-green-200 transition-all duration-200">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                  <span className="text-sm sm:text-base font-bold text-green-600">Q</span>
                </div>
                <div>
                  <Label className="text-sm sm:text-sm font-semibold text-gray-900">Quiz Questions</Label>
                  <p className="text-xs sm:text-xs text-gray-600">Include interactive quiz questions</p>
                </div>
              </div>
              <Switch
                checked={Boolean(formData.Quiz)}
                onCheckedChange={(checked) => handleInputChange("Quiz", checked)}
                className="data-[state=checked]:bg-blue-600 scale-110 sm:scale-125"
              />
            </div>

            {/* Assignment Toggle */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-100 hover:border-blue-200 transition-all duration-200">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <span className="text-sm sm:text-base font-bold text-blue-600">A</span>
                </div>
                <div>
                  <Label className="text-sm sm:text-sm font-semibold text-gray-900">Assignments</Label>
                  <p className="text-xs sm:text-xs text-gray-600">Include homework assignments</p>
                </div>
              </div>
              <Switch
                checked={Boolean(formData.Assignment)}
                onCheckedChange={(checked) => handleInputChange("Assignment", checked)}
                className="data-[state=checked]:bg-blue-600 scale-110 sm:scale-125"
              />
            </div>
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
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Generating...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Generate Lesson Plan
              </>
            )}
          </Button>
        </div>
      </form>
      <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
    </div>
  )
})

DynamicAgentForm.displayName = "DynamicAgentForm"

export default DynamicAgentForm