import { characterCommand } from "./character/character.command";
import { waifuCommand } from "./waifu/waifu.command";
import { setupCommand } from "./setup/setup.command";

export const commands = [
  characterCommand,
  waifuCommand,
  setupCommand,
];