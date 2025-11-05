import { createAuthClient } from "better-auth/client";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs/promises";
import os from "os";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DEMO_URL = "http://localhost:3005";
const CONFIG_DIR = path.join(os.homedir(), ".better-auth");
const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

async function getStoredToken() {
	try {
		const data = await fs.readFile(TOKEN_FILE, "utf-8");
		return JSON.parse(data);
	} catch {
		return null;
	}
}

export async function statusAction(opts) {
	const serverUrl = opts.serverUrl || DEMO_URL;

	const tokenData = await getStoredToken();
	
	console.log("");
	console.log(chalk.bold.cyan("Orbit CLI Status"));
	console.log(chalk.gray("━".repeat(50)));
	console.log("");

	if (!tokenData) {
		console.log(`  ${chalk.red("●")} ${chalk.bold("Status:")} Not logged in`);
		console.log(`  ${chalk.gray("Server:")} ${serverUrl}`);
		console.log("");
		console.log(chalk.gray("  Run 'orbit login' to authenticate"));
		console.log("");
		return;
	}

	try {
		const authClient = createAuthClient({
			baseURL: serverUrl,
		});

		const { data: session, error } = await authClient.getSession({
			fetchOptions: {
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
				},
			},
		});

		if (error || !session) {
			console.log(`  ${chalk.yellow("●")} ${chalk.bold("Status:")} Session expired`);
			console.log(`  ${chalk.gray("Server:")} ${serverUrl}`);
			console.log("");
			console.log(chalk.gray("  Run 'orbit login' to re-authenticate"));
			console.log("");
			return;
		}

		console.log(`  ${chalk.green("●")} ${chalk.bold("Status:")} Logged in`);
		console.log(`  ${chalk.gray("Server:")} ${serverUrl}`);
		console.log(`  ${chalk.gray("User:")}   ${session.user.name || session.user.email}`);
		console.log(`  ${chalk.gray("Since:")}  ${new Date(tokenData.created_at).toLocaleString()}`);
		console.log("");

	} catch (err) {
		console.log(`  ${chalk.red("●")} ${chalk.bold("Status:")} Error checking status`);
		console.log(`  ${chalk.gray("Server:")} ${serverUrl}`);
		console.log("");
		console.log(chalk.gray(`  Error: ${err.message}`));
		console.log("");
	}
}

export const status = new Command("status")
	.description("Check current authentication status")
	.option("--server-url <url>", "The Better Auth server URL", DEMO_URL)
	.action(statusAction);