import nodemailer, { type Transporter } from "nodemailer";

import { env } from "@/config/env";

let transporter: Transporter | null = null;

export const isMailConfigured = (): boolean => Boolean(env.SMTP_URL);

export const sendMail = async (to: string, subject: string, text: string): Promise<void> => {
  if (!env.SMTP_URL) return;
  transporter ??= nodemailer.createTransport(env.SMTP_URL);
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, text });
};
