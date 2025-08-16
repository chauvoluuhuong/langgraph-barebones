# LangGraph Barebones with Model Selection

A TypeScript LangGraph application that supports both OpenAI and Google Gemini models with an interactive setup process.

## Features

- 🤖 **Model Selection**: Choose between OpenAI GPT-4 and Google Gemini Pro
- 🔐 **Secure Credential Management**: Store API keys in `.env` files
- 🎨 **Beautiful CLI Interface**: Powered by [Clack](https://www.clack.cc/) for an intuitive setup experience
- 🛠️ **Tool Integration**: Built-in tools for enhanced AI capabilities
- 📝 **TypeScript Support**: Full type safety and modern development experience

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key (for GPT models) or Google AI API key (for Gemini)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Setup

```bash
npm run setup
```

This interactive setup will:

- Let you choose between OpenAI and Gemini model providers
- Allow you to input any specific model name you want to use
- Prompt for your API credentials
- Create a `.env` file with your configuration
- Validate your API keys

### 3. Run the Application

```bash
# Development mode
npm run dev

# Or build and run
npm run build
npm start
```

## Configuration

The setup process creates a `.env` file with:

```env
# For OpenAI
OPENAI_API_KEY=sk-your-key-here
MODEL_TYPE=openai

# OR for Gemini
GOOGLE_API_KEY=AIza-your-key-here
MODEL_TYPE=gemini
```

## API Key Sources

- **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Google AI**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Project Structure

```
langgraph-barebones/
├── app.ts          # Main LangGraph application
├── setup.ts        # Interactive setup script using Clack
├── tools.ts        # AI tools and functions
├── package.json    # Dependencies and scripts
└── .env           # Environment variables (created by setup)
```

## Scripts

- `npm run setup` - Interactive model and credential setup
- `npm run dev` - Run in development mode with tsx
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run built application
- `npm run clean` - Clean build artifacts

## Technologies Used

- [LangGraph](https://langchain-ai.github.io/langgraph/) - AI workflow orchestration
- [Clack](https://www.clack.cc/) - Beautiful CLI components
- [LangChain](https://langchain.com/) - AI application framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

## Security Notes

- API keys are stored in `.env` files (automatically ignored by git)
- Never commit your `.env` file to version control
- The setup script validates API key formats before saving

## Troubleshooting

### "MODEL_TYPE environment variable is not set"

Run `npm run setup` to configure your model and credentials.

### "API key environment variable is not set"

Ensure you've completed the setup process and your `.env` file exists.

### Invalid API key format

The setup script validates API key formats. Make sure you're using the correct key type for your selected model.
