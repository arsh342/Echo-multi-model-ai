import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Typography, CircularProgress
} from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const SettingsModal = ({ open, onClose, getAccessTokenSilently }) => {
  const [config, setConfig] = useState({ openaiApiKey: '', anthropicApiKey: '', geminiApiKey: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = await getAccessTokenSilently();
      const payload = {};
      if (config.openaiApiKey) payload.openaiApiKey = config.openaiApiKey;
      if (config.anthropicApiKey) payload.anthropicApiKey = config.anthropicApiKey;
      if (config.geminiApiKey) payload.geminiApiKey = config.geminiApiKey;

      await fetch(`${API_URL}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      setMessage('API Keys saved successfully!');
      setTimeout(() => {
        onClose(true); // Pass true to signal a refresh is needed
      }, 1000);
    } catch (error) {
      setMessage('Failed to save API keys.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
      <DialogTitle>API Key Configuration</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Your keys are encrypted and stored securely. They are only used to process your requests.
        </Typography>
        <Box component="form" sx={{ mt: 2 }}>
          <TextField
            label="OpenAI API Key (ChatGPT)"
            fullWidth
            margin="normal"
            type="password"
            value={config.openaiApiKey}
            onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
          />
          <TextField
            label="Anthropic API Key (Claude)"
            fullWidth
            margin="normal"
            type="password"
            value={config.anthropicApiKey}
            onChange={(e) => setConfig({ ...config, anthropicApiKey: e.target.value })}
          />
          <TextField
            label="Google AI API Key (Gemini)"
            fullWidth
            margin="normal"
            type="password"
            value={config.geminiApiKey}
            onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
          />
        </Box>
        {message && <Typography color={message.includes('Failed') ? 'error' : 'primary'} sx={{mt: 2}}>{message}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsModal;