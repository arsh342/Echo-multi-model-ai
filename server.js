const PORT = process.env.PORT || 8000
const express = require('express')
const cors = require('cors')
const app = express()
app.use(cors())
app.use(express.json())
require('dotenv').config()

const { GoogleGenerativeAI } = require('@google/generative-ai')
const https=require("node:https");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_KEY)

app.post('/gemini', async (req, res) => {
    console.log(req.body.history)
    console.log(req.body.message)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })
    const chat = model.startChat({
        history: req.body.history.map(msg => ({
            role: msg.role,
            parts: msg.parts
        }))
    })
    const message = req.body.message

    const result = await chat.sendMessage(message)
    const response = await result.response
    const text = response.text()
    res.send(text)

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