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

        // console.log('Request payload:', payload);

        const response = await fetch(
            `${process.env.REMOVED}/text_conversion/convert-text-to-ppt?output_file_name=${output_file_name}`,
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
            throw new Error(`PPT conversion failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.blob();
        const buffer = await data.arrayBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', `attachment; filename="${output_file_name}.pptx"`);
        res.send(Buffer.from(buffer));

    } catch (error: any) {
        console.error('PPT conversion error:', error);
        res.status(500).json({
            error: 'Failed to convert to PPT',
            detail: error.message
        });
    }
}
