/**
 * Marrakesh CLI - Test prompts like you test code
 */

import { config } from "dotenv";
import { Command } from "commander";
import { testCommand } from "./commands/test.js";

// Load .env file at startup
config();

if (process.env.MARRAKESH_DEBUG === "true") {
  // Debug: Check if environment variables are loaded
  console.log("Debug: Environment variables loaded:");
  console.log(
    "MARRAKESH_API_KEY:",
    process.env.MARRAKESH_API_KEY ? "***" : "not set",
  );
  console.log("MARRAKESH_DEBUG:", process.env.MARRAKESH_DEBUG);
  console.log(
    "MARRAKESH_ANALYTICS_DISABLED:",
    process.env.MARRAKESH_ANALYTICS_DISABLED,
  );
}

const program = new Command();

program
  .name("marrakesh")
  .description("Test your prompts like you test code")
  .version("0.1.0");

program.addCommand(testCommand);

program.parse();
