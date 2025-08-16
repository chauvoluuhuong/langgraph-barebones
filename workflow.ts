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
}
