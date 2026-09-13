"use client";

import { useEffect } from "react";

const COOKIE_NAME = "ensaiopro_aff";
// 10 anos — praticamente eterno (Plynx limita o tracking real a 365d, mas
// mantemos o cookie no EnsaioPro pra reatribuir se o limite mudar).
const COOKIE_MAX_AGE = 10 * 365 * 24 * 3600;

export function AffiliateTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    const code = ref.trim();
    if (!code || !/^[a-zA-Z0-9_-]{2,64}$/.test(code)) return;
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  }, []);

  return null;
}
