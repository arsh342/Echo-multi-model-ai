import React, { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import {
  Box, Typography, IconButton, TextField, CircularProgress, Paper, Avatar, Drawer, CssBaseline, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Button, Tooltip, Menu, MenuItem
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import SettingsIcon from '@mui/icons-material/Settings';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MenuIcon from '@mui/icons-material/Menu';
import Settings from './components/Settings';
import useSpeechRecognition from './components/SpeechToText';
import VoiceAnimation from './components/VoiceAnimation';

const API_URL = 'https://bardbackend.onrender.com';
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
                    bgcolor: 'rgba(0, 0, 0, 0)',
                    color: 'white',
                    '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0)',
                    },
                    zIndex: 1
                }}
            >
                {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
        </Tooltip>
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
                                    customStyle={{
                                        margin: 0,
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.5,
                                    }}
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
                    inlineCode: ({ children }) => (
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
            mb: 2,
            width: '100%'
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
    const [userId] = useState(() => {
        // Get or create a persistent user ID
        const stored = localStorage.getItem('echo_user_id');
        if (stored) return stored;
        const newId = `user_${uuidv4()}`;
        localStorage.setItem('echo_user_id', newId);
        return newId;
    });
    const chatContainerRef = useRef(null);
    const currentLoadingConversationRef = useRef(null);
    const { isListening, toggleListening } = useSpeechRecognition((text) => setInputValue(text));

    // --- Sidebar More Menu State ---
    const [sidebarMenuAnchorEl, setSidebarMenuAnchorEl] = useState(null);
    const [sidebarMenuChatId, setSidebarMenuChatId] = useState(null);

    // Ensure conversations is always an array
    const safeConversations = Array.isArray(conversations) ? conversations : [];

    // --- Logic and Handlers ---
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            setTimeout(() => {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }, 100);
        }
    };

    const handleNewConversation = useCallback(() => {
        setChatHistory([]);
        setInputValue("");
        setCurrentConversationId(`temp_${uuidv4()}`);
    }, []);

    const fetchConversations = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/conversations?userId=${userId}`);
            
            if (!response.ok) {
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
    }, [userId, currentConversationId]);

    // Fetch chat history when conversation changes
    const fetchChatHistory = useCallback(async (conversationId) => {
        if (!conversationId) return;
        
        // Prevent race conditions by tracking which conversation is being loaded
        currentLoadingConversationRef.current = conversationId;
        setIsLoadingHistory(true);
        
        try {
            const response = await fetch(`${API_URL}/history/${conversationId}?userId=${userId}`);
            
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
    }, [userId]);

    const sendPrompt = useCallback(async (message) => {
        if (!currentConversationId || !message) return;
        
        const conversationIdToUse = currentConversationId.startsWith('temp_') ? uuidv4() : currentConversationId;
        if (currentConversationId.startsWith('temp_')) setCurrentConversationId(conversationIdToUse);
        
        setChatHistory(prev => [...prev, { _id: `temp_msg_${Date.now()}`, role: "user", parts: message }]);
        setIsLoadingResponse(true);
        
        // Add a placeholder for the streaming AI response
        const streamingMessageId = `temp_ai_${Date.now()}`;
        setChatHistory(prev => [...prev, { 
            _id: streamingMessageId, 
            role: "assistant", 
            parts: "",
            isStreaming: true
        }]);
        
        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message, 
                    conversationId: conversationIdToUse, 
                    model: currentModel,
                    userId: userId 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An error occurred.');
            }

            // Get the response data and stream it more efficiently
            const responseData = await response.json();
            const fullResponse = responseData.message || "Response received";
            
            // Stop the thinking animation once we have the response
            setIsLoadingResponse(false);
            
            // Ultra-optimized streaming with adaptive chunk sizes
            const words = fullResponse.split(' ');
            let currentText = "";
            
            // Maximum speed streaming: very fast for all response types
            const isLongResponse = words.length > 30;
            const chunkSize = isLongResponse ? 8 : 5; // Much larger chunks for speed
            const streamSpeed = isLongResponse ? 3 : 5; // Much faster timing
            
            // Stream in large chunks for maximum speed
            for (let i = 0; i < words.length; i += chunkSize) {
                const chunk = words.slice(i, i + chunkSize).join(' ');
                currentText += (i === 0 ? '' : ' ') + chunk;
                
                setChatHistory(prev => prev.map(msg => 
                    msg._id === streamingMessageId 
                        ? { ...msg, parts: currentText }
                        : msg
                ));
                
                // Minimal delay for maximum speed
                if (i + chunkSize < words.length) {
                    await new Promise(resolve => setTimeout(resolve, streamSpeed));
                }
            }
            
            // Mark streaming as complete
            setChatHistory(prev => prev.map(msg => 
                msg._id === streamingMessageId 
                    ? { ...msg, isStreaming: false }
                    : msg
            ));
            
            // Only fetch conversations if this was a new conversation (temp_ conversation)
            if (currentConversationId.startsWith('temp_')) {
                fetchConversations();
            }

        } catch (err) {
            console.error(err.message);
            // Update the streaming message with error
            setChatHistory(prev => prev.map(msg => 
                msg._id === streamingMessageId 
                    ? { 
                        ...msg, 
                        parts: "Sorry, I encountered an error. Please try again.",
                        isStreaming: false 
                    }
                    : msg
            ));
        }
    }, [currentConversationId, fetchConversations, currentModel, userId]);
    
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
        if (currentConversationId && !currentConversationId.startsWith('temp_')) {
            fetchChatHistory(currentConversationId);
        }
    }, [currentConversationId, fetchChatHistory]);

    const handleDeleteConversation = useCallback(async (convoId) => {
        try {
            const response = await fetch(`${API_URL}/conversations/${convoId}?userId=${userId}`, {
                method: 'DELETE'
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
    }, [userId, currentConversationId]);

    useEffect(() => {
        if (isInitialLoad) {
            fetchConversations();
        }
    }, [isInitialLoad, fetchConversations]);

    // Scroll to bottom when chat history changes
    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoadingResponse]);

    const handleSidebarMenuOpen = (event, chatId) => {
        setSidebarMenuAnchorEl(event.currentTarget);
        setSidebarMenuChatId(chatId);
    };
    const handleSidebarMenuClose = () => {
        setSidebarMenuAnchorEl(null);
        setSidebarMenuChatId(null);
    };
    const handleSidebarShare = () => {
        const chat = safeConversations.find(c => c._id === sidebarMenuChatId);
        if (chat) {
            const text = chat.firstMessage || 'New Chat';
            if (navigator.share) {
                navigator.share({
                    title: 'Bard AI Chat',
                    text,
                    url: window.location.href
                });
            } else {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
            }
        }
        handleSidebarMenuClose();
    };
    const handleSidebarDelete = () => {
        if (sidebarMenuChatId) {
            handleDeleteConversation(sidebarMenuChatId);
        }
        handleSidebarMenuClose();
    };

    const drawerContent = (
        <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: 'background.paper'
        }}>
            {/* Top section: User / Bard logo and New Chat button */}
            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                        src="https://i.postimg.cc/SxbLKF1p/logo.png"
                        sx={{ width: 24, height: 24, mr: 1 }} 
                    />
                    <Typography variant="subtitle1" noWrap>Bard</Typography>
                </Box>
                <IconButton 
                    onClick={handleNewConversation} 
                    size="large" 
                    sx={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: '16px', 
                        boxShadow: 3, 
                        transition: 'all 0.2s', 
                        ml: 2,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'background.paper' }
                    }}
                >
                    <AddCircleOutlineIcon fontSize="large" sx={{ color: 'white' }} />
                </IconButton>
            </Box>

            {/* Chat History Section */}
            <Typography variant="overline" sx={{ px: 2, pt: 1, color: 'text.secondary' }}>Chats</Typography>
            <List sx={{ flexGrow: 1, overflowY: 'auto', pb: 0 }}>
                {safeConversations.map((conv) => {
                    // Generate a short summary (first 2-3 words) for the chat name
                    const summary = conv.firstMessage
                        ? conv.firstMessage.split(' ').slice(0, 3).join(' ') + (conv.firstMessage.split(' ').length > 3 ? '...' : '')
                        : 'New Chat';
                    return (
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
                                <ListItemText primary={summary} primaryTypographyProps={{ noWrap: true }} />
                                <Tooltip title="More options">
                                    <IconButton 
                                        size="small" 
                                        onClick={(e) => { e.stopPropagation(); handleSidebarMenuOpen(e, conv._id); }}
                                    >
                                        <MoreVertIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                    </IconButton>
                                </Tooltip>
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            {/* Sidebar More Menu */}
            <Menu
                anchorEl={sidebarMenuAnchorEl}
                open={Boolean(sidebarMenuAnchorEl)}
                onClose={handleSidebarMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { minWidth: 180 } }}
            >
                <MenuItem onClick={handleSidebarShare}>
                    <ShareIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                    Share
                </MenuItem>
                <MenuItem onClick={handleSidebarDelete}>
                    <DeleteIcon sx={{ mr: 1, fontSize: '1.2rem', color: 'error.main' }} />
                    <Typography color="error.main">Delete</Typography>
                </MenuItem>
            </Menu>

            {/* Bottom section: Settings */}
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
            </List>
        </Box>
    );

    // --- Mobile Header ---
    const MobileHeader = () => (
        <Box
            sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 56,
                px: 2,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1201
            }}
        >
            <IconButton onClick={handleDrawerToggle} edge="start" sx={{ color: 'text.primary' }}>
                <MenuIcon />
            </IconButton>
            <Avatar src="https://i.postimg.cc/SxbLKF1p/logo.png" sx={{ width: 32, height: 32, mx: 'auto' }} />
            <Box sx={{ width: 40 }} /> {/* Spacer for symmetry */}
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <CssBaseline />
            {/* Mobile Header */}
            <MobileHeader />
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
                    bgcolor: '#131314',
                    pt: { xs: 7, md: 0 } // Add top padding for mobile header
                }}
            >
                <Box
                    ref={chatContainerRef}
                    sx={{
                        flexGrow: 1,
                        overflow: 'auto',
                        px: { xs: 2, sm: 3 },
                        position: 'relative',
                        scrollBehavior: 'smooth',
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
                            height: '80px',
                            background: 'background.default',
                            pointerEvents: 'none',
                            zIndex: 2
                        },
                    }}
                >
                    {isInitialLoad || isLoadingHistory ? (
                        <Loading />
                    ) : safeConversations.length === 0 ? (
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
                            <Typography variant="h2" gutterBottom>Welcome</Typography>
                            <Typography variant="h6" color="text.secondary" sx={{mb: 3}}>
                                Bard chat assistant
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 2,
                            alignItems: 'center',
                            position: 'relative',
                            zIndex: 1,
                            pt: { xs: 2, sm: 3 },
                            pb: { xs: 2, sm: 3 },
                            px: { xs: 2, sm: 3 },
                            mx: 'auto',
                            width: '100%',
                            maxWidth: { xs: '100%', sm: '80%', md: '60%' },
                            minHeight: '100%',
                            justifyContent: 'flex-end',
                        }}>
                            {chatHistory.map((item, idx) => (
                                <React.Fragment key={item._id || `temp_${Math.random()}`}> 
                                    {/* Show thinking animation right before AI response bubbles */}
                                    {item.role === 'assistant' && item.isStreaming && (
                                        <ThinkingAnimation 
                                            model={currentModel} 
                                            isVisible={true} 
                                        />
                                    )}
                                    
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
                                            width: '100%',
                                            position: 'relative',
                                            mb: 1,
                                        }}
                                    >
                                        <Paper elevation={1} sx={{ 
                                            p: { xs: 1.5, sm: 2, md: 2.5 }, 
                                            bgcolor: item.role === 'user' ? 'white' : '#131314', 
                                            color: item.role === 'user' ? 'background.default' : 'text.primary', 
                                            borderRadius: '32px',
                                            maxWidth: '100%',
                                            minWidth: 0,
                                            marginLeft: item.role === 'user' ? 'auto' : 0,
                                            marginRight: item.role === 'user' ? 0 : 'auto',
                                            position: 'relative',
                                            boxShadow: 3,
                                            '& pre': {
                                                margin: 0,
                                                padding: 0,
                                                border: 0,
                                                borderRadius: 5,
                                                overflow: 'auto'
                                            },
                                            '& code': {
                                                fontFamily: 'monospace'
                                            }
                                        }}>
                                            {item.role === 'user' ? (
                                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                                    {item.parts}
                                                </Typography>
                                            ) : (
                                                <MarkdownRenderer content={item.parts} />
                                            )}
                                        </Paper>
                                    </Box>
                                    {/* Copy and Share buttons for AI responses only, positioned below the bubble */}
                                    {item.role !== 'user' && (
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'flex-start',
                                            gap: .2,
                                            mt: 0.1,
                                            mb: 0.1,
                                            width: '100%',
                                            ml: { xs: 2, sm: 3 },
                                        }}>
                                            <Tooltip title="Copy response">
                                                <IconButton
                                                    onClick={() => navigator.clipboard.writeText(item.parts)}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(0, 0, 0, 0.08)',
                                                        color: 'text.secondary',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(0, 0, 0, 0.18)'
                                                        },
                                                    }}
                                                >
                                                    <ContentCopyIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Share response">
                                                <IconButton
                                                    onClick={() => {
                                                        if (navigator.share) {
                                                            navigator.share({
                                                                title: 'Bard AI Response',
                                                                text: item.parts,
                                                                url: window.location.href
                                                            });
                                                        } else {
                                                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.parts)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
                                                        }
                                                    }}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'rgba(0, 0, 0, 0.08)',
                                                        color: 'text.secondary',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(0, 0, 0, 0.18)'
                                                        },
                                                    }}
                                                >
                                                    <ShareIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}
                                    {/* Divider after each bubble except the last one */}
                                    {idx < chatHistory.length - 1 && (
                                        <Divider sx={{ my: 2, borderColor: 'divider', width: '100%', maxWidth: { xs: '100%', sm: '100%', md: '100%' }, mx: 'auto' }} />
                                    )}
                                </React.Fragment>
                            ))}
                            
                            {/* Show thinking animation when loading response but no streaming message yet */}
                            {isLoadingResponse && !chatHistory.some(item => item.isStreaming) && (
                                <ThinkingAnimation 
                                    model={currentModel} 
                                    isVisible={true} 
                                />
                            )}
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
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        paddingBottom: '40px',
                        bgcolor: 'transparent',
                        position: 'relative',
                        zIndex: 10,
                    }}
                    style={{
                        background: 'transparent',
                        backgroundColor: 'transparent',
                    }}
                >
                    <Box sx={{ 
                        width: { xs: '100%', sm: '60%', md: '60%' },
                        maxWidth: { md: `calc(100% - ${DRAWER_WIDTH}px - 32px)` },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 2
                    }}>
                        {/* Input on top */}
                        <Paper component="form" 
                            className="input-bar-mobile"
                            sx={{ 
                                p: 0, 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                borderRadius: '32px',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0)',
                                width: '100%',
                                bgcolor: 'transparent',
                                background: 'transparent',
                                border: '1px solid',
                                borderColor: 'divider',
                                paddingTop: 1,
                                minHeight: 80
                            }} 
                            style={{ background: 'transparent', backgroundColor: 'transparent' }}
                            onSubmit={handleFormSubmit}>
                            <TextField
                                fullWidth
                                multiline
                                maxRows={5} 
                                variant="standard" 
                                placeholder="Ask anything..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleFormSubmit(e))} 
                                InputProps={{ 
                                    disableUnderline: true, 
                                    sx: {
                                        p: { xs: '0 20px', sm: '2px 30px' },
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
                    </Box>
                </Box>
            </Box>
            
            <Settings 
                open={settingsOpen} 
                onClose={() => setSettingsOpen(false)} 
                conversations={safeConversations}
                onDeleteConversation={handleDeleteConversation}
                currentConversation={currentConversationId}
                chatHistory={chatHistory}
            />
        </Box>
    );
};

export default App;