import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import { logger } from "better-auth";
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs/promises";
import open from "open";
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod/v4";
import dotenv from "dotenv";

dotenv.config();

const DEMO_URL = "http://localhost:3005";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CONFIG_DIR = path.join(os.homedir(), ".better-auth");
const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

export async function loginAction(opts) {
	const options = z
		.object({
			serverUrl: z.string().optional(),
			clientId: z.string().optional(),
		})
		.parse(opts);

	const serverUrl = options.serverUrl || DEMO_URL;
	const clientId = options.clientId || CLIENT_ID;

	intro(chalk.bold("🔐 Better Auth CLI Login (Demo)"));

	console.log(
		chalk.yellow(
			"⚠️  This is a demo feature for testing device authorization flow.",
		),
	);
	console.log(
		chalk.gray(
			"   It connects to the Better Auth demo server for testing purposes.\n",
		),
	);

	// Debug: Show what we're using
	console.log(chalk.gray(`   Server URL: ${serverUrl}`));
	console.log(chalk.gray(`   Client ID: ${clientId || 'NOT SET'}\n`));

	if (!clientId) {
		logger.error("CLIENT_ID is not set in .env file");
		console.log(chalk.red("\n❌ Please set CLIENT_ID in your .env file"));
		process.exit(1);
	}

	// Check if already logged in
	const existingToken = await getStoredToken();
	if (existingToken) {
		const shouldReauth = await confirm({
			message: "You're already logged in. Do you want to log in again?",
			initialValue: false,
		});

		if (isCancel(shouldReauth) || !shouldReauth) {
			cancel("Login cancelled");
			process.exit(0);
		}
	}

	// Create the auth client
	const authClient = createAuthClient({
		baseURL: serverUrl,
		plugins: [deviceAuthorizationClient({
		   verificationUri: "http://localhost:3000/device",
		})],
	});

	const spinner = yoctoSpinner({ text: "Requesting device authorization..." });
	spinner.start();

	try {
		// Request device code
		const { data, error } = await authClient.device.code({
			client_id: clientId,
			scope: "openid profile email",
		});

		spinner.stop();

		// Debug: Log the full response
		console.log(chalk.gray("\n   Debug - Response:"));
		console.log(chalk.gray(`   Data: ${JSON.stringify(data, null, 2)}`));
		console.log(chalk.gray(`   Error: ${JSON.stringify(error, null, 2)}\n`));

		if (error || !data) {
			logger.error(
				`Failed to request device authorization: ${error?.error_description || error?.message || "Unknown error"}`,
			);
			
			// More specific error messages
			if (error?.status === 404) {
				console.log(chalk.red("\n❌ Device authorization endpoint not found."));
				console.log(chalk.yellow("   Make sure your auth server is running on the correct port."));
			} else if (error?.status === 400) {
				console.log(chalk.red("\n❌ Bad request - check your CLIENT_ID configuration."));
			}
			
			process.exit(1);
		}

		const {
			device_code,
			user_code,
			verification_uri,
			verification_uri_complete,
			interval = 5,
			expires_in,
		} = data;

		// Display authorization instructions
		console.log("");
		console.log(chalk.cyan("📱 Device Authorization Required"));
		console.log("");
		console.log(`Please visit: ${chalk.underline.blue(verification_uri_complete)}`);
		console.log(`Enter code: ${chalk.bold.green(user_code)}`);
		console.log("");

		// Ask if user wants to open browser
		const shouldOpen = await confirm({
			message: "Open browser automatically?",
			initialValue: true,
		});

		if (!isCancel(shouldOpen) && shouldOpen) {
			const urlToOpen = verification_uri_complete || verification_uri;
			await open(urlToOpen);
		}

		// Start polling
		console.log(
			chalk.gray(
				`Waiting for authorization (expires in ${Math.floor(expires_in / 60)} minutes)...`,
			),
		);

		const token = await pollForToken(
			authClient,
			device_code,
			clientId,
			interval,
		);

		if (token) {
			// Store the token
			await storeToken(token);

			// Get user info
			const { data: session } = await authClient.getSession({
				fetchOptions: {
					headers: {
						Authorization: `Bearer ${token.access_token}`,
					},
				},
			});

			outro(
				chalk.green(
					`✅ Demo login successful! Logged in as ${session?.user?.name || session?.user?.email || "User"}`,
				),
			);

			console.log(
				chalk.gray(
					"\n📝 Note: This was a demo authentication for testing purposes.",
				),
			);

			console.log(
				chalk.blue(
					"\nFor more information, visit: https://better-auth.com/docs/plugins/device-authorization",
				),
			);
		}
	} catch (err) {
		spinner.stop();
		console.error("\n", chalk.red("Full error details:"), err);
		logger.error(
			`Login failed: ${err instanceof Error ? err.message : "Unknown error"}`,
		);
		process.exit(1);
	}
}

async function pollForToken(
	authClient,
	deviceCode,
	clientId,
	initialInterval,
) {
	let pollingInterval = initialInterval;
	const spinner = yoctoSpinner({ text: "", color: "cyan" });
	let dots = 0;

	return new Promise((resolve, reject) => {
		const poll = async () => {
			// Update spinner text with animated dots
			dots = (dots + 1) % 4;
			spinner.text = chalk.gray(
				`Polling for authorization${".".repeat(dots)}${" ".repeat(3 - dots)}`,
			);
			if (!spinner.isSpinning) spinner.start();

			try {
				const { data, error } = await authClient.device.token({
					grant_type: "urn:ietf:params:oauth:grant-type:device_code",
					device_code: deviceCode,
					client_id: clientId,
					fetchOptions: {
						headers: {
							"user-agent": `Better Auth CLI`,
						},
					},
				});

				if (data?.access_token) {
					spinner.stop();
					resolve(data);
					return;
				} else if (error) {
					switch (error.error) {
						case "authorization_pending":
							// Continue polling
							break;
						case "slow_down":
							pollingInterval += 5;
							spinner.text = chalk.yellow(
								`Slowing down polling to ${pollingInterval}s`,
							);
							break;
						case "access_denied":
							spinner.stop();
							logger.error("Access was denied by the user");
							process.exit(1);
							break;
						case "expired_token":
							spinner.stop();
							logger.error("The device code has expired. Please try again.");
							process.exit(1);
							break;
						default:
							spinner.stop();
							logger.error(`Error: ${error.error_description}`);
							process.exit(1);
					}
				}
			} catch (err) {
				spinner.stop();
				logger.error(
					`Network error: ${err instanceof Error ? err.message : "Unknown error"}`,
				);
				process.exit(1);
			}

			setTimeout(poll, pollingInterval * 1000);
		};

		// Start polling after initial interval
		setTimeout(poll, pollingInterval * 1000);
	});
}

async function storeToken(token) {
	try {
		// Ensure config directory exists
		await fs.mkdir(CONFIG_DIR, { recursive: true });

		// Store token with metadata
		const tokenData = {
			access_token: token.access_token,
			token_type: token.token_type || "Bearer",
			scope: token.scope,
			created_at: new Date().toISOString(),
		};

		await fs.writeFile(TOKEN_FILE, JSON.stringify(tokenData, null, 2), "utf-8");
	} catch (error) {
		logger.warn("Failed to store authentication token locally");
	}
}

async function getStoredToken() {
	try {
		const data = await fs.readFile(TOKEN_FILE, "utf-8");
		return JSON.parse(data);
	} catch {
		return null;
	}
}

export const login = new Command("login")
	.description(
		"Demo: Test device authorization flow with Better Auth demo server",
	)
	.option("--server-url <url>", "The Better Auth server URL", DEMO_URL)
	.option("--client-id <id>", "The OAuth client ID", CLIENT_ID)
	.action(loginAction);