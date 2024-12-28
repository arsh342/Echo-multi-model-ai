const PORT = process.env.PORT || 8000
const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const { GoogleGenerativeAI } = require('@google/generative-ai')
const path = require('path')

// Add these constants at the top of your file
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_REQUESTS = 1500; // Daily limit of 50 requests

// Add this near the top of your server.js file
const checkEnvironment = () => {
    const requiredEnvVars = ['GOOGLE_GEN_AI_KEY'];
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing);
        process.exit(1);
    }

    // Validate API key format
    if (!/^[A-Za-z0-9-_]+$/.test(process.env.GOOGLE_GEN_AI_KEY)) {
        console.error('Invalid API key format');
        process.exit(1);
    }
};

// Call it before initializing the API
checkEnvironment();

// Initialize Gemini model once
let model;
try {
    if (!process.env.GOOGLE_GEN_AI_KEY?.trim()) {
        throw new Error('API key is empty or invalid');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_KEY);
    model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
        },
    });
    
    // Test connection
    model.generateContent("test").then(() => {
        console.log('Successfully connected to Gemini API');
    }).catch((error) => {
        console.error('Failed to connect to Gemini API:', error.message);
    });
} catch (error) {
    console.error('ERROR: Failed to initialize Gemini API:', error.message);
    process.exit(1);
}

// Middleware to validate request payload
const validatePayload = (req, res, next) => {
    const { history, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid Request',
            message: 'Message is required and must be a non-empty string'
        });
    }

    if (!Array.isArray(history)) {
        return res.status(400).json({
            error: 'Invalid Request',
            message: 'Chat history must be an array'
        });
    }

    // Validate each history item
    const isValidHistory = history.every(item => {
        return item.role &&
            typeof item.role === 'string' &&
            item.parts &&
            (typeof item.parts === 'string' || Array.isArray(item.parts));
    });

    if (!isValidHistory) {
        return res.status(400).json({
            error: 'Invalid Request',
            message: 'Chat history items must have valid role and parts properties'
        });
    }

    next();
};

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8000',
    'http://localhost:8002',
    'https://mira-4pfq.vercel.app',
    'https://mira-two.vercel.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: false,
    maxAge: 86400
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Update the rate limiter
const rateLimit = {
    hits: new Map(),
    clean: function() {
        const now = Date.now();
        for (const [key, value] of this.hits) {
            if (now - value.timestamp > RATE_LIMIT_WINDOW) {
                this.hits.delete(key);
            }
        }
    }
};

const rateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    rateLimit.clean();

    const userHits = rateLimit.hits.get(ip);
    
    if (!userHits) {
        rateLimit.hits.set(ip, { count: 1, timestamp: now });
        return next();
    }

    if (now - userHits.timestamp > RATE_LIMIT_WINDOW) {
        // Reset counter if 24 hours have passed
        rateLimit.hits.set(ip, { count: 1, timestamp: now });
        return next();
    }

    if (userHits.count >= MAX_REQUESTS) {
        return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Daily limit of 50 requests exceeded. Please try again tomorrow.',
            remainingTime: RATE_LIMIT_WINDOW - (now - userHits.timestamp)
        });
    }

    userHits.count++;
    next();
};

// Optimize cache settings
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache
const responseCache = new Map();

// Clean cache less frequently
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of responseCache) {
        if (now - value.timestamp > CACHE_TTL) {
            responseCache.delete(key);
        }
    }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Update the Gemini endpoint
app.post('/gemini', rateLimiter, validatePayload, async (req, res) => {
    try {
        const cacheKey = req.body.message;
        
        // Check cache first
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json({ message: cached.response });
        }

        // Validate API key
        if (!process.env.GOOGLE_GEN_AI_KEY) {
            throw new Error('API key is not configured');
        }

        // Generate response
        const result = await model.generateContent([{ text: req.body.message }]);
        
        if (!result?.response) {
            throw new Error('Invalid response from Gemini API');
        }

        const text = await result.response.text();
        if (!text) {
            throw new Error('Empty response from Gemini API');
        }

        // Clean response by removing asterisks
        const cleanedText = text.replace(/\*/g, '');

        // Cache response
        responseCache.set(cacheKey, {
            response: cleanedText,
            timestamp: Date.now()
        });

        return res.json({ message: cleanedText });

    } catch (error) {
        console.error('Gemini API Error:', {
            message: error.message,
            name: error.name
        });

        if (error.message?.includes('quota') || error.message?.includes('Rate limit')) {
            return res.status(429).json({
                error: 'Rate Limit',
                message: 'Please wait a moment before trying again.'
            });
        }

        if (error.message?.includes('API key')) {
            return res.status(401).json({
                error: 'Authentication Error',
                message: 'Invalid API key configuration.'
            });
        }

        res.status(500).json({
            error: 'Server Error',
            message: 'An unexpected error occurred. Please try again.'
        });
    }
});

// Update the static file and route handling
if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React build directory
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    // Handle all other routes by serving the React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
    });
} else {
    // In development, redirect to React dev server
    app.get('/', (req, res) => {
        res.redirect('http://localhost:3001');
    });
}

// Global error handler - move this AFTER routes but BEFORE app.listen
app.use((err, req, res, next) => {
    console.error('Global error handler:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred'
    });
});

// Add this function at the top of your file
const findAvailablePort = async (startPort) => {
    const net = require('net');
    
    const isPortAvailable = (port) => {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            server.listen(port);
        });
    };

    let port = startPort;
    while (!(await isPortAvailable(port))) {
        port++;
    }
    return port;
};

// Update the app.listen section
const startServer = async () => {
    try {
        const availablePort = await findAvailablePort(PORT);
        app.listen(availablePort, () => {
            console.log('\x1b[36m%s\x1b[0m', '🚀 Server Status:');
            console.log('\x1b[32m%s\x1b[0m', `✓ Server is running on port ${availablePort}`);
            console.log('\x1b[32m%s\x1b[0m', `✓ Local: http://localhost:${availablePort}`);
            console.log('\x1b[33m%s\x1b[0m', `ℹ Daily request limit: ${MAX_REQUESTS}`);
            console.log('\x1b[33m%s\x1b[0m', `ℹ Cache TTL: ${CACHE_TTL / 1000} seconds`);
            console.log('\x1b[36m%s\x1b[0m', '------------------------');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Call the start function
startServer();

// Update the cleanup interval to match the daily window
setInterval(() => {
    const now = Date.now();
    rateLimit.clean();
}, RATE_LIMIT_WINDOW);