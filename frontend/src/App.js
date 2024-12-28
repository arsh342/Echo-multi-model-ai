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
    const [error, setError] = useState("");
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
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    // Rotate loading messages
    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setCurrentLoadingMessage(prev => {
                    const currentIndex = loadingMessages.findIndex(msg => msg.text === prev.text);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

    // Save chat history with error handling
    useEffect(() => {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        } catch (e) {
            console.error('Failed to save chat history:', e);
            setError('Failed to save chat history. Local storage might be full.');
        }
    }, [chatHistory]);

    // Enhanced scroll behavior
    useEffect(() => {
        if (chatEndRef.current) {
            const smoothScroll = () => {
                chatEndRef.current.scrollIntoView({ 
                    behavior: "smooth", 
                    block: "end" 
                });
            };
            smoothScroll();
            // Ensure scroll happens after content render
            setTimeout(smoothScroll, 100);
        }
    }, [chatHistory, isLoading]);

    const cleanResponse = (text) => {
        return text.replace(/\*/g, '');
    };

    const getResponse = useCallback(async (retryCount = 0, messageOverride = null) => {
        const messageToSend = messageOverride || inputValue;
        
        if (!messageToSend.trim()) {
            setError("Please enter a question.");
            return;
        }

        if (isRateLimited) {
            setError("Please wait a moment before trying again.");
            return;
        }

        if (retryCount === 0) {
            setIsLoading(true);
            setError("");
        }
        
        try {
            const newUserMessage = { role: "user", parts: messageToSend };
            if (retryCount === 0) {
                setChatHistory(prev => [...prev, newUserMessage]);
            }

            const response = await fetch(`${API_URL}/gemini`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                mode: 'cors',
                body: JSON.stringify({
                    history: chatHistory.slice(-MAX_HISTORY_LENGTH),
                    message: messageToSend
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'An error occurred');
            }

            setChatHistory(prev => [
                ...prev,
                { role: "Mira", parts: cleanResponse(data.message) }
            ]);
            
            setInputValue("");
            inputRef.current?.focus();
        } catch (error) {
            handleError(error, retryCount);
        } finally {
            if (retryCount === 0 || retryCount === MAX_RETRIES) {
                setIsLoading(false);
            }
        }
    }, [inputValue, isRateLimited, chatHistory]);

    const handleError = (error, retryCount) => {
        console.error("Error:", error);
        if (error.message === 'Failed to fetch') {
            setError('Connection error. Please check your internet connection.');
        } else if (error.message.includes('API key')) {
            setError('Authentication error. Please check the configuration.');
        } else if (error.message.includes('Too many requests')) {
            setIsRateLimited(true);
            setTimeout(() => setIsRateLimited(false), 60000);
            setError('Rate limit reached. Please wait a moment.');
        } else if (error.message.includes('Service is temporarily unavailable') && retryCount < MAX_RETRIES) {
            setTimeout(() => getResponse(retryCount + 1), RETRY_DELAY * (retryCount + 1));
        } else {
            setChatHistory(prev => prev.slice(0, -1));
            setError(error.message || "Failed to get response. Please try again.");
        }
    };

    const handleSurprise = () => {
        const randomPrompt = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
        getResponse(0, randomPrompt.text);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            getResponse();
        }
    };

    const clear = () => {
        setInputValue("");
        setError("");
        setChatHistory([]);
        localStorage.removeItem('chatHistory');
        inputRef.current?.focus();
    };

    return (
        <ErrorBoundary>
            <div className="app">
                <div className="search-result">
                    {chatHistory.map((chatItem, index) => (
                        <div 
                            key={index} 
                            className={`chat-item ${chatItem.role.toLowerCase()}`}
                            style={{ 
                                animationDelay: `${index * 0.1}s`,
                                opacity: isLoading && index === chatHistory.length - 1 ? 0.7 : 1
                            }}
                        >
                            <div className="profile-circle">
                                {chatItem.role.toLowerCase() === 'user' ? '😎' : '✨'}
                            </div>
                            <p className="answer">
                                {chatItem.parts.split('\n').map((line, i) => (
                                    <span key={i} className="text-line">
                                        {line}
                                        {i < chatItem.parts.split('\n').length - 1 && <br />}
                                    </span>
                                ))}
                            </p>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="loading-container">
                            <div className="loading">
                                <div className="loading-star">{currentLoadingMessage.emoji}</div>
                            </div>
                            <p className="loading-text">{currentLoadingMessage.text}</p>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                {error && (
                    <div className="error-container">
                        <p className="error">{error}</p>
                    </div>
                )}
                <div className="input-container">
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything..."
                        rows="1"
                        style={{ height: 'auto' }}
                    />
                    <div className="button-group">
                        <button 
                            type="button"
                            onClick={clear}
                            className="clear-button"
                            disabled={isLoading || chatHistory.length === 0}
                            title="Clear chat"
                        >
                            <i className="fas fa-trash-alt"></i>
                        </button>
                        <button
                            type="button"
                            onClick={handleSurprise}
                            className="surprise-button"
                            disabled={isLoading}
                            title="Get a random prompt"
                        >
                            <i className="fas fa-shuffle"></i>
                        </button>
                        <button
                            type="button"
                            onClick={() => getResponse()}
                            disabled={isLoading || !inputValue.trim()}
                            title="Send message"
                            className="send-button"
                        >
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default App;

