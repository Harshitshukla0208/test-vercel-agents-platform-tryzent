'use client'
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import toast from "react-hot-toast"
import mathUser from "@/assets/create-profile/math-user.png"
import mathEqupments from "@/assets/create-profile/math-equpments.png"
import LeoquiIcon from "@/assets/create-profile/LeoQuiIconBall.png"
import FrameBg from "@/assets/Frame100000.png"
import Link from "next/link"
import { isAuthenticated } from "@/utils/auth"

interface FormData {
    firstName: string
    lastName: string
    userType: string
    board: string
    grade: string
    studentName: string
}

interface DropdownResponse {
    status: boolean
    message: string
    data: {
        status: boolean
        message: string
        data: string[]
    }
}

export default function CreateProfile() {
    const router = useRouter()
    const [formData, setFormData] = useState<FormData>({
        firstName: "",
        lastName: "",
        userType: "",
        board: "",
        grade: "",
        studentName: "",
    })

    const [availableBoards, setAvailableBoards] = useState<string[]>([])
    const [availableGrades, setAvailableGrades] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [fetchingGrades, setFetchingGrades] = useState(false)
    const [redirecting, setRedirecting] = useState(false)
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
    const [isAllowed, setIsAllowed] = useState(false)

    // Client-side protection: redirect unauthenticated users to login
    useEffect(() => {
        const authed = isAuthenticated()
        if (!authed) {
            setRedirecting(true)
            router.replace('/login')
            return
        }
        setIsAllowed(true)
        setHasCheckedAuth(true)
    }, [router])

    // Fetch available boards on component mount
    useEffect(() => {
        const fetchBoards = async () => {
            try {
                const response = await fetch('/api/dropdown-values')
                const data: DropdownResponse = await response.json()

                if (data.status && data.data.data) {
                    setAvailableBoards(data.data.data)
                } else {
                    toast.error('Failed to load boards')
                }
            } catch (error) {
                console.error('Error fetching boards:', error)
                toast.error('Failed to load boards')
            }
        }

        fetchBoards()
    }, [])

    // Fetch grades when board changes
    useEffect(() => {
        const fetchGrades = async () => {
            if (!formData.board) {
                setAvailableGrades([])
                return
            }

            setFetchingGrades(true)
            try {
                const response = await fetch(`/api/dropdown-values?board=${encodeURIComponent(formData.board)}`)
                const data: DropdownResponse = await response.json()

                if (data.status && data.data.data) {
                    setAvailableGrades(data.data.data)
                } else {
                    toast.error('Failed to load grades')
                    setAvailableGrades([])
                }
            } catch (error) {
                console.error('Error fetching grades:', error)
                toast.error('Failed to load grades')
                setAvailableGrades([])
            } finally {
                setFetchingGrades(false)
            }
        }

        fetchGrades()
    }, [formData.board])

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData((prev) => {
            const newData = { ...prev, [field]: value }

            // Reset dependent fields
            if (field === "board") {
                newData.grade = ""
            }

            return newData
        })
    }

    const handleSubmit = async () => {
        if (!isFormValid()) {
            toast.error('Please fill in all required fields')
            return
        }

        setSubmitting(true)

        try {
            const response = await fetch('/api/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    userType: formData.userType,
                    board: formData.board,
                    grade: formData.grade,
                    studentName: formData.userType === 'Parent' ? formData.studentName : undefined
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create profile')
            }

            toast.success('Profile created successfully!')

            // Redirect to dashboard after successful creation
            setTimeout(() => {
                router.push('/dashboard?from=profile-create')
            }, 1500)

        } catch (error: unknown) {
            const err = error as Error
            console.error('Error creating profile:', err)
            toast.error(err.message || 'Failed to create profile')
        } finally {
            setSubmitting(false)
        }
    }

    const isFormValid = () => {
        const baseValid = formData.firstName &&
            formData.lastName &&
            formData.userType &&
            formData.board &&
            formData.grade

        if (formData.userType === "Parent") {
            return baseValid && formData.studentName
        }

        return baseValid
    }

    // Avoid any flicker: render nothing until auth is verified or while redirecting
    if (redirecting || !hasCheckedAuth || !isAllowed) {
        return null
    }

    return (
        <div className="h-screen bg-[#FFFCF6] relative overflow-hidden flex flex-col">
            {/* Background Image Overlay */}
            <div className="absolute inset-0 w-full h-full z-0">
                <Image
                    src={FrameBg}
                    alt="Background"
                    fill
                    style={{ objectFit: 'cover' }}
                    className="pointer-events-none select-none"
                    priority
                    sizes="100vw"
                />
            </div>

            {/* Header */}
            <header className="relative z-10 w-full px-4 lg:px-6 py-3 bg-white shadow-sm flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <Link href='/'>
                        <div className="flex items-center gap-1">
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                                <Image
                                    src={LeoquiIcon}
                                    alt="LeoQui Logo"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 object-contain"
                                    priority
                                />
                            </div>
                            <span className="text-xl font-semibold text-[#714B90]">LeoQui</span>
                        </div>
                    </Link>

                    {/* Right side */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <a href="#" className="hidden md:block text-gray-700 hover:text-gray-900 text-sm">
                            Contact us
                        </a>
                        <div className="w-8 h-8 bg-[#714B90] rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {formData.firstName ? formData.firstName[0].toUpperCase() : 'U'}
                        </div>
                        <div className="hidden md:block text-gray-700 text-sm">Account ▼</div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-4">
                <div className="w-full max-w-7xl relative h-full flex items-center">
                    {/* Left Illustration - Hidden on mobile and tablet */}
                    <div className="absolute left-0 bottom-0 -ml-28 hidden xl:block">
                        <Image
                            src={mathUser}
                            alt="Math User"
                            width={260}
                            height={320}
                            className="w-[260px] h-[320px] object-contain object-left-bottom select-none pointer-events-none"
                            draggable={false}
                            priority
                        />
                    </div>

                    {/* Right Illustration - Hidden on mobile and tablet */}
                    <div className="absolute right-0 bottom-0 -mr-28 hidden xl:block">
                        <Image
                            src={mathEqupments}
                            alt="Math Equipments"
                            width={260}
                            height={320}
                            className="w-[260px] h-[320px] object-contain object-right-bottom select-none pointer-events-none"
                            draggable={false}
                            priority
                        />
                    </div>

                    {/* Form */}
                    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 mx-auto max-w-2xl w-full max-h-[calc(100vh-120px)] overflow-y-auto">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">Enter Details</h1>

                        <div className="space-y-4">
                            {/* Name Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-600 text-sm mb-1 block font-medium">
                                        First name
                                    </label>
                                    <input
                                        placeholder="Enter first name"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                                        className="w-full border-0 border-b-2 border-gray-200 rounded-none px-0 py-2 focus:border-[#714B90] focus:outline-none text-gray-900 placeholder-gray-400"
                                        disabled={submitting}
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-600 text-sm mb-1 block font-medium">
                                        Last name
                                    </label>
                                    <input
                                        placeholder="Enter last name"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                                        className="w-full border-0 border-b-2 border-gray-200 rounded-none px-0 py-2 focus:border-[#714B90] focus:outline-none text-gray-900 placeholder-gray-400"
                                        disabled={submitting}
                                    />
                                </div>
                            </div>

                            {/* User Type */}
                            <div>
                                <label className="text-gray-600 text-xs mb-2 block font-medium tracking-wide">USER TYPE</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { type: "Student", icon: "👨‍🎓" },
                                        { type: "Parent", icon: "👨‍👩‍👧‍👦" },
                                        { type: "Teacher", icon: "👩‍🏫" },
                                    ].map((option) => (
                                        <button
                                            key={option.type}
                                            onClick={() => handleInputChange("userType", option.type)}
                                            disabled={submitting}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200 ${formData.userType === option.type
                                                    ? "border-[#714B90] bg-[#714B9014] shadow-md"
                                                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                                                } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            <span className="text-base">{option.icon}</span>
                                            <span className="text-xs font-medium text-gray-700">{option.type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Board */}
                            <div>
                                <label className="text-gray-600 text-xs mb-2 block font-medium tracking-wide">BOARD</label>
                                {availableBoards.length === 0 ? (
                                    <div className="text-gray-500 text-sm">Loading boards...</div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {availableBoards.map((board) => (
                                            <button
                                                key={board}
                                                onClick={() => handleInputChange("board", board)}
                                                disabled={submitting}
                                                className={`px-4 py-2 rounded-xl border-2 transition-all duration-200 ${formData.board === board
                                                        ? "border-[#714B90] bg-[#714B9014] text-[#714B90] shadow-md"
                                                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700"
                                                    } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                <span className="font-medium text-sm">{board}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Grade */}
                            {formData.board && (
                                <div>
                                    <label className="text-gray-600 text-xs mb-2 block font-medium tracking-wide">GRADE</label>
                                    {fetchingGrades ? (
                                        <div className="text-gray-500 text-sm">Loading grades...</div>
                                    ) : availableGrades.length === 0 ? (
                                        <div className="text-gray-500 text-sm">No grades available for selected board</div>
                                    ) : (
                                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                            {availableGrades.map((grade) => (
                                                <button
                                                    key={grade}
                                                    onClick={() => handleInputChange("grade", grade)}
                                                    disabled={submitting}
                                                    className={`px-2 py-2 rounded-xl border-2 transition-all duration-200 ${formData.grade === grade
                                                            ? "border-[#714B90] bg-[#714B9014] text-[#714B90] shadow-md"
                                                            : "border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700"
                                                        } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                                                >
                                                    <span className="font-medium text-xs">{grade}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Student Name for Parent */}
                            {formData.userType === "Parent" && (
                                <div>
                                    <label className="text-gray-600 text-xs mb-2 block font-medium tracking-wide">STUDENT NAME</label>
                                    <input
                                        placeholder="Enter student name"
                                        value={formData.studentName}
                                        onChange={(e) => handleInputChange("studentName", e.target.value)}
                                        disabled={submitting}
                                        className="w-full border-0 border-b-2 border-gray-200 rounded-none px-0 py-2 focus:border-[#714B90] focus:outline-none text-gray-900 placeholder-gray-400"
                                    />
                                </div>
                            )}

                            {/* Extra optional fields intentionally omitted as requested */}

                            {/* Submit Button */}
                            <div className="pt-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!isFormValid() || submitting}
                                    className={`w-full py-3 rounded-xl font-medium text-base transition-all duration-200 ${isFormValid() && !submitting
                                            ? "bg-[#714B90] hover:bg-[#5a3a73] text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        }`}
                                >
                                    {submitting ? 'Creating Profile...' : 'Proceed'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
