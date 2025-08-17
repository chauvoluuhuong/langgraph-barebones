// Load environment variables
import "dotenv/config";

import { intro, outro, select } from "@clack/prompts";
import { setupModel } from "modules/setup/setupModel";
import { buildWorkflow } from "modules/workflows/basic";
import { conversation } from "modules/conversations";
import { readdir } from "fs/promises";
import { join } from "path";

async function selectWorkflow() {
  try {
    // Read all directories in modules/workflows
    const workflowsDir = join(process.cwd(), "modules", "workflows");
    const entries = await readdir(workflowsDir, { withFileTypes: true });

    // Filter for directories only (exclude files like index.ts)
    const workflowFolders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    if (workflowFolders.length === 0) {
      console.log("❌ No workflow folders found in modules/workflows");
      return null;
    }

    // Create options for the select prompt
    const workflowOptions = workflowFolders.map((folder) => ({
      value: folder,
      label:
        folder.charAt(0).toUpperCase() + folder.slice(1).replace(/-/g, " "), // Capitalize and replace hyphens
    }));

    // Let user select a workflow
    const selectedWorkflow = await select({
      message: "Select a workflow to build:",
      options: workflowOptions,
    });

    if (!selectedWorkflow) {
      console.log("❌ No workflow selected");
      return null;
    }

    const selectedWorkflowName = String(selectedWorkflow);

    // Dynamically import the buildWorkflow function from the selected workflow
    const workflowModule = await import(
      `modules/workflows/${selectedWorkflowName}`
    );

    if (!workflowModule.buildWorkflow) {
      console.log(
        `❌ buildWorkflow function not found in ${selectedWorkflowName}`
      );
      return null;
    }

    // Build and return the workflow
    console.log(`🔨 Building ${selectedWorkflowName} workflow...`);
    const workflow = await workflowModule.buildWorkflow();
    console.log(`✅ ${selectedWorkflowName} workflow built successfully!`);

    return workflow;
  } catch (error) {
    console.error("❌ Error selecting workflow:", error);
    return null;
  }
}

async function main() {
  intro("🤖 LangGraph Application");
  let workflow;
  while (true) {
    try {
      const choice = await select({
        message: "What would you like to do?",
        options: [
          { value: "setupModel", label: "Setup/Configure Model & Credentials" },
          { value: "selectWorkflow", label: "Select Workflow" },
          { value: "workflow", label: "View LangGraph Workflow Diagram" },
          { value: "run", label: "Run LangGraph Application" },
          { value: "exit", label: "Exit Application" },
        ],
      });

      if (choice === "setupModel") {
        const success = await setupModel();
        if (success) {
          console.log("✅ Setup complete! 🎉");
        } else {
          console.log("❌ Setup failed or was cancelled.");
        }
        console.log("\n"); // Add spacing before returning to menu
      } else if (choice === "workflow") {
        workflow = await buildWorkflow();
        const graph = await workflow.getGraphAsync();
        console.log(graph.drawMermaid());
        console.log("\n"); // Add spacing before returning to menu
      } else if (choice === "run") {
        const workflow = await buildWorkflow();
        await conversation(workflow);
        console.log("\n"); // Add spacing before returning to menu
      } else if (choice === "selectWorkflow") {
        workflow = await selectWorkflow();
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
