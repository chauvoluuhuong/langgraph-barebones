import { intro, outro, select, text, note, spinner } from "@clack/prompts";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";

export async function setup() {
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
      "Common Gemini models: gemini-2.5-pro, gemini-2.5-flash, gemini-1.5-pro, gemini-1.5-flash"
    );
    const geminiModel = await text({
      message: "Enter the Gemini model name you want to use:",
      placeholder: "gemini-2.5-flash",
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
  }

  // Write API key to .env file
  const s = spinner();
  s.start("Saving configuration...");

  try {
    // Read existing .env file or create new one
    const envPath = join(process.cwd(), ".env");
    let envContent = "";

    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, "utf8");
    }

    // Add or update the API key
    const apiKeyEnvVar =
      modelType === "openai" ? "OPENAI_API_KEY" : "GOOGLE_API_KEY";

    // Remove existing API key line if it exists
    const lines = envContent
      .split("\n")
      .filter((line) => !line.startsWith(`${apiKeyEnvVar}=`));
    lines.push(`${apiKeyEnvVar}=${apiKey}`);

    envContent = lines.join("\n");

    writeFileSync(envPath, envContent);

    // Save non-credential data to config.json
    const configPath = join(process.cwd(), "config.json");
    const configData = {
      modelType: modelType,
      modelName: specificModel,
      provider: modelType,
    };

    writeFileSync(configPath, JSON.stringify(configData, null, 2));

    s.stop("✅ Configuration saved successfully!");

    note(`API key saved to .env file as ${apiKeyEnvVar}`);
    note("Model configuration saved to config.json");
    note("You can now run your LangGraph application!");
    return true;
  } catch (error) {
    s.stop("❌ Failed to save configuration");
    console.error("Error:", error);
    return false;
  }
}

export async function loadCredentials() {
  // Check for config.json file
  const configPath = join(process.cwd(), "config.json");
  const envPath = join(process.cwd(), ".env");

  if (!existsSync(configPath)) {
    console.error("❌ config.json not found!");
    console.error("Please run setup first to configure your model.");
    return null;
  }

  if (!existsSync(envPath)) {
    console.error("❌ .env file not found!");
    console.error("Please run setup first to configure your API keys.");
    return null;
  }

  try {
    // Read config.json
    const configContent = readFileSync(configPath, "utf8");
    const config = JSON.parse(configContent);

    const { modelType, modelName, provider } = config;

    if (!modelType || !modelName || !provider) {
      console.error("❌ Invalid config.json format!");
      console.error("Please run setup again to reconfigure.");
      return null;
    }

    // Read .env file
    const envContent = readFileSync(envPath, "utf8");
    const envLines = envContent.split("\n");

    let apiKey = "";

    // Look for the appropriate API key based on provider
    if (provider === "openai") {
      for (const line of envLines) {
        if (line.startsWith("OPENAI_API_KEY=")) {
          apiKey = line.split("=")[1];
          break;
        }
      }
    } else if (provider === "gemini") {
      for (const line of envLines) {
        if (line.startsWith("GOOGLE_API_KEY=")) {
          apiKey = line.split("=")[1];
          break;
        }
      }
    }

    if (!apiKey) {
      console.error(
        `❌ ${provider.toUpperCase()}_API_KEY not found in .env file!`
      );
      console.error("Please run setup again to configure your API key.");
      return null;
    }

    return { modelType, modelName, apiKey, provider };
  } catch (error) {
    console.error("❌ Error reading configuration files:", error);
    return null;
  }
}
