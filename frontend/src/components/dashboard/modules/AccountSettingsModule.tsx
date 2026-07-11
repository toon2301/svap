'use client';

import { useEffect } from 'react';
import { ChevronRightIcon, EnvelopeIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '../../../types';
import DeleteAccountSection from './settings/DeleteAccountSection';
import VerifyEmailSection from './profile/VerifyEmailSection';
import SettingsDetailHeader from './settings/SettingsDetailHeader';

export type AccountSettingsMobileView = 'overview' | 'verify-email' | 'delete-account';

type AccountSettingsModuleProps = {
  user: User;
  onBack?: () => void;
  mobileView?: AccountSettingsMobileView;
  onMobileViewChange?: (view: AccountSettingsMobileView) => void;
};

function AccountSettingsMobileOption({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof EnvelopeIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300 dark:border-gray-800 dark:bg-[#101011] dark:text-white dark:hover:bg-[#151517]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-[#18181b] dark:text-gray-300">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
    </button>
  );
}

export default function AccountSettingsModule({
  user,
  onBack,
  mobileView = 'overview',
  onMobileViewChange,
}: AccountSettingsModuleProps) {
  const { t } = useLanguage();
  const canVerifyEmail = !user.is_verified;
  const visibleMobileView = mobileView === 'verify-email' && !canVerifyEmail ? 'overview' : mobileView;

  useEffect(() => {
    if (mobileView === 'verify-email' && !canVerifyEmail) {
      onMobileViewChange?.('overview');
    }
  }, [canVerifyEmail, mobileView, onMobileViewChange]);

  return (
    <div className="text-[var(--foreground)]">
      <div className="hidden lg:flex items-start justify-center">
        <div className="flex flex-col items-start w-full profile-edit-column pt-4 pb-8">
          <div className="w-full">
            <SettingsDetailHeader
              title={t('rightSidebar.account', 'Účet')}
              backLabel={t('common.back', 'Späť')}
              onBack={onBack}
            />
          </div>

          <div className="w-full mt-[clamp(1rem,2vw,1.5rem)]">
            <div className="border-t border-gray-200 dark:border-gray-700" />
          </div>

          <VerifyEmailSection user={user} variant="neutral" />

          <DeleteAccountSection user={user} variant="neutral" />
        </div>
      </div>
      <div
        className="block lg:hidden min-h-[40vh] px-4 pt-2 pb-6"
        aria-label={t('rightSidebar.account', 'Účet')}
        data-testid="account-settings-mobile"
      >
        {visibleMobileView === 'overview' ? (
          <div className="space-y-3" data-testid="account-settings-mobile-overview">
            {canVerifyEmail && (
              <AccountSettingsMobileOption
                icon={EnvelopeIcon}
                label={t('profile.verifyEmailButton', 'Overiť email')}
                onClick={() => onMobileViewChange?.('verify-email')}
              />
            )}
            <AccountSettingsMobileOption
              icon={TrashIcon}
              label={t('deleteAccount.sectionTitle', 'Zmazať účet')}
              onClick={() => onMobileViewChange?.('delete-account')}
            />
          </div>
        ) : visibleMobileView === 'verify-email' ? (
          <div className="pt-1" data-testid="account-settings-mobile-detail">
            <VerifyEmailSection user={user} variant="neutral" hideTitle />
          </div>
        ) : (
          <div className="pt-1" data-testid="account-settings-mobile-detail">
            <DeleteAccountSection user={user} variant="neutral" hideTitle />
          </div>
        )}
      </div>
    </div>
  );
}
