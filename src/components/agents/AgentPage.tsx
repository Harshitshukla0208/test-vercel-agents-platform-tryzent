"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AuthModal from "./AuthModal"
import type { Agent } from "@/lib/agentSlugs"
import LessonPlannerLanding from "./landing-pages/LessonPlannerLanding"
import TravelPlannerLanding from "./landing-pages/TravelPlannerLanding"
import WorkoutPlannerLanding from "./landing-pages/WorkoutPlannerLanding"
import DietPlannerLanding from "./landing-pages/DietPlannerLanding"
import AudioNoteSummarizerLanding from "./landing-pages/AudioNoteSummarizerLanding"
import TestPaperLanding from "./landing-pages/TestPaperLanding"
import ResumeScorerLanding from "./landing-pages/ResumeScorerLanding"

interface AgentPageProps {
    slug: string
    agent: Agent
    metadata: {
        title: string
        description: string
        features: string[]
        benefits: string[]
        keywords: string
        category: string
        rating: number
        executionCount: number
        credits: number
    }
}

export default function AgentPage({ slug, agent, metadata }: AgentPageProps) {
    const [showAuthModal, setShowAuthModal] = useState(false)
    const router = useRouter()

    const handleGetStarted = () => {
        // Check auth by cookie
        const token =
            typeof document !== "undefined"
                ? document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("access_token="))
                    ?.split("=")[1]
                : null

        if (token) {
            // User is authenticated, go directly to the agent
            router.push(`/agent/${agent.agent_id}`)
        } else {
            // User needs to authenticate - set redirect to the actual agent page
            // Store in both sessionStorage and localStorage for Google OAuth compatibility
            if (typeof window !== "undefined") {
                const redirectPath = `/agent/${agent.agent_id}`;
                const redirectData = {
                    path: redirectPath,
                    fromAgent: true,
                    fromHome: false,
                    timestamp: Date.now(),
                    source: 'agent'
                };
                
                // Store in sessionStorage (for normal auth flow)
                sessionStorage.setItem("redirectAfterLogin", redirectPath);
                sessionStorage.setItem("authFromAgent", "true");
                
                // Store in localStorage (for Google OAuth - persists across redirects)
                localStorage.setItem("googleAuthRedirectState", JSON.stringify(redirectData));
            }
            setShowAuthModal(true)
        }
    }

    const handleAuthSuccess = () => {
        setShowAuthModal(false)
        // The modal already redirects using redirectAfterLogin logic to /agent/[id]
        // As a safety, if still here, navigate to the agent:
        router.push(`/agent/${agent.agent_id}`)
    }

    const renderLandingPage = () => {
        switch (slug) {
            case "lesson-planner":
                return <LessonPlannerLanding agent={agent} metadata={metadata} onGetStarted={handleGetStarted} />
            case "travel-planner":
                return <TravelPlannerLanding agent={agent} metadata={metadata} onGetStarted={handleGetStarted} />
            case "workout-planner":
                return <WorkoutPlannerLanding agent={agent} metadata={metadata} onGetStarted={handleGetStarted} />
            case "diet-planner":
                return <DietPlannerLanding agent={agent} metadata={metadata} onGetStarted={handleGetStarted} />
            case "audio-notes-summarizer":
                return <AudioNoteSummarizerLanding agent={agent} metadata={metadata} onGetStarted={handleGetStarted} />
            case "test-paper":
            case "test-paper-generator":
                return <TestPaperLanding agent={agent} metadata={metadata} onGetStarted={handleGetStarted} />
            case "resume-scorer":
                return <ResumeScorerLanding agent={agent} metadata={metadata} onGetStarted={handleGetStarted} />
            default:
                // Fallback to a clean, minimal variant of Lesson Planner layout
                return <LessonPlannerLanding agent={agent} metadata={metadata} onGetStarted={handleGetStarted} />
        }
    }

    return (
        <>
            {renderLandingPage()}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSuccess={handleAuthSuccess}
                agentName={agent.agent_Name}
                agentId={agent.agent_id}
            />
        </>
    )
}
