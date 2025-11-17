"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { cloneDeep } from "lodash"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import RatingFeedback from "@/components/Content/RatingFeedback"
import HistoricalRatingFeedback from "@/components/Content/HistoricalRatingFeedback"
import { FileText, Edit3, Save, X, Download } from "lucide-react"
import Cookies from "js-cookie"
import { generateTestPaperPDF } from "@/utils/TestPaperPDFGenerator"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import ContactPopup from "@/components/ContactPopup"
import { useCreditsCheck } from "@/hooks/use-credits-checks"
import ResponseLoader from "./ResponseLoader"
import ShareButton from "../ShareButton"
import MathRenderer from "./MathRenderer"
import LatexInput from "./LatexInput"
import MathLiveInput from "./MathLiveInput"
import PopupLoader from "@/components/PopupLoader"

interface TestPaperResponseProps {
    response: {
        loading?: boolean;
        error?: string;
        data?: any;
    };
    onSave?: (data: any) => void;
    agent_id?: string;
    executionToken?: string;
    formRef?: React.RefObject<any>;
    historicalRating?: number | null;
    historicalFeedback?: string | null;
    isHistoricalView?: boolean;
    isGenerating?: boolean;
    currentFormData?: any;  // Add explicit form data prop
    currentMarksBreakdown?: any;  // Add explicit marks breakdown prop
}

const TestPaperResponse: React.FC<TestPaperResponseProps> = ({
    response,
    onSave,
    agent_id,
    executionToken,
    formRef,
    historicalRating = null,
    historicalFeedback = null,
    isHistoricalView = false,
    isGenerating = false,
    currentFormData,
    currentMarksBreakdown,
}) => {
    console.log('TestPaperResponse render', { response, isGenerating, executionToken });
    
    // FORCE reset all state on every render with new executionToken
    const [editableData, setEditableData] = useState<any>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [rating, setRating] = useState<number>(0)
    const [feedback, setFeedback] = useState<string>("")
    const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false)
    const [gradeLevel, setGradeLevel] = useState<number>(0)
    const [formData, setFormData] = useState<any>({})
    const [marksBreakdown, setMarksBreakdown] = useState<any>({})
    const [showPdfDetailsModal, setShowPdfDetailsModal] = useState(false)
    const [schoolName, setSchoolName] = useState("")
    const [examinationName, setExaminationName] = useState("")
    const [schoolLogoFile, setSchoolLogoFile] = useState<File | null>(null) // New state for logo file
    const [schoolLogoPreview, setSchoolLogoPreview] = useState<string | null>(null) // New state for logo preview
    const accessToken = Cookies.get("access_token") // Declare accessToken here
    const [showContactPopup, setShowContactPopup] = useState(false)
    const { checkCreditsBeforeExecution } = useCreditsCheck()

    // Initialize data when response changes
    useEffect(() => {
        console.log('TestPaperResponse: Initializing data', response?.data);
        
        if (response?.data) {
            let dataToSet = response?.data?.data || response?.data

            if (Array.isArray(dataToSet) && dataToSet.length === 1 && typeof dataToSet[0] === "object") {
                dataToSet = dataToSet[0]
            }

            // Always update when executionToken changes (new generation)
            // This ensures old test paper doesn't persist when regenerating
            console.log('TestPaperResponse: Setting new editableData');
            setEditableData(dataToSet);
            setHasUnsavedEdits(false);
        } else {
            // Clear data when response is null/undefined
            console.log('TestPaperResponse: Clearing editableData');
            setEditableData(null);
            setHasUnsavedEdits(false);
        }
    }, [executionToken, response?.data]);

    useEffect(() => {
        // Cleanup function when component unmounts
        return () => {
            console.log('TestPaperResponse: Cleanup on unmount');
            setEditableData(null);
            setIsEditing(false);
            setHasUnsavedEdits(false);
        };
    }, []);

    // Extract grade level, form data, and marks breakdown
    // Prioritize explicit props over formRef for reliability
    useEffect(() => {
        console.log('TestPaperResponse: Updating form data', { currentFormData, currentMarksBreakdown });
        
        // Use explicit props if provided, otherwise fall back to formRef
        const formDataToUse = currentFormData || formRef?.current?.formData || {}
        const marksBreakdownToUse = currentMarksBreakdown || formRef?.current?.marksBreakdown || {}
        
        const grade = Number.parseInt(formDataToUse.grade) || 0
        console.log('TestPaperResponse: Setting form data:', formDataToUse);
        
        setGradeLevel(grade)
        setFormData(formDataToUse)
        setMarksBreakdown(marksBreakdownToUse)
    }, [currentFormData, currentMarksBreakdown, formRef, executionToken, response?.data])

    // Auto-scroll to response when data loads
    useEffect(() => {
        if (response?.data && !isGenerating) {
            setTimeout(() => {
                const responseElement = document.getElementById("test-paper-response")
                if (responseElement) {
                    responseElement.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    })
                }
            }, 100)
        }
    }, [response?.data, isGenerating])

    // Initialize historical data if provided
    useEffect(() => {
        if (historicalRating !== null) {
            setRating(historicalRating)
        }

        if (historicalFeedback !== null) {
            setFeedback(historicalFeedback)
        }
    }, [historicalRating, historicalFeedback])

    const handleDownloadPDF = () => {
        setShowPdfDetailsModal(true)
    }

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setSchoolLogoFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setSchoolLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        } else {
            setSchoolLogoFile(null)
            setSchoolLogoPreview(null)
        }
    }

    const handleConfirmDownloadPDF = async () => {
        setIsGeneratingPDF(true)
        setShowPdfDetailsModal(false) // Close the modal
        try {
            const dataToExport = editableData || response?.data?.data || response?.data

            // Extract test paper details for PDF from form data
            const subject = formData.subject || "Test Paper"
            const grade = formData.grade || ""
            const totalMarks = formData.total_marks || ""
            const duration = formData.test_duration || ""

            const filename = `test-paper-${new Date().toISOString().split("T")[0]}.pdf`

            // Pass marksBreakdown, schoolName, examinationName, and schoolLogoFile to PDF generator
            const result = await generateTestPaperPDF(
                dataToExport,
                filename,
                subject,
                grade,
                totalMarks,
                duration,
                marksBreakdown,
                schoolName,
                examinationName,
                schoolLogoFile, // New parameter
            )

            if (result.success) {
                toast({
                    title: "Success",
                    description: "Test paper PDF downloaded successfully!",
                    duration: 3000,
                })
            } else {
                throw new Error(result.message)
            }
        } catch (error) {
            console.error("Error generating PDF:", error)
            toast({
                title: "Error",
                description: "Failed to generate PDF. Please try again.",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    // Enhanced option parsing to handle different formats
    const parseOptions = (questionText: string) => {
        const optionsMatch = questionText.match(/Options?:\s*([\s\S]*)/) // Capture everything after "Options:" or "Option:"
        if (!optionsMatch) return null

        const optionsText = optionsMatch[1]
        const options: { [key: string]: string } = {}

        // Split by newlines first, then handle inline options
        const lines = optionsText.split("\n").filter((line) => line.trim() !== "") // Filter out empty lines

        if (lines.length > 0) {
            lines.forEach((line) => {
                // Handle both A) and A. formats
                const match = line.trim().match(/^([A-D])[).]\s*(.+)/)
                if (match) {
                    const [, letter, text] = match
                    options[letter.toLowerCase()] = text.trim()
                }
            })
        } else {
            // Fallback for purely inline options without newlines - handle both formats
            const optionMatches = optionsText.match(/([A-D])[).]\s*([^A-D]+?)(?=\s*[A-D][).]|$)/g)
            if (optionMatches) {
                optionMatches.forEach((match) => {
                    const [, letter, text] = match.match(/([A-D])[).]\s*(.+)/) || []
                    if (letter && text) {
                        options[letter.toLowerCase()] = text.trim()
                    }
                })
            }
        }

        return Object.keys(options).length > 0 ? options : null
    }

    // Get marks for a specific question type
    const getMarksForQuestionType = (sectionKey: string): number => {
        const marksMap: { [key: string]: string } = {
            MCQs: "marks_of_each_mcqs",
            True_False_Questions: "marks_of_each_truth_False_questions",
            Fill_in_the_Blanks: "marks_of_each_fill_in_the_blanks",
            Very_Short_Answers: "marks_of_each_very_short_answers",
            Short_Answers: "marks_of_each_short_answer",
            Long_Answers: "marks_of_each_short_answer",
            Very_Long_Answers: "marks_of_each_very_long_answer",
            Case_Studies: "marks_of_each_case_studies",
        }

        const marksKey = marksMap[sectionKey]
        return marksKey ? marksBreakdown[marksKey] || 1 : 1
    }

    const updateSection = (sectionKey: string, newValue: any) => {
        setEditableData((prevData: any) => ({
            ...prevData,
            [sectionKey]: newValue,
        }))
        setHasUnsavedEdits(true)
    }

    const updateQuestion = (sectionKey: string, questionIndex: number, newQuestion: any) => {
        setEditableData((prevData: any) => {
            const newData = { ...prevData }
            if (!newData[sectionKey]) newData[sectionKey] = []
            const newSection = [...newData[sectionKey]]
            newSection[questionIndex] = newQuestion
            newData[sectionKey] = newSection
            return newData
        })
        setHasUnsavedEdits(true)
    }

    const addQuestion = (sectionKey: string) => {
        setEditableData((prevData: any) => {
            const newData = { ...prevData }
            if (!newData[sectionKey]) newData[sectionKey] = []
            const newSection = [...newData[sectionKey]]

            // Create a new question based on section type
            let newQuestion: any = {}
            const questionNumber = newSection.length + 1

            if (sectionKey === "MCQs") {
                newQuestion = {
                    [`Q${questionNumber}`]: "New multiple choice question",
                    options: {
                        a: "Option A",
                        b: "Option B",
                        c: "Option C",
                        d: "Option D",
                    },
                }
            } else {
                newQuestion = {
                    [`Q${questionNumber}`]: "New question",
                }
            }

            newSection.push(newQuestion)
            newData[sectionKey] = newSection
            return newData
        })
        setHasUnsavedEdits(true)
    }

    const removeQuestion = (sectionKey: string, questionIndex: number) => {
        setEditableData((prevData: any) => {
            const newData = { ...prevData }
            if (!newData[sectionKey]) return newData
            const newSection = [...newData[sectionKey]]
            newSection.splice(questionIndex, 1)

            // Renumber questions
            newSection.forEach((question, index) => {
                const oldKey = Object.keys(question)[0]
                const questionText = question[oldKey]
                const newKey = `Q${index + 1}`

                if (oldKey !== newKey) {
                    delete question[oldKey]
                    question[newKey] = questionText
                }
            })

            newData[sectionKey] = newSection
            return newData
        })
        setHasUnsavedEdits(true)
    }

    const renderEditableTestPaper = (data: any) => {
        if (!data) return null

        const showWritingLines = gradeLevel <= 4

        const renderEditableSection = (sectionKey: string, sectionTitle: string, questions: any[]) => {
            if (!questions || questions.length === 0) return null

            const marksPerQuestion = getMarksForQuestionType(sectionKey)

            return (
                <div className="mb-8 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold underline">{sectionTitle}</h3>
                        {isEditing && <div className="flex gap-2">{/* Add question functionality can be enabled if needed */}</div>}
                    </div>

                    <div className="space-y-4">
                        {questions.map((question: any, index: number) => {
                            const questionObj = Array.isArray(question) ? question[0] : question
                            const questionKey = Object.keys(questionObj)[0]
                            const questionText = questionObj[questionKey]
                            // Get options from the question object first, then fallback to parsing
                            const options = questionObj.options || parseOptions(questionText)
                            
                            // Ensure we have all possible options (A, B, C, D) even if some are empty
                            const ensureAllOptions = (opts: any) => {
                                if (!opts) return null
                                const allOptions: { [key: string]: string } = { a: '', b: '', c: '', d: '' }
                                Object.keys(opts).forEach(key => {
                                    if (['a', 'b', 'c', 'd'].includes(key.toLowerCase())) {
                                        allOptions[key.toLowerCase()] = opts[key] || ''
                                    }
                                })
                                return allOptions
                            }
                            
                            const safeOptions = ensureAllOptions(options)

                            // Clean question text by removing options part
                            const cleanQuestionText = questionText.split(/Options?:/)[0].trim()

                            return (
                                <div key={index} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">{questionKey}.</span>
                                                        <MathLiveInput
                                                            value={cleanQuestionText}
                                                            onChange={(newValue) => {
                                                                const newQuestion = { ...questionObj }
                                                                // Preserve options if they exist
                                                                const currentOptions = newQuestion.options || safeOptions
                                                                newQuestion[questionKey] = newValue
                                                                if (currentOptions) {
                                                                    newQuestion.options = currentOptions
                                                                }
                                                                updateQuestion(sectionKey, index, newQuestion)
                                                            }}
                                                            className="flex-1 text-sm"
                                                            placeholder="Enter question text with LaTeX support"
                                                        />
                                                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                            ({marksPerQuestion} mark{marksPerQuestion !== 1 ? "s" : ""})
                                                        </span>
                                                    </div>

                                                    {/* MCQ Options Editing */}
                                                    {safeOptions && (
                                                        <div className="ml-6 space-y-2">
                                                            <label className="text-xs font-medium text-gray-600">Options:</label>
                                                            {Object.entries(safeOptions).map(([optionKey, optionValue]) => (
                                                                <div key={optionKey} className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium w-6">{optionKey.toUpperCase()})</span>
                                                                    <MathLiveInput
                                                                        value={String(optionValue)}
                                                                        onChange={(newValue) => {
                                                                            const newQuestion = { ...questionObj }
                                                                            // Ensure options object exists and preserve all existing options
                                                                            const currentOptions = newQuestion.options || safeOptions || {}
                                                                            newQuestion.options = {
                                                                                ...currentOptions,
                                                                                [optionKey]: newValue,
                                                                            }
                                                                            updateQuestion(sectionKey, index, newQuestion)
                                                                        }}
                                                                        className="flex-1 text-sm"
                                                                        placeholder={`Option ${optionKey.toUpperCase()} with LaTeX support`}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="font-medium flex-1">
                                                            {questionKey}. <MathRenderer content={cleanQuestionText} className="inline" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded ml-4 flex-shrink-0">
                                                            ({marksPerQuestion} mark{marksPerQuestion !== 1 ? "s" : ""})
                                                        </span>
                                                    </div>
                                                    {safeOptions && (
                                                        <div className="ml-6 space-y-4">
                                                            {Object.entries(safeOptions).map(([optionKey, optionValue]) => (
                                                                <div key={optionKey} className="leading-relaxed mb-2 flex items-start gap-2">
                                                                    <span className="mr-2 font-medium flex-shrink-0">{optionKey.toUpperCase()})</span>
                                                                    <span className="flex-1 min-w-0">
                                                                        <MathRenderer content={String(optionValue)} className="inline" />
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {showWritingLines && !safeOptions && (
                                                        <div className="mt-2 ml-6">
                                                            {sectionKey === "Very_Short_Answers" && (
                                                                <div className="border-b border-gray-400 h-8"></div>
                                                            )}
                                                            {sectionKey === "Short_Answers" && (
                                                                <div className="space-y-2">
                                                                    <div className="border-b border-gray-400 h-6"></div>
                                                                    <div className="border-b border-gray-400 h-6"></div>
                                                                    <div className="border-b border-gray-400 h-6"></div>
                                                                </div>
                                                            )}
                                                            {(sectionKey === "Long_Answers" || sectionKey === "Case_Studies") && (
                                                                <div className="space-y-2">
                                                                    {[...Array(6)].map((_, i) => (
                                                                        <div key={i} className="border-b border-gray-400 h-6"></div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {sectionKey === "Very_Long_Answers" && (
                                                                <div className="space-y-2">
                                                                    {[...Array(10)].map((_, i) => (
                                                                        <div key={i} className="border-b border-gray-400 h-6"></div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {(sectionKey === "MCQs" ||
                                                                sectionKey === "True_False_Questions" ||
                                                                sectionKey === "Fill_in_the_Blanks") && <div>Answer: ___________</div>}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        return (
            <div className="bg-white p-6 sm:p-8 font-mono text-sm leading-relaxed">
                {/* Test Paper Header - Auto-filled */}
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-xl font-bold mb-2">TEST PAPER</h1>
                    <div className="text-base">
                        <div>
                            Subject:{" "}
                            {formData.subject
                                ? formData.subject.charAt(0).toUpperCase() + formData.subject.slice(1)
                                : "_________________"}{" "}
                            Class: {formData.grade || "_______"} Time: {formData.test_duration || "_______"} minutes
                        </div>
                        <div className="mt-2">Maximum Marks: {formData.total_marks || "_______"} Date: _____________</div>
                    </div>
                </div>

                {/* General Instructions */}
                {data.General_Instructions && (
                    <div className="mb-8">
                        <h2 className="text-base font-bold mb-3 underline">GENERAL INSTRUCTIONS:</h2>
                        <div className="whitespace-pre-line text-sm leading-relaxed">
                            <MathRenderer content={data.General_Instructions.trim()} />
                        </div>
                    </div>
                )}

                {/* Question Sections */}
                <div className="space-y-6">
                    {data.MCQs && renderEditableSection("MCQs", "SECTION A: MULTIPLE CHOICE QUESTIONS", data.MCQs)}
                    {data.True_False_Questions &&
                        renderEditableSection("True_False_Questions", "SECTION B: TRUE/FALSE QUESTIONS", data.True_False_Questions)}
                    {data.Fill_in_the_Blanks &&
                        renderEditableSection("Fill_in_the_Blanks", "SECTION C: FILL IN THE BLANKS", data.Fill_in_the_Blanks)}
                    {data.Very_Short_Answers &&
                        renderEditableSection(
                            "Very_Short_Answers",
                            "SECTION D: VERY SHORT ANSWER QUESTIONS",
                            data.Very_Short_Answers,
                        )}
                    {data.Short_Answers &&
                        renderEditableSection("Short_Answers", "SECTION E: SHORT ANSWER QUESTIONS", data.Short_Answers)}
                    {data.Long_Answers &&
                        renderEditableSection("Long_Answers", "SECTION F: LONG ANSWER QUESTIONS", data.Long_Answers)}
                    {data.Very_Long_Answers &&
                        renderEditableSection("Very_Long_Answers", "SECTION G: VERY LONG ANSWER QUESTIONS", data.Very_Long_Answers)}
                    {data.Case_Studies &&
                        renderEditableSection("Case_Studies", "SECTION H: CASE STUDY QUESTIONS", data.Case_Studies)}
                </div>

                {/* Answer Key (if editing and available) */}
                {isEditing && data.Answers && (
                    <div className="mt-12 pt-8 border-t-2 border-gray-800">
                        <h3 className="text-base font-bold mb-6 underline">ANSWER KEY (For Reference Only)</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {Object.entries(data.Answers).map(([key, value]) => (
                                <div key={key} className="p-4 bg-gray-100 rounded-lg border border-gray-200 flex flex-col gap-2 min-h-[80px]">
                                    <span className="font-semibold text-gray-700 flex-shrink-0">{key}:</span>
                                    <div className="flex-1 min-w-0">
                                        <MathLiveInput
                                            value={String(value)}
                                            onChange={(newValue) => {
                                                const newAnswers = { ...data.Answers }
                                                newAnswers[key] = newValue
                                                updateSection("Answers", newAnswers)
                                            }}
                                            className="w-full text-sm"
                                            placeholder="Enter answer with LaTeX support"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const renderTestPaperContent = (data: any) => {
        if (!data) return null

        const showWritingLines = gradeLevel <= 4

        const renderSection = (sectionKey: string, sectionTitle: string, questions: any[]) => {
            if (!questions || questions.length === 0) return null

            const marksPerQuestion = getMarksForQuestionType(sectionKey)

            return (
                <div>
                    <h3 className="text-base font-bold mb-4 underline">{sectionTitle}</h3>
                    <div className="space-y-6">
                        {questions.map((question: any, index: number) => {
                            const questionObj = Array.isArray(question) ? question[0] : question
                            const questionKey = Object.keys(questionObj)[0]
                            const questionText = questionObj[questionKey]

                            // Parse options from question text or use existing options
                            const options = questionObj.options || parseOptions(questionText)

                            // Clean question text by removing options part
                            const cleanQuestionText = questionText.split(/Options?:/)[0].trim()

                            return (
                                <div key={index} className="mb-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="font-medium flex-1">
                                            {questionKey}. <MathRenderer content={cleanQuestionText} className="inline" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded ml-4 flex-shrink-0">
                                            ({marksPerQuestion} mark{marksPerQuestion !== 1 ? "s" : ""})
                                        </span>
                                    </div>
                                    {options && (
                                        <div className="ml-6 space-y-4">
                                            {Object.entries(options).map(([optionKey, optionValue]) => (
                                                <div key={optionKey} className="leading-relaxed mb-2 flex items-start gap-2">
                                                    <span className="mr-2 font-medium flex-shrink-0">{optionKey.toUpperCase()})</span>
                                                    <span className="flex-1 min-w-0">
                                                        <MathRenderer content={String(optionValue)} className="inline" />
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {showWritingLines && !options && (
                                        <div className="mt-3 ml-6">
                                            {sectionKey === "Very_Short_Answers" && <div className="border-b border-gray-400 h-8"></div>}
                                            {sectionKey === "Short_Answers" && (
                                                <div className="space-y-2">
                                                    <div className="border-b border-gray-400 h-6"></div>
                                                    <div className="border-b border-gray-400 h-6"></div>
                                                    <div className="border-b border-gray-400 h-6"></div>
                                                </div>
                                            )}
                                            {(sectionKey === "Long_Answers" || sectionKey === "Case_Studies") && (
                                                <div className="space-y-2">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div key={i} className="border-b border-gray-400 h-6"></div>
                                                    ))}
                                                </div>
                                            )}
                                            {sectionKey === "Very_Long_Answers" && (
                                                <div className="space-y-2">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div key={i} className="border-b border-gray-400 h-6"></div>
                                                    ))}
                                                </div>
                                            )}
                                            {(sectionKey === "MCQs" ||
                                                sectionKey === "True_False_Questions" ||
                                                sectionKey === "Fill_in_the_Blanks") && <div>Answer: ___________</div>}
                                        </div>
                                    )}
                                    {showWritingLines && options && <div className="mt-3 ml-6">Answer: ___________</div>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        return (
            <div className="bg-white p-6 sm:p-8 font-mono text-sm leading-relaxed">
                {/* Test Paper Header - Auto-filled */}
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-xl font-bold mb-2">TEST PAPER</h1>
                    <div className="text-base">
                        <div>
                            Subject:{" "}
                            {formData.subject
                                ? formData.subject.charAt(0).toUpperCase() + formData.subject.slice(1)
                                : "_________________"}{" "}
                            Class: {formData.grade || "_______"} Time: {formData.test_duration || "_______"} minutes
                        </div>
                        <div className="mt-2">Maximum Marks: {formData.total_marks || "_______"} Date: _____________</div>
                    </div>
                </div>

                {/* General Instructions */}
                {data.General_Instructions && (
                    <div className="mb-8">
                        <h2 className="text-base font-bold mb-3 underline">GENERAL INSTRUCTIONS:</h2>
                        <div className="whitespace-pre-line text-sm leading-relaxed">
                            <MathRenderer content={data.General_Instructions.trim()} />
                        </div>
                    </div>
                )}

                {/* Question Sections */}
                <div className="space-y-8">
                    {data.MCQs && data.MCQs.length > 0 && (
                        <div>
                            {renderSection("MCQs", "SECTION A: MULTIPLE CHOICE QUESTIONS", data.MCQs)}
                            {/* <p className="mb-4 italic text-sm">Choose the correct option for each question:</p> */}
                        </div>
                    )}

                    {data.True_False_Questions && data.True_False_Questions.length > 0 && (
                        <div>
                            {renderSection("True_False_Questions", "SECTION B: TRUE/FALSE QUESTIONS", data.True_False_Questions)}
                            {/* <p className="mb-4 italic text-sm">Write 'True' or 'False' for each statement:</p> */}
                        </div>
                    )}

                    {data.Fill_in_the_Blanks && data.Fill_in_the_Blanks.length > 0 && (
                        <div>
                            {renderSection("Fill_in_the_Blanks", "SECTION C: FILL IN THE BLANKS", data.Fill_in_the_Blanks)}
                            {/* <p className="mb-4 italic text-sm">Complete the following sentences:</p> */}
                        </div>
                    )}

                    {data.Very_Short_Answers && data.Very_Short_Answers.length > 0 && (
                        <div>
                            {renderSection("Very_Short_Answers", "SECTION D: VERY SHORT ANSWER QUESTIONS", data.Very_Short_Answers)}
                            {/* <p className="mb-4 italic text-sm">Answer the following questions in one word or one sentence:</p> */}
                        </div>
                    )}

                    {data.Short_Answers && data.Short_Answers.length > 0 && (
                        <div>
                            {renderSection("Short_Answers", "SECTION E: SHORT ANSWER QUESTIONS", data.Short_Answers)}
                            {/* <p className="mb-4 italic text-sm">Answer the following questions in 2-3 sentences:</p> */}
                        </div>
                    )}

                    {data.Long_Answers && data.Long_Answers.length > 0 && (
                        <div>
                            {renderSection("Long_Answers", "SECTION F: LONG ANSWER QUESTIONS", data.Long_Answers)}
                            {/* <p className="mb-4 italic text-sm">Answer the following questions in detail:</p> */}
                        </div>
                    )}

                    {data.Very_Long_Answers && data.Very_Long_Answers.length > 0 && (
                        <div>
                            {renderSection("Very_Long_Answers", "SECTION G: VERY LONG ANSWER QUESTIONS", data.Very_Long_Answers)}
                            {/* <p className="mb-4 italic text-sm">Answer the following questions in detail with examples:</p> */}
                        </div>
                    )}

                    {data.Case_Studies && data.Case_Studies.length > 0 && (
                        <div>
                            {renderSection("Case_Studies", "SECTION H: CASE STUDY QUESTIONS", data.Case_Studies)}
                            {/* <p className="mb-4 italic text-sm">Read the scenarios and answer the questions:</p> */}
                        </div>
                    )}
                </div>

                {/* Answer Key */}
                {data.Answers && (
                    <div className="mt-12 pt-8 border-t-2 border-gray-800">
                        <h3 className="text-base font-bold mb-6 underline">ANSWER KEY</h3>
                        <div className="space-y-6">
                            {/* All Answers in uniform grid format */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                {Object.entries(data.Answers).map(([key, value]) => (
                                    <div key={key} className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-gray-700">Q{key}:</span>
                                            <div className="text-sm text-gray-900 leading-relaxed">
                                                <MathRenderer content={String(value)} className="inline" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const handleEdit = async () => {
        try {
            if (!isEditing) {
                // Use existing editableData or fallback to response data
                let dataToEdit = editableData || response?.data?.data || response?.data

                if (Array.isArray(dataToEdit) && dataToEdit.length === 1 && typeof dataToEdit[0] === "object") {
                    dataToEdit = dataToEdit[0]
                }

                // Set editable data and enable editing
                const clonedData = cloneDeep(dataToEdit)
                setEditableData(clonedData)
                setHasUnsavedEdits(false)
                setIsEditing(true)
            } else {

                const hasCredits = await checkCreditsBeforeExecution()
                if (!hasCredits) {
                    setShowContactPopup(true)
                    return
                }
                if (!agent_id || !executionToken || !accessToken) {
                    const missingParams = []
                    if (!agent_id) missingParams.push("agent_id")
                    if (!executionToken) missingParams.push("executionToken")
                    if (!accessToken) missingParams.push("accessToken")

                    toast({
                        title: "Error",
                        description: `Missing required parameters: ${missingParams.join(", ")}`,
                        variant: "destructive",
                        duration: 5000,
                    })
                    return
                }

                if (!editableData) {
                    toast({
                        title: "Error",
                        description: "No data available to save.",
                        variant: "destructive",
                        duration: 3000,
                    })
                    return
                }

                setIsSaving(true)

                try {
                    const requestBody = {
                        agent_id: agent_id,
                        execution_id: executionToken,
                        response: Array.isArray(editableData) ? editableData : [editableData],
                    }

                    const apiResponse = await fetch("/api/update-response", {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(requestBody),
                    })

                    if (!apiResponse.ok) {
                        const errorData = await apiResponse.json()
                        throw new Error(errorData.error || `HTTP error! status: ${apiResponse.status}`)
                    }

                    if (onSave) {
                        try {
                            onSave(editableData)
                        } catch (saveError) {
                            console.warn("Error in onSave callback:", saveError)
                        }
                    }

                    setIsEditing(false)
                    setHasUnsavedEdits(false)

                    toast({
                        title: "Success",
                        description: "Test paper updated successfully.",
                        duration: 3000,
                    })
                } catch (apiError) {
                    console.error("API Error in save operation:", apiError)
                    toast({
                        title: "Error",
                        description: apiError instanceof Error ? apiError.message : "Failed to save changes. Please try again.",
                        variant: "destructive",
                        duration: 3000,
                    })
                } finally {
                    setIsSaving(false)
                }
            }
        } catch (error) {
            console.error("Unexpected error in handleEdit:", error)
            setIsSaving(false)
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
                duration: 3000,
            })
        }
    }

    const handleCancel = () => {
        // Reset to original data from response
        let dataToReset = response?.data?.data || response?.data

        if (Array.isArray(dataToReset) && dataToReset.length === 1 && typeof dataToReset[0] === "object") {
            dataToReset = dataToReset[0]
        }

        setEditableData(cloneDeep(dataToReset))
        setIsEditing(false)
        setHasUnsavedEdits(false)
    }

    if (isGenerating) {
        return <ResponseLoader />;
    }

    if (response?.error) {
        return (
            <div className="w-full p-4 sm:p-6 text-red-600 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    <h3 className="font-semibold">Error</h3>
                </div>
                <p className="text-xs sm:text-sm">{response?.error}</p>
            </div>
        )
    }

    let dataToDisplay = editableData || response?.data?.data || response?.data

    if (Array.isArray(dataToDisplay) && dataToDisplay.length === 1 && typeof dataToDisplay[0] === "object") {
        dataToDisplay = dataToDisplay[0]
    }

    const currentExecutionToken = executionToken
    const currentagent_id = agent_id
    const currentagent_name = 'test-paper'

    return (
        <>
        <div id="test-paper-response" className="w-full max-w-7xl space-y-4 sm:space-y-6">
            {/* Main Response Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Test Paper Results</h2>
                                <p className="text-xs sm:text-sm text-gray-500">
                                    AI-generated test paper content {gradeLevel <= 4 ? "(with answer lines)" : "(question paper format)"}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                            {currentExecutionToken && currentagent_id && (
                                <ShareButton agentId={currentagent_id} executionToken={currentExecutionToken} agentName={currentagent_name} />
                            )}
                            {/* Download PDF Button */}
                            <Button
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF || isEditing}
                                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300 shadow-sm hover:shadow-md text-xs sm:text-sm px-3 sm:px-4 py-2 disabled:opacity-50"
                            >
                                {isGeneratingPDF ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                                        Download PDF
                                    </>
                                )}
                            </Button>

                            {isEditing && (
                                <Button
                                    onClick={handleCancel}
                                    variant="outline"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 text-gray-600 border-gray-200 hover:bg-gray-50 bg-transparent text-xs sm:text-sm px-3 sm:px-4 py-2"
                                >
                                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                    Cancel
                                </Button>
                            )}
                            <Button
                                onClick={handleEdit}
                                variant={isEditing ? "default" : "outline"}
                                disabled={isSaving}
                                className={`flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 ${isEditing
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                    : "text-gray-600 border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-current" />
                                        Saving...
                                    </>
                                ) : isEditing ? (
                                    <>
                                        <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                                        Save Changes
                                    </>
                                ) : (
                                    <>
                                        <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                                        Edit
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    {isEditing ? renderEditableTestPaper(editableData || dataToDisplay) : renderTestPaperContent(dataToDisplay)}
                </div>
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
                        isDisabled={isEditing || hasUnsavedEdits}
                    />
                ) : (
                    <RatingFeedback
                        key={`feedback-${executionToken}`}
                        agent_id={agent_id || ""}
                        executionToken={executionToken || ""}
                        response={editableData}
                        onUpdate={(updatedRating, updatedFeedback) => {
                            setRating(updatedRating)
                            setFeedback(updatedFeedback)
                        }}
                        isDisabled={isEditing || hasUnsavedEdits}
                    />
                )}
            </div>

            {/* PDF Details Modal */}
            <Dialog open={showPdfDetailsModal} onOpenChange={setShowPdfDetailsModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>PDF Details</DialogTitle>
                        <DialogDescription>Enter the school name and examination name for the PDF header.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="schoolName" className="text-right">
                                School Name
                            </Label>
                            <Input
                                id="schoolName"
                                value={schoolName}
                                onChange={(e) => setSchoolName(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g., Springfield High School"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="examinationName" className="text-right">
                                Examination Name
                            </Label>
                            <Input
                                id="examinationName"
                                value={examinationName}
                                onChange={(e) => setExaminationName(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g., Half Yearly Exam"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="schoolLogo" className="text-right">
                                School Logo (Optional)
                            </Label>
                            <Input id="schoolLogo" type="file" accept="image/*" onChange={handleLogoUpload} className="col-span-3" />
                        </div>
                        {schoolLogoPreview && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="col-span-1"></div> {/* Empty column for alignment */}
                                <div className="col-span-3">
                                    <img
                                        src={schoolLogoPreview || "/placeholder.svg"}
                                        alt="School Logo Preview"
                                        className="h-16 object-contain"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPdfDetailsModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmDownloadPDF} disabled={isGeneratingPDF}>
                            {isGeneratingPDF ? "Generating..." : "Generate PDF"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ContactPopup isOpen={showContactPopup} onClose={() => setShowContactPopup(false)} trigger="credits" />
        </div>
        {/* Global loader while generating PDF */}
        <PopupLoader open={isGeneratingPDF} label="Generating PDF…" />
        </>
    )
}

export default TestPaperResponse
