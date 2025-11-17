"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { cloneDeep } from "lodash"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import RatingFeedback from "@/components/Content/RatingFeedback"
import HistoricalRatingFeedback from "@/components/Content/HistoricalRatingFeedback"
import { FileText, Edit3, Save, X, Download } from "lucide-react"
import Cookies from "js-cookie"
import { generateLessonPlanPDF } from "@/utils/LessonPLanPDFGenerator"
import ResponseLoader from "./ResponseLoader"
import ShareButton from "../ShareButton"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"
import { convertLatexNotation } from "@/utils/mathUtils"
import "katex/dist/katex.min.css"
import MathLiveInput from "@/components/TestPaperGenerator/MathLiveInput"
import MathRenderer from "@/components/TestPaperGenerator/MathRenderer"
import PopupLoader from "@/components/PopupLoader"

// Custom styles for MathLiveInput in lesson planner context
const lessonPlannerMathInputStyles = `
  .lesson-planner-math-input-wrapper > div > div {
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: baseline !important;
    gap: 0.25rem !important;
    line-height: 1.5 !important;
  }
  
  .lesson-planner-math-input-wrapper > div > div > span[contenteditable="true"] {
    display: inline !important;
    white-space: pre-wrap !important;
    word-break: break-word !important;
    line-height: 1.5 !important;
    vertical-align: baseline !important;
  }
  
  .lesson-planner-math-input-wrapper > div > div > span {
    display: inline-flex !important;
    align-items: baseline !important;
    vertical-align: baseline !important;
  }
  
  .lesson-planner-math-input-wrapper math-field {
    display: inline-block !important;
    vertical-align: baseline !important;
    line-height: 1.5 !important;
  }
`

interface FormattedResponseProps {
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
  chapterOrTopicName?: string | null
}

// MathText aligned with leoqui: ReactMarkdown + remark-math/rehype-katex, with slightly larger math font
const MathText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null
  const normalized = convertLatexNotation(text)
  return (
    <div className="math-text-wrapper">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <span>{children}</span>,
          div: ({ children }) => <span>{children}</span>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="border-collapse border border-gray-300 min-w-full w-full">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-300">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold bg-gray-50">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-4 py-2">
              {children}
            </td>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
      <style jsx>{`
        .math-text-wrapper :global(.katex) {
          font-size: 1.3em !important;
        }
        .math-text-wrapper :global(.katex-display) {
          font-size: 1.3em !important;
        }
        .math-text-wrapper :global(table) {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          font-size: 0.875rem;
        }
        .math-text-wrapper :global(table th),
        .math-text-wrapper :global(table td) {
          padding: 0.5rem 0.75rem;
          text-align: left;
        }
        .math-text-wrapper :global(table th) {
          font-weight: 600;
          background-color: #f9fafb;
        }
        .math-text-wrapper :global(table tr:nth-child(even)) {
          background-color: #f9fafb;
        }
        .math-text-wrapper :global(table tr:hover) {
          background-color: #f3f4f6;
        }
      `}</style>
    </div>
  )
}

// Helper function to detect if text contains a markdown table
const containsMarkdownTable = (text: string): boolean => {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return false
  
  // Check for markdown table pattern: header row with |, separator row with |---|, and data rows
  let foundHeader = false
  let foundSeparator = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Check if line contains pipe characters (markdown table delimiter)
    if (line.includes('|')) {
      const pipeCount = (line.match(/\|/g) || []).length
      // A valid table row should have at least 2 pipes (3 columns)
      if (pipeCount >= 2) {
        if (!foundHeader) {
          foundHeader = true
        } else if (!foundSeparator) {
          // Check for separator row: |---| or |:---| or |---:| or |:---:|
          const separatorPattern = /^\|[\s\-:]+\|/
          if (separatorPattern.test(line) || /^[\s\-:]+\|/.test(line) || /\|[\s\-:]+$/.test(line)) {
            foundSeparator = true
          }
        } else {
          // Found header, separator, and at least one data row
          return true
        }
      }
    }
  }
  
  return foundHeader && foundSeparator
}

// Enhanced Formatted Text Component with proper bullet points
const FormattedText: React.FC<{ text: string; showBullets?: boolean }> = ({ text, showBullets = true }) => {
  if (!text) return null

  // If text contains a table, render it directly with MathText (which handles tables)
  if (containsMarkdownTable(text)) {
    return (
      <div className="text-sm leading-relaxed text-gray-800">
        <MathText text={text} />
      </div>
    )
  }

  const normalized = text.replace(/\\n/g, '\n').trim()
  const lines = normalized.split('\n').filter(line => line.trim())

  if (lines.length === 0) return null

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmedLine = line.trim()
        if (!trimmedLine) return null

        return (
          <div key={idx} className="flex items-start gap-3">
            {showBullets && (
              <span className="text-purple-600 font-bold flex-shrink-0">•</span>
            )}
            <div className="flex-1 text-sm leading-relaxed text-gray-800">
              <MathText text={trimmedLine} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const FormattedResponse: React.FC<FormattedResponseProps> = ({
  response,
  onSave,
  agent_id,
  executionToken,
  formRef,
  historicalRating = null,
  historicalFeedback = null,
  isHistoricalView = false,
  chapterOrTopicName = null,
}) => {
  const [editableData, setEditableData] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>("")
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("")
  const responseContainerRef = useRef<HTMLDivElement>(null)

  const accessToken = Cookies.get("access_token")

  useEffect(() => {
    if (response.data && !response.loading) {
      setTimeout(() => {
        const responseElement = document.getElementById("lesson-plan-response")
        if (responseElement) {
          responseElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
      }, 100)
    }
  }, [response.data, response.loading])

  useEffect(() => {
    if (historicalRating !== null) {
      setRating(historicalRating)
    }

    if (historicalFeedback !== null) {
      setFeedback(historicalFeedback)
    }
  }, [historicalRating, historicalFeedback])

  // Reset editing state when response changes
  useEffect(() => {
    if (response.data && !response.loading) {
      setIsEditing(false)
      setHasUnsavedEdits(false)
    }
  }, [response.data, response.loading])

  useEffect(() => {
    if (!isEditing) {
      let dataToSet = response.data?.data || response.data

      if (Array.isArray(dataToSet) && dataToSet.length === 1 && typeof dataToSet[0] === "object") {
        dataToSet = dataToSet[0]
      }

      setEditableData(dataToSet)
      setHasUnsavedEdits(false)
    }
  }, [response.data, isEditing])

  // Compute dataToDisplay using useMemo (before early returns)
  const dataToDisplay = useMemo(() => {
    let data = editableData || response.data?.data || response.data
    if (Array.isArray(data) && data.length === 1 && typeof data[0] === "object") {
      data = data[0]
    }
    return data
  }, [editableData, response.data])

  // Extract lectures function (defined inline to use before extractLectures is available)
  const extractLecturesInline = (data: any) => {
    if (!data) return []
    const lectures: Array<{ key: string; title: string; content: any }> = []
    if (Array.isArray(data)) {
      data.forEach((lesson, index) => {
        if (typeof lesson === "object" && lesson !== null && Object.keys(lesson).length > 5) {
          lectures.push({
            key: `lecture_${index + 1}`,
            title: `Lecture ${index + 1}`,
            content: lesson,
          })
        }
      })
      if (lectures.length === 0) {
        lectures.push({
          key: "lesson_plan",
          title: "Lesson Plan",
          content: data.length === 1 ? data[0] : data,
        })
      }
    } else if (typeof data === "object") {
      const lectureKeys = Object.keys(data).filter((key) => {
        const lowerKey = key.toLowerCase()
        return /^(lecture|lesson)_?\d+$/i.test(lowerKey)
      })
      if (lectureKeys.length > 0) {
        lectureKeys.forEach((key) => {
          lectures.push({
            key,
            title: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            content: data[key],
          })
        })
      } else {
        lectures.push({
          key: "lesson_plan",
          title: "Lesson Plan",
          content: data,
        })
      }
    }
    return lectures
  }

  // Compute lectures using useMemo
  const lectures = useMemo(() => extractLecturesInline(dataToDisplay), [dataToDisplay])

  // Set default active tab when lectures change (must be before early returns)
  useEffect(() => {
    if (lectures.length > 0) {
      const lectureKeys = lectures.map(l => l.key)
      if (!activeTab || !lectureKeys.includes(activeTab)) {
        setActiveTab(lectures[0]?.key || "")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectures.length])

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const dataToExport = editableData || response.data?.data || response.data

      let filename = "lesson-plan.pdf"
      if (chapterOrTopicName) {
        const sanitizedName = chapterOrTopicName
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase()
        filename = `${sanitizedName}-lesson-plan-${new Date().toISOString().split("T")[0]}.pdf`
      } else {
        filename = `lesson-plan-${new Date().toISOString().split("T")[0]}.pdf`
      }

      const result = await generateLessonPlanPDF(dataToExport, filename, chapterOrTopicName)

      if (result.success) {
        toast({
          title: "Success",
          description: "Lesson plan PDF downloaded successfully!",
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

  const renderEditableValue = (value: any, path: string[] = [], level = 0): React.ReactNode => {
    const getCurrentValue = () => {
      if (!isEditing || !editableData) return value

      // If path is empty, use the value directly (this is the case for lecture content)
      if (path.length === 0) {
        return value
      }

      // Check if the first path segment is a lecture key
      const lectures = extractLecturesInline(editableData)
      const firstPathSegment = path[0]
      const isLectureKey = lectures.some(l => l.key === firstPathSegment)
      
      if (isLectureKey && lectures.length > 1) {
        // We're accessing a value within a specific lecture
        const lecture = lectures.find(l => l.key === firstPathSegment)
        if (lecture) {
          let current = lecture.content
          const nestedPath = path.slice(1)
          
          // Navigate to the nested path within the lecture
          for (const pathSegment of nestedPath) {
            if (current && typeof current === "object" && pathSegment in current) {
              current = current[pathSegment]
            } else {
              // If path doesn't exist, use the passed value
              return value
            }
          }
          return current
        }
      }

      // Standard path navigation (for single lecture or non-lecture paths)
      let current = editableData
      for (const pathSegment of path) {
        if (current && typeof current === "object" && pathSegment in current) {
          current = current[pathSegment]
        } else {
          // If path doesn't exist in editableData, use the passed value
          return value
        }
      }
      return current
    }

    const currentValue = getCurrentValue()

    const updateNestedValue = (newValue: any) => {
      setEditableData((prevData: any) => {
        if (!prevData) return prevData

        const newData = cloneDeep(prevData)

        // If path is empty (lecture-level editing), we need to update the entire lecture
        if (path.length === 0) {
          // If we're at lecture level, we need to merge the new value with the existing structure
          // Check if prevData has lecture keys
          const lectures = extractLecturesInline(prevData)
          if (lectures.length > 1) {
            // Find which lecture this value belongs to by comparing content
            // This is a fallback - ideally the path should be set correctly
            return newValue
          }
          return newValue
        }

        // Check if the first path segment is a lecture key
        const lectures = extractLecturesInline(newData)
        const firstPathSegment = path[0]
        const isLectureKey = lectures.some(l => l.key === firstPathSegment)
        
        if (isLectureKey && lectures.length > 1) {
          // We're updating within a specific lecture
          // Find the lecture and update within its content
          const lectureIndex = lectures.findIndex(l => l.key === firstPathSegment)
          
          if (lectureIndex >= 0) {
            const lecture = lectures[lectureIndex]
            let lectureContent = cloneDeep(lecture.content)
            
            // Navigate to the nested path within the lecture (skip the first segment which is the lecture key)
            let current = lectureContent
            const nestedPath = path.slice(1)
            
            if (nestedPath.length > 0) {
              for (let i = 0; i < nestedPath.length - 1; i++) {
                if (current[nestedPath[i]] === undefined) {
                  current[nestedPath[i]] = {}
                }
                current = current[nestedPath[i]]
              }
              current[nestedPath[nestedPath.length - 1]] = newValue
            } else {
              // If no nested path, update the entire lecture content
              lectureContent = newValue
            }
            
            // Update the lecture in the data structure
            if (Array.isArray(newData)) {
              newData[lectureIndex] = lectureContent
            } else if (typeof newData === "object" && firstPathSegment in newData) {
              newData[firstPathSegment] = lectureContent
            } else {
              // Reconstruct the data structure
              const updatedLectures = [...lectures]
              updatedLectures[lectureIndex] = { ...updatedLectures[lectureIndex], content: lectureContent }
              if (Array.isArray(prevData)) {
                return updatedLectures.map(l => l.content)
              } else {
                const reconstructed: any = {}
                updatedLectures.forEach(l => {
                  reconstructed[l.key] = l.content
                })
                return reconstructed
              }
            }
            
            return newData
          }
        }

        // Standard nested update (for single lecture or non-lecture paths)
        let current = newData
        for (let i = 0; i < path.length - 1; i++) {
          if (current[path[i]] === undefined) {
            current[path[i]] = {}
          }
          current = current[path[i]]
        }

        current[path[path.length - 1]] = newValue
        return newData
      })
      setHasUnsavedEdits(true)
    }

    if (currentValue === null || currentValue === undefined) {
      return <span className="text-xs sm:text-sm text-gray-400">null</span>
    }

    if (typeof currentValue === "boolean") {
      return isEditing ? (
        <select
          value={currentValue.toString()}
          onChange={(e) => updateNestedValue(e.target.value === "true")}
          className="text-xs sm:text-sm text-purple-600 font-medium w-full p-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <span className="text-xs sm:text-sm text-purple-600 font-medium">{currentValue.toString()}</span>
      )
    }

    if (typeof currentValue === "number") {
      return isEditing ? (
        <Input
          type="number"
          value={currentValue.toString()}
          onChange={(e) => updateNestedValue(Number(e.target.value) || 0)}
          className="text-xs sm:text-sm text-blue-600 font-medium border-gray-200 focus:border-purple-500 focus:ring-purple-500"
        />
      ) : (
        <span className="text-xs sm:text-sm text-blue-600 font-medium">{currentValue}</span>
      )
    }

    if (typeof currentValue === "string") {
      const lastKey = path[path.length - 1]?.toLowerCase() || ''
      const isWebResources = lastKey.includes("web") && lastKey.includes("resource")
      const isUrl = /^https?:\/\/.+/.test(currentValue.trim())

      if (isWebResources || isUrl) {
        return isEditing ? (
          <Input
            value={currentValue}
            onChange={(e) => updateNestedValue(e.target.value)}
            className="text-xs sm:text-sm w-full border-gray-200 focus:border-purple-500 focus:ring-purple-500"
            placeholder="Enter web resource URL"
          />
        ) : (
          <div className="text-xs sm:text-sm break-words text-gray-900 shadow-sm p-3 rounded-lg border border-blue-200 bg-blue-50">
            <a
              href={currentValue}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-2 transition-colors duration-200"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="truncate">{currentValue}</span>
            </a>
          </div>
        )
      }

      // Check if content contains a markdown table - render it as a table
      if (containsMarkdownTable(currentValue)) {
        return isEditing ? (
          <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
            <MathLiveInput
              value={currentValue}
              onChange={(newValue) => updateNestedValue(newValue)}
              placeholder="Enter markdown table..."
              className="w-full"
              multiline={true}
            />
          </div>
        ) : (
          <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
            <MathText text={currentValue} />
          </div>
        )
      }

      // Check if this is a section that should be parsed line by line
      const isQuizOrAssignment = /quiz|assignment/i.test(lastKey)
      const isPrerequisiteQuiz = /prerequisite.*quiz|quiz.*prerequisite/i.test(lastKey)
      const isExpectedOutcome = /expected.*outcome/i.test(lastKey)
      const isAssessmentCriteria = /assessment.*criteria/i.test(lastKey)
      const isLearningObjectives = /learning.*objective/i.test(lastKey)
      const isLearningOutcomes = /learning.*outcome/i.test(lastKey)
      const isTeachingPoints = /teaching.*point|main.*teaching/i.test(lastKey)
      const isInteractiveActivities = /interactive.*activit/i.test(lastKey)
      const isMaterialsRequired = /material.*required/i.test(lastKey)
      const isSectionWithItems = isExpectedOutcome || isAssessmentCriteria || 
                                 isLearningObjectives || isLearningOutcomes || 
                                 isTeachingPoints || isInteractiveActivities ||
                                 isMaterialsRequired

      // Handle sections with individual items (Expected Outcome, Assessment Criteria, etc.)
      if (isSectionWithItems) {
        // Parse the content to extract individual items
        const normalized = currentValue.replace(/\\n/g, '\n').trim()
        const lines = normalized.split('\n').filter(line => line.trim())

        // Helper function to update a specific line
        const updateLine = (lineIndex: number, newLineValue: string) => {
          const newLines = [...lines]
          newLines[lineIndex] = newLineValue
          const updatedValue = newLines.join('\n')
          updateNestedValue(updatedValue)
        }

        if (isEditing) {
          return (
            <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
              <div className="space-y-2">
                {lines.map((line, idx) => {
                const trimmedLine = line.trim()
                if (!trimmedLine) return null

                // Check if it's a header line (contains the section name)
                const isHeader = trimmedLine.toLowerCase().includes('expected outcome') || 
                               trimmedLine.toLowerCase().includes('assessment criteria') ||
                               trimmedLine.toLowerCase().includes('learning objective') ||
                               trimmedLine.toLowerCase().includes('learning outcome') ||
                               trimmedLine.toLowerCase().includes('teaching point') ||
                               trimmedLine.toLowerCase().includes('main teaching') ||
                               trimmedLine.toLowerCase().includes('interactive activit') ||
                               trimmedLine.toLowerCase().includes('material required')
                
                // Check if it's a task
                const isTask = /^Task\s+\d+\./i.test(trimmedLine)

                if (isHeader) {
                  return (
                    <div key={idx} className="font-semibold text-blue-800 text-base">
                      <MathLiveInput
                        value={trimmedLine}
                        onChange={(newValue) => updateLine(idx, newValue)}
                        placeholder="Enter section header..."
                        className="w-full"
                        multiline={false}
                      />
                    </div>
                  )
                }

                if (isTask) {
                  return (
                    <div key={idx} className="rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold flex-shrink-0 pt-1.5">📝</span>
                        <div className="flex-1 min-w-0">
                          <div className="lesson-planner-math-input-wrapper">
                            <MathLiveInput
                              value={trimmedLine}
                              onChange={(newValue) => updateLine(idx, newValue)}
                              placeholder="Enter task..."
                              className="w-full"
                              multiline={false}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                // Regular item line - show with bullet point
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-purple-600 font-bold flex-shrink-0 pt-1.5">•</span>
                    <div className="flex-1 min-w-0">
                      <div className="lesson-planner-math-input-wrapper">
                        <MathLiveInput
                          value={trimmedLine}
                          onChange={(newValue) => updateLine(idx, newValue)}
                          placeholder="Enter item..."
                          className="w-full"
                          multiline={false}
                        />
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )
        }

        // Display mode
        return (
          <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
            <div className="space-y-2">
              {lines.map((line, idx) => {
              const trimmedLine = line.trim()
              if (!trimmedLine) return null

              // Check if it's a header line
              const isHeader = trimmedLine.toLowerCase().includes('expected outcome') || 
                             trimmedLine.toLowerCase().includes('assessment criteria') ||
                             trimmedLine.toLowerCase().includes('learning objective') ||
                             trimmedLine.toLowerCase().includes('learning outcome') ||
                             trimmedLine.toLowerCase().includes('teaching point') ||
                             trimmedLine.toLowerCase().includes('main teaching') ||
                             trimmedLine.toLowerCase().includes('interactive activit') ||
                             trimmedLine.toLowerCase().includes('material required')
              
              // Check if it's a task
              const isTask = /^Task\s+\d+\./i.test(trimmedLine)

              if (isHeader) {
                return (
                  <div key={idx} className="font-semibold text-blue-800 text-base">
                    <MathText text={trimmedLine} />
                  </div>
                )
              }

              if (isTask) {
                return (
                  <div key={idx} className="rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold flex-shrink-0">📝</span>
                      <div className="flex-1">
                        <div className="text-sm leading-relaxed text-gray-800">
                          <MathText text={trimmedLine} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // Regular item line - show with bullet point
              return (
                <div key={idx} className="flex items-start gap-3">
                  <span className="text-purple-600 font-bold flex-shrink-0">•</span>
                  <div className="flex-1 text-sm leading-relaxed text-gray-800">
                    <MathText text={trimmedLine} />
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        )
      }

      // Check if this is Quiz, Assignment, or Prerequisite Quiz section
      if (isQuizOrAssignment || isPrerequisiteQuiz) {
        // Parse the content to extract Q&A pairs
        const normalized = currentValue.replace(/\\n/g, '\n').trim()
        const lines = normalized.split('\n').filter(line => line.trim())

        // Helper function to update a specific line
        const updateLine = (lineIndex: number, newLineValue: string) => {
          const newLines = [...lines]
          newLines[lineIndex] = newLineValue
          const updatedValue = newLines.join('\n')
          updateNestedValue(updatedValue)
        }

        if (isEditing) {
          return (
            <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-gradient-to-br from-white to-purple-50">
              <div className="space-y-4">
                {lines.map((line, idx) => {
                  const trimmedLine = line.trim()
                  if (!trimmedLine) return null

                  // Check if it's a question (starts with Q followed by number)
                  const isQuestion = /^Q\d+\./i.test(trimmedLine)
                  // Check if it's an answer (starts with A followed by number)
                  const isAnswer = /^A\d+\./i.test(trimmedLine)
                  // Check if it's a task (starts with Task followed by number)
                  const isTask = /^Task\s+\d+\./i.test(trimmedLine)
                  // Check if it's a title line
                  const isTitle = trimmedLine.includes('Quiz') || trimmedLine.includes('Assignment') ||
                    trimmedLine.includes('Total Questions') || trimmedLine.includes('Expected Outcome') ||
                    trimmedLine.includes('Assessment Criteria')

                  if (isTitle) {
                    return (
                      <div key={idx} className="font-semibold text-blue-800 text-base mt-2 mb-1">
                        <MathLiveInput
                          value={trimmedLine}
                          onChange={(newValue) => updateLine(idx, newValue)}
                          placeholder="Enter title..."
                          className="w-full"
                          multiline={false}
                        />
                      </div>
                    )
                  }

                  if (isQuestion || isTask) {
                    return (
                      <div key={idx} className="rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold flex-shrink-0 pt-1.5">📝</span>
                          <div className="flex-1 min-w-0">
                            <div className="lesson-planner-math-input-wrapper">
                              <MathLiveInput
                                value={trimmedLine}
                                onChange={(newValue) => updateLine(idx, newValue)}
                                placeholder="Enter question..."
                                className="w-full"
                                multiline={false}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (isAnswer) {
                    return (
                      <div key={idx} className="rounded-lg ml-6">
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 font-bold flex-shrink-0 pt-1.5">✓</span>
                          <div className="flex-1 min-w-0">
                            <div className="lesson-planner-math-input-wrapper">
                              <MathLiveInput
                                value={trimmedLine}
                                onChange={(newValue) => updateLine(idx, newValue)}
                                placeholder="Enter answer..."
                                className="w-full"
                                multiline={false}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // Regular line (Expected Outcome, Assessment Criteria descriptions, etc.)
                  return (
                    <div key={idx} className="text-gray-700 text-sm pl-2">
                      <MathLiveInput
                        value={trimmedLine}
                        onChange={(newValue) => updateLine(idx, newValue)}
                        placeholder="Enter text..."
                        className="w-full"
                        multiline={false}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        // Display mode - same as before
        return (
          <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-gradient-to-br from-white to-purple-50">
            <div className="space-y-4">
              {lines.map((line, idx) => {
                const trimmedLine = line.trim()
                if (!trimmedLine) return null

                // Check if it's a question (starts with Q followed by number)
                const isQuestion = /^Q\d+\./i.test(trimmedLine)
                // Check if it's an answer (starts with A followed by number)
                const isAnswer = /^A\d+\./i.test(trimmedLine)
                // Check if it's a task (starts with Task followed by number)
                const isTask = /^Task\s+\d+\./i.test(trimmedLine)
                // Check if it's a title line
                const isTitle = trimmedLine.includes('Quiz') || trimmedLine.includes('Assignment') ||
                  trimmedLine.includes('Total Questions') || trimmedLine.includes('Expected Outcome') ||
                  trimmedLine.includes('Assessment Criteria')

                if (isTitle) {
                  return (
                    <div key={idx} className="font-semibold text-blue-800 text-base mt-2 mb-1">
                      <MathText text={trimmedLine} />
                    </div>
                  )
                }

                if (isQuestion || isTask) {
                  return (
                    <div key={idx} className="rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold flex-shrink-0">📝</span>
                        <div className="flex-1">
                          <div className="text-sm leading-relaxed text-gray-800">
                            <MathText text={trimmedLine} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (isAnswer) {
                  return (
                    <div key={idx} className="rounded-lg ml-6">
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                        <div className="flex-1 text-sm leading-relaxed text-gray-800">
                          <MathText text={trimmedLine} />
                        </div>
                      </div>
                    </div>
                  )
                }

                // Regular line (Expected Outcome, Assessment Criteria descriptions, etc.)
                return (
                  <div key={idx} className="text-gray-700 text-sm pl-2">
                    <MathText text={trimmedLine} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      const isLongText = currentValue.includes("###") || currentValue.includes("**") ||
        currentValue.includes("\n") || currentValue.includes("\\n") ||
        currentValue.length > 100

      if (isLongText) {
        // Check if content contains a table - if so, render it as a table
        if (containsMarkdownTable(currentValue)) {
          return isEditing ? (
            <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
              <MathLiveInput
                value={currentValue}
                onChange={(newValue) => updateNestedValue(newValue)}
                placeholder="Enter markdown table..."
                className="w-full"
                multiline={true}
              />
            </div>
          ) : (
            <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
              <MathText text={currentValue} />
            </div>
          )
        }

        // Parse the content to extract bullet points
        const normalized = currentValue.replace(/\\n/g, '\n').trim()
        const lines = normalized.split('\n').filter(line => line.trim())

        // Helper function to update a specific line
        const updateLine = (lineIndex: number, newLineValue: string) => {
          const newLines = [...lines]
          newLines[lineIndex] = newLineValue
          const updatedValue = newLines.join('\n')
          updateNestedValue(updatedValue)
        }

        if (isEditing) {
          return (
            <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
              <div className="space-y-2">
                {lines.map((line, idx) => {
                  const trimmedLine = line.trim()
                  if (!trimmedLine) return null

                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="text-purple-600 font-bold flex-shrink-0 pt-1.5">•</span>
                      <div className="flex-1 min-w-0">
                        <div className="lesson-planner-math-input-wrapper">
                          <MathLiveInput
                            value={trimmedLine}
                            onChange={(newValue) => updateLine(idx, newValue)}
                            placeholder="Enter bullet point..."
                            className="w-full"
                            multiline={false}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        // Display mode - show with bullet points
        return (
          <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
            <FormattedText text={currentValue} showBullets={true} />
          </div>
        )
      }

      return isEditing ? (
        <MathLiveInput
          value={currentValue}
          onChange={(newValue) => updateNestedValue(newValue)}
          placeholder="Enter text with LaTeX..."
          className="w-full"
          multiline={false}
        />
      ) : (
        <div className="text-sm text-gray-800 shadow-sm p-3 rounded-lg border border-gray-200 bg-white">
          <MathRenderer content={currentValue} className="text-sm" />
        </div>
      )
    }

    if (Array.isArray(currentValue)) {
      const isWebResourcesArray = path.length > 0 && path[path.length - 1].toLowerCase().includes("web") &&
        path[path.length - 1].toLowerCase().includes("resource")

      if (isWebResourcesArray) {
        return (
          <div className="space-y-3 mt-2">
            {currentValue.map((item, index) => {
              if (typeof item === "string" && /^https?:\/\/.+/.test(item.trim())) {
                return (
                  <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <a
                      href={item}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-2 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="break-all">{item}</span>
                    </a>
                  </div>
                )
              }
              return (
                <div key={index} className="bg-white">
                  {renderEditableValue(item, [...path, index.toString()], level + 1)}
                </div>
              )
            })}
          </div>
        )
      }

      return (
        <div className="space-y-4 mt-2">
          {currentValue.map((item, index) => (
            <div key={index} className="bg-white">
              {renderEditableValue(item, [...path, index.toString()], level + 1)}
            </div>
          ))}
        </div>
      )
    }

    if (typeof currentValue === "object") {
      return (
        <div className="space-y-4 mt-2">
          {Object.entries(currentValue).map(([key, val]) => {
            if (val === undefined || val === null) return null

            const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
            const isTopLevel = level === 0

            return (
              <div key={key} className={`${isTopLevel ? "bg-white overflow-hidden" : "bg-white rounded-lg"}`}>
                <div
                  className={`px-3 sm:px-4 py-2 sm:py-3 ${isTopLevel ? "bg-gradient-to-r from-purple-100 to-violet-100 rounded-lg border border-purple-200" : "bg-gradient-to-r from-purple-100 to-violet-100 rounded-lg border border-purple-200"}`}
                >
                  <div className="flex items-center gap-2">
                    {isTopLevel && (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-2 h-2 sm:w-3 sm:h-3 text-purple-600" />
                      </div>
                    )}
                    <h3
                      className={`${isTopLevel ? "text-sm sm:text-base font-semibold" : "text-xs sm:text-sm font-medium"} text-gray-900`}
                    >
                      {formattedKey}
                    </h3>
                  </div>
                </div>
                <div className="p-3 sm:p-3">{renderEditableValue(val, [...path, key], level + 1)}</div>
              </div>
            )
          })}
        </div>
      )
    }

    return <span className="text-sm text-gray-700">{String(currentValue)}</span>
  }

  const extractLectures = (data: any) => {
  if (!data) return []

  const lectures = []

  if (Array.isArray(data)) {
    // If data is an array, check if it contains multiple lesson plans
    // Each item should be a complete lesson object with substantial structure
    data.forEach((lesson, index) => {
      // Only treat as multiple lectures if each item is a substantial object
      if (typeof lesson === "object" && lesson !== null && Object.keys(lesson).length > 5) {
        lectures.push({
          key: `lecture_${index + 1}`,
          title: `Lecture ${index + 1}`,
          content: lesson,
        })
      }
    })
    
    // If we didn't find multiple substantial lesson objects, treat as single lesson
    if (lectures.length === 0) {
      lectures.push({
        key: "lesson_plan",
        title: "Lesson Plan",
        content: data.length === 1 ? data[0] : data,
      })
    }
  } else if (typeof data === "object") {
    // Look for explicit numbered lecture keys like "Lecture_1", "Lecture_2", etc.
    const lectureKeys = Object.keys(data).filter((key) => {
      const lowerKey = key.toLowerCase()
      // Match patterns like: lecture_1, lecture1, lesson_1, lesson1
      return /^(lecture|lesson)_?\d+$/i.test(lowerKey)
    })

    if (lectureKeys.length > 0) {
      // We found multiple numbered lectures
      lectureKeys.forEach((key) => {
        lectures.push({
          key,
          title: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          content: data[key],
        })
      })
    } else {
      // This is a single lesson plan object - display it as one
      lectures.push({
        key: "lesson_plan",
        title: "Lesson Plan",
        content: data,
      })
    }
  }

  return lectures
}

  const handleEdit = async () => {
    try {
      if (!isEditing) {
        let dataToEdit = response.data?.data || response.data

        if (Array.isArray(dataToEdit) && dataToEdit.length === 1 && typeof dataToEdit[0] === "object") {
          dataToEdit = dataToEdit[0]
        }

        const clonedData = cloneDeep(dataToEdit)
        setEditableData(clonedData)
        setHasUnsavedEdits(false)

        setTimeout(() => {
          setIsEditing(true)
        }, 0)
      } else {
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

          if (formRef?.current?.updateLastApiResponse) {
            try {
              formRef.current.updateLastApiResponse(editableData)
            } catch (formError) {
              console.warn("Error updating form reference:", formError)
            }
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
            description: "Lesson plan updated successfully.",
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
    let dataToReset = response.data?.data || response.data

    if (Array.isArray(dataToReset) && dataToReset.length === 1 && typeof dataToReset[0] === "object") {
      dataToReset = dataToReset[0]
    }

    setEditableData(cloneDeep(dataToReset))
    setIsEditing(false)
    setHasUnsavedEdits(false)
  }

  if (response.loading) {
    return <ResponseLoader />
  }

  if (response.error) {
    return (
      <div className="w-full p-6 text-red-600 bg-red-50 rounded-xl border border-red-200">
        <div className="flex items-center gap-2 mb-2">
          <X className="w-5 h-5" />
          <h3 className="font-semibold">Error</h3>
        </div>
        <p className="text-sm">{response.error}</p>
      </div>
    )
  }

  // When editing, ensure each lecture has its own isolated data
  const getLectureData = (lecture: { key: string; title: string; content: any }) => {
    if (!isEditing || !editableData) {
      return lecture.content
    }

    // Extract lectures from editableData to get the current state
    const editableLectures = extractLecturesInline(editableData)
    const foundLecture = editableLectures.find(l => l.key === lecture.key)
    
    if (foundLecture) {
      return foundLecture.content
    }

    // Fallback to original lecture content
    return lecture.content
  }
  
  // Create a wrapper for renderEditableValue that handles lecture-specific updates
  const renderLectureContent = (lecture: { key: string; title: string; content: any }) => {
    const lectureData = getLectureData(lecture)
    
    // Override updateNestedValue to update the specific lecture
    const originalRenderEditableValue = renderEditableValue
    const renderWithLectureUpdate = (value: any, path: string[] = [], level = 0): React.ReactNode => {
      const getCurrentValue = () => {
        if (!isEditing || !editableData) return value
        if (path.length === 0) return value

        let current = editableData
        for (const pathSegment of path) {
          if (current && typeof current === "object" && pathSegment in current) {
            current = current[pathSegment]
          } else {
            return value
          }
        }
        return current
      }

      const currentValue = getCurrentValue()

      const updateNestedValue = (newValue: any) => {
        setEditableData((prevData: any) => {
          if (!prevData) return prevData
          
          const newData = cloneDeep(prevData)
          
          // If path is empty, we're updating the entire lecture
          if (path.length === 0) {
            const editableLectures = extractLecturesInline(newData)
            const lectureIndex = editableLectures.findIndex(l => l.key === lecture.key)
            
            if (lectureIndex >= 0) {
              if (Array.isArray(newData)) {
                newData[lectureIndex] = newValue
              } else if (typeof newData === "object" && lecture.key in newData) {
                newData[lecture.key] = newValue
              } else {
                // Reconstruct
                const updatedLectures = [...editableLectures]
                updatedLectures[lectureIndex] = { ...updatedLectures[lectureIndex], content: newValue }
                if (Array.isArray(prevData)) {
                  return updatedLectures.map(l => l.content)
                } else {
                  const reconstructed: any = {}
                  updatedLectures.forEach(l => {
                    reconstructed[l.key] = l.content
                  })
                  return reconstructed
                }
              }
            }
            return newData
          }

          // For nested paths, update normally but ensure we're in the right lecture
          let current = newData
          for (let i = 0; i < path.length - 1; i++) {
            if (current[path[i]] === undefined) {
              current[path[i]] = {}
            }
            current = current[path[i]]
          }
          current[path[path.length - 1]] = newValue
          return newData
        })
        setHasUnsavedEdits(true)
      }

      // Use the original renderEditableValue logic but with custom update
      return originalRenderEditableValue(value, path, level)
    }
    
    return renderWithLectureUpdate(lectureData, [], 0)
  }

  const currentExecutionToken = executionToken
  const currentagent_id = agent_id
  const currentagent_name = 'lesson-planner'

  return (
    <>
      <style jsx global>{lessonPlannerMathInputStyles}</style>
      <div
        ref={responseContainerRef}
        id="lesson-plan-response"
        className="w-full max-w-7xl space-y-4 sm:space-y-6"
      >
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-visible">        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {chapterOrTopicName ? `${chapterOrTopicName} - Lesson Plan` : "Lesson Plan Results"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">AI-powered lesson planning insights</p>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto items-center">
            {currentExecutionToken && currentagent_id && (
              <ShareButton agentId={currentagent_id} executionToken={currentExecutionToken} agentName={currentagent_name} />
            )}

            <Button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF || isEditing}
              className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md text-xs sm:text-sm px-3 sm:px-4 py-2 flex-1 sm:flex-none disabled:opacity-50 whitespace-nowrap"
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
                className="flex items-center gap-2 text-gray-600 border-gray-200 hover:bg-gray-50 bg-transparent text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap flex-1 sm:flex-none"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                Cancel
              </Button>
            )}
            <Button
              onClick={handleEdit}
              variant={isEditing ? "default" : "outline"}
              disabled={isSaving}
              className={`flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap flex-1 sm:flex-none ${isEditing
                ? "bg-blue-600 hover:bg-blue-700 text-white"
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

        <div className="p-4 sm:p-6 overflow-visible">
          {lectures.length > 1 ? (
            <Tabs 
              value={activeTab || lectures[0]?.key} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList
                className={`grid w-full mb-4 sm:mb-6 ${lectures.length <= 2
                  ? "grid-cols-2"
                  : lectures.length <= 3
                    ? "grid-cols-3"
                    : lectures.length <= 4
                      ? "grid-cols-4"
                      : "grid-cols-5"
                  }`}
              >
                {lectures.map((lecture) => (
                  <TabsTrigger key={lecture.key} value={lecture.key} className="text-xs sm:text-sm">
                    {lecture.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {lectures.map((lecture) => (
                <TabsContent key={lecture.key} value={lecture.key} className="mt-0">
                  <div className="overflow-visible">
                    {renderEditableValue(getLectureData(lecture), [lecture.key])}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="overflow-visible">
              {renderEditableValue(dataToDisplay)}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-visible">
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
      {/* Global loader while generating PDF */}
      <PopupLoader open={isGeneratingPDF} label="Generating PDF…" />
    </div>
    </>
  )
}

export default FormattedResponse