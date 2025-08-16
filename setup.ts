#!/usr/bin/env tsx

import { intro, outro, select, text, note, spinner } from "@clack/prompts";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";

async function main() {
  intro("🤖 LangGraph Model Setup");

  // Check if .env already exists
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const overwrite = await select({
      message: "A .env file already exists. What would you like to do?",
      options: [
        { value: "overwrite", label: "Overwrite existing .env file" },
        { value: "exit", label: "Exit without changes" },
      ],
    });

    if (overwrite === "exit") {
      outro("Setup cancelled. No changes made.");
      process.exit(0);
    }
  }

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
    process.exit(1);
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
      process.exit(1);
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
      process.exit(1);
    }
    specificModel = geminiModel;
  }

  if (!specificModel || typeof specificModel !== "string") {
    outro("No valid model name provided. Setup cancelled.");
    process.exit(1);
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
      process.exit(1);
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
      process.exit(1);
    }

    apiKey = geminiKey;
    envContent = `GOOGLE_API_KEY=${apiKey}\nMODEL_TYPE=gemini\nMODEL_NAME=${specificModel}\n`;
  }

  // Write to .env file
  const s = spinner();
  s.start("Saving configuration...");

  try {
    writeFileSync(envPath, envContent);
    s.stop("✅ Configuration saved successfully!");

    note(
      `Your .env file has been created with ${String(
        modelType
      ).toUpperCase()} credentials.`
    );
    note("You can now run your LangGraph application!");
  } catch (error) {
    s.stop("❌ Failed to save configuration");
    console.error("Error:", error);
    process.exit(1);
  }

  outro("Setup complete! 🎉");
}

main().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
