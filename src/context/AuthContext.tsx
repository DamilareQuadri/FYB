import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthCtx {
  session: Session | null;
  userId: string | null;
  isAdmin: boolean;
  loading: boolean;
  signInAdmin: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      let s = data.session;
      if (!s) {
        const { data: anon } = await supabase.auth.signInAnonymously();
        s = anon.session;
      }
      if (!active) return;
      setSession(s);
      setLoading(false);
    }
    boot();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [session?.user?.id]);

  async function signInAdmin(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    // Keep the shopper identified so their cart still works after admin logout
    await supabase.auth.signInAnonymously();
  }

  return (
    <Ctx.Provider
      value={{
        session,
        userId: session?.user?.id ?? null,
        isAdmin,
        loading,
        signInAdmin,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within an AuthProvider');
  return c;
};
