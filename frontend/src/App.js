import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { v4 as uuidv4 } from 'uuid';
import {
  Box, AppBar, Toolbar, Typography, IconButton, TextField, CircularProgress, Paper, Avatar, Drawer, CssBaseline, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import SettingsIcon from '@mui/icons-material/Settings';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Settings from './components/Settings';
import useSpeechRecognition from './components/SpeechToText';
import VoiceAnimation from './components/VoiceAnimation';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const DRAWER_WIDTH = 280;

const models = {
    gemini: { name: 'Gemini', logo: 'https://wpforms.com/wp-content/uploads/cache/integrations/d67e60f7e97defa9220c65c68eb36eb2.png' },
    openai: { name: 'ChatGPT', logo: 'https://wpforms.com/wp-content/uploads/cache/integrations/62239e6c0f995ae1fdc00d18b7905eac.png' },
    anthropic: { name: 'Claude', logo: 'https://wpforms.com/wp-content/uploads/2024/08/claude-logo.png' }
};

// --- Helper Components (Defined outside App as they don't use its state) ---
const Loading = () => ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box> );

const LoginScreen = () => {
    const { loginWithRedirect } = useAuth0();
    
    // Automatically redirect to login when component mounts
    React.useEffect(() => {
        loginWithRedirect();
    }, [loginWithRedirect]);

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2, 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh', 
            textAlign: 'center' 
        }}>
            <Typography variant="h2" gutterBottom>Welcome to Echo</Typography>
            <Typography variant="h6" color="text.secondary" sx={{mb: 3}}>
                Your AI-powered chat assistant
            </Typography>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>
                Redirecting to login...
            </Typography>
        </Box>
    );
};

// --- Main App Component ---
const App = () => {
    const { user, logout, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
    
    // --- State Management ---
    const [inputValue, setInputValue] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentModel, setCurrentModel] = useState('gemini');
    const [userKeys, setUserKeys] = useState({ hasOpenAIKey: false, hasAnthropicKey: false, hasGeminiKey: false });
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const chatContainerRef = useRef(null);
    const { isListening, toggleListening } = useSpeechRecognition((text) => setInputValue(text));

    // --- Logic and Handlers (Defined inside App to access state) ---
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    const handleNewConversation = useCallback(() => {
        setChatHistory([]);
        setInputValue("");
        setCurrentConversationId(`temp_${uuidv4()}`);
    }, []);

    const fetchUserConfig = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const token = await getAccessTokenSilently();
            const response = await fetch(`${API_URL}/config`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await response.json();
            setUserKeys(data);
        } catch (e) {
            console.error("Could not fetch user config", e);
        }
    }, [isAuthenticated, getAccessTokenSilently]);

    const fetchConversations = useCallback(async () => {
        if (!isAuthenticated) return;
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
        } finally {
            setIsInitialLoad(false);
        }
    }, [isAuthenticated, getAccessTokenSilently, currentConversationId, handleNewConversation]);

    const sendPrompt = useCallback(async (message) => {
        if (!currentConversationId || !message) return;
        const conversationIdToUse = currentConversationId.startsWith('temp_') ? uuidv4() : currentConversationId;
        if (currentConversationId.startsWith('temp_')) setCurrentConversationId(conversationIdToUse);
        
        setChatHistory(prev => [...prev, { _id: `temp_msg_${Date.now()}`, role: "user", parts: message }]);
        setIsLoadingResponse(true);
        
        try {
            const token = await getAccessTokenSilently();
            const response = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message, conversationId: conversationIdToUse, model: currentModel }),
            });

            if (!response.ok) throw new Error((await response.json()).error || 'An error occurred.');

            const histResponse = await fetch(`${API_URL}/history/${conversationIdToUse}`, { headers: { Authorization: `Bearer ${token}` } });
            const histData = await histResponse.json();
            setChatHistory(histData);
            
            if (currentConversationId.startsWith('temp_')) fetchConversations();

        } catch (err) {
            console.error(err.message);
        } finally {
            setIsLoadingResponse(false);
        }
    }, [currentConversationId, getAccessTokenSilently, fetchConversations, currentModel]);
    
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if(trimmedInput) {
            sendPrompt(trimmedInput);
            setInputValue("");
        }
    };
    
    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    
    const handleSelectConversation = (convId) => {
        if (convId !== currentConversationId) {
            setChatHistory([]);
            setCurrentConversationId(convId);
        }
        if (mobileOpen) setMobileOpen(false);
    };

    const handleDeleteConversation = useCallback(async (convoId) => {
        try {
            const token = await getAccessTokenSilently();
            const response = await fetch(`${API_URL}/conversations/${convoId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                // Update conversations list
                setConversations(prev => prev.filter(conv => conv._id !== convoId));
                
                // If the deleted conversation was the current one, create a new conversation
                if (convoId === currentConversationId) {
                    handleNewConversation();
                }
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    }, [getAccessTokenSilently, currentConversationId, handleNewConversation]);

    useEffect(() => {
        fetchUserConfig();
        fetchConversations();
    }, [isAuthenticated, fetchUserConfig, fetchConversations]);

    // Scroll to bottom when chat history changes
    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoadingResponse]);

    if (isAuthLoading) {
        return <Loading />;
    }

    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    const drawerContent = (
        <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: 'background.paper'
        }}>
            {/* Top section: User / Echo logo and New Chat button */}
            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                        src="https://i.postimg.cc/XqknDM5K/image.png"
                        sx={{ width: 24, height: 24, mr: 1 }} 
                    />
                    <Typography variant="subtitle1" noWrap>Echo</Typography>
                </Box>
                <IconButton onClick={handleNewConversation} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}>
                    <AddCircleOutlineIcon fontSize="small" sx={{ color: 'white' }} />
                </IconButton>
            </Box>

            {/* Chat History Section */}
            <Typography variant="overline" sx={{ px: 2, pt: 1, color: 'text.secondary' }}>Chats</Typography>
            <List sx={{ flexGrow: 1, overflowY: 'auto', pb: 0 }}>
                {conversations.map((conv) => (
                    <ListItem 
                        key={conv._id} 
                        disablePadding
                        sx={{
                            bgcolor: currentConversationId === conv._id ? 'rgba(255,255,255,0.1)' : 'transparent',
                            borderRadius: '8px',
                            mx: 1,
                            mb: 0.5,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                        }}
                    >
                        <ListItemButton onClick={() => handleSelectConversation(conv._id)} sx={{ pr: 1 }}>
                            <ListItemIcon sx={{ minWidth: '40px' }}>
                                <ChatBubbleOutlineIcon sx={{ color: 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText primary={conv.title || 'New Chat'} primaryTypographyProps={{ noWrap: true }} />
                            <IconButton 
                                size="small" 
                                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv._id); }}
                                sx={{ 
                                    ml: 1,
                                    visibility: currentConversationId === conv._id ? 'visible' : 'hidden',
                                    '&:hover': { visibility: 'visible' } // Make delete icon visible on hover
                                }}
                            >
                                <DeleteIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            </IconButton>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {/* Bottom section: Settings, Logout */}
            <Divider sx={{ mx: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            <List sx={{ pb: 1 }}>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => setSettingsOpen(true)}>
                        <ListItemIcon sx={{ minWidth: '40px' }}>
                            <SettingsIcon sx={{ color: 'text.secondary' }} />
                        </ListItemIcon>
                        <ListItemText primary="Settings" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={logout}>
                        <ListItemIcon sx={{ minWidth: '40px' }}>
                            <AccountCircleIcon sx={{ color: 'text.secondary' }} />
                        </ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <CssBaseline />
            {/* Sidebar (Desktop) */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': { 
                        boxSizing: 'border-box', 
                        width: DRAWER_WIDTH, 
                        bgcolor: 'background.paper',
                        borderRight: 'none',
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>

            {/* Sidebar (Mobile) */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { 
                        boxSizing: 'border-box', 
                        width: DRAWER_WIDTH, 
                        bgcolor: 'background.paper',
                    },
                }}
            >
                {drawerContent}
            </Drawer>
            
            {/* Main Content */}
            <Box component="main" 
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
                    bgcolor: '#131314'
                }}
            >
                <AppBar 
                    position="fixed" 
                    elevation={0}
                    sx={{
                        width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` }, 
                        ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
                        bgcolor: '#131314',
                        boxShadow: 'none',
                        backdropFilter: 'none',
                        borderBottom: 'none',
                        zIndex: (theme) => theme.zIndex.drawer + 1 
                    }}
                >
                    <Toolbar disableGutters>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { md: 'none' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                            
                        </Typography>
                        <IconButton 
                            color="inherit" 
                            onClick={() => setSettingsOpen(true)}
                            sx={{ 
                                '&:hover': { 
                                    bgcolor: 'rgba(255, 255, 255, 0.1)' 
                                } 
                            }}
                        >
                            <Avatar 
                                src={user?.picture} 
                                alt={user?.name}
                                sx={{ width: 32, height: 32 }}
                            />
                        </IconButton>
                    </Toolbar>
                </AppBar>

                <Toolbar /> {/* Spacer to push content below fixed AppBar */}

                <Box
                    ref={chatContainerRef}
                    sx={{
                        flexGrow: 1,
                        overflow: 'auto',
                        px: { xs: 2, sm: 3 },
                        position: 'relative',
                        '&::-webkit-scrollbar': {
                            display: 'none'
                        },
                        scrollbarWidth: 'none',  // Firefox
                        msOverflowStyle: 'none',  // IE and Edge
                        '&::before': {
                            content: '""',
                            position: 'fixed',
                            top: 0,
                            left: { xs: 0, md: `${DRAWER_WIDTH}px` },
                            right: 0,
                            height: '150px',
                            background: 'linear-gradient(180deg, rgba(19, 19, 20, 1) 0%, rgba(19, 19, 20, 0.8) 50%, rgba(19, 19, 20, 0) 100%)',
                            pointerEvents: 'none',
                            zIndex: 2
                        }
                    }}
                >
                    {isInitialLoad ? (
                        <Loading />
                    ) : chatHistory.length === 0 ? (
                        <Box sx={{ 
                            minHeight: '100%',
                            width: '100%',
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            p: 3, 
                            textAlign: 'center',
                        }}>
                            {user && (
                                <Typography variant="h5" sx={{ mb: 2, color: 'text.secondary' }}>
                                    Hello, {user.name}
                                </Typography>
                            )}
                            <Typography variant="h2" gutterBottom>Welcome to Echo</Typography>
                            <Typography variant="h6" color="text.secondary" sx={{mb: 3}}>
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 2,
                            position: 'relative',
                            zIndex: 1,
                            pt: { xs: 2, sm: 3 },
                            pb: { xs: 2, sm: 3 },
                            px: { xs: 2, sm: 3 },
                        }}>
                            {chatHistory.map((item) => (
                                <Box key={item._id || `temp_${Math.random()}`} sx={{ 
                                    display: 'flex', 
                                    justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start' 
                                }}>
                                    <Paper elevation={1} sx={{ 
                                        p: { xs: 1.5, sm: 2 }, 
                                        bgcolor: item.role === 'user' ? 'white' : 'background.paper', 
                                        color: item.role === 'user' ? 'background.default' : 'text.primary', 
                                        borderRadius: item.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        maxWidth: { xs: '90%', sm: '75%' }
                                    }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {item.parts}
                                        </Typography>
                                    </Paper>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>

                <VoiceAnimation 
                    isListening={isListening}
                    sx={{
                        position: 'fixed',
                        bottom: { xs: '130px', sm: '150px' },
                        left: { xs: '50%', md: `calc(50% + ${DRAWER_WIDTH/2}px)` },
                        transform: 'translateX(-50%)',
                        width: { xs: '90%', sm: '80%', md: '70%' },
                        maxWidth: { md: `calc(100% - ${DRAWER_WIDTH}px - 32px)` },
                        height: '60px',
                    }}
                />
                
                {/* Input Bar Section - Now part of flex flow */}
                <Box sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    py: { xs: 2, sm: 3 },
                    bgcolor: '#131314',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <Box sx={{ 
                        width: { xs: '90%', sm: '80%', md: '70%' },
                        maxWidth: { md: `calc(100% - ${DRAWER_WIDTH}px - 32px)` },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <Paper component="form" sx={{ 
                            p: '2px 4px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            borderRadius: '12px',
                            boxShadow: 3,
                            width: '100%',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider'
                        }} onSubmit={handleFormSubmit}>
                            <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                borderRight: '1px solid',
                                borderColor: 'divider',
                                pr: 1,
                                mr: 1
                            }}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        const newModel = currentModel === 'gemini' ? 'openai' : 
                                                       currentModel === 'openai' ? 'anthropic' : 'gemini';
                                        if ((newModel === 'openai' && userKeys.hasOpenAIKey) ||
                                            (newModel === 'anthropic' && userKeys.hasAnthropicKey) ||
                                            newModel === 'gemini') {
                                            setCurrentModel(newModel);
                                        }
                                    }}
                                    sx={{ 
                                        p: 0.5,
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    <Avatar 
                                        src={models[currentModel].logo} 
                                        sx={{
                                            width: 24, 
                                            height: 24,
                                            opacity: (currentModel === 'openai' && !userKeys.hasOpenAIKey) || 
                                                    (currentModel === 'anthropic' && !userKeys.hasAnthropicKey) ? 0.5 : 1
                                        }}
                                    />
                                </IconButton>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontSize: '0.8rem',
                                        color: 'text.secondary',
                                        ml: 0.5,
                                        display: { xs: 'none', sm: 'block' }
                                    }}
                                >
                                    {models[currentModel].name}
                                </Typography>
                            </Box>
                            <TextField
                                fullWidth
                                multiline
                                maxRows={5} 
                                variant="standard" 
                                placeholder="Send a message..." 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleFormSubmit(e))} 
                                InputProps={{ 
                                    disableUnderline: true, 
                                    sx: {
                                        p: { xs: '0 8px', sm: '0 10px' },
                                        fontSize: { xs: '0.9rem', sm: '1rem' }
                                    }
                                }} 
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconButton 
                                    onClick={toggleListening}
                                    sx={{ 
                                        p: { xs: '8px', sm: '10px' },
                                        color: isListening ? 'error.main' : 'text.secondary',
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    <MicIcon />
                                </IconButton>
                                <IconButton 
                                    type="submit" 
                                    sx={{ 
                                        p: { xs: '8px', sm: '10px' },
                                        color: inputValue.trim() ? 'white' : 'text.disabled',
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }} 
                                    aria-label="send" 
                                    disabled={!inputValue.trim() || isLoadingResponse}
                                >
                                    <SendIcon />
                                </IconButton>
                            </Box>
                        </Paper>
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                mt: 1, 
                                color: 'text.secondary',
                                textAlign: 'center',
                                fontSize: '0.75rem'
                            }}
                        >
                            Press Enter to send, Shift + Enter for new line
                        </Typography>
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                mt: 0.5, 
                                color: 'text.secondary',
                                textAlign: 'center',
                                fontSize: '0.7rem'
                            }}
                        >
                            Echo can make mistakes, so double-check it.
                        </Typography>
                    </Box>
                </Box>
            </Box>
            
            <Settings 
                open={settingsOpen} 
                onClose={() => setSettingsOpen(false)} 
                user={user} 
                userKeys={userKeys} 
                fetchUserConfig={fetchUserConfig}
                conversations={conversations}
                onDeleteConversation={handleDeleteConversation}
            />
        </Box>
    );
};

export default App;