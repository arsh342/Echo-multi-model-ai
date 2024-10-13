
# Mira - AI Chatbot

**Mira** is a conversational AI chatbot built using **React** for the frontend, **Node.js** for the backend, and the **Google Gemini API** for AI-powered interactions. This project provides a simple yet powerful chatbot interface for users to engage with.

## Features

- **Real-time Chat**: Users can interact with the AI in real time.
- **Google Gemini API Integration**: Uses advanced natural language processing capabilities from Google's Gemini API.
- **Customizable UI**: The front end is built with React, allowing for easy customization and styling.
- **Modular Backend**: Node.js backend that handles API requests and responses.
- **Responsive Design**: Works on both desktop and mobile.

## Installation

To get the project running locally, follow these steps:

### 1. Clone the repository:

\`\`\`bash
git clone https://github.com/yourusername/mira-ai-chatbot.git
cd mira-ai-chatbot
\`\`\`

### 2. Install dependencies for both frontend and backend:

Navigate to the `client` and `server` directories and install the necessary dependencies:

\`\`\`bash
# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
\`\`\`

### 3. Set up environment variables:

Create a `.env` file in the `server` directory and add the necessary environment variables for the Google Gemini API key and other configurations:

\`\`\`
GOOGLE_GEMINI_API_KEY=your-api-key
\`\`\`

### 4. Run the development servers:

To start both the React frontend and Node.js backend, you can use the following commands:

\`\`\`bash
# Start the backend server
cd server
npm start

# Start the frontend React app
cd ../client
npm start
\`\`\`

The backend will run on [http://localhost:5000](http://localhost:5000) and the frontend on [http://localhost:3000](http://localhost:3000).

## Deployment

Follow these steps to deploy your chatbot:

1. Build the frontend for production:

\`\`\`bash
cd client
npm run build
\`\`\`

2. Deploy both the frontend and backend on your preferred platform (e.g., Heroku, Vercel, AWS).

## Usage

Once the app is running, users can interact with **Mira** via a simple and intuitive chat interface. The backend communicates with Google's Gemini API to process user inputs and generate AI-driven responses.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
