// agent.mts

// Load environment variables
import "dotenv/config";

// Check if model type is set
if (!process.env.MODEL_TYPE) {
  console.error("Error: MODEL_TYPE environment variable is not set");
  console.error("Please run 'npm run setup' to configure your model");
  process.exit(1);
}

import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { tools } from "./tools";

// Define the tools for the agent to use
const toolNode = new ToolNode(tools);

// Create model based on configuration
let model: any;

if (process.env.MODEL_TYPE === "openai") {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set");
    console.error(
      "Please run 'npm run setup' to configure your OpenAI API key"
    );
    process.exit(1);
  }

  const modelName = process.env.MODEL_NAME || "gpt-4";
  model = new ChatOpenAI({
    model: modelName,
    temperature: 0,
  }).bindTools(tools);

  console.log(`🤖 Using OpenAI ${modelName} model`);
} else if (process.env.MODEL_TYPE === "gemini") {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY environment variable is not set");
    console.error(
      "Please run 'npm run setup' to configure your Google AI API key"
    );
    process.exit(1);
  }

  const modelName = process.env.MODEL_NAME || "gemini-pro";
  model = new ChatGoogleGenerativeAI({
    model: modelName,
    temperature: 0,
  }).bindTools(tools);

  console.log(`🤖 Using Google ${modelName} model`);
} else {
  console.error(`Error: Unknown MODEL_TYPE '${process.env.MODEL_TYPE}'`);
  console.error("Supported types: 'openai' or 'gemini'");
  process.exit(1);
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

app.getGraphAsync().then((graph) => console.log(graph.drawMermaid()));

// Use the agent
const finalState = await app.invoke({
  messages: [new HumanMessage("what is the weather in sf")],
});
console.log(finalState.messages[finalState.messages.length - 1].content);

const nextState = await app.invoke({
  // Including the messages from the previous run gives the LLM context.
  // This way it knows we're asking about the weather in NY
  messages: [...finalState.messages, new HumanMessage("what about ny")],
});
console.log(nextState.messages[nextState.messages.length - 1].content);
