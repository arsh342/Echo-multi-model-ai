import React from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemText, Button, Typography, Avatar, IconButton, Divider
} from '@mui/material';
// Import MUI Icons
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';

const Sidebar = ({
    conversations,
    onNewConversation,
    onSelectConversation,
    currentConversationId,
    user,
    logout
}) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
            <Box sx={{ p: 2 }}>
                <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<AddIcon />}
                    onClick={onNewConversation}
                    sx={{ justifyContent: 'flex-start' }}
                >
                    New Chat
                </Button>
            </Box>
            <List sx={{ flexGrow: 1, overflowY: 'auto', p: '0 8px' }}>
                {conversations.map(convo => (
                    <ListItem key={convo._id} disablePadding sx={{ my: 0.5 }}>
                        <ListItemButton
                            selected={convo._id === currentConversationId}
                            onClick={() => onSelectConversation(convo._id)}
                            sx={{ borderRadius: '8px' }}
                        >
                            <ListItemText 
                                primary={convo.firstMessage} 
                                primaryTypographyProps={{ noWrap: true, sx: { fontSize: '0.9rem' } }} 
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                    <Avatar sx={{ width: 32, height: 32 }} src={user.picture}>
                        {!user.picture && <PersonIcon />}
                    </Avatar>
                    <Typography noWrap sx={{ fontSize: '0.9rem' }}>{user.name || user.email}</Typography>
                </Box>
                <IconButton onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} title="Log Out">
                    <LogoutIcon />
                </IconButton>
            </Box>
        </Box>
    );
};

export default Sidebar;