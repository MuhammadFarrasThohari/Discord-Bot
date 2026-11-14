
export class CharacterAlreadyExistsError extends Error {
  constructor() {
    super("This character is already in your list.");
    this.name = "CharacterAlreadyExistsError";
  }
}

export class CharacterNotFoundError extends Error {
  constructor() {
    super("Character was not found in your list.");
    this.name = "CharacterNotFoundError";
  }

}

export class CharacterNotInListError extends Error {
  constructor() {
    super("This character is not in your active list.");
    this.name = "CharacterNotInListError";
  }
}
