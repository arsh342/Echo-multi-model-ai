const PORT = process.env.PORT || 8000;
const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const { connectDB, Chat, Feedback } = require('./db');
const { auth } = require('express-oauth2-jwt-bearer');
const redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');

// Constants
const RATE_LIMIT_POINTS = 1500;
const RATE_LIMIT_DURATION = 24 * 60 * 60;
const CACHE_TTL = 10 * 60 * 1000;
const MAX_HISTORY_LENGTH = 6;

// CORS Configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://mira-ai.onrender.com',
    'https://mira-geminiapi.onrender.com'
];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true,
    maxAge: 86400
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Environment Check
const checkEnvironment = () => {
    const requiredEnvVars = ['GOOGLE_GEN_AI_KEY', 'MONGODB_URI', 'AUTH0_AUDIENCE', 'AUTH0_ISSUER_BASE_URL'];
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing);
        process.exit(1);
    }
};
checkEnvironment();

// Database Connection
connectDB();

// Auth0 Middleware
const checkJwt = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: 'RS256'
});

// Gemini Model Initialization
let model;
try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log('Successfully initialized Gemini API');
} catch (error) {
    console.error('ERROR: Failed to initialize Gemini API:', error.message);
    process.exit(1);
}

// Input Validation Middleware
const validatePayload = (req, res, next) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid Request', message: 'Message is required.' });
    }
    next();
};
app.use(express.json());

// Persistent Rate Limiter Setup
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('Redis Client Error', err));
(async () => {
    try {
        await redisClient.connect();
        console.log('Redis Connected...');
    } catch (err) {
        console.error('Redis Connection Error:', err.message);
    }
})();
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rate_limit',
    points: RATE_LIMIT_POINTS,
    duration: RATE_LIMIT_DURATION,
});
const rateLimiterMiddleware = async (req, res, next) => {
    try {
        await rateLimiter.consume(req.ip);
        next();
    } catch (err) {
        res.status(429).json({ error: 'Too Many Requests', message: `You have exceeded the ${RATE_LIMIT_POINTS} requests in 24 hours limit!` });
    }
};

// --- Routes ---

// Gemini Route
const geminiMiddleware = [checkJwt, validatePayload];
if (process.env.NODE_ENV === 'production') {
    geminiMiddleware.splice(1, 0, rateLimiterMiddleware);
}
app.post('/gemini', geminiMiddleware, async (req, res) => {
    try {
        const userId = req.auth.payload.sub;
        const { message, conversationId } = req.body; // <-- conversationId is now expected

        if (!conversationId) {
            return res.status(400).json({ error: 'conversationId is required.' });
        }

        const chatHistory = await Chat.find({ userId, conversationId }).sort({ timestamp: 1 }).limit(MAX_HISTORY_LENGTH);

        const historyForGemini = chatHistory.map(chat => ({
            role: chat.role === 'mira' ? 'model' : 'user',
            parts: [{ text: chat.parts }],
        }));

        const newUserChat = new Chat({ userId, conversationId, role: 'user', parts: message, timestamp: new Date() });
        await newUserChat.save();

        const chat = model.startChat({ history: historyForGemini });
        const result = await chat.sendMessage(message);

        if (!result?.response) throw new Error('Invalid response from Gemini API');

        const text = result.response.text();
        if (!text) throw new Error('Empty response from Gemini API');

        const cleanedText = text.replace(/\*/g, '');

        const newMiraChat = new Chat({ userId, conversationId, role: 'mira', parts: cleanedText, timestamp: new Date() });
        await newMiraChat.save();
        return res.json({ message: cleanedText });
    } catch (error) {
        console.error('Gemini API Error:', { message: error.message, name: error.name });
        if (error.message?.includes('quota') || error.message?.includes('Rate limit')) {
            return res.status(429).json({ error: 'Rate Limit', message: 'Please wait a moment before trying again.' });
        }
        if (error.message?.includes('API key') || error.message?.includes('400 Bad Request')) {
            return res.status(401).json({ error: 'API Error', message: 'There was an issue with the request to the AI service.' });
        }
        res.status(500).json({ error: 'Server Error', message: 'An unexpected error occurred. Please try again.' });
    }
});


// Conversations Route
app.get('/conversations', checkJwt, async (req, res) => {
    try {
        const userId = req.auth.payload.sub;
        const conversations = await Chat.aggregate([
            { $match: { userId: userId } },
            { $sort: { timestamp: 1 } },
            {
                $group: {
                    _id: '$conversationId',
                    firstMessage: { $first: '$parts' },
                    timestamp: { $first: '$timestamp' }
                }
            },
            { $sort: { timestamp: -1 } }
        ]);
        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations.' });
    }
});

// MODIFIED: History route now fetches by conversationId
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

// Feedback Route
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

// --- Serving Frontend & Error Handling ---

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.redirect('http://localhost:3001');
    });
}

// Error Handlers
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') return res.status(err.status).json({ error: 'Unauthorized', message: err.message });
    if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'CORS Error', message: 'Origin not allowed' });
    next(err);
});
app.use((err, req, res, next) => {
    console.error('Global error handler:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error', message: err.message || 'An unexpected error occurred' });
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));