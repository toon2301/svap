/**
 * Vytvorí iniciály z mena používateľa
 */
export function getUserInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? ''}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}


