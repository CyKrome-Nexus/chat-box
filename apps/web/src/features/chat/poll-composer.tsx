import { Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { LIMITS, pollInputSchema } from "@chatbox/shared";

import { Button, Dialog, IconButton } from "@/components/ui";
import { useCurrentUser } from "@/features/auth/auth-context";
import { errorMessage } from "@/lib/api";
import { useSendMessage } from "./queries";

interface Draft {
  key: number;
  text: string;
  description: string;
}

const blank = (key: number): Draft => ({ key, text: "", description: "" });

export const PollComposer = ({
  open,
  onClose,
  conversationId,
}: {
  open: boolean;
  onClose: () => void;
  conversationId: string;
}) => {
  const me = useCurrentUser();
  const send = useSendMessage(me);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<Draft[]>([blank(1), blank(2)]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setQuestion("");
    setOptions([blank(1), blank(2)]);
    setAllowMultiple(false);
    setError(null);
  };

  const submit = async () => {
    const parsed = pollInputSchema.safeParse({
      question,
      allowMultiple,
      options: options
        .filter((option) => option.text.trim())
        .map((option) => ({ text: option.text, description: option.description.trim() || undefined })),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check your poll");
    setBusy(true);
    try {
      await send({ conversationId, kind: "poll", poll: parsed.data });
      reset();
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create Poll">
      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        maxLength={LIMITS.pollQuestionMax}
        rows={2}
        placeholder="What would you like to ask?"
        className="w-full resize-none bg-transparent text-3xl leading-tight font-medium outline-none placeholder:text-[var(--text-muted)]/60"
      />
      <div className="mt-6 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {options.map((option, index) => (
            <motion.div
              key={option.key}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3 focus-within:border-brand-500">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-brand-500 text-xs font-semibold text-brand-600">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <input
                    value={option.text}
                    maxLength={LIMITS.pollOptionMax}
                    onChange={(event) =>
                      setOptions(
                        options.map((item) =>
                          item.key === option.key ? { ...item, text: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder={`Option ${index + 1}`}
                    className="w-full bg-transparent font-medium outline-none"
                  />
                  <input
                    value={option.description}
                    maxLength={LIMITS.pollOptionMax}
                    onChange={(event) =>
                      setOptions(
                        options.map((item) =>
                          item.key === option.key ? { ...item, description: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Description (optional)"
                    className="w-full bg-transparent text-sm text-[var(--text-muted)] outline-none"
                  />
                </div>
                {options.length > LIMITS.pollOptionsMin ? (
                  <IconButton
                    label="Remove option"
                    onClick={() => setOptions(options.filter((item) => item.key !== option.key))}
                    className="size-8 text-[var(--text-muted)]"
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                ) : null}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {options.length < LIMITS.pollOptionsMax ? (
          <button
            type="button"
            onClick={() => setOptions([...options, blank(Date.now())])}
            className="flex items-center gap-2 self-start rounded-full px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-ink-soft"
          >
            <Plus className="size-4" /> Add option
          </button>
        ) : null}
      </div>
      <label className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--field)] px-4 py-3 text-sm">
        Allow multiple answers
        <input
          type="checkbox"
          checked={allowMultiple}
          onChange={(event) => setAllowMultiple(event.target.checked)}
          className="size-5 accent-[var(--color-brand-500)]"
        />
      </label>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <Button onClick={() => void submit()} loading={busy} className="mt-6 w-full">
        Send poll
      </Button>
    </Dialog>
  );
};
