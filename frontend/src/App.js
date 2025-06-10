import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { v4 as uuidv4 } from 'uuid';
import {
    Box, IconButton, TextField, CircularProgress, Paper, Card, CardContent, Grid, Avatar, Typography, Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SendIcon from '@mui/icons-material/Send';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const DRAWER_WIDTH = 280;

// --- Helper Components ---

const Loading = () => (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}><CircularProgress /></Box>);

const LoginScreen = () => {
    const { loginWithRedirect } = useAuth0();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center' }}>
            <Typography variant="h2" gutterBottom>Welcome to Mira</Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>Your AI-powered chat assistant</Typography>
            <Button variant="contained" size="large" onClick={() => loginWithRedirect()}>Log In</Button>
        </Box>
    );
};

const WelcomeScreen = ({ onPromptClick }) => {
    const prompts = [
        { title: "Explain", content: "quantum computing in simple terms" },
        { title: "Brainstorm", content: "names for a new coffee shop" },
        { title: "Write", content: "a short story about a robot who discovers music" },
        { title: "Plan", content: "a healthy and delicious meal for tonight" }
    ];

    return (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', mb: 2 }}>✨</Avatar>
            <Typography variant="h4" sx={{ fontWeight: 500 }}>How can I help you today?</Typography>
            <Grid container spacing={2} sx={{ mt: 4, maxWidth: '900px' }}>
                {prompts.map((prompt, i) => (
                    <Grid item xs={12} sm={6} key={i}>
                        <Card variant="outlined" sx={{ height: '100%', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => onPromptClick(`${prompt.title} ${prompt.content}`)}>
                            <CardContent>
                                <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>{prompt.title}</Typography>
                                <Typography variant="body1">{prompt.content}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

// --- Main App Component ---
const App = () => {
    const { user, logout, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();

    // State Management
    const [inputValue, setInputValue] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    const [setError] = useState("");
    const [mobileOpen, setMobileOpen] = useState(false);
    const chatContainerRef = useRef(null);

    // --- Side Effects & Logic ---
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isLoadingResponse]);

    const handleNewConversation = useCallback(() => {
        setChatHistory([]);
        setInputValue("");
        setCurrentConversationId(`temp_${uuidv4()}`);
    }, []);

    const fetchConversations = useCallback(async () => {
        if (isAuthenticated) {
            try {
                const token = await getAccessTokenSilently();
                const response = await fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
                const data = await response.json();
                setConversations(data);
                if (!currentConversationId) {
                    if (data.length > 0) setCurrentConversationId(data[0]._id);
                    else handleNewConversation();
                }
            } catch (e) {
                console.error("Failed to fetch conversations", e);
                setError("Could not load conversations.");
            }
        }
    }, [isAuthenticated, getAccessTokenSilently, currentConversationId, handleNewConversation]);

    useEffect(() => {
        if (isAuthenticated) fetchConversations();
    }, [isAuthenticated, fetchConversations]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (isAuthenticated && currentConversationId && !currentConversationId.startsWith('temp_')) {
                const token = await getAccessTokenSilently();
                const response = await fetch(`${API_URL}/history/${currentConversationId}`, { headers: { Authorization: `Bearer ${token}` } });
                const data = await response.json();
                setChatHistory(data);
            }
        };
        fetchHistory();
    }, [currentConversationId, isAuthenticated, getAccessTokenSilently]);

    const sendPrompt = useCallback(async (message) => {
        if (!currentConversationId || !message) return;
        const conversationIdToUse = currentConversationId.startsWith('temp_') ? uuidv4() : currentConversationId;
        if (currentConversationId.startsWith('temp_')) {
            setCurrentConversationId(conversationIdToUse);
        }
        setChatHistory(prev => [...prev, { _id: `temp_msg_${Date.now()}`, role: "user", parts: message }]);
        setIsLoadingResponse(true);
        setError("");

        try {
            const token = await getAccessTokenSilently();
            await fetch(`${API_URL}/gemini`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message, conversationId: conversationIdToUse }),
            });
            await fetchConversations();
            const histResponse = await fetch(`${API_URL}/history/${conversationIdToUse}`, { headers: { Authorization: `Bearer ${token}` } });
            const histData = await histResponse.json();
            setChatHistory(histData);
        } catch (err) {
            setError(err.message || "Failed to get response.");
        } finally {
            setIsLoadingResponse(false);
        }
    }, [currentConversationId, getAccessTokenSilently, fetchConversations]);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleSelectConversation = (convId) => {
        if (convId !== currentConversationId) {
            setChatHistory([]);
            setCurrentConversationId(convId);
        }
        if (mobileOpen) setMobileOpen(false);
    };
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (trimmedInput) {
            sendPrompt(trimmedInput);
            setInputValue("");
        }
    };

    if (isAuthLoading) return <Loading />;
    if (!isAuthenticated) return <LoginScreen />;

    return (
        <ErrorBoundary>
            <Box sx={{ display: 'flex', height: '100vh', p: { xs: 0, sm: 2 }, bgcolor: '#0c0b10' }}>
                <Sidebar
                    conversations={conversations}
                    onNewConversation={handleNewConversation}
                    onSelectConversation={(id) => {
                        setCurrentConversationId(id);
                        if (mobileOpen) setMobileOpen(false);
                    }}
                    currentConversationId={currentConversationId}
                    user={user}
                    logout={logout}
                    drawerWidth={DRAWER_WIDTH}
                    mobileOpen={mobileOpen}
                    handleDrawerToggle={handleDrawerToggle}
                />

                <Box component="main" sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    maxHeight: '100vh',
                    bgcolor: 'background.default',
                    borderRadius: { xs: 0, sm: '16px' },
                    boxShadow: { xs: 'none', sm: 5 },
                    position: 'relative'
                }}>
                    <Box sx={{ p: 1, display: { sm: 'none' } }}>
                        <IconButton onClick={handleDrawerToggle}>
                            <MenuIcon />
                        </IconButton>
                    </Box>
                    <Box ref={chatContainerRef} className="chat-content">
                        {chatHistory.length > 0 ? (
                            chatHistory.map((item) => (
                                <Box key={item._id} sx={{ display: 'flex', gap: 2, mb: 2, maxWidth: '90%', ml: item.role === 'user' ? 'auto' : 0, justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    {item.role === 'mira' && <Avatar>✨</Avatar>}
                                    <Paper elevation={1} sx={{ p: 1.5, bgcolor: item.role === 'user' ? 'primary.main' : 'background.paper', color: item.role === 'user' ? 'primary.contrastText' : 'text.primary' }}>
                                        <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.parts}</Typography>
                                    </Paper>
                                    {item.role === 'user' && <Avatar src={user.picture} />}
                                </Box>
                            ))
                        ) : (
                            <WelcomeScreen onPromptClick={(prompt) => sendPrompt(prompt)} />
                        )}
                        {isLoadingResponse && <CircularProgress size={24} sx={{ m: '1rem auto' }} />}
                    </Box>
                    <Box sx={{ p: 2 }}>
                        <Paper component="form" sx={{ p: '2px 8px', display: 'flex', alignItems: 'center', borderRadius: '12px' }} onSubmit={handleFormSubmit}>
                            <TextField
                                fullWidth
                                multiline
                                maxRows={5}
                                variant="standard"
                                placeholder="Send a message..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleFormSubmit(e))}
                                InputProps={{ disableUnderline: true, sx: { p: '6px' } }}
                            />
                            <IconButton type="submit" sx={{ p: '10px' }} aria-label="send" disabled={!inputValue.trim() || isLoadingResponse}>
                                <SendIcon />
                            </IconButton>
                        </Paper>
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mt: 1 }}>
                            Mira can make mistakes. Consider checking important information.
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </ErrorBoundary>
    );
};

export default App;