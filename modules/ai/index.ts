import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ModelType } from "setup";
import { Config } from "setup";
import { tools } from "modules/tools";
import { Tool } from "@langchain/core/tools";
import "dotenv/config";

export const getModel = (
  credentials: Config,
  toolsProvided: Tool[] = tools
) => {
  let model;
  if (credentials.modelUsed?.modelType === ModelType.OPENAI) {
    model = new ChatOpenAI({
      model: credentials.modelUsed.modelName || "gpt-4",
      temperature: 0,
    });
  } else if (credentials.modelUsed?.modelType === ModelType.GEMINI) {
    model = new ChatGoogleGenerativeAI({
      model: credentials.modelUsed.modelName || "gemini-2.5-flash",
      temperature: 0,
    });
  } else {
    console.error(
      `Error: Unknown MODEL_TYPE '${credentials.modelUsed?.modelType}'`
    );
    return;
  }

  if (toolsProvided) {
    model = model.bindTools(toolsProvided);
  }

  return model;
};
