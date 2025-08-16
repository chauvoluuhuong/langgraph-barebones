// Load environment variables
import "dotenv/config";

import { intro, outro, select } from "@clack/prompts";
import { setup } from "./setup";
import { runApplication, showWorkflow } from "./workflow";

async function main() {
  intro("🤖 LangGraph Application");

  const choice = await select({
    message: "What would you like to do?",
    options: [
      { value: "setup", label: "Setup/Configure Model & Credentials" },
      { value: "workflow", label: "View LangGraph Workflow Diagram" },
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
  } else if (choice === "workflow") {
    await showWorkflow();
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
