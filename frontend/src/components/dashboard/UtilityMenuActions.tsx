'use client';

import type { RefObject } from 'react';
import {
  ArrowRightOnRectangleIcon,
  BugAntIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

import { requestBugReportDialog } from './modules/bug-report/bugReportDialogEvents';

type UtilityMenuActionsProps = {
  firstItemRef?: RefObject<HTMLButtonElement>;
  onActionComplete: () => void;
  onBugReportOpen?: () => void;
  onLogout: () => void;
};

const ITEM_CLASS_NAME =
  'flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors';

export default function UtilityMenuActions({
  firstItemRef,
  onActionComplete,
  onBugReportOpen,
  onLogout,
}: UtilityMenuActionsProps) {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const openBugReport = () => {
    onActionComplete();
    onBugReportOpen?.();
    requestBugReportDialog();
  };

  const changeTheme = () => {
    onActionComplete();
    toggleTheme();
  };

  const logout = () => {
    onActionComplete();
    onLogout();
  };

  return (
    <>
      <button
        ref={firstItemRef}
        type="button"
        onClick={openBugReport}
        className={`${ITEM_CLASS_NAME} text-gray-700 hover:bg-purple-50 hover:text-purple-700 dark:text-gray-200 dark:hover:bg-purple-950/40 dark:hover:text-purple-300`}
      >
        <BugAntIcon
          className="mr-3 h-5 w-5 text-purple-600 dark:text-purple-400"
          aria-hidden="true"
        />
        {t('bugReport.navigationLabel', 'Nahlásiť problém')}
      </button>

      <button
        type="button"
        onClick={changeTheme}
        className={`${ITEM_CLASS_NAME} text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-900`}
      >
        {theme === 'dark' ? (
          <SunIcon
            className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
        ) : (
          <MoonIcon
            className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
        )}
        {theme === 'dark'
          ? t('common.lightMode', 'Svetlý režim')
          : t('common.darkMode', 'Tmavý režim')}
      </button>

      <div className="my-1 border-t border-gray-200 dark:border-gray-800" aria-hidden="true" />

      <button
        type="button"
        onClick={logout}
        className={`${ITEM_CLASS_NAME} text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/30`}
      >
        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" aria-hidden="true" />
        {t('navigation.logout', 'Odhlásiť sa')}
      </button>
    </>
  );
}
