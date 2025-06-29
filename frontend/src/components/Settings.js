import React, { useState } from 'react';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Divider,
    IconButton,
    Alert,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Avatar,
    Paper,
    Tab,
    Tabs,
    CircularProgress,
    Tooltip,
    Menu,
    MenuItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import CheckIcon from '@mui/icons-material/Check';

const TabPanel = ({ children, value, index }) => (
    <Box hidden={value !== index} sx={{ p: 2 }}>
        {value === index && children}
    </Box>
);

const Settings = ({ 
    open, 
    onClose, 
    onDeleteAllHistory,
    conversations,
    onDeleteConversation,
    currentConversation,
    chatHistory
}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copied, setCopied] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleDeleteAllHistory = async () => {
        if (!window.confirm('Are you sure you want to delete all conversation history? This action cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        setError('');
        
        try {
            await onDeleteAllHistory();
            setSuccess('All conversation history deleted successfully');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyConversation = async () => {
        if (!chatHistory || chatHistory.length === 0) {
            setError('No conversation to copy');
            return;
        }

        try {
            const conversationText = chatHistory.map(msg => 
                `${msg.role === 'user' ? 'You' : 'Echo'}: ${msg.parts}`
            ).join('\n\n');
            
            await navigator.clipboard.writeText(conversationText);
            setCopied(true);
            setSuccess('Conversation copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            setError('Failed to copy conversation');
        }
    };

    const handleShareConversation = async () => {
        if (!chatHistory || chatHistory.length === 0) {
            setError('No conversation to share');
            return;
        }

        try {
            const conversationText = chatHistory.map(msg => 
                `${msg.role === 'user' ? 'You' : 'Echo'}: ${msg.parts}`
            ).join('\n\n');
            
            if (navigator.share) {
                await navigator.share({
                    title: 'Echo AI Chat Conversation',
                    text: conversationText,
                    url: window.location.href
                });
            } else {
                setAnchorEl(document.querySelector('[data-testid="share-button"]'));
            }
        } catch (err) {
            console.error('Failed to share conversation:', err);
        }
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const shareToTwitter = () => {
        const text = encodeURIComponent('Check out this AI conversation from Echo!');
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(window.location.href)}`, '_blank');
        handleMenuClose();
    };

    const shareToLinkedIn = () => {
        const text = encodeURIComponent('Check out this AI conversation from Echo!');
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent('Echo AI Chat')}&summary=${text}`, '_blank');
        handleMenuClose();
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    minHeight: '60vh',
                    maxHeight: '80vh',
                    borderRadius: '50px'
                }
            }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                borderBottom: 1,
                borderColor: 'divider',
                pb: 2
            }}>
                <PersonIcon /> Settings
            </DialogTitle>
            
            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                        value={activeTab} 
                        onChange={handleTabChange}
                        variant="fullWidth"
                    >
                        <Tab icon={<PersonIcon />} label="Profile" />
                        <Tab icon={<HistoryIcon />} label="History" />
                    </Tabs>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ m: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ m: 2 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                <TabPanel value={activeTab} index={0}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Avatar 
                            sx={{ width: 64, height: 64 }}
                        >
                            <PersonIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6">Echo User</Typography>
                            <Typography color="text.secondary">Anonymous User</Typography>
                        </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                        No authentication required. Your data is stored locally.
                    </Typography>
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Conversation History
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Manage your conversation history
                        </Typography>

                        {/* Current Conversation Actions */}
                        {currentConversation && chatHistory && chatHistory.length > 0 && (
                            <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Current Conversation
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Tooltip title={copied ? "Copied!" : "Copy conversation"}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                                            onClick={handleCopyConversation}
                                        >
                                            {copied ? "Copied!" : "Copy"}
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Share conversation">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<ShareIcon />}
                                            onClick={handleShareConversation}
                                            data-testid="share-button"
                                        >
                                            Share
                                        </Button>
                                    </Tooltip>
                                </Box>
                            </Paper>
                        )}

                        <Paper variant="outlined" sx={{ mb: 2 }}>
                            <List>
                                {conversations.map((convo) => (
                                    <ListItem key={convo._id}>
                                        <ListItemText
                                            primary={convo.firstMessage || 'Untitled Conversation'}
                                            secondary={new Date(convo.timestamp).toLocaleString()}
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton 
                                                edge="end" 
                                                aria-label="delete"
                                                color="error"
                                                onClick={() => onDeleteConversation(convo._id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>

                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteForeverIcon />}
                            onClick={handleDeleteAllHistory}
                            disabled={isLoading || conversations.length === 0}
                        >
                            Delete All History
                        </Button>
                    </Box>
                </TabPanel>
            </DialogContent>

            <DialogActions sx={{ 
                borderTop: 1, 
                borderColor: 'divider',
                p: 2
            }}>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>

            {/* Share Menu */}
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
                <MenuItem onClick={shareToTwitter}>
                    <Typography>Share on Twitter</Typography>
                </MenuItem>
                <MenuItem onClick={shareToLinkedIn}>
                    <Typography>Share on LinkedIn</Typography>
                </MenuItem>
            </Menu>
        </Dialog>
    );
};

export default Settings; 