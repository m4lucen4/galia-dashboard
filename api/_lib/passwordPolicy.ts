// Server-side copy of src/helpers/passwordPolicy.ts: the API is public, so the rule
// must be enforced here too. Keep both files in sync.
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, a number and a symbol";

export const isStrongPassword = (password: string): boolean =>
  password.length >= PASSWORD_MIN_LENGTH &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);
