import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id parameters.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

// Burned when no user matches, so login timing doesn't reveal which accounts exist.
const DUMMY_HASH = hash("chatbox-timing-equaliser", OPTIONS);

export const hashPassword = (password: string): Promise<string> => hash(password, OPTIONS);

export const verifyPassword = async (
  passwordHash: string | null | undefined,
  password: string,
): Promise<boolean> => {
  if (!passwordHash) {
    await verify(await DUMMY_HASH, password).catch(() => false);
    return false;
  }
  return verify(passwordHash, password).catch(() => false);
};
