import { AppError } from "../../shared/errors/app-error";

export class CharacterAlreadyExistsError extends AppError {
  constructor() {
    super("This character is already in your list.");
  }
}

export class CharacterNotFoundError extends AppError {
  constructor() {
    super("Character was not found in your list.");
  }
}

export class CharacterNotInListError extends AppError {
  constructor() {
    super("This character is not in your active list.");
  }
}
