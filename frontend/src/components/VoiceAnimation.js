import React from 'react';
import { Box } from '@mui/material';

const VoiceAnimation = ({ isListening, sx }) => {
    if (!isListening) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                zIndex: 1000,
                pointerEvents: 'none',
                ...sx
            }}
        >
            {[...Array(5)].map((_, i) => (
                <Box
                    key={i}
                    sx={{
                        width: '4px',
                        height: '100%',
                        backgroundColor: 'white',
                        borderRadius: '2px',
                        animation: 'soundWave 1s ease-in-out infinite',
                        animationDelay: `${i * 0.1}s`,
                        opacity: 0.8,
                        boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
                    }}
                />
            ))}
            <style>
                {`
                    @keyframes soundWave {
                        0% {
                            transform: scaleY(0.2);
                        }
                        50% {
                            transform: scaleY(1);
                        }
                        100% {
                            transform: scaleY(0.2);
                        }
                    }
                `}
            </style>
        </Box>
    );
};

export default VoiceAnimation; 