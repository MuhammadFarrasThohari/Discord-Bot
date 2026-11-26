import { AppError } from "../../shared/errors/app-error";

export class DanbooruTagNotFoundError extends AppError {
  constructor(tag: string) {
    super(`Danbooru tag "${tag}" was not found.`);
  }
}

export class InvalidDanbooruTagError extends AppError {
  constructor(tag: string) {
    super(`"${tag}" is not a valid character tag.`);
  }
}

export class DanbooruUnavailableError extends AppError {
  constructor() {
    super("Danbooru is currently unavailable. Please try again later.");
  }
}
