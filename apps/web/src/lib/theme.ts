import { useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "chatbox.theme";

const read = (): ThemePreference => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
};

const apply = (preference: ThemePreference) => {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
};

export const initTheme = () => apply(read());

export const useTheme = () => {
  const [preference, setPreference] = useState<ThemePreference>(read);

  useEffect(() => {
    apply(preference);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage can be unavailable in private mode; the theme still applies for this visit.
    }
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  return [preference, setPreference] as const;
};
