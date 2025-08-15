# LangGraph TypeScript Project

A simple LangGraph application built with TypeScript that demonstrates tool usage with an AI agent.

## Features

- **Weather Tool**: Get simulated weather information for different cities
- **Calculator Tool**: Perform basic mathematical calculations
- **Time Tool**: Get current time for different timezones
- **Search Tool**: Simulate web search results

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:

   ```bash
   OPENAI_API_KEY=your-openai-api-key-here
   NODE_ENV=development
   ```

3. **Get your OpenAI API key**:
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Add it to your `.env` file

## Usage

### Development mode (with hot reload):

```bash
npm run dev
```

### Build and run:

```bash
npm run build
npm start
```

## Testing the Tools

The application comes with several test tools:

- **Weather**: Ask "what is the weather in san francisco"
- **Calculator**: Ask "calculate 15 \* 3 + 7"
- **Time**: Ask "what time is it in tokyo"
- **Search**: Ask "search for langchain"

## Project Structure

```
langgrapjs/
├── app.ts          # Main application with LangGraph workflow
├── tools.ts        # Tool definitions
├── package.json    # Dependencies and scripts
├── tsconfig.json   # TypeScript configuration
├── .gitignore      # Git ignore rules
└── README.md       # This file
```

## Available Scripts

- `npm run dev` - Run in development mode with tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application
- `npm run clean` - Remove the dist directory

## Example Usage

The application will automatically test the tools with these queries:

1. "what is the weather in sf"
2. "what about ny"

You can modify the queries in `app.ts` to test different scenarios.
