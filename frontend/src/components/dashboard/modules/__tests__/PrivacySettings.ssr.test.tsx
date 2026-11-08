/** @jest-environment node */

import { renderToString } from 'react-dom/server';

import type { User } from '@/types';

import PrivacySettings from '../PrivacySettings';

jest.mock('@/lib/api', () => ({
  api: { patch: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'sk', t: (_key: string, fallback: string) => fallback }),
}));

const user = {
  id: 42,
  username: 'u',
  email: 'u@e.com',
  first_name: 'U',
  last_name: 'U',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '',
  updated_at: '',
  profile_completeness: 50,
} as User;

/**
 * Prvý snímok Súkromia (nález 286). Server-render nespúšťa efekty ani nepozná šírku okna, takže ukáže presne to, čo
 * sa vykreslí pred zistením šírky. Ovládanie oboch rozložení tam musí byť a CSS ich rozlíši; inak by sa na telefóne
 * ukázala prázdna desktopová obrazovka, kým sa príznak šírky nenastaví.
 */
describe('PrivacySettings: prvý snímok pred spustením efektov', () => {
  it('obsahuje ovládanie mobilného aj desktopového rozloženia a CSS obaly, ktoré ich rozlíšia', () => {
    expect(typeof window).toBe('undefined');

    const html = renderToString(
      <PrivacySettings user={user} onUserUpdate={jest.fn()} onBack={jest.fn()} />,
    );

    expect(html).toContain('block lg:hidden');
    expect(html).toContain('hidden lg:flex');
    expect(html).toContain('Pri súkromnom účte nie ste viditeľní');
    expect(html).toContain('Keď si nastavíte súkromný účet');
    expect((html.match(/w-11/g) ?? []).length).toBe(4);
    expect((html.match(/Súkromný účet/g) ?? []).length).toBe(2);
  });
});
