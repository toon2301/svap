'use client';

import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

const ParticlesBackground = lazy(() => import('../ParticlesBackground'));

const WHAT_YOU_CAN_DO_KEYS = [
  'about.whatYouCanDo.item1',
  'about.whatYouCanDo.item2',
  'about.whatYouCanDo.item3',
  'about.whatYouCanDo.item4',
  'about.whatYouCanDo.item5',
  'about.whatYouCanDo.item6',
] as const;

const WHO_IS_IT_FOR_KEYS = [
  'about.whoIsItFor.item1',
  'about.whoIsItFor.item2',
  'about.whoIsItFor.item3',
  'about.whoIsItFor.item4',
] as const;

const VALUE_KEYS = [
  { title: 'about.values.simplicity.title', description: 'about.values.simplicity.description' },
  { title: 'about.values.realPeople.title', description: 'about.values.realPeople.description' },
  { title: 'about.values.opportunities.title', description: 'about.values.opportunities.description' },
  { title: 'about.values.clarity.title', description: 'about.values.clarity.description' },
] as const;

const sectionMotion = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.55, ease: 'easeOut' },
};

function BulletList({ keys, t }: { keys: readonly string[]; t: (key: string, fallback?: string) => string }) {
  return (
    <ul className="mt-4 space-y-3 text-gray-600 dark:text-gray-300">
      {keys.map((key) => (
        <li key={key} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-600" aria-hidden />
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col relative bg-[var(--background)]">
      <Suspense fallback={<div className="absolute inset-0 z-0 hidden lg:block" />}>
        <ParticlesBackground />
      </Suspense>

      <header className="relative z-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-black/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-purple-800 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
          >
            ← {t('about.backToHome', 'Späť na úvod')}
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <div className="max-w-4xl mx-auto px-4 py-10 lg:py-14 space-y-14 lg:space-y-20">
          <motion.section {...sectionMotion} className="text-center">
            <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-gray-900 dark:text-white leading-tight">
              {t('about.hero.title')}
            </h1>
            <p className="mt-4 text-[clamp(1rem,2vw,1.125rem)] text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
              {t('about.hero.subtitle')}
            </p>
          </motion.section>

          <motion.section {...sectionMotion}>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('about.why.title')}
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('about.why.body')}
            </p>
          </motion.section>

          <motion.section {...sectionMotion}>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('about.whatYouCanDo.title')}
            </h2>
            <BulletList keys={WHAT_YOU_CAN_DO_KEYS} t={t} />
          </motion.section>

          <motion.section {...sectionMotion}>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('about.whoIsItFor.title')}
            </h2>
            <BulletList keys={WHO_IS_IT_FOR_KEYS} t={t} />
          </motion.section>

          <motion.section {...sectionMotion}>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('about.values.title')}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {VALUE_KEYS.map(({ title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t(title)}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t(description)}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            {...sectionMotion}
            className="rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 px-6 py-10 text-center"
          >
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('about.cta.title')}
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
              {t('about.cta.text')}
            </p>
            <Link
              href="/register"
              className="mt-6 inline-block bg-purple-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-purple-700 transition-colors"
            >
              {t('about.cta.button')}
            </Link>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
