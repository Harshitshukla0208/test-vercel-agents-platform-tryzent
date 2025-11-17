import React, { useState } from 'react';
import { FileText, Presentation, FileType } from 'lucide-react';
import { generateBeautifulPDF, generatePDFFromHTML } from "../../utils/pdfGenerator"

interface DownloadSectionProps {
    response: any;
    fileName: string;
}

type FileType = 'pdf' | 'ppt' | 'word';

const DownloadSection: React.FC<DownloadSectionProps> = ({ response, fileName }) => {
    const [isLoading, setIsLoading] = useState<Record<FileType, boolean>>({
        pdf: false,
        ppt: false,
        word: false
    });

    const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false)
        const [pdfError, setPdfError] = useState<string | null>(null)
        // const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false)
        const [pdfStatus, setPdfStatus] = useState<{
            type: 'idle' | 'success' | 'error' | 'info'
            message: string
        } | null>(null)

    const handleDownloadPDF = async (method: 'structured' | 'visual' = 'structured') => {
        setIsGeneratingPDF(true)
        setPdfStatus({ type: 'info', message: 'Preparing PDF...' })

        try {
            // Create filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
            const filename = `audio-analysis-${timestamp}.pdf`

            if (method === 'structured') {
                // Use structured PDF generation
                setPdfStatus({ type: 'info', message: 'Generating structured PDF...' })

                const analysisData = response

                console.log("Data ---> ", response)

                if (!analysisData) {
                    throw new Error('No analysis data available for PDF generation')
                }

                const result = generateBeautifulPDF(analysisData, filename)

                if (result && !(await result).success) {
                    throw new Error((await result).message || 'Failed to generate structured PDF')
                }

                setPdfStatus({
                    type: 'success',
                    message: 'Structured PDF downloaded successfully!'
                })

            } else {
                // Use visual PDF generation (HTML to PDF)
                setPdfStatus({ type: 'info', message: 'Capturing visual content...' })

                const result = await generatePDFFromHTML('audio-analysis-content', filename)

                if (!result.success) {
                    throw new Error(result.message || 'Failed to generate visual PDF')
                }

                setPdfStatus({
                    type: 'success',
                    message: 'Visual PDF downloaded successfully!'
                })
            }

            // Clear success message after 3 seconds
            setTimeout(() => {
                setPdfStatus(null)
            }, 3000)

        } catch (error) {
            console.error('PDF generation error:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            setPdfStatus({
                type: 'error',
                message: `PDF generation failed: ${errorMessage}`
            })

            // Clear error message after 5 seconds
            setTimeout(() => {
                setPdfStatus(null)
            }, 5000)
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    return (
        <div className="w-full bg-[#F9F5FF] rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
                <span className="text-base font-medium">Download as</span>
                <div className="flex gap-4">
                    <button
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                        onClick={() => handleDownloadPDF('structured')}
                        disabled={isLoading.pdf}
                    >
                        <FileText className="w-5 h-5 text-red-600" />
                        {isLoading.pdf ? '' : 'PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DownloadSection;
