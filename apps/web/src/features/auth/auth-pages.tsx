import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import type { z } from "zod";

import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@chatbox/shared";

import { Button, Field, Underline } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "./auth-context";

type Errors = Record<string, string | undefined>;

const collectErrors = (error: z.ZodError): Errors =>
  Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]));

const AuthShell = ({
  title,
  highlight,
  subtitle,
  children,
}: {
  title: string;
  highlight: string;
  subtitle: string;
  children: ReactNode;
}) => (
  <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
    <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-[#43116A]/60 blur-[120px]" />
      <div className="absolute right-0 bottom-0 size-80 rounded-full bg-brand-600/30 blur-[120px]" />
      <div className="relative flex items-center gap-3 text-lg font-semibold">
        <img src="/favicon.png" alt="" className="size-9 rounded-xl" />
        Chatbox
      </div>
      <div className="relative max-w-md">
        <h1 className="text-6xl leading-[1.05] font-semibold tracking-tight">
          Connect friends easily &amp; quickly
        </h1>
        <p className="mt-6 text-lg text-white/60">
          Our chat app is the perfect way to stay connected with friends and family.
        </p>
      </div>
    </aside>
    <main className="flex items-center justify-center px-6 py-10">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
      >
        <Link
          to="/"
          aria-label="Back"
          className="mb-8 inline-flex size-10 items-center justify-center rounded-full hover:bg-[var(--field)] lg:hidden"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold">
            <Underline>{highlight}</Underline> {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xs text-[15px] text-[var(--text-muted)]">{subtitle}</p>
        </div>
        {children}
      </motion.div>
    </main>
  </div>
);

const FormError = ({ message }: { message: string | null }) =>
  message ? (
    <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger animate-fade-in">
      {message}
    </p>
  ) : null;

export const SignInPage = () => {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) return setErrors(collectErrors(parsed.error));
    setErrors({});
    setFailure(null);
    setLoading(true);
    try {
      await signIn(parsed.data);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      highlight="Log in"
      title="to Chatbox"
      subtitle="Welcome back! Sign in using your email or phone to continue."
    >
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <Field
          label="Your email or phone"
          autoComplete="username"
          value={form.identifier}
          error={errors.identifier}
          onChange={(event) => setForm({ ...form, identifier: event.target.value })}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          error={errors.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        <FormError message={failure} />
        <Button
          type="submit"
          loading={loading}
          disabled={!form.identifier || !form.password}
          className="mt-6"
        >
          Log in
        </Button>
        <div className="flex flex-col items-center gap-3 text-sm">
          <Link
            to="/forgot-password"
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Forgot password?
          </Link>
          <p className="text-[var(--text-muted)]">
            New here?{" "}
            <Link to="/sign-up" className="font-semibold text-[var(--text)] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
};

export const SignUpPage = () => {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", contact: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const isEmail = form.contact.includes("@");
    const parsed = registerSchema.safeParse({
      name: form.name,
      password: form.password,
      ...(isEmail ? { email: form.contact } : { phone: form.contact }),
    });
    const next: Errors = parsed.success ? {} : collectErrors(parsed.error);
    if (next.email || next.phone) next.contact = next.email ?? next.phone;
    if (form.password !== form.confirm) next.confirm = "Passwords don't match";
    setErrors(next);
    if (!parsed.success || next.confirm) return;

    setFailure(null);
    setLoading(true);
    try {
      await signUp(parsed.data);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });

  return (
    <AuthShell
      highlight="Sign up"
      title="with Chatbox"
      subtitle="Get chatting with friends and family today by signing up for our chat app!"
    >
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <Field
          label="Your name"
          autoComplete="name"
          value={form.name}
          error={errors.name}
          onChange={update("name")}
        />
        <Field
          label="Your email or phone"
          autoComplete="email"
          placeholder="you@example.com or +14155550123"
          value={form.contact}
          error={errors.contact}
          onChange={update("contact")}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          error={errors.password}
          onChange={update("password")}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          error={errors.confirm}
          onChange={update("confirm")}
        />
        <FormError message={failure} />
        <Button
          type="submit"
          loading={loading}
          disabled={!form.name || !form.contact || !form.password}
          className="mt-6"
        >
          Create an account
        </Button>
        <p className="text-center text-sm text-[var(--text-muted)]">
          Existing account?{" "}
          <Link to="/sign-in" className="font-semibold text-[var(--text)] hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [form, setForm] = useState({ identifier: "", code: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setFailure(null);
    setLoading(true);
    try {
      await task();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const request = (event: FormEvent) => {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ identifier: form.identifier });
    if (!parsed.success) return setErrors(collectErrors(parsed.error));
    setErrors({});
    void run(async () => {
      await api.post("/auth/password/forgot", parsed.data);
      setStep("reset");
    });
  };

  const reset = (event: FormEvent) => {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse(form);
    if (!parsed.success) return setErrors(collectErrors(parsed.error));
    setErrors({});
    void run(async () => {
      await api.post("/auth/password/reset", parsed.data);
      navigate("/sign-in", { replace: true });
    });
  };

  return (
    <AuthShell
      highlight="Reset"
      title="your password"
      subtitle={
        step === "request"
          ? "Enter the email or phone linked to your account and we'll send you a code."
          : "Enter the 6-digit code we sent you and choose a new password."
      }
    >
      {step === "request" ? (
        <form onSubmit={request} className="flex flex-col gap-6" noValidate>
          <Field
            label="Your email or phone"
            value={form.identifier}
            error={errors.identifier}
            onChange={(event) => setForm({ ...form, identifier: event.target.value })}
          />
          <FormError message={failure} />
          <Button type="submit" loading={loading} disabled={!form.identifier} className="mt-6">
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={reset} className="flex flex-col gap-6" noValidate>
          <Field
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={form.code}
            error={errors.code}
            onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, "") })}
          />
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            error={errors.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <FormError message={failure} />
          <Button
            type="submit"
            loading={loading}
            disabled={form.code.length !== 6 || !form.password}
            className="mt-6"
          >
            Reset password
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/sign-in" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
};
