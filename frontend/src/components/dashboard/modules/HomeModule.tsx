'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Čistý základ Nástenky pripravený pre budúci feed príspevkov.
 * Onboardingový target zostáva na Nástenke, hoci pôvodný obsah sa presunul.
 */
export default function HomeModule() {
  const { t } = useLanguage();

  return (
    <section
      data-onboarding="home-welcome"
      data-testid="home-feed-root"
      aria-labelledby="home-feed-title"
      className="min-h-[40vh]"
    >
      <h1
        id="home-feed-title"
        className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl"
      >
        {t('navigation.home', 'Nástenka')}
      </h1>
    </section>
  );
}
