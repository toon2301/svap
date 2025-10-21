'use client';

import { useState } from 'react';

export default function NotificationsModule() {
  const [masterToggleEnabled, setMasterToggleEnabled] = useState(false);
  const [likesEnabled, setLikesEnabled] = useState(false);
  const [likesCommentsEnabled, setLikesCommentsEnabled] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [likesForCommentsEnabled, setLikesForCommentsEnabled] = useState(false);
  const [skillRequestEnabled, setSkillRequestEnabled] = useState(false);

  // Uloženie predchádzajúcich stavov pred vypnutím všetkého
  const [previousStates, setPreviousStates] = useState({
    likes: false,
    likesComments: false,
    comments: false,
    likesForComments: false,
    skillRequest: false
  });

  // Handler pre hlavný prepínač
  const handleMasterToggleChange = (enabled: boolean) => {
    console.log('Master toggle changing to:', enabled);
    
    if (enabled) {
      // Uloženie aktuálnych stavov pred vypnutím
      setPreviousStates({
        likes: likesEnabled,
        likesComments: likesCommentsEnabled,
        comments: commentsEnabled,
        likesForComments: likesForCommentsEnabled,
        skillRequest: skillRequestEnabled
      });
      
      // Vypnutie všetkých upozornení
      setLikesEnabled(false);
      setLikesCommentsEnabled(false);
      setCommentsEnabled(false);
      setLikesForCommentsEnabled(false);
      setSkillRequestEnabled(false);
    } else {
      // Obnovenie predchádzajúcich stavov
      setLikesEnabled(previousStates.likes);
      setLikesCommentsEnabled(previousStates.likesComments);
      setCommentsEnabled(previousStates.comments);
      setLikesForCommentsEnabled(previousStates.likesForComments);
      setSkillRequestEnabled(previousStates.skillRequest);
    }
    
    setMasterToggleEnabled(enabled);
  };

  return (
    <>
      {/* Desktop layout */}
      <div className="hidden lg:block pt-4 pb-8 pl-12 text-[var(--foreground)]">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 text-center -ml-[31rem]">
          Upozornenia
        </h2>
        
        {/* Hlavný prepínač "Vypnúť všetko" */}
        <div className="mt-6 mx-auto w-full max-w-[40rem]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Vypnúť všetko
            </span>
            <button
              type="button"
              onClick={() => {
                console.log('Current state:', masterToggleEnabled);
                handleMasterToggleChange(!masterToggleEnabled);
              }}
              style={{
                position: 'relative',
                display: 'inline-flex',
                height: '24px',
                width: '44px',
                alignItems: 'center',
                borderRadius: '9999px',
                backgroundColor: masterToggleEnabled ? '#c084fc' : '#d1d5db',
                transition: 'all 0.2s ease-in-out',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: masterToggleEnabled ? '22px' : '2px',
                  height: '20px',
                  width: '20px',
                  borderRadius: '50%',
                  backgroundColor: masterToggleEnabled ? 'white' : '#f3f4f6',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              />
            </button>
          </div>
        </div>

        {/* Deliaca čiara */}
        <div className="mt-8 mx-auto w-full max-w-[50rem]">
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        
        {/* Páči sa mi to sekcia - pekne viditeľná priamo pod nadpisom */}
        <div className="mt-6 mx-auto w-full max-w-[40rem]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-6 pt-6 pb-3 min-h-36 shadow-sm">
            <div className="flex items-center justify-between h-full">
              {/* Left column: title + options */}
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Páči sa mi to
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Zapnite alebo vypnite upozornenia na 'Páči sa mi to'.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="likes"
                      checked={!likesEnabled}
                      onChange={() => setLikesEnabled(false)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Vypnuté
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="likes"
                      checked={likesEnabled}
                      onChange={() => setLikesEnabled(true)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Zapnuté
                    </span>
                  </label>
                </div>
              </div>

              {/* Right: heart icon vertically centered */}
              <svg className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Deliaca čiara */}
        <div className="mt-8 mx-auto w-full max-w-[50rem]">
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        {/* Komentáre na fotkách sekcia */}
        <div className="mt-6 mx-auto w-full max-w-[40rem]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-6 pt-6 pb-3 min-h-36 shadow-sm">
            <div className="flex items-center justify-between h-full">
              {/* Left column: title + options */}
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Páči sa mi to a komentáre
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Reakcie a komentáre na fotkách, kde ste označení
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="likes-comments"
                      checked={!likesCommentsEnabled}
                      onChange={() => setLikesCommentsEnabled(false)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Vypnuté
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="likes-comments"
                      checked={likesCommentsEnabled}
                      onChange={() => setLikesCommentsEnabled(true)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Zapnuté
                    </span>
                  </label>
                </div>
              </div>

              {/* Right: comment and heart icons vertically centered */}
              <div className="flex items-center space-x-2 self-center flex-shrink-0">
                <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Deliaca čiara */}
        <div className="mt-8 mx-auto w-full max-w-[50rem]">
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        {/* Komentáre sekcia */}
        <div className="mt-6 mx-auto w-full max-w-[40rem]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-6 pt-6 pb-3 min-h-36 shadow-sm">
            <div className="flex items-center justify-between h-full">
              {/* Left column: title + options */}
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Komentáre
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Zapnite alebo vypnite upozornenia na komentáre.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="comments-general"
                      checked={!commentsEnabled}
                      onChange={() => setCommentsEnabled(false)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Vypnuté
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="comments-general"
                      checked={commentsEnabled}
                      onChange={() => setCommentsEnabled(true)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Zapnuté
                    </span>
                  </label>
                </div>
              </div>

              {/* Right: comment icon vertically centered */}
              <svg className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Deliaca čiara */}
        <div className="mt-8 mx-auto w-full max-w-[50rem]">
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        {/* Páči sa mi to pre komentáre sekcia */}
        <div className="mt-6 mx-auto w-full max-w-[40rem]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-6 pt-6 pb-3 min-h-36 shadow-sm">
            <div className="flex items-center justify-between h-full">
              {/* Left column: title + options */}
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Páči sa mi to pre komentáre
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Zapnite alebo vypnite upozornenia na 'Páči sa mi to' pre komentáre.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="likes-for-comments"
                      checked={!likesForCommentsEnabled}
                      onChange={() => setLikesForCommentsEnabled(false)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Vypnuté
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="likes-for-comments"
                      checked={likesForCommentsEnabled}
                      onChange={() => setLikesForCommentsEnabled(true)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Zapnuté
                    </span>
                  </label>
                </div>
              </div>

              {/* Right: heart icon vertically centered */}
              <svg className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Deliaca čiara */}
        <div className="mt-8 mx-auto w-full max-w-[50rem]">
          <div className="border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        {/* Žiadosť o zručnosť sekcia */}
        <div className="mt-6 mx-auto w-full max-w-[40rem]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-6 pt-6 pb-3 min-h-36 shadow-sm">
            <div className="flex items-center justify-between h-full">
              {/* Left column: title + options */}
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Žiadosť o zručnosť
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Zapnite alebo vypnite upozornenia na žiadosti o zručnosť.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="skill-request"
                      checked={!skillRequestEnabled}
                      onChange={() => setSkillRequestEnabled(false)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Vypnuté
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="skill-request"
                      checked={skillRequestEnabled}
                      onChange={() => setSkillRequestEnabled(true)}
                      disabled={masterToggleEnabled}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 focus:ring-0 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      Zapnuté
                    </span>
                  </label>
                </div>
              </div>

              {/* Right: skill icon vertically centered */}
              <svg className="w-16 h-16 text-gray-500 dark:text-gray-400 self-center flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

