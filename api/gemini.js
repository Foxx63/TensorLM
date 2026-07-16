export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const API_KEY = process.env.GEMINI_API_KEY; 
    
    if (!API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Missing Gemini API Key.' });
    }

    const MODEL_NAME = "gemini-3.1-flash-lite"; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        return res.status(response.status).json(data);

    } catch (error) {
        console.error("Serverless Proxy Error:", error);
        return res.status(500).json({ error: 'Failed to proxy request to Google Gemini API.' });
    }
}
