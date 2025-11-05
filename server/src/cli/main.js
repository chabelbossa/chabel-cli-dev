#!/usr/bin/env node

import dotenv from "dotenv";
import { Command } from "commander";
import { login } from "./commands/login.js";
import { logout } from "./commands/logout.js";
import { whoami } from "./commands/whoami.js";
import { status } from "./commands/status.js";
import chalk from "chalk";
import figlet from "figlet";

dotenv.config();

async function main() {
    // Display banner
    console.log(
        chalk.cyan(
            figlet.textSync("Orbit CLI", {
                font: "Standard",
                horizontalLayout: "default",
            })
        )
    );
    console.log(chalk.gray("  Authentication CLI for Better Auth\n"));

    const program = new Command("orbit");
    
    program
        .version("0.0.1")
        .description("Orbit CLI - Device Flow Authentication");

    // Add commands
    program.addCommand(login);
    program.addCommand(logout);
    program.addCommand(whoami);
    program.addCommand(status);

    // Default action shows help
    program.action(() => {
        program.help();
    });

    program.parse();
}

main().catch((error) => {
    console.error(chalk.red("Error running Orbit CLI:"), error);
    process.exit(1);
});