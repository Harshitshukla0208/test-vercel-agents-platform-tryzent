import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface RatingFeedbackProps {
    agent_id: string;
    executionToken: string;
    response: any;
    onUpdate?: (rating: number, feedback: string) => void;
    isDisabled?: boolean;
}

const RatingFeedback: React.FC<RatingFeedbackProps> = ({
    agent_id,
    executionToken,
    response,
    onUpdate,
    isDisabled
}) => {
    const [rating, setRating] = useState<number>(0);
    const [feedback, setFeedback] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle Star Click
    const handleStarClick = (index: number) => {
        if (isDisabled || isSubmitting) return;
        setRating(index);
    };

    const handleSubmit = async () => {
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
                description: "Agent rated successfully.",
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
        <div className="">
            <Card className="bg-white mt-5 p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold">Rate your experience</h3>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || isDisabled || rating === 0}
                            variant="outline"
                            size="sm"
                        >
                            {isSubmitting ? 'Saving...' : 'Submit Feedback'}
                        </Button>
                    </div>
                </div>

                <div className="flex mb-4">
                    {[1, 2, 3, 4, 5].map((index) => (
                        <Star
                            key={index}
                            className={`w-6 h-6 cursor-pointer transition-colors ${rating >= index ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                            onClick={() => handleStarClick(index)}
                        />
                    ))}
                </div>

                <Textarea
                    placeholder="Share your feedback about the response..."
                    className={`w-full text-xs resize-none h-24 ${isDisabled ? 'bg-gray-100' : ''}`}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={isDisabled}
                />
            </Card>
        </div>
    );
};

export default RatingFeedback;
