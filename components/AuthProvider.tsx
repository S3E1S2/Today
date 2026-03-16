"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  accountCreatedAt: Date | null;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  accountCreatedAt: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,             setUser]             = useState<User | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [accountCreatedAt, setAccountCreatedAt] = useState<Date | null>(null);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", userId)
      .single();
    if (data?.created_at) setAccountCreatedAt(new Date(data.created_at));
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else setAccountCreatedAt(null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      const created_at = new Date().toISOString();
      await supabase.from("profiles").upsert({ id: data.user.id, email, created_at });
      setAccountCreatedAt(new Date(created_at));
    }
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    console.log("[AuthProvider] signInWithPassword called for:", email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("[AuthProvider] signInWithPassword result — error:", error?.message ?? null);
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccountCreatedAt(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, accountCreatedAt, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
