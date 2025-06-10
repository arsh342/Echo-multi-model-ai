import React from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Button, Typography, Avatar, IconButton, Divider, Drawer, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';

const Sidebar = ({
    conversations,
    onNewConversation,
    onSelectConversation,
    onDeleteConversation,
    currentConversationId,
    user,
    logout,
    onOpenSettings,
    mobileOpen,
    handleDrawerToggle,
    drawerWidth,
    getAccessTokenSilently
}) => {
    const handleDeleteClick = (convoId, e) => {
        e.stopPropagation(); // Prevent conversation selection when clicking delete
        if (!convoId || typeof convoId !== 'string') {
            console.error('Invalid conversation ID provided:', convoId);
            return;
        }
        try {
            onDeleteConversation(convoId);
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    };

    const drawerContent = (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            bgcolor: 'background.paper',
            overflow: 'hidden'
        }}>
            <Box sx={{ 
                p: { xs: 1.5, sm: 2 },
                borderBottom: 1,
                borderColor: 'divider'
            }}>
                <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<AddIcon />}
                    onClick={onNewConversation}
                    sx={{ 
                        justifyContent: 'flex-start',
                        py: { xs: 1, sm: 1.5 },
                        fontSize: { xs: '0.9rem', sm: '1rem' }
                    }}
                >
                    New Chat
                </Button>
            </Box>
            <List sx={{ 
                flexGrow: 1, 
                overflowY: 'auto', 
                p: { xs: '4px', sm: '8px' },
                '&::-webkit-scrollbar': {
                    width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0,0,0,0.1)',
                    borderRadius: '3px',
                },
            }}>
                {Array.isArray(conversations) && conversations.map(convo => {
                    if (!convo || !convo._id) {
                        console.warn('Invalid conversation object:', convo);
                        return null;
                    }
                    return (
                        <ListItem 
                            key={convo._id} 
                            disablePadding 
                            sx={{ 
                                my: 0.5,
                                '&:hover .delete-button': {
                                    opacity: 1
                                }
                            }}
                        >
                            <ListItemButton
                                selected={convo._id === currentConversationId}
                                onClick={() => onSelectConversation(convo._id)}
                                sx={{ 
                                    borderRadius: '8px',
                                    py: { xs: 1, sm: 1.5 },
                                    pr: { xs: 1, sm: 2 }
                                }}
                            >
                                <ListItemText 
                                    primary={convo.firstMessage || 'Untitled Conversation'} 
                                    primaryTypographyProps={{ 
                                        noWrap: true, 
                                        sx: { 
                                            fontSize: { xs: '0.85rem', sm: '0.9rem' },
                                            fontWeight: convo._id === currentConversationId ? 500 : 400,
                                            pr: 2
                                        } 
                                    }} 
                                />
                                <Tooltip title="Delete conversation">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleDeleteClick(convo._id, e)}
                                        className="delete-button"
                                        sx={{
                                            opacity: 0,
                                            transition: 'opacity 0.2s',
                                            color: 'error.main',
                                            '&:hover': {
                                                bgcolor: 'error.lighter'
                                            }
                                        }}
                                    >
                                        <DeleteIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />
                                    </IconButton>
                                </Tooltip>
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
            <Divider />
            <List sx={{p: { xs: '4px', sm: '8px' }}}>
                <ListItemButton 
                    onClick={onOpenSettings} 
                    sx={{ 
                        borderRadius: '8px',
                        py: { xs: 1, sm: 1.5 }
                    }}
                >
                    <ListItemIcon sx={{minWidth: { xs: '36px', sm: '40px' }}}>
                        <SettingsIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                    </ListItemIcon>
                    <ListItemText 
                        primary="API Keys" 
                        primaryTypographyProps={{
                            sx: { 
                                fontSize: { xs: '0.85rem', sm: '0.9rem' }
                            } 
                        }} 
                    />
                </ListItemButton>
            </List>
            <Divider />
            <Box sx={{ 
                p: { xs: '12px 8px', sm: '16px 8px' }, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                borderTop: 1,
                borderColor: 'divider'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5, 
                    overflow: 'hidden',
                    minWidth: 0
                }}>
                    <Avatar 
                        sx={{ 
                            width: { xs: 28, sm: 32 }, 
                            height: { xs: 28, sm: 32 } 
                        }} 
                        src={user.picture}
                    >
                        {!user.picture && <PersonIcon />}
                    </Avatar>
                    <Typography 
                        noWrap 
                        sx={{ 
                            fontSize: { xs: '0.85rem', sm: '0.9rem' },
                            fontWeight: 500
                        }}
                    >
                        {user.name || user.email}
                    </Typography>
                </Box>
                <IconButton 
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} 
                    title="Log Out"
                    sx={{ 
                        p: { xs: 0.5, sm: 1 },
                        '&:hover': {
                            bgcolor: 'action.hover'
                        }
                    }}
                >
                    <LogoutIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                </IconButton>
            </Box>
        </Box>
    );

    return (
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { 
                        boxSizing: 'border-box', 
                        width: drawerWidth,
                        borderRight: '1px solid',
                        borderColor: 'divider'
                    },
                }}
            >
                {drawerContent}
            </Drawer>
            
            {/* Desktop drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': { 
                        boxSizing: 'border-box', 
                        width: drawerWidth,
                        borderRight: '1px solid',
                        borderColor: 'divider'
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
};

export default Sidebar;