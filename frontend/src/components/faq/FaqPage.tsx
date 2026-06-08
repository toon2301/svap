'use client';

import { lazy, Suspense, useId } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import FaqAccordion from './FaqAccordion';

const ParticlesBackground = lazy(() => import('../ParticlesBackground'));

const sectionMotion = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.55, ease: 'easeOut' },
};

const FAQ_SECTIONS = [
  {
    titleKey: 'faq.sections.whatIsSvaply.title',
    titleFallback: 'Čo je Svaply?',
    items: [
      {
        id: 'what-is-svaply',
        questionKey: 'faq.sections.whatIsSvaply.whatIsSvaply.question',
        answerKey: 'faq.sections.whatIsSvaply.whatIsSvaply.answer',
      },
      {
        id: 'who-is-it-for',
        questionKey: 'faq.sections.whatIsSvaply.whoIsItFor.question',
        answerKey: 'faq.sections.whatIsSvaply.whoIsItFor.answer',
      },
      {
        id: 'countries',
        questionKey: 'faq.sections.whatIsSvaply.countries.question',
        answerKey: 'faq.sections.whatIsSvaply.countries.answer',
      },
    ],
  },
  {
    titleKey: 'faq.sections.howItWorks.title',
    titleFallback: 'Ako to funguje?',
    items: [
      {
        id: 'getting-started',
        questionKey: 'faq.sections.howItWorks.gettingStarted.question',
        answerKey: 'faq.sections.howItWorks.gettingStarted.answer',
      },
      {
        id: 'offer-vs-demand',
        questionKey: 'faq.sections.howItWorks.offerVsDemand.question',
        answerKey: 'faq.sections.howItWorks.offerVsDemand.answer',
      },
      {
        id: 'local-services',
        questionKey: 'faq.sections.howItWorks.localServices.question',
        answerKey: 'faq.sections.howItWorks.localServices.answer',
      },
      {
        id: 'is-free',
        questionKey: 'faq.sections.howItWorks.isFree.question',
        answerKey: 'faq.sections.howItWorks.isFree.answer',
      },
      {
        id: 'payment',
        questionKey: 'faq.sections.howItWorks.payment.question',
        answerKey: 'faq.sections.howItWorks.payment.answer',
      },
      {
        id: 'communication',
        questionKey: 'faq.sections.howItWorks.communication.question',
        answerKey: 'faq.sections.howItWorks.communication.answer',
      },
    ],
  },
  {
    titleKey: 'faq.sections.profileOffers.title',
    titleFallback: 'Profil & Ponuky',
    items: [
      {
        id: 'anyone-can-add',
        questionKey: 'faq.sections.profileOffers.anyoneCanAdd.question',
        answerKey: 'faq.sections.profileOffers.anyoneCanAdd.answer',
      },
      {
        id: 'what-services',
        questionKey: 'faq.sections.profileOffers.whatServices.question',
        answerKey: 'faq.sections.profileOffers.whatServices.answer',
      },
      {
        id: 'identity-verification',
        questionKey: 'faq.sections.profileOffers.identityVerification.question',
        answerKey: 'faq.sections.profileOffers.identityVerification.answer',
      },
      {
        id: 'reviews',
        questionKey: 'faq.sections.profileOffers.reviews.question',
        answerKey: 'faq.sections.profileOffers.reviews.answer',
      },
    ],
  },
  {
    titleKey: 'faq.sections.securityPrivacy.title',
    titleFallback: 'Bezpečnosť & Súkromie',
    items: [
      {
        id: 'data-safety',
        questionKey: 'faq.sections.securityPrivacy.dataSafety.question',
        answerKey: 'faq.sections.securityPrivacy.dataSafety.answer',
      },
      {
        id: 'delete-account',
        questionKey: 'faq.sections.securityPrivacy.deleteAccount.question',
        answerKey: 'faq.sections.securityPrivacy.deleteAccount.answer',
      },
    ],
  },
  {
    titleKey: 'faq.sections.support.title',
    titleFallback: 'Problémy & Podpora',
    items: [
      {
        id: 'report-user',
        questionKey: 'faq.sections.support.reportUser.question',
        answerKey: 'faq.sections.support.reportUser.answer',
      },
      {
        id: 'unfulfilled-agreement',
        questionKey: 'faq.sections.support.unfulfilledAgreement.question',
        answerKey: 'faq.sections.support.unfulfilledAgreement.answer',
      },
      {
        id: 'contact-support',
        questionKey: 'faq.sections.support.contactSupport.question',
        answerKey: 'faq.sections.support.contactSupport.answer',
      },
    ],
  },
] as const;

export default function FaqPage() {
  const { t } = useLanguage();
  const sectionIdPrefix = useId().replace(/:/g, '');

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
            ← {t('faq.backToHome', 'Späť na úvod')}
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <div className="max-w-4xl mx-auto px-4 py-10 lg:py-14 space-y-12 lg:space-y-16">
          <motion.section {...sectionMotion} className="text-center">
            <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-gray-900 dark:text-white leading-tight">
              {t('faq.hero.title', 'Často kladené otázky')}
            </h1>
            <p className="mt-4 text-[clamp(1rem,2vw,1.125rem)] text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
              {t(
                'faq.hero.subtitle',
                'Odpovede na najčastejšie otázky o Svaply na jednom mieste.'
              )}
            </p>
          </motion.section>

          {FAQ_SECTIONS.map((section, sectionIndex) => (
            <motion.section key={section.titleKey} {...sectionMotion}>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                {t(section.titleKey, section.titleFallback)}
              </h2>
              <FaqAccordion
                items={section.items.map((item, itemIndex) => ({
                  id: `${sectionIdPrefix}-s${sectionIndex}-i${itemIndex}-${item.id}`,
                  question: t(item.questionKey),
                  answer: t(item.answerKey),
                }))}
              />
            </motion.section>
          ))}
        </div>
      </main>
    </div>
  );
}
