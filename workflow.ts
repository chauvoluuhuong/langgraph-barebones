import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

import { tools } from "./tools";

export async function showWorkflow() {
  // Import loadCredentials dynamically to avoid circular dependency
  const { loadCredentials } = await import("./setup");
  const credentials = await loadCredentials();

  if (!credentials) {
    console.error("❌ No valid credentials found!");
    console.error(
      "Please run setup first to configure your model and credentials."
    );
    return;
  }

  // Set the appropriate environment variable for the model
  if (credentials.provider === "openai") {
    process.env.OPENAI_API_KEY = credentials.apiKey;
  } else if (credentials.provider === "gemini") {
    process.env.GOOGLE_API_KEY = credentials.apiKey;
  }

  console.log(
    `🤖 Using ${credentials.provider.toUpperCase()} ${
      credentials.modelName
    } model`
  );

  // Define the tools for the agent to use
  const toolNode = new ToolNode(tools);

  // Create model based on configuration
  let model: any;

  if (credentials.modelType === "openai") {
    model = new ChatOpenAI({
      model: credentials.modelName,
      temperature: 0,
    }).bindTools(tools);
  } else if (credentials.modelType === "gemini") {
    model = new ChatGoogleGenerativeAI({
      model: credentials.modelName,
      temperature: 0,
    }).bindTools(tools);
  } else {
    console.error(`Error: Unknown MODEL_TYPE '${credentials.modelType}'`);
    return;
  }

  // Define the function that determines whether to continue or not
  function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
    const lastMessage = messages[messages.length - 1] as AIMessage;

    // If the LLM makes a tool call, then we route to the "tools" node
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    // Otherwise, we stop (reply to the user) using the special "__end__" node
    return "__end__";
  }

  // Define the function that calls the model
  async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages as any);

    // We return a list, because this will get added to the existing list
    return { messages: [response] };
  }

  // Define a new graph
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
    .addNode("tools", toolNode)
    .addEdge("tools", "agent")
    .addConditionalEdges("agent", shouldContinue);

  // Finally, we compile it into a LangChain Runnable.
  const app = workflow.compile();

  // Show the workflow diagram
  const graph = await app.getGraphAsync();
  console.log("\n📊 LangGraph Workflow Diagram:");
  console.log(graph.drawMermaid());
}

export async function runApplication() {
  // Import loadCredentials dynamically to avoid circular dependency
  const { loadCredentials } = await import("./setup");
  const credentials = await loadCredentials();

  if (!credentials) {
    console.error("❌ No valid credentials found!");
    console.error(
      "Please run setup first to configure your model and credentials."
    );
    return;
  }

  // Set the appropriate environment variable for the model
  if (credentials.provider === "openai") {
    process.env.OPENAI_API_KEY = credentials.apiKey;
  } else if (credentials.provider === "gemini") {
    process.env.GOOGLE_API_KEY = credentials.apiKey;
  }

  console.log(
    `🤖 Using ${credentials.provider.toUpperCase()} ${
      credentials.modelName
    } model`
  );

  // Define the tools for the agent to use
  const toolNode = new ToolNode(tools);

  // Create model based on configuration
  let model: any;

  if (credentials.modelType === "openai") {
    model = new ChatOpenAI({
      model: credentials.modelName,
      temperature: 0,
    }).bindTools(tools);
  } else if (credentials.modelType === "gemini") {
    model = new ChatGoogleGenerativeAI({
      model: credentials.modelName,
      temperature: 0,
    }).bindTools(tools);
  } else {
    console.error(`Error: Unknown MODEL_TYPE '${credentials.modelType}'`);
    return;
  }

  // Define the function that determines whether to continue or not
  function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
    const lastMessage = messages[messages.length - 1] as AIMessage;

    // If the LLM makes a tool call, then we route to the "tools" node
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    // Otherwise, we stop (reply to the user) using the special "__end__" node
    return "__end__";
  }

  // Define the function that calls the model
  async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages as any);

    // We return a list, because this will get added to the existing list
    return { messages: [response] };
  }

  // Define a new graph
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
    .addNode("tools", toolNode)
    .addEdge("tools", "agent")
    .addConditionalEdges("agent", shouldContinue);

  // Finally, we compile it into a LangChain Runnable.
  const app = workflow.compile();

  console.log("\n🤖 Interactive AI Assistant with Memory");
  console.log(
    "Type your messages below. Type 'quit' or 'exit' to end the conversation.\n"
  );

  // Interactive conversation loop with manual memory management
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (question: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  };

  // Maintain conversation history manually
  let conversationHistory: any[] = [];

  try {
    while (true) {
      const userInput = await askQuestion("🗣️  You: ");

      // Check if user wants to quit
      if (
        userInput.toLowerCase() === "quit" ||
        userInput.toLowerCase() === "exit"
      ) {
        console.log("\n👋 Goodbye! Conversation ended.");
        break;
      }

      // Skip empty messages
      if (userInput.trim() === "") {
        continue;
      }

      try {
        // Create messages array with conversation history plus new user message
        const messagesToSend = [
          ...conversationHistory,
          new HumanMessage(userInput),
        ];

        // Process the user's message with conversation context
        const response = await app.invoke({
          messages: messagesToSend,
        });

        // Get the new messages that were added
        const newMessages = response.messages.slice(messagesToSend.length);

        // Add the user message and new assistant messages to conversation history
        conversationHistory.push(new HumanMessage(userInput));
        conversationHistory.push(...newMessages);

        // Display the last assistant message
        const lastAssistantMessage = newMessages[newMessages.length - 1];
        console.log("🤖 Assistant:", lastAssistantMessage.content);
        console.log(); // Empty line for better readability
      } catch (error) {
        console.error("❌ Error processing message:", error);
        console.log("Please try again.\n");
      }
    }
  } finally {
    rl.close();
  }
}
