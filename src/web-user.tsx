import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setAccessToken } from './auth';
import { getWebAuthClient } from './web-client';
import type { User } from './types';

type UserContextType = {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  token: null,
  setUser: () => {},
  signOut: async () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export interface UserProviderProps {
  children: React.ReactNode;
  baseUrl?: string;
  onUnauthenticated?: () => void;
}

export const UserProvider = ({
  children,
  baseUrl,
  onUnauthenticated,
}: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const authClient = useMemo(() => getWebAuthClient({ baseUrl }), [baseUrl]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
    setToken(null);
    setAccessToken(null);
    onUnauthenticated?.();
  }, [authClient, onUnauthenticated]);

  useEffect(() => {
    const fetchSession = async () => {
      const { session } = await authClient.getSession();

      if (!session) {
        onUnauthenticated?.();
        return;
      }

      setUser(session.user);
      setToken(session.token);
      setAccessToken(session.token);
    };

    const subscription = authClient.onAuthStateChange(
      (event, session, user) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setToken(null);
          setAccessToken(null);
          onUnauthenticated?.();
          return;
        }

        setUser(user);
        setToken(session.token);
        setAccessToken(session.token);
      },
    );

    void fetchSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [authClient, onUnauthenticated]);

  const value = useMemo(
    () => ({
      user,
      token,
      setUser,
      signOut,
    }),
    [user, token, signOut],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
