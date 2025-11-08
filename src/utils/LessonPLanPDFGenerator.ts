// utils/LessonPLanPDFGenerator.ts
interface LessonPlanData {
    [key: string]: any
}

export const generateLessonPlanPDF = async (
    data: LessonPlanData | LessonPlanData[],
    filename = "lesson-plan.pdf",
    chapterOrTopicName?: string | null,
): Promise<{ success: boolean; message: string }> => {
    try {
        // Normalize data to array
        const lessonPlans = Array.isArray(data) ? data : [data];

        // Call the API to generate PDF
        const response = await fetch('/api/generate-lesson-plan-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: lessonPlans,
                chapterOrTopicName,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate PDF');
        }

        // Get the PDF blob
        const pdfBlob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true, message: 'Lesson plan PDF generated successfully' };
    } catch (error) {
        console.error('Error generating lesson plan PDF:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate PDF';
        return { success: false, message };
    }
}

// Keep the original function for backward compatibility
export const generateBeautifulPDF = async (data: any, filename = "audio-analysis.pdf") => {
    // Check if data looks like lesson plan data
    if (Array.isArray(data) && data.length > 0 && data[0].Lesson_Topic) {
        return generateLessonPlanPDF(data, filename)
    }

    // Check if single object has lesson plan structure
    if (data && typeof data === "object" && (data.Lesson_Topic || data.Learning_Objectives)) {
        return generateLessonPlanPDF([data], filename)
    }

    // Fall back - return error message
    return { success: false, message: "Please use the lesson plan specific generator for this data type" }
}
