"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type CurrentUser } from "@/lib/api";
import { currentLocale, withLocale } from "@/lib/i18n/config";

type CurrentUserState = {
  user: CurrentUser | null;
  /** True when the signed-in user holds `permission` at any scope. */
  can: (permission: string) => boolean;
  signOut: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserState | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    // api() sends the browser to /login or /change-password when needed.
    api<CurrentUser>("/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    await api<void>("/auth/logout", { method: "POST" }).catch(() => {});
    // A full reload, not router.push: nothing the previous user loaded may
    // survive in memory for whoever uses this browser next.
    window.location.assign(withLocale(currentLocale(), "/login"));
  }

  const can = (permission: string) => Boolean(user?.permissions[permission]);

  return (
    <CurrentUserContext.Provider value={{ user, can, signOut }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserState {
  const value = useContext(CurrentUserContext);
  if (!value) throw new Error("useCurrentUser must be used inside CurrentUserProvider");
  return value;
}
