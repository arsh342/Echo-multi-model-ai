import { useState, useEffect, useRef } from "react";

const App = () => {
    const [value, setValue] = useState("");
    const [error, setError] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);

    const surpriseOptions = [
        'Who won the latest Nobel Peace Prize?',
        'Where does pizza come from?',
        'What are the top tourist attractions in Paris?',
        'How do you bake a chocolate cake?',
        'What is the capital of Japan?',
        'Tell me a fun fact about space.',
        'Who invented the telephone?',
        'What is the most popular programming language in 2024?',
        'How do you meditate effectively?',
        'What are the health benefits of yoga?',
        'Tell me a joke.',
        'What is the history of the Internet?',
        'What are the main ingredients in sushi?',
        'How does photosynthesis work?',
        'What are some tips for improving public speaking skills?',
        'What is the tallest mountain in the world?',
        'How do electric cars work?',
        'What is the significance of the Mona Lisa?',
        'Who was the first person to walk on the moon?',
        'What are the benefits of learning a second language?',
        'How can you reduce your carbon footprint?',
        'What is blockchain technology?',
        'Tell me a famous quote by Albert Einstein.',
        'What are the symptoms of the flu?',
        'What is the origin of the Olympic Games?',
        'How do you start a vegetable garden?',
        'What is the difference between AI and machine learning?'
    ];

    const surprise = () => {
        const randomValue = surpriseOptions[Math.floor(Math.random() * surpriseOptions.length)];
        setValue(randomValue);
        getResponse(randomValue);
    };

    const getResponse = async (inputValue = value) => {
        if (!inputValue.trim()) {
            setError("Please enter a question.");
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            const options = {
                method: "POST",
                body: JSON.stringify({
                    history: chatHistory,
                    message: inputValue,
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            };
            const response = await fetch("https://mira-api-ai.vercel.app/gemini", options);
            const data = await response.text();

            setChatHistory((oldChatHistory) => [
                ...oldChatHistory,
                {
                    role: "user",
                    parts: inputValue
                },
                {
                    role: "Mira",
                    parts: data
                }
            ]);
            setValue("");
        } catch (error) {
            console.error(error);
            setError("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
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

    return (
        <div className="app">
            <div className="search-result">
                {chatHistory.map((chatItem, _index) => (
                    <div key={_index} className="chat-item">
                        <p className="answer"><strong>{chatItem.role}:</strong> {chatItem.parts}</p>
                    </div>
                ))}
                {isLoading && (
                    <div className="loading">
                        <p>Mira is thinking...</p>
                        <div className="loading-spinner"></div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            {error && <p className="error">{error}</p>}
            <div className="input-container">
                <input
                    value={value}
                    placeholder="ask me anything..."
                    onChange={(e) => setValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                />
                <button onClick={() => getResponse()} disabled={isLoading}>Ask me</button>
                <button className="surprise" onClick={surprise} disabled={isLoading}>Surprise me!</button>
                <button onClick={clear} disabled={isLoading}>Clear</button>
            </div>
        </div>
    );
};

export default App;