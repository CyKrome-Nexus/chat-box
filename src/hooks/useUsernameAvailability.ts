import { useEffect, useRef, useState } from "react";

import { checkUsernameAvailability, TUsernameAvailability } from "@/src/lib/username/usernameRegistry";

const DEBOUNCE_MS = 400;

export type TAvailabilityState = "idle" | "checking" | TUsernameAvailability;

/** Debounces `handle` and runs the (simulated) backend availability query
 * after the user pauses typing — the "real-time availability checker with
 * debounced backend query" from the ticket. */
export const useUsernameAvailability = (handle: string, ownerId?: string) => {
	const [state, setState] = useState<TAvailabilityState>("idle");
	const [reason, setReason] = useState<string | undefined>(undefined);
	const requestId = useRef(0);

	useEffect(() => {
		if (!handle.trim()) {
			setState("idle");
			setReason(undefined);
			return;
		}

		setState("checking");
		const myRequestId = ++requestId.current;

		const timer = setTimeout(async () => {
			const result = await checkUsernameAvailability(handle, ownerId);
			if (requestId.current !== myRequestId) return; // a newer keystroke superseded this check
			setState(result.status);
			setReason(result.reason);
		}, DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [handle, ownerId]);

	return { state, reason };
};
