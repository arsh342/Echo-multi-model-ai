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
    try {
        console.log(req.body.history);
        console.log(req.body.message);

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const chat = model.startChat({
            history: req.body.history.map(msg => ({
                role: msg.role,
                parts: msg.parts // Ensure parts is an array
            }))
        });

        const message = req.body.message;

        // Ensure message is structured correctly
        const result = await chat.sendMessage({
            parts: [message] // Wrap message in an array
        });

        const response = await result.response;
        const text = await response.text(); // Ensure response.text() is awaited
        res.send(text);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/', (req, res) =>{
    res.send('Hello World!')
})
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})