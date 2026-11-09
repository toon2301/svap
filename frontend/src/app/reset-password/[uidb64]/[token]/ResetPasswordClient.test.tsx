import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { api } from '@/lib/api';

import ResetPasswordClient from './ResetPasswordClient';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('@/components/ParticlesBackground', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useParams: () => ({ uidb64: 'MQ', token: 'tajny-token' }),
}));

const mockApiGet = api.get as jest.MockedFunction<typeof api.get>;

/**
 * Polia stránky Zmena hesla (nález 320). Stránka je navrhnutá len ako svetlá (biela karta, tmavý text), no polia nemali
 * triedu pozadia ani farby textu a `color-scheme: light dark` v `layout.tsx` ich nechalo vykresliť podľa systému: na
 * iPhone sa objavili ako čierne polia na svetlej karte. Výslovné farby platia bez ohľadu na systém.
 */
describe('ResetPasswordClient: farby polí (nález 320)', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiGet.mockResolvedValue({ data: { valid: true } } as never);
  });

  /** Počká na overenie odkazu, po ktorom sa formulár zobrazí. */
  const renderForm = async () => {
    render(<ResetPasswordClient />);
    const password = await screen.findByLabelText('Nové heslo');
    const confirm = screen.getByLabelText('Potvrdenie hesla');
    return { password, confirm };
  };

  it('obe polia majú výslovne biele pozadie a tmavý text', async () => {
    const { password, confirm } = await renderForm();

    [password, confirm].forEach((field) => {
      expect(field).toHaveClass('bg-white');
      expect(field).toHaveClass('text-gray-900');
    });
  });

  it('farby polí nezávisia od zadanej hodnoty', async () => {
    const { password, confirm } = await renderForm();

    fireEvent.change(password, { target: { value: 'Silne1234' } });
    fireEvent.change(confirm, { target: { value: 'Silne1234' } });

    [password, confirm].forEach((field) => {
      expect(field).toHaveClass('bg-white', 'text-gray-900');
    });
  });

  it('pole s chybou má červené pozadie a text ostáva tmavý, bez konfliktu s bielym pozadím', async () => {
    const { password, confirm } = await renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Zmeniť heslo|Uložiť|Nastaviť/i }));

    await waitFor(() => expect(screen.getByText('Heslo je povinné')).toBeInTheDocument());
    [password, confirm].forEach((field) => {
      expect(field).toHaveClass('bg-red-50', 'text-gray-900');
      expect(field).not.toHaveClass('bg-white');
    });
  });
});
