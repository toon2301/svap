'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import FeedList from './feed/FeedList';

/**
 * Nástenka = feed príspevkov.
 *
 * ``data-onboarding="home-welcome"`` MUSÍ zostať na tej istej sekcii ako
 * predtým – je to cieľ onboardingu. Feed sa preto pridáva POD nadpis vnútri
 * rovnakej sekcie, nie vedľa nej, aby onboarding ukazoval na nezmenený prvok.
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

      <div className="mx-auto mt-5 max-w-2xl pb-10">
        <FeedList />
      </div>
    </section>
  );
}
