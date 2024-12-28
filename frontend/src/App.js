import React, { useState, useEffect, useRef } from "react";
import ErrorBoundary from './components/ErrorBoundary';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const App = () => {
    const [value, setValue] = useState("");
    const [error, setError] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [retryTimeout, setRetryTimeout] = useState(null);
    const chatEndRef = useRef(null);

    const loadingMessages = [
        "Pondering the mysteries of the universe...",
        "Consulting my digital wisdom...",
        "Processing thoughts at light speed...",
        "Connecting neural pathways...",
        "Analyzing possibilities...",
        "Computing the perfect response...",
        "Gathering digital insights...",
        "Searching through knowledge banks...",
        "Decoding your request...",
        "Channeling artificial wisdom..."
    ];

    const surpriseOptions = [
        'Who won the latest Nobel Peace Prize?', 'Where does pizza come from?',
        'What are the top tourist attractions in Paris?', 'How do you bake a chocolate cake?',
        'What is the capital of Japan?', 'Tell me a fun fact about space.',
        'Who invented the telephone?', 'What is the most popular programming language in 2024?',
        'How do you meditate effectively?', 'What are the health benefits of yoga?',
        'Tell me a joke.', 'What is the history of the Internet?',
        'What are the main ingredients in sushi?', 'How does photosynthesis work?',
        'What are some tips for improving public speaking skills?', 'What is the tallest mountain in the world?',
        'How do electric cars work?', 'What is the significance of the Mona Lisa?',
        'Who was the first person to walk on the moon?', 'What are the benefits of learning a second language?',
        'How can you reduce your carbon footprint?', 'What is blockchain technology?',
        'Tell me a famous quote by Albert Einstein.', 'What are the symptoms of the flu?',
        'What is the origin of the Olympic Games?', 'How do you start a vegetable garden?',
        'What is the difference between AI and machine learning?'
    ];

    const surprise = async () => {
        const randomValue = surpriseOptions[Math.floor(Math.random() * surpriseOptions.length)];
        setValue(randomValue);
        try {
            await getResponse(randomValue);
        } catch (error) {
            console.error("Surprise error:", error);
            setError("Failed to get a surprise response. Please try again.");
        }
    };

    const cleanResponse = (text) => {
        if (!text) return '';
        
        return text
            // Remove JSON formatting
            .replace(/^[{[\s\S]*}]$/, '')  // Remove entire JSON structure
            .replace(/"[^"]+"\s*:\s*"[^"]+",?/g, '') // Remove JSON key-value pairs
            
            // Remove Markdown formatting
            .replace(/^["']|["']$/g, '')         // Remove quotes
            .replace(/\\n/g, '\n')               // Fix newlines
            .replace(/\\"/g, '"')                // Fix quotes
            .replace(/\*\*/g, '')                // Remove bold
            .replace(/\*/g, '')                  // Remove italic
            .replace(/`[^`]*`/g, '$1')           // Remove code blocks
            .replace(/```[\s\S]*?```/g, '$1')    // Remove multi-line code blocks
            .replace(/~~[^~]*~~/g, '$1')         // Remove strikethrough
            .replace(/__[^_]*__/g, '$1')         // Remove underline
            .replace(/_[^_]*_/g, '$1')           // Remove emphasis
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .replace(/#{1,6}\s/g, '')            // Remove headers
            .replace(/\n\s*[-*+]\s/g, '\n• ')    // Standardize lists
            .replace(/\n\s*\d+\.\s/g, '\n')      // Remove numbered lists
            .replace(/\|.*\|/g, '')              // Remove tables
            .replace(/\n{3,}/g, '\n\n')          // Normalize multiple newlines
            .replace(/^\s+|\s+$/gm, '')          // Trim each line
            .trim();
    };

    const getResponse = async (inputValue = value, retryCount = 0) => {
        if (!inputValue.trim()) {
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
            const newUserMessage = { role: "user", parts: inputValue };
            if (retryCount === 0) {
                setChatHistory(prev => [...prev, newUserMessage]);
            }
            
            console.log('Sending request to:', API_URL, {
                messageLength: inputValue.length,
                retryCount,
                timestamp: new Date().toISOString()
            });

            const response = await fetch(`${API_URL}/gemini`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                mode: 'cors',
                body: JSON.stringify({
                    history: [],
                    message: inputValue
                })
            });

            const data = await response.json();

            if (!response.ok) {
                let errorMessage = data.message || 'An error occurred';
                console.error('Response error:', {
                    status: response.status,
                    message: errorMessage,
                    timestamp: new Date().toISOString()
                });

                if (response.status === 401) {
                    throw new Error('API key is invalid. Please check your configuration.');
                } else if (response.status === 429) {
                    setIsRateLimited(true);
                    setTimeout(() => setIsRateLimited(false), 60000);
                    throw new Error('Too many requests. Please wait a moment.');
                } else if (response.status === 503 && retryCount < MAX_RETRIES) {
                    console.log(`Attempt ${retryCount + 1} failed, retrying...`);
                    await wait(RETRY_DELAY * (retryCount + 1));
                    return getResponse(inputValue, retryCount + 1);
                }
                throw new Error(errorMessage);
            }

            if (!data.message) {
                throw new Error('Invalid response from server');
            }

            console.log('Received response:', {
                messageLength: data.message.length,
                timestamp: new Date().toISOString()
            });

            setChatHistory(prev => [
                ...prev,
                { role: "Mira", parts: data.message }
            ]);
            
            setValue("");
        } catch (error) {
            console.error("Fetch error:", error);
            if (error.message === 'Failed to fetch') {
                setError('Unable to connect to the server. Please check your internet connection and try again.');
            } else if (retryCount === MAX_RETRIES || !error.message.includes('Service is temporarily unavailable')) {
                setChatHistory(prev => prev.slice(0, -1));
                setError(error.message || "Failed to get response. Please try again.");
            }
        } finally {
            if (retryCount === 0 || retryCount === MAX_RETRIES) {
                setIsLoading(false);
            }
        }
    };

    const clear = () => {
        setValue("");
        setError("");
        setChatHistory([]);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            getResponse();
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
        };
    }, [retryTimeout]);

    return (
        <ErrorBoundary>
            <div className="app">
                <div className="search-result">
                    {chatHistory.map((chatItem, _index) => (
                        <div key={_index} className={`chat-item ${chatItem.role.toLowerCase()}`}>
                            <div className="profile-circle">
                                {chatItem.role.toLowerCase() === 'user' ? '👤' : '🤖'}
                            </div>
                            <p className="answer">
                                {cleanResponse(chatItem.parts).split('\n').map((line, i) => (
                                    <span key={i} className="text-line">
                                        {line}
                                        {i < chatItem.parts.split('\n').length - 1 && <br />}
                                    </span>
                                ))}
                            </p>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="loading">
                            <p>{loadingMessages[Math.floor(Math.random() * loadingMessages.length)]}</p>
                            <div className="loading-spinner"></div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                {error && <p className="error">{error}</p>}
                <div className="input-container">
                    <input
                        value={value}
                        placeholder={isRateLimited ? "Please wait..." : "ask me anything..."}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading || isRateLimited}
                    />
                    <button 
                        onClick={() => getResponse()} 
                        disabled={isLoading || isRateLimited}
                    >
                        Ask me
                    </button>
                    <button 
                        className="surprise" 
                        onClick={surprise} 
                        disabled={isLoading || isRateLimited}
                    >
                        Surprise me!
                    </button>
                    <button 
                        onClick={clear} 
                        disabled={!chatHistory.length || isLoading}
                    >
                        Clear
                    </button>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default App;

