'use client';

import React from 'react';
import MasterToggle from './MasterToggle';
import OptionRow from './OptionRow';

interface MobileProps {
  labels: {
    turnOffAll: string;
    turnOffAllDesc: string;
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
  };
  state: {
    master: boolean;
    likes: boolean;
    likesComments: boolean;
    comments: boolean;
    likesForComments: boolean;
    skillRequest: boolean;
  };
  setState: {
    setMaster: (v: boolean) => void;
    setLikes: (v: boolean) => void;
    setLikesComments: (v: boolean) => void;
    setComments: (v: boolean) => void;
    setLikesForComments: (v: boolean) => void;
    setSkillRequest: (v: boolean) => void;
  };
  labelsCommon: {
    off: string;
    on: string;
  };
}

export default function Mobile({ labels, state, setState, labelsCommon }: MobileProps) {
  return (
    <div className="lg:hidden px-4 pt-2 pb-6 text-[var(--foreground)]">
      <div className="space-y-0">
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{labels.turnOffAll}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{labels.turnOffAllDesc}</div>
          </div>
          <MasterToggle enabled={state.master} onChange={setState.setMaster} label="" compact />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Section: Likes */}
        <div className="p-4 rounded-lg bg-[var(--background)]">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{labels.likes}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{labels.likesDesc}</p>
          </div>
          <div className="space-y-0">
            <OptionRow label={labelsCommon.off} selected={!state.likes} disabled={state.master} onSelect={() => setState.setLikes(false)} />
            <div className="-mt-1" />
            <OptionRow label={labelsCommon.on} selected={state.likes} disabled={state.master} onSelect={() => setState.setLikes(true)} rightDot />
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Section: Likes and Comments */}
        <div className="p-4 rounded-lg bg-[var(--background)]">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{labels.likesAndComments}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{labels.likesAndCommentsDesc}</p>
          </div>
          <div className="space-y-0">
            <OptionRow label={labelsCommon.off} selected={!state.likesComments} disabled={state.master} onSelect={() => setState.setLikesComments(false)} />
            <div className="-mt-1" />
            <OptionRow label={labelsCommon.on} selected={state.likesComments} disabled={state.master} onSelect={() => setState.setLikesComments(true)} rightDot />
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Section: Comments */}
        <div className="p-4 rounded-lg bg-[var(--background)]">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{labels.comments}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{labels.commentsDesc}</p>
          </div>
          <div className="space-y-0">
            <OptionRow label={labelsCommon.off} selected={!state.comments} disabled={state.master} onSelect={() => setState.setComments(false)} />
            <div className="-mt-1" />
            <OptionRow label={labelsCommon.on} selected={state.comments} disabled={state.master} onSelect={() => setState.setComments(true)} rightDot />
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Section: Likes for Comments */}
        <div className="p-4 rounded-lg bg-[var(--background)]">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{labels.likesForComments}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{labels.likesForCommentsDesc}</p>
          </div>
          <div className="space-y-0">
            <OptionRow label={labelsCommon.off} selected={!state.likesForComments} disabled={state.master} onSelect={() => setState.setLikesForComments(false)} />
            <div className="-mt-1" />
            <OptionRow label={labelsCommon.on} selected={state.likesForComments} disabled={state.master} onSelect={() => setState.setLikesForComments(true)} rightDot />
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700"></div>

        {/* Section: Skill Request */}
        <div className="p-4 rounded-lg bg-[var(--background)]">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{labels.skillRequest}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{labels.skillRequestDesc}</p>
          </div>
          <div className="space-y-0">
            <OptionRow label={labelsCommon.off} selected={!state.skillRequest} disabled={state.master} onSelect={() => setState.setSkillRequest(false)} />
            <div className="-mt-1" />
            <OptionRow label={labelsCommon.on} selected={state.skillRequest} disabled={state.master} onSelect={() => setState.setSkillRequest(true)} rightDot />
          </div>
        </div>
      </div>
    </div>
  );
}


