export interface ForbiddenError extends Error {}

export function ForbiddenError(message = "Forbidden"): ForbiddenError {
  const error = new Error(message) as ForbiddenError;
  error.name = "ForbiddenError";
  return error;
}
