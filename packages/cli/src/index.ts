/**
 * Marrakesh CLI - Test prompts like you test code
 */

import { Command } from "commander";
import { testCommand } from "./commands/test.js";

const program = new Command();

program
  .name("marrakesh")
  .description("Test your prompts like you test code")
  .version("0.1.0");

program.addCommand(testCommand);

program.parse();

