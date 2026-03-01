#!/usr/bin/env node

import dotenv from "dotenv";

import chalk from "chalk";
import figlet from "figlet";

import { Command } from "commander";

import { login, logout, whoami } from "./commands/auth/login.js";
import { wakeUp } from "./commands/ai/wakeUp.js";

dotenv.config();

async function main() {
  // Display banner
  console.log(
    chalk.cyan(
      figlet.textSync("Chabel CLI", {
        font: "Standard",
        horizontalLayout: "default",
      })
    )
  );
  console.log(chalk.gray("A CLI-based AI tool\n"));

  const program = new Command("chabel");

  program
    .version("0.0.1")
    .description("Chabel CLI - Device Flow Authentication");

  // Add commands
  program.addCommand(wakeUp);
  program.addCommand(login);
  program.addCommand(logout);
  program.addCommand(whoami);

  // Default action shows help
  program.action(() => {
    program.help();
  });



  program.parse();
}

main().catch((error) => {
  console.error(chalk.red("Error running Chabel CLI:"), error);
  process.exit(1);
});
