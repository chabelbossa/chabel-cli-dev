import { confirm, intro, isCancel, outro, cancel } from "@clack/prompts";
import { logger } from "better-auth";
import { createAuthClient } from "better-auth/client";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs/promises";
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
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

async function deleteStoredToken() {
	try {
		await fs.unlink(TOKEN_FILE);
		return true;
	} catch (error) {
		return false;
	}
}

export async function logoutAction(opts) {
	const serverUrl = opts.serverUrl || DEMO_URL;
	const force = opts.force || false;

	intro(chalk.bold("👋 Logout"));

	// Check if user is logged in
	const tokenData = await getStoredToken();
	
	if (!tokenData) {
		console.log(chalk.yellow("\n⚠️  You are not currently logged in\n"));
		process.exit(0);
	}

	// Get user info before logout
	let userName = "User";
	try {
		const authClient = createAuthClient({
			baseURL: serverUrl,
		});

		const { data: session } = await authClient.getSession({
			fetchOptions: {
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
				},
			},
		});

		if (session?.user) {
			userName = session.user.name || session.user.email || "User";
		}
	} catch (err) {
		// If we can't get user info, continue with logout anyway
	}

	// Confirm logout (unless --force flag is used)
	if (!force) {
		const shouldLogout = await confirm({
			message: `Are you sure you want to log out? (${userName})`,
			initialValue: false,
		});

		if (isCancel(shouldLogout) || !shouldLogout) {
			cancel("Logout cancelled");
			process.exit(0);
		}
	}

	const spinner = yoctoSpinner({ text: "Logging out..." });
	spinner.start();

	try {
		// Optionally revoke token on server (if your auth supports it)
		const authClient = createAuthClient({
			baseURL: serverUrl,
		});

		try {
			// Try to sign out on the server
			await authClient.signOut({
				fetchOptions: {
					headers: {
						Authorization: `Bearer ${tokenData.access_token}`,
					},
				},
			});
		} catch (err) {
			// If server signout fails, continue with local cleanup
			console.log(chalk.gray("\n   Note: Could not revoke token on server"));
		}

		// Delete local token
		const deleted = await deleteStoredToken();
		
		spinner.stop();

		if (deleted) {
			outro(chalk.green(`✅ Successfully logged out ${userName}`));
			console.log(chalk.gray("\n   Your local session has been cleared\n"));
		} else {
			outro(chalk.yellow("⚠️  Logout completed with warnings"));
			console.log(chalk.gray("\n   Could not delete local token file\n"));
		}

	} catch (err) {
		spinner.stop();
		logger.error(
			`Logout failed: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		
		// Try to delete local token anyway
		await deleteStoredToken();
		console.log(chalk.yellow("\n   Local session cleared, but server logout may have failed\n"));
		process.exit(1);
	}
}

export const logout = new Command("logout")
	.description("Log out from the current session")
	.option("--server-url <url>", "The Better Auth server URL", DEMO_URL)
	.option("-f, --force", "Force logout without confirmation", false)
	.action(logoutAction);