export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Loosely validates E.164-ish numbers, with or without a leading "+". */
export const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export const isEmail = (value: string) => EMAIL_REGEX.test(value.trim());

export const isPhone = (value: string) => PHONE_REGEX.test(value.trim().replace(/[\s-]/g, ""));

export const isEmailOrPhone = (value: string) => isEmail(value) || isPhone(value);

/** At least 8 characters, one letter, and one number. */
export const isStrongPassword = (value: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);

export const passwordsMatch = (password: string, confirmPassword: string) =>
    password.length > 0 && password === confirmPassword;
