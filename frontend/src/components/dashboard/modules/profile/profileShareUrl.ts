import type { User } from '../../../../types';

type ProfileShareUser = Pick<User, 'id' | 'slug' | 'username'>;

export function getProfileShareIdentifier(user: ProfileShareUser): string {
  const slug = user.slug?.trim();
  if (slug) return slug;

  return String(user.id);
}

export function buildProfileSharePath(user: ProfileShareUser): string {
  return `/dashboard/users/${encodeURIComponent(getProfileShareIdentifier(user))}`;
}

export function buildProfileShareUrl(user: ProfileShareUser, origin?: string): string {
  const path = buildProfileSharePath(user);
  const baseOrigin =
    origin?.replace(/\/+$/, '') ??
    (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');

  return baseOrigin ? `${baseOrigin}${path}` : path;
}
