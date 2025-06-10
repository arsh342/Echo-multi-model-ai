const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const path = require('path');

// --- SDK and DB Imports ---
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { connectDB, Chat, Feedback, UserConfig, encrypt, decrypt } = require('./db');
const { auth } = require('express-oauth2-jwt-bearer');
const redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');

// --- Constants & Initial Setup ---
const PORT = process.env.PORT || 8000;
const MAX_HISTORY_LENGTH = 10;

// --- CORS Configuration ---
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    /* Add production URLs here */
];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// --- Environment & Database ---
const checkEnvironment = () => {
    const requiredEnvVars = ['GOOGLE_GEN_AI_KEY', 'MONGODB_URI', 'AUTH0_AUDIENCE', 'AUTH0_ISSUER_BASE_URL', 'ENCRYPTION_KEY'];
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing);
        process.exit(1);
    }
};
checkEnvironment();
connectDB();

// --- Auth0 Middleware ---
const checkJwt = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: 'RS256'
});

// --- Rate Limiter Setup ---
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('Redis Client Error', err));
(async () => {
    try {
        await redisClient.connect();
        console.log('Redis Connected...');
    } catch (err) { console.error('Redis Connection Error:', err.message); }
})();
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rate_limit',
    points: 1500,
    duration: 24 * 60 * 60,
});
const rateLimiterMiddleware = async (req, res, next) => {
    try {
        await rateLimiter.consume(req.ip);
        next();
    } catch (err) {
        res.status(429).json({ error: 'Too Many Requests' });
    }
};

app.use(express.json());

// --- ROUTES ---

const chatMiddleware = [checkJwt];
if (process.env.NODE_ENV === 'production') {
    chatMiddleware.push(rateLimiterMiddleware);
}

// --- /conversations Endpoint ---
// This endpoint fetches a list of all unique conversations for the logged-in user.
app.get('/conversations', checkJwt, async (req, res) => {
    try {
        const userId = req.auth.payload.sub;
        const conversations = await Chat.aggregate([
            { $match: { userId: userId } },
            { $sort: { timestamp: 1 } },
            { $group: {
                _id: '$conversationId',
                firstMessage: { $first: '$parts' },
                timestamp: { $first: '$timestamp' }
            }},
            { $sort: { timestamp: -1 } }
        ]);
        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations.' });
    }
});

// Delete all conversations for a user
app.delete('/conversations', checkJwt, async (req, res) => {
    try {
        const userId = req.auth.payload.sub;
        await Chat.deleteMany({ userId });
        res.status(200).json({ success: true, message: 'All conversations deleted successfully.' });
    } catch (error) {
        console.error('Error deleting conversations:', error);
        res.status(500).json({ error: 'Failed to delete conversations.' });
    }
});

// --- /history/:conversationId Endpoint ---
// This endpoint fetches the full message history for a single, specific conversation.
app.get('/history/:conversationId', checkJwt, async (req, res) => {
    try {
        const userId = req.auth.payload.sub;
        const { conversationId } = req.params;
        const chatHistory = await Chat.find({ userId, conversationId }).sort({ timestamp: 1 });
        res.json(chatHistory);
    } catch (error) {
        console.error('Error fetching chat history:', error.message);
        res.status(500).json({ error: 'Server Error', message: 'Failed to fetch chat history.' });
    }
});

// --- /feedback Endpoint ---
// This endpoint saves user feedback (good/bad) for a specific message.
app.post('/feedback', checkJwt, async (req, res) => {
    try {
        const userId = req.auth.payload.sub;
        const { chatId, rating } = req.body;
        if (!chatId || !['good', 'bad'].includes(rating)) {
            return res.status(400).json({ error: 'Invalid feedback payload' });
        }
        await Feedback.updateOne({ userId, chatId }, { $set: { rating } }, { upsert: true });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Failed to save feedback.' });
    }
});


// ... (The /config and /chat endpoints for API keys and multi-model logic also exist here)

// Get user config (to see which keys are set)
app.get('/config', checkJwt, async (req, res) => {
    const userId = req.auth.payload.sub;
    const config = await UserConfig.findOne({ userId });
    res.json({
        hasOpenAIKey: !!config?.openaiApiKey,
        hasAnthropicKey: !!config?.anthropicApiKey,
        hasGeminiKey: !!config?.geminiApiKey,
    });
});

// Save user config
app.post('/config', checkJwt, async (req, res) => {
    const userId = req.auth.payload.sub;
    const { openaiApiKey, anthropicApiKey, geminiApiKey } = req.body;

    const configUpdate = {};
    if (openaiApiKey) configUpdate.openaiApiKey = encrypt(openaiApiKey);
    if (anthropicApiKey) configUpdate.anthropicApiKey = encrypt(anthropicApiKey);
    if (geminiApiKey) configUpdate.geminiApiKey = encrypt(geminiApiKey);

    await UserConfig.findOneAndUpdate({ userId }, { $set: configUpdate }, { upsert: true });
    res.status(200).json({ success: true, message: 'API keys saved successfully.' });
});

app.post('/chat', chatMiddleware, async (req, res) => {
    const { message, conversationId, model } = req.body;
    const userId = req.auth.payload.sub;

    if (!message || !conversationId || !model) {
        return res.status(400).json({ error: 'Missing message, conversationId, or model' });
    }

    try {
        const userConfig = await UserConfig.findOne({ userId });
        const chatHistory = await Chat.find({ userId, conversationId }).sort({ timestamp: 1 }).limit(MAX_HISTORY_LENGTH);
        
        let responseText = '';

        if (model === 'openai') {
            const apiKey = userConfig?.openaiApiKey ? decrypt(userConfig.openaiApiKey) : process.env.OPENAI_API_KEY;
            if (!apiKey) throw new Error("OpenAI API key is not configured.");
            
            const openai = new OpenAI({ apiKey });
            const messages = chatHistory.map(c => ({ role: c.role === 'user' ? 'user' : 'assistant', content: c.parts }));
            messages.push({ role: 'user', content: message });
            
            const completion = await openai.chat.completions.create({ model: "gpt-4o", messages });
            responseText = completion.choices[0].message.content || "";

        } else if (model === 'anthropic') {
            const apiKey = userConfig?.anthropicApiKey ? decrypt(userConfig.anthropicApiKey) : process.env.ANTHROPIC_API_KEY;
            if (!apiKey) throw new Error("Anthropic API key is not configured.");

            const anthropic = new Anthropic({ apiKey });
            const messages = chatHistory.map(c => ({ role: c.role === 'user' ? 'user' : 'assistant', content: c.parts }));
            
            const completion = await anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1024,
                messages: [...messages, { role: 'user', content: message }]
            });
            responseText = completion.content[0].text || "";
            
        } else { // Default to Gemini
            const apiKey = userConfig?.geminiApiKey ? decrypt(userConfig.geminiApiKey) : process.env.GOOGLE_GEN_AI_KEY;
            if (!apiKey) throw new Error("Gemini API key is not configured.");
            
            const gemini = new GoogleGenerativeAI(apiKey);
            const geminiModel = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
            const historyForGemini = chatHistory.map(c => ({ role: c.role === 'echo' ? 'model' : 'user', parts: [{ text: c.parts }] }));
            const chat = geminiModel.startChat({ history: historyForGemini });
            const result = await chat.sendMessage(message);
            responseText = result.response.text() || "";
        }

        // Save records to database
        await new Chat({ userId, conversationId, role: 'user', parts: message, timestamp: new Date() }).save();
        // We use a generic 'echo' role for our own DB to identify the AI, regardless of the model used
        await new Chat({ userId, conversationId, role: 'echo', parts: responseText, timestamp: new Date() }).save();

        res.json({ message: responseText });

    } catch (error) {
        console.error(`Error in /chat with model ${model}:`, error.message);
        res.status(500).json({ error: "An error occurred while processing your request." });
    }
});

// --- /conversations/:conversationId DELETE Endpoint ---
app.delete('/conversations/:conversationId', checkJwt, async (req, res) => {
    try {
        const userId = req.auth.payload.sub;
        const { conversationId } = req.params;
        
        // Delete all messages in the conversation
        const result = await Chat.deleteMany({ userId, conversationId });
        
        if (result.deletedCount > 0) {
            res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
        } else {
            res.status(404).json({ error: 'Conversation not found' });
        }
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

// --- Serving Frontend & Error Handling ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
    });
}

// --- Global Error Handling ---
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') return res.status(err.status).json({ error: 'Unauthorized', message: err.message });
    if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'CORS Error', message: 'Origin not allowed' });
    next(err);
});

app.use((err, req, res, next) => {
    console.error('Global error handler:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error', message: err.message || 'An unexpected error occurred' });
});


// --- Server Start ---
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));