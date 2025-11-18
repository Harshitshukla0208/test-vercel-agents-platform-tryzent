"use client"
import { useEffect, useState, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

interface ProfileShape {
    first_name: string
    last_name: string
    email?: string
    phone_no?: string
    gender?: string
    date_of_birth?: string
    board: string
    grade: string | number
    user_type: string
    student_name?: string
}

interface EditProfileModalProps {
    open: boolean
    onClose: () => void
    profile: ProfileShape
    onProfileUpdate?: () => void
}

export default function EditProfileModal({ open, onClose, profile, onProfileUpdate }: EditProfileModalProps) {
    // Local editable state
    const [firstName, setFirstName] = useState(profile.first_name || '')
    const [lastName, setLastName] = useState(profile.last_name || '')
    const [email] = useState(profile.email || '')
    const [phone, setPhone] = useState(profile.phone_no || '')
    const [gender, setGender] = useState(profile.gender || '')
    // Convert DD/MM/YYYY -> YYYY-MM-DD for <input type="date"/>
    const toISODate = (d: string): string => {
        const match = (d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (match) {
            const [, dd, mm, yyyy] = match
            return `${yyyy}-${mm}-${dd}`
        }
        return d || ''
    }
    const toDisplayDate = (iso: string): string => {
        const match = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (match) {
            const [, yyyy, mm, dd] = match
            return `${dd}/${mm}/${yyyy}`
        }
        return iso || ''
    }
    const [dob, setDob] = useState(toISODate(profile.date_of_birth || ''))
    const [board, setBoard] = useState(String(profile.board || ''))
    const [grade, setGrade] = useState(String(profile.grade || ''))
    const [userType, setUserType] = useState(profile.user_type || 'Student')
    const [studentName, setStudentName] = useState(profile.student_name || '')
    const hadPhoneInitially = useMemo(() => !!(profile.phone_no || '').trim(), [profile.phone_no])

    const [availableBoards, setAvailableBoards] = useState<string[]>([])
    const [availableGrades, setAvailableGrades] = useState<string[]>([])
    const [loadingBoards, setLoadingBoards] = useState(false)
    const [loadingGrades, setLoadingGrades] = useState(false)

    // Fetch boards once
    useEffect(() => {
        const fetchBoards = async () => {
            setLoadingBoards(true)
            try {
                const res = await fetch('/api/dropdown-values')
                const data = await res.json()
                const list: string[] = data?.data?.data || data?.data || []
                if (Array.isArray(list)) setAvailableBoards(list)
            } catch (e) {
                console.error('Failed to load boards', e)
            } finally {
                setLoadingBoards(false)
            }
        }
        fetchBoards()
    }, [])

    // Fetch grades when board changes
    useEffect(() => {
        const fetchGrades = async () => {
            if (!board) {
                setAvailableGrades([])
                return
            }
            setLoadingGrades(true)
            try {
                const res = await fetch(`/api/dropdown-values?board=${encodeURIComponent(board)}`)
                const data = await res.json()
                const list: string[] = data?.data?.data || data?.data || []
                if (Array.isArray(list)) setAvailableGrades(list)
                // If current grade is not in list, reset
                if (list.length && !list.includes(String(grade))) {
                    setGrade('')
                }
            } catch (e) {
                console.error('Failed to load grades', e)
                setAvailableGrades([])
            } finally {
                setLoadingGrades(false)
            }
        }
        fetchGrades()
    }, [board, grade])

    const phoneRequiredEmpty = useMemo(() => hadPhoneInitially && !(phone || '').trim(), [hadPhoneInitially, phone])

    const isFormValid = useMemo(() => {
        return (
            firstName &&
            lastName &&
            userType &&
            board &&
            grade &&
            (userType !== 'Parent' || !!studentName) &&
            !phoneRequiredEmpty
        )
    }, [firstName, lastName, userType, board, grade, studentName, phoneRequiredEmpty])

    const handleSave = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isFormValid) {
            toast.error('Please fill all required fields')
            return
        }
        if (phoneRequiredEmpty) {
            toast.error('Phone number is required')
            return
        }
        if (phone && !/^\d{10}$/.test(phone)) {
            toast.error('Phone number must be exactly 10 digits')
            return
        }
        try {
            const res = await fetch('/api/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: firstName || '',
                    last_name: lastName || '',
                    user_type: userType || '',
                    board: board || '',
                    grade: grade || '',
                    student_name: userType === 'Parent' ? (studentName || '') : '',
                    phone_no: phone || '',
                    gender: gender || '',
                    date_of_birth: dob ? toDisplayDate(dob) : '',
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data?.message || 'Failed to update profile')

            toast.success('Profile updated successfully')
            onClose()
            // Refresh profile data without full page reload
            if (onProfileUpdate) {
                onProfileUpdate()
            }
        } catch (err: unknown) {
            const error = err as Error
            console.error('Update profile failed', error)
            toast.error(error?.message || 'Failed to update profile')
        }
    }, [isFormValid, firstName, lastName, userType, board, grade, studentName, phone, gender, dob, onClose, onProfileUpdate, phoneRequiredEmpty]);

    return (
        <>
            {open && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-xl sm:rounded-2xl max-w-2xl w-full max-h-[65vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Profile</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            </div>

                            <form className="space-y-3 sm:space-y-4" onSubmit={handleSave}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">First Name</label>
                                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm sm:text-base" placeholder="Enter first name" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Last Name</label>
                                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm sm:text-base" placeholder="Enter last name" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            readOnly
                                            disabled
                                            className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg text-gray-500 placeholder-gray-400 bg-gray-100 cursor-not-allowed text-sm sm:text-base"
                                            placeholder="Email is not editable"
                                            title="Email cannot be edited"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className={`w-full p-2.5 sm:p-3 border rounded-lg text-gray-900 placeholder-gray-400 text-sm sm:text-base ${phoneRequiredEmpty ? 'border-red-400' : 'border-gray-300'}`}
                                            placeholder="Enter phone number"
                                        />
                                        {phoneRequiredEmpty && (
                                            <p className="mt-1 text-xs text-red-500">Phone number cannot be empty.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Gender</label>
                                        <div className="flex flex-wrap gap-3 sm:gap-4 text-gray-700 text-sm sm:text-base">
                                            <label className="flex items-center">
                                                <input type="radio" name="gender" value="Male" checked={gender === 'Male'} onChange={() => setGender('Male')} className="mr-2" />
                                                Male
                                            </label>
                                            <label className="flex items-center">
                                                <input type="radio" name="gender" value="Female" checked={gender === 'Female'} onChange={() => setGender('Female')} className="mr-2" />
                                                Female
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">DOB</label>
                                        <input
                                            type="date"
                                            value={dob}
                                            onChange={(e) => setDob(e.target.value)}
                                            className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">BOARD</label>
                                        {loadingBoards ? (
                                            <div className="text-sm text-gray-500">Loading boards...</div>
                                        ) : (
                                            <select value={board} onChange={(e) => setBoard(e.target.value)} className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg text-gray-900 text-sm sm:text-base">
                                                <option value="">Select board</option>
                                                {availableBoards.map((b) => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">CLASS</label>
                                        {loadingGrades ? (
                                            <div className="text-sm text-gray-500">Loading classes...</div>
                                        ) : (
                                            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg text-gray-900 text-sm sm:text-base">
                                                <option value="">Select class</option>
                                                {availableGrades.map((g) => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-700 mb-2">USER TYPE</label>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-gray-700 text-sm sm:text-base">
                                        <label className="flex items-center">
                                            <input type="radio" name="userType" value="Student" checked={userType === 'Student'} onChange={() => setUserType('Student')} className="mr-2" />
                                            <span>👨‍🎓 Student</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input type="radio" name="userType" value="Parent" checked={userType === 'Parent'} onChange={() => setUserType('Parent')} className="mr-2" />
                                            <span>👨‍👩‍👧‍👦 Parent</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input type="radio" name="userType" value="Teacher" checked={userType === 'Teacher'} onChange={() => setUserType('Teacher')} className="mr-2" />
                                            <span>👩‍🏫 Teacher</span>
                                        </label>
                                    </div>
                                </div>

                                {userType === 'Parent' && (
                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Student Name</label>
                                        <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm sm:text-base" placeholder="Enter student name" />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className={`w-full py-2.5 sm:py-3 bg-[#714B90] text-white rounded-lg font-semibold transition-colors text-sm sm:text-base ${!isFormValid ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#5a3a73]'}`}
                                >
                                    Save Changes
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}