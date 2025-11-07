'use client'
import React, { useEffect, useState } from 'react';
import Screen1 from '@/components/Content/Screen1';
import AudioNotesScreen from '@/components/AudioNoteSummarizer/AudioNotesSummarizer';
import LessonPlan from '@/components/LessonPlanner/LessonPlan';
import TokenExpiryProvider from '@/components/Content/TokenExpiryProvider';
import { useParams } from 'next/navigation';
import TestPaperGeneratorScreen from '@/components/TestPaperGenerator/TestPaper';
import TravelPlannerScreen from '@/components/TravelPlanner/TravelPlanner';
import WorkoutPlanner from '@/components/WorkoutPlanner/WorkoutPlanner';
import DietPlannerScreen from '@/components/DietPlanner/DietPlanner';
import HealthInsuranceFinderScreen from '@/components/HealthInsuranceFinder/HealthInsuranceFinder';
import ResumeScorerScreen from '@/components/ResumeScorer/ResumeScorer';

const AgentPage = () => {
    const params = useParams();
    const agent_id = params?.agent_id as string | undefined;
    
    const [agentName, setAgentName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!agent_id) return;
        
        const fetchAgentDetails = async () => {
            try {
                const res = await fetch(`/api/get-agent-details/${agent_id}`);
                const data = await res.json();
                setAgentName(data.data?.agent_Name || null);
            } catch (err) {
                setAgentName(null);
            } finally {
                setLoading(false);
            }
        };
        fetchAgentDetails();
    }, [agent_id]);

    if (!agent_id) return <div>Invalid agent ID.</div>;
    if (loading) return <div></div>;
    if (!agentName) return <div>Agent not found.</div>;

    return (
        <TokenExpiryProvider>
            {agentName === 'Audio Notes Summarizer' ? (
                <AudioNotesScreen />
            ) : agentName === 'Lesson Planner' ? (
                <LessonPlan />
            ) : agentName === 'Test Paper Generator' ? (
                <TestPaperGeneratorScreen />
            ) : agentName === 'Travel Planner' ? (
                <TravelPlannerScreen />
            ) :  agentName === 'Workout Planner' ? (
                <WorkoutPlanner />
            ) :  agentName === 'Diet Planner' ? (
                <DietPlannerScreen />
            ) : agentName === 'Health Insurance Finder' ? (
                <HealthInsuranceFinderScreen />
            ) : agentName === 'Resume Scorer' ? (
                <ResumeScorerScreen />
            ) :(
                <Screen1 />
            )}
        </TokenExpiryProvider>
    );
};

export default AgentPage;
