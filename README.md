# Echo 🌟

A modern AI chat interface powered by multiple AI models (Google Gemini, OpenAI, Anthropic), featuring real-time chat and smart context handling. Built with React, Node.js, and Material-UI, Echo offers a secure and elegant chat experience with **rich Markdown rendering**.

## ✨ Key Features

- **Modern UI/UX**
  - Material-UI based interface with dark theme
  - Responsive design for all devices
  - **Rich Markdown support with syntax highlighting**
  - **Code block copy functionality**
  - **Message copy and share buttons**
  - **Conversation copy and share features**
  - Real-time chat interface with loading states
  - **Beautiful typography and formatting**

- **Enhanced Chat Experience**
  - **Full Markdown rendering** (headers, lists, tables, links, etc.)
  - **Syntax highlighting** for code blocks in 100+ languages
  - **One-click code copying** with visual feedback
  - **Message copy and share** on every chat bubble
  - **Conversation export** with copy and share options
  - **Responsive markdown layout** for mobile and desktop
  - **GitHub Flavored Markdown (GFM)** support

- **Copy & Share Features**
  - **Individual message copying** - Copy any user question or AI response
  - **Message sharing** - Share individual messages via native share API or social platforms
  - **Code block copying** - One-click copy for all code snippets with syntax highlighting
  - **Conversation copying** - Copy entire conversation context from settings
  - **Conversation sharing** - Share full conversations on social media
  - **Conversation title copying** - Quick copy conversation titles from sidebar
  - **Visual feedback** - Clear indicators when content is copied
  - **Social media integration** - Share to Twitter, LinkedIn, WhatsApp, and more

- **Simple & Secure**
  - No authentication required - works immediately
  - Local user ID persistence for data continuity
  - Input validation and sanitization
  - CORS protection

- **AI Integration**
  - Google Gemini 2.5 Flash support (default)
  - OpenAI GPT-4.1 integration
  - Anthropic Claude Sonnet 4 integration
  - Smart context handling
  - Message history persistence with MongoDB
  - **AI models instructed to respond with proper Markdown formatting**
  - **OpenRouter API gateway** - Unified access to all AI models!

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB database (local or cloud)
- OpenRouter API key

**Note:** API keys for Gemini, OpenAI, and Anthropic are pre-configured in the application.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/echo.git
cd echo
```

2. Install all dependencies:
```bash
npm run setup
```

3. Set up environment variables:

Create `.env` files in both frontend and backend directories:

**Frontend `.env**:**
```env
REACT_APP_API_URL=http://localhost:8000
```

**Backend `.env**:**
```env
MONGODB_URI=your_mongodb_uri
OPENROUTER_API_KEY=your_openrouter_api_key
NODE_ENV=development
```

**Note:** API keys for Gemini, OpenAI, and Anthropic are pre-configured and don't need to be set.

4. Start the development servers:
```bash
npm run dev
```

The frontend will run on http://localhost:3001 and the backend on http://localhost:8000.

## 🎨 Markdown Features

Echo now supports rich Markdown rendering for AI responses:

### Supported Markdown Elements
- **Headers** (# ## ###)
- **Bold and italic text** (**bold**, *italic*)
- **Code blocks** with syntax highlighting (```javascript, ```python, etc.)
- **Inline code** (`code`)
- **Lists** (bullet points and numbered lists)
- **Links** with proper styling
- **Tables** with responsive design
- **Blockquotes** with elegant styling
- **Horizontal rules**

### Code Block Features
- **Syntax highlighting** for 100+ programming languages
- **Copy button** for easy code copying
- **Visual feedback** when code is copied
- **Responsive design** for mobile devices
- **Dark theme** optimized for code readability

### Copy & Share Features
- **Message Actions**: Every chat message (user questions and AI responses) has copy and share buttons
- **Code Block Copying**: All code blocks have dedicated copy buttons with syntax highlighting
- **Conversation Export**: Copy or share entire conversations from the settings panel
- **Social Media Sharing**: Share content to Twitter, LinkedIn, WhatsApp, and other platforms
- **Native Share API**: Uses device's native share functionality when available
- **Visual Feedback**: Clear indicators (checkmarks) when content is successfully copied
- **Mobile Optimized**: Message actions are more visible on mobile devices for better accessibility

### AI Model Instructions
All AI models are instructed to respond with proper Markdown formatting, ensuring:
- Code blocks include language specification for syntax highlighting
- Proper use of headers, lists, and formatting
- Consistent markdown structure
- Enhanced readability and user experience

## 🛠️ Development

### Project Structure

```
echo/
├── frontend/          # React frontend
│   ├── public/        # Static files
│   └── src/          # Source files
│       ├── components/  # React components
│       ├── hooks/       # Custom hooks
│       └── theme.js     # Material-UI theme
├── backend/          # Node.js backend
│   ├── server.js     # Express server
│   └── db.js         # Database configuration
└── package.json      # Root package.json with scripts
```

### Available Scripts

- `npm run setup` - Install all dependencies
- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the frontend
- `npm run dev:backend` - Start only the backend
- `npm run build` - Build the frontend for production
- `npm run clean` - Remove all node_modules directories

### Environment Variables

#### Required Backend Variables:
- `OPENROUTER_API_KEY` - Your OpenRouter API key (provides access to all AI models)
- `MONGODB_URI` - Your MongoDB connection string

#### Optional Backend Variables:
- `USE_REDIS` - Set to 'true' to enable Redis rate limiting
- `REDIS_URL` - Redis connection URL (if using rate limiting)

**Note:** OpenRouter provides unified access to GPT-4.1, Claude Sonnet 4, and Gemini 2.5 Flash models.

#### Required Frontend Variables:
- `REACT_APP_API_URL` - Backend API URL

## 🔧 Dependencies

### Frontend
- React 18
- Material-UI
- **React Markdown** - Rich markdown rendering
- **React Syntax Highlighter** - Code syntax highlighting
- **Remark GFM** - GitHub Flavored Markdown support
- UUID

### Backend
- Express
- OpenAI SDK (for OpenRouter integration)
- MongoDB with Mongoose
- (Optional) Redis for rate limiting

## 🚀 Deployment

### Production Build

1. Build the frontend:
```bash
npm run build
```

2. Set `NODE_ENV=production` in your backend environment

3. Start the backend server:
```bash
npm run start:backend
```

The backend will serve the built frontend files automatically in production mode.

### Environment Setup for Production

Make sure to set up the following environment variables in your production environment:

- All required backend variables
- `NODE_ENV=production`
- `PORT=8000` (or your preferred port)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
