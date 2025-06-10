# Echo 🌟

A modern AI chat interface powered by Google's Gemini API, featuring authentication, real-time chat, and multiple AI model support. Built with React, Node.js, and Material-UI, Echo offers a secure and elegant chat experience with smart context handling and real-time responses.

## ✨ Key Features

- **Modern UI/UX**
  - Material-UI based interface with dark theme
  - Responsive design for all devices
  - Markdown support with syntax highlighting
  - Real-time chat interface with loading states

- **Authentication & Security**
  - Auth0 integration for secure authentication
  - JWT-based API security
  - Rate limiting with Redis
  - CORS protection
  - Input validation

- **AI Integration**
  - Google Gemini API support
  - Multiple AI model support (OpenAI, Anthropic)
  - Smart context handling
  - Message history persistence with MongoDB

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB database
- Redis server
- Auth0 account
- Google Gemini API key
- (Optional) OpenAI API key
- (Optional) Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/echo.git
cd echo
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up environment variables:

Frontend `.env`:
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_AUTH0_DOMAIN=your_auth0_domain
REACT_APP_AUTH0_CLIENT_ID=your_auth0_client_id
REACT_APP_AUTH0_AUDIENCE=your_auth0_audience
```

Backend `.env`:
```
GOOGLE_GEN_AI_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
MONGODB_URI=your_mongodb_uri
REDIS_URL=your_redis_url
AUTH0_ISSUER_BASE_URL=your_auth0_domain
AUTH0_AUDIENCE=your_auth0_audience
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
echo/
├── frontend/          # React frontend
│   ├── public/        # Static files
│   └── src/          # Source files
│       ├── components/  # React components
│       ├── contexts/    # React contexts
│       └── services/    # API services
├── backend/          # Node.js backend
│   ├── server.js     # Express server
│   └── db.js         # Database configuration
└── package.json      # Root package.json
```

### Available Scripts

- `npm run install:all` - Install all dependencies
- `npm run dev` - Start both frontend and backend in development mode
- `npm run start:frontend` - Start only the frontend
- `npm run start:backend` - Start only the backend
- `npm run build` - Build the frontend for production
- `npm run deploy` - Build and start in production mode
- `npm run clean` - Remove all node_modules directories
- `npm run vercel-build` - Build for Vercel deployment

## 🔧 Dependencies

### Frontend
- React 18
- Material-UI
- Auth0 React SDK
- React Markdown
- React Syntax Highlighter
- UUID

### Backend
- Express
- Google Generative AI SDK
- OpenAI SDK
- Anthropic SDK
- MongoDB with Mongoose
- Redis
- Auth0 JWT Bearer
- Rate Limiter Flexible

## 🚀 Deployment

The project is configured for deployment on Vercel. The `vercel-build` script handles the build process automatically. Make sure to set up the following environment variables in your Vercel project:

- `GOOGLE_GEN_AI_KEY` - Your Google Gemini API key
- `MONGODB_URI` - Your MongoDB connection string
- `REDIS_URL` - Your Redis connection URL
- `AUTH0_ISSUER_BASE_URL` - Your Auth0 domain
- `AUTH0_AUDIENCE` - Your Auth0 API audience
- `NODE_ENV` - Set to "production"

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
