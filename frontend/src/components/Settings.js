import React, { useState } from 'react';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
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
    CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import KeyIcon from '@mui/icons-material/Key';
import HistoryIcon from '@mui/icons-material/History';
import SaveIcon from '@mui/icons-material/Save';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

const TabPanel = ({ children, value, index }) => (
    <Box hidden={value !== index} sx={{ p: 2 }}>
        {value === index && children}
    </Box>
);

const Settings = ({ 
    open, 
    onClose, 
    user, 
    userKeys, 
    getAccessTokenSilently,
    onDeleteAllHistory,
    conversations,
    onDeleteConversation
}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [apiKeys, setApiKeys] = useState({
        openai: '',
        anthropic: '',
        gemini: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleApiKeyChange = (key) => (event) => {
        setApiKeys(prev => ({
            ...prev,
            [key]: event.target.value
        }));
    };

    const handleSaveApiKeys = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');
        
        try {
            const token = await getAccessTokenSilently();
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(apiKeys)
            });

            if (!response.ok) {
                throw new Error('Failed to save API keys');
            }

            setSuccess('API keys saved successfully');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
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
                        <Tab icon={<KeyIcon />} label="API Keys" />
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
                            src={user.picture} 
                            sx={{ width: 64, height: 64 }}
                        >
                            {!user.picture && <PersonIcon />}
                        </Avatar>
                        <Box>
                            <Typography variant="h6">{user.name}</Typography>
                            <Typography color="text.secondary">{user.email}</Typography>
                        </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                        Account managed by Auth0
                    </Typography>
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            API Keys
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Enter your API keys to enable different AI models
                        </Typography>
                        
                        <TextField
                            fullWidth
                            label="OpenAI API Key"
                            type="password"
                            value={apiKeys.openai}
                            onChange={handleApiKeyChange('openai')}
                            margin="normal"
                            helperText={userKeys.hasOpenAIKey ? "API key is set" : "API key is not set"}
                        />
                        
                        <TextField
                            fullWidth
                            label="Anthropic API Key"
                            type="password"
                            value={apiKeys.anthropic}
                            onChange={handleApiKeyChange('anthropic')}
                            margin="normal"
                            helperText={userKeys.hasAnthropicKey ? "API key is set" : "API key is not set"}
                        />
                        
                        <TextField
                            fullWidth
                            label="Gemini API Key"
                            type="password"
                            value={apiKeys.gemini}
                            onChange={handleApiKeyChange('gemini')}
                            margin="normal"
                            helperText={userKeys.hasGeminiKey ? "API key is set" : "API key is not set"}
                        />
                    </Box>
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Conversation History
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Manage your conversation history
                        </Typography>

                        <Paper variant="outlined" sx={{ mb: 2 }}>
                            <List>
                                {conversations.map((convo) => (
                                    <ListItem key={convo._id}>
                                        <ListItemText
                                            primary={convo.firstMessage || 'Untitled Conversation'}
                                            secondary={new Date(convo.createdAt).toLocaleString()}
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
                {activeTab === 1 && (
                    <Button
                        variant="contained"
                        startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                        onClick={handleSaveApiKeys}
                        disabled={isLoading}
                    >
                        Save API Keys
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default Settings; 