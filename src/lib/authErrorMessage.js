// Turns whatever the auth API returns into one clean, human sentence. Raw API
// text, stack traces and HTML error pages never reach the sign-in screens.
const LOOKS_RAW = /stack|traceback|<!doctype|<html|at\s+\w+\s+\(/i;

export function authErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const raw = String(error?.data?.message || error?.message || '').trim();
  const text = raw.toLowerCase();
  if (!text) return fallback;

  if (/verif/.test(text) && /email/.test(text)) {
    return 'Verify your email first — open the 6-digit code we sent you, then log in.';
  }
  if (/expired/.test(text) && /(code|otp|token)/.test(text)) {
    return 'That code has expired. Tap Resend to get a fresh one.';
  }
  if (/(already registered|already exists|user exists)/.test(text)) {
    return 'An account already uses this email. Log in instead, or reset your password.';
  }
  if (/(invalid login|invalid credentials|incorrect|wrong password|invalid email or password|unauthor)/.test(text)) {
    return 'That email and password do not match. Check both and try again.';
  }
  if (/(disabled|deactivated|suspended|blocked)/.test(text)) {
    return 'This account has been disabled. Contact your batch coordinator.';
  }
  if (/(not registered|no user|user not found)/.test(text)) {
    return 'No LabLink account uses that email.';
  }
  if (/(network|failed to fetch|timeout|offline)/.test(text)) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (/password/.test(text) && /(short|weak|least|character)/.test(text)) {
    return 'Choose a stronger password with at least 8 characters.';
  }
  if (/code/.test(text)) {
    return 'That code is not correct. Check the 6 digits and try again.';
  }

  if (LOOKS_RAW.test(raw) || raw.length > 160) return fallback;
  return raw;
}