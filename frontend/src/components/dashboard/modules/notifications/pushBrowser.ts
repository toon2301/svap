'use client';

import { api, endpoints } from '@/lib/api';

export type PushPermissionState =
  | NotificationPermission
  | 'unsupported';

interface BrowserPushSupport {
  supported: boolean;
  reason: 'insecure_context' | 'missing_api' | null;
}

interface PushSubscriptionPayload {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

function isSecurePushContext(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

export function detectBrowserPushSupport(): BrowserPushSupport {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    typeof Notification === 'undefined' ||
    !('serviceWorker' in navigator) ||
    typeof PushManager === 'undefined'
  ) {
    return {
      supported: false,
      reason: 'missing_api',
    };
  }

  if (!isSecurePushContext()) {
    return {
      supported: false,
      reason: 'insecure_context',
    };
  }

  return {
    supported: true,
    reason: null,
  };
}

export function getBrowserPushPermissionState(): PushPermissionState {
  return detectBrowserPushSupport().supported ? Notification.permission : 'unsupported';
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return buffer;
}

async function getPushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!detectBrowserPushSupport().supported) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    updateViaCache: 'none',
  });

  return registration;
}

export async function getCurrentBrowserPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getPushServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}

function toPushSubscriptionPayload(
  subscription: PushSubscription,
): PushSubscriptionPayload {
  const payload =
    typeof subscription.toJSON === 'function' ? subscription.toJSON() : null;

  if (!payload?.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    throw new Error('Push subscription payload is incomplete.');
  }

  return payload;
}

export async function ensureBrowserPushSubscription(): Promise<PushSubscription> {
  const registration = await getPushServiceWorkerRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    return existingSubscription;
  }

  const response = await api.get<{ public_key: string }>(
    endpoints.push.vapidPublicKey,
  );
  const publicKey = String(response.data?.public_key || '').trim();
  if (!publicKey) {
    throw new Error('Push VAPID public key is missing.');
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(publicKey),
  });
}

export async function registerBrowserPushSubscription(
  subscription: PushSubscription,
): Promise<void> {
  const payload = toPushSubscriptionPayload(subscription);

  await api.post(endpoints.push.subscriptions, {
    subscription: {
      endpoint: payload.endpoint,
      keys: {
        p256dh: payload.keys?.p256dh,
        auth: payload.keys?.auth,
      },
    },
  });
}

export async function unsubscribeCurrentBrowserFromPush(): Promise<string | null> {
  const currentSubscription = await getCurrentBrowserPushSubscription();
  if (!currentSubscription) {
    return null;
  }

  const endpoint = currentSubscription.endpoint;

  try {
    await api.delete(endpoints.push.subscriptionCurrent, {
      data: { endpoint },
    });
  } finally {
    try {
      await currentSubscription.unsubscribe();
    } catch {
      // best-effort only
    }
  }

  return endpoint;
}
