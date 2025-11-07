"use client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    StarIcon,
    BookOpen,
    AudioLines,
    Bot,
    Zap,
    Users,
    Shield,
    FileText,
    Calculator,
    ImageIcon,
    Video,
    Music,
    Code,
    Plane,
    Dumbbell,
    Utensils,
} from "lucide-react"
import { getCookie } from "cookies-next"

interface CardData {
    title: string
    description: string
    executionCount: number
    executionCredit: number
    rating: number
    agent_id: string
    agent_Type: string
    agent_Category?: string
}

// Generate slug from agent name (same function as in agentSlugs.ts)
const generateSlug = (agentName: string): string => {
    return agentName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single
        .trim()
}

// Enhanced redirection storage for Google OAuth
const storeRedirectForGoogleAuth = (agentId: string) => {
    if (typeof window !== 'undefined') {
        const redirectData = {
            path: `/agent/${agentId}`,
            fromAgent: true,
            fromHome: false,
            timestamp: Date.now()
        };

        // Store in both sessionStorage and localStorage for robust Google OAuth handling
        sessionStorage.setItem('redirectAfterLogin', `/agent/${agentId}`);
        sessionStorage.setItem('authFromAgent', 'true');
        localStorage.setItem('googleAuthRedirectState', JSON.stringify(redirectData));
    }
};

const SingleCard = ({
    title,
    description,
    executionCount,
    executionCredit,
    rating,
    agent_id,
    agent_Type,
    agent_Category,
}: CardData) => {
    const router = useRouter()

    const checkAuthAndRedirect = () => {
        const accessToken = getCookie("access_token")
        if (accessToken) {
            // User is authenticated, go directly to agent
            router.push(`/agent/${agent_id}`)
        } else {
            // User not authenticated, store redirect destination properly
            storeRedirectForGoogleAuth(agent_id);

            // Redirect to auth with agent info
            router.push(`/auth?from=agent&agent_id=${agent_id}`)
        }
    }

    // Get icon and styling based on category from API or specific agent name
    const getAgentConfig = (category = "General", agentTitle = "") => {
        // Check for specific agent names first
        if (agentTitle.toLowerCase() === "diet planner") {
            return {
                icon: Utensils,
                cardBg: "bg-violet-50",
                iconColor: "text-violet-600",
                categoryColor: "bg-violet-50 text-violet-600",
                borderColor: "border-violet-200",
            }
        }

        const categoryLower = category.toLowerCase()

        switch (categoryLower) {
            case "audio":
                return {
                    icon: AudioLines,
                    cardBg: "bg-purple-50",
                    iconColor: "text-purple-600",
                    categoryColor: "bg-purple-50 text-purple-600",
                    borderColor: "border-purple-200",
                }
            case "education":
                return {
                    icon: BookOpen,
                    cardBg: "bg-blue-50",
                    iconColor: "text-blue-600",
                    categoryColor: "bg-blue-50 text-blue-600",
                    borderColor: "border-blue-200",
                }
            case "travel":
                return {
                    icon: Plane,
                    cardBg: "bg-indigo-50",
                    iconColor: "text-indigo-600",
                    categoryColor: "bg-indigo-50 text-indigo-600",
                    borderColor: "border-indigo-200",
                }
            case "fitness":
            case "health & fitness":
                return {
                    icon: Dumbbell,
                    cardBg: "bg-violet-50",
                    iconColor: "text-violet-600",
                    categoryColor: "bg-violet-50 text-violet-600",
                    borderColor: "border-violet-200",
                }
            case "productivity":
                return {
                    icon: Zap,
                    cardBg: "bg-green-50",
                    iconColor: "text-green-600",
                    categoryColor: "bg-green-50 text-green-600",
                    borderColor: "border-green-200",
                }
            case "business":
                return {
                    icon: Users,
                    cardBg: "bg-orange-50",
                    iconColor: "text-orange-600",
                    categoryColor: "bg-orange-50 text-orange-600",
                    borderColor: "border-orange-200",
                }
            case "security":
                return {
                    icon: Shield,
                    cardBg: "bg-red-50",
                    iconColor: "text-red-600",
                    categoryColor: "bg-red-50 text-red-600",
                    borderColor: "border-red-200",
                }
            case "content":
            case "writing":
                return {
                    icon: FileText,
                    cardBg: "bg-indigo-50",
                    iconColor: "text-indigo-600",
                    categoryColor: "bg-indigo-50 text-indigo-600",
                    borderColor: "border-indigo-200",
                }
            case "analytics":
            case "data":
                return {
                    icon: Calculator,
                    cardBg: "bg-teal-50",
                    iconColor: "text-teal-600",
                    categoryColor: "bg-teal-50 text-teal-600",
                    borderColor: "border-teal-200",
                }
            case "image":
            case "visual":
                return {
                    icon: ImageIcon,
                    cardBg: "bg-pink-50",
                    iconColor: "text-pink-600",
                    categoryColor: "bg-pink-50 text-pink-600",
                    borderColor: "border-pink-200",
                }
            case "video":
                return {
                    icon: Video,
                    cardBg: "bg-violet-50",
                    iconColor: "text-violet-600",
                    categoryColor: "bg-violet-50 text-violet-600",
                    borderColor: "border-violet-200",
                }
            case "music":
                return {
                    icon: Music,
                    cardBg: "bg-rose-50",
                    iconColor: "text-rose-600",
                    categoryColor: "bg-rose-50 text-rose-600",
                    borderColor: "border-rose-200",
                }
            case "development":
            case "code":
                return {
                    icon: Code,
                    cardBg: "bg-slate-50",
                    iconColor: "text-slate-600",
                    categoryColor: "bg-slate-50 text-slate-600",
                    borderColor: "border-slate-200",
                }
            case "communication":
                return {
                    icon: Users,
                    cardBg: "bg-green-50",
                    iconColor: "text-green-600",
                    categoryColor: "bg-green-50 text-green-600",
                    borderColor: "border-green-200",
                }
            case "translation":
                return {
                    icon: FileText,
                    cardBg: "bg-cyan-50",
                    iconColor: "text-cyan-600",
                    categoryColor: "bg-cyan-50 text-cyan-600",
                    borderColor: "border-cyan-200",
                }
            case "marketing":
                return {
                    icon: Users,
                    cardBg: "bg-pink-50",
                    iconColor: "text-pink-600",
                    categoryColor: "bg-pink-50 text-pink-600",
                    borderColor: "border-pink-200",
                }
            case "finance":
                return {
                    icon: Shield,
                    cardBg: "bg-blue-50",
                    iconColor: "text-blue-800",
                    categoryColor: "bg-blue-100 text-blue-800",
                    borderColor: "border-blue-300",
                }
            case "career":
                return {
                    icon: Users,
                    cardBg: "bg-blue-50",
                    iconColor: "text-blue-800",
                    categoryColor: "bg-blue-100 text-blue-800",
                    borderColor: "border-blue-300",
                }
            default:
                return {
                    icon: Bot,
                    cardBg: "bg-gray-50",
                    iconColor: "text-gray-600",
                    categoryColor: "bg-gray-50 text-gray-600",
                    borderColor: "border-gray-200",
                }
        }
    }

    const agentConfig = getAgentConfig(agent_Category, title)
    const IconComponent = agentConfig.icon
    const agentSlug = generateSlug(title)

    return (
        <div
            className={`${agentConfig.cardBg} ${agentConfig.borderColor} border-2 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group w-full max-w-sm mx-auto animate-fade-in h-80 flex flex-col`}
        >
            {/* Header with Icon and Category */}
            <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300">
                    <IconComponent className={`w-5 h-5 ${agentConfig.iconColor}`} />
                </div>
                <span className={`px-2 py-1 rounded-md text-xs bg-white shadow-sm border border-gray-200 font-medium ${agentConfig.categoryColor}`}>
                    {agent_Category || "General"}
                </span>
            </div>

            {/* Agent Name */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors line-clamp-2">
                {title}
            </h3>

            {/* Description - Fixed height for consistency */}
            <div className="flex-grow mb-3 min-h-[60px]">
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">{description}</p>
            </div>

            {/* Execution Credit */}
            <div className="mb-3">
                <p className="text-xs text-gray-600">
                    {executionCredit} credit{executionCredit !== 1 ? "s" : ""} per execution
                </p>
            </div>

            {/* Bottom Section: Rating & Uses + Buttons */}
            <div className="flex flex-col gap-2 mt-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <StarIcon className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-500 ml-1">
                            {executionCount} execution{executionCount !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                {/* Button Group - Responsive and properly aligned */}
                <div className="flex flex-row sm:flex-row gap-2">
                    {/* Try Now Button */}
                    <button
                        onClick={checkAuthAndRedirect}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 hover:scale-[1.02] active:scale-95 whitespace-nowrap text-sm"
                    >
                        Try Now
                    </button>

                    {/* View Details Button */}
                    <Link href={`/agents/${agentSlug}`} className="flex-1">
                        <button className="w-full bg-white text-blue-600 py-2 px-4 rounded-lg font-normal border border-blue-600 hover:bg-blue-50 transition-colors duration-200 hover:scale-[1.02] active:scale-95 whitespace-nowrap text-sm">
                            View Details
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default SingleCard