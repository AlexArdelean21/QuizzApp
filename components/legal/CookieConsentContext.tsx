"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { readCookieConsent } from "@/lib/legal/cookie-consent";

interface CookieConsentContextValue {
  analyticsAllowed: boolean;
  hydrated: boolean;
}

const CookieConsentContext = createContext<CookieConsentContextValue>({
  analyticsAllowed: false,
  hydrated: false,
});

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const consent = readCookieConsent();
    setAnalyticsAllowed(consent?.analytics === true);
    setHydrated(true);

    function handleUpdate(e: Event) {
      const detail = (e as CustomEvent<{ analytics?: boolean }>).detail;
      setAnalyticsAllowed(detail?.analytics === true);
    }

    window.addEventListener("cookie-consent-updated", handleUpdate);
    return () => window.removeEventListener("cookie-consent-updated", handleUpdate);
  }, []);

  return (
    <CookieConsentContext.Provider value={{ analyticsAllowed, hydrated }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}
