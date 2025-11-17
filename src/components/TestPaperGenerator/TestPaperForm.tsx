"use client"

import type React from "react"
import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    FileText,
    BookOpen,
    Loader2,
    GraduationCap,
    School,
    BookMarked,
    Clock,
    Target,
    Plus,
    Trash2,
    Calculator,
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
import MarksCalculator from "./marks-calculator"
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

interface TestPaperFormProps {
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

interface QuestionBreakdown {
    mcqs: number
    very_short_answers: number
    short_answers: number
    long_answers: number
    very_long_answers: number
    case_studies: number
    truth_False_questions: number
    fill_in_the_blanks: number
}

interface HistoricalFile {
    file_key: string
    signed_url: string
    expires_at: number
    original_name?: string // Add this to store the original filename
}

interface Topic {
    topic_name: string
    assigned_marks: number
    questions: QuestionBreakdown[]
    files?: File[]
    file_name?: string // Add file_name to the interface
    historical_files?: HistoricalFile[] // Add support for historical files
}

interface Chapter {
    chapter_number: string
    chapter_name?: string
    assigned_marks: number
    questions: QuestionBreakdown[]
}

interface MarksBreakdown {
    marks_of_each_mcqs: number
    marks_of_each_very_short_answers: number
    marks_of_each_short_answer: number
    marks_of_each_long_answer: number
    marks_of_each_very_long_answer: number
    marks_of_each_case_studies: number
    marks_of_each_truth_False_questions: number
    marks_of_each_fill_in_the_blanks: number
}

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"]
const DURATION_OPTIONS = ["15", "30", "45", "60", "90", "120", "180"]

const defaultQuestionBreakdown: QuestionBreakdown = {
    mcqs: 0,
    very_short_answers: 0,
    short_answers: 0,
    long_answers: 0,
    very_long_answers: 0,
    case_studies: 0,
    truth_False_questions: 0,
    fill_in_the_blanks: 0,
}

const defaultMarksBreakdown: MarksBreakdown = {
    marks_of_each_mcqs: 1,
    marks_of_each_very_short_answers: 1,
    marks_of_each_short_answer: 2,
    marks_of_each_long_answer: 3,
    marks_of_each_very_long_answer: 5,
    marks_of_each_case_studies: 4,
    marks_of_each_truth_False_questions: 1,
    marks_of_each_fill_in_the_blanks: 1,
}

// Helper function to extract filename without extension
const getFileNameWithoutExtension = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf(".")
    if (lastDotIndex === -1) return filename
    return filename.substring(0, lastDotIndex)
}

// Helper function to extract filename from S3 URL
const extractFilenameFromS3Url = (url: string, fileKey: string): string => {
    // Try to extract from the file_key first
    const keyParts = fileKey.split('/')
    if (keyParts.length > 1) {
        const filename = keyParts[keyParts.length - 1]
        // Remove any UUID prefixes if present
        return filename.replace(/^_[a-f0-9]+_/i, '')
    }

    // Fallback: try to extract from URL
    try {
        const urlParts = url.split('/')
        const filename = urlParts[urlParts.length - 1].split('?')[0]
        return filename.replace(/^_[a-f0-9]+_/i, '')
    } catch {
        return 'downloaded_file.pdf'
    }
}

const TestPaperForm = forwardRef(({ agentData, onResponse, Detailed_description }: TestPaperFormProps, ref) => {
    const [formData, setFormData] = useState({
        board: "",
        grade: "",
        subject: "",
        test_duration: 30,
        difficulty: "medium",
        total_marks: 100,
    })

    const [topics, setTopics] = useState<Topic[]>([])
    const [chapters, setChapters] = useState<Chapter[]>([])
    const [marksBreakdown, setMarksBreakdown] = useState<MarksBreakdown>(defaultMarksBreakdown)
    const [showCalculator, setShowCalculator] = useState(false)
    const [calculatorValid, setCalculatorValid] = useState(false)
    const [formCompleted, setFormCompleted] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [showContactPopup, setShowContactPopup] = useState(false)
    const { checkCreditsBeforeExecution } = useCreditsCheck()

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

    const [loading, setLoading] = useState(false)
    const [agent_id, setagent_id] = useState<string>("")
    const { setExecutionData } = useRating()
    const router = useRouter()

    const [isLoadingHistoricalData, setIsLoadingHistoricalData] = useState(false)
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)

    // Check if we're on mobile
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    // Fetch boards on initial mount
    useEffect(() => {
        fetchBoards()
    }, [])

    // Extract agent token from URL path
    useEffect(() => {
        const path = window.location.pathname
        const token = path.split("/").pop() || ""
        setagent_id(token)
    }, [])

    // Auto-show calculator when data changes (but not initially on mobile)
    useEffect(() => {
        if (topics.length > 0 || chapters.length > 0) {
            if (!isMobile || formData.board || formData.grade || formData.subject) {
                setShowCalculator(true)
            }
        }
    }, [
        topics,
        chapters,
        marksBreakdown,
        formData.total_marks,
        isMobile,
        formData.board,
        formData.grade,
        formData.subject,
    ])

    // Check if form is completed and close calculator
    useEffect(() => {
        const isCompleted =
            formData.board &&
            formData.grade &&
            formData.subject &&
            (topics.length > 0 || chapters.length > 0) &&
            calculatorValid

        if (isCompleted && !formCompleted) {
            setFormCompleted(true)
        } else if (!isCompleted && formCompleted) {
            setFormCompleted(false)
        }
    }, [formData, topics, chapters, calculatorValid, formCompleted])

    // Hide calculator when generating
    useEffect(() => {
        if (isGenerating) {
            setShowCalculator(false)
        }
    }, [isGenerating])

    const fetchBoards = async () => {
        if (isLoadingHistoricalData) return
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

    const fetchGrades = async (board: string) => {
        if (!board || isLoadingHistoricalData) return

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

                setFormData((prev) => ({
                    ...prev,
                    grade: "",
                    subject: "",
                }))
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

    const fetchSubjects = async (board: string, grade: string) => {
        if (!board || !grade || isLoadingHistoricalData) return

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

                setFormData((prev) => ({
                    ...prev,
                    subject: "",
                }))
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

    const fetchChapters = async (board: string, grade: string, subject: string) => {
        if (!board || !grade || !subject || isLoadingHistoricalData) return

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

    const handleInputChange = async (field: string, value: string | number) => {
        if (isLoadingHistoricalData) return

        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }))
        clearFieldError(field)

        if (field === "board" && typeof value === "string") {
            await fetchGrades(value)
        } else if (field === "grade" && typeof value === "string") {
            const board = formData.board
            if (board) {
                await fetchSubjects(board, value)
            }
        } else if (field === "subject" && typeof value === "string") {
            const board = formData.board
            const grade = formData.grade
            if (board && grade) {
                await fetchChapters(board, grade, value)
            }
        }
    }

    const addTopic = () => {
        setTopics((prev) => [
            ...prev,
            {
                topic_name: "",
                assigned_marks: 0,
                questions: [{ ...defaultQuestionBreakdown }],
                files: [],
                historical_files: [],
            },
        ])
    }

    const removeTopic = (index: number) => {
        setTopics((prev) => prev.filter((_, i) => i !== index))
    }

    const updateTopic = (index: number, field: keyof Topic, value: any) => {
        setTopics((prev) => prev.map((topic, i) => (i === index ? { ...topic, [field]: value } : topic)))
    }

    const updateTopicQuestion = (
        topicIndex: number,
        questionIndex: number,
        field: keyof QuestionBreakdown,
        value: number,
    ) => {
        setTopics((prev) =>
            prev.map((topic, i) =>
                i === topicIndex
                    ? {
                        ...topic,
                        questions: topic.questions.map((q, j) => (j === questionIndex ? { ...q, [field]: value } : q)),
                    }
                    : topic,
            ),
        )
    }

    const addChapter = () => {
        setChapters((prev) => [
            ...prev,
            {
                chapter_number: "",
                assigned_marks: 0,
                questions: [{ ...defaultQuestionBreakdown }],
            },
        ])
    }

    const removeChapter = (index: number) => {
        setChapters((prev) => prev.filter((_, i) => i !== index))
    }

    const updateChapter = (index: number, field: keyof Chapter, value: any) => {
        setChapters((prev) => prev.map((chapter, i) => (i === index ? { ...chapter, [field]: value } : chapter)))
    }

    const updateChapterQuestion = (
        chapterIndex: number,
        questionIndex: number,
        field: keyof QuestionBreakdown,
        value: number,
    ) => {
        setChapters((prev) =>
            prev.map((chapter, i) =>
                i === chapterIndex
                    ? {
                        ...chapter,
                        questions: chapter.questions.map((q, j) => (j === questionIndex ? { ...q, [field]: value } : q)),
                    }
                    : chapter,
            ),
        )
    }

    // Updated file upload handler for multiple files
    const handleFileUpload = (topicIndex: number, files: FileList) => {
        const topic = topics[topicIndex]

        // Check if topic name is provided
        if (!topic.topic_name || topic.topic_name.trim() === '') {
            toast({
                title: "Topic Name Required",
                description: "Please enter a topic name before uploading a file.",
                variant: "destructive",
                duration: 3000,
            })
            return
        }

        const file = files[0] // Only take the first file

        if (file.type !== "application/pdf") {
            toast({
                title: "Invalid file type",
                description: "Please upload PDF files only.",
                variant: "destructive",
                duration: 3000,
            })
            return
        }

        // Rename the file to match the topic name
        const topicName = topic.topic_name.trim()
        const renamedFile = new File([file], `${topicName}.pdf`, { type: file.type })

        setTopics((prev) =>
            prev.map((t, i) => {
                if (i === topicIndex) {
                    return {
                        ...t,
                        files: [renamedFile], // Replace with single file
                        file_name: topicName,
                    }
                }
                return t
            }),
        )

        toast({
            title: "File uploaded",
            description: `File uploaded as ${topicName}.pdf`,
            duration: 3000,
        })
    }

    // Remove individual file from topic
    const removeFileFromTopic = (topicIndex: number, fileIndex: number) => {
        setTopics((prev) =>
            prev.map((topic, i) => {
                if (i === topicIndex) {
                    const updatedFiles = topic.files?.filter((_, j) => j !== fileIndex) || []
                    // Update file_name based on remaining files
                    const file_name = updatedFiles.length > 0 ? getFileNameWithoutExtension(updatedFiles[0].name) : undefined

                    return {
                        ...topic,
                        files: updatedFiles,
                        file_name: file_name,
                    }
                }
                return topic
            }),
        )
    }

    // Remove historical file from topic
    const removeHistoricalFileFromTopic = (topicIndex: number, fileIndex: number) => {
        setTopics((prev) =>
            prev.map((topic, i) => {
                if (i === topicIndex) {
                    const updatedHistoricalFiles = topic.historical_files?.filter((_, j) => j !== fileIndex) || []

                    return {
                        ...topic,
                        historical_files: updatedHistoricalFiles,
                    }
                }
                return topic
            }),
        )
    }

    // Download historical file
    const downloadHistoricalFile = async (file: HistoricalFile, topicIndex: number) => {
        try {
            // Check if the signed URL is still valid
            const now = Math.floor(Date.now() / 1000)
            if (file.expires_at && now > file.expires_at) {
                toast({
                    title: "File Link Expired",
                    description: "This file link has expired. Please regenerate the test paper to get fresh file links.",
                    variant: "destructive",
                    duration: 5000,
                })
                return
            }

            const response = await fetch(file.signed_url)
            if (!response.ok) {
                throw new Error('Failed to download file')
            }

            const blob = await response.blob()
            const filename = file.original_name || extractFilenameFromS3Url(file.signed_url, file.file_key)

            // Create download link
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()

            // Cleanup
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast({
                title: "File Downloaded",
                description: `${filename} has been downloaded successfully.`,
                duration: 3000,
            })
        } catch (error) {
            console.error('Error downloading file:', error)
            toast({
                title: "Download Failed",
                description: "Failed to download the file. The link may have expired.",
                variant: "destructive",
                duration: 3000,
            })
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

    const validateForm = () => {
        if (!formData.board || !formData.grade || !formData.subject) {
            const missing: string[] = []
            if (!formData.board) missing.push('board')
            if (!formData.grade) missing.push('grade')
            if (!formData.subject) missing.push('subject')
            markErrorsAndScroll(missing)
            toast({
                title: "Validation Error",
                description: "Please fill in Board, Grade, and Subject.",
                variant: "destructive",
                duration: 3000,
            })
            return false
        }

        if (topics.length === 0 && chapters.length === 0) {
            toast({
                title: "Validation Error",
                description: "Please add at least one topic or chapter.",
                variant: "destructive",
                duration: 3000,
            })
            return false
        }

        if (!calculatorValid) {
            toast({
                title: "Validation Error",
                description: "Please fix the marks calculation issues before submitting.",
                variant: "destructive",
                duration: 3000,
            })
            setShowCalculator(true)
            return false
        }

        for (const topic of topics) {
            if (!topic.topic_name.trim()) {
                toast({
                    title: "Validation Error",
                    description: "All topics must have a name.",
                    variant: "destructive",
                    duration: 3000,
                })
                return false
            }
        }

        for (const chapter of chapters) {
            if (!chapter.chapter_number.trim()) {
                toast({
                    title: "Validation Error",
                    description: "All chapters must have a chapter number selected.",
                    variant: "destructive",
                    duration: 3000,
                })
                return false
            }
        }

        return true
    }

    const handleCreateNew = () => {
        // Reset form data to initial state
        setFormData({
            board: "",
            grade: "",
            subject: "",
            test_duration: 30,
            difficulty: "medium",
            total_marks: 100,
        })

        // Reset topics and chapters to empty arrays
        setTopics([])
        setChapters([])

        // Reset marks breakdown
        setMarksBreakdown(defaultMarksBreakdown)

        // Reset dropdown data except boards
        setDropdownData((prev) => ({
            ...prev,
            grades: [],
            subjects: [],
            chapters: [],
        }))

        // Clear thread ID to ensure new generation
        setCurrentThreadId(null)

        // Reset the parent component's response state
        onResponse(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) return

        const hasCredits = await checkCreditsBeforeExecution()
        if (!hasCredits) {
            setShowContactPopup(true)
            return
        }

        try {
            setLoading(true)
            setIsGenerating(true)

            // Clear parent state and signal loading
            console.log('TestPaperForm: Clearing parent response and setting loading state');
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
                setIsGenerating(false)
                return
            }

            const formDataToSend = new FormData()
            formDataToSend.append("agent_id", agent_id)
            formDataToSend.append("access_token", accessToken)

            // Add thread_id if we have one from history
            console.log("Form submission - currentThreadId:", currentThreadId)
            if (currentThreadId) {
                console.log("Adding thread_id to form data:", currentThreadId)
                formDataToSend.append("thread_id", currentThreadId)
            } else {
                console.log("No thread_id - generating new test paper")
            }

            // Prepare API parameters with file_name included directly in topics
            const apiParams = {
                board: formData.board,
                grade: formData.grade,
                subject: formData.subject,
                test_duration: formData.test_duration,
                difficulty: formData.difficulty,
                total_marks: formData.total_marks,
                topics: topics.map(({ files, historical_files, ...topic }) => {
                    // Create topic object and conditionally add file_name
                    const topicData: any = {
                        ...topic,
                        questions: topic.questions,
                    }

                    // Only add file_name if it exists
                    if (topic.file_name) {
                        topicData.file_name = topic.topic_name
                    }

                    return topicData
                }),
                chapters: chapters.map((chapter) => ({
                    ...chapter,
                    chapter_name: dropdownData.chapters.find((ch) => ch[0] === chapter.chapter_number)?.[1] || "",
                    questions: chapter.questions,
                })),
                marks_of_each_questions: marksBreakdown,
            }

            console.log("Submitting API params:", apiParams)

            const apiParamsArray = [apiParams]
            formDataToSend.append("api_params", JSON.stringify(apiParamsArray))

            // Add all files for topics with proper naming
            topics.forEach((topic, topicIndex) => {
                if (topic.files && topic.files.length > 0) {
                    topic.files.forEach((file, fileIndex) => {
                        // file.name will now be "TopicName.pdf"
                        formDataToSend.append(`topic_${topicIndex}_file_${fileIndex}`, file)
                    })
                }
            })

            try {
                const { data } = await axios.post("/api/execute-agent", formDataToSend, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                    timeout: 300000,
                })

                if (data.status) {
                    // Update thread_id if returned from API
                    if (data.thread_id) {
                        setCurrentThreadId(data.thread_id)
                    }

                    console.log("API Response data:", data.data)
                    console.log("Current thread ID:", currentThreadId)

                    // Send the response data immediately WITH form configuration
                    console.log('TestPaperForm: Sending response data to parent with form config', formData);
                    onResponse({
                        data: data.data,
                        execution_id: data.execution_id,
                        agent_id: agent_id,
                        message: data.message,
                        status: data.status,
                        formData: formData,  // Include the form configuration used
                        marksBreakdown: marksBreakdown,  // Include marks breakdown
                    })

                    toast({
                        title: "Success",
                        description: data.message || "Test paper generated successfully!",
                        duration: 3000,
                    })
                } else {
                    throw new Error(data.error || "Failed to generate test paper")
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
                description: "Failed to generate test paper. Please try again.",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setLoading(false)
            setIsGenerating(false)
        }
    }

    const clearForm = () => {
        setFormData({
            board: "",
            grade: "",
            subject: "",
            test_duration: 30,
            difficulty: "medium",
            total_marks: 100,
        })
        setTopics([])
        setChapters([])
        setMarksBreakdown(defaultMarksBreakdown)
        setDropdownData((prev) => ({
            ...prev,
            grades: [],
            subjects: [],
            chapters: [],
        }))
        setCurrentThreadId(null)
    }

    // Add useImperativeHandle to expose methods
    useImperativeHandle(ref, () => ({
        loadHistoryData: async (historyInputs: any, fileData?: HistoricalFile[]) => {
            if (!historyInputs) return

            setIsLoadingHistoricalData(true)

            try {
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

                const newFormData = {
                    board: inputsObject.board || "",
                    grade: inputsObject.grade || "",
                    subject: inputsObject.subject || "",
                    test_duration: Number(inputsObject.test_duration) || 30,
                    difficulty: inputsObject.difficulty || "medium",
                    total_marks: Number(inputsObject.total_marks) || 100,
                }
                setFormData(newFormData)

                // Fetch chapters from API if we have board/grade/subject
                // This ensures dropdown has proper chapter list before setting chapter values
                if (newFormData.board && newFormData.grade && newFormData.subject) {
                    console.log('Loading history: Fetching chapters from API for proper dropdown display');
                    await fetchChapters(newFormData.board, newFormData.grade, newFormData.subject);
                }

                let parsedTopics: Topic[] = []
                if (inputsObject.topics) {
                    try {
                        parsedTopics =
                            typeof inputsObject.topics === "string"
                                ? JSON.parse(inputsObject.topics.replace(/'/g, '"'))
                                : inputsObject.topics

                        // Process historical files for topics
                        if (fileData && Array.isArray(fileData)) {
                            parsedTopics = parsedTopics.map((topic, index) => ({
                                ...topic,
                                files: [],
                                historical_files: fileData.map(file => ({
                                    ...file,
                                    original_name: extractFilenameFromS3Url(file.signed_url, file.file_key)
                                })),
                                // Set file_name based on historical files if available
                                file_name: fileData.length > 0
                                    ? getFileNameWithoutExtension(extractFilenameFromS3Url(fileData[0].signed_url, fileData[0].file_key))
                                    : topic.file_name
                            }))
                        }

                        setTopics(parsedTopics || [])
                    } catch (error) {
                        console.error("Error parsing topics:", error)
                    }
                }

                let parsedChapters: Chapter[] = []
                if (inputsObject.chapters) {
                    try {
                        parsedChapters =
                            typeof inputsObject.chapters === "string"
                                ? JSON.parse(inputsObject.chapters.replace(/'/g, '"'))
                                : inputsObject.chapters
                        // Now set chapters - dropdown should have the proper data from fetchChapters above
                        console.log('Loading history: Setting chapters after API fetch:', parsedChapters);
                        setChapters(parsedChapters || [])
                    } catch (error) {
                        console.error("Error parsing chapters:", error)
                    }
                }

                if (inputsObject.marks_of_each_questions) {
                    try {
                        const parsedMarks =
                            typeof inputsObject.marks_of_each_questions === "string"
                                ? JSON.parse(inputsObject.marks_of_each_questions.replace(/'/g, '"'))
                                : inputsObject.marks_of_each_questions
                        setMarksBreakdown(parsedMarks || defaultMarksBreakdown)
                    } catch (error) {
                        console.error("Error parsing marks breakdown:", error)
                    }
                }

                setDropdownData((prev) => ({
                    ...prev,
                    boards: inputsObject.board ? [inputsObject.board] : prev.boards,
                    grades: inputsObject.grade ? [inputsObject.grade] : prev.grades,
                    subjects: inputsObject.subject ? [inputsObject.subject] : prev.subjects,
                    // Don't override chapters here - fetchChapters above already set it from API
                }))

                setTimeout(() => {
                    setShowCalculator(true)
                }, 500)
            } finally {
                setTimeout(() => {
                    setIsLoadingHistoricalData(false)
                }, 1000)
            }
        },

        clearForm,
        forceUpdate: () => {
            setFormData((prev) => ({ ...prev }))
        },
        formData,
        marksBreakdown,

        createNew: () => {
            // Reset form data to initial state
            setFormData({
                board: "",
                grade: "",
                subject: "",
                test_duration: 30,
                difficulty: "medium",
                total_marks: 100,
            })

            // Reset topics and chapters to empty arrays
            setTopics([])
            setChapters([])

            // Reset marks breakdown
            setMarksBreakdown(defaultMarksBreakdown)

            // Reset dropdown data except boards
            setDropdownData((prev) => ({
                ...prev,
                grades: [],
                subjects: [],
                chapters: [],
            }))

            // Clear thread ID to ensure new generation
            setCurrentThreadId(null)

            // Reset the parent component's response state
            onResponse(null)
        },
    }))

    const renderQuestionInputs = (
        questions: QuestionBreakdown,
        onUpdate: (field: keyof QuestionBreakdown, value: number) => void,
    ) => {
        const questionTypes = [
            { key: "mcqs", label: "MCQs" },
            { key: "very_short_answers", label: "Very Short Answers" },
            { key: "short_answers", label: "Short Answers" },
            { key: "long_answers", label: "Long Answers" },
            { key: "very_long_answers", label: "Very Long Answers" },
            { key: "case_studies", label: "Case Studies" },
            { key: "truth_False_questions", label: "True/False Questions" },
            { key: "fill_in_the_blanks", label: "Fill in the Blanks" },
        ]

        return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {questionTypes.map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700">{label}</Label>
                        <Input
                            value={questions[key as keyof QuestionBreakdown] || ""}
                            onChange={(e) => onUpdate(key as keyof QuestionBreakdown, Number(e.target.value) || 0)}
                            onFocus={(e) => {
                                if (e.target.value === "0") {
                                    e.target.value = ""
                                }
                            }}
                            className="h-8 text-xs"
                            placeholder="0"
                        />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="bg-white">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-3 h-3 sm:w-5 sm:h-5 text-indigo-600" />
                        </div>
                        <div>
                            <div className="max-w-4xl">
                                <h2 className="text-base sm:text-base font-bold text-gray-900">Test Paper Generator</h2>
                                <div className="text-xs sm:text-xs text-gray-600 leading-relaxed">
                                    <p className="transition-all duration-200">
                                        {Detailed_description || "Create comprehensive test papers with AI assistance"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-3 sm:p-5">
                {/* Basic Configuration */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Basic Configuration</h3>
                                <p className="text-xs text-gray-500">Set up the fundamental test parameters</p>
                            </div>
                        </div>
                        {!isGenerating && (
                            <Button
                                type="button"
                                onClick={() => setShowCalculator(!showCalculator)}
                                className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 h-7 px-2 text-xs"
                            >
                                <Calculator className="w-3 h-3 mr-1" />
                                {showCalculator ? "Hide" : "Show"} Calculator
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Board */}
                        <div className="space-y-2 scroll-mt-header" data-field="board">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <School className="w-3 h-3 text-indigo-600" />
                                Board <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.board}
                                onValueChange={(value) => handleInputChange("board", value)}
                                disabled={loadingStates.boards || isLoadingHistoricalData}
                            >
                                <SelectTrigger className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-500">
                                    <SelectValue placeholder={loadingStates.boards ? "" : "Select board"} />
                                    {(loadingStates.boards || isLoadingHistoricalData) && (
                                        <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {dropdownData.boards.map((board) => (
                                        <SelectItem key={board} value={board}>
                                            {board.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Grade */}
                        <div className="space-y-2 scroll-mt-header" data-field="grade">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <GraduationCap className="w-3 h-3 text-indigo-600" />
                                Grade <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.grade}
                                onValueChange={(value) => handleInputChange("grade", value)}
                                disabled={loadingStates.grades || !formData.board || isLoadingHistoricalData}
                            >
                                <SelectTrigger className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-500">
                                    <SelectValue
                                        placeholder={
                                            !formData.board ? "Select board first" : loadingStates.grades ? "" : "Select grade"
                                        }
                                    />
                                    {(loadingStates.grades || isLoadingHistoricalData) && (
                                        <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {dropdownData.grades.map((grade) => (
                                        <SelectItem key={grade} value={grade}>
                                            Grade {grade}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2 scroll-mt-header" data-field="subject">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <BookMarked className="w-3 h-3 text-indigo-600" />
                                Subject <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.subject}
                                onValueChange={(value) => handleInputChange("subject", value)}
                                disabled={loadingStates.subjects || !formData.grade || isLoadingHistoricalData}
                            >
                                <SelectTrigger className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-500">
                                    <SelectValue
                                        placeholder={
                                            !formData.grade ? "Select grade first" : loadingStates.subjects ? "" : "Select subject"
                                        }
                                    />
                                    {(loadingStates.subjects || isLoadingHistoricalData) && (
                                        <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    {dropdownData.subjects.map((subject) => (
                                        <SelectItem key={subject} value={subject}>
                                            {subject.charAt(0).toUpperCase() + subject.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Test Duration */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Clock className="w-3 h-3 text-indigo-600" />
                                Duration (minutes) <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.test_duration.toString()}
                                onValueChange={(value) => handleInputChange("test_duration", Number(value))}
                            >
                                <SelectTrigger className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DURATION_OPTIONS.map((duration) => (
                                        <SelectItem key={duration} value={duration}>
                                            {duration} minutes
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Difficulty */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Target className="w-3 h-3 text-indigo-600" />
                                Difficulty <span className="text-red-500">*</span>
                            </Label>
                            <Select value={formData.difficulty} onValueChange={(value) => handleInputChange("difficulty", value)}>
                                <SelectTrigger className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DIFFICULTY_OPTIONS.map((difficulty) => (
                                        <SelectItem key={difficulty} value={difficulty}>
                                            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Total Marks */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                                <Target className="w-3 h-3 text-indigo-600" />
                                Total Marks <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={formData.total_marks || ""}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    handleInputChange("total_marks", value === "" ? "" : Number(value));
                                }} onFocus={(e) => {
                                    if (e.target.value === "0") {
                                        e.target.value = ""
                                    }
                                }}
                                className="h-10 text-xs border-2 border-gray-200 focus:border-indigo-500"
                                placeholder="Enter total marks"
                            />
                        </div>
                    </div>
                </div>

                {/* Content Selection - Combined View */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <BookMarked className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Content Selection</h3>
                            <p className="text-xs text-gray-500">Add chapters and topics for your test paper</p>
                        </div>
                    </div>

                    {/* Direct Add Buttons */}
                    <div className="flex gap-2 mb-4">
                        <Button
                            type="button"
                            onClick={addChapter}
                            className="h-8 px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Chapter
                        </Button>
                        <Button
                            type="button"
                            onClick={addTopic}
                            className="h-8 px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Topic
                        </Button>
                    </div>

                    {/* Chapters Section */}
                    {chapters.length > 0 && (
                        <div className="space-y-4 mb-6">
                            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <BookMarked className="w-4 h-4 text-indigo-600" />
                                Chapters ({chapters.length})
                            </h4>
                            {chapters.map((chapter, index) => (
                                <Card key={index} className="border-indigo-200">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-sm">Chapter {index + 1}</CardTitle>
                                            <Button
                                                type="button"
                                                onClick={() => removeChapter(index)}
                                                variant="outline"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium">Chapter *</Label>
                                                <Select
                                                    value={chapter.chapter_number}
                                                    onValueChange={(value) => updateChapter(index, "chapter_number", value)}
                                                    disabled={loadingStates.chapters || !formData.subject}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue
                                                            placeholder={
                                                                !formData.subject
                                                                    ? "Select subject first"
                                                                    : loadingStates.chapters
                                                                        ? ""
                                                                        : "Select chapter"
                                                            }
                                                        />
                                                        {loadingStates.chapters && <Loader2 className="h-3 w-3 animate-spin" />}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {dropdownData.chapters.map((chapterData) => (
                                                            <SelectItem key={chapterData[0]} value={chapterData[0]}>
                                                                {chapterData[0]}. {chapterData[1]}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium">Assigned Marks</Label>
                                                <Input
                                                    value={chapter.assigned_marks || ""}
                                                    onChange={(e) => updateChapter(index, "assigned_marks", Number(e.target.value) || 0)}
                                                    onFocus={(e) => {
                                                        if (e.target.value === "0") {
                                                            e.target.value = ""
                                                        }
                                                    }}
                                                    className="h-8 text-xs"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium">Question Distribution</Label>
                                            {renderQuestionInputs(chapter.questions[0], (field, value) =>
                                                updateChapterQuestion(index, 0, field, value),
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Topics Section */}
                    {topics.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-600" />
                                Topics ({topics.length})
                            </h4>
                            {topics.map((topic, index) => (
                                <Card key={index} className="border-purple-200">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-sm">
                                                Topic {index + 1}
                                                {/* {topic.file_name && (
                                                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                                        File: {topic.file_name}
                                                    </span>
                                                )} */}
                                            </CardTitle>
                                            <Button
                                                type="button"
                                                onClick={() => removeTopic(index)}
                                                variant="outline"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium">Topic Name *</Label>
                                                <Input
                                                    value={topic.topic_name}
                                                    onChange={(e) => {
                                                        const newName = e.target.value
                                                        // Warn if changing name and file exists
                                                        if (topic.files && topic.files.length > 0 && newName !== topic.topic_name) {
                                                            // Optionally show a warning
                                                            toast({
                                                                title: "Note",
                                                                description: "Changing the topic name will rename your uploaded file.",
                                                                duration: 2000,
                                                            })
                                                        }

                                                        updateTopic(index, "topic_name", newName)

                                                        // If file exists, rename it
                                                        if (topic.files && topic.files.length > 0 && newName.trim()) {
                                                            const renamedFile = new File(
                                                                [topic.files[0]],
                                                                `${newName.trim()}.pdf`,
                                                                { type: topic.files[0].type }
                                                            )
                                                            updateTopic(index, "files", [renamedFile])
                                                            updateTopic(index, "file_name", newName.trim())
                                                        }
                                                    }}
                                                    placeholder="Enter topic name"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium">Assigned Marks</Label>
                                                <Input
                                                    value={topic.assigned_marks || ""}
                                                    onChange={(e) => updateTopic(index, "assigned_marks", Number(e.target.value) || 0)}
                                                    onFocus={(e) => {
                                                        if (e.target.value === "0") {
                                                            e.target.value = ""
                                                        }
                                                    }}
                                                    className="h-8 text-xs"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        {/* Multiple File Upload Section */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium">Reference Files (Optional)</Label>
                                            <div className="space-y-2">
                                                <div className="relative">
                                                    <Input
                                                        type="file"
                                                        accept=".pdf"
                                                        onChange={(e) => {
                                                            const files = e.target.files
                                                            if (files && files.length > 0) {
                                                                handleFileUpload(index, files)
                                                            }
                                                        }}
                                                        className="h-8 text-xs"
                                                    />
                                                    <Upload className="absolute right-2 top-2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                </div>

                                                {/* Display historical files */}
                                                {topic.historical_files && topic.historical_files.length > 0 && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-blue-600">Previous Files ({topic.historical_files.length})</Label>
                                                        <div className="space-y-1 max-h-20 overflow-y-auto">
                                                            {topic.historical_files.map((file, fileIndex) => (
                                                                <div
                                                                    key={fileIndex}
                                                                    className="flex items-center justify-between bg-blue-50 p-2 rounded text-xs border border-blue-200"
                                                                >
                                                                    <span className="truncate flex-1 mr-2 text-blue-800">
                                                                        {file.original_name || `Historical File ${fileIndex + 1}`}
                                                                    </span>
                                                                    <div className="flex gap-1">
                                                                        {/* <Button
                                                                            type="button"
                                                                            onClick={() => downloadHistoricalFile(file, index)}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                                                                            title="Download file"
                                                                        >
                                                                            <Download className="w-3 h-3" />
                                                                        </Button> */}
                                                                        <Button
                                                                            type="button"
                                                                            onClick={() => window.open(file.signed_url, '_blank')}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                                                                            title="View file"
                                                                        >
                                                                            <Download className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            onClick={() => removeHistoricalFileFromTopic(index, fileIndex)}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                                                                            title="Remove file"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Display uploaded files */}
                                                {topic.files && topic.files.length > 0 && (
                                                    <div className="space-y-1">
                                                        {/* <Label className="text-xs text-gray-600">Uploaded File</Label>
                                                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs border border-gray-200">
                                                            <span className="truncate flex-1 mr-2">{topic.files[0].name}</span>
                                                            <Button
                                                                type="button"
                                                                onClick={() => removeFileFromTopic(index, 0)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-4 w-4 p-0 text-red-500 hover:bg-red-50"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </Button>
                                                        </div> */}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium">Question Distribution</Label>
                                            {renderQuestionInputs(topic.questions[0], (field, value) =>
                                                updateTopicQuestion(index, 0, field, value),
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {chapters.length === 0 && topics.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <div className="flex justify-center gap-4 mb-4">
                                <BookMarked className="w-12 h-12 opacity-50" />
                                <FileText className="w-12 h-12 opacity-50" />
                            </div>
                            <p className="text-sm">
                                No chapters or topics added yet. Click "Add Chapter" or "Add Topic" to get started.
                            </p>
                        </div>
                    )}
                </div>

                {/* Marks Configuration */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Target className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Marks Configuration</h3>
                            <p className="text-xs text-gray-500">Set marks for each question type</p>
                        </div>
                    </div>

                    <Card className="border-indigo-200">
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {Object.entries(marksBreakdown).map(([key, value]) => (
                                    <div key={key} className="space-y-2">
                                        <Label className="text-xs font-medium">
                                            {key.replace(/marks_of_each_|_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                        </Label>
                                        <Input
                                            value={value || ""}
                                            onChange={(e) =>
                                                setMarksBreakdown((prev) => ({
                                                    ...prev,
                                                    [key]: Number(e.target.value) || 0,
                                                }))
                                            }
                                            onFocus={(e) => {
                                                if (e.target.value === "0") {
                                                    e.target.value = ""
                                                }
                                            }}
                                            className="h-8 text-xs"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t-2 border-gray-100">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={clearForm}
                        className="w-full sm:w-auto text-gray-600 border-2 border-gray-200 hover:bg-gray-50 bg-transparent"
                    >
                        Clear All Fields
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading || !calculatorValid}
                        className={`w-full sm:w-auto ${!calculatorValid
                            ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800"
                            } text-white`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 mr-2" />
                                Generate Test Paper
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* Marks Calculator Modal */}
            {showCalculator && !isGenerating && (topics.length > 0 || chapters.length > 0 || formData.total_marks > 0) && (
                <MarksCalculator
                    topics={topics}
                    chapters={chapters}
                    marksBreakdown={marksBreakdown}
                    totalMarks={formData.total_marks}
                    onClose={() => setShowCalculator(false)}
                    onValidationChange={setCalculatorValid}
                />
            )}
            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
        </div>
    )
})

TestPaperForm.displayName = "TestPaperForm"

export default TestPaperForm
