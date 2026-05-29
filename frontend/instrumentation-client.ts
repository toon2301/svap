import * as Sentry from '@sentry/nextjs';
import {
  sanitizeSentryEvent,
  sentryBrowserTracesSampleRate,
  sentryEnvironment,
  sentryRelease,
  sentryTracePropagationTargets,
} from './src/lib/sentryConfig';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: sentryEnvironment(),
    release: sentryRelease(),
    tracesSampleRate: sentryBrowserTracesSampleRate(),
    tracePropagationTargets: sentryTracePropagationTargets(),
    sendDefaultPii: false,
    beforeSend: sanitizeSentryEvent,
    beforeSendTransaction: sanitizeSentryEvent,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

