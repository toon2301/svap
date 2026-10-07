/** Authentication succeeded, but the resulting session could not be verified. */
export class SessionVerificationError extends Error {
  /** Keep verification failures distinct from rejected login credentials. */
  constructor() {
    super('Session verification failed');
    this.name = 'SessionVerificationError';
  }
}
