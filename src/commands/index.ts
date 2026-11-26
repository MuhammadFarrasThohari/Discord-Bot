import { characterCommandDefinition } from "./character/character.command";
import type { BotCommand } from "./command.types";
import { setupCommandDefinition } from "./setup/setup.command";
import { waifuCommandDefinition } from "./waifu/waifu.command";

export const commands: BotCommand[] = [
  characterCommandDefinition,
  waifuCommandDefinition,
  setupCommandDefinition,
];

export const commandMap = new Map<string, BotCommand>(
  commands.map((command) => [command.data.name, command]),
);
