export class UploadError extends Error {
  constructor(message: string, public readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 503) {
    super(message);
    this.name = "UploadError";
  }
}
