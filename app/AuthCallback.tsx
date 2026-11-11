"use client";

import { useEffect } from "react";

export function AuthCallback() {
  useEffect(() => {
    if (/^#(?:confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/.test(window.location.hash) && window.location.pathname !== "/account") {
      window.location.replace(`/account${window.location.hash}`);
    }
  }, []);
  return null;
}
