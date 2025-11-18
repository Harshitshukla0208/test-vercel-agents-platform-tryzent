import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    try {
        const { board, grade, subject, chapter, test_duration, difficulty, total_marks } = req.body

        // Get auth token from request headers
        const authToken = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '')
        if (!authToken) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        const inputString = JSON.stringify({
            board,
            grade,
            subject,
            test_duration: test_duration || 10,
            difficulty: difficulty || 'easy',
            total_marks: total_marks || 7,
            topics: [],
            chapters: [
                {
                    chapter_number: chapter,
                    assigned_marks: total_marks || 7,
                    questions: [
                        {
                            mcqs: 1,
                            very_short_answers: 1,
                            short_answers: 1,
                            long_answers: 1,
                            very_long_answers: 1,
                            case_studies: 1,
                            truth_False_questions: 0,
                            fill_in_the_blanks: 1,
                        },
                    ],
                },
            ],
            marks_of_each_questions: {
                marks_of_each_mcqs: 1,
                marks_of_each_very_short_answers: 1,
                marks_of_each_short_answer: 1,
                marks_of_each_long_answer: 1,
                marks_of_each_very_long_answer: 1,
                marks_of_each_case_studies: 1,
                marks_of_each_truth_False_questions: 1,
                marks_of_each_fill_in_the_blanks: 1,
            },
        })

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/utilities/test-paper-generation?input_string=${encodeURIComponent(inputString)}`,
            {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
            }
        )

        const data = await response.json()

        if (!response.ok) {
            return res.status(response.status).json(data)
        }

        res.status(200).json(data)
    } catch (error) {
        console.error('Error generating assessment:', error)
        res.status(500).json({ message: 'Failed to generate assessment' })
    }
}