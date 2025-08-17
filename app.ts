// Load environment variables
import "dotenv/config";

import { intro, outro, select } from "@clack/prompts";
import { setup } from "./setup";
import { basicWorkflow, runApplication } from "modules/workflows/basic";

async function main() {
  intro("🤖 LangGraph Application");

  while (true) {
    try {
      const choice = await select({
        message: "What would you like to do?",
        options: [
          { value: "setup", label: "Setup/Configure Model & Credentials" },
          { value: "workflow", label: "View LangGraph Workflow Diagram" },
          { value: "run", label: "Run LangGraph Application" },
          { value: "exit", label: "Exit Application" },
        ],
      });

      if (choice === "setup") {
        const success = await setup();
        if (success) {
          console.log("✅ Setup complete! 🎉");
        } else {
          console.log("❌ Setup failed or was cancelled.");
        }
        console.log("\n"); // Add spacing before returning to menu
      } else if (choice === "workflow") {
        const graph = await basicWorkflow.getGraphAsync();
        console.log(graph);
        console.log("\n"); // Add spacing before returning to menu
      } else if (choice === "run") {
        await runApplication();
        console.log("\n"); // Add spacing before returning to menu
      } else if (choice === "exit") {
        outro("Goodbye! 👋");
        break;
      } else {
        console.log("No option selected.");
        console.log("\n"); // Add spacing before returning to menu
      }
    } catch (error) {
      console.error(error);
      console.log(
        "+++++++++++++++++Try to setup again+++++++++++++++++++++++++++++"
      );
    }
  }
}

main().catch((error) => {
  console.error("Application failed:", error);
  process.exit(1);
});
