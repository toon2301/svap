'use client';

type AccountType = 'personal' | 'business';

export interface ProfileNameSource {
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  user_type?: string | null;
}

function clean(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getIndividualDisplayName(user: ProfileNameSource): string {
  const fullName = [clean(user.first_name), clean(user.last_name)].filter(Boolean).join(' ');
  return fullName || clean(user.username);
}

export function getCompanyDisplayName(user: ProfileNameSource): string {
  return clean(user.company_name) || clean(user.username);
}

export function getProfileDisplayName(
  user: ProfileNameSource,
  accountType?: AccountType,
): string {
  const isBusiness = accountType
    ? accountType === 'business'
    : clean(user.user_type) === 'company';

  return isBusiness ? getCompanyDisplayName(user) : getIndividualDisplayName(user);
}
