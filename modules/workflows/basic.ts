import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
// Load environment variables
import "dotenv/config";
import { tools } from "modules/tools";
import { spinner, text } from "@clack/prompts";
import { getModel } from "modules/ai";
import { loadCredentials } from "setup";

export async function showWorkflow() {
  const credentials = await loadCredentials();

  // Define the tools for the agent to use
  const toolNode = new ToolNode(tools);

  // Create model based on configuration
  let model = getModel(credentials, tools);
  if (!model) {
    throw new Error("Failed to create model");
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
    const response = await model!.invoke(state.messages as any);

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
  const credentials = await loadCredentials();

  console.log(
    `🤖 Using ${credentials.modelUsed?.modelType?.toUpperCase()} ${
      credentials.modelUsed?.modelName
    } model`
  );

  // Define the tools for the agent to use
  const toolNode = new ToolNode(tools);

  // Create model based on configuration
  let model: any;

  if (credentials.modelUsed?.modelType === "openai") {
    model = new ChatOpenAI({
      model: credentials.modelUsed.modelName || "gpt-4",
      temperature: 0,
    }).bindTools(tools);
  } else if (credentials.modelUsed?.modelType === "gemini") {
    model = new ChatGoogleGenerativeAI({
      model: credentials.modelUsed.modelName || "gemini-2.5-flash",
      temperature: 0,
    }).bindTools(tools);
  } else {
    console.error(
      `Error: Unknown MODEL_TYPE '${credentials.modelUsed?.modelType}'`
    );
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

  // Initialize conversation state
  let conversationState: typeof MessagesAnnotation.State = {
    messages: [],
  };

  while (true) {
    const userInput = await text({
      message: "🗣️  You:",
      placeholder: "Type your message here...",
    });

    // Check if user cancelled or wants to quit
    if (typeof userInput === "symbol" || userInput.toLowerCase() === "/quit") {
      console.log("\n👋 Goodbye! Conversation ended.");
      break;
    }

    // Skip empty messages
    if (userInput.trim() === "") {
      continue;
    }
    // Show spinner while processing
    const s = spinner();
    try {
      s.start("🤔 Thinking...");

      // Add user message to conversation state
      conversationState.messages.push(new HumanMessage(userInput));

      // Process the user's message with conversation context
      const response = await app.invoke(conversationState);

      // Stop the spinner
      s.stop();

      // Update conversation state with the response
      conversationState = response;

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
      throw error;
    } finally {
      s.stop();
    }
  }
}
