// The error every API function throws, carrying the HTTP status code
// (401 not logged in, 404 not found, 409 conflict, 422 invalid input...).
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Turns anything thrown into a message we can show on screen
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
