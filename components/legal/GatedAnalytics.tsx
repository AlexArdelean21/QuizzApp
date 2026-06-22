"use client";

import { Analytics } from "@vercel/analytics/react";
import { useCookieConsent } from "@/components/legal/CookieConsentContext";

export function GatedAnalytics() {
  const { analyticsAllowed, hydrated } = useCookieConsent();

  if (!hydrated || !analyticsAllowed) return null;

  return <Analytics />;
}
