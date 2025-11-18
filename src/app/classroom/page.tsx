"use client"

// Polyfill for crypto.randomUUID on mobile browsers
if (typeof globalThis !== 'undefined' && !globalThis.crypto?.randomUUID) {
    if (!globalThis.crypto) {
        (globalThis as { crypto?: Crypto }).crypto = {} as Crypto
    }
    (globalThis.crypto as Crypto & { randomUUID?: () => `${string}-${string}-${string}-${string}-${string}` }).randomUUID = (() => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3 | 0x8)
            return v.toString(16)
        }) as `${string}-${string}-${string}-${string}-${string}`
    })
}

import { fetchWithAuth } from '@/lib/apiClient'
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { withProtectedRoute } from "@/components/ProtectedRoute"
import { Room } from "livekit-client"
import {
    RoomAudioRenderer,
    RoomContext,
    StartAudio,
    useRoomContext,
    useChat,
    VideoTrack,
    useLocalParticipant,
    type ReceivedChatMessage,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import { useAgentControlBar } from "@/components/livekit/agent-control-bar/hooks/use-agent-control-bar"
import useConnectionDetails from "@/hooks/useConnectionDetails"
import useChatAndTranscription from "@/hooks/useChatAndTranscription"
import {
    ChevronDown,
    ChevronRight,
    X,
    Send,
    Mic,
    MicOff,
    Video,
    VideoOff,
    MonitorUp,
    PhoneOff,
    FileText,
    BookOpen,
    ArrowLeft,
    Clock,
    RefreshCw,
    Image as ImageIcon,
} from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"
import Image from "next/image"
import Logo from "@/assets/create-profile/LeoQuiIconBall.png"
import LeoCoin from "@/assets/Coin.png"
import ComputerImg from "@/assets/ComputerImg.svg"
import EnglishImg from "@/assets/EnglishImg.svg"
import HindiImg from "@/assets/HindiImg.svg"
import MathsImg from "@/assets/MathsImg.svg"
import ScienceImg from "@/assets/ScienceImg.svg"
import FrameBg from "@/assets/Frame100000.png"
import AskQuestionsImg from "@/assets/AskQuestionsImg.svg"
import HomeWorkImg from "@/assets/HomeWorkImg.svg"
import LPGImg from "@/assets/EnglishImg.svg"
import StudyNotesImg from "@/assets/StudyNotesImg.svg"
import { AudioNoteSummarizerLoader } from "@/components/loader"
import type { AppConfig } from "@/hooks/useConnectionDetails"
import { Tabs } from '@/components/Tabs'
import { HistorySkeleton } from '@/components/HistorySkeleton';
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import { SingleThreadSkeleton } from '@/components/SingleThreadSkeleton'
import { SubjectsSkeleton } from '@/components/SubjectsSkeleton'
import { MobileControlBar } from '@/components/MobileControlBar'

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Types
type Profile = {
    profile_id: string
    last_name: string
    student_name?: string
    grade: string
    gender?: string
    days_streak?: number
    user_id: string
    first_name: string
    user_type: string
    board: string
    date_of_birth?: string
    phone_no?: string
    email?: string
    remaining_creds: number
    profile_completed: boolean
}

// Lesson / instructional plan types (replace loose `any` usages)
type InstructionalPlan = {
    Introduction?: string
    Main_Teaching_Points?: string
    Interactive_Activities?: string
    [key: string]: string | undefined
}

type Lesson = {
    Lesson_Topic?: string
    Learning_Objectives?: string
    Learning_Outcomes?: string
    Materials_Required?: string
    Prerequisite_Competencies?: string
    Prerequisite_Competency_Quiz_Questions_and_Answers?: string
    Step_by_Step_Instructional_Plan?: InstructionalPlan | null
    Higher_Order_Thinking_Skills_HOTS?: string
    Curriculum_Integration_and_Multidisciplinary_Perspectives?: string
    Complex_Concepts_Teaching_Iterations?: string
    Real_Life_Applications?: string
    Enhanced_Recall_through_Repetition?: string
    Summary_of_the_Lesson?: string
    Home_Assessments?: string
    Additional_Considerations?: string
    Web_Resources?: string[]
    'Quiz_/_Assignment'?: Array<{ Quiz?: string; Assignment?: string }>
    [key: string]: unknown
}

const studyOptions = [
    {
        img: HomeWorkImg,
        title: "Start Learning",
        description: "Learn this chapter interactively with LeoQui, your voice tutor.",
    },
    {
        img: AskQuestionsImg,
        title: "Ask Doubts",
        description: "Get instant answers to your questions.",
    },
    {
        img: StudyNotesImg,
        title: "Assessments",
        description: "Take a short exam to check your progress.",
    },
    {
        img: LPGImg,
        title: "Generate Lesson Plan",
        description: "Auto-generate NEP-aligned lesson plans for your class.",
    },
]

// Helper to get subject image
const getSubjectImage = (rawName: string) => {
    const name = (rawName || "").toLowerCase()
    if (/(math|mathematics|arith)/.test(name)) return MathsImg
    if (/computer|informatics|it|ict/.test(name)) return ComputerImg
    if (/hindi/.test(name)) return HindiImg
    if (/english|language arts/.test(name)) return EnglishImg
    if (/science|sci/.test(name)) return ScienceImg
    return EnglishImg
}

// Helper to convert text content into bullet points
const formatAsBulletPoints = (text: string): string[] => {
    if (!text) return []

    const points = text
        .split(/\n+/)
        .map(point => point.trim())
        .filter(point => point.length > 0)
        .map(point => {
            // Remove leading numbers, bullets, dashes, etc
            return point.replace(/^[\d•\-\*]\s*\.?\s*/, '').trim()
        })
        .filter(point => point.length > 0 && !point.match(/^(Allocated time|Time allocation)/i))

    return points
}

// MathText component for proper math rendering
const MathText: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null
    const normalized = convertLatexNotation(text)
    return (
        <div className="math-text-wrapper">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    p: ({ children }) => <span>{children}</span>,
                    div: ({ children }) => <span>{children}</span>,
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
            `}</style>
        </div>
    )
}

// Enhanced Formatted Text Component with emojis like ai-agents-assistants
const FormattedText: React.FC<{ text: string; showBullets?: boolean }> = ({ text, showBullets = true }) => {
    if (!text) return null

    const normalized = text.replace(/\\n/g, '\n').trim()
    const lines = normalized.split('\n').filter(line => line.trim())

    if (lines.length === 0) return null

    return (
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
                        <div key={idx} className="font-semibold text-[#714B90] text-base mt-2 mb-1">
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

                // Regular line with bullet points if showBullets is true
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

function QuizAssignmentRenderer({
    quizData,
}: {
    quizData: Array<{ Quiz?: string; Assignment?: string }>
    lessonIndex: number
}) {
    if (!quizData || quizData.length === 0) return null

    return (
        <div className="space-y-6 mt-6">
            {quizData.map((item, idx) => {
                const quizVal = item.Quiz
                const assignVal = item.Assignment

                return (
                    <div key={idx} className="space-y-6">
                        {/* Quiz Section */}
                        {quizVal && (
                            <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
                                <h4 className="text-lg font-bold text-gray-900 mb-3 pb-3 border-b border-gray-300 flex items-center gap-2">
                                    Quiz
                                </h4>
                                <FormattedText text={quizVal} showBullets={true} />
                            </div>
                        )}

                        {/* Assignment Section */}
                        {assignVal && (
                            <div className="rounded-lg p-4 border border-gray-200 shadow-sm bg-white">
                                <h4 className="text-lg font-bold text-gray-900 mb-3 pb-3 border-b border-gray-300 flex items-center gap-2">
                                    Assignment
                                </h4>
                                <FormattedText text={assignVal} showBullets={true} />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function BulletPointsSection({
    title,
    content
}: {
    title: string
    content: unknown
}) {
    if (!content) return null

    const points = formatAsBulletPoints(String(content))
    if (points.length === 0) return null

    return (
        <div className={title ? "mb-6" : "mb-0"}>
            {title && (
                <h4 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    {title}
                </h4>
            )}
            <ul className={`space-y-2 ${title ? "" : ""}`}>
                {points.map((point, i) => (
                    <li key={i} className="flex gap-3 items-start">
                        <span className="text-[#714B90] flex-shrink-0 mt-0.5">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed flex-1">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    p: ({ children }) => <span>{children}</span>,
                                    div: ({ children }) => <span>{children}</span>,
                                }}
                            >
                                {convertLatexNotation(point)}
                            </ReactMarkdown>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// Helper to render a single lesson object with all expected sections
// Render a single lesson — typed as `Lesson` instead of `any`
function RenderLesson({ lesson, index }: { lesson: Lesson; index: number }) {
    const renderMarkdown = (content: unknown) => (
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({ children }) => <span>{children}</span>, div: ({ children }) => <span>{children}</span> }}>
            {convertLatexNotation(String(content || ''))}
        </ReactMarkdown>
    )

    return (
        <div className="bg-white p-5 rounded-lg">
            <h3 className="font-bold text-xl text-[#714B90] mb-6 pb-3 border-b-1 border-[#714B90]">
                {renderMarkdown(`Lesson ${index + 1}: ${String(lesson.Lesson_Topic || '')}`)}
            </h3>

            <div className="space-y-6 text-gray-700">
                {/* Learning Objectives */}
                {lesson.Learning_Objectives && (
                    <BulletPointsSection
                        title="Learning Objectives"
                        content={lesson.Learning_Objectives}
                    />
                )}

                {/* Learning Outcomes */}
                {lesson.Learning_Outcomes && (
                    <BulletPointsSection
                        title="Learning Outcomes"
                        content={lesson.Learning_Outcomes}
                    />
                )}

                {/* Materials Required */}
                {lesson.Materials_Required && (
                    <BulletPointsSection
                        title="Materials Required"
                        content={lesson.Materials_Required}
                    />
                )}

                {/* Prerequisite Competencies */}
                {lesson.Prerequisite_Competencies && (
                    <BulletPointsSection
                        title="Prerequisite Competencies"
                        content={lesson.Prerequisite_Competencies}
                    />
                )}

                {/* Prerequisite Quiz */}
                {lesson.Prerequisite_Competency_Quiz_Questions_and_Answers && (
                    <div className="rounded-lg p-3 border border-gray-200 shadow-sm bg-white">
                        <h4 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                            Prerequisite Quiz Questions & Answers
                        </h4>
                        <FormattedText text={String(lesson.Prerequisite_Competency_Quiz_Questions_and_Answers)} showBullets={true} />
                    </div>
                )}

                {/* Instructional Plan */}
                {Boolean(lesson.Step_by_Step_Instructional_Plan) && typeof lesson.Step_by_Step_Instructional_Plan === 'object' && lesson.Step_by_Step_Instructional_Plan !== null && (
                    <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                            Step-by-Step Instructional Plan
                        </h4>
                        <div className="space-y-5">
                            {lesson.Step_by_Step_Instructional_Plan?.Introduction && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <h5 className="font-semibold text-gray-900 text-sm">
                                        Introduction
                                    </h5>
                                    <BulletPointsSection
                                        title=""
                                        content={lesson.Step_by_Step_Instructional_Plan.Introduction}
                                    />
                                </div>
                            )}

                            {lesson.Step_by_Step_Instructional_Plan?.Main_Teaching_Points && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <h5 className="font-semibold text-gray-900 text-sm">
                                        Main Teaching Points
                                    </h5>
                                    <BulletPointsSection
                                        title=""
                                        content={lesson.Step_by_Step_Instructional_Plan.Main_Teaching_Points}
                                    />
                                </div>
                            )}

                            {lesson.Step_by_Step_Instructional_Plan?.Interactive_Activities && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <h5 className="font-semibold text-gray-900 text-sm">
                                        Interactive Activities
                                    </h5>
                                    <BulletPointsSection
                                        title=""
                                        content={lesson.Step_by_Step_Instructional_Plan.Interactive_Activities}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* HOTS */}
                {lesson.Higher_Order_Thinking_Skills_HOTS && (
                    <BulletPointsSection
                        title="Higher Order Thinking Skills (HOTS)"
                        content={lesson.Higher_Order_Thinking_Skills_HOTS}
                    />
                )}

                {/* Curriculum Integration */}
                {lesson.Curriculum_Integration_and_Multidisciplinary_Perspectives && (
                    <BulletPointsSection
                        title="Curriculum Integration and Multidisciplinary Perspectives"
                        content={lesson.Curriculum_Integration_and_Multidisciplinary_Perspectives}
                    />
                )}

                {/* Complex Concepts */}
                {lesson.Complex_Concepts_Teaching_Iterations && (
                    <BulletPointsSection
                        title="Complex Concepts - Teaching Iterations"
                        content={lesson.Complex_Concepts_Teaching_Iterations}
                    />
                )}

                {/* Real Life Applications */}
                {lesson.Real_Life_Applications && (
                    <BulletPointsSection
                        title="Real Life Applications"
                        content={lesson.Real_Life_Applications}
                    />
                )}

                {/* Enhanced Recall */}
                {lesson.Enhanced_Recall_through_Repetition && (
                    <BulletPointsSection
                        title="Enhanced Recall through Repetition"
                        content={lesson.Enhanced_Recall_through_Repetition}
                    />
                )}

                {/* Summary */}
                {lesson.Summary_of_the_Lesson && (
                    <BulletPointsSection
                        title="Summary of the Lesson"
                        content={lesson.Summary_of_the_Lesson}
                    />
                )}

                {/* Home Assessments */}
                {lesson.Home_Assessments && (
                    <BulletPointsSection
                        title="Home Assessments"
                        content={lesson.Home_Assessments}
                    />
                )}

                {/* Additional Considerations */}
                {lesson.Additional_Considerations && (
                    <BulletPointsSection
                        title="Additional Considerations"
                        content={lesson.Additional_Considerations}
                    />
                )}

                {/* Web Resources */}
                {lesson.Web_Resources && Array.isArray(lesson.Web_Resources) && lesson.Web_Resources.length > 0 && (
                    <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                            Web Resources
                        </h4>
                        <div className="space-y-2">
                            {(lesson.Web_Resources as string[]).map((url: string, i: number) => (
                                <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#714B90] hover:underline block text-sm break-words"
                                >
                                    {url}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quiz and Assignment */}
                {lesson['Quiz_/_Assignment'] && Array.isArray(lesson['Quiz_/_Assignment']) && lesson['Quiz_/_Assignment'].length > 0 && (
                    <QuizAssignmentRenderer
                        quizData={lesson['Quiz_/_Assignment']}
                        lessonIndex={index}
                    />
                )}
            </div>
        </div>
    )
}

function MobileDrawer({
    isOpen,
    onClose,
    title,
    children
}: {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] overflow-hidden animate-slide-up">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-2">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                <div className="overflow-y-auto p-0 max-h-[calc(80vh-64px)] mobile-safe-area-bottom">
                    {children}
                </div>
            </div>
        </div>
    )
}

function MobileHistoryDrawer({
    isOpen,
    onClose,
    title,
    children,
    onRefresh,
    isLoading
}: {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    onRefresh: () => void
    isLoading: boolean
}) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Drawer - slides in from right */}
            <div className="absolute top-0 right-0 bottom-0 w-full max-w-xs sm:max-w-sm bg-white shadow-xl overflow-hidden animate-slide-in-right">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center z-10">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onRefresh} 
                            disabled={isLoading}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh History"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={onClose} className="p-2">
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
                <div className="overflow-y-auto p-0 h-[calc(100vh-64px)] bg-gray-50 mobile-safe-area-bottom mobile-scroll-container">
                    {children}
                </div>
            </div>
        </div>
    )
}

const Classroom = () => {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [subjects, setSubjects] = useState<string[]>([])
    const [subjectsLoading, setSubjectsLoading] = useState(false)
    const [subjectsError, setSubjectsError] = useState<string | null>(null)
    const [selectedSubject, setSelectedSubject] = useState<string>("")
    const [chapters, setChapters] = useState<{ number: string; title: string }[]>([])
    const [chaptersLoading, setChaptersLoading] = useState(false)
    const [chaptersError, setChaptersError] = useState<string | null>(null)
    const [selectedChapter, setSelectedChapter] = useState<{ number: string; title: string } | null>(null)
    const [callOpen, setCallOpen] = useState(false)
    const room = useMemo(() => new Room(), [])
    const [connecting, setConnecting] = useState(false)
    const appConfig = {
        board: profile?.board || "CBSE",
        grade: profile?.grade || "",
        subject: selectedSubject || "",
        chapter: selectedChapter?.number || "", // pass chapter number only
        participantIdentity: profile?.profile_id || "string",
        thread: "string",
    }
    const { fetchConnectionDetailsWithConfig } = useConnectionDetails(appConfig)
    const [loading, setLoading] = useState(true)
    const [sidebarWidth, setSidebarWidth] = useState(288)
    const sidebarRef = useRef(null)
    const isDragging = useRef(false)
    const [firstMessageArrived, setFirstMessageArrived] = useState(false)

    // Remove static activityHistory and add state for threads
    const [threads, setThreads] = useState<ThreadObject[]>([])
    const [threadsLoading, setThreadsLoading] = useState(false)
    const [threadsError, setThreadsError] = useState<string | null>(null)

    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
    const [threadHistory, setThreadHistory] = useState<ThreadMessage[]>([])
    const [loadingThread, setLoadingThread] = useState(false)
    const [showContinueButton, setShowContinueButton] = useState(false)
    const [studyMode, setStudyMode] = useState<'ask' | 'learn' | 'historical' | null>(null)
    
    // State to track sent images for display in chat
    const [sentImages, setSentImages] = React.useState<Array<{ id: string; dataUrl: string; timestamp: number; associatedText?: string | null }>>([])

    // Lesson Plan States
    const [showLessonPlanModal, setShowLessonPlanModal] = useState(false)
    const [lessonPlanFormData, setLessonPlanFormData] = useState({
        numberOfLectures: 1,
        durationOfLecture: 30,
    })
    const [lessonPlanData, setLessonPlanData] = useState<
        { generated_output?: Record<string, unknown>[] } | Record<string, unknown>[] | null
    >(null)
    const [lessonPlanLoading, setLessonPlanLoading] = useState(false)
    const [viewingLessonPlan, setViewingLessonPlan] = useState(false)

    // Assessment States
    const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null)
    const [assessmentLoading, setAssessmentLoading] = useState(false)
    const [viewingAssessment, setViewingAssessment] = useState(false)
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
    const [submittingAssessment, setSubmittingAssessment] = useState(false)
    const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null)
    const [viewingAssessmentResult, setViewingAssessmentResult] = useState(false)
    const [historicalAssessmentData, setHistoricalAssessmentData] = useState<AssessmentData | null>(null)
    const [viewingHistoricalAssessment, setViewingHistoricalAssessment] = useState(false)
    const [isViewingHistoricalResult, setIsViewingHistoricalResult] = useState(false)

    // Add these new states after existing useState declarations
    const [micMode, setMicMode] = useState<'ptt' | 'alwaysOn'>('ptt') // Default to Push-to-Talk
    const [isVKeyPressed, setIsVKeyPressed] = useState(false)
    const [isMicButtonHeld, setIsMicButtonHeld] = useState(false)

    const prevChapterRef = useRef<string | null>(null)
    const fetchThreadsAbortRef = useRef<AbortController | null>(null)

    const [showSubjectsDrawer, setShowSubjectsDrawer] = useState(false)
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
    const [showChaptersDrawer, setShowChaptersDrawer] = useState(false)

    // Mobile flow states - true means show chapters list, false means show options screen
    const [showMobileChaptersList, setShowMobileChaptersList] = useState(true)
    const [userTimeZone, setUserTimeZone] = useState(() => {
        if (typeof window === "undefined") {
            return "UTC"
        }
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        } catch {
            return "UTC"
        }
    })

    useEffect(() => {
        if (typeof window === "undefined") {
            return
        }
        try {
            const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
            if (resolvedTimeZone) {
                setUserTimeZone(resolvedTimeZone)
            }
        } catch {
            // If resolving the timezone fails, keep the current value (default UTC)
        }
    }, [])

    const historyDateTimeFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: userTimeZone,
            }),
        [userTimeZone],
    )

    const formatThreadTimestamp = useCallback(
        (updatedAt: string) => {
            if (!updatedAt) {
                return ""
            }

            const hasTimeZoneInfo = /([zZ]|[+-]\d{2}:?\d{2})$/.test(updatedAt)
            const normalizedTimestamp = hasTimeZoneInfo ? updatedAt : `${updatedAt}Z`
            const parsedDate = new Date(normalizedTimestamp)

            if (Number.isNaN(parsedDate.getTime())) {
                return ""
            }

            const now = Date.now()
            const diffMs = now - parsedDate.getTime()

            if (diffMs >= 0) {
                const minute = 60 * 1000
                const hour = 60 * minute
                const day = 24 * hour

                if (diffMs < minute) {
                    return "Just now"
                }

                if (diffMs < hour) {
                    const minutesAgo = Math.floor(diffMs / minute)
                    return `${minutesAgo} ${minutesAgo === 1 ? "min" : "mins"} ago`
                }

                if (diffMs < day) {
                    const hoursAgo = Math.floor(diffMs / hour)
                    return `${hoursAgo} ${hoursAgo === 1 ? "hr" : "hrs"} ago`
                }
            }

            return historyDateTimeFormatter.format(parsedDate)
        },
        [historyDateTimeFormatter],
    )

    const resetAllViews = async () => {
        if (callOpen && room.state === "connected") {
            try {
                await room.disconnect()
            } catch (error) {
                console.error("Error disconnecting room:", error)
            }
        }

        setViewingLessonPlan(false)
        setLessonPlanData(null)
        setShowLessonPlanModal(false)
        setViewingAssessment(false)
        setViewingAssessmentResult(false)
        setViewingHistoricalAssessment(false)
        setAssessmentData(null)
        setAssessmentResult(null)
        setHistoricalAssessmentData(null)
        setUserAnswers({})
        setShowMobileChaptersList(true) // Reset to chapters list on mobile
        setIsViewingHistoricalResult(false)
        setCallOpen(false)
        setSelectedThreadId(null)
        setThreadHistory([])
        setShowContinueButton(false)
        setStudyMode(null)
        setFirstMessageArrived(false)
        setSentImages([])

        // DO NOT call refreshHistory here - let useEffect handle it
    }


    const searchParams = useSearchParams()

    // Fetch profile
    useEffect(() => {
        const userData = searchParams?.get("userData")
        async function fetchProfile() {
            try {
                const res = await fetchWithAuth("/api/get-user-profile")
                if (!res.ok) throw new Error("Failed to fetch profile")
                const data = await res.json()
                if (data?.data?.profile) {
                    setProfile(data.data.profile)
                } else {
                    // setError('Profile not found.'); // Removed
                }
            } catch {
                // setError('Error loading profile.'); // Removed
            } finally {
                setLoading(false)
            }
        }
        if (userData) {
            try {
                const parsedProfile = JSON.parse(decodeURIComponent(userData))
                setProfile(parsedProfile)
                setLoading(false)
            } catch {
                // setError('Error parsing user data.'); // Removed
                setLoading(false)
            }
        } else {
            fetchProfile()
        }
    }, [searchParams])

    // Fetch subjects when profile is loaded
    useEffect(() => {
        if (!profile) return
        setSubjectsLoading(true)
        setSubjectsError(null)
        setSubjects([])
        setSelectedSubject("")
        fetchWithAuth(`/api/dropdown-values?board=${encodeURIComponent(profile.board)}&grade=${encodeURIComponent(profile.grade)}`)
            .then((res) => res.json())
            .then((data) => {
                const list = data?.data?.data || data?.data || []
                if (Array.isArray(list) && list.length > 0) {
                    setSubjects(list)
                    const urlSubjectRaw = searchParams?.get("subject") || ""
                    if (urlSubjectRaw) {
                        const target = decodeURIComponent(urlSubjectRaw).trim().toLowerCase()
                        const exactMatch = list.find((s: string) => (s || "").trim().toLowerCase() === target)
                        const partialMatch = exactMatch || list.find((s: string) => (s || "").trim().toLowerCase().includes(target))
                        setSelectedSubject(partialMatch || list[0])
                    } else {
                        setSelectedSubject(list[0])
                    }
                } else {
                    setSubjectsError("No subjects found.")
                }
            })
            .catch(() => setSubjectsError("Failed to load subjects."))
            .finally(() => setSubjectsLoading(false))
    }, [profile, searchParams])

    // Fetch chapters when subject changes
    useEffect(() => {
        if (!profile || !selectedSubject) {
            setChapters([])
            setSelectedChapter(null)
            prevChapterRef.current = null  // Reset the ref
            return
        }

        setChaptersLoading(true)
        setChaptersError(null)
        setChapters([])
        setSelectedChapter(null)  // Don't set a default yet
        prevChapterRef.current = null

        fetchWithAuth(
            `/api/dropdown-values?board=${encodeURIComponent(profile.board)}&grade=${encodeURIComponent(profile.grade)}&subject=${encodeURIComponent(selectedSubject)}`,
        )
            .then((res) => res.json())
            .then((data) => {
                const list = data?.data?.data || data?.data || []
                if (Array.isArray(list) && list.length > 0) {
                    const parsedChapters: { number: string; title: string }[] = list.map((chapter: [string, string]) => ({
                        number: chapter[0],
                        title: chapter[1],
                    }))
                    setChapters(parsedChapters)

                    // IMPORTANT: Check URL parameter first, only fall back to first chapter if not provided
                    const urlChapterRaw = searchParams?.get("chapter") || ""
                    if (urlChapterRaw) {
                        const target = decodeURIComponent(urlChapterRaw).trim()
                        const exactMatch = parsedChapters.find((c) => c.number === target)
                        setSelectedChapter(exactMatch || parsedChapters[0])
                        prevChapterRef.current = exactMatch?.number || parsedChapters[0].number
                    } else {
                        // Only set to first chapter if no URL parameter and chapters exist
                        setSelectedChapter(parsedChapters[0])
                        prevChapterRef.current = parsedChapters[0].number
                    }
                } else {
                    setChaptersError("No chapters found.")
                }
            })
            .catch(() => setChaptersError("Failed to load chapters."))
            .finally(() => setChaptersLoading(false))
    }, [profile, selectedSubject, searchParams])

    // If the subject or chapter changes while user is in a call, automatically end the session
    useEffect(() => {
        // Only trigger when call is open and room is connected
        if (!callOpen) return
        if (room.state !== 'connected') return

        // When either selectedSubject or selectedChapter changes, perform end-session behavior
        // This covers URL-driven changes or other programmatic updates
        const handleChange = async () => {
            await resetAllViews()
        }

        // Call immediately (we already know a change happened because this effect ran)
        handleChange()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSubject, selectedChapter?.number])

    const fetchThreadsData = useCallback(async () => {
        // Guard: ensure profile is available before accessing profile.* fields
        if (!profile) {
            return
        }

        // If no chapter selected, do nothing
        if (!selectedChapter?.number) {
            return
        }

        // Abort any previous request
        if (fetchThreadsAbortRef.current) {
            fetchThreadsAbortRef.current.abort()
        }

        const abortController = new AbortController()
        fetchThreadsAbortRef.current = abortController

        // Mark which chapter we're fetching for
        const chapterBeingFetched = selectedChapter.number

        setThreadsLoading(true)
        setThreadsError(null)

        try {
            const res = await fetchWithAuth(
                `/api/livekit/get-all-threads?board=${encodeURIComponent(profile.board)}&subject=${encodeURIComponent(selectedSubject)}&grade=${encodeURIComponent(profile.grade)}&chapter=${encodeURIComponent(chapterBeingFetched)}`,
            )

            if (abortController.signal.aborted) {
                return
            }

            const data = await res.json()

            if (abortController.signal.aborted) {
                return
            }

            // CRITICAL: Only update if we're still on the same chapter
            if (selectedChapter?.number === chapterBeingFetched) {
                if (data?.status && Array.isArray(data.data)) {
                    setThreads(data.data)
                } else {
                    setThreadsError("No history found.")
                }
            }
        } catch (error: unknown) {
            const err = error as { name?: string } | undefined
            if (err?.name !== 'AbortError') {
                console.error("Error fetching threads:", error)
                // Only set error if we're still on the same chapter
                if (selectedChapter?.number === chapterBeingFetched) {
                    setThreadsError("Failed to load history.")
                }
            }
        } finally {
            if (!abortController.signal.aborted && selectedChapter?.number === chapterBeingFetched) {
                setThreadsLoading(false)
            }
        }
    }, [profile, selectedSubject, selectedChapter])

    // Fetch threads when profile and selectedSubject are available
    useEffect(() => {
        fetchThreadsData()
    }, [fetchThreadsData])

    useEffect(() => {
        return () => {
            if (fetchThreadsAbortRef.current) {
                fetchThreadsAbortRef.current.abort()
            }
        }
    }, [])

    // Refresh threads when mobile history drawer is opened
    useEffect(() => {
        if (showHistoryDrawer) {
            fetchThreadsData()
        }
    }, [showHistoryDrawer, fetchThreadsData])
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return
            const min = 180,
                max = 400
            setSidebarWidth(
                Math.min(
                    max,
                    Math.max(min, e.clientX - (sidebarRef.current as unknown as HTMLElement)?.getBoundingClientRect().left),
                ),
            )
        }

        const handleMouseUp = () => {
            isDragging.current = false
        }
        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            window.removeEventListener("mousemove", onMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [])

    const fetchThreadById = async (threadId: string, threadType = 'tutor') => {
        setLoadingThread(true)
        try {
            const res = await fetchWithAuth(
                `/api/livekit/get-thread-by-id?threadId=${threadId}&thread_type=${encodeURIComponent(threadType)}`
            )
            const data = await res.json()
            if (data.status && data.data) {
                if (threadType === 'assessment') {
                    // Handle assessment result view
                    setAssessmentResult({
                        grade: data.data.grade,
                        score_summary: data.data.score_summary,
                        teacher_feedback: data.data.teacher_feedback,
                        next_step: data.data.next_step || '',
                    })
                    // Set historical assessment data for viewing questions and answers
                    setHistoricalAssessmentData(data.data.exam_data)
                    setIsViewingHistoricalResult(true) // Mark as historical assessment
                    setViewingAssessmentResult(true)
                    setViewingAssessment(false)
                    setViewingLessonPlan(false)
                    setViewingHistoricalAssessment(false)
                    setCallOpen(false)
                    setShowMobileChaptersList(false) // Hide mobile chapters list to show assessment
                } else if (threadType === 'tutor') {
                    setSelectedThreadId(threadId)
                    setThreadHistory(data.data.thread_data || [])
                    setShowContinueButton(true)
                    setStudyMode('historical')
                    setCallOpen(true)
                    setShowMobileChaptersList(false) // Hide mobile chapters list to show call
                }
            }
        } catch (error) {
            console.error('Error fetching thread:', error)
        } finally {
            setLoadingThread(false)
        }
    }

    const refreshHistory = async () => {
        // Small delay to let server process session
        await new Promise(resolve => setTimeout(resolve, 2000))
        await fetchThreadsData()
    }

    const fetchLessonPlanById = async (planId: string) => {
        try {
            const res = await fetchWithAuth(`/api/livekit/get-thread-by-id?threadId=${planId}&thread_type=lesson_plan`)
            const data = await res.json()
            if (data.status && data.data) {
                setLessonPlanData(data.data)
                setViewingLessonPlan(true)
                setCallOpen(false)
                setShowMobileChaptersList(false) // Hide mobile chapters list to show lesson plan
            }
        } catch {
            console.error("Error fetching lesson plan")
        }
    }

    const generateLessonPlan = async () => {
        if (!profile || !selectedSubject || !selectedChapter) {
            alert("Please select a subject and chapter first.")
            return
        }

        setLessonPlanLoading(true)
        try {
            const res = await fetchWithAuth("/api/lesson-plan/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    Board: profile.board,
                    Grade: profile.grade,
                    Subject: selectedSubject,
                    Chapter_Number: selectedChapter.number,
                    Number_of_Lecture: lessonPlanFormData.numberOfLectures,
                    Duration_of_Lecture: lessonPlanFormData.durationOfLecture,
                    Class_Strength: 40,
                    Language: "English",
                    Quiz: true,
                    Assignment: true,
                }),
            })

            const data = await res.json()
            if (data.status && data.data) {
                setLessonPlanData({ generated_output: data.data })
                setShowLessonPlanModal(false)
                setViewingLessonPlan(true)
                setCallOpen(false)
                // Reset assessment states to ensure mutual exclusivity
                setViewingAssessment(false)
                setViewingAssessmentResult(false)
                setAssessmentData(null)
                setUserAnswers({})
                setAssessmentResult(null)
                // Refresh history list with the new lesson plan entry
                fetchThreadsData()
            } else {
                alert("Failed to generate lesson plan. Please try again.")
            }
        } catch (error) {
            console.error("Error generating lesson plan:", error)
            alert("Error generating lesson plan. Please try again.")
        } finally {
            setLessonPlanLoading(false)
        }
    }

    const generateAssessment = async () => {
        if (!profile || !selectedSubject || !selectedChapter) {
            alert('Please select a subject and chapter first.')
            return
        }

        setAssessmentLoading(true)
        try {
            const res = await fetchWithAuth('/api/assessment/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    board: profile.board,
                    grade: profile.grade,
                    subject: selectedSubject,
                    chapter: selectedChapter.number,
                    test_duration: 10,
                    difficulty: 'easy',
                    total_marks: 7,
                }),
            })

            const data = await res.json()
            if (data.status && data.data) {
                setAssessmentData(data.data)
                setUserAnswers({})
                setViewingAssessment(true)
                setViewingAssessmentResult(false)
                setCallOpen(false)
                // Reset lesson plan states to ensure mutual exclusivity
                setViewingLessonPlan(false)
                setLessonPlanData(null)
                setShowLessonPlanModal(false)
            } else {
                alert('Failed to generate assessment. Please try again.')
            }
        } catch (error) {
            console.error('Error generating assessment:', error)
            alert('Error generating assessment. Please try again.')
        } finally {
            setAssessmentLoading(false)
        }
    }

    const submitAssessment = async () => {
        if (!assessmentData || !profile || !selectedSubject || !selectedChapter) {
            return
        }

        setSubmittingAssessment(true)
        try {
            // Helper function to extract question number and text
            const extractQuestionData = (questions: Array<Array<Record<string, string>>>) => {
                if (!questions || questions.length === 0 || questions[0].length === 0) return []

                return questions[0].map((q) => {
                    const qNum = Object.keys(q)[0]
                    const qText = q[qNum]
                    return {
                        [qNum]: qText,
                        [`answer-${qNum}`]: userAnswers[qNum] || '',
                    }
                })
            }

            // Build exam_data structure exactly as shown in the curl example
            const examData = {
                General_Instructions: assessmentData.General_Instructions,
                MCQs: assessmentData.MCQs.length > 0 && assessmentData.MCQs[0].length > 0
                    ? [extractQuestionData(assessmentData.MCQs)]
                    : [],
                True_False_Questions: assessmentData.True_False_Questions.length > 0 && assessmentData.True_False_Questions[0].length > 0
                    ? [extractQuestionData(assessmentData.True_False_Questions)]
                    : [],
                Fill_in_the_Blanks: assessmentData.Fill_in_the_Blanks.length > 0 && assessmentData.Fill_in_the_Blanks[0].length > 0
                    ? [extractQuestionData(assessmentData.Fill_in_the_Blanks)]
                    : [],
                Very_Short_Answers: assessmentData.Very_Short_Answers.length > 0 && assessmentData.Very_Short_Answers[0].length > 0
                    ? [extractQuestionData(assessmentData.Very_Short_Answers)]
                    : [],
                Short_Answers: assessmentData.Short_Answers.length > 0 && assessmentData.Short_Answers[0].length > 0
                    ? [extractQuestionData(assessmentData.Short_Answers)]
                    : [],
                Long_Answers: assessmentData.Long_Answers.length > 0 && assessmentData.Long_Answers[0].length > 0
                    ? [extractQuestionData(assessmentData.Long_Answers)]
                    : [],
                Very_Long_Answers: assessmentData.Very_Long_Answers.length > 0 && assessmentData.Very_Long_Answers[0].length > 0
                    ? [extractQuestionData(assessmentData.Very_Long_Answers)]
                    : [],
                Case_Studies: assessmentData.Case_Studies.length > 0 && assessmentData.Case_Studies[0].length > 0
                    ? [extractQuestionData(assessmentData.Case_Studies)]
                    : [],
                Answers: assessmentData.Answers,
            }

            const res = await fetchWithAuth('/api/assessment/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    board: profile.board,
                    grade: profile.grade,
                    subject: selectedSubject,
                    chapter: selectedChapter.number,
                    exam_data: examData,
                }),
            })

            const data = await res.json()

            if (data.status && data.data) {
                setAssessmentResult(data.data)
                setViewingAssessmentResult(true)
                setViewingAssessment(false)
                // Refresh history to show new assessment
                fetchThreadsData()
            } else {
                console.error('Evaluation failed:', data)
                alert('Failed to evaluate assessment. Please try again.')
            }
        } catch (error) {
            console.error('Error submitting assessment:', error)
            alert('Error submitting assessment. Please try again.')
        } finally {
            setSubmittingAssessment(false)
        }
    }

    const handleNewConversation = async () => {
        if (!selectedSubject) {
            alert("Please select a subject before starting the call.")
            return
        }
        if (!selectedChapter) {
            alert("Please select a chapter before starting the call.")
            return
        }

        // Disconnect existing room if connected
        if (room.state === "connected") {
            try {
                await room.disconnect()
                // Give a small delay for disconnect to complete
                await new Promise(resolve => setTimeout(resolve, 500))
            } catch (e) {
                console.error("Error disconnecting previous room:", e)
            }
        }

        // Reset all states
        setCallOpen(false)
        setSelectedThreadId(null)
        setThreadHistory([])
        setShowContinueButton(false)
        setStudyMode(null)
        setFirstMessageArrived(false)
        setViewingLessonPlan(false)
        setLessonPlanData(null)
        setViewingAssessment(false)
        setViewingAssessmentResult(false)
        setAssessmentData(null)
        setAssessmentResult(null)
        setHistoricalAssessmentData(null)
        setUserAnswers({})
        setIsViewingHistoricalResult(false)

        // Now start new conversation
        setCallOpen(true)

        if (room.state === "disconnected") {
            try {
                setConnecting(true)
                const details = await fetchConnectionDetailsWithConfig({
                    username: profile?.first_name,
                    board: profile?.board,
                    grade: profile?.grade,
                    subject: selectedSubject,
                    chapter: selectedChapter?.number ?? "",
                    participantIdentity: profile?.profile_id,
                })
                await room.connect(details.serverUrl, details.participantToken)
                await room.localParticipant.setMicrophoneEnabled(false, undefined, { preConnectBuffer: true })
            } catch (e) {
                console.error("connect error", e)
                setCallOpen(false)
            } finally {
                setConnecting(false)
            }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFFBF2]">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-[#714B90] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading classroom...</p>
                </div>
            </div>
        )
    }

    if (!profile) {
        return null
    }

    const userInitials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || "U"
    // Compute main container classes so we can expand the lesson plan view
    const mainContainerClass = `
    ${callOpen ? 'max-w-full lg:max-w-3xl' :
            viewingLessonPlan || viewingAssessment || viewingAssessmentResult || viewingHistoricalAssessment
                ? 'max-w-full lg:max-w-5xl'
                : 'max-w-full lg:max-w-xl'
        } 
    w-full mx-auto relative z-10 
    ${callOpen ? '' :
            viewingLessonPlan || viewingAssessment || viewingAssessmentResult || viewingHistoricalAssessment
                ? ''
                : 'bg-[#F5F6FA] rounded-lg sm:rounded-2xl shadow-lg p-4 sm:p-6'
        } 
    ${viewingLessonPlan || viewingAssessment || viewingAssessmentResult || viewingHistoricalAssessment
            ? 'px-2 sm:px-4 md:px-6 py-2 sm:py-3'
            : 'px-2 sm:px-3 md:px-4'
        }
`
    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-1 sm:py-3 shadow-xs w-full">
                <div className="flex items-center justify-between mx-auto">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link href="/dashboard">
                            <div className="flex items-center gap-1">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                                    <Image
                                        src={Logo || "/placeholder.svg"}
                                        alt="LeoQui Logo"
                                        width={32}
                                        height={32}
                                        className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                                        priority
                                    />
                                </div>
                                <span className="text-base sm:text-lg lg:text-xl font-semibold text-[#714B90]">LeoQui</span>
                            </div>
                        </Link>
                        <div className="hidden md:flex items-center text-xs sm:text-sm text-gray-600">
                            <span>{profile.board}</span>
                            <span className="mx-2">›</span>
                            <span>Class {profile.grade}th</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
                        {/* Mobile view - show content directly */}
                        <div className="flex md:hidden items-center space-x-2">
                            <div className="flex items-center space-x-1 bg-[#714B9014] px-2 py-1 rounded-xl">
                                <Image
                                    src={LeoCoin || "/placeholder.svg"}
                                    alt="LeoCoin"
                                    width={20}
                                    height={20}
                                    className="w-5 h-5 object-contain"
                                    priority
                                />
                                <span className="font-semibold text-black text-sm">{profile.remaining_creds}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <div className="w-6 h-6 bg-[#714B90] rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-medium">{userInitials}</span>
                                </div>
                            </div>
                        </div>

                        {/* Desktop view */}
                        <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
                            <span className="text-gray-600">Contact us</span>
                            <div className="flex items-center space-x-1 bg-[#714B9014] px-2 py-1 rounded-xl">
                                <Image
                                    src={LeoCoin || "/placeholder.svg"}
                                    alt="LeoCoin"
                                    width={20}
                                    height={20}
                                    className="w-5 h-5 object-contain"
                                    priority
                                />
                                <span className="font-semibold text-black">{profile.remaining_creds}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-[#714B90] rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">{userInitials}</span>
                                </div>
                                <span className="text-gray-900">Accounts</span>
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Row */}
            <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
                {/* Subjects Sidebar */}
                <aside className="hidden lg:flex w-60 bg-gradient-to-b from-[#f5f3ff] to-[#f8fbfc] border-r border-gray-200 flex-col py-4 lg:py-6 px-3 lg:px-4 gap-3 lg:gap-4 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
                    <div className="px-2">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#714B90]/80">Subjects</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
                        {subjectsLoading ? (
                            <SubjectsSkeleton />
                        ) : subjectsError ? (
                            <div className="text-[#714B90] text-xs px-2">{subjectsError}</div>
                        ) : (
                            <div className="space-y-2">
                                {subjects.map((subject) => {
                                    const isSelected = subject === selectedSubject
                                    return (
                                        <button
                                            key={subject}
                                            onClick={() => {
                                                setSelectedSubject(subject)
                                                resetAllViews()
                                            }}
                                            className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 transition-all duration-200 ${isSelected
                                                ? "bg-white shadow-[0_6px_18px_rgba(113,75,144,0.12)]"
                                                : "bg-transparent hover:bg-white/70"
                                                }`}
                                        >
                                            <div
                                                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors ${isSelected ? "border-[#714B90] bg-white" : "border-transparent bg-white/60"
                                                    }`}
                                            >
                                                <Image
                                                    src={getSubjectImage(subject) || "/placeholder.svg"}
                                                    alt={subject}
                                                    width={40}
                                                    height={40}
                                                    className="w-10 h-10 object-contain"
                                                />
                                            </div>
                                            <span
                                                className={`flex-1 text-left text-sm font-medium leading-snug ${isSelected ? "text-[#3d2758]" : "text-[#4b4b63]"}`}
                                            >
                                                {subject}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Mobile Subjects & Chapters Buttons - Only show on tablets (sm) and up, not on mobile phones */}
                <div className="hidden sm:flex lg:hidden gap-2 px-2 sm:px-3 py-1 bg-white border-b border-gray-200">
                    <button
                        onClick={() => setShowSubjectsDrawer(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-1 bg-[#f5f3ff] hover:bg-[#ede9ff] rounded-lg text-sm font-medium text-[#714B90] transition-colors"
                    >
                        <span className="truncate">{selectedSubject || "Select Subject"}</span>
                    </button>
                    <button
                        onClick={() => setShowChaptersDrawer(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                    >
                        <span className="truncate">Chapter {selectedChapter?.number || "Select Chapter"}</span>
                    </button>
                </div>

                {/* Chapters Sidebar */}
                <div
                    ref={sidebarRef}
                    style={{
                        width: typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : sidebarWidth,
                        minWidth: typeof window !== 'undefined' && window.innerWidth < 1024 ? 'auto' : 180,
                        maxWidth: typeof window !== 'undefined' && window.innerWidth < 1024 ? 'none' : 400
                    }}
                    className="hidden sm:block bg-gray-50 min-h-full border-r border-gray-200 p-3 sm:p-4 transition-all duration-75 ease-linear relative lg:max-w-md"
                >
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Chapters</h3>
                        <div className="space-y-1">
                            {chaptersLoading ? (
                                <>
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="w-full flex items-center p-2 rounded-lg animate-pulse">
                                            <div className="min-w-[1.8rem] h-6 bg-gray-200 rounded mr-2"></div>
                                            <div
                                                className="flex-1 h-4 bg-gray-200 rounded"
                                                style={{ width: `${60 + Math.random() * 30}%` }}
                                            ></div>
                                        </div>
                                    ))}
                                </>
                            ) : chaptersError ? (
                                <div className="text-[#714B90] text-sm p-2">{chaptersError}</div>
                            ) : (
                                chapters.map((chapter: { number: string; title: string }) => (
                                    <button
                                        key={`${chapter.number}-${chapter.title}`}
                                        onClick={() => {
                                            setSelectedChapter(chapter)
                                            // Always perform end-session cleanup when user explicitly changes chapter
                                            // This ensures the call is disconnected and state reset (end session semantics)
                                            resetAllViews()
                                        }}
                                        className={`w-full flex items-center text-left p-2 rounded-lg text-sm transition-colors ${chapter === selectedChapter ? "bg-[#f4f5fc] text-[#714b90] shadow-sm" : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        <span
                                            className={`inline-block min-w-[1.8rem] text-center px-2 py-0.5 rounded font-semibold mr-2 transition-all ${chapter === selectedChapter ? "bg-[#f4f5fc] text-[#714b90]" : "bg-white text-gray-700"
                                                }`}
                                        >
                                            {chapter.number}
                                        </span>
                                        <span className="flex-1 break-words leading-snug">{chapter.title}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Chapters Screen - Only visible on phones when showMobileChaptersList is true */}
                {showMobileChaptersList && (
                    <div className="sm:hidden fixed rounded-t-2xl inset-0 top-9 bg-white" style={{ height: 'calc(100vh - 40px)' }}>
                        {/* Two Sidebars Layout */}
                        <div className="flex h-full overflow-hidden">
                            {/* Subjects Sidebar */}
                            <div className="w-24 flex-shrink-0 bg-gradient-to-b from-[#f5f3ff] to-[#f8fbfc] border-r border-gray-200 flex flex-col h-full overflow-hidden">
                                <div
                                    className="flex-1 overflow-y-scroll overflow-x-hidden px-2 py-3"
                                    style={{
                                        height: 'calc(100vh - 120px)',
                                        WebkitOverflowScrolling: 'touch',
                                        overscrollBehavior: 'contain',
                                        touchAction: 'pan-y'
                                    }}
                                >
                                    <div className="space-y-2">
                                        {subjectsLoading ? (
                                            <>
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className="w-full h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                                                ))}
                                            </>
                                        ) : (
                                            subjects.map((subject) => {
                                                const isSelected = subject === selectedSubject
                                                return (
                                                    <button
                                                        key={subject}
                                                        onClick={() => {
                                                            setSelectedSubject(subject)
                                                            resetAllViews()
                                                        }}
                                                        className={`w-full flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 transition-all ${isSelected
                                                                ? 'bg-white shadow-[0_4px_12px_rgba(113,75,144,0.15)]'
                                                                : 'bg-transparent hover:bg-white/70'
                                                            }`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSelected
                                                                ? 'bg-[#f4f5fc] border-2 border-[#714B90]'
                                                                : 'bg-white border border-gray-200'
                                                            }`}>
                                                            <Image
                                                                src={getSubjectImage(subject) || "/placeholder.svg"}
                                                                alt={subject}
                                                                width={28}
                                                                height={28}
                                                                className="w-7 h-7 object-contain"
                                                            />
                                                        </div>
                                                        <span className={`text-center leading-[1.1] w-full px-0.5 ${isSelected ? 'text-[#714B90] font-medium' : 'text-gray-600'
                                                            }`}>
                                                            {subject.includes('-') ? (
                                                                <>
                                                                    <span className="text-[9px] block">{subject.split('-')[0]}</span>
                                                                    <span className="text-[7px] block mt-0.5">{subject.split('-').slice(1).join('-')}</span>
                                                                </>
                                                            ) : subject.split(' ').length > 1 ? (
                                                                <>
                                                                    {subject.split(' ').map((word, idx) => (
                                                                        <span key={idx} className="text-[9px] block">{word}</span>
                                                                    ))}
                                                                </>
                                                            ) : (
                                                                <span className="text-[9px] block">{subject}</span>
                                                            )}
                                                        </span>
                                                    </button>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chapters Sidebar */}
                            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                                <div className="px-4 py-0.5 border-gray-200 bg-white flex-shrink-0">
                                    <h2 className="text-base font-bold text-gray-900">Chapters</h2>
                                </div>
                                <div
                                    className="flex-1 overflow-y-scroll overflow-x-hidden px-0 py-2"
                                    style={{
                                        height: 'calc(100vh - 120px)',
                                        WebkitOverflowScrolling: 'touch',
                                        overscrollBehavior: 'contain',
                                        touchAction: 'pan-y'
                                    }}
                                >
                                    {chaptersLoading ? (
                                        <div className="space-y-2">
                                            {[...Array(8)].map((_, i) => (
                                                <div key={i} className="w-full flex items-center p-3 rounded-lg animate-pulse">
                                                    <div className="min-w-[2rem] h-6 bg-gray-200 rounded mr-3"></div>
                                                    <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                                                    <div className="w-6 h-6 bg-gray-200 rounded-full ml-2"></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : chaptersError ? (
                                        <div className="text-[#714B90] text-sm text-center py-8">{chaptersError}</div>
                                    ) : chapters.length === 0 ? (
                                        <div className="text-gray-500 text-sm text-center py-8">
                                            {selectedSubject ? 'No chapters available' : 'Please select a subject'}
                                        </div>
                                    ) : (
                                        <div className="space-y-0">
                                            {chapters.map((chapter: { number: string; title: string }) => (
                                                <button
                                                    key={`${chapter.number}-${chapter.title}`}
                                                    onClick={() => {
                                                        setSelectedChapter(chapter)
                                                        setShowMobileChaptersList(false) // Move to options screen
                                                    }}
                                                    className="w-full flex items-center text-left p-3 rounded-lg transition-all hover:bg-gray-50 active:bg-gray-100 border border-transparent hover:border-gray-200"
                                                >
                                                    <span className="inline-flex items-center justify-center min-w-[2rem] h-8 text-center px-2 rounded-md font-semibold mr-3 bg-gray-100 text-gray-700 text-sm">
                                                        {chapter.number}
                                                    </span>
                                                    <span className="flex-1 text-sm font-medium text-gray-900">{chapter.title}</span>
                                                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content - On mobile phones: hide when showing chapters list. On tablets & desktop: always show */}
                <div className={`flex-1 p-2 sm:p-3 bg-[#FFFBF2] relative overflow-y-hidden w-full lg:overflow-hidden lg:pb-0 ${showMobileChaptersList ? 'hidden sm:block' : 'block'}`}>
                    <div className="absolute inset-0 w-full h-full z-0">
                        <Image
                            src={FrameBg || "/placeholder.svg"}
                            alt="Background"
                            fill
                            style={{ objectFit: "cover" }}
                            className="pointer-events-none select-none"
                            priority
                            sizes="100vw"
                        />
                    </div>
                    <div className={mainContainerClass + " relative z-10"}>
                        {!callOpen && !viewingLessonPlan && !viewingAssessment && !viewingAssessmentResult && !viewingHistoricalAssessment && (
                            <>
                                {/* Mobile Back Button with History Icon */}
                                <div className="sm:hidden text-sm flex items-center justify-between mb-3">
                                    <button
                                        onClick={() => setShowMobileChaptersList(true)}
                                        className="flex items-center gap-2 text-[#714B90] hover:underline"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span>Back to Chapters</span>
                                    </button>
                                    <button
                                        onClick={() => setShowHistoryDrawer(true)}
                                        className="flex items-center gap-2 p-2 text-[#714B90] hover:bg-[#714B90]/10 rounded-lg transition-colors"
                                        title="View History"
                                    >
                                        <Clock className="w-5 h-5" />
                                        <span>History</span>
                                    </button>
                                </div>

                                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">How can I help you,</h1>
                                <p className="text-sm sm:text-base text-gray-600 mb-4">
                                    I&apos;m LeoQui, your AI study assistant. Select an option below to start learning{" "}
                                    {selectedChapter ? `Chapter ${selectedChapter.number}` : "this chapter"}
                                </p>
                                <div className="grid grid-cols sm:grid-cols-2 gap-3 sm:gap-4">
                                    {studyOptions.map((option, index) => (
                                        <div
                                            key={index}
                                            className="bg-white rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col items-center justify-between h-full min-h-[140px] sm:min-h-[160px]"
                                            onClick={async () => {
                                                // Apply Start Call behavior to "Start Learning" and "Ask Doubts"
                                                if (option.title === "Start Learning" || option.title === "Ask Doubts") {
                                                    if (!selectedSubject) {
                                                        alert("Please select a subject before starting the call.")
                                                        return
                                                    }
                                                    if (!selectedChapter) {
                                                        alert("Please select a chapter before starting the call.")
                                                        return
                                                    }
                                                    setStudyMode(option.title === 'Ask Doubts' ? 'ask' : 'learn')
                                                    setCallOpen(true)
                                                    if (room.state === "disconnected") {
                                                        try {
                                                            setConnecting(true)
                                                            const details = await fetchConnectionDetailsWithConfig({
                                                                username: profile.first_name,
                                                                board: profile.board,
                                                                grade: profile.grade,
                                                                subject: selectedSubject,
                                                                chapter: selectedChapter?.number ?? "",
                                                                participantIdentity: profile.profile_id,
                                                            })
                                                            await room.connect(details.serverUrl, details.participantToken)
                                                            await room.localParticipant.setMicrophoneEnabled(false, undefined, { preConnectBuffer: true })
                                                        } catch (e) {
                                                            console.error("connect error", e)
                                                        } finally {
                                                            setConnecting(false)
                                                        }
                                                    }
                                                    setSelectedThreadId(null)
                                                    setThreadHistory([])
                                                    setShowContinueButton(false)
                                                    setCallOpen(true)
                                                }
                                                // Apply Give Assessment behavior to "Assessments"
                                                else if (option.title === "Assessments") {
                                                    if (!selectedSubject || !selectedChapter) {
                                                        alert('Please select a subject and chapter first')
                                                        return
                                                    }
                                                    generateAssessment()
                                                }
                                                // Apply Generate Lesson Plan behavior to "Generate Lesson Plan"
                                                else if (option.title === "Generate Lesson Plan") {
                                                    if (profile.user_type !== "Teacher") {
                                                        alert("This feature is only available for teachers.")
                                                        return
                                                    }
                                                    if (!selectedSubject || !selectedChapter) {
                                                        alert("Please select a subject and chapter first")
                                                        return
                                                    }
                                                    setShowLessonPlanModal(true)
                                                }
                                            }}
                                        >
                                            <div className="mb-2 flex items-center justify-center w-full">
                                                {option.title === "Assessments" && assessmentLoading ? (
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                                                        <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-[#714B90] border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                ) : (
                                                    <Image
                                                        src={option.img || "/placeholder.svg"}
                                                        alt={option.title + " image"}
                                                        width={80}
                                                        height={80}
                                                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                                                    />
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-gray-700 mb-1 text-sm sm:text-sm text-center">
                                                {option.title === "Assessments" && assessmentLoading ? "Generating..." : option.title}
                                            </h3>
                                            <p className="text-gray-500 text-[10px] sm:text-xs text-center line-clamp-2 sm:line-clamp-3">
                                                {option.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {!callOpen && viewingLessonPlan && lessonPlanData && (
                            <div className="space-y-3 sm:space-y-4 max-w-full lg:max-w-5xl mx-auto px-2 sm:px-3 md:px-6">
                                <div className="flex flex-row justify-between sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-3 sm:mb-4">
                                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#714B90]" />
                                        Lesson Plan
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setViewingLessonPlan(false)
                                            setLessonPlanData(null)
                                            setViewingAssessment(false)
                                            setViewingAssessmentResult(false)
                                            setAssessmentData(null)
                                            setUserAnswers({})
                                            setAssessmentResult(null)
                                        }}
                                        className="text-[#714B90] hover:underline text-xs sm:text-sm font-medium self-start sm:self-auto mt-2"
                                    >
                                        ← Back to Options
                                    </button>
                                </div>

                                <div className="space-y-4 sm:space-y-6 max-h-[75vh] sm:max-h-[78vh] border border-gray-200 bg-white rounded-lg sm:rounded-xl overflow-y-auto p-2 sm:p-3 md:p-4">
                                    {(() => {
                                        // Get lessons array
                                        const lessons = Array.isArray(
                                            (lessonPlanData as { generated_output?: Record<string, unknown>[] })?.generated_output
                                        )
                                            ? (lessonPlanData as { generated_output: Record<string, unknown>[] }).generated_output
                                            : Array.isArray(lessonPlanData)
                                                ? lessonPlanData
                                                : []

                                        // If multiple lessons, use tabs
                                        if (lessons.length > 1) {
                                            const tabs = lessons.map((lesson: Lesson, idx: number) => ({
                                                id: `lesson-${idx}`,
                                                label: `Lecture ${idx + 1}`,
                                                content: <RenderLesson lesson={lesson} index={idx} />
                                            }))

                                            return <Tabs tabs={tabs} />
                                        }

                                        // If single lesson, render directly
                                        if (lessons.length === 1) {
                                            return <RenderLesson lesson={lessons[0] as Lesson} index={0} />
                                        }

                                        // No lessons found
                                        return (
                                            <div className="text-gray-500 text-center py-8">
                                                No lesson plan data available.
                                            </div>
                                        )
                                    })()}
                                </div>
                            </div>
                        )}

                        {!callOpen && viewingAssessment && assessmentData && (
                            <AssessmentView
                                assessmentData={assessmentData}
                                userAnswers={userAnswers}
                                setUserAnswers={setUserAnswers}
                                onSubmit={submitAssessment}
                                submitting={submittingAssessment}
                                onBack={() => {
                                    setViewingAssessment(false)
                                    setAssessmentData(null)
                                    setUserAnswers({})
                                    // Reset lesson plan states to ensure mutual exclusivity
                                    setViewingLessonPlan(false)
                                    setLessonPlanData(null)
                                    setShowLessonPlanModal(false)
                                }}
                            />
                        )}

                        {!callOpen && viewingAssessmentResult && assessmentResult && (
                            <AssessmentResultView
                                result={assessmentResult}
                                onBack={() => {
                                    setViewingAssessmentResult(false)
                                    setAssessmentResult(null)
                                    setHistoricalAssessmentData(null)
                                    setIsViewingHistoricalResult(false)
                                    // Reset lesson plan states to ensure mutual exclusivity
                                    setViewingLessonPlan(false)
                                    setLessonPlanData(null)
                                    setShowLessonPlanModal(false)
                                }}
                                onViewAssessment={() => {
                                    setViewingAssessmentResult(false)
                                    setViewingHistoricalAssessment(true)
                                }}
                                isHistorical={isViewingHistoricalResult}
                            />
                        )}

                        {!callOpen && viewingHistoricalAssessment && historicalAssessmentData && (
                            <HistoricalAssessmentView
                                assessmentData={historicalAssessmentData}
                                userAnswers={historicalAssessmentData.Answers}
                                onBack={() => {
                                    setViewingHistoricalAssessment(false)
                                    setViewingAssessmentResult(true)
                                }}
                            />
                        )}

                        {callOpen && (
                            <RoomContext.Provider value={room}>
                                {/* Call Screen - Flex layout for fixed control bar on mobile */}
                                <div className="flex flex-col h-full lg:h-auto">
                                    {/* Header */}
                                    <div className="mb-3 md:mb-4 flex items-center justify-between flex-shrink-0">
                                        <div>
                                            <div className="text-xs sm:text-sm font-semibold text-[#714B90]">
                                                {showContinueButton
                                                    ? "Continue Conversation"
                                                    : studyMode === 'ask'
                                                        ? "Ask Doubts"
                                                        : studyMode === 'learn'
                                                            ? "Start Learning"
                                                            : "Ask Questions"}
                                            </div>
                                            <div className="text-[10px] sm:text-xs text-gray-500">
                                                {showContinueButton
                                                    ? "You are viewing a previous conversation. Click Continue to resume."
                                                    : studyMode === 'ask'
                                                        ? "Ask your doubts for this chapter."
                                                        : studyMode === 'learn'
                                                            ? "Start learning this chapter with your tutor."
                                                            : "Start by selecting a study option to begin."}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCallOpen(false)
                                                setSelectedThreadId(null)
                                                setThreadHistory([])
                                                setShowContinueButton(false)
                                                setStudyMode(null)
                                            }}
                                            className="text-[#714B90] hover:underline text-xs sm:text-sm font-medium"
                                        >
                                            ← Back to Options
                                        </button>
                                    </div>
                                    {/* Messages Area - Scrollable on mobile */}
                                    <div className="flex-1 overflow-hidden min-h-0 pt-2 w-full lg:relative lg:overflow-hidden">
                                        <RoomAudioRenderer />
                                        <StartAudio label="" />
                                        <div className="relative max-w-3xl mx-auto pr-2 px-1 md:px-2">
                                            <ClassroomMessages
                                                loading={!firstMessageArrived && (loading || connecting)}
                                                onFirstMessage={() => setFirstMessageArrived(true)}
                                                historyMessages={threadHistory}
                                                sentImages={sentImages}
                                            />
                                        </div>
                                    </div>
                                    <div className=" mx-5 px-1 md:px-2 pb-0 lg:pb-0">
                                        {showContinueButton ? (
                                            <button
                                                onClick={async () => {
                                                    setShowContinueButton(false)
                                                    // threadHistory remains in state, so history stays visible
                                                    if (room.state === "disconnected") {
                                                        try {
                                                            setConnecting(true)
                                                            const config: AppConfig = {
                                                                username: profile.first_name,
                                                                board: profile.board,
                                                                grade: profile.grade,
                                                                subject: selectedSubject,
                                                                chapter: selectedChapter?.number ?? "",
                                                                participantIdentity: profile.profile_id,
                                                                thread: selectedThreadId ?? undefined,
                                                            }
                                                            const details = await fetchConnectionDetailsWithConfig(config)
                                                            await room.connect(details.serverUrl, details.participantToken)
                                                            await room.localParticipant.setMicrophoneEnabled(false, undefined, {
                                                                preConnectBuffer: true,
                                                            })
                                                        } catch (e) {
                                                            console.error("connect error", e)
                                                        } finally {
                                                            setConnecting(false)
                                                        }
                                                    }
                                                }}
                                                disabled={connecting}
                                                className="w-full bg-[#714B90] hover:bg-[#5a3a73] text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 mt-0 sm:mt-5 lg:mt-14"
                                            >
                                                {connecting ? "Connecting..." : "Continue Conversation"}
                                            </button>
                                        ) : (
                                            <>
                                                {/* Desktop Control Bar - Hidden on mobile */}
                                                <div className="hidden lg:block">
                                                    <ClassroomControlBar
                                                        setCallOpen={setCallOpen}
                                                        refreshHistory={refreshHistory}
                                                        micMode={micMode}
                                                        setMicMode={setMicMode}
                                                        isVKeyPressed={isVKeyPressed}
                                                        setIsVKeyPressed={setIsVKeyPressed}
                                                        isMicButtonHeld={isMicButtonHeld}
                                                        setIsMicButtonHeld={setIsMicButtonHeld}
                                                        setSentImages={setSentImages}
                                                    />
                                                </div>

                                                {/* Mobile Control Bar - Visible only on mobile/tablets */}
                                                <MobileControlBarWrapper
                                                    setCallOpen={setCallOpen}
                                                    refreshHistory={refreshHistory}
                                                    micMode={micMode}
                                                    setMicMode={setMicMode}
                                                    isVKeyPressed={isVKeyPressed}
                                                    setIsVKeyPressed={setIsVKeyPressed}
                                                    isMicButtonHeld={isMicButtonHeld}
                                                    setIsMicButtonHeld={setIsMicButtonHeld}
                                                    setSentImages={setSentImages}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </RoomContext.Provider>
                        )}
                    </div>

                    {showLessonPlanModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-900">Lesson Plan Configuration</h2>
                                    <button onClick={() => setShowLessonPlanModal(false)} className="text-gray-700 hover:text-gray-700">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Number of Lectures</label>
                                        <Select
                                            value={lessonPlanFormData.numberOfLectures.toString()}
                                            onValueChange={(value) =>
                                                setLessonPlanFormData({
                                                    ...lessonPlanFormData,
                                                    numberOfLectures: Number.parseInt(value),
                                                })
                                            }
                                        >
                                            <SelectTrigger className="w-full border text-gray-700 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#714B90] focus:border-transparent outline-none">
                                                <SelectValue placeholder="Select number of lectures" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectLabel>Number of Lectures</SelectLabel>
                                                    <SelectItem value="1">1 Lecture</SelectItem>
                                                    <SelectItem value="2">2 Lectures</SelectItem>
                                                    <SelectItem value="3">3 Lectures</SelectItem>
                                                    <SelectItem value="4">4 Lectures</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Duration per Lecture (minutes)
                                        </label>
                                        <Select
                                            value={lessonPlanFormData.durationOfLecture.toString()}
                                            onValueChange={(value) =>
                                                setLessonPlanFormData({
                                                    ...lessonPlanFormData,
                                                    durationOfLecture: Number.parseInt(value),
                                                })
                                            }
                                        >
                                            <SelectTrigger className="w-full border text-gray-700 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#714B90] focus:border-transparent outline-none">
                                                <SelectValue placeholder="Select duration" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectLabel>Duration per Lecture</SelectLabel>
                                                    <SelectItem value="30">30 minutes</SelectItem>
                                                    <SelectItem value="35">35 minutes</SelectItem>
                                                    <SelectItem value="40">40 minutes</SelectItem>
                                                    <SelectItem value="45">45 minutes</SelectItem>
                                                    <SelectItem value="50">50 minutes</SelectItem>
                                                    <SelectItem value="55">55 minutes</SelectItem>
                                                    <SelectItem value="60">60 minutes</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <button
                                    onClick={generateLessonPlan}
                                    disabled={lessonPlanLoading}
                                    className="w-full bg-[#714B90] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#5a3a73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {lessonPlanLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Generating...
                                        </span>
                                    ) : (
                                        "Generate Lesson Plan"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Activity History Sidebar */}
                <div className="hidden xl:block w-64 bg-gray-50 min-h-full border-r border-l border-gray-300 p-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">Activity History</h3>
                            <button
                                onClick={fetchThreadsData}
                                disabled={threadsLoading}
                                title="Refresh history"
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-60"
                            >
                                <RefreshCw className={`w-4 h-4 ${threadsLoading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                        <button
                            onClick={handleNewConversation}
                            className="bg-[#714B90] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5a3a73] transition-colors mb-4 w-full"
                        >
                            + New Conversation
                        </button>
                        <div className="space-y-2 h-[calc(100vh-180px)] overflow-y-auto pr-2 scrollbar-hide">
                            {threadsLoading ? (
                                <HistorySkeleton />
                            ) : threadsError ? (
                                <div className="text-[#714B90] text-xs px-2">{threadsError}</div>
                            ) : threads.length === 0 ? (
                                <div className="text-gray-500 text-xs px-2">No history found.</div>
                            ) : (
                                threads.map((thread, index) => {
                                    const isActiveThread = selectedThreadId === thread.thread_id
                                    // If this specific thread is loading
                                    if (loadingThread && selectedThreadId === thread.thread_id) {
                                        return <SingleThreadSkeleton key={thread.thread_id} />;
                                    }
                                    return (
                                        <button
                                            key={thread.thread_id || index}
                                            onClick={() => {
                                                setSelectedThreadId(thread.thread_id); // Add this
                                                if (thread.thread_type === 'lesson_plan') {
                                                    fetchLessonPlanById(thread.thread_id)
                                                } else if (thread.thread_type === 'assessment') {
                                                    fetchThreadById(thread.thread_id, 'assessment')
                                                } else {
                                                    fetchThreadById(thread.thread_id, 'tutor')
                                                }
                                            }}
                                            disabled={loadingThread}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group border ${isActiveThread
                                                ? "border-[#714B90] ring-2 ring-[#714B90]/20 shadow-sm bg-white"
                                                : "border-transparent bg-white hover:shadow-sm"
                                                }`}
                                        >
                                            <div className="flex items-start gap-2 mb-1.5">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {thread.thread_type === 'lesson_plan' ? (
                                                        <FileText className="w-4 h-4 text-[#714B90]" />
                                                    ) : thread.thread_type === 'assessment' ? (
                                                        <BookOpen className="w-4 h-4 text-[#714B90]" />
                                                    ) : (
                                                        <BookOpen className="w-4 h-4 text-[#714B90]" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-gray-900 mb-1 break-words group-hover:text-[#714B90] transition-colors">
                                                        {thread.thread_title || `Thread: ${thread.thread_id.slice(0, 8)}...`}
                                                    </h4>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${thread.thread_type === 'lesson_plan'
                                                                ? 'bg-yellow-50 text-[#714B90] border border-[#714B9033]'
                                                                : thread.thread_type === 'assessment'
                                                                    ? 'bg-green-50 text-[#714B90] border border-green-200'
                                                                    : 'bg-purple-50 text-[#714B90] border border-purple-200'
                                                                }`}
                                                        >
                                                            {thread.thread_type === 'lesson_plan' ? 'Lesson Plan' : thread.thread_type === 'assessment' ? 'Assessment' : 'Tutor Session'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">
                                                            {formatThreadTimestamp(thread.updated_at) || "Time unavailable"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Mobile Bottom Navigation - Only visible on tablets (sm) and up, not on mobile phones */}
            <div className="hidden sm:flex lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
                <div className="flex justify-around items-center py-1 px-1 w-full">
                    <button
                        onClick={() => setShowSubjectsDrawer(true)}
                        className="flex-1 flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <BookOpen className="w-5 h-5 text-gray-600" />
                        <span className="text-xs text-gray-600 truncate">Subjects</span>
                    </button>

                    <button
                        onClick={() => setShowChaptersDrawer(true)}
                        className="flex-1 flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FileText className="w-5 h-5 text-gray-600" />
                        <span className="text-xs text-gray-600 truncate">Chapters</span>
                    </button>

                    <button
                        onClick={() => setShowHistoryDrawer(true)}
                        className="flex-1 flex flex-col items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FileText className="w-5 h-5 text-gray-600" />
                        <span className="text-xs text-gray-600 truncate">History</span>
                    </button>
                </div>
            </div>

            {/* Mobile Drawers */}
            <MobileDrawer
                isOpen={showSubjectsDrawer}
                onClose={() => setShowSubjectsDrawer(false)}
                title="Select Subject"
            >
                <div className="space-y-0">
                    {subjectsLoading ? (
                        <SubjectsSkeleton />
                    ) : subjectsError ? (
                        <div className="text-[#714B90] text-sm">{subjectsError}</div>
                    ) : (
                        subjects.map((subject) => (
                            <button
                                key={subject}
                                onClick={() => {
                                    setSelectedSubject(subject)
                                    setShowSubjectsDrawer(false)
                                    resetAllViews()
                                }}
                                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${subject === selectedSubject
                                    ? "bg-[#f4f5fc] text-[#714B90] font-medium"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                                    <Image
                                        src={getSubjectImage(subject) || "/placeholder.svg"}
                                        alt={subject}
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 object-contain"
                                    />
                                </div>
                                <span className="flex-1 text-left">{subject}</span>
                                {subject === selectedSubject && <span className="text-[#714B90]">✓</span>}
                            </button>
                        ))
                    )}
                </div>
            </MobileDrawer>

            <MobileDrawer
                isOpen={showChaptersDrawer}
                onClose={() => setShowChaptersDrawer(false)}
                title="Select Chapter"
            >
                <div className="space-y-1">
                    {chaptersLoading ? (
                        <>
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="w-full flex items-center p-3 rounded-lg animate-pulse">
                                    <div className="min-w-[2rem] h-6 bg-gray-200 rounded mr-2"></div>
                                    <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                                </div>
                            ))}
                        </>
                    ) : chaptersError ? (
                        <div className="text-[#714B90] text-sm">{chaptersError}</div>
                    ) : (
                        chapters.map((chapter) => (
                            <button
                                key={`${chapter.number}-${chapter.title}`}
                                onClick={() => {
                                    setSelectedChapter(chapter)
                                    setShowChaptersDrawer(false)
                                    resetAllViews()
                                }}
                                className={`w-full flex items-center text-left p-3 rounded-lg transition-colors ${chapter === selectedChapter
                                    ? "bg-[#f4f5fc] text-[#714B90] font-medium"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                <span className="inline-block min-w-[2rem] text-center px-2 py-1 rounded font-semibold mr-3 bg-gray-100">
                                    {chapter.number}
                                </span>
                                <span className="flex-1">{chapter.title}</span>
                                {chapter === selectedChapter && <span className="text-[#714B90]">✓</span>}
                            </button>
                        ))
                    )}
                </div>
            </MobileDrawer>

            <MobileHistoryDrawer
                isOpen={showHistoryDrawer}
                onClose={() => setShowHistoryDrawer(false)}
                title="History"
                onRefresh={fetchThreadsData}
                isLoading={threadsLoading}
            >
                <div className="space-y-2 p-3 pb-8 mobile-drawer-content">
                    {threadsLoading ? (
                        <HistorySkeleton />
                    ) : threadsError ? (
                        <div className="text-[#714B90] text-sm text-center py-4">{threadsError}</div>
                    ) : threads.length === 0 ? (
                        <div className="text-gray-500 text-sm text-center py-4">No history yet</div>
                    ) : (
                        threads.map((thread, index) => {
                            const isActiveThread = selectedThreadId === thread.thread_id
                            return (
                            <button
                                key={thread.thread_id || index}
                                onClick={() => {
                                    setSelectedThreadId(thread.thread_id); // Add this
                                    if (thread.thread_type === 'lesson_plan') {
                                        fetchLessonPlanById(thread.thread_id)
                                    } else if (thread.thread_type === 'assessment') {
                                        fetchThreadById(thread.thread_id, 'assessment')
                                    } else {
                                        fetchThreadById(thread.thread_id, 'tutor')
                                    }
                                    setShowHistoryDrawer(false)
                                }}
                                disabled={loadingThread}
                                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group border ${isActiveThread
                                    ? "border-[#714B90] ring-2 ring-[#714B90]/20 shadow-sm bg-white"
                                    : "border-transparent bg-white hover:shadow-sm"
                                    }`}
                            >
                                <div className="flex items-start gap-2 mb-1.5">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {thread.thread_type === 'lesson_plan' ? (
                                            <FileText className="w-4 h-4 text-[#714B90]" />
                                        ) : thread.thread_type === 'assessment' ? (
                                            <BookOpen className="w-4 h-4 text-[#714B90]" />
                                        ) : (
                                            <BookOpen className="w-4 h-4 text-[#714B90]" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-900 mb-1 break-words group-hover:text-[#714B90] transition-colors">
                                            {thread.thread_title || `Thread: ${thread.thread_id.slice(0, 8)}...`}
                                        </h4>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${thread.thread_type === 'lesson_plan'
                                                    ? 'bg-yellow-50 text-[#714B90] border border-[#714B9033]'
                                                    : thread.thread_type === 'assessment'
                                                        ? 'bg-green-50 text-[#714B90] border border-green-200'
                                                        : 'bg-purple-50 text-[#714B90] border border-purple-200'
                                                    }`}
                                            >
                                                {thread.thread_type === 'lesson_plan' ? 'Lesson Plan' : thread.thread_type === 'assessment' ? 'Assessment' : 'Tutor Session'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatThreadTimestamp(thread.updated_at) || "Time unavailable"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                            )
                        })
                    )}
                </div>
            </MobileHistoryDrawer>
        </div>
    )
}

export default withProtectedRoute(Classroom)

// Add ThreadMessage type for thread history
export type ThreadMessage = {
    role: string
    timestamp: string
    message: string
}

// Type for messages that can have image properties
type MessageWithImage = ReceivedChatMessage & {
    isImage?: boolean
    imageUrl?: string
    associatedText?: string | null
    hasImage?: boolean
}

// Add ThreadObject type for thread data
export type ThreadObject = {
    thread_id: string
    thread_title: string
    thread_type: string
    updated_at: string
}

// Add ThreadDetailData type for detailed thread response
export type ThreadDetailData = {
    board: string
    thread_id: string
    subject: string
    agent_name: string
    thread_data: ThreadMessage[]
    conversation_summary: (string | null)[]
    session_data: Array<{
        topics_covered: string[]
        strong_areas: string[]
        needs_improvement: string[]
    }>
    thread_title: string
    updated_at: string
    grade: string
    user_id: string
    chapter: string
    room_name: string
    created_at: string
}

type AssessmentData = {
    General_Instructions: string
    MCQs: Array<Array<Record<string, string>>>
    True_False_Questions: Array<Array<Record<string, string>>>
    Fill_in_the_Blanks: Array<Array<Record<string, string>>>
    Very_Short_Answers: Array<Array<Record<string, string>>>
    Short_Answers: Array<Array<Record<string, string>>>
    Long_Answers: Array<Array<Record<string, string>>>
    Very_Long_Answers: Array<Array<Record<string, string>>>
    Case_Studies: Array<Array<Record<string, string>>>
    Answers: Record<string, string>
}

type AssessmentResult = {
    grade: string
    score_summary: {
        score: number
        total: number
        remark: string
    }
    teacher_feedback: {
        positive_note: string
        improvement_note: string
    }
    next_step: string
}

// Helper function to convert LaTeX slash notation to dollar notation
function convertLatexNotation(text: string): string {
    // Convert \( ... \) to $ ... $ for inline math
    text = text.replace(/\\\((.+?)\\\)/g, '$$$1$$')
    // Convert \[ ... \] to $$ ... $$ for display math
    text = text.replace(/\\\[(.+?)\\\]/g, '$$$$$$1$$$$$$')
    return text
}

// Helper function to parse image metadata from message string
function parseImageMetadata(message: string): { isImage: boolean; imageUrl: string | null } {
    // Check if message contains image_content type
    if (!message.includes("type='image_content'") && !message.includes('type="image_content"')) {
        return { isImage: false, imageUrl: null }
    }
    
    // Extract image URL from the metadata
    // Pattern: image='URL' or image="URL"
    // Handle both single and double quotes, and match until the closing quote
    const singleQuoteMatch = message.match(/image='([^']+)'/)
    const doubleQuoteMatch = message.match(/image="([^"]+)"/)
    
    const imageUrl = (singleQuoteMatch?.[1] || doubleQuoteMatch?.[1] || null)?.trim()
    
    if (imageUrl) {
        return { isImage: true, imageUrl }
    }
    
    return { isImage: false, imageUrl: null }
}

function ClassroomMessages({
    onFirstMessage,
    historyMessages = [],
    sentImages = [],
}: {
    loading?: boolean
    onFirstMessage?: () => void
    historyMessages?: ThreadMessage[]
    sentImages?: Array<{ id: string; dataUrl: string; timestamp: number; associatedText?: string | null }>
}) {
    const { messages } = useChatAndTranscription()
    const room = useRoomContext()
    const containerRef = React.useRef<HTMLDivElement | null>(null)
    const firstMessageShown = React.useRef(false)

    // Combine history messages with live messages and sent images
    const allMessages = React.useMemo(() => {
        const historyConverted = historyMessages.map((msg, idx) => {
            // Check if message contains image metadata
            const imageData = parseImageMetadata(msg.message)
            
            if (imageData.isImage && imageData.imageUrl) {
                // Return as image message
                return {
                    id: `history-${idx}`,
                    from: { isLocal: msg.role === "user" },
                    timestamp: new Date(msg.timestamp).getTime(),
                    message: "",
                    isImage: true,
                    imageUrl: imageData.imageUrl,
                }
            }
            
            // Return as regular message
            return {
                id: `history-${idx}`,
                from: { isLocal: msg.role === "user" },
                timestamp: new Date(msg.timestamp).getTime(),
                message: msg.message,
                isImage: false,
            }
        })
        
        // Convert sent images to message format
        const imageMessages = sentImages.map(img => ({
            id: img.id,
            from: { isLocal: true },
            timestamp: img.timestamp,
            message: img.associatedText || "",
            isImage: true,
            imageUrl: img.dataUrl,
            associatedText: img.associatedText || null,
        }))
        
        // Add isImage: false to regular messages to ensure type consistency
        const regularMessages = messages.map(msg => ({
            ...msg,
            isImage: false,
        }))
        
        const all = [...historyConverted, ...imageMessages, ...regularMessages].sort((a, b) => a.timestamp - b.timestamp)
        
        // Group image and text messages that were sent together (within 3 seconds due to processing delay)
        const groupedMessages: MessageWithImage[] = []
        const processed = new Set<string>()
        
        for (let i = 0; i < all.length; i++) {
            if (processed.has(all[i].id)) continue
            
            const current = all[i] as MessageWithImage
            const isImageMsg = current.isImage === true && current.imageUrl
            const associatedText = current.associatedText
            
            if (isImageMsg && associatedText) {
                // This image has associated text, display them together
                // Check if there's a matching text message within the next few messages (within 3 seconds) to skip it
                // We use 3 seconds because we add a 1500ms delay after image upload
                let foundMatchingText = false
                let matchingTextId: string | null = null
                
                // Look ahead up to 5 messages or 3 seconds, whichever comes first
                for (let j = i + 1; j < all.length && j < i + 6; j++) {
                    const nextMsg = all[j]
                    if (processed.has(nextMsg.id)) continue
                    
                    const nextIsText = !(nextMsg as MessageWithImage).isImage && nextMsg.from?.isLocal
                    const nextMatches = nextMsg && typeof nextMsg.message === 'string' && 
                        typeof associatedText === 'string' &&
                        nextMsg.message.trim().toLowerCase() === associatedText.trim().toLowerCase()
                    const timeDiff = Math.abs(nextMsg.timestamp - current.timestamp)
                    
                    if (nextIsText && nextMatches && timeDiff < 3000) {
                        foundMatchingText = true
                        matchingTextId = nextMsg.id
                        break
                    }
                    
                    // Stop looking if we've gone past 3 seconds
                    if (timeDiff >= 3000) break
                }
                
                if (foundMatchingText && matchingTextId) {
                    // Skip the duplicate text message, show image with text
                    groupedMessages.push({
                        ...current,
                        message: associatedText,
                        hasImage: true,
                    } as MessageWithImage)
                    processed.add(current.id)
                    processed.add(matchingTextId) // Mark the text message as processed so it won't show separately
                    continue
                } else {
                    // No matching text message found, just show image with associated text
                    groupedMessages.push({
                        ...current,
                        message: associatedText,
                        hasImage: true,
                    } as MessageWithImage)
                    processed.add(current.id)
                    continue
                }
            } else if (!isImageMsg && current.from?.isLocal) {
                // Check if there's an image message right before this text (within 3 seconds)
                const prevMsg = i > 0 ? (all[i - 1] as MessageWithImage) : null
                const prevIsImage = prevMsg && prevMsg.isImage === true && prevMsg.imageUrl
                const prevAssociatedText = prevMsg ? prevMsg.associatedText : null
                const timeDiff = prevMsg ? Math.abs(current.timestamp - prevMsg.timestamp) : Infinity
                const textMatches = prevAssociatedText && typeof current.message === 'string' && typeof prevAssociatedText === 'string' &&
                    current.message.trim().toLowerCase() === prevAssociatedText.trim().toLowerCase()
                
                if (prevIsImage && timeDiff < 3000 && prevMsg && !processed.has(prevMsg.id) && textMatches) {
                    // Group image and text together
                    groupedMessages.push({
                        ...prevMsg,
                        message: prevAssociatedText || current.message,
                        hasImage: true,
                    } as MessageWithImage)
                    processed.add(prevMsg.id)
                    processed.add(current.id)
                    continue
                }
            }
            
            if (!processed.has(current.id)) {
                groupedMessages.push(current)
                processed.add(current.id)
            }
        }
        
        return groupedMessages
    }, [historyMessages, messages, sentImages])

    React.useEffect(() => {
        const el = containerRef.current
        if (!el) return
        el.scrollTop = el.scrollHeight
    }, [allMessages])

    useEffect(() => {
        if (!firstMessageShown.current && messages.length > 0) {
            firstMessageShown.current = true
            onFirstMessage?.()
        }
    }, [messages, onFirstMessage])

    // Show loading only if there are no messages AND no images AND we're loading
    if (allMessages.length === 0 && sentImages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[65vh]">
                <AudioNoteSummarizerLoader />
                <div className="flex justify-start w-full mt-6">
                    <div className="bg-white text-[#714B90] rounded-tl-sm shadow rounded-2xl px-4 py-2 max-w-[80%] text-[13px] leading-relaxed font-semibold mx-auto">
                        Connecting Tutor, Please wait...
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div ref={containerRef} className="space-y-3 h-[72vh] md:h-[65vh] overflow-y-auto pr-2 pb-4 md:pb-6 scrollbar-hide">
            {allMessages.map((m) => {
                // Fix: Only check identity if it exists on both sides
                let isLocal = false
                if (m.from) {
                    if (m.from.isLocal === true) {
                        isLocal = true
                    } else if (
                        "identity" in m.from &&
                        room.localParticipant &&
                        "identity" in room.localParticipant &&
                        m.from.identity === room.localParticipant.identity
                    ) {
                        isLocal = true
                    }
                }
                const ts = new Date(m.timestamp || Date.now())
                const timeStr = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                
                // Check if this is an image message or combined image+text message
                const messageWithImage = m as MessageWithImage
                const isImageMessage = messageWithImage.isImage === true && messageWithImage.imageUrl
                const hasText = messageWithImage.message && messageWithImage.message.trim()
                
                if (isImageMessage) {
                    return (
                        <div key={m.id} className={`flex ${isLocal ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`${isLocal ? "bg-[#714B90] text-white rounded-tr-sm" : "bg-white text-gray-800 rounded-tl-sm shadow"} rounded-[28px] p-1.5 max-w-[75%]`}
                            >
                                <div className="relative overflow-hidden rounded-2xl">
                                    <Image
                                        src={messageWithImage.imageUrl || ''}
                                        alt="Uploaded image"
                                        width={800}
                                        height={600}
                                        className="w-full h-auto object-cover max-h-[280px]"
                                        unoptimized
                                    />
                                </div>
                                {/* Show text message below image if they were sent together */}
                                {hasText && (
                                    <div className="mt-1.5 px-2">
                                        <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ children }) => <span>{children}</span>,
                                                    div: ({ children }) => <span>{children}</span>,
                                                }}
                                            >
                                                {typeof messageWithImage.message === 'string'
                                                    ? messageWithImage.message.replace(/\(spoken_equation:[^)]+\)/gi, '').replace(/\n{2,}/g, '\n\n').trim()
                                                    : messageWithImage.message}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                                <div className={`${isLocal ? "text-white/70" : "text-gray-500"} text-[10px] mt-1.5 text-right px-2`}>
                                    {timeStr}
                                </div>
                            </div>
                        </div>
                    )
                }
                
                // HIDE (spoken_equation:....) PATTERN FROM CHAT DISPLAY
                let cleanedMessage = typeof m.message === 'string'
                    ? m.message.replace(/\(spoken_equation:[^)]+\)/gi, '').replace(/\n{2,}/g, '\n\n').trim()
                    : m.message;
                // Convert LaTeX slash notation to dollar notation
                cleanedMessage = typeof cleanedMessage === 'string'
                    ? convertLatexNotation(cleanedMessage)
                    : cleanedMessage;
                return (
                    <div key={m.id} className={`flex ${isLocal ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`${isLocal ? "bg-[#714B90] text-white rounded-tr-sm" : "bg-white text-gray-800 rounded-tl-sm shadow"} rounded-2xl px-4 py-2 max-w-[80%] text-[13px] leading-relaxed`}
                        >
                            <div className="whitespace-pre-wrap break-words">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        p: ({ children }) => <span>{children}</span>,
                                        div: ({ children }) => <span>{children}</span>,
                                    }}
                                >
                                    {cleanedMessage}
                                </ReactMarkdown>
                            </div>
                            <div className={`${isLocal ? "text-white/70" : "text-gray-500"} text-[10px] mt-1 text-right`}>
                                {timeStr}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function ClassroomControlBar({
    setCallOpen,
    refreshHistory,
    micMode,
    setMicMode,
    isVKeyPressed,
    setIsVKeyPressed,
    isMicButtonHeld,
    setIsMicButtonHeld,
    setSentImages,
}: {
    setCallOpen: (open: boolean) => void;
    refreshHistory: () => void;
    micMode: 'ptt' | 'alwaysOn';
    setMicMode: (mode: 'ptt' | 'alwaysOn') => void;
    isVKeyPressed: boolean;
    setIsVKeyPressed: (pressed: boolean) => void;
    isMicButtonHeld: boolean;
    setIsMicButtonHeld: (held: boolean) => void;
    setSentImages: React.Dispatch<React.SetStateAction<Array<{ id: string; dataUrl: string; timestamp: number; associatedText?: string | null }>>>;
}) {
    // Force all controls to be visible
    const visibleControls = {
        microphone: true,
        camera: true,
        screenShare: true,
        chat: true,
        leave: true,
    }
    const { cameraToggle, microphoneToggle, screenShareToggle, handleDisconnect } = useAgentControlBar({})

    const [message, setMessage] = React.useState("")
    const room = React.useContext(RoomContext) as Room
    const chat = useChat()
    const { localParticipant } = useLocalParticipant()
    const canSend = room?.state === "connected"

    // Track video state
    const cameraTrack = localParticipant?.getTrackPublication(Track.Source.Camera)
    const isCameraEnabled = cameraTrack?.track && !cameraTrack?.isMuted

    // Ensure microphone stays disabled by default; no auto-enable logic
    const micResetDoneRef = React.useRef(false)
    // Mirror microphone toggle state into primitives/functions to satisfy exhaustive-deps
    const micEnabled = microphoneToggle?.enabled
    const micPending = microphoneToggle?.pending
    const micToggle = microphoneToggle?.toggle
    React.useEffect(() => {
        // Only run once when we transition to connected; avoid re-running due to changing toggle object identity
        if (room?.state === "connected") {
            if (!micResetDoneRef.current && micEnabled && !micPending) {
                micToggle?.(false)
            }
            micResetDoneRef.current = true
        } else {
            // reset flag when disconnected so next connection will re-apply default
            micResetDoneRef.current = false
        }
    }, [room?.state, micEnabled, micPending, micToggle]) // depend on primitives/functions to appease linter

    // Keyboard listener for Push-to-Talk (V key)
    React.useEffect(() => {
        if (micMode !== 'ptt' || room?.state !== 'connected') return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea or contentEditable
            const target = e.target as HTMLElement | null
            const tag = target?.tagName?.toLowerCase()
            const isEditable = target?.getAttribute && target.getAttribute('contenteditable') === 'true'
            if (tag === 'input' || tag === 'textarea' || isEditable) return

            // Only respond to first keydown (ignore autorepeat)
            if ((e.key === 'v' || e.key === 'V') && !e.repeat) {
                setIsVKeyPressed(true)
                if (!micPending) {
                    // ensure toggle(true) is called; guard in case toggle not ready
                    micToggle?.(true)
                }
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'v' || e.key === 'V') {
                setIsVKeyPressed(false)
                if (!micPending) {
                    micToggle?.(false)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [micMode, room?.state, micEnabled, micPending, micToggle, setIsVKeyPressed]) // include primitives/functions

    // Cleanup: Disable mic when switching to PTT mode (but don't cut off active PTT/touch)
    React.useEffect(() => {
        if (micMode === 'ptt' && micEnabled && !isVKeyPressed && !isMicButtonHeld && !micPending) {
            micToggle?.(false)
        }
    }, [micMode, micEnabled, micPending, isVKeyPressed, isMicButtonHeld, micToggle]) // include active flags

    // State for selected image (not sent yet)
    const [selectedImage, setSelectedImage] = React.useState<{ file: File; dataUrl: string } | null>(null)
    const [isUploadingImage, setIsUploadingImage] = React.useState(false)

    async function sendMessage() {
        const messageToSend = message.trim()

        // Prevent sending while upload is in progress or without text
        if (!canSend || isUploadingImage) return
        if (!messageToSend) {
            if (selectedImage) {
                toast.error("Please add a message before sending an image.")
            }
            return
        }
        
        const imageToSend = selectedImage?.file
        const imageDataUrl = selectedImage?.dataUrl

        // Clear UI immediately (like ChatGPT) - remove preview right away
        // Store references before clearing state
        const imageFileRef = imageToSend
        const imageDataUrlRef = imageDataUrl
        
        // Clear message and image preview immediately for better UX
        setMessage("")
        setSelectedImage(null)

        try {
            // Use the same timestamp for both image and text so they appear together
            const sharedTimestamp = Date.now()

            // Send image FIRST (so LLM can see it), then text
            let imageUploadSuccess = true
            if (imageFileRef) {
                // Wait for image to be fully sent and processed
                imageUploadSuccess = await sendImage(imageFileRef, messageToSend || undefined, sharedTimestamp, imageDataUrlRef)
                
                // Only proceed if image upload was successful
                if (!imageUploadSuccess) {
                    // Restore image on failure so user can retry
                    if (imageFileRef && imageDataUrlRef) {
                        setSelectedImage({ file: imageFileRef, dataUrl: imageDataUrlRef })
                    }
                    // Restore message text
                    setMessage(messageToSend)
                    return
                }
                
                // Wait additional time to ensure LLM has processed the image on server side
                // This delay ensures the image is available before the text message arrives
                await new Promise(resolve => setTimeout(resolve, 1500))
            }

            // Send text message AFTER image is fully processed
            if (messageToSend) {
                await chat.send(messageToSend)
            }
        } catch (e) {
            console.error("send message error", e)
            // Restore image on error so user can retry
            if (imageFileRef && imageDataUrlRef) {
                setSelectedImage({ file: imageFileRef, dataUrl: imageDataUrlRef })
            }
            // Restore message text
            setMessage(messageToSend)
        }
    }

    // Image upload function
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    async function sendImage(file: File, messageText?: string, sharedTimestamp?: number, providedDataUrl?: string): Promise<boolean> {
        if (!canSend || !localParticipant) {
            toast.error("Not connected to room")
            return false
        }

        setIsUploadingImage(true)
        const loadingToast = toast.loading("Uploading image...")

        // Prepare image data but don't add to sentImages yet
        let dataUrl: string
        let imageId: string
        let imageTimestamp: number
        let imageData: { id: string; dataUrl: string; timestamp: number; associatedText: string | null } | null = null

        try {
            // Use provided dataUrl if available, otherwise try selectedImage, otherwise create one
            if (providedDataUrl) {
                dataUrl = providedDataUrl
            } else if (selectedImage && selectedImage.file === file) {
                dataUrl = selectedImage.dataUrl
            } else {
                dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })
            }

            // Use shared timestamp if provided (for grouping with text message), otherwise use current time
            imageTimestamp = sharedTimestamp || Date.now()
            
            // Prepare image data but don't add to sentImages yet - wait for successful upload
            imageId = `image-${imageTimestamp}-${Math.random()}`
            imageData = { id: imageId, dataUrl, timestamp: imageTimestamp, associatedText: messageText || null }

            // Send file using LiveKit's sendFile method
            // According to LiveKit docs: https://docs.livekit.io/home/client/data/byte-streams/#sending-files
            if (typeof localParticipant.sendFile !== 'function') {
                throw new Error("sendFile method is not available on LocalParticipant. Please ensure you're using a compatible LiveKit client version (2.15.7+).")
            }

            try {
                const info = await localParticipant.sendFile(file, {
                    mimeType: file.type,
                    topic: 'images',
                    onProgress: (progress) => {
                        console.log('Sending image, progress:', Math.ceil(progress * 100) + '%')
                    },
                })
                
                console.log(`Image sent successfully with stream ID: ${info.id}`)
                
                // Only add to sentImages AFTER successful upload
                console.log("Adding image to chat after successful upload:", imageId, dataUrl.substring(0, 50) + "...")
                setSentImages(prev => {
                    const updated = [...prev, imageData!]
                    console.log("Updated sentImages count:", updated.length)
                    return updated
                })
                
                toast.dismiss(loadingToast)
                toast.success("Image sent successfully!")
                return true
            } catch (sendFileError) {
                console.error("Error sending file:", sendFileError)
                toast.dismiss(loadingToast)
                toast.error("Failed to send image. Please try again.")
                return false
            }
        } catch (error) {
            console.error("Error sending image:", error)
            toast.dismiss(loadingToast)
            toast.error("Failed to send image. Please try again.")
            return false
        } finally {
            setIsUploadingImage(false)
        }
    }

    async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file")
            return
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            toast.error("Image size must be less than 10MB")
            return
        }

        // Create data URL for preview
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(file)
            })
            setSelectedImage({ file, dataUrl })
        } catch (error) {
            console.error("Error reading image:", error)
            toast.error("Failed to load image")
        }

        // Reset file input to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    function handleImageButtonClick() {
        if (isUploadingImage) return
        fileInputRef.current?.click()
    }

    function removeSelectedImage() {
        setSelectedImage(null)
    }

    return (
        <div className="space-y-2">
            {/* Video Preview - Only show when camera is enabled */}
            {isCameraEnabled && cameraTrack?.track && (
                <DraggableVideoPreviewer>
                    <VideoTrack
                        trackRef={{
                            participant: localParticipant,
                            source: Track.Source.Camera,
                            publication: cameraTrack,
                        }}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                        <span className="text-white text-xs font-medium">You</span>
                    </div>
                </DraggableVideoPreviewer>
            )}

            {/* Control Bar Section - Isolated to prevent layout shifts */}
            <div className="relative" style={{ minHeight: 0, overflow: 'visible', contain: 'layout style' }}>
                {/* Image Preview - Positioned absolutely outside normal flow */}
                {selectedImage && (
                    <div 
                        className="absolute z-10 pointer-events-auto" 
                        style={{ 
                            bottom: '100%',
                            left: '0',
                            marginBottom: '0.5rem',
                            transform: 'translateY(0)'
                        }}
                    >
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 bg-white shadow-lg">
                            <Image
                                src={selectedImage.dataUrl}
                                alt="Selected image"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover rounded-lg"
                                unoptimized
                            />
                            <button
                                onClick={removeSelectedImage}
                                className="absolute top-1 right-1 bg-[#FFFBF2] text-gray-700 rounded-full p-1 shadow-md transition-all z-20"
                                title="Remove image"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}
                {/* Control Bar Container - Fixed structure, no expansion */}
                <div className="flex flex-col gap-2" style={{ position: 'relative', zIndex: 1, flexShrink: 0, willChange: 'auto' }}>
                    {/* Chat Input Area (always open, above control bar) */}
                    <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-sm p-2 mt-0">
                        <div className="flex items-center gap-2">
                        {/* Hidden file input for image upload */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                            disabled={!canSend || isUploadingImage}
                        />
                        {/* Image upload button */}
                        <button
                            onClick={handleImageButtonClick}
                            disabled={!canSend || isUploadingImage}
                            className="inline-flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95"
                            title="Upload image"
                        >
                            {isUploadingImage ? (
                                <div className="w-4 h-4 border-2 border-[#714B90] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <ImageIcon className="w-4 h-4" />
                            )}
                        </button>
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    sendMessage()
                                }
                            }}
                            placeholder="Type your message..."
                            className="flex-1 rounded-xl text-gray-700 border-0 px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#714B90] focus:bg-white transition-all"
                            disabled={!canSend || isUploadingImage}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!canSend || !message.trim() || isUploadingImage}
                            className="inline-flex items-center justify-center rounded-xl bg-[#714B90] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3a73] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    </div>
                    {/* Main Control Bar */}
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-1.5 lg:p-2 shadow-lg">
                    <div className="flex items-center justify-between gap-1.5">
                        {/* Left Side Controls */}
                        <div className="flex items-center gap-1.5">
                            {/* Microphone Control */}
                            {visibleControls.microphone && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            if (micMode === 'alwaysOn') {
                                                microphoneToggle.toggle()
                                            }
                                        }}
                                        onTouchStart={(e) => {
                                            if (micMode === 'ptt') {
                                                e.preventDefault()
                                                setIsMicButtonHeld(true)
                                                microphoneToggle.toggle(true)
                                            }
                                        }}
                                        onTouchEnd={(e) => {
                                            if (micMode === 'ptt') {
                                                e.preventDefault()
                                                setIsMicButtonHeld(false)
                                                microphoneToggle.toggle(false)
                                            }
                                        }}
                                        onMouseDown={(e) => {
                                            // Desktop: Only handle in Always On mode, V key handles PTT
                                            if (micMode === 'ptt') {
                                                e.preventDefault() // Prevent click in PTT mode on desktop
                                            }
                                        }}
                                        disabled={microphoneToggle.pending}
                                        className={`relative inline-flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 xl:px-2.5 xl:py-2 text-[10px] lg:text-xs xl:text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap ${microphoneToggle.enabled || isVKeyPressed || isMicButtonHeld
                                            ? "bg-[#714B90] text-white hover:bg-[#5a3a73]"
                                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                            } ${microphoneToggle.pending ? "opacity-60 cursor-wait" : ""}`}
                                    >
                                        {microphoneToggle.pending ? (
                                            <div className="w-3.5 h-3.5 xl:w-4 xl:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (microphoneToggle.enabled || isVKeyPressed || isMicButtonHeld) ? (
                                            <Mic className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                                        ) : (
                                            <MicOff className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                                        )}
                                        <span className="hidden sm:inline">
                                            {micMode === 'ptt'
                                                ? (isVKeyPressed || isMicButtonHeld ? 'Speaking' : 'Hold V')
                                                : (microphoneToggle.enabled ? "Mic On" : "Mic Off")
                                            }
                                        </span>
                                    </button>
                                    {/* Mic mode selector (compact) */}
                                    <select
                                        value={micMode}
                                        onChange={(e) => setMicMode(e.target.value as 'ptt' | 'alwaysOn')}
                                        className="inline-flex items-center rounded-lg border bg-white px-1 xl:px-1.5 py-1 xl:py-1.5 text-[9px] lg:text-[10px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                                    >
                                        <option value="ptt">PTT</option>
                                        <option value="alwaysOn">Always On</option>
                                    </select>
                                </div>
                            )}
                            {/* Camera Control */}
                            {visibleControls.camera && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => cameraToggle.toggle()}
                                        disabled={cameraToggle.pending}
                                        className={`relative inline-flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 xl:px-2.5 xl:py-2 text-[10px] lg:text-xs xl:text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap ${cameraToggle.enabled
                                            ? "bg-[#714B90] text-white hover:bg-[#5a3a73]"
                                            : "bg-gray-600 text-white hover:bg-gray-700"
                                            } ${cameraToggle.pending ? "opacity-60 cursor-wait" : ""}`}
                                    >
                                        {cameraToggle.pending ? (
                                            <div className="w-3.5 h-3.5 xl:w-4 xl:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : cameraToggle.enabled ? (
                                            <Video className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                                        ) : (
                                            <VideoOff className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                                        )}
                                        <span className="hidden sm:inline">{cameraToggle.enabled ? "Video On" : "Video Off"}</span>
                                    </button>
                                </div>
                            )}
                            {/* Screen Share Control */}
                            {visibleControls.screenShare && (
                                <button
                                    onClick={() => screenShareToggle.toggle()}
                                    disabled={screenShareToggle.pending}
                                    className={`relative inline-flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 xl:px-2.5 xl:py-2 text-[10px] lg:text-xs xl:text-sm font-medium transition-all shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap ${screenShareToggle.enabled
                                        ? "bg-blue-500 text-white hover:bg-blue-600"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        } ${screenShareToggle.pending ? "opacity-60 cursor-wait" : ""}`}
                                >
                                    {screenShareToggle.pending ? (
                                        <div className="w-3.5 h-3.5 xl:w-4 xl:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <MonitorUp className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                                    )}
                                    <span className="hidden sm:inline">{screenShareToggle.enabled ? "Stop Share" : "Share Screen"}</span>
                                </button>
                            )}
                        </div>
                        {/* Right Side Controls */}
                        <div className="flex items-center gap-1">
                            {/* End Call */}
                            {visibleControls.leave && (
                                <button
                                    onClick={() => {
                                        handleDisconnect()
                                        setCallOpen(false)
                                        refreshHistory()  // Changed from refreshHistory()
                                    }}
                                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#714B90] px-1.5 py-1.5 xl:px-2.5 xl:py-2 text-[10px] lg:text-xs xl:text-sm font-medium text-white hover:bg-[#5a3a73] transition-all shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
                                >
                                    <PhoneOff className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                                    <span className="hidden sm:inline">End Session</span>
                                </button>
                            )}
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function MobileControlBarWrapper({
    setCallOpen,
    refreshHistory,
    micMode,
    setMicMode,
    isVKeyPressed,
    // setIsVKeyPressed is handled by parent component
    isMicButtonHeld,
    setIsMicButtonHeld,
    setSentImages,
}: {
    setCallOpen: (open: boolean) => void;
    refreshHistory: () => void;
    micMode: 'ptt' | 'alwaysOn';
    setMicMode: (mode: 'ptt' | 'alwaysOn') => void;
    isVKeyPressed: boolean;
    setIsVKeyPressed: (pressed: boolean) => void;
    isMicButtonHeld: boolean;
    setIsMicButtonHeld: (held: boolean) => void;
    setSentImages: React.Dispatch<React.SetStateAction<Array<{ id: string; dataUrl: string; timestamp: number; associatedText?: string | null }>>>;
}) {
    const { cameraToggle, microphoneToggle, screenShareToggle, handleDisconnect } = useAgentControlBar({})
    const [message, setMessage] = React.useState("")
    const room = React.useContext(RoomContext) as Room
    const chat = useChat()
    const { localParticipant } = useLocalParticipant()
    const canSend = room?.state === "connected"

    // Track video state
    const cameraTrack = localParticipant?.getTrackPublication(Track.Source.Camera)
    const isCameraEnabled = cameraTrack?.track && !cameraTrack?.isMuted

    // State for selected image (not sent yet)
    const [selectedImageMobile, setSelectedImageMobile] = React.useState<{ file: File; dataUrl: string } | null>(null)
    const [isUploadingImageMobile, setIsUploadingImageMobile] = React.useState(false)

    async function sendMessage() {
        const messageToSend = message.trim()

        // Prevent sending while upload is in progress or without text
        if (!canSend || isUploadingImageMobile) return
        if (!messageToSend) {
            if (selectedImageMobile) {
                toast.error("Please add a message before sending an image.")
            }
            return
        }
        
        const imageToSend = selectedImageMobile?.file
        const imageDataUrl = selectedImageMobile?.dataUrl

        // Clear UI immediately (like ChatGPT) - remove preview right away
        // Store references before clearing state
        const imageFileRef = imageToSend
        const imageDataUrlRef = imageDataUrl
        
        // Clear message and image preview immediately for better UX
        setMessage("")
        setSelectedImageMobile(null)

        try {
            // Use the same timestamp for both image and text so they appear together
            const sharedTimestamp = Date.now()

            // Send image FIRST (so LLM can see it), then text
            let imageUploadSuccess = true
            if (imageFileRef) {
                // Wait for image to be fully sent and processed
                imageUploadSuccess = await sendImage(imageFileRef, messageToSend || undefined, sharedTimestamp, imageDataUrlRef)
                
                // Only proceed if image upload was successful
                if (!imageUploadSuccess) {
                    // Restore image on failure so user can retry
                    if (imageFileRef && imageDataUrlRef) {
                        setSelectedImageMobile({ file: imageFileRef, dataUrl: imageDataUrlRef })
                    }
                    // Restore message text
                    setMessage(messageToSend)
                    return
                }
                
                // Wait additional time to ensure LLM has processed the image on server side
                // This delay ensures the image is available before the text message arrives
                await new Promise(resolve => setTimeout(resolve, 1500))
            }

            // Send text message AFTER image is fully processed
            if (messageToSend) {
                await chat.send(messageToSend)
            }
        } catch (e) {
            console.error("send message error", e)
            // Restore image on error so user can retry
            if (imageFileRef && imageDataUrlRef) {
                setSelectedImageMobile({ file: imageFileRef, dataUrl: imageDataUrlRef })
            }
            // Restore message text
            setMessage(messageToSend)
        }
    }

    // Image upload function for mobile
    const fileInputRefMobile = React.useRef<HTMLInputElement>(null)

    async function sendImage(file: File, messageText?: string, sharedTimestamp?: number, providedDataUrl?: string): Promise<boolean> {
        if (!canSend || !localParticipant) {
            toast.error("Not connected to room")
            return false
        }

        setIsUploadingImageMobile(true)
        const loadingToast = toast.loading("Uploading image...")

        // Prepare image data but don't add to sentImages yet
        let dataUrl: string
        let imageId: string
        let imageTimestamp: number
        let imageData: { id: string; dataUrl: string; timestamp: number; associatedText: string | null } | null = null

        try {
            // Use provided dataUrl if available, otherwise try selectedImageMobile, otherwise create one
            if (providedDataUrl) {
                dataUrl = providedDataUrl
            } else if (selectedImageMobile && selectedImageMobile.file === file) {
                dataUrl = selectedImageMobile.dataUrl
            } else {
                dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })
            }

            // Use shared timestamp if provided (for grouping with text message), otherwise use current time
            imageTimestamp = sharedTimestamp || Date.now()
            
            // Prepare image data but don't add to sentImages yet - wait for successful upload
            imageId = `image-${imageTimestamp}-${Math.random()}`
            imageData = { id: imageId, dataUrl, timestamp: imageTimestamp, associatedText: messageText || null }

            // Send file using LiveKit's sendFile method
            // According to LiveKit docs: https://docs.livekit.io/home/client/data/byte-streams/#sending-files
            if (typeof localParticipant.sendFile !== 'function') {
                throw new Error("sendFile method is not available on LocalParticipant. Please ensure you're using a compatible LiveKit client version (2.15.7+).")
            }

            try {
                const info = await localParticipant.sendFile(file, {
                    mimeType: file.type,
                    topic: 'images',
                    onProgress: (progress) => {
                        console.log('Sending image, progress:', Math.ceil(progress * 100) + '%')
                    },
                })
                
                console.log(`Image sent successfully with stream ID: ${info.id}`)
                
                // Only add to sentImages AFTER successful upload
                console.log("Adding image to chat after successful upload:", imageId, dataUrl.substring(0, 50) + "...")
                setSentImages(prev => {
                    const updated = [...prev, imageData!]
                    console.log("Updated sentImages count:", updated.length)
                    return updated
                })
                
                toast.dismiss(loadingToast)
                toast.success("Image sent successfully!")
                return true
            } catch (sendFileError) {
                console.error("Error sending file:", sendFileError)
                toast.dismiss(loadingToast)
                toast.error("Failed to send image. Please try again.")
                return false
            }
        } catch (error) {
            console.error("Error sending image:", error)
            toast.dismiss(loadingToast)
            toast.error("Failed to send image. Please try again.")
            return false
        } finally {
            setIsUploadingImageMobile(false)
        }
    }

    async function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file")
            return
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            toast.error("Image size must be less than 10MB")
            return
        }

        // Create data URL for preview
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(file)
            })
            setSelectedImageMobile({ file, dataUrl })
        } catch (error) {
            console.error("Error reading image:", error)
            toast.error("Failed to load image")
        }

        // Reset file input to allow selecting the same file again
        if (fileInputRefMobile.current) {
            fileInputRefMobile.current.value = ''
        }
    }

    function handleImageButtonClick() {
        if (isUploadingImageMobile) return
        fileInputRefMobile.current?.click()
    }

    function removeSelectedImage() {
        setSelectedImageMobile(null)
    }

    // Improved mic toggle with mobile support
    const handleMicToggle = React.useCallback(async (value?: boolean) => {
        try {
            if (!room || room.state !== "connected") {
                console.log("Room not connected, cannot toggle microphone")
                return
            }

            console.log("Toggling microphone:", value)

            // Use the toggle function from useAgentControlBar
            // Let LiveKit handle permissions directly to maintain user gesture
            if (value !== undefined) {
                await microphoneToggle.toggle(value)
            } else {
                await microphoneToggle.toggle()
            }

            console.log("Microphone toggled successfully")
        } catch (error) {
            console.error("Error toggling microphone:", error)
            // Show user-friendly error
            if (error instanceof Error) {
                const errorMsg = error.message.toLowerCase()
                if (errorMsg.includes("permission") || errorMsg.includes("denied") || errorMsg.includes("notallowed")) {
                    alert("Microphone permission denied. Please enable microphone access in your browser settings.")
                } else if (errorMsg.includes("notfound")) {
                    alert("No microphone found on this device.")
                } else {
                    alert("Failed to toggle microphone. Please try again.")
                }
            }
        }
    }, [room, microphoneToggle])

    // Improved video toggle with mobile support
    const handleVideoToggle = React.useCallback(async () => {
        try {
            if (!room || room.state !== "connected") {
                console.log("Room not connected, cannot toggle camera")
                return
            }

            console.log("Toggling camera")

            // Let LiveKit handle permissions directly to maintain user gesture
            await cameraToggle.toggle()

            console.log("Camera toggled successfully")
        } catch (error) {
            console.error("Error toggling camera:", error)
            // Show user-friendly error
            if (error instanceof Error) {
                const errorMsg = error.message.toLowerCase()
                if (errorMsg.includes("permission") || errorMsg.includes("denied") || errorMsg.includes("notallowed")) {
                    alert("Camera permission denied. Please enable camera access in your browser settings.")
                } else if (errorMsg.includes("notfound")) {
                    alert("No camera found on this device.")
                } else {
                    alert("Failed to toggle camera. Please try again.")
                }
            }
        }
    }, [room, cameraToggle])

    // Improved screen share toggle with mobile support
    const handleScreenShareToggle = React.useCallback(async () => {
        try {
            if (!room || room.state !== "connected") {
                console.log("Room not connected, cannot toggle screen share")
                return
            }

            console.log("Toggling screen share")

            // Let LiveKit handle permissions and compatibility
            await screenShareToggle.toggle()

            console.log("Screen share toggled successfully")
        } catch (error) {
            console.error("Error toggling screen share:", error)
            // Show user-friendly error
            if (error instanceof Error) {
                const errorMsg = error.message.toLowerCase()
                if (errorMsg.includes("permission") || errorMsg.includes("denied") || errorMsg.includes("notallowed")) {
                    alert("Screen sharing permission was denied.")
                } else if (errorMsg.includes("not supported") || errorMsg.includes("notsupported")) {
                    alert("Screen sharing is not supported on this device/browser.")
                } else {
                    alert("Failed to toggle screen sharing. This feature may not be available on mobile devices.")
                }
            }
        }
    }, [room, screenShareToggle])

    // Video preview component
    const videoPreview = isCameraEnabled && cameraTrack?.track ? (
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg">
            <VideoTrack
                trackRef={{
                    participant: localParticipant,
                    source: Track.Source.Camera,
                    publication: cameraTrack,
                }}
                className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="text-white text-xs font-medium">You</span>
            </div>
        </div>
    ) : null

    return (
        <>
            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRefMobile}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={!canSend || isUploadingImageMobile}
            />
            <MobileControlBar
                onMicToggle={handleMicToggle}
                onVideoToggle={handleVideoToggle}
                onScreenShareToggle={handleScreenShareToggle}
                onDisconnect={() => {
                    handleDisconnect()
                    setCallOpen(false)
                    refreshHistory()
                }}
                isMicEnabled={microphoneToggle.enabled || isVKeyPressed || isMicButtonHeld}
                isVideoEnabled={cameraToggle.enabled}
                isScreenSharing={screenShareToggle.enabled}
                micMode={micMode}
                onMicModeChange={setMicMode}
                micPending={microphoneToggle.pending}
                videoPending={cameraToggle.pending}
                screenSharePending={screenShareToggle.pending}
                isVKeyPressed={isVKeyPressed}
                isMicButtonHeld={isMicButtonHeld}
                setIsMicButtonHeld={setIsMicButtonHeld}
                message={message}
                setMessage={setMessage}
                onSendMessage={sendMessage}
                canSend={canSend}
                videoPreview={videoPreview}
                onImageUpload={handleImageButtonClick}
                isUploadingImage={isUploadingImageMobile}
                selectedImage={selectedImageMobile}
                onRemoveImage={removeSelectedImage}
            />
        </>
    )
}

function AssessmentView({
    assessmentData,
    userAnswers,
    setUserAnswers,
    onSubmit,
    submitting,
    onBack,
}: {
    assessmentData: AssessmentData
    userAnswers: Record<string, string>
    setUserAnswers: (answers: Record<string, string>) => void
    onSubmit: () => void
    submitting: boolean
    onBack: () => void
}) {
    const handleAnswerChange = (questionNum: string, value: string) => {
        setUserAnswers({ ...userAnswers, [questionNum]: value })
    }

    const renderQuestionSection = (
        title: string,
        questions: Array<Array<Record<string, string>>>,
        inputType: 'radio' | 'text' | 'textarea'
    ) => {
        if (!questions || questions.length === 0 || questions[0].length === 0) return null

        return (
            <div className="mb-8">
                <h3 className="text-lg font-bold text-[#714B90] mb-4">{title}</h3>
                {questions[0].map((q, idx) => {
                    const qNum = Object.keys(q)[0]
                    const qText = q[qNum]

                    const questionText = `Q${qNum}. ${inputType === 'radio' && qText.includes('Options:') ? qText.split('Options:')[0].trim() : qText}`
                    const convertedQuestionText = convertLatexNotation(questionText)

                    return (
                        <div key={idx} className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="font-medium text-gray-900 mb-3">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        p: ({ children }) => <span>{children}</span>,
                                        div: ({ children }) => <span>{children}</span>,
                                    }}
                                >
                                    {convertedQuestionText}
                                </ReactMarkdown>
                            </div>

                            {inputType === 'radio' && qText.includes('Options:') ? (
                                <div className="space-y-2">
                                    {qText
                                        .split('Options:')[1]
                                        .split('\n')
                                        .filter((opt) => opt.trim())
                                        .map((option, optIdx) => {
                                            const convertedOption = convertLatexNotation(option.trim())
                                            return (
                                                <label key={optIdx} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`q-${qNum}`}
                                                        value={option.trim()[0]}
                                                        checked={userAnswers[qNum] === option.trim()[0]}
                                                        onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                                                        className="w-4 h-4 text-[#714B90] focus:ring-[#714B90]"
                                                    />
                                                    <div className="text-gray-700">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkMath]}
                                                            rehypePlugins={[rehypeKatex]}
                                                            components={{
                                                                p: ({ children }) => <span>{children}</span>,
                                                                div: ({ children }) => <span>{children}</span>,
                                                            }}
                                                        >
                                                            {convertedOption}
                                                        </ReactMarkdown>
                                                    </div>
                                                </label>
                                            )
                                        })}
                                </div>
                            ) : inputType === 'textarea' ? (
                                <textarea
                                    value={userAnswers[qNum] || ''}
                                    onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                                    placeholder="Enter your answer..."
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-[#714B90] focus:border-transparent outline-none"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={userAnswers[qNum] || ''}
                                    onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                                    placeholder="Enter your answer..."
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-[#714B90] focus:border-transparent outline-none"
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="h-[86vh] flex flex-col max-w-5xl mx-auto px-1 md:px-6 sm:py-3">
            <div className="flex justify-between items-center mb-2 sm:mb-4 flex-shrink-0">
                <h2 className="text-base sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-[#714B90]" />
                    Assessment
                </h2>
                <button onClick={onBack} className="text-[#714B90] hover:underline text-xs sm:text-sm font-medium">
                    ← Back to Options
                </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl p-4 md:p-6 bg-white mb-4">
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="font-bold text-gray-900 mb-2">General Instructions</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{assessmentData.General_Instructions}</p>
                </div>

                {renderQuestionSection('Multiple Choice Questions', assessmentData.MCQs, 'radio')}
                {renderQuestionSection('True/False Questions', assessmentData.True_False_Questions, 'radio')}
                {renderQuestionSection('Fill in the Blanks', assessmentData.Fill_in_the_Blanks, 'text')}
                {renderQuestionSection('Very Short Answers', assessmentData.Very_Short_Answers, 'text')}
                {renderQuestionSection('Short Answers', assessmentData.Short_Answers, 'textarea')}
                {renderQuestionSection('Long Answers', assessmentData.Long_Answers, 'textarea')}
                {renderQuestionSection('Very Long Answers', assessmentData.Very_Long_Answers, 'textarea')}
                {renderQuestionSection('Case Studies', assessmentData.Case_Studies, 'textarea')}
            </div>

            <button
                onClick={onSubmit}
                disabled={submitting}
                className="w-full bg-[#714B90] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#5a3a73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
                {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                    </span>
                ) : (
                    'Submit Assessment'
                )}
            </button>
        </div>
    )
}

function AssessmentResultView({ result, onBack, onViewAssessment, isHistorical = false }: { result: AssessmentResult; onBack: () => void; onViewAssessment?: () => void; isHistorical?: boolean }) {
    return (
        <div className="h-[86vh] flex flex-col max-w-5xl mx-auto px-3 md:px-6 py-3">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-[#714B90]" />
                    Assessment Results
                </h2>
                <button onClick={onBack} className="text-[#714B90] hover:underline text-xs sm:text-sm font-medium">
                    ← Back to Options
                </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl p-4 md:p-5 bg-white mb-4 scrollbar-hide">
                <div className="text-center mb-6">
                    <p className="text-2xl font-bold text-gray-900">
                        {result.score_summary.score} / {result.score_summary.total}
                    </p>
                    <p className="text-gray-600 mt-2">{result.score_summary.remark}</p>
                </div>

                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-bold text-green-900 mb-2">Strengths</h3>
                        <p className="text-sm text-green-800">{result.teacher_feedback.positive_note}</p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-bold text-yellow-900 mb-2">Areas for Improvement</h3>
                        <p className="text-sm text-yellow-800">{result.teacher_feedback.improvement_note}</p>
                    </div>

                    {result.next_step && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-bold text-blue-900 mb-2">Next Steps</h3>
                            <p className="text-sm text-blue-800">{result.next_step}</p>
                        </div>
                    )}
                </div>
            </div>

            {onViewAssessment && isHistorical && (
                <button
                    onClick={onViewAssessment}
                    className="w-full bg-[#714B90] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#5a3a73] transition-colors flex-shrink-0"
                >
                    View Assessment Questions & Answers
                </button>
            )}
        </div>
    )
}

function HistoricalAssessmentView({
    assessmentData,
    userAnswers,
    onBack,
}: {
    assessmentData: AssessmentData
    userAnswers: Record<string, string>
    onBack: () => void
}) {
    const renderQuestionSection = (
        title: string,
        questions: Array<Array<Record<string, string>>>
    ) => {
        if (!questions || questions.length === 0 || questions[0].length === 0) return null

        return (
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    {title}
                </h3>
                <div className="space-y-4">
                    {questions[0].map((question, index) => {
                        const questionNum = Object.keys(question).find(key => !key.startsWith('answer-')) || ''
                        const questionText = question[questionNum] || ''
                        const answerKey = `answer-${questionNum}`
                        const userAnswer = userAnswers[questionNum] || question[answerKey] || ''

                        const convertedQuestionText = convertLatexNotation(`Question ${questionNum}: ${questionText.includes('Options:') ? questionText.split('Options:')[0].trim() : questionText}`)
                        const convertedUserAnswer = convertLatexNotation(userAnswer)

                        return (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                <div className="mb-3">
                                    <div className="font-medium text-gray-900 mb-2">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                p: ({ children }) => <span>{children}</span>,
                                                div: ({ children }) => <span>{children}</span>,
                                            }}
                                        >
                                            {convertedQuestionText}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <p className="text-sm text-gray-600 mb-1">Your Answer:</p>
                                    <div className="text-gray-900 font-medium">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                p: ({ children }) => <span>{children}</span>,
                                                div: ({ children }) => <span>{children}</span>,
                                            }}
                                        >
                                            {convertedUserAnswer}
                                        </ReactMarkdown>
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
        <div className="h-[86vh] flex flex-col max-w-5xl mx-auto px-3 md:px-6 py-3">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-[#714B90]" />
                    Completed Assessment
                </h2>
                <button onClick={onBack} className="text-[#714B90] hover:underline text-sm font-medium">
                    ← Back to Results
                </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl p-4 md:p-6 bg-white mb-4">
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="font-bold text-gray-900 mb-2">General Instructions</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{assessmentData.General_Instructions}</p>
                </div>

                {renderQuestionSection('Multiple Choice Questions', assessmentData.MCQs)}
                {renderQuestionSection('True/False Questions', assessmentData.True_False_Questions)}
                {renderQuestionSection('Fill in the Blanks', assessmentData.Fill_in_the_Blanks)}
                {renderQuestionSection('Very Short Answers', assessmentData.Very_Short_Answers)}
                {renderQuestionSection('Short Answers', assessmentData.Short_Answers)}
                {renderQuestionSection('Long Answers', assessmentData.Long_Answers)}
                {renderQuestionSection('Very Long Answers', assessmentData.Very_Long_Answers)}
                {renderQuestionSection('Case Studies', assessmentData.Case_Studies)}
            </div>
        </div>
    )
}

function DraggableVideoPreviewer({ children }: { children: React.ReactNode }) {
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [dragging, setDragging] = useState(false)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const previewRef = useRef<HTMLDivElement | null>(null)

    // Default position: above input, right side
    useEffect(() => {
        if (previewRef.current) {
            const input = document.querySelector('input[placeholder="Type your message..."]') as HTMLElement | null
            if (input) {
                const inputRect = input.getBoundingClientRect()
                setPosition({
                    x: inputRect.right - 120,
                    y: inputRect.top - 160,
                })
            } else {
                setPosition({ x: window.innerWidth - 140, y: window.innerHeight - 260 })
            }
        }
    }, [])

    const onMouseDown = (e: React.MouseEvent) => {
        setDragging(true)
        setOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        })
    }
    const onMouseUp = () => setDragging(false)

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (dragging) {
                setPosition({
                    x: e.clientX - offset.x,
                    y: e.clientY - offset.y,
                })
            }
        }

        if (dragging) {
            window.addEventListener("mousemove", onMouseMove)
            window.addEventListener("mouseup", onMouseUp)
        }

        return () => {
            window.removeEventListener("mousemove", onMouseMove)
            window.removeEventListener("mouseup", onMouseUp)
        }
    }, [dragging, offset])

    return (
        <div
            ref={previewRef}
            onMouseDown={onMouseDown}
            style={{
                position: "fixed",
                left: position.x,
                top: position.y,
                width: 160,
                height: 120,
                zIndex: 9999,
                cursor: dragging ? "grabbing" : "grab",
                borderRadius: 12,
                boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                overflow: "hidden",
                userSelect: "none",
            }}
        >
            {children}
        </div>
    )
}