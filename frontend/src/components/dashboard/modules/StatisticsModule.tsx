'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import ProfileVisitsHeatmap, {
  ProfileVisitsTrend,
} from './ProfileVisitsHeatmap';
import { useDashboardSearchPanel } from '../contexts/DashboardSearchPanelContext';

interface StatisticsModuleProps {
  user: User;
  /** Desktop je samostatná stránka; mobil zatiaľ zachováva pôvodnú Nástenku. */
  variant?: 'desktop-page' | 'mobile-page';
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
}

const DASH = '—';
const CARD_SURFACE =
  'rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#101011]';

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

export default function StatisticsModule({
  variant = 'mobile-page',
  setActiveModule,
  onEditProfileClick,
  onSkillsOfferClick,
}: StatisticsModuleProps) {
  const { t } = useLanguage();
  const isDesktopPage = variant === 'desktop-page';
  const openSearchPanel = useDashboardSearchPanel();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  // Trend návštev profilu (Fáza 4.2) – samostatný fetch, fail-open: pri chybe sa
  // sekcia jednoducho nezobrazí a nezhodí zvyšok obrazovky.
  const [trend, setTrend] = useState<ProfileVisitsTrend | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);

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
        // Nezhoď obrazovku kvôli neúspešnej štatistike – karty degradujú na "—".
        if (!cancelled) setStatsError(true);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTrendLoading(true);
    api
      .get<ProfileVisitsTrend>(endpoints.dashboard.profileVisitsTrend)
      .then(({ data }) => {
        // Fail-open: akceptuj len dobre tvarovanú odpoveď (pole `daily`); pri
        // neočakávanom tvare sekciu radšej skry, než by heatmapa spadla.
        if (!cancelled) {
          setTrend(data && Array.isArray(data.daily) ? data : null);
        }
      })
      .catch(() => {
        // Fail-open: trend sekcia sa nezobrazí, zvyšok štatistík ostáva funkčný.
        if (!cancelled) setTrend(null);
      })
      .finally(() => {
        if (!cancelled) setTrendLoading(false);
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
    {
      key: 'skills',
      label: t('dashboard.statOffersAndRequests', 'Ponuky/dopyty'),
      value: formatInt(stats?.skills_count),
    },
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
      title: t('dashboard.actionAddOfferOrRequest', 'Pridaj ponuku/dopyt'),
      hint: t('dashboard.actionAddSkillHint', 'Zdieľaj svoju expertízu'),
      onClick: () => onSkillsOfferClick?.(),
    },
    {
      key: 'search',
      title: t('dashboard.actionSearchOffersAndRequests', 'Hľadať ponuky/dopyty'),
      hint: t('dashboard.actionSearchHint', 'Nájdi čo potrebuješ'),
      onClick: () => {
        if (isDesktopPage) {
          openSearchPanel?.();
          return;
        }
        goToModule('search');
      },
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
      className="space-y-6 sm:space-y-8"
    >
      {!isDesktopPage && (
        <p className="mx-auto max-w-sm px-1 text-center text-sm leading-6 text-gray-600 dark:text-gray-300">
          {t(
            'dashboard.statisticsIntro',
            'Sleduj svoju aktivitu, úspešnosť výmen a návštevy profilu na jednom mieste.',
          )}
        </p>
      )}

      {/* Quick stats – reálne štatistiky z dashboard_home_view */}
      <section
        {...(isDesktopPage
          ? { 'aria-labelledby': 'dashboard-statistics-title' }
          : { 'aria-label': t('dashboard.statistics', 'Štatistiky') })}
        className="space-y-3 sm:space-y-4"
      >
        {isDesktopPage && (
          <div className="space-y-1.5">
            <h1
              id="dashboard-statistics-title"
              className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl"
            >
              {t('dashboard.statistics', 'Štatistiky')}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">
              {t(
                'dashboard.statisticsIntro',
                'Sleduj svoju aktivitu, úspešnosť výmen a návštevy profilu na jednom mieste.',
              )}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {statCards.map((card) => (
            <div
              key={card.key}
              className={`${CARD_SURFACE} min-w-0 p-4 transition-colors sm:p-5`}
            >
              <p className="min-h-10 text-xs font-medium leading-5 text-gray-600 dark:text-gray-300 sm:text-sm">
                {card.label}
              </p>
              {statsLoading ? (
                <div
                  data-testid="stat-loading"
                  className="mt-1 h-8 w-16 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700"
                  aria-hidden="true"
                />
              ) : (
                <p className="mt-1 break-words text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
                  {card.value}
                </p>
              )}
            </div>
          ))}
        </div>
        {statsError && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            role="status"
          >
            {t('dashboard.statsError', 'Štatistiky sa nepodarilo načítať.')}
          </p>
        )}
      </section>

      {/* Trend návštev profilu (Fáza 4.2) – heatmapa za 90 dní.
          Loading: skeleton (vzor kariet). Error/prázdno: sekcia sa nezobrazí. */}
      {trendLoading ? (
        <div
          data-testid="visits-trend-loading"
          className={`${CARD_SURFACE} grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(180px,0.65fr)_minmax(0,1.35fr)] lg:items-center`}
          aria-hidden="true"
        >
          <div className="space-y-3">
            <div className="h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-48 max-w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="h-44 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : (
        trend && <ProfileVisitsHeatmap trend={trend} />
      )}

      {/* Quick actions */}
      <div className={`${CARD_SURFACE} p-5 sm:p-6`}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('dashboard.quickActions', 'Rýchle akcie')}
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {quickActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className="rounded-xl border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-700 dark:hover:bg-white/5 dark:focus:ring-purple-500/50"
            >
              <div className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
                {action.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{action.hint}</div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
