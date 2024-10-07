const PORT = process.env.PORT || 8000
const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const { GoogleGenerativeAI } = require('@google/generative-ai')

// CORS configuration - replace with your frontend domain
app.use(cors({
    origin: 'https://mira-uz0m.onrender.com'
}))
app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_KEY)

app.post('/gemini', async (req, res) => {
    try {
        // Input validation
        if (!req.body.history || !Array.isArray(req.body.history) || !req.body.message) {
            return res.status(400).send('Invalid request body');
        }

        console.log(req.body.history)
        console.log(req.body.message)

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
        const chat = model.startChat({
            history: req.body.history.map(msg => ({
                role: msg.role,
                parts: msg.parts
            }))
        })
        const message = req.body.message

        const result = await chat.sendMessage(message)
        const response = await result.response
        const text = await response.text()
        res.send(text)
    } catch (error) {
        console.error('Error in /gemini route:', error);
        res.status(500).send('An error occurred while processing your request.');
    }
})

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <style>
                    body {
                        background-color: black;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        font-family: Arial, sans-serif;
                    }
                    h1 {
                        color: white;
                        font-size: 48px;
                    }
                </style>
            </head>
            <body>
                <h1>Running</h1>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})