"use client";

const STORAGE_KEY = "quizhub_cookie_consent";

export interface CookieConsentState {
  analytics: boolean;
  version: string;
  decidedAt: string;
}

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsentState;
  } catch {
    return null;
  }
}

export function writeCookieConsent(state: CookieConsentState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: state }));
}

export function clearCookieConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
