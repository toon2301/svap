'use client';

import React from 'react';

import MasterToggle from './MasterToggle';
import OptionRow from './OptionRow';
import OptionRowsSkeleton from './OptionRowsSkeleton';
import PushMessagesStatus from './PushMessagesStatus';
import type {
  NotificationCategoryRow,
  NotificationsCommonLabels,
  NotificationsLabels,
  NotificationsMaster,
  PushMessagesProps,
} from './settingsTypes';

interface MobileProps {
  labels: NotificationsLabels;
  labelsCommon: NotificationsCommonLabels;
  master: NotificationsMaster;
  categories: NotificationCategoryRow[];
  pushMessages: PushMessagesProps;
}

/**
 * Mobilné rozloženie Upozornení (pod lg): hlavný vypínač „Vypnúť všetko“, voľba Správy (push) a päť kategórií
 * „Vypnuté / Zapnuté“. Dostáva už hotové texty a riadky (kategórie s hodnotou, zablokovaním a príznakom načítavania),
 * nepozná hooky ani server. Kým sa uložená voľba Správ alebo kategória načíta, namiesto jej riadkov je kostra a stavový
 * riadok pod Správami drží výšku, aby sa nič neposúvalo (nález 286). Obal `notifications-push-messages-mobile` je v DOM
 * od prvého snímku.
 */
export default function Mobile({
  labels,
  labelsCommon,
  master,
  categories,
  pushMessages,
}: MobileProps) {
  return (
    <div className="lg:hidden px-4 pt-2 pb-6 text-[var(--foreground)]">
      <div className="space-y-0">
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {labels.turnOffAll}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {labels.turnOffAllDesc}
            </div>
          </div>
          <MasterToggle
            enabled={master.enabled}
            onChange={master.onChange}
            label=""
            compact
          />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700" />

        <div
          className="p-4 rounded-lg bg-[var(--background)]"
          data-testid="notifications-push-messages-mobile"
        >
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {labels.messagesPush}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {labels.messagesPushDesc}
            </p>
          </div>
          {pushMessages.initialLoading ? (
            <OptionRowsSkeleton
              label={labels.loadingPreferences}
              testId="notifications-push-skeleton-mobile"
            />
          ) : (
            <div className="space-y-0">
              <OptionRow
                label={labelsCommon.off}
                selected={!pushMessages.value}
                disabled={pushMessages.disabled}
                onSelect={() => pushMessages.onChange(false)}
              />
              <div className="-mt-1" />
              <OptionRow
                label={labelsCommon.on}
                selected={pushMessages.value}
                disabled={pushMessages.disabled}
                onSelect={() => pushMessages.onChange(true)}
                rightDot
              />
            </div>
          )}
          <PushMessagesStatus
            loading={pushMessages.loading}
            initialLoading={pushMessages.initialLoading}
            loadingLabel={labels.loadingPreferences}
            error={pushMessages.error}
          />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700" />

        {categories.map((category) => (
          <React.Fragment key={category.id}>
            <div
              className="p-4 rounded-lg bg-[var(--background)]"
              data-testid={`notifications-category-${category.id}-mobile`}
            >
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {category.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {category.description}
                </p>
              </div>
              {category.loading ? (
                <OptionRowsSkeleton
                  label={labels.loadingPreferences}
                  testId={`notifications-category-skeleton-${category.id}-mobile`}
                />
              ) : (
                <div className="space-y-0">
                  <OptionRow
                    label={labelsCommon.off}
                    selected={!category.value}
                    disabled={category.disabled}
                    onSelect={() => category.onChange(false)}
                  />
                  <div className="-mt-1" />
                  <OptionRow
                    label={labelsCommon.on}
                    selected={category.value}
                    disabled={category.disabled}
                    onSelect={() => category.onChange(true)}
                    rightDot
                  />
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700" />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
