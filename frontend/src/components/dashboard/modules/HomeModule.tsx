'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';

interface HomeModuleProps {
  user: User;
  /** Zmena aktívneho modulu (rovnaký vzor ako inde v ModuleRouteri). */
  setActiveModule?: (moduleId: string) => void;
  /** Otvorí editáciu profilu (handler z DashboardContent cez ModuleRouter). */
  onEditProfileClick?: () => void;
  /** Otvorí flow "ponúkam zručnosť" (handler z DashboardContent). */
  onSkillsOfferClick?: () => void;
}

interface DashboardStats {
  skills_count: number;
  active_exchanges: number;
  completed_exchanges: number;
  completion_rate: number | null;
  average_rating: number | null;
  profile_likes_count: number;
  favorites_count: number;
  profile_completeness: number;
}

const DASH = '—';

function formatInt(value: number | null | undefined): string {
  return typeof value === 'number' ? String(value) : DASH;
}

// completion_rate je 0..1 → percento; null/undefined → "—" (nie "0%"/"NaN%").
function formatPercent(value: number | null | undefined): string {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : DASH;
}

// average_rating s hviezdičkou; null/undefined → "—".
function formatRating(value: number | null | undefined): string {
  return typeof value === 'number' ? `${value.toFixed(1)} ★` : DASH;
}

export default function HomeModule({
  user,
  setActiveModule,
  onEditProfileClick,
  onSkillsOfferClick,
}: HomeModuleProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(false);
    api
      .get<{ stats: DashboardStats }>(endpoints.dashboard.home)
      .then(({ data }) => {
        if (!cancelled) setStats(data?.stats ?? null);
      })
      .catch(() => {
        // Nezhoď nástenku kvôli neúspešnej štatistike – karty degradujú na "—".
        if (!cancelled) setStatsError(true);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prechod na iný modul – rovnaký vzor ako inde v ModuleRouteri (state + localStorage).
  const goToModule = (moduleId: string) => {
    setActiveModule?.(moduleId);
    try {
      localStorage.setItem('activeModule', moduleId);
    } catch {
      // ignore storage failures – navigácia stavom už prebehla
    }
  };

  const statCards: { key: string; label: string; value: string }[] = [
    { key: 'skills', label: t('dashboard.statSkills', 'Ponuky'), value: formatInt(stats?.skills_count) },
    { key: 'active', label: t('dashboard.statActiveExchanges', 'Aktívne výmeny'), value: formatInt(stats?.active_exchanges) },
    { key: 'completed', label: t('dashboard.statCompletedExchanges', 'Dokončené výmeny'), value: formatInt(stats?.completed_exchanges) },
    { key: 'completion', label: t('dashboard.statCompletionRate', 'Úspešnosť'), value: formatPercent(stats?.completion_rate) },
    { key: 'rating', label: t('dashboard.statAverageRating', 'Priemerné hodnotenie'), value: formatRating(stats?.average_rating) },
    { key: 'likes', label: t('dashboard.statProfileLikes', 'Lajky profilu'), value: formatInt(stats?.profile_likes_count) },
  ];

  const quickActions: {
    key: string;
    title: string;
    hint: string;
    onClick: () => void;
  }[] = [
    {
      key: 'add-skill',
      title: t('dashboard.actionAddSkill', 'Pridať zručnosť'),
      hint: t('dashboard.actionAddSkillHint', 'Zdieľaj svoju expertízu'),
      onClick: () => onSkillsOfferClick?.(),
    },
    {
      key: 'search',
      title: t('dashboard.actionSearch', 'Hľadať zručnosti'),
      hint: t('dashboard.actionSearchHint', 'Nájdi čo potrebuješ'),
      onClick: () => goToModule('search'),
    },
    {
      key: 'edit-profile',
      title: t('dashboard.actionEditProfile', 'Upraviť profil'),
      hint: t('dashboard.actionEditProfileHint', 'Aktualizuj svoje údaje'),
      onClick: () => onEditProfileClick?.(),
    },
    {
      key: 'messages',
      title: t('dashboard.actionMessages', 'Správy'),
      hint: t('dashboard.actionMessagesHint', 'Komunikuj s ostatnými'),
      onClick: () => goToModule('messages'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* Welcome section – zároveň onboarding target "home-welcome" (mobilný onboarding). */}
      <div
        data-onboarding="home-welcome"
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {t('dashboard.welcomeToSwaply', 'Vitaj v Svaply!')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t(
            'dashboard.homeIntro',
            'Toto je tvoj osobný dashboard, kde môžeš spravovať svoj profil a zdieľať svoje zručnosti.',
          )}
        </p>

        {/* Profile completeness */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-800">
              {t('dashboard.profileCompleteness', 'Kompletnosť profilu')}
            </span>
            <span className="text-sm text-purple-600">
              {user.profile_completeness}%
            </span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${user.profile_completeness}%` }}
            ></div>
          </div>
          {user.profile_completeness < 100 && (
            <p className="text-xs text-purple-600 mt-2">
              {t('dashboard.profileCompletenessHint', 'Dokončite svoj profil pre lepšiu viditeľnosť')}
            </p>
          )}
        </div>
      </div>

      {/* Quick stats – reálne štatistiky z dashboard_home_view */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <p className="text-sm font-medium text-gray-600">{card.label}</p>
            {statsLoading ? (
              <div
                data-testid="stat-loading"
                className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200"
                aria-hidden="true"
              />
            ) : (
              <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
            )}
          </div>
        ))}
      </div>
      {statsError && (
        <p className="text-sm text-gray-500" role="status">
          {t('dashboard.statsError', 'Štatistiky sa nepodarilo načítať.')}
        </p>
      )}

      {/* Quick actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dashboard.quickActions', 'Rýchle akcie')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-purple-400/60"
            >
              <div className="text-sm font-medium text-gray-900 mb-1">
                {action.title}
              </div>
              <div className="text-xs text-gray-500">{action.hint}</div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
