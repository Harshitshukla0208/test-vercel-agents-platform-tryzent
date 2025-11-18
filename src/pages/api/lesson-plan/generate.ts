import type { NextApiRequest, NextApiResponse } from 'next';

const EXTERNAL_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/utilities/lesson-plan-generation`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '');
   
    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const {
      Board,
      Grade,
      Subject,
      Chapter_Number,
      Number_of_Lecture,
      Duration_of_Lecture,
      Class_Strength = 40,
      Language = 'English',
      Quiz = true,
      Assignment = true
    } = req.body;

    if (!Board || !Grade || !Subject || !Chapter_Number || !Number_of_Lecture || !Duration_of_Lecture) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['Board', 'Grade', 'Subject', 'Chapter_Number', 'Number_of_Lecture', 'Duration_of_Lecture']
      });
    }

    const url = `${EXTERNAL_URL}?Board=${encodeURIComponent(String(Board))}&Grade=${encodeURIComponent(String(Grade))}&Subject=${encodeURIComponent(String(Subject))}&Chapter_Number=${encodeURIComponent(String(Chapter_Number))}&Number_of_Lecture=${encodeURIComponent(String(Number_of_Lecture))}&Duration_of_Lecture=${encodeURIComponent(String(Duration_of_Lecture))}&Class_Strength=${encodeURIComponent(String(Class_Strength))}&Language=${encodeURIComponent(String(Language))}&Quiz=${encodeURIComponent(String(Quiz))}&Assignment=${encodeURIComponent(String(Assignment))}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Lesson plan generation API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate lesson plan'
    });
  }
}