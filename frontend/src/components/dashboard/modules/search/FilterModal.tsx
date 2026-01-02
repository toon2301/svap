import type { FilterModalProps } from './types';

export function FilterModal({
  isOpen,
  onClose,
  showSkills,
  setShowSkills,
  showUsers,
  setShowUsers,
  offerType,
  setOfferType,
  onlyMyLocation,
  setOnlyMyLocation,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  onReset,
  onApply,
  t,
}: FilterModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full sm:max-w-lg mx-0 sm:mx-4 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Malý handle na mobile pre moderný „bottom sheet“ vzhľad */}
        <div className="block sm:hidden pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-6 pt-2 pb-4 sm:py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('search.filterTitle', 'Filtre vyhľadávania')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={t('common.close', 'Zavrieť')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="px-4 sm:px-6 py-5 space-y-6 overflow-y-auto flex-1">
          {/* Typ výsledkov – skills / users */}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('search.filterResultTypes', 'Typ výsledkov')}
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showSkills}
                    onChange={(e) => setShowSkills(e.target.checked)}
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 peer-checked:border-purple-400 dark:peer-checked:border-purple-500 peer-checked:bg-purple-100 dark:peer-checked:bg-purple-900/40 peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-600 peer-focus:ring-offset-1 transition-all duration-200 group-hover:border-purple-200 dark:group-hover:border-purple-500 flex items-center justify-center">
                    {showSkills && (
                      <svg
                        className="w-4 h-4 text-purple-600 dark:text-purple-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {t('search.filterShowSkills', 'Zobraziť ponuky zručností')}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showUsers}
                    onChange={(e) => setShowUsers(e.target.checked)}
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 peer-checked:border-purple-400 dark:peer-checked:border-purple-500 peer-checked:bg-purple-100 dark:peer-checked:bg-purple-900/40 peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-600 peer-focus:ring-offset-1 transition-all duration-200 group-hover:border-purple-200 dark:group-hover:border-purple-500 flex items-center justify-center">
                    {showUsers && (
                      <svg
                        className="w-4 h-4 text-purple-600 dark:text-purple-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {t('search.filterShowUsers', 'Zobraziť používateľov')}
                </span>
              </label>
            </div>
          </div>

          {/* Typ ponuky – Ponúkam / Hľadám */}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('search.offerTypeTitle', 'Typ ponuky')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOfferType('all')}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  offerType === 'all'
                    ? 'border-purple-300 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-200 dark:hover:border-purple-700 hover:bg-purple-50/30 dark:hover:bg-purple-900/10'
                }`}
              >
                {t('search.offerTypeAll', 'Všetko')}
              </button>
              <button
                type="button"
                onClick={() => setOfferType('offer')}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  offerType === 'offer'
                    ? 'border-purple-300 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-200 dark:hover:border-purple-700 hover:bg-purple-50/30 dark:hover:bg-purple-900/10'
                }`}
              >
                {t('search.offerTypeOffer', 'Ponúkam')}
              </button>
              <button
                type="button"
                onClick={() => setOfferType('seeking')}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  offerType === 'seeking'
                    ? 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                }`}
              >
                {t('search.offerTypeSeeking', 'Hľadám')}
              </button>
            </div>
          </div>

          {/* Cena od - do */}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('search.priceTitle', 'Cena (ponuky zručností)')}
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-medium">
                  {t('search.priceMin', 'Od')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-medium">
                  {t('search.priceMax', 'Do')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="∞"
                />
              </div>
            </div>
          </div>

          {/* Len v mojej lokalite */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={onlyMyLocation}
                  onChange={(e) => setOnlyMyLocation(e.target.checked)}
                />
                <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 peer-checked:border-purple-400 dark:peer-checked:border-purple-500 peer-checked:bg-purple-100 dark:peer-checked:bg-purple-900/40 peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-600 peer-focus:ring-offset-1 transition-all duration-200 group-hover:border-purple-200 dark:group-hover:border-purple-500 flex items-center justify-center">
                  {onlyMyLocation && (
                    <svg
                      className="w-4 h-4 text-purple-600 dark:text-purple-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {t('search.onlyMyLocation', 'Len v mojej lokalite (podľa profilu)')}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-3xl sm:rounded-b-2xl">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t('search.resetFilters', 'Resetovať')}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="button"
              onClick={onApply}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 shadow-sm transition-all"
            >
              {t('search.applyFilters', 'Použiť filtre')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


