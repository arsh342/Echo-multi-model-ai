import React, { useState, useEffect, useRef, useCallback } from "react";
import ErrorBoundary from './components/ErrorBoundary';

const MAX_RETRIES = 2;
const RETRY_DELAY = 500;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const MAX_HISTORY_LENGTH = 6; // Maximum number of messages to keep in context

// Enhanced loading messages with emojis
const loadingMessages = [
    { text: "Analyzing your request with quantum precision...", emoji: "🔮" },
    { text: "Consulting the digital cosmos...", emoji: "✨" },
    { text: "Processing at lightspeed...", emoji: "⚡" },
    { text: "Connecting neural pathways...", emoji: "🧠" },
    { text: "Gathering wisdom from the cloud...", emoji: "☁️" },
    { text: "Computing the perfect response...", emoji: "💫" },
    { text: "Synthesizing knowledge...", emoji: "🌟" },
    { text: "Decoding possibilities...", emoji: "🔍" }
];

const surprisePrompts = [
    { text: "Tell me a fascinating fact about space exploration 🚀", category: "Science" },
    { text: "What is the most interesting psychological phenomenon? 🧠", category: "Psychology" },
    { text: "Share a mind-blowing fact about quantum physics ⚛️", category: "Science" },
    { text: "What is the most innovative technology trend right now? 💡", category: "Tech" },
    { text: "Tell me about a mysterious historical event 🏛️", category: "History" },
    { text: "What is the most incredible animal adaptation? 🦋", category: "Nature" },
    { text: "Share an amazing fact about the human body 🫀", category: "Biology" },
    { text: "What is the most surprising discovery in astronomy? 🌌", category: "Science" },
    { text: "Tell me about an ancient civilization technology 🏺", category: "History" },
    { text: "What is the most fascinating AI breakthrough? 🤖", category: "Tech" },
    { text: "Share a surprising fact about ocean life 🌊", category: "Nature" },
    { text: "What is the most interesting mathematical concept? 📐", category: "Math" }
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const App = () => {
    const [inputValue, setInputValue] = useState("");
    const [chatHistory, setChatHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('chatHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load chat history:', e);
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Auto-scroll when chat history changes or loading state changes
    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    // Save chat history to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        } catch (e) {
            console.error('Failed to save chat history:', e);
            setError('Failed to save chat history. Local storage might be full.');
        }
    }, [chatHistory]);

    const getResponse = async () => {
        if (!inputValue.trim()) {
            setError("Please enter a message.");
            return;
        }

        // Immediately show the user's message
        setChatHistory(prev => [
            ...prev,
            { role: "user", parts: inputValue }
        ]);

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/gemini`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    history: chatHistory.slice(-MAX_HISTORY_LENGTH),
                    message: inputValue
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to get response');
            }

            // Add only the AI response since user message is already added
            setChatHistory(prev => [
                ...prev,
                { role: "mira", parts: data.message.replace(/\*/g, '') }
            ]);
            
            setInputValue("");
        } catch (error) {
            console.error("Error:", error);
            setError(error.message || "Failed to get response. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSurprise = () => {
        const randomPrompt = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
        setInputValue(randomPrompt.text);
        setError("");
        
        // First add the prompt to chat history
        setChatHistory(prev => [
            ...prev,
            { role: "user", parts: randomPrompt.text }
        ]);
        
        // Then make the API call
        setIsLoading(true);
        setError("");

        fetch(`${API_URL}/gemini`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                history: chatHistory.slice(-MAX_HISTORY_LENGTH),
                message: randomPrompt.text
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to get response');
            }
            return response.json();
        })
        .then(data => {
            setChatHistory(prev => [
                ...prev,
                { role: "mira", parts: data.message.replace(/\*/g, '') }
            ]);
            setInputValue("");
        })
        .catch(error => {
            console.error("Error:", error);
            setError(error.message || "Failed to get response. Please try again.");
        })
        .finally(() => {
            setIsLoading(false);
        });
    };

    const handleClear = () => {
        setChatHistory([]);
        setInputValue("");
        setError("");
        localStorage.removeItem('chatHistory');
    };

    return (
        <div className="app">
            {/* Main Content */}
            <div className="main-content">
                <div className="chat-container">
                    {chatHistory.map((item, index) => (
                        <div key={index} className={`chat-item ${item.role}`}>
                            <div className="profile-icon">
                                {item.role === 'user' ? '😎' : '✨'}
                            </div>
                            <div className="message-content">{item.parts}</div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="chat-item mira">
                            <div className="profile-icon">✨</div>
                            <div className="loading">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="input-container">
                    <div className="input-wrapper">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Send a message here"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    getResponse();
                                }
                            }}
                        />
                        <div className="button-group">
                            <button onClick={handleClear} title="Clear chat">
                                <i className="fas fa-trash"></i>
                            </button>
                            <button onClick={handleSurprise} title="Random prompt">
                                <i className="fas fa-shuffle"></i>
                            </button>
                            <button onClick={getResponse} disabled={!inputValue.trim() || isLoading}>
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                    {error && <div className="error">{error}</div>}
                </div>
            </div>
        </div>
    );
};

export default App;

