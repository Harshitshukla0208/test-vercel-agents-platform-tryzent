"use client"
import React, { useState, useEffect } from 'react';
import { withProtectedRoute } from '@/components/ProtectedRoute'
import { User, ArrowRight } from 'lucide-react';
import BuyCoinsModal from './BuyCoinsModal'
import EditProfileModal from './EditProfileModal'
import Logo from '@/assets/create-profile/LeoQuiIconBall.png'
import Link from 'next/link';
import Image from 'next/image';
import LeoCoin from '@/assets/Coin.png'
import StreakIcon from '@/assets/Streak.svg'
import SittingPerson from '@/assets/Sitting.png'
import HumanImg from '@/assets/human.png'
import BoardIcon from '@/assets/Category.svg'
import GradeIcon from '@/assets/Ticket Star.svg'
import ReferAndEarnImage from '@/assets/ReferImage.svg'
import ComputerImg from '@/assets/ComputerImg.svg';
import EnglishImg from '@/assets/EnglishImg.svg';
import HindiImg from '@/assets/HindiImg.svg';
import MathsImg from '@/assets/MathsImg.svg';
import ScienceImg from '@/assets/ScienceImg.svg';
import { useSearchParams, useRouter } from 'next/navigation';
import { logout } from '@/utils/auth';
import { fetchWithAuth } from '@/lib/apiClient';

// Types for API data
type CreditsMasterItem = { event: string; credits: number }
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
    profile_completed: boolean;
}

type GetUserProfileResponse = {
    status: boolean
    message: string
    data: {
        profile: Profile
        credits_master?: CreditsMasterItem[]
    }
}

const fetchUserProfile = async (): Promise<GetUserProfileResponse> => {
    const response = await fetchWithAuth('/api/get-user-profile', { method: 'GET' })
    const data = await response.json()
    if (!response.ok) {
        throw new Error(data?.message || 'Failed to fetch profile')
    }
    return data
}

const SubjectSkeleton = () => (
    <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-20 h-20 rounded-full bg-gray-200" />
        <div className="w-16 h-4 bg-gray-200 rounded" />
    </div>
);

const Dashboard = () => {
    const [profileData, setProfileData] = useState<GetUserProfileResponse['data'] | null>(null);
    const [showBuyCoins, setShowBuyCoins] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const [showCreditsBanner, setShowCreditsBanner] = useState(false);

    useEffect(() => {
        // Check if coming from profile-create
        if (searchParams!.get('from') === 'profile-create') {
            setShowCreditsBanner(true);
            // Remove the query param for a clean URL
            const params = new URLSearchParams(Array.from(searchParams!.entries()));
            params.delete('from');
            router.replace(`/dashboard${params.toString() ? '?' + params.toString() : ''}`);
        }
    }, [searchParams, router]);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const api = await fetchUserProfile();
                if (api.status && api.data?.profile) {
                    setProfileData(api.data);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    // Fetch subjects based on loaded profile's board and grade
    useEffect(() => {
        const fetchSubjects = async (board: string, grade: string) => {
            setSubjectsLoading(true)
            try {
                const response = await fetchWithAuth(`/api/dropdown-values?board=${encodeURIComponent(board)}&grade=${encodeURIComponent(grade)}`)
                const data = await response.json()
                // Support both shapes: { data: { data: string[] } } and { data: string[] }
                const list: string[] = data?.data?.data || data?.data || []
                if (Array.isArray(list)) {
                    setSubjects(list)
                } else {
                    setSubjects([])
                }
            } catch (err) {
                console.error('Error fetching subjects:', err)
                setSubjects([])
            } finally {
                setSubjectsLoading(false)
            }
        }

        if (profileData?.profile?.board && profileData?.profile?.grade) {
            fetchSubjects(profileData.profile.board, String(profileData.profile.grade))
        } else {
            setSubjects([])
        }
    }, [profileData])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFFBF2]">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-[#714B90] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFFBF2]">
                <p className="text-red-600">Error loading profile data</p>
            </div>
        );
    }

    const { profile } = profileData;
    const creditsMaster: CreditsMasterItem[] = profileData.credits_master || []
    const referralCredits = creditsMaster.find(c => c.event?.toLowerCase() === 'referral')?.credits
    const completeProfileCredits = creditsMaster.find(c => c.event?.toLowerCase() === 'complete profile')?.credits

    const userInitials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'U'


    // Removed unused subjectImages

    // Helper to get subject image, fallback to EnglishImg
    const getSubjectImage = (rawName: string) => {
        const name = (rawName || '').toLowerCase();
        if (/(math|mathematics|arith)/.test(name)) return MathsImg;
        if (/computer|informatics|it|ict/.test(name)) return ComputerImg;
        if (/hindi/.test(name)) return HindiImg;
        if (/english|language arts/.test(name)) return EnglishImg;
        if (/science|sci/.test(name)) return ScienceImg;
        // Add more mappings as you add more images
        return EnglishImg;
    };

    const coinPackages = [
        {
            title: "1000 Leocoins",
            price: "₹100",
            originalPrice: "₹400",
            icon: "🪙",
            description: "Lorem ipsum case Start your journey by exploring classrooms with LeoQui Lorem ipsum case Start your journey by exploring classrooms with LeoQui",
            buttonColor: "bg-[#714B90] hover:bg-[#5a3a73]",
            recommended: false
        },
        {
            title: "5000 Leocoins",
            price: "₹100",
            originalPrice: "₹400",
            icon: "💰",
            description: "Lorem ipsum case Start your journey by exploring classrooms with LeoQui Lorem ipsum case Start your journey by exploring classrooms with LeoQui",
            buttonColor: "bg-yellow-500 hover:bg-yellow-600",
            recommended: true,
            cardBg: "bg-gradient-to-br from-[#714B90] to-[#5a3a73] text-white"
        },
        {
            title: "Leocoins",
            price: "Enter number",
            originalPrice: "",
            icon: "🪙",
            description: "Lorem ipsum case Start your journey by exploring classrooms with LeoQui Lorem ipsum case Start your journey by exploring classrooms with LeoQui",
            buttonColor: "bg-gray-400",
            custom: true
        }
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-1 sm:py-3 shadow-xs">
                <div className="flex items-center justify-between max-w-7xl mx-auto">

                    <div className="flex items-center gap-1">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                            <Image
                                src={Logo}
                                alt="LeoQui Logo"
                                width={32}
                                height={32}
                                className="w-8 h-8 object-contain"
                                priority
                            />
                        </div>
                        <span className="text-lg sm:text-xl font-semibold text-[#714B90]">LeoQui</span>
                    </div>

                    {/* Desktop and Mobile Menu */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <div className="hidden sm:flex items-center space-x-1 bg-[#714B9014] px-2 py-1 rounded-xl">
                            <Image
                                src={LeoCoin}
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
                            <span className="text-gray-900 hidden sm:inline">Accounts</span>
                        </div>
                        <button
                            onClick={logout}
                            className="px-3 py-1.5 border border-[#714B90] text-[#714B90] rounded-lg hover:bg-[#714B9014] transition-colors text-sm"
                        >
                            Logout
                        </button>
                    </div>
                </div>

            </div>

            <div className="max-w-7xl mx-auto p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        {/* Welcome Section */}
                        <div className="mb-6">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                                Welcome {profile.first_name}
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600 mb-4">
                                Start your journey by exploring classrooms with LeoQui
                            </p>

                            {/* Credits Banner */}
                            {showCreditsBanner && (
                                <div className="bg-[#714B90] text-white p-3 sm:p-2 rounded-lg flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-2 sm:space-x-3">
                                        <Image
                                            src={LeoCoin}
                                            alt="LeoCoin"
                                            width={20}
                                            height={20}
                                            className="w-5 h-5 object-contain flex-shrink-0"
                                            priority
                                        />
                                        <span className="text-xs sm:text-sm">You have earned free {profile.remaining_creds} LeoCoins. You can use these to try different features</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                </div>
                            )}
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full">
                                        <Image src={StreakIcon} alt="Streak" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <div>
                                        <div className="text-xl sm:text-2xl font-bold text-gray-700">{profile.days_streak}</div>
                                        <div className="text-xs sm:text-sm text-gray-500">Day streak</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10">
                                        <Image src={LeoCoin} alt="LeoCoin" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
                                    </div>
                                    <div>
                                        <div className="text-xl sm:text-2xl font-bold text-gray-700">{profile.remaining_creds}</div>
                                        <div className="text-xs sm:text-sm text-gray-500">Total LeoCoins</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enter Classroom */}
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Enter Classroom</h2>
                            {subjectsLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <SubjectSkeleton key={i} />
                                    ))}
                                </div>
                            ) : subjects.length === 0 ? (
                                <div className="text-sm text-gray-500">No subjects available</div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {subjects.map((name) => (
                                        <Link
                                            key={name}
                                            href={`/classroom?subject=${encodeURIComponent(name)}`}
                                            className="group flex flex-col items-center text-center gap-3 sm:gap-4"
                                        >
                                            <div className="relative flex items-center justify-center">
                                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#DACFF8] via-white to-[#F3EEFF] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                                                <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-[#E8E2F5] bg-white shadow-[0_10px_25px_rgba(113,75,144,0.18)] transition-all duration-200 group-hover:shadow-[0_14px_32px_rgba(113,75,144,0.25)] group-hover:-translate-y-1">
                                                    <Image src={getSubjectImage(name)} alt={`${name} icon`} className="w-9 h-9 sm:w-11 sm:h-11" />
                                                </div>
                                            </div>
                                            <span className="text-xs sm:text-sm font-semibold text-gray-600 tracking-wide">{name}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Career Counsellor Cards */}
                        <div className="space-y-4">
                            {[
                                {
                                    title: "Try Career Counsellor",
                                    description:
                                        "Personalized guidance using Perplexity's Sonar APIs to help students navigate their academic journey and find future-proof career opportunities with real-time, AI-driven insights.",
                                    href: "https://career-compass.tryzent.com/",
                                },
                                {
                                    title: "Exam Paper Generator",
                                    description:
                                        "Quickly create customized exam papers tailored to your classroom needs with AI-powered question selection.",
                                    href: "https://agents.tryzent.com/agents/test-paper-generator",
                                },
                            ].map((item) => (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block bg-[#F5F6FA] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-[#F0F1F5] transition-colors"
                                >
                                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-6 mb-3 sm:mb-0 w-full sm:w-auto">
                                        <div className="flex items-center justify-center flex-shrink-0">
                                            <Image
                                                src={item.title === "Exam Paper Generator" ? HumanImg : SittingPerson}
                                                alt={item.title === "Exam Paper Generator" ? "Human" : "Sitting"}
                                                width={80}
                                                height={80}
                                                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                                            />
                                        </div>
                                        <div className="flex-1 pr-2 sm:pr-4">
                                            <h3 className="font-semibold text-[#46295E] text-base sm:text-lg mb-1 sm:mb-2 flex items-center gap-2">
                                                {item.title}
                                                <span className="sm:hidden">→</span>
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{item.description}</p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 bg-[#714B90] rounded-full items-center justify-center text-white hover:bg-[#5a3a73] transition-colors flex-shrink-0 self-end sm:self-auto">
                                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4 sm:space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#714B90] rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <h3 className="font-semibold text-base sm:text-lg text-gray-900 truncate">{profile.first_name} {profile.last_name}</h3>
                                    <p className="text-xs sm:text-sm font-medium text-gray-700">({profile.user_type})</p>
                                    <p className="text-xs font-medium text-gray-400 truncate">{profile.email}</p>
                                    {profile.phone_no && (
                                        <p className="text-xs font-medium text-gray-400 truncate">{profile.phone_no}</p>
                                    )}
                                </div>
                            </div>
                            <div className="border-t border-gray-200 my-3" />
                            {/* Board and Class section with conditional rendering for Class and divider */}
                            {(() => {
                                // Only include student_name if user_type is 'Parent'
                                const baseFields = [
                                    profile.first_name,
                                    profile.last_name,
                                    profile.email,
                                    profile.phone_no,
                                    profile.user_type,
                                    profile.board,
                                    profile.grade,
                                    profile.date_of_birth,
                                    profile.gender
                                ];
                                const fields = profile.user_type === 'Parent'
                                    ? [...baseFields, profile.student_name]
                                    : baseFields;
                                const totalFields = fields.length;
                                const filledFields = fields.filter(v => typeof v === 'number' ? true : !!(typeof v === 'string' ? v.trim() : v)).length;
                                const percent = Math.round((filledFields / totalFields) * 100);
                                // Removed unused isComplete
                                return (
                                    <>
                                        <div className="space-y-2 text-xs sm:text-sm">
                                            <div className='flex flex-col sm:flex-row gap-2 sm:gap-10'>
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Image src={BoardIcon} alt="Board" width={16} height={16} className="w-4 h-4" />
                                                    <span>Board : <span className="font-medium text-gray-900">{profile.board}</span></span>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Image src={GradeIcon} alt="Class" width={16} height={16} className="w-4 h-4" />
                                                    <span>Class : <span className="font-medium text-gray-900">{profile.grade}th</span></span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Only show divider if progress bar or profile complete text will be shown */}
                                        {(percent < 100 && !profile.profile_completed) && <div className="border-t border-gray-200 my-3" />}
                                        {/* Profile Completion */}
                                        {(percent < 100 && !profile.profile_completed) && (
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-gray-800 font-semibold">Complete Profile</span>
                                                    {typeof completeProfileCredits === 'number' && (
                                                        <div className="flex items-center gap-1 text-gray-800">
                                                            <Image src={LeoCoin} alt="LeoCoin" width={16} height={16} className="w-4 h-4 object-contain" />
                                                            <span className="font-semibold text-sm">{completeProfileCredits}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-2 bg-blue-500 transition-all"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-gray-600 text-xs">{`${percent}% completed`}</span>
                                                    <span className="text-gray-500 text-xs">{filledFields}/{totalFields} fields</span>
                                                </div>
                                                <p className="text-gray-500 text-xs mt-1">Complete all the fields by clicking Edit Profile</p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                            <button
                                onClick={() => setShowEditProfile(true)}
                                className="w-full mt-4 py-2 border border-[#714B90] text-[#714B90] rounded-lg hover:bg-[#714B9014] transition-colors text-sm sm:text-base"
                            >
                                Edit Profile
                            </button>
                        </div>

                        {/* Refer & Earn */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-2 max-w-sm mx-auto shadow-sm">
                            {/* Illustration */}
                            <div className="mb-4 sm:mb-6">
                                <div className="w-full rounded-lg flex items-center justify-center mb-2">
                                    <Image src={ReferAndEarnImage} alt="Refer and Earn" className="w-36 sm:w-48 md:w-52 h-auto" />
                                </div>
                            </div>

                            {/* Title */}
                            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2 text-center">
                                Refer & Earn More LeoCoins
                            </h3>

                            {/* Description */}
                            <p className="text-xs sm:text-sm text-gray-600 mb-3 text-center leading-relaxed px-2">
                                Invite your friends to explore LeoQui and collect LeoCoins when they join.
                            </p>

                            {/* Coin reward */}
                            <div className="flex items-center justify-center mb-4 sm:mb-6 space-x-2">
                                <Image src={LeoCoin} alt="LeoCoin" width={20} height={20} className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
                                <span className="font-bold text-base sm:text-lg text-gray-900">
                                    {typeof referralCredits === 'number' ? `${referralCredits} LeoCoins per referral` : 'Refer friends to earn rewards'}
                                </span>
                            </div>

                            {/* CTA Button */}
                            <button className="w-full py-2 bg-[#714B90] mb-3 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-[#5a3a73] transition-colors shadow-sm">
                                Refer a Friend
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Buy Coins Modal */}
            <BuyCoinsModal open={showBuyCoins} onClose={() => setShowBuyCoins(false)} packages={coinPackages} />

            {/* Edit Profile Modal */}
            <EditProfileModal
                open={showEditProfile}
                onClose={() => setShowEditProfile(false)}
                profile={profile}
                onProfileUpdate={() => {
                    // Refresh profile data
                    const loadProfile = async () => {
                        try {
                            const api = await fetchUserProfile();
                            if (api.status && api.data?.profile) {
                                setProfileData(api.data);
                            }
                        } catch (error) {
                            console.error('Error refreshing profile:', error);
                        }
                    };
                    loadProfile();
                }}
            />
        </div>
    );
};

export default withProtectedRoute(Dashboard)
