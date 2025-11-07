"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Calculator, AlertTriangle, CheckCircle } from "lucide-react"

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

interface Topic {
    topic_name: string
    assigned_marks: number
    questions: QuestionBreakdown[]
}

interface Chapter {
    chapter_number: string
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

interface MarksCalculatorProps {
    topics: Topic[]
    chapters: Chapter[]
    marksBreakdown: MarksBreakdown
    totalMarks: number
    onClose: () => void
    onValidationChange?: (isValid: boolean) => void
}

const MarksCalculator: React.FC<MarksCalculatorProps> = ({
    topics,
    chapters,
    marksBreakdown,
    totalMarks,
    onClose,
    onValidationChange,
}) => {
    const [calculations, setCalculations] = useState<{
        topicCalculations: Array<{ name: string; calculatedMarks: number; assignedMarks: number }>
        chapterCalculations: Array<{ name: string; calculatedMarks: number; assignedMarks: number }>
        totalCalculatedMarks: number
        isValid: boolean
        warnings: string[]
    }>({
        topicCalculations: [],
        chapterCalculations: [],
        totalCalculatedMarks: 0,
        isValid: false,
        warnings: [],
    })

    useEffect(() => {
        calculateMarks()
    }, [topics, chapters, marksBreakdown, totalMarks])

    useEffect(() => {
        if (onValidationChange) {
            onValidationChange(calculations.isValid)
        }
    }, [calculations.isValid, onValidationChange])

    const calculateMarks = () => {
        const warnings: string[] = []

        // Calculate topic marks
        const topicCalculations = topics.map((topic) => {
            const questions = topic.questions[0] || {}
            const calculatedMarks =
                (questions.mcqs || 0) * marksBreakdown.marks_of_each_mcqs +
                (questions.very_short_answers || 0) * marksBreakdown.marks_of_each_very_short_answers +
                (questions.short_answers || 0) * marksBreakdown.marks_of_each_short_answer +
                (questions.long_answers || 0) * marksBreakdown.marks_of_each_long_answer +
                (questions.very_long_answers || 0) * marksBreakdown.marks_of_each_very_long_answer +
                (questions.case_studies || 0) * marksBreakdown.marks_of_each_case_studies +
                (questions.truth_False_questions || 0) * marksBreakdown.marks_of_each_truth_False_questions +
                (questions.fill_in_the_blanks || 0) * marksBreakdown.marks_of_each_fill_in_the_blanks

            if (calculatedMarks !== topic.assigned_marks && topic.assigned_marks > 0) {
                warnings.push(
                    `Topic "${topic.topic_name}": Calculated marks (${calculatedMarks}) don't match assigned marks (${topic.assigned_marks})`,
                )
            }

            return {
                name: topic.topic_name || `Topic ${topics.indexOf(topic) + 1}`,
                calculatedMarks,
                assignedMarks: topic.assigned_marks,
            }
        })

        // Calculate chapter marks
        const chapterCalculations = chapters.map((chapter) => {
            const questions = chapter.questions[0] || {}
            const calculatedMarks =
                (questions.mcqs || 0) * marksBreakdown.marks_of_each_mcqs +
                (questions.very_short_answers || 0) * marksBreakdown.marks_of_each_very_short_answers +
                (questions.short_answers || 0) * marksBreakdown.marks_of_each_short_answer +
                (questions.long_answers || 0) * marksBreakdown.marks_of_each_long_answer +
                (questions.very_long_answers || 0) * marksBreakdown.marks_of_each_very_long_answer +
                (questions.case_studies || 0) * marksBreakdown.marks_of_each_case_studies +
                (questions.truth_False_questions || 0) * marksBreakdown.marks_of_each_truth_False_questions +
                (questions.fill_in_the_blanks || 0) * marksBreakdown.marks_of_each_fill_in_the_blanks

            if (calculatedMarks !== chapter.assigned_marks && chapter.assigned_marks > 0) {
                warnings.push(
                    `Chapter ${chapter.chapter_number}: Calculated marks (${calculatedMarks}) don't match assigned marks (${chapter.assigned_marks})`,
                )
            }

            return {
                name: `Chapter ${chapter.chapter_number}`,
                calculatedMarks,
                assignedMarks: chapter.assigned_marks,
            }
        })

        // Calculate total marks
        const totalCalculatedMarks =
            topicCalculations.reduce((sum, topic) => sum + topic.calculatedMarks, 0) +
            chapterCalculations.reduce((sum, chapter) => sum + chapter.calculatedMarks, 0)

        // Check if total matches
        if (totalCalculatedMarks !== totalMarks) {
            warnings.push(
                `Total calculated marks (${totalCalculatedMarks}) don't match specified total marks (${totalMarks})`,
            )
        }

        // Check for empty topics/chapters
        if (topics.length === 0 && chapters.length === 0) {
            warnings.push("No topics or chapters added. Please add at least one.")
        }

        const isValid = warnings.length === 0

        setCalculations({
            topicCalculations,
            chapterCalculations,
            totalCalculatedMarks,
            isValid,
            warnings,
        })
    }

    return (
        <div className="fixed top-16 right-4 z-50 w-64 max-w-[80vw] md:w-72">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-h-[60vh] overflow-hidden">
                {/* Compact Header */}
                <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-1.5">
                        <Calculator className="w-3 h-3 text-indigo-600" />
                        <h2 className="text-xs font-semibold text-gray-900">Marks Calculator</h2>
                    </div>
                    <Button onClick={onClose} variant="outline" size="sm" className="h-4 w-4 p-0 bg-transparent">
                        <X className="w-2 h-2" />
                    </Button>
                </div>

                {/* Compact Content */}
                <div className="p-2 overflow-y-auto max-h-[50vh]">
                    {/* Status */}
                    <div
                        className={`mb-2 p-1.5 rounded-md text-xs ${calculations.isValid ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                            }`}
                    >
                        <div className="flex items-center gap-1 mb-0.5">
                            {calculations.isValid ? <CheckCircle className="w-2 h-2" /> : <AlertTriangle className="w-2 h-2" />}
                            <span className="font-medium text-xs">{calculations.isValid ? "Valid" : "Issues Found"}</span>
                        </div>
                        <div className="text-xs">
                            Calculated: <span className="font-semibold">{calculations.totalCalculatedMarks}</span>
                            {" / "}
                            Target: <span className="font-semibold">{totalMarks}</span>
                        </div>
                    </div>

                    {/* Compact Warnings */}
                    {calculations.warnings.length > 0 && (
                        <div className="mb-2 p-1.5 bg-orange-50 rounded-md">
                            <div className="text-xs font-medium text-orange-800 mb-0.5">Issues:</div>
                            <ul className="text-xs text-orange-700 space-y-0.5">
                                {calculations.warnings.slice(0, 2).map((warning, index) => (
                                    <li key={index} className="flex items-start gap-1">
                                        <span className="w-0.5 h-0.5 bg-orange-500 rounded-full mt-1 flex-shrink-0"></span>
                                        <span className="text-xs leading-tight">{warning}</span>
                                    </li>
                                ))}
                                {calculations.warnings.length > 2 && (
                                    <li className="text-orange-600 text-xs">...and {calculations.warnings.length - 2} more</li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Compact Summary */}
                    <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                        <div className="p-1 bg-indigo-50 rounded text-center">
                            <div className="text-indigo-600 font-medium text-xs">Topics</div>
                            <div className="font-semibold text-indigo-800">{topics.length}</div>
                        </div>
                        <div className="p-1 bg-purple-50 rounded text-center">
                            <div className="text-purple-600 font-medium text-xs">Chapters</div>
                            <div className="font-semibold text-purple-800">{chapters.length}</div>
                        </div>
                    </div>

                    {/* Detailed breakdown (collapsible) */}
                    {(calculations.topicCalculations.length > 0 || calculations.chapterCalculations.length > 0) && (
                        <div className="space-y-1">
                            {calculations.topicCalculations.map((topic, index) => (
                                <div key={index} className="p-1 bg-blue-50 rounded-md">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-blue-800 truncate text-xs">{topic.name}</span>
                                        <span
                                            className={`font-semibold text-xs ${topic.calculatedMarks === topic.assignedMarks ? "text-green-600" : "text-red-600"}`}
                                        >
                                            {topic.calculatedMarks}/{topic.assignedMarks}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {calculations.chapterCalculations.map((chapter, index) => (
                                <div key={index} className="p-1 bg-purple-50 rounded-md">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-purple-800 truncate text-xs">{chapter.name}</span>
                                        <span
                                            className={`font-semibold text-xs ${chapter.calculatedMarks === chapter.assignedMarks ? "text-green-600" : "text-red-600"}`}
                                        >
                                            {chapter.calculatedMarks}/{chapter.assignedMarks}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default MarksCalculator
