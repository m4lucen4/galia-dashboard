// Password rule for new or changed passwords (registration, admin-created users,
// password reset). Keep in sync with api/_lib/passwordPolicy.ts, which enforces it server-side.
export const PASSWORD_MIN_LENGTH = 8;

export const isStrongPassword = (password: string): boolean =>
  password.length >= PASSWORD_MIN_LENGTH &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);
