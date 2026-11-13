import { renderHook } from '@testing-library/react';

import cs from '../../../../../../messages/cs.json';
import de from '../../../../../../messages/de.json';
import en from '../../../../../../messages/en.json';
import hu from '../../../../../../messages/hu.json';
import pl from '../../../../../../messages/pl.json';
import sk from '../../../../../../messages/sk.json';
import { DEFAULT_PREFERENCES } from '../notificationPreferenceKeys';
import { useNotificationCategories } from '../useNotificationCategories';
import type { NotificationPreferencesController } from '../useNotificationPreferences';

// Preklad vráti kľúč, nie záložný text: test tak overí, ktorý kľúč kategória skutočne používa (pri chýbajúcom kľúči by
// globálny preklad v testoch potichu vrátil záložný text a zlý či starý kľúč by sa neprejavil).
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

/**
 * Kľúče prekladov, ktoré používajú riadky kategórií upozornení (nález 321, R34): premenovaná kategória používa
 * `notifications.tagsAndShares` a `tagsAndSharesDesc`, nie staré `likesAndComments*`, a všetky kľúče existujú vo všetkých
 * šiestich jazykoch.
 */
const controller: NotificationPreferencesController = {
  preferences: { ...DEFAULT_PREFERENCES },
  loading: false,
  loadFailed: false,
  error: null,
  isSaving: () => false,
  updatePreference: jest.fn().mockResolvedValue(true),
};

const TITLE_KEYS = [
  'notifications.likes',
  'notifications.tagsAndShares',
  'notifications.comments',
  'notifications.likesForComments',
  'notifications.skillRequest',
];

const DESCRIPTION_KEYS = [
  'notifications.likesDesc',
  'notifications.tagsAndSharesDesc',
  'notifications.commentsDesc',
  'notifications.likesForCommentsDesc',
  'notifications.skillRequestDesc',
];

const LANGUAGES = { sk, cs, en, pl, de, hu };

/** Text z `messages/<jazyk>.json` podľa bodkovej cesty kľúča. */
const lookup = (messages: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);

describe('useNotificationCategories: kľúče prekladov', () => {
  it('názvy a opisy kategórií používajú očakávané kľúče v poradí obrazovky', () => {
    const { result } = renderHook(() => useNotificationCategories(controller));

    expect(result.current.map((row) => row.title)).toEqual(TITLE_KEYS);
    expect(result.current.map((row) => row.description)).toEqual(DESCRIPTION_KEYS);
  });

  it.each(Object.entries(LANGUAGES))('%s: všetky kľúče kategórií existujú ako neprázdny text', (_language, messages) => {
    [...TITLE_KEYS, ...DESCRIPTION_KEYS].forEach((key) => {
      const text = lookup(messages, key);
      expect({ key, ok: typeof text === 'string' && text.trim() !== '' }).toEqual({ key, ok: true });
    });
  });
});
