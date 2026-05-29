import * as Sentry from '@sentry/nextjs';
import {
  sanitizeSentryEvent,
  sentryEnvironment,
  sentryRelease,
  sentryServerTracesSampleRate,
  sentryTracePropagationTargets,
} from './src/lib/sentryConfig';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: sentryEnvironment(),
    release: sentryRelease(),
    tracesSampleRate: sentryServerTracesSampleRate(),
    tracePropagationTargets: sentryTracePropagationTargets(),
    sendDefaultPii: false,
    beforeSend: sanitizeSentryEvent,
    beforeSendTransaction: sanitizeSentryEvent,
  });
}

