'use client';

export const PROFILE_LIKED_EVENT = 'profile:profile-liked';

export type ProfileLikedPayload = {
  profileUserId: number;
};

function parsePositiveInteger(value: unknown): number | null {
  const id = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return id;
}

export function parseProfileLikedUserId(value: unknown): number | null {
  return parsePositiveInteger(value);
}

export function dispatchProfileLiked(payload: ProfileLikedPayload): void {
  if (typeof window === 'undefined') return;
  const profileUserId = parseProfileLikedUserId(payload.profileUserId);
  if (profileUserId === null) return;

  window.dispatchEvent(
    new CustomEvent<ProfileLikedPayload>(PROFILE_LIKED_EVENT, {
      detail: { profileUserId },
    }),
  );
}

export function readProfileLikedEvent(event: Event): ProfileLikedPayload | null {
  const detail = (event as CustomEvent<Partial<ProfileLikedPayload>>).detail;
  const profileUserId = parseProfileLikedUserId(detail?.profileUserId);
  return profileUserId === null ? null : { profileUserId };
}
