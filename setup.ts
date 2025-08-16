import { intro, outro, select, text, note, spinner } from "@clack/prompts";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { merge } from "lodash";

export enum ModelType {
  OPENAI = "openai",
  GEMINI = "gemini",
}

export interface ModelInfo {
  modelType?: ModelType;
  modelName?: string;
  apiKey?: string;
}

export interface Config {
  modelUsed: ModelInfo;
  [ModelType.OPENAI]: ModelInfo;
  [ModelType.GEMINI]: ModelInfo;
}

const CONFIG_DEFAULT: Config = {
  modelUsed: {
    modelType: ModelType.OPENAI,
    modelName: "gpt-4",
    apiKey: "",
  },
  [ModelType.GEMINI]: {
    modelType: ModelType.GEMINI,
    modelName: "gemini-2.5-flash",
    apiKey: "",
  },
  [ModelType.OPENAI]: {
    modelType: ModelType.OPENAI,
    modelName: "gpt-4",
    apiKey: "",
  },
};

export async function setup() {
  intro("🤖 LangGraph Model Setup");

  // Load existing configuration first
  const config = await loadCredentials();

  // Select model type
  const modelType = await select({
    message: "Which AI model provider would you like to use?",
    options: [
      { value: ModelType.OPENAI, label: "OpenAI (GPT models)" },
      { value: ModelType.GEMINI, label: "Google Gemini" },
    ],
    initialValue: config?.modelUsed?.modelType,
  });

  if (!modelType) {
    outro("No model provider selected. Setup cancelled.");
    return false;
  }
  config.modelUsed.modelType = modelType as ModelType;

  // Get specific model name from user
  let specificModel = "";
  if (modelType === ModelType.OPENAI) {
    note("Common OpenAI models: gpt-4, gpt-4-turbo, gpt-3.5-turbo, gpt-4o");
    const openaiModel = await text({
      message: "Enter the OpenAI model name you want to use:",
      placeholder: "gpt-4",
      initialValue: config[ModelType.OPENAI]?.modelName,
      validate: (value) => {
        value = value || config[ModelType.OPENAI]?.modelName || "";
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
    config[ModelType.OPENAI].modelName = openaiModel;
  } else if (modelType === "gemini") {
    note(
      "Common Gemini models: gemini-2.5-pro, gemini-2.5-flash, gemini-1.5-pro, gemini-1.5-flash"
    );
    const geminiModel = await text({
      message: "Enter the Gemini model name you want to use:",
      placeholder: "gemini-2.5-flash",
      initialValue: config[ModelType.GEMINI]?.modelName,
      validate: (value) => {
        value = value || config[ModelType.GEMINI]?.modelName || "";
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
    config[ModelType.GEMINI].modelName = geminiModel;
  }

  if (!specificModel || typeof specificModel !== "string") {
    outro("No valid model name provided. Setup cancelled.");
    return false;
  }

  if (modelType === "openai") {
    note(
      "You'll need an OpenAI API key from https://platform.openai.com/api-keys"
    );

    const openaiKey = await text({
      message: "Enter your OpenAI API key:",
      placeholder: "sk-...",
      initialValue: config[ModelType.OPENAI]?.apiKey,
      validate: (value) => {
        value = value || config[ModelType.OPENAI]?.apiKey || "";
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

    config[ModelType.OPENAI].apiKey = openaiKey;
  } else if (modelType === "gemini") {
    note(
      "You'll need a Google AI API key from https://makersuite.google.com/app/apikey"
    );

    const geminiKey = await text({
      message: "Enter your Google AI API key:",
      placeholder: "AIza...",
      initialValue: config[ModelType.GEMINI]?.apiKey,
      validate: (value) => {
        value = value || config[ModelType.GEMINI]?.apiKey || "";
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

    config[ModelType.GEMINI].apiKey = geminiKey;
  }

  if (config.modelUsed.modelType === ModelType.OPENAI) {
    config.modelUsed = config[ModelType.OPENAI];
  } else if (config.modelUsed.modelType === ModelType.GEMINI) {
    config.modelUsed = config[ModelType.GEMINI];
  }

  // Write API key to .env file
  const s = spinner();
  s.start("Saving configuration...");

  try {
    writeFileSync(
      join(__dirname, "config.json"),
      JSON.stringify(config, null, 2)
    );

    writeFileSync(
      join(__dirname, ".env"),
      `OPENAI_API_KEY=${config[ModelType.OPENAI].apiKey}\nGOOGLE_API_KEY=${config[ModelType.GEMINI].apiKey}`
    );
    note("Saved configuration to config.json");
    note("You can now run your LangGraph application!");
    return true;
  } catch (error) {
    s.stop("❌ Failed to save configuration");
    console.error("Error:", error);
    return false;
  }
}

export async function loadCredentials(): Promise<Config> {
  // Check for config.json file
  const configPath = join(process.cwd(), "config.json");
  const envPath = join(process.cwd(), ".env");

  if (!existsSync(configPath)) {
    console.error("❌ config.json not found!");
    console.error("Please run setup first to configure your model.");
    return CONFIG_DEFAULT;
  }

  if (!existsSync(envPath)) {
    console.error("❌ .env file not found!");
    console.error("Please run setup first to configure your API keys.");
    return CONFIG_DEFAULT;
  }

  try {
    // Read config.json
    const configContent = readFileSync(configPath, "utf8");

    const config: Config = merge(CONFIG_DEFAULT, JSON.parse(configContent));

    if (!config.modelUsed) {
      console.error("❌ Invalid config.json format!");
      console.error("Please run setup again to reconfigure.");
      return CONFIG_DEFAULT;
    }

    config[ModelType.GEMINI]!.apiKey = process.env.GOOGLE_API_KEY || "";
    config[ModelType.OPENAI]!.apiKey = process.env.OPENAI_API_KEY || "";

    return config;
  } catch (error) {
    console.error("❌ Error reading configuration files:", error);
    return CONFIG_DEFAULT;
  }
}
