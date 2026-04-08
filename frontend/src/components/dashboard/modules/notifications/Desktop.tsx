'use client';

import React from 'react';

import MasterToggle from './MasterToggle';
import Section from './Section';

interface NotificationsLabels {
  title: string;
  turnOffAll: string;
  loadingPreferences: string;
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

interface DesktopProps {
  labels: NotificationsLabels;
  state: NotificationsState;
  setState: NotificationsSetState;
  labelsCommon: {
    off: string;
    on: string;
  };
  pushMessages: PushMessagesProps;
}

function Divider() {
  return (
    <div className="w-full mt-[clamp(1rem,3vw,2rem)]">
      <div className="border-t border-gray-200 dark:border-gray-700" />
    </div>
  );
}

export default function Desktop({
  labels,
  state,
  setState,
  labelsCommon,
  pushMessages,
}: DesktopProps) {
  const sectionCards = [
    {
      key: 'likes',
      title: labels.likes,
      description: labels.likesDesc,
      value: state.likes,
      setValue: setState.setLikes,
      icon: (
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
    },
    {
      key: 'likes-comments',
      title: labels.likesAndComments,
      description: labels.likesAndCommentsDesc,
      value: state.likesComments,
      setValue: setState.setLikesComments,
      icon: (
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
    },
    {
      key: 'comments',
      title: labels.comments,
      description: labels.commentsDesc,
      value: state.comments,
      setValue: setState.setComments,
      icon: (
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
    },
    {
      key: 'likes-for-comments',
      title: labels.likesForComments,
      description: labels.likesForCommentsDesc,
      value: state.likesForComments,
      setValue: setState.setLikesForComments,
      icon: (
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
    },
    {
      key: 'skill-request',
      title: labels.skillRequest,
      description: labels.skillRequestDesc,
      value: state.skillRequest,
      setValue: setState.setSkillRequest,
      icon: (
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
    },
  ];

  return (
    <div className="hidden lg:flex items-start justify-center text-[var(--foreground)]">
      <div className="flex flex-col items-start w-full profile-edit-column pt-4 pb-8">
        <div className="w-full">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
            {labels.title}
          </h2>
        </div>

        <div className="w-full mt-[clamp(1rem,2vw,1.5rem)]">
          <MasterToggle
            enabled={state.master}
            onChange={setState.setMaster}
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
          {pushMessages.loading && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {labels.loadingPreferences}
            </p>
          )}
          {pushMessages.error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {pushMessages.error}
            </p>
          )}
        </div>

        {sectionCards.map((section) => (
          <React.Fragment key={section.key}>
            <Divider />
            <div className="w-full mt-[clamp(1rem,2vw,1.5rem)]">
              <Section
                title={section.title}
                description={section.description}
                value={section.value}
                setValue={section.setValue}
                disabled={state.master}
                desktop
                offLabel={labelsCommon.off}
                onLabel={labelsCommon.on}
                icon={section.icon}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
