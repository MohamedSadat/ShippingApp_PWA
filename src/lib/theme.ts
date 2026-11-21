import { useSyncExternalStore } from "react";

/** System follows the device's light/dark setting; Light and Dark override it. */
export type ThemeChoice = "system" | "light" | "dark";
export const THEME_CHOICES: ThemeChoice[] = ["system", "light", "dark"];

// Read before first paint by the inline script in index.html; keep the key in step.
const STORAGE_KEY = "shippingapp.theme";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Storage blocked (private mode, site data off): follow the device.
    return "system";
  }
}

let choice = readChoice();

// index.css switches its palette on data-theme; no attribute means follow the device.
function apply() {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
}
apply();

export function setThemeChoice(next: ThemeChoice) {
  choice = next;
  try {
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not saved, but still applied for this visit.
  }
  apply();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  darkQuery.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    darkQuery.removeEventListener("change", listener);
  };
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, () => choice);
}

/** Whether the page is dark now: the choice, or the device's setting under System. */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, () => (choice === "system" ? darkQuery.matches : choice === "dark"));
}
