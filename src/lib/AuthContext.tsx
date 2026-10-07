import { createContext, useState, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/api/client';

type User = Record<string, any>;
type AuthState = {
  user: User | null; isAuthenticated: boolean; isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean; authError: { type: string; message: string } | null;
  authChecked: boolean; checkUserAuth: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthState['authError']>(null);
  const checkUserAuth = useCallback(async () => {
    try { setUser(await api.auth.me()); setAuthError(null); }
    catch (error) {
      setUser(null);
      if ((error as {status?:number}).status !== 401) setAuthError({type:'connection',message:'Cannot reach the server. Start the app with npm run dev and retry.'});
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void checkUserAuth(); }, [checkUserAuth]);
  return <AuthContext.Provider value={{user,isAuthenticated:!!user,isLoadingAuth:loading,isLoadingPublicSettings:false,authError,authChecked:!loading,checkUserAuth}}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
