/**
 * Base class for expected domain and integration errors whose messages are safe
 * to display directly to Discord users without masking.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
