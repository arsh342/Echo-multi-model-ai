# Mira 🌟

A sleek AI chat interface powered by Google's Gemini API, featuring a modern dark theme with glassmorphism effects. Built with React and Node.js, Mira offers an elegant chat experience with smart context handling and real-time responses.

## ✨ Key Features

- Modern dark UI with purple accents and glass effects
- Smart context handling with chat history persistence
- Real-time responses with loading states
- Surprise prompts for inspiration
- Responsive design for all devices

## ✨ Features

- **Modern UI/UX**
  - Dark theme with purple accents
  - Glassmorphism effects
  - Responsive design
  - Smooth animations
  - Custom scrollbar

- **Chat Functionality**
  - Real-time chat interface
  - Message history persistence
  - Surprise prompts feature
  - Smart context handling
  - Markdown support

- **Technical Features**
  - Google Gemini API integration
  - Rate limiting & caching
  - Error handling
  - Loading states
  - Environment configuration

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mira.git
cd mira
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up environment variables:

Create `.env` files in both frontend and backend directories:

Frontend `.env`:
```
REACT_APP_API_URL=http://localhost:8000
```

Backend `.env`:
```
GOOGLE_GEN_AI_KEY=your_gemini_api_key
NODE_ENV=development
```

4. Start the development servers:
```bash
npm run dev
```

The frontend will run on http://localhost:3001 and the backend on http://localhost:8000.

## 🛠️ Development

### Project Structure

```
mira/
├── frontend/          # React frontend
│   ├── public/        # Static files
│   └── src/          # Source files
├── backend/          # Node.js backend
│   └── server.js     # Express server
└── package.json      # Root package.json
```

### Available Scripts

- `npm run install:all` - Install all dependencies
- `npm run dev` - Start both frontend and backend in development mode
- `npm run start:frontend` - Start only the frontend
- `npm run start:backend` - Start only the backend
- `npm run build` - Build the frontend for production
- `npm run deploy` - Build and start in production mode

## 🎨 UI Features

- Glassmorphism effects on chat bubbles and input
- Dynamic purple gradient background
- Custom profile icons for user and AI
- Modern button designs with FontAwesome icons
- Responsive layout for all screen sizes

## 🔒 Security

- Rate limiting implemented
- API key validation
- CORS protection
- Error handling
- Input validation

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
# LammaAI
