import React, { useState, useEffect, useRef, useCallback } from "react";
import useFirebaseAuth from './hooks/useFirebaseAuth';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import {
  Box, AppBar, Toolbar, Typography, IconButton, TextField, CircularProgress, Paper, Avatar, Drawer, CssBaseline, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Button, Tooltip, Menu, MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import SettingsIcon from '@mui/icons-material/Settings';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Settings from './components/Settings';
import useSpeechRecognition from './components/SpeechToText';
import VoiceAnimation from './components/VoiceAnimation';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const DRAWER_WIDTH = 280;

const models = {
    gemini: { name: 'Gemini 2.5 Flash', logo: 'https://wpforms.com/wp-content/uploads/cache/integrations/d67e60f7e97defa9220c65c68eb36eb2.png' },
    openai: { name: 'GPT-4.1', logo: 'https://wpforms.com/wp-content/uploads/cache/integrations/62239e6c0f995ae1fdc00d18b7905eac.png' },
    anthropic: { name: 'Claude Sonnet 4', logo: 'https://wpforms.com/wp-content/uploads/2024/08/claude-logo.png' }
};

// --- Helper Components ---
const Loading = () => ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box> );

// Copy button component for code blocks
const CopyButton = ({ code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    return (
        <Tooltip title={copied ? "Copied!" : "Copy code"}>
            <IconButton
                onClick={handleCopy}
                size="small"
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                    zIndex: 1
                }}
            >
                {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
        </Tooltip>
    );
};

// Message actions component for copy and share
const MessageActions = ({ content, role }) => {
    const [copied, setCopied] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy message:', err);
        }
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Echo AI Chat',
                    text: content,
                    url: window.location.href
                });
            } else {
                setShareMenuOpen(true);
            }
        } catch (err) {
            console.error('Failed to share:', err);
        }
    };

    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleShareMenuClose = () => {
        setShareMenuOpen(false);
    };

    const shareToTwitter = () => {
        const text = encodeURIComponent(content.length > 100 ? content.substring(0, 100) + '...' : content);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(window.location.href)}`, '_blank');
        handleShareMenuClose();
    };

    const shareToLinkedIn = () => {
        const text = encodeURIComponent(content.length > 100 ? content.substring(0, 100) + '...' : content);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent('Echo AI Chat')}&summary=${text}`, '_blank');
        handleShareMenuClose();
    };

    const shareToWhatsApp = () => {
        const text = encodeURIComponent(content.length > 100 ? content.substring(0, 100) + '...' : content);
        window.open(`https://wa.me/?text=${text}%20${encodeURIComponent(window.location.href)}`, '_blank');
        handleShareMenuClose();
    };

    return (
        <>
            <Box sx={{ 
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 0.5,
                opacity: 0,
                transition: 'opacity 0.2s',
                zIndex: 2
            }}>
                <Tooltip title={copied ? "Copied!" : "Copy message"}>
                    <IconButton
                        onClick={handleCopy}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                            }
                        }}
                    >
                        {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
                <Tooltip title="Share message">
                    <IconButton
                        onClick={handleShare}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                            }
                        }}
                    >
                        <ShareIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="More options">
                    <IconButton
                        onClick={handleMenuClick}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                            }
                        }}
                    >
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* More options menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider'
                    }
                }}
            >
                <MenuItem onClick={handleCopy}>
                    <ContentCopyIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                    Copy
                </MenuItem>
                <MenuItem onClick={handleShare}>
                    <ShareIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                    Share
                </MenuItem>
            </Menu>

            {/* Share options menu */}
            <Menu
                anchorEl={anchorEl}
                open={shareMenuOpen}
                onClose={handleShareMenuClose}
                PaperProps={{
                    sx: {
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider'
                    }
                }}
            >
                <MenuItem onClick={shareToTwitter}>
                    <Typography>Share on Twitter</Typography>
                </MenuItem>
                <MenuItem onClick={shareToLinkedIn}>
                    <Typography>Share on LinkedIn</Typography>
                </MenuItem>
                <MenuItem onClick={shareToWhatsApp}>
                    <Typography>Share on WhatsApp</Typography>
                </MenuItem>
            </Menu>
        </>
    );
};

// Markdown renderer component with syntax highlighting
const MarkdownRenderer = ({ content }) => {
    return (
        <Box className="markdown-content">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <Box sx={{ position: 'relative' }}>
                                <CopyButton code={String(children).replace(/\n$/, '')} />
                                <SyntaxHighlighter
                                    style={oneDark}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            </Box>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Custom styling for different markdown elements
                    h1: ({ children }) => (
                        <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2, mb: 1 }}>
                            {children}
                        </Typography>
                    ),
                    h2: ({ children }) => (
                        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2, mb: 1 }}>
                            {children}
                        </Typography>
                    ),
                    h3: ({ children }) => (
                        <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2, mb: 1 }}>
                            {children}
                        </Typography>
                    ),
                    p: ({ children }) => (
                        <Typography variant="body1" paragraph sx={{ mb: 1 }}>
                            {children}
                        </Typography>
                    ),
                    ul: ({ children }) => (
                        <Box component="ul" sx={{ pl: 2, mb: 1 }}>
                            {children}
                        </Box>
                    ),
                    ol: ({ children }) => (
                        <Box component="ol" sx={{ pl: 2, mb: 1 }}>
                            {children}
                        </Box>
                    ),
                    li: ({ children }) => (
                        <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                            {children}
                        </Typography>
                    ),
                    blockquote: ({ children }) => (
                        <Box
                            component="blockquote"
                            sx={{
                                borderLeft: '4px solid',
                                borderColor: 'primary.main',
                                pl: 2,
                                ml: 0,
                                my: 1,
                                fontStyle: 'italic',
                                color: 'text.secondary'
                            }}
                        >
                            {children}
                        </Box>
                    ),
                    table: ({ children }) => (
                        <Box
                            component="table"
                            sx={{
                                borderCollapse: 'collapse',
                                width: '100%',
                                mb: 1,
                                '& th, & td': {
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    p: 1,
                                    textAlign: 'left'
                                },
                                '& th': {
                                    bgcolor: 'background.paper',
                                    fontWeight: 'bold'
                                }
                            }}
                        >
                            {children}
                        </Box>
                    ),
                    a: ({ children, href }) => (
                        <Typography
                            component="a"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                color: 'primary.main',
                                textDecoration: 'none',
                                '&:hover': {
                                    textDecoration: 'underline'
                                }
                            }}
                        >
                            {children}
                        </Typography>
                    ),
                    strong: ({ children }) => (
                        <Typography component="span" sx={{ fontWeight: 'bold' }}>
                            {children}
                        </Typography>
                    ),
                    em: ({ children }) => (
                        <Typography component="span" sx={{ fontStyle: 'italic' }}>
                            {children}
                        </Typography>
                    ),
                    code: ({ children }) => (
                        <Typography
                            component="code"
                            sx={{
                                bgcolor: 'background.paper',
                                px: 0.5,
                                py: 0.25,
                                borderRadius: 0.5,
                                fontFamily: 'monospace',
                                fontSize: '0.875em'
                            }}
                        >
                            {children}
                        </Typography>
                    )
                }}
            >
                {content}
            </ReactMarkdown>
        </Box>
    );
};

const ThinkingAnimation = ({ model, isVisible }) => {
    if (!isVisible) return null;
    
    return (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-start',
            mb: 2
        }}>
            <Paper elevation={1} sx={{ 
                p: { xs: 1.5, sm: 2 }, 
                bgcolor: 'background.paper', 
                borderRadius: '16px 16px 16px 4px',
                maxWidth: { xs: '90%', sm: '75%' },
                display: 'flex',
                alignItems: 'center',
                gap: 1
            }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    animation: 'pulse 1.5s ease-in-out infinite'
                }}>
                    <Avatar 
                        src={models[model].logo} 
                        sx={{
                            width: 24, 
                            height: 24,
                            animation: 'bounce 2s infinite'
                        }}
                    />
                    <Typography variant="body2" color="text.secondary">
                        {models[model].name} is thinking...
                    </Typography>
                </Box>
                <style>
                    {`
                        @keyframes pulse {
                            0% { opacity: 0.6; }
                            50% { opacity: 1; }
                            100% { opacity: 0.6; }
                        }
                        @keyframes bounce {
                            0%, 20%, 50%, 80%, 100% {
                                transform: translateY(0);
                            }
                            40% {
                                transform: translateY(-4px);
                            }
                            60% {
                                transform: translateY(-2px);
                            }
                        }
                    `}
                </style>
            </Paper>
        </Box>
    );
};

const LoginScreen = () => {
    const { loginWithRedirect } = useFirebaseAuth();
    
    const handleLogin = () => {
        loginWithRedirect();
    };

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
            <Button 
                variant="contained" 
                size="large" 
                onClick={handleLogin}
                sx={{ 
                    px: 4, 
                    py: 1.5,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontSize: '1.1rem'
                }}
            >
                Sign in with Google
            </Button>
        </Box>
    );
};

// AI Model Selector Dropdown
const ModelSelector = ({ currentModel, setCurrentModel }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const handleOpen = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const handleSelect = (model) => {
        setCurrentModel(model);
        handleClose();
    };
    return (
        <>
            <Button
                onClick={handleOpen}
                startIcon={<Avatar src={models[currentModel].logo} sx={{ width: 24, height: 24 }} />}
                sx={{
                    borderRadius: '50px',
                    textTransform: 'none',
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    px: 1.5,
                    minWidth: 0,
                    fontWeight: 500,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    '&:hover': { bgcolor: 'action.hover' }
                }}
            >
                {models[currentModel].name}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                {Object.keys(models).map((key) => (
                    <MenuItem key={key} onClick={() => handleSelect(key)} selected={key === currentModel}>
                        <Avatar src={models[key].logo} sx={{ width: 24, height: 24, mr: 1 }} />
                        {models[key].name}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

// --- Main App Component ---
const App = () => {
    const { user, logout, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useFirebaseAuth();
    
    // --- State Management ---
    const [inputValue, setInputValue] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentModel, setCurrentModel] = useState('gemini');
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const chatContainerRef = useRef(null);
    const currentLoadingConversationRef = useRef(null);
    const { isListening, toggleListening } = useSpeechRecognition((text) => setInputValue(text));

    // Ensure conversations is always an array
    const safeConversations = Array.isArray(conversations) ? conversations : [];

    // --- Logic and Handlers ---
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

    const fetchConversations = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const token = await getAccessTokenSilently();
            console.log('Fetching conversations with token:', token ? 'Present' : 'Missing');
            
            const response = await fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
            console.log('Conversations response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Conversations API error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Conversations data received:', typeof data, data);
            
            // Ensure data is an array
            if (Array.isArray(data)) {
                setConversations(data);
                if (!currentConversationId) {
                    if (data.length > 0) {
                        setCurrentConversationId(data[0]._id);
                    } else {
                        // Create new conversation directly instead of calling handleNewConversation
                        setChatHistory([]);
                        setInputValue("");
                        setCurrentConversationId(`temp_${uuidv4()}`);
                    }
                }
            } else {
                console.error('Expected array but got:', typeof data, data);
                setConversations([]);
                if (!currentConversationId) {
                    // Create new conversation directly instead of calling handleNewConversation
                    setChatHistory([]);
                    setInputValue("");
                    setCurrentConversationId(`temp_${uuidv4()}`);
                }
            }
        } catch (e) {
            console.error("Failed to fetch conversations", e);
            setConversations([]);
            if (!currentConversationId) {
                // Create new conversation directly instead of calling handleNewConversation
                setChatHistory([]);
                setInputValue("");
                setCurrentConversationId(`temp_${uuidv4()}`);
            }
        } finally {
            setIsInitialLoad(false);
        }
    }, [isAuthenticated, getAccessTokenSilently, currentConversationId]); // Remove handleNewConversation from dependencies

    // Fetch chat history when conversation changes
    const fetchChatHistory = useCallback(async (conversationId) => {
        if (!conversationId || !isAuthenticated) return;
        
        // Prevent race conditions by tracking which conversation is being loaded
        currentLoadingConversationRef.current = conversationId;
        setIsLoadingHistory(true);
        
        try {
            const token = await getAccessTokenSilently();
            const response = await fetch(`${API_URL}/history/${conversationId}`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            
            // Check if this is still the conversation we want to load
            if (currentLoadingConversationRef.current !== conversationId) {
                return; // Another conversation was selected, ignore this response
            }
            
            if (response.ok) {
                const histData = await response.json();
                // Only update if the data is different to prevent unnecessary re-renders
                setChatHistory(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(histData)) {
                        return histData;
                    }
                    return prev;
                });
            } else {
                console.error('Failed to fetch chat history');
                setChatHistory([]);
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
            setChatHistory([]);
        } finally {
            // Only clear loading if this is still the current conversation
            if (currentLoadingConversationRef.current === conversationId) {
                setIsLoadingHistory(false);
            }
        }
    }, [isAuthenticated, getAccessTokenSilently]);

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

            // Get the response data and add it to chat history locally
            const responseData = await response.json();
            setChatHistory(prev => [...prev, { 
                _id: `temp_ai_${Date.now()}`, 
                role: "assistant", 
                parts: responseData.response || responseData.message || "Response received"
            }]);
            
            // Only fetch conversations if this was a new conversation (temp_ conversation)
            if (currentConversationId.startsWith('temp_')) {
                fetchConversations();
            }

        } catch (err) {
            console.error(err.message);
            // Add error message to chat history
            setChatHistory(prev => [...prev, { 
                _id: `temp_error_${Date.now()}`, 
                role: "assistant", 
                parts: "Sorry, I encountered an error. Please try again."
            }]);
        } finally {
            setIsLoadingResponse(false);
        }
    }, [currentConversationId, getAccessTokenSilently, fetchConversations, currentModel]); // Remove fetchChatHistory from dependencies
    
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

    // Load chat history when conversation changes
    useEffect(() => {
        if (currentConversationId && !currentConversationId.startsWith('temp_') && isAuthenticated) {
            fetchChatHistory(currentConversationId);
        }
    }, [currentConversationId, isAuthenticated]);

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
                    setChatHistory([]);
                    setInputValue("");
                    setCurrentConversationId(`temp_${uuidv4()}`);
                }
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    }, [getAccessTokenSilently, currentConversationId]); // Remove handleNewConversation from dependencies

    useEffect(() => {
        if (isAuthenticated && isInitialLoad) {
            fetchConversations();
        }
    }, [isAuthenticated, isInitialLoad]); // Only fetch on initial load and auth changes

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
                {safeConversations.map((conv) => (
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
                            <ListItemText primary={conv.firstMessage || 'New Chat'} primaryTypographyProps={{ noWrap: true }} />
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="Copy conversation title">
                                    <IconButton 
                                        size="small" 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            navigator.clipboard.writeText(conv.firstMessage || 'New Chat');
                                        }}
                                        sx={{ 
                                            visibility: currentConversationId === conv._id ? 'visible' : 'hidden',
                                            '&:hover': { visibility: 'visible' }
                                        }}
                                    >
                                        <ContentCopyIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                    </IconButton>
                                </Tooltip>
                                <IconButton 
                                    size="small" 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv._id); }}
                                    sx={{ 
                                        visibility: currentConversationId === conv._id ? 'visible' : 'hidden',
                                        '&:hover': { visibility: 'visible' }
                                    }}
                                >
                                    <DeleteIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                </IconButton>
                            </Box>
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
                                src={user?.photoURL} 
                                alt={user?.displayName}
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
                    {isInitialLoad || isLoadingHistory ? (
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
                                    Hello, {user.displayName || user.email}
                                </Typography>
                            )}
                            <Typography variant="h2" gutterBottom>Welcome</Typography>
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
                                        maxWidth: { xs: '90%', sm: '75%' },
                                        position: 'relative',
                                        '&:hover .message-actions': {
                                            opacity: 1
                                        },
                                        '& pre': {
                                            margin: 0,
                                            borderRadius: 1,
                                            overflow: 'auto'
                                        },
                                        '& code': {
                                            fontFamily: 'monospace'
                                        }
                                    }}>
                                        {/* Message Actions */}
                                        <Box className="message-actions">
                                            <MessageActions content={item.parts} role={item.role} />
                                        </Box>
                                        
                                        {item.role === 'user' ? (
                                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {item.parts}
                                            </Typography>
                                        ) : (
                                            <MarkdownRenderer content={item.parts} />
                                        )}
                                    </Paper>
                                </Box>
                            ))}
                            
                            {/* Thinking Animation */}
                            <ThinkingAnimation 
                                model={currentModel} 
                                isVisible={isLoadingResponse} 
                            />
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
                
                {/* Input Bar Section */}
                <Box sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    py: { xs: 2, sm: 3 },
                    bgcolor: 'transparent'
                }}>
                    <Box sx={{ 
                        width: { xs: '100%', sm: '60%', md: '50%' },
                        maxWidth: { md: `calc(100% - ${DRAWER_WIDTH}px - 32px)` },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        {/* Input on top */}
                        <Paper component="form" sx={{ 
                            p: 0, 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            borderRadius: '32px',
                            boxShadow: 3,
                            width: '100%',
                            bgcolor: 'transparent',
                            border: '1px solid',
                            borderColor: 'divider',
                            paddingTop: 1,
                            minHeight: 80
                        }} onSubmit={handleFormSubmit}>
                            <TextField
                                fullWidth
                                multiline
                                maxRows={5} 
                                variant="standard" 
                                placeholder="Ask anything"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleFormSubmit(e))} 
                                InputProps={{ 
                                    disableUnderline: true, 
                                    sx: {
                                        p: { xs: '0 8px', sm: '0 10px' },
                                        fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                        bgcolor: 'transparent',
                                        borderRadius: '32px',
                                    }
                                }} 
                                sx={{
                                    bgcolor: 'transparent',
                                    borderRadius: '32px',
                                    flex: 1,
                                    mx: 1,
                                    mt: 1,
                                    mb: 0.5
                                }}
                                className="input-bar-textarea"
                            />
                            {/* Controls row below */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pb: 1 }}>
                                <ModelSelector currentModel={currentModel} setCurrentModel={setCurrentModel} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton 
                                        onClick={toggleListening}
                                        sx={{ 
                                            color: isListening ? 'error.main' : 'text.secondary',
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                    >
                                        <MicIcon />
                                    </IconButton>
                                    <IconButton 
                                        type="submit" 
                                        sx={{ 
                                            color: inputValue.trim() ? 'white' : 'text.disabled',
                                            bgcolor: inputValue.trim() ? 'primary.main' : 'action.disabledBackground',
                                            '&:hover': {
                                                bgcolor: inputValue.trim() ? 'primary.dark' : 'action.disabledBackground'
                                            }
                                        }} 
                                        aria-label="send" 
                                        disabled={!inputValue.trim() || isLoadingResponse}
                                    >
                                        <SendIcon />
                                    </IconButton>
                                </Box>
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
                            AI can make mistakes. Check important info.
                        </Typography>
                    </Box>
                </Box>
            </Box>
            
            <Settings 
                open={settingsOpen} 
                onClose={() => setSettingsOpen(false)} 
                user={user} 
                conversations={safeConversations}
                onDeleteConversation={handleDeleteConversation}
                currentConversation={currentConversationId}
                chatHistory={chatHistory}
            />
        </Box>
    );
};

export default App;