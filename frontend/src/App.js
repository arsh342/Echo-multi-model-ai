import React, { useState, useEffect, useRef } from "react";
import ErrorBoundary from './components/ErrorBoundary';

const MAX_RETRIES = 2;
const RETRY_DELAY = 500;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const MAX_HISTORY_LENGTH = 6;

const loadingMessages = [
    { text: "Analyzing" },
    { text: "Processing"},
    { text: "Connecting"},
    { text: "Computing"},
    { text: "Synthesizin"},
    { text: "Decoding"}
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
    const [retryCount, setRetryCount] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    useEffect(() => {
        try {
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        } catch (e) {
            console.error('Failed to save chat history:', e);
            setError('Failed to save chat history. Local storage might be full.');
        }
    }, [chatHistory]);

    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

    const getResponse = async (retryAttempt = 0) => {
        if (!inputValue.trim()) {
            setError("Please enter a message.");
            return;
        }

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
                credentials: 'include',
                body: JSON.stringify({
                    history: chatHistory.slice(-MAX_HISTORY_LENGTH),
                    message: inputValue
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to get response');
            }

            const data = await response.json();
            
            setChatHistory(prev => [
                ...prev,
                { role: "mira", parts: data.message.replace(/\*/g, '') }
            ]);
            
            setInputValue("");
            setRetryCount(0);
        } catch (error) {
            console.error("Error:", error);
            
            if (retryAttempt < MAX_RETRIES) {
                setRetryCount(retryAttempt + 1);
                await wait(RETRY_DELAY * (retryAttempt + 1));
                return getResponse(retryAttempt + 1);
            }
            
            setError(error.message || "Failed to get response. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSurprise = async () => {
        const randomPrompt = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
        setInputValue(randomPrompt.text);
        await getResponse();
    };

    const handleClear = () => {
        setChatHistory([]);
        setInputValue("");
        setError("");
        localStorage.removeItem('chatHistory');
    };

    return (
        <ErrorBoundary>
            <div className="app">
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
                                <div className="loading-message">
                                    <div className="loading-text">
                                         // {loadingMessage.text}
                                    </div>
                                    <div className="loading">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="input-container">
                        <div className="input-wrapper">
                            <textarea
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    setError("");
                                }}
                                placeholder="Send a message here"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        getResponse();
                                    }
                                }}
                                disabled={isLoading}
                            />
                            <div className="button-group">
                                <button 
                                    onClick={handleClear} 
                                    title="Clear chat"
                                    disabled={isLoading || chatHistory.length === 0}
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                                <button 
                                    onClick={handleSurprise} 
                                    title="Random prompt"
                                    disabled={isLoading}
                                >
                                    <i className="fas fa-shuffle"></i>
                                </button>
                                <button 
                                    onClick={() => getResponse()} 
                                    disabled={!inputValue.trim() || isLoading}
                                >
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>
                        {error && <div className="error">{error}</div>}
                        {retryCount > 0 && (
                            <div className="retry-message">
                                Retry attempt {retryCount} of {MAX_RETRIES}...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default App;
