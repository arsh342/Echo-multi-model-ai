const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const path = require('path');

// --- SDK and DB Imports ---
const OpenAI = require('openai');
const { connectDB, Chat, Feedback } = require('./db');
const admin = require('firebase-admin');

// --- OpenRouter Configuration ---
const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "https://echo-ai-chat.vercel.app", // Your site URL
        "X-Title": "Echo AI Chat", // Your site name
    },
});

// --- Firebase Admin Initialization ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

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
    const requiredEnvVars = ['OPENROUTER_API_KEY', 'MONGODB_URI', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing);
        process.exit(1);
    }
};
checkEnvironment();
connectDB();

// --- Firebase Auth Middleware ---
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Firebase auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// --- Optional Rate Limiter Setup (Redis) ---
let rateLimiterMiddleware = null;
if (process.env.USE_REDIS === 'true' && process.env.REDIS_URL) {
    try {
        const redis = require('redis');
        const { RateLimiterRedis } = require('rate-limiter-flexible');
        
        const redisClient = redis.createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis Client Error', err));
        
        (async () => {
            try {
                await redisClient.connect();
                console.log('Redis Connected...');
            } catch (err) { 
                console.error('Redis Connection Error:', err.message);
                console.log('Continuing without rate limiting...');
            }
        })();
        
        const rateLimiter = new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: 'rate_limit',
            points: 1500,
            duration: 24 * 60 * 60,
        });
        
        rateLimiterMiddleware = async (req, res, next) => {
            try {
                await rateLimiter.consume(req.ip);
                next();
            } catch (err) {
                res.status(429).json({ error: 'Too Many Requests' });
            }
        };
    } catch (error) {
        console.log('Redis not available, continuing without rate limiting...');
    }
}

app.use(express.json());

// --- ROUTES ---

const chatMiddleware = [authenticateToken];
if (rateLimiterMiddleware && process.env.NODE_ENV === 'production') {
    chatMiddleware.push(rateLimiterMiddleware);
}

// --- /conversations Endpoint ---
// This endpoint fetches a list of all unique conversations for the logged-in user.
app.get('/conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.uid;
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
app.delete('/conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        await Chat.deleteMany({ userId });
        res.status(200).json({ success: true, message: 'All conversations deleted successfully.' });
    } catch (error) {
        console.error('Error deleting conversations:', error);
        res.status(500).json({ error: 'Failed to delete conversations.' });
    }
});

// --- /history/:conversationId Endpoint ---
// This endpoint fetches the full message history for a single, specific conversation.
app.get('/history/:conversationId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.uid;
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
app.post('/feedback', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.uid;
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

app.post('/chat', chatMiddleware, async (req, res) => {
    const { message, conversationId, model } = req.body;
    const userId = req.user.uid;

    if (!message || !conversationId || !model) {
        return res.status(400).json({ error: 'Missing message, conversationId, or model' });
    }

    try {
        const chatHistory = await Chat.find({ userId, conversationId }).sort({ timestamp: 1 }).limit(MAX_HISTORY_LENGTH);
        
        // Map model names to OpenRouter model identifiers
        const modelMap = {
            'openai': 'openai/gpt-4.1',
            'anthropic': 'anthropic/claude-sonnet-4',
            'gemini': 'google/gemini-2.5-flash'
        };

        const openrouterModel = modelMap[model];
        if (!openrouterModel) {
            throw new Error(`Unsupported model: ${model}`);
        }

        // Prepare messages for OpenRouter
        const messages = chatHistory.map(c => ({ 
            role: c.role === 'user' ? 'user' : 'assistant', 
            content: c.parts 
        }));
        
        // Add system message to instruct AI to use Markdown formatting
        const systemMessage = {
            role: 'system',
            content: `You are a helpful AI assistant. Please respond using proper Markdown formatting:

- Use **bold** for emphasis
- Use *italic* for secondary emphasis
- Use \`inline code\` for code snippets
- Use \`\`\`language\ncode\n\`\`\` for code blocks with syntax highlighting
- Use # ## ### for headers
- Use - or * for bullet points
- Use 1. 2. 3. for numbered lists
- Use > for blockquotes
- Use | for tables when appropriate
- Use [link text](url) for links

Always specify the programming language for code blocks (e.g., \`\`\`javascript, \`\`\`python, \`\`\`html, etc.) for proper syntax highlighting.`
        };
        
        messages.unshift(systemMessage);
        messages.push({ role: 'user', content: message });

        // Make request to OpenRouter
        const completion = await openrouter.chat.completions.create({
            model: openrouterModel,
            messages: messages,
            max_tokens: 1024,
        });

        const responseText = completion.choices[0].message.content || "";

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
app.delete('/conversations/:conversationId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.uid;
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
    if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'CORS Error', message: 'Origin not allowed' });
    next(err);
});

app.use((err, req, res, next) => {
    console.error('Global error handler:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error', message: err.message || 'An unexpected error occurred' });
});

// --- Server Start ---
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));