import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { output_file_name } = req.query;
        const payload = req.body;

        // console.log('PDF Request payload:', payload);

        const response = await fetch(
            `${process.env.REMOVED}/text_conversion/convert-text-to-pdf?output_file_name=${output_file_name}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Response Error:', errorText);
            throw new Error(`PDF conversion failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.blob();
        const buffer = await data.arrayBuffer();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${output_file_name}.pdf"`);
        res.send(Buffer.from(buffer));

    } catch (error: any) {
        console.error('PDF conversion error:', error);
        res.status(500).json({
            error: 'Failed to convert to PDF',
            detail: error.message
        });
    }
}
