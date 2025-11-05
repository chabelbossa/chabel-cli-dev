import { intro, outro } from "@clack/prompts";
import { logger } from "better-auth";
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

export async function whoamiAction(opts) {
	const serverUrl = opts.serverUrl || DEMO_URL;

	intro(chalk.bold("👤 Who Am I"));

	// Get stored token
	const tokenData = await getStoredToken();
	
	if (!tokenData) {
		console.log(chalk.yellow("\n⚠️  You are not logged in"));
		console.log(chalk.gray("   Run 'orbit login' to authenticate\n"));
		process.exit(0);
	}

	try {
		// Create auth client
		const authClient = createAuthClient({
			baseURL: serverUrl,
		});

		// Get session with stored token
		const { data: session, error } = await authClient.getSession({
			fetchOptions: {
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
				},
			},
		});

		if (error || !session) {
			console.log(chalk.red("\n❌ Failed to get user information"));
			console.log(chalk.yellow("   Your session may have expired. Try logging in again.\n"));
			process.exit(1);
		}

		// Display user information
		console.log("");
		console.log(chalk.cyan("━".repeat(50)));
		console.log("");
		console.log(chalk.bold("  User Information:"));
		console.log("");
		
		if (session.user.name) {
			console.log(`  ${chalk.gray("Name:")}     ${chalk.white(session.user.name)}`);
		}
		
		if (session.user.email) {
			console.log(`  ${chalk.gray("Email:")}    ${chalk.white(session.user.email)}`);
		}
		
		if (session.user.image) {
			console.log(`  ${chalk.gray("Avatar:")}   ${chalk.white(session.user.image)}`);
		}
		
		console.log(`  ${chalk.gray("User ID:")}  ${chalk.white(session.user.id)}`);
		
		console.log("");
		console.log(chalk.cyan("━".repeat(50)));
		console.log("");
		
		// Token info
		console.log(chalk.bold("  Session Information:"));
		console.log("");
		console.log(`  ${chalk.gray("Token Type:")}    ${chalk.white(tokenData.token_type)}`);
		console.log(`  ${chalk.gray("Scope:")}         ${chalk.white(tokenData.scope || "N/A")}`);
		console.log(`  ${chalk.gray("Logged in at:")}  ${chalk.white(new Date(tokenData.created_at).toLocaleString())}`);
		console.log("");
		console.log(chalk.cyan("━".repeat(50)));
		console.log("");

		outro(chalk.green("✅ Session is active"));

	} catch (err) {
		logger.error(
			`Failed to get user info: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		console.log(chalk.yellow("\n   Try logging in again with 'orbit login'\n"));
		process.exit(1);
	}
}

export const whoami = new Command("whoami")
	.description("Display information about the currently logged in user")
	.option("--server-url <url>", "The Better Auth server URL", DEMO_URL)
	.action(whoamiAction);