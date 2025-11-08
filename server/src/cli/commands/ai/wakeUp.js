import chalk from "chalk";
import { Command } from "commander";
import yoctoSpinner from "yocto-spinner";
import { getStoredToken } from "../auth/login.js";
import prisma from "../../../lib/db.js";
import { cancel, confirm, intro, isCancel, outro , select } from "@clack/prompts";
import { startChat } from "../../chat/chat-with-ai.js";
const wakeUpAction = async () => {
  const token = await getStoredToken();

  if (!token || !token.access_token) {
    console.log(chalk.red("Not authenticated. Please login."));
    return;
  }

  const spinner = yoctoSpinner({ text: "Fetching User Information..." });
  spinner.start();

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: {
          token: token.access_token,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  spinner.stop();

  if (!user) {
    console.log(chalk.red("User not found."));
    return;
  }



  console.log(chalk.green(`\nWelcome back, ${user.name}!\n`));

  const optionsToContinue = [
    {
      value:"Chat",
      label:"Chat",
      description:"Select this option if you want to chat with the AI.",
    },
    {
      value:"Tool Calling",
      label:"Tool Calling",
      description:"Select this option if you want to call a tool.",
    },
    {
      value:"Agentic Mode",
      label:"Agentic Mode",
      description:"Select this option if you want to use agentic mode.",
    },
  ]

 
  const choice = await select({
    message: "Select an option:",
    options: optionsToContinue,
  })


  switch (choice) {
    case "Chat":
      console.log(chalk.green(`\nYou have selected to chat with the AI.\n`));
      startChat();
      break;
    case "Tool Calling":
      console.log(chalk.green(`\nYou have selected to call a tool.\n`));
      break;
    case "Agentic Mode":
      console.log(chalk.green(`\nYou have selected to use agentic mode.\n`));
      break;
    default:
      console.log(chalk.red(`\nInvalid option selected.\n`));
      break;
  }

};

export const wakeUp = new Command("wakeup")
  .description("Wake up the AI")
  .action(wakeUpAction);
