import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph-checkpoint";

import { tools } from "./tools";
import { spinner } from "@clack/prompts";

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
  console.log("Type your messages below. Type '/quit' to exit.\n");

  // Interactive conversation loop with conversation state management
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

  // Generate a unique thread ID for this conversation session
  const threadId = `conversation_${Date.now()}`;

  // Initialize conversation state
  let conversationState: typeof MessagesAnnotation.State = {
    messages: [],
  };

  try {
    while (true) {
      const userInput = await askQuestion("🗣️  You: ");

      // Check if user wants to quit
      if (userInput.toLowerCase() === "/quit") {
        console.log("\n👋 Goodbye! Conversation ended.");
        break;
      }

      // Skip empty messages
      if (userInput.trim() === "") {
        continue;
      }

      try {
        // Show spinner while processing
        const s = spinner();
        s.start("🤔 Thinking...");

        // Add user message to conversation state
        conversationState.messages.push(new HumanMessage(userInput));

        // Process the user's message with conversation context
        const response = await app.invoke(conversationState);

        // Stop the spinner
        s.stop("✅ Response ready");

        // Display the last assistant message
        const lastAssistantMessage =
          response.messages[response.messages.length - 1];
        console.log("🤖 Assistant:", lastAssistantMessage.content);

        // Check if any tools were used and display them
        const toolMessages = response.messages.filter(
          (msg) =>
            (msg as AIMessage).tool_calls &&
            (msg as AIMessage).tool_calls!.length > 0
        );

        if (toolMessages.length > 0) {
          console.log("\n🔧 Tools used:");
          toolMessages.forEach((msg) => {
            const aiMessage = msg as AIMessage;
            aiMessage.tool_calls?.forEach((toolCall: any) => {
              console.log(
                `  • ${toolCall.name}: ${toolCall.args ? JSON.stringify(toolCall.args) : "No args"}`
              );
            });
          });
        }

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
