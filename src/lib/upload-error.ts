export class UploadError extends Error {
  constructor(message: string, public readonly status: 400 | 404 | 413 | 503) {
    super(message);
    this.name = "UploadError";
  }
}
