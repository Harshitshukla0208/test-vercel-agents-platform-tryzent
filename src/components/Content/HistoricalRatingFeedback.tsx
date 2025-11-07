import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Star, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface HistoricalRatingFeedbackProps {
    agent_id: string;
    executionToken: string;
    initialRating: number;
    initialFeedback: string;
    agentOutputs: any;
    onUpdate?: (rating: number, feedback: string) => void;
    isDisabled?: boolean;
}

const HistoricalRatingFeedback: React.FC<HistoricalRatingFeedbackProps> = ({
    agent_id,
    executionToken,
    initialRating,
    initialFeedback,
    agentOutputs,
    onUpdate,
    isDisabled = false
}) => {
    const [rating, setRating] = useState<number>(initialRating || 0);
    const [feedback, setFeedback] = useState<string>(initialFeedback || "");
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Use this effect to update internal state when props change OR when executionToken changes
    useEffect(() => {
        setRating(initialRating || 0);
        setFeedback(initialFeedback || "");
    }, [initialRating, initialFeedback, executionToken]);

    const handleRatingClick = (value: number) => {
        if (isDisabled) return;
        setRating(value);
    };

    const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (isDisabled) return;
        setFeedback(e.target.value);
    };

    const handleSave = async () => {
        if (isSubmitting || !rating) return;

        try {
            setIsSubmitting(true);

            // Get access token from cookies
            const accessToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('access_token='))
                ?.split('=')[1];

            if (!accessToken) {
                throw new Error('Access token not found');
            }

            // Call your Next.js API route instead of external API directly
            const res = await fetch('/api/ratings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    agent_id: agent_id,
                    execution_id: executionToken,
                    response_rating: rating,
                    response_feedback: feedback
                })
            });

            const data = await res.json();

            if (!res.ok || !data.status) {
                throw new Error(data.message || 'Failed to submit rating');
            }

            onUpdate?.(rating, feedback);
            toast({
                title: "Success",
                description: "Rating and Feedback updated successfully.",
                duration: 3000
            });

        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to submit rating and feedback.",
                variant: "destructive",
                duration: 3000
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="bg-white mt-5 p-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold">Rate your experience</h3>
                <div className="flex items-center gap-2">
                    {isDisabled && (
                        <div className="flex items-center text-amber-600 text-xs">
                            <AlertCircle size={14} className="mr-1" />
                            Save response changes first
                        </div>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={isSubmitting || isDisabled}
                        variant="outline"
                        size="sm"
                    >
                        {isSubmitting ? 'Saving...' : 'Update Feedback'}
                    </Button>
                </div>
            </div>

            <div className="flex mb-4">
                {[1, 2, 3, 4, 5].map((value) => (
                    <div
                        key={value}
                        className={`p-1 ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        onMouseEnter={() => !isDisabled && setHoverRating(value)}
                        onMouseLeave={() => !isDisabled && setHoverRating(0)}
                        onClick={() => handleRatingClick(value)}
                    >
                        <Star
                            className={`h-6 w-6 ${(hoverRating ? value <= hoverRating : value <= rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                                }`}
                        />
                    </div>
                ))}
            </div>

            <Textarea
                placeholder="Share your feedback about the response..."
                className={`w-full text-sm resize-none h-24 ${isDisabled ? 'bg-gray-100' : ''}`}
                value={feedback}
                onChange={handleFeedbackChange}
                disabled={isDisabled}
            />
        </Card>
    );
};

export default HistoricalRatingFeedback;
