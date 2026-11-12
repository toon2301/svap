'use client';

import React from 'react';

import SettingsDetailHeader from '../settings/SettingsDetailHeader';
import MasterToggle from './MasterToggle';
import PushMessagesStatus from './PushMessagesStatus';
import Section from './Section';
import type {
  NotificationCategoryId,
  NotificationCategoryRow,
  NotificationsCommonLabels,
  NotificationsLabels,
  NotificationsMaster,
  PushMessagesProps,
} from './settingsTypes';

interface DesktopProps {
  labels: NotificationsLabels;
  labelsCommon: NotificationsCommonLabels;
  master: NotificationsMaster;
  categories: NotificationCategoryRow[];
  pushMessages: PushMessagesProps;
  onBack?: () => void;
}

function Divider() {
  return (
    <div className="w-full mt-[clamp(1rem,3vw,2rem)]">
      <div className="border-t border-gray-200 dark:border-gray-700" />
    </div>
  );
}

/** Ikony kategórií na počítači (rovnaké ako doteraz). */
const CATEGORY_ICONS: Record<NotificationCategoryId, React.ReactNode> = {
  likes: (
    <svg
      className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  ),
  'tags-and-shares': (
    <div className="flex items-center space-x-2 self-center flex-shrink-0">
      <svg
        className="w-8 h-8 text-gray-500 dark:text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <svg
        className="w-8 h-8 text-gray-500 dark:text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </div>
  ),
  comments: (
    <svg
      className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  'comment-likes': (
    <svg
      className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  ),
  'skill-requests': (
    <svg
      className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  ),
};

/**
 * Rozloženie Upozornení na počítači (od lg): hlavný vypínač „Vypnúť všetko“, voľba Správy (push) a päť kategórií.
 * Dostáva už hotové texty a riadky (kategórie s hodnotou, zablokovaním a príznakom načítavania), nepozná hooky ani
 * server. Kým sa kategória načítava, namiesto jej riadkov je kostra rovnakej výšky (nález 286, 321).
 */
export default function Desktop({
  labels,
  labelsCommon,
  master,
  categories,
  pushMessages,
  onBack,
}: DesktopProps) {
  return (
    <div className="hidden lg:flex items-start justify-center text-[var(--foreground)]">
      <div className="flex flex-col items-start w-full profile-edit-column pt-4 pb-8">
        <div className="w-full">
          <SettingsDetailHeader
            title={labels.title}
            backLabel={labels.back}
            onBack={onBack}
          />
        </div>

        <div className="w-full mt-[clamp(1rem,2vw,1.5rem)]">
          <MasterToggle
            enabled={master.enabled}
            onChange={master.onChange}
            label={labels.turnOffAll}
          />
        </div>

        <Divider />

        <div
          className="w-full mt-[clamp(1rem,2vw,1.5rem)]"
          data-testid="notifications-push-messages-desktop"
        >
          <Section
            title={labels.messagesPush}
            description={labels.messagesPushDesc}
            value={pushMessages.value}
            setValue={pushMessages.onChange}
            disabled={pushMessages.disabled}
            desktop
            offLabel={labelsCommon.off}
            onLabel={labelsCommon.on}
            loading={pushMessages.initialLoading}
            loadingLabel={labels.loadingPreferences}
            icon={
              <svg
                className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 12C2.25 7.444 6.164 3.75 11 3.75c4.836 0 8.75 3.694 8.75 8.25S15.836 20.25 11 20.25c-1.495 0-2.902-.352-4.126-.975L3.75 20.25l.955-2.63A7.98 7.98 0 012.25 12z"
                />
              </svg>
            }
          />
          <PushMessagesStatus
            loading={pushMessages.loading}
            initialLoading={pushMessages.initialLoading}
            loadingLabel={labels.loadingPreferences}
            error={pushMessages.error}
          />
        </div>

        {categories.map((category) => (
          <React.Fragment key={category.id}>
            <Divider />
            <div
              className="w-full mt-[clamp(1rem,2vw,1.5rem)]"
              data-testid={`notifications-category-${category.id}-desktop`}
            >
              <Section
                title={category.title}
                description={category.description}
                value={category.value}
                setValue={category.onChange}
                disabled={category.disabled}
                desktop
                offLabel={labelsCommon.off}
                onLabel={labelsCommon.on}
                loading={category.loading}
                loadingLabel={labels.loadingPreferences}
                icon={CATEGORY_ICONS[category.id]}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
