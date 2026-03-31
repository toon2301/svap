'use client';

import React from 'react';

import MasterToggle from './MasterToggle';
import OptionRow from './OptionRow';

interface NotificationsLabels {
  turnOffAll: string;
  turnOffAllDesc: string;
  messagesPush: string;
  messagesPushDesc: string;
  likes: string;
  likesDesc: string;
  likesAndComments: string;
  likesAndCommentsDesc: string;
  comments: string;
  commentsDesc: string;
  likesForComments: string;
  likesForCommentsDesc: string;
  skillRequest: string;
  skillRequestDesc: string;
}

interface NotificationsState {
  master: boolean;
  likes: boolean;
  likesComments: boolean;
  comments: boolean;
  likesForComments: boolean;
  skillRequest: boolean;
}

interface NotificationsSetState {
  setMaster: (value: boolean) => void;
  setLikes: (value: boolean) => void;
  setLikesComments: (value: boolean) => void;
  setComments: (value: boolean) => void;
  setLikesForComments: (value: boolean) => void;
  setSkillRequest: (value: boolean) => void;
}

interface PushMessagesProps {
  value: boolean;
  disabled: boolean;
  loading: boolean;
  error: string | null;
  onChange: (value: boolean) => void;
}

interface MobileProps {
  labels: NotificationsLabels;
  state: NotificationsState;
  setState: NotificationsSetState;
  labelsCommon: {
    off: string;
    on: string;
  };
  pushMessages: PushMessagesProps;
}

export default function Mobile({
  labels,
  state,
  setState,
  labelsCommon,
  pushMessages,
}: MobileProps) {
  const sections = [
    {
      key: 'likes',
      title: labels.likes,
      description: labels.likesDesc,
      value: state.likes,
      setValue: setState.setLikes,
      disabled: state.master,
    },
    {
      key: 'likes-comments',
      title: labels.likesAndComments,
      description: labels.likesAndCommentsDesc,
      value: state.likesComments,
      setValue: setState.setLikesComments,
      disabled: state.master,
    },
    {
      key: 'comments',
      title: labels.comments,
      description: labels.commentsDesc,
      value: state.comments,
      setValue: setState.setComments,
      disabled: state.master,
    },
    {
      key: 'likes-for-comments',
      title: labels.likesForComments,
      description: labels.likesForCommentsDesc,
      value: state.likesForComments,
      setValue: setState.setLikesForComments,
      disabled: state.master,
    },
    {
      key: 'skill-request',
      title: labels.skillRequest,
      description: labels.skillRequestDesc,
      value: state.skillRequest,
      setValue: setState.setSkillRequest,
      disabled: state.master,
    },
  ];

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
            enabled={state.master}
            onChange={setState.setMaster}
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
          {pushMessages.loading && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Nacitam nastavenia upozorneni...
            </p>
          )}
          {pushMessages.error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {pushMessages.error}
            </p>
          )}
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700" />

        {sections.map((section) => (
          <React.Fragment key={section.key}>
            <div className="p-4 rounded-lg bg-[var(--background)]">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {section.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {section.description}
                </p>
              </div>
              <div className="space-y-0">
                <OptionRow
                  label={labelsCommon.off}
                  selected={!section.value}
                  disabled={section.disabled}
                  onSelect={() => section.setValue(false)}
                />
                <div className="-mt-1" />
                <OptionRow
                  label={labelsCommon.on}
                  selected={section.value}
                  disabled={section.disabled}
                  onSelect={() => section.setValue(true)}
                  rightDot
                />
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700" />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
