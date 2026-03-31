'use client';

import { useEffect, useState } from 'react';

import { api, endpoints } from '@/lib/api';

export interface NotificationPreferencesState {
  emailNotifications: boolean;
  pushNotifications: boolean;
}

type NotificationPreferenceKey = keyof NotificationPreferencesState;

interface NotificationPreferencesApiPayload {
  email_notifications?: boolean;
  push_notifications?: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferencesState = {
  emailNotifications: true,
  pushNotifications: false,
};

function mapApiPayloadToState(
  payload?: NotificationPreferencesApiPayload | null,
): NotificationPreferencesState {
  return {
    emailNotifications:
      typeof payload?.email_notifications === 'boolean'
        ? payload.email_notifications
        : DEFAULT_PREFERENCES.emailNotifications,
    pushNotifications:
      typeof payload?.push_notifications === 'boolean'
        ? payload.push_notifications
        : DEFAULT_PREFERENCES.pushNotifications,
  };
}

function mapStatePatchToApiPatch(
  key: NotificationPreferenceKey,
  value: boolean,
): NotificationPreferencesApiPayload {
  if (key === 'emailNotifications') {
    return { email_notifications: value };
  }
  return { push_notifications: value };
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferencesState>(
    DEFAULT_PREFERENCES,
  );
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<NotificationPreferenceKey | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<NotificationPreferencesApiPayload>(
          endpoints.push.preferences,
        );
        if (!cancelled) {
          setPreferences(mapApiPayloadToState(response.data));
        }
      } catch (loadError) {
        console.error('Failed to load notification preferences:', loadError);
        if (!cancelled) {
          setError('Nepodarilo sa nacitat nastavenia upozorneni.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  async function updatePreference(
    key: NotificationPreferenceKey,
    value: boolean,
  ): Promise<boolean> {
    const previous = preferences;
    setPreferences((current) => ({ ...current, [key]: value }));
    setSavingKey(key);
    setError(null);

    try {
      const response = await api.patch<NotificationPreferencesApiPayload>(
        endpoints.push.preferences,
        mapStatePatchToApiPatch(key, value),
      );
      setPreferences(mapApiPayloadToState(response.data));
      return true;
    } catch (saveError) {
      console.error('Failed to update notification preferences:', saveError);
      setPreferences(previous);
      setError('Nepodarilo sa ulozit nastavenia upozorneni.');
      return false;
    } finally {
      setSavingKey((current) => (current === key ? null : current));
    }
  }

  return {
    preferences,
    loading,
    savingKey,
    error,
    updatePreference,
  };
}
