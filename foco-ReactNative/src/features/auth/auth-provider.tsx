import type { AuthSessionResult } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import type { User } from 'firebase/auth';

import { isFirebaseConfigured } from '@/services/firebase/app';
import {
  observeAuthState,
  signInFirebaseWithGoogleIdToken,
  signOutFirebase,
} from '@/services/firebase/auth';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  canSignInWithGoogle: boolean;
  errorMessage: string | null;
  googleAccessToken: string | null;
  isLoading: boolean;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  user: User | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

const fallbackClientId = 'missing-google-client-id';

const googleClientIds = {
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

function getCurrentPlatformClientId() {
  return Platform.select({
    android: googleClientIds.android,
    ios: googleClientIds.ios,
    default: googleClientIds.web,
  });
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const authNonce = useMemo(() => Crypto.randomUUID(), []);
  const platformClientId = getCurrentPlatformClientId();
  const canSignInWithGoogle = Boolean(isFirebaseConfigured && platformClientId);

  const [googleRequest, googleResponse, promptGoogleSignIn] = Google.useAuthRequest({
    androidClientId: googleClientIds.android ?? fallbackClientId,
    extraParams: Platform.OS === 'web' ? { nonce: authNonce } : undefined,
    iosClientId: googleClientIds.ios ?? fallbackClientId,
    responseType: Platform.OS === 'web' ? 'id_token token' : undefined,
    scopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.freebusy',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ],
    selectAccount: true,
    usePKCE: Platform.OS === 'web' ? false : undefined,
    webClientId: googleClientIds.web ?? fallbackClientId,
  });

  useEffect(() => {
    const unsubscribe = observeAuthState((nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setGoogleAccessToken(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleGoogleResponse = useCallback(async (response: AuthSessionResult) => {
    if (response.type === 'cancel' || response.type === 'dismiss') {
      setIsSigningIn(false);
      return;
    }

    if (response.type === 'error') {
      setErrorMessage('Nao foi possivel concluir o login com Google.');
      setIsSigningIn(false);
      return;
    }

    if (response.type !== 'success') {
      setIsSigningIn(false);
      return;
    }

    const idToken = response.params.id_token ?? response.authentication?.idToken;
    const accessToken = response.params.access_token ?? response.authentication?.accessToken ?? null;

    if (!idToken) {
      setErrorMessage('O Google nao retornou um token de identidade.');
      setIsSigningIn(false);
      return;
    }

    try {
      await signInFirebaseWithGoogleIdToken(idToken);
      setGoogleAccessToken(accessToken);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Nao foi possivel autenticar no Firebase.');
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  useEffect(() => {
    if (googleResponse) {
      const responseTimer = setTimeout(() => {
        void handleGoogleResponse(googleResponse);
      }, 0);

      return () => {
        clearTimeout(responseTimer);
      };
    }
  }, [googleResponse, handleGoogleResponse]);

  const signInWithGoogle = useCallback(async () => {
    if (!canSignInWithGoogle) {
      setErrorMessage('Configure Firebase e o client ID do Google para esta plataforma.');
      return;
    }

    if (!googleRequest) {
      setErrorMessage('A requisicao de login ainda esta carregando.');
      return;
    }

    setErrorMessage(null);
    setIsSigningIn(true);

    try {
      const result = await promptGoogleSignIn();

      if (result.type !== 'success') {
        setIsSigningIn(false);
      }
    } catch {
      setErrorMessage('Nao foi possivel abrir o login com Google.');
      setIsSigningIn(false);
    }
  }, [canSignInWithGoogle, googleRequest, promptGoogleSignIn]);

  const signOut = useCallback(async () => {
    setErrorMessage(null);
    setGoogleAccessToken(null);
    await signOutFirebase();
  }, []);

  const value = useMemo(
    () => ({
      canSignInWithGoogle,
      errorMessage,
      googleAccessToken,
      isLoading,
      isSigningIn,
      signInWithGoogle,
      signOut,
      user,
    }),
    [
      canSignInWithGoogle,
      errorMessage,
      googleAccessToken,
      isLoading,
      isSigningIn,
      signInWithGoogle,
      signOut,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
