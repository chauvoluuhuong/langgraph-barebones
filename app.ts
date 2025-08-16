// agent.mts

// Load environment variables
import "dotenv/config";

import { intro, outro, select, text, note, spinner } from "@clack/prompts";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { tools } from "./tools";

async function setup() {
  intro("🤖 LangGraph Model Setup");

  // Select model type
  const modelType = await select({
    message: "Which AI model provider would you like to use?",
    options: [
      { value: "openai", label: "OpenAI (GPT models)" },
      { value: "gemini", label: "Google Gemini" },
    ],
  });

  if (!modelType) {
    outro("No model provider selected. Setup cancelled.");
    return false;
  }

  // Get specific model name from user
  let specificModel = "";
  if (modelType === "openai") {
    note("Common OpenAI models: gpt-4, gpt-4-turbo, gpt-3.5-turbo, gpt-4o");
    const openaiModel = await text({
      message: "Enter the OpenAI model name you want to use:",
      placeholder: "gpt-4",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "Model name cannot be empty";
        }
        if (value.trim().length < 3) {
          return "Model name must be at least 3 characters long";
        }
        return undefined; // Valid input
      },
    });

    if (!openaiModel || typeof openaiModel !== "string") {
      outro("No valid OpenAI model name provided. Setup cancelled.");
      return false;
    }
    specificModel = openaiModel;
  } else if (modelType === "gemini") {
    note(
      "Common Gemini models: gemini-pro, gemini-pro-vision, gemini-1.5-pro, gemini-1.5-flash"
    );
    const geminiModel = await text({
      message: "Enter the Gemini model name you want to use:",
      placeholder: "gemini-pro",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "Model name cannot be empty";
        }
        if (value.trim().length < 3) {
          return "Model name must be at least 3 characters long";
        }
        return undefined; // Valid input
      },
    });

    if (!geminiModel || typeof geminiModel !== "string") {
      outro("No valid Gemini model name provided. Setup cancelled.");
      return false;
    }
    specificModel = geminiModel;
  }

  if (!specificModel || typeof specificModel !== "string") {
    outro("No valid model name provided. Setup cancelled.");
    return false;
  }

  // Trim whitespace from model name
  specificModel = specificModel.trim();

  let apiKey = "";
  let envContent = "";

  if (modelType === "openai") {
    note(
      "You'll need an OpenAI API key from https://platform.openai.com/api-keys"
    );

    const openaiKey = await text({
      message: "Enter your OpenAI API key:",
      placeholder: "sk-...",
      validate: (value) => {
        if (!value || value.length < 10) {
          return "API key must be at least 10 characters long";
        }
        if (!value.startsWith("sk-")) {
          return "OpenAI API key should start with 'sk-'";
        }
        return undefined; // Valid input
      },
    });

    if (!openaiKey || typeof openaiKey !== "string") {
      outro("No API key provided. Setup cancelled.");
      return false;
    }

    apiKey = openaiKey;
    envContent = `OPENAI_API_KEY=${apiKey}\nMODEL_TYPE=openai\nMODEL_NAME=${specificModel}\n`;
  } else if (modelType === "gemini") {
    note(
      "You'll need a Google AI API key from https://makersuite.google.com/app/apikey"
    );

    const geminiKey = await text({
      message: "Enter your Google AI API key:",
      placeholder: "AIza...",
      validate: (value) => {
        if (!value || value.length < 10) {
          return "API key must be at least 10 characters long";
        }
        if (!value.startsWith("AIza")) {
          return "Google AI API key should start with 'AIza'";
        }
        return undefined; // Valid input
      },
    });

    if (!geminiKey || typeof geminiKey !== "string") {
      outro("No API key provided. Setup cancelled.");
      return false;
    }

    apiKey = geminiKey;
    envContent = `GOOGLE_API_KEY=${apiKey}\nMODEL_TYPE=gemini\nMODEL_NAME=${specificModel}\n`;
  }

  // Write to appropriate .env file
  const s = spinner();
  s.start("Saving configuration...");

  try {
    const envFileName = modelType === "openai" ? ".env.openai" : ".env.gemini";
    const envPath = join(process.cwd(), envFileName);
    writeFileSync(envPath, envContent);
    s.stop("✅ Configuration saved successfully!");

    note(
      `Your ${envFileName} file has been created with ${String(
        modelType
      ).toUpperCase()} credentials.`
    );
    note("You can now run your LangGraph application!");
    return true;
  } catch (error) {
    s.stop("❌ Failed to save configuration");
    console.error("Error:", error);
    return false;
  }
}

async function loadCredentials() {
  // Check for credential files
  const openaiEnvPath = join(process.cwd(), ".env.openai");
  const geminiEnvPath = join(process.cwd(), ".env.gemini");

  let modelType = "";
  let modelName = "";
  let apiKey = "";

  if (existsSync(openaiEnvPath)) {
    const openaiEnv = readFileSync(openaiEnvPath, "utf8");
    const lines = openaiEnv.split("\n");
    for (const line of lines) {
      if (line.startsWith("OPENAI_API_KEY=")) {
        apiKey = line.split("=")[1];
      } else if (line.startsWith("MODEL_TYPE=")) {
        modelType = line.split("=")[1];
      } else if (line.startsWith("MODEL_NAME=")) {
        modelName = line.split("=")[1];
      }
    }

    if (apiKey && modelType && modelName) {
      return { modelType, modelName, apiKey, provider: "openai" };
    }
  }

  if (existsSync(geminiEnvPath)) {
    const geminiEnv = readFileSync(geminiEnvPath, "utf8");
    const lines = geminiEnv.split("\n");
    for (const line of lines) {
      if (line.startsWith("GOOGLE_API_KEY=")) {
        apiKey = line.split("=")[1];
      } else if (line.startsWith("MODEL_TYPE=")) {
        modelType = line.split("=")[1];
      } else if (line.startsWith("MODEL_NAME=")) {
        modelName = line.split("=")[1];
      }
    }

    if (apiKey && modelType && modelName) {
      return { modelType, modelName, apiKey, provider: "gemini" };
    }
  }

  return null;
}

async function runApplication() {
  const credentials = await loadCredentials();

  if (!credentials) {
    console.error("❌ No valid credentials found!");
    console.error(
      "Please run setup first to configure your model and credentials."
    );
    return;
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
}

async function main() {
  intro("🤖 LangGraph Application");

  const choice = await select({
    message: "What would you like to do?",
    options: [
      { value: "setup", label: "Setup/Configure Model & Credentials" },
      { value: "run", label: "Run LangGraph Application" },
    ],
  });

  if (choice === "setup") {
    const success = await setup();
    if (success) {
      outro("Setup complete! 🎉");
    } else {
      outro("Setup failed or was cancelled. ❌");
    }
  } else if (choice === "run") {
    await runApplication();
  } else {
    outro("No option selected. Exiting.");
  }
}

main().catch((error) => {
  console.error("Application failed:", error);
  process.exit(1);
});
