'use client';

import React, { useState, useEffect } from 'react';
import MasterToggle from './MasterToggle';
import Section from './Section';

interface DesktopProps {
  labels: {
    title: string;
    turnOffAll: string;
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

export default function Desktop({ labels, state, setState, labelsCommon }: DesktopProps) {
  const [isSmallDesktop, setIsSmallDesktop] = useState(false);

  useEffect(() => {
    const checkSmallDesktop = () => {
      const width = window.innerWidth;
      // Malé desktopy: 1024px < width <= 1440px (napr. 1280×720, 1366×768)
      setIsSmallDesktop(width > 1024 && width <= 1440);
    };
    
    checkSmallDesktop();
    window.addEventListener('resize', checkSmallDesktop);
    return () => window.removeEventListener('resize', checkSmallDesktop);
  }, []);

  return (
    <div className="hidden lg:flex items-start justify-center text-[var(--foreground)]">
      <div 
        className="flex flex-col items-start w-full mx-auto"
        style={{
          maxWidth: isSmallDesktop ? '520px' : '768px', // max-w-3xl = 768px
          marginLeft: isSmallDesktop ? '120px' : undefined
        }}
      >
        <div 
          className="w-full"
          style={{
            marginLeft: isSmallDesktop ? '0' : undefined
          }}
        >
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">{labels.title}</h2>
        </div>

      <div className="w-full mx-auto" style={{ maxWidth: isSmallDesktop ? '520px' : '512px', marginTop: isSmallDesktop ? '1rem' : '1.5rem' }}>
        <MasterToggle enabled={state.master} onChange={setState.setMaster} label={labels.turnOffAll} />
      </div>

      <div className="w-full max-w-6xl mx-auto" style={{ marginTop: isSmallDesktop ? '1rem' : '2rem' }}><div className="border-t border-gray-200 dark:border-gray-700" /></div>

      <div className="w-full mx-auto" style={{ maxWidth: isSmallDesktop ? '520px' : '512px', marginTop: isSmallDesktop ? '1rem' : '1.5rem' }}>
        <Section
          title={labels.likes}
          description={labels.likesDesc}
          value={state.likes}
          setValue={setState.setLikes}
          disabled={state.master}
          desktop
          offLabel={labelsCommon.off}
          onLabel={labelsCommon.on}
          icon={<svg className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>}
        />
      </div>

      <div className="w-full max-w-6xl mx-auto" style={{ marginTop: isSmallDesktop ? '1rem' : '2rem' }}><div className="border-t border-gray-200 dark:border-gray-700" /></div>

      <div className="w-full mx-auto" style={{ maxWidth: isSmallDesktop ? '520px' : '512px', marginTop: isSmallDesktop ? '1rem' : '1.5rem' }}>
        <Section
          title={labels.likesAndComments}
          description={labels.likesAndCommentsDesc}
          value={state.likesComments}
          setValue={setState.setLikesComments}
          disabled={state.master}
          desktop
          offLabel={labelsCommon.off}
          onLabel={labelsCommon.on}
          icon={<div className="flex items-center space-x-2 self-center flex-shrink-0"><svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg></div>}
        />
      </div>

      <div className="w-full max-w-6xl mx-auto" style={{ marginTop: isSmallDesktop ? '1rem' : '2rem' }}><div className="border-t border-gray-200 dark:border-gray-700" /></div>

      <div className="w-full mx-auto" style={{ maxWidth: isSmallDesktop ? '520px' : '512px', marginTop: isSmallDesktop ? '1rem' : '1.5rem' }}>
        <Section
          title={labels.comments}
          description={labels.commentsDesc}
          value={state.comments}
          setValue={setState.setComments}
          disabled={state.master}
          desktop
          offLabel={labelsCommon.off}
          onLabel={labelsCommon.on}
          icon={<svg className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
        />
      </div>

      <div className="w-full max-w-6xl mx-auto" style={{ marginTop: isSmallDesktop ? '1rem' : '2rem' }}><div className="border-t border-gray-200 dark:border-gray-700" /></div>

      <div className="w-full mx-auto" style={{ maxWidth: isSmallDesktop ? '520px' : '512px', marginTop: isSmallDesktop ? '1rem' : '1.5rem' }}>
        <Section
          title={labels.likesForComments}
          description={labels.likesForCommentsDesc}
          value={state.likesForComments}
          setValue={setState.setLikesForComments}
          disabled={state.master}
          desktop
          offLabel={labelsCommon.off}
          onLabel={labelsCommon.on}
          icon={<svg className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>}
        />
      </div>

      <div className="w-full max-w-6xl mx-auto" style={{ marginTop: isSmallDesktop ? '1rem' : '2rem' }}><div className="border-t border-gray-200 dark:border-gray-700" /></div>

      <div className="w-full mx-auto" style={{ maxWidth: isSmallDesktop ? '520px' : '512px', marginTop: isSmallDesktop ? '1rem' : '1.5rem' }}>
        <Section
          title={labels.skillRequest}
          description={labels.skillRequestDesc}
          value={state.skillRequest}
          setValue={setState.setSkillRequest}
          disabled={state.master}
          desktop
          offLabel={labelsCommon.off}
          onLabel={labelsCommon.on}
          icon={<svg className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>}
        />
      </div>
      </div>
    </div>
  );
}


