import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "mentor" | "student" | "trainer" | "employer";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isAdmin: boolean;
  isMentor: boolean;
  loading: boolean;
  rolesLoading: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchRoles = async (uid: string) => {
    setRolesLoading(true);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles(((data ?? []) as { role: AppRole }[]).map(r => r.role));
    setRolesLoading(false);
  };

  useEffect(() => {
    if (!user) { setRoles([]); setRolesLoading(false); return; }
    fetchRoles(user.id);
  }, [user]);

  const refreshRoles = async () => { if (user) await fetchRoles(user.id); };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{
      session, user, roles,
      isAdmin: roles.includes("admin"),
      isMentor: roles.includes("mentor"),
      loading, rolesLoading, refreshRoles, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
