'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import { SessionVerificationError } from '@/lib/authSessionVerification';
import { getCurrentAccountId } from '@/lib/currentAccount';
import { clearMobileOnboardingPostponedForSession, clearMobileOnboardingResumePhase2 } from '@/lib/mobileOnboardingSession';
import { fetchCsrfToken } from '@/utils/csrf';

type ActiveAttempt = { cancel: (closePopup?: boolean) => void; unmount: () => void };
type Callbacks = { onStart: () => void; onError: (message: string) => void };

/** Record event names only; never include credentials, identity or the OAuth nonce. */
function trace(event: string) {
  try {
    (window as unknown as { __OAUTH_TRACE__?: { log: (event: string) => void } })
      .__OAUTH_TRACE__?.log(event);
  } catch { /* Diagnostics must never interrupt authentication. */ }
}

/** Google popup authentication with cookie-backed recovery and one completion per attempt. */
export function useGoogleLogin(callbacks: Callbacks) {
  const { refreshUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const mounted = useRef(true);
  const active = useRef<ActiveAttempt | null>(null);
  const latestCallbacks = useRef(callbacks);
  latestCallbacks.current = callbacks;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.unmount();
    };
  }, []);

  /** Update loading only while the form still owns a mounted hook. */
  const setLoading = (value: boolean) => {
    if (mounted.current) setIsGoogleLoading(value);
  };

  /** Fully cancel an older Google attempt before another login or explicit dismissal. */
  const cancelGoogleLogin = () => {
    active.current?.cancel(true);
    setLoading(false);
  };

  /** Start an isolated nonce-backed attempt and open the popup inside the user's click gesture. */
  const handleGoogleLogin = () => {
    cancelGoogleLogin();
    latestCallbacks.current.onStart();
    setLoading(true);
    trace('login_google_start');

    let nonce: string;
    try {
      nonce = crypto.randomUUID();
      sessionStorage.setItem('oauth_nonce', nonce);
    } catch {
      setLoading(false);
      latestCallbacks.current.onError(t('auth.googleLoginFailed'));
      return;
    }

    let popup: Window | null = null;
    let cancelled = false;
    let completing = false;
    let probing = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let resolveDelay: ((continueAttempt: boolean) => void) | null = null;
    let probe: AbortController | null = null;

    const attempt: ActiveAttempt = {
      cancel: (closePopup = false) => {
        cancelled = true;
        detach();
        clearNonce();
        if (closePopup) {
          try { popup?.close(); } catch { /* COOP can sever access to this owned popup. */ }
        }
        if (active.current === attempt) active.current = null;
      },
      unmount: () => {
        detach();
        // /me updates Home before its promise resolves. Keep verified completion
        // housekeeping alive, but never update an unmounted form or redirect it.
        if (!completing || getCurrentAccountId() === null) attempt.cancel(true);
      },
    };
    active.current = attempt;
    const current = () => active.current === attempt && !cancelled;

    /** Remove this attempt's nonce without erasing the state of a newer attempt. */
    function clearNonce() {
      try {
        if (sessionStorage.getItem('oauth_nonce') === nonce) sessionStorage.removeItem('oauth_nonce');
      } catch { /* Storage can become unavailable in private browsing. */ }
    }

    /** Stop recovery resources; retain the callback listener only for a failed, non-final probe. */
    function detach(preserveMessage = false) {
      if (poll !== null) clearInterval(poll);
      poll = null;
      if (delayTimer !== null) clearTimeout(delayTimer);
      delayTimer = null;
      resolveDelay?.(false);
      resolveDelay = null;
      probe?.abort();
      probe = null;
      if (!preserveMessage) window.removeEventListener('message', onMessage);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    }

    /** Report an error and unlock; probe errors preserve late completion, definitive errors cancel. */
    function fail(message: string, preserveMessage = false) {
      if (!current()) return;
      if (preserveMessage) detach(true);
      else attempt.cancel();
      setLoading(false);
      if (mounted.current) latestCallbacks.current.onError(message);
    }

    /** Resolve a retry delay only while its attempt is active and not already completing. */
    function wait(ms: number) {
      return new Promise<boolean>(resolve => {
        resolveDelay = resolve;
        delayTimer = setTimeout(() => {
          delayTimer = null;
          resolveDelay = null;
          resolve(current() && !completing);
        }, ms);
      });
    }

    /** Verify backend identity and finalize the current attempt once, with lifecycle-safe cleanup. */
    async function complete() {
      if (!current() || completing) return;
      completing = true;
      detach();
      clearNonce();
      setLoading(true);
      trace('login_google_refresh_user_start');
      try {
        await refreshUser({ force: true, verifyLogin: true });
        if (!current()) return;
        // This is only a lifecycle guard after strict backend verification,
        // never a cached-identity substitute for that verification.
        const verifiedAccount = getCurrentAccountId();
        if (verifiedAccount === null) return;
        await fetchCsrfToken();
        if (!current() || getCurrentAccountId() !== verifiedAccount) return;

        try {
          clearMobileOnboardingPostponedForSession();
          clearMobileOnboardingResumePhase2();
          localStorage.setItem('activeModule', 'home');
          sessionStorage.setItem('forceHome', '1');
        } catch { /* Optional preferences must not undo a verified login. */ }
        setLoading(false);
        trace('login_google_verified');
        // Home already redirects when its provider resolves the user. A form
        // unmounted by that redirect must not navigate over a newer page.
        if (mounted.current) router.push('/dashboard');
      } catch (error) {
        fail(error instanceof SessionVerificationError
          ? t('auth.sessionVerificationFailed') : t('auth.googleLoginFailed'));
      } finally {
        if (current()) {
          attempt.cancel();
          setLoading(false);
        }
      }
    }

    /** Probe cookies without assigning identity; retry only anonymous results within this attempt. */
    async function recover() {
      if (!current() || completing || probing || document.visibilityState === 'hidden') return;
      probing = true;
      setLoading(true);
      try {
        for (let index = 0; index < 3; index += 1) {
          const controller = new AbortController();
          probe = controller;
          let status: number;
          let validUser = false;
          try {
            const response = await api.get(endpoints.auth.me, {
              signal: controller.signal,
              timeout: 5000,
              // A probe's anonymous result must not refresh an old session or
              // invalidate a concurrent login. Only strict refreshUser sets identity.
              validateStatus: status => status === 200 || status === 401,
            });
            status = response.status;
            validUser = typeof response.data?.id === 'number' && response.data.id > 0;
          } catch (error) {
            if (!current() || completing || controller.signal.aborted) return;
            status = (error as { response?: { status?: number } } | null)?.response?.status ?? 0;
          }
          if (!current() || completing) return;
          if (status === 200 && validUser) {
            void complete();
            return;
          }
          if (status !== 401) {
            fail(t(status === 429 ? 'auth.tooManyRequests' : 'auth.sessionVerificationFailed'), true);
            return;
          }
          if (index < 2 && !await wait(index === 0 ? 500 : 1500)) return;
        }
        // 401 is not an error. Leave only passive, attempt-scoped listeners:
        // COOP can report "closed" before Google finishes, so a later return or
        // matching callback must still recover. No further timed API polling.
        if (current() && !completing) setLoading(false);
      } finally {
        probing = false;
        probe = null;
      }
    }

    /** Request recovery on a return event while the attempt still owns its return listeners. */
    function onReturn() {
      void recover();
    }

    /** Accept success or error only from this origin and the currently stored attempt nonce. */
    function onMessage(event: MessageEvent) {
      if (!current() || completing || event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type !== 'OAUTH_SUCCESS' && event.data.type !== 'OAUTH_ERROR') return;
      let storedNonce: string | null = null;
      try { storedNonce = sessionStorage.getItem('oauth_nonce'); } catch { /* Ignore unverifiable messages. */ }
      if (storedNonce !== nonce || event.data.nonce !== nonce) return;
      if (event.data.type === 'OAUTH_SUCCESS') {
        void complete();
      } else {
        fail(typeof event.data.error === 'string' && event.data.error
          ? event.data.error : t('auth.googleLoginFailed'));
      }
    }

    window.addEventListener('message', onMessage);
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    try {
      const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || '';
      const baseApi = (api.defaults.baseURL as string) || (backendOrigin
        ? `${backendOrigin}/api` : (process.env.NEXT_PUBLIC_API_URL || '/api'));
      const callbackUrl = `${window.location.origin}/auth/callback`;
      popup = window.open(
        `${baseApi}/oauth/google/login/?callback=${encodeURIComponent(callbackUrl)}`,
        'google-login',
        'width=500,height=600,scrollbars=yes,resizable=yes',
      );
      if (!popup) {
        fail(t('auth.googleLoginFailed'));
        return;
      }
      if (current() && !completing) {
        poll = setInterval(() => {
          let disconnected: boolean;
          try { disconnected = popup!.closed; } catch { disconnected = true; }
          if (disconnected) {
            if (poll !== null) clearInterval(poll);
            poll = null;
            trace('login_google_popup_closed_detected');
            void recover();
          }
        }, 1000);
      }
    } catch {
      fail(t('auth.googleLoginFailed'));
    }
  };

  return { handleGoogleLogin, isGoogleLoading, cancelGoogleLogin };
}
