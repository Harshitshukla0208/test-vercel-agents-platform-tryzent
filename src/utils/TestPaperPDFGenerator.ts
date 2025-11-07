// utils/TestPaperPDFGenerator.ts
interface TestPaperData {
    General_Instructions?: string;
    MCQs?: any[];
    True_False_Questions?: any[];
    Fill_in_the_Blanks?: any[];
    Very_Short_Answers?: any[];
    Short_Answers?: any[];
    Long_Answers?: any[];
    Very_Long_Answers?: any[];
    Case_Studies?: any[];
    Answers?: { [key: string]: string };
}

interface MarksBreakdown {
    marks_of_each_mcqs?: number;
    marks_of_each_truth_False_questions?: number;
    marks_of_each_fill_in_the_blanks?: number;
    marks_of_each_very_short_answers?: number;
    marks_of_each_short_answer?: number;
    marks_of_each_long_answer?: number;
    marks_of_each_very_long_answer?: number;
    marks_of_each_case_studies?: number;
}

export const generateTestPaperPDF = async (
    data: TestPaperData,
    filename: string,
    subject = "Test Paper",
    grade = "",
    totalMarks = "",
    duration = "",
    marksBreakdown: MarksBreakdown = {},
    schoolName = "",
    examinationName = "",
    schoolLogoFile: File | null = null,
): Promise<{ success: boolean; message: string }> => {
    try {
        // Convert school logo to base64 if provided
        let schoolLogoBase64: string | null = null;
        if (schoolLogoFile) {
            try {
                schoolLogoBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(schoolLogoFile);
                });
            } catch (error) {
                console.error("Error reading school logo file:", error);
                schoolLogoBase64 = null;
            }
        }

        // Call the API to generate PDF
        const response = await fetch('/api/generate-test-paper-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data,
                subject,
                grade,
                totalMarks,
                duration,
                marksBreakdown,
                schoolName,
                examinationName,
                schoolLogoBase64,
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

        return {
            success: true,
            message: "Test paper PDF generated successfully!",
        };
    } catch (error) {
        console.error("Error generating PDF:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to generate PDF",
        };
    }
};