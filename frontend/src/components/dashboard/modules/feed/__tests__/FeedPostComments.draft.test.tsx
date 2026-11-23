/**
 * Text rozpracovaného komentára, ktorý drží rodič (vlastnosť `draft`, PR #323, nález CodeRabbitu).
 *
 * Okno detailu na počítači pri prepnutí rozloženia komentáre odmountuje a vykreslí inde, takže ich vlastný stav textu
 * by sa stratil. S vlastnosťou `draft` text drží rodič: pole ho ukazuje, písanie, vloženie emoji aj vyprázdnenie po
 * odoslaní idú cez rodiča a odmontovanie komentárov ho nestratí. Bez vlastnosti (karta, mobilný detail, panel nad
 * fotkou) si text drží komponent sám ako predtým.
 *
 * Testy používajú len verejné rozhranie komponentu (DOM a volania atrap `feedApi` a toastu) a mockujú len vonkajšie
 * moduly.
 */

import { useState, type ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import type { FeedCommentDraft } from '../FeedPostComments.types';
import {
  createFeedPostComment,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

// Výber emoji je tu jediné tlačidlo, ktoré po kliknutí vloží `😀`; samotný výber (emoji-mart) sa netestuje.
jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({
    ariaLabel,
    onSelect,
  }: {
    ariaLabel: string;
    onSelect: (emoji: string) => void;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={() => onSelect('😀')}>
      emoji
    </button>
  ),
}));

const mockedList = listFeedPostComments as jest.MockedFunction<typeof listFeedPostComments>;
const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const toastError = jest.requireMock('react-hot-toast').default.error as jest.Mock;

const NAZOV_POLA = 'Napíš komentár...';

const autor = { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };

function komentar(id: number, text: string): FeedPostComment {
  return {
    id,
    text,
    author: autor,
    can_delete: true,
    can_edit: true,
    likes_count: 0,
    is_liked_by_me: false,
    parent_comment_id: null,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01',
  } as FeedPostComment;
}

const pole = () => screen.getByLabelText(NAZOV_POLA) as HTMLTextAreaElement;

/** Počká, kým dobehne načítanie (prázdneho) zoznamu komentárov, aby sa po konci testu nič nedialo mimo `act`. */
const pockajNaZoznam = () => screen.findByTestId('feed-comments-empty');

async function vykresli(ui: ReactElement) {
  const result = render(ui);
  await pockajNaZoznam();
  return result;
}

function napis(text: string) {
  fireEvent.change(pole(), { target: { value: text } });
}

/** Text, ktorý má rodič práve vo svojom stave (mimo komentárov). */
const textRodica = () => screen.getByTestId('text-rodica').textContent;

/**
 * Rodič, ktorý drží text a vie komentáre odmountovať a znova vykresliť – to isté, čo robí okno detailu pri prepnutí
 * rozloženia. `sDraftom` vypne vlastnosť, aby sa dalo ukázať, čo sa bez nej stratí.
 */
function Rodic({ sDraftom = true }: { sDraftom?: boolean }) {
  const [text, setText] = useState('');
  const [zobrazene, setZobrazene] = useState(true);
  const draft: FeedCommentDraft = { value: text, onChange: setText };
  return (
    <>
      <button type="button" onClick={() => setZobrazene((current) => !current)}>
        Prepnúť komentáre
      </button>
      <span data-testid="text-rodica">{text}</span>
      {zobrazene ? <FeedPostComments postId={5} draft={sDraftom ? draft : undefined} /> : null}
    </>
  );
}

beforeEach(() => {
  mockedList.mockReset();
  mockedCreate.mockReset();
  toastError.mockReset();
  mockedList.mockResolvedValue({ results: [], next: null, previous: null, count: 0 });
});

describe('FeedPostComments: text rozpracovaného komentára', () => {
  describe('bez vlastnosti draft', () => {
    it('si pole drží komponent sám a po odoslaní ho vyprázdni', async () => {
      mockedCreate.mockResolvedValue(komentar(1, 'Vlastný text'));
      await vykresli(<FeedPostComments postId={5} />);

      napis('Vlastný text');
      expect(pole()).toHaveValue('Vlastný text');
      fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));

      await waitFor(() => expect(pole()).toHaveValue(''));
      expect(mockedCreate).toHaveBeenCalledWith(5, 'Vlastný text');
    });

    it('stratí text pri odmountovaní komentárov (kontrola, že skúška odmountovania naozaj odmountuje)', async () => {
      await vykresli(<Rodic sDraftom={false} />);
      napis('Rozpísaný komentár');

      fireEvent.click(screen.getByRole('button', { name: 'Prepnúť komentáre' }));
      expect(screen.queryByLabelText(NAZOV_POLA)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Prepnúť komentáre' }));
      await pockajNaZoznam();

      expect(pole()).toHaveValue('');
    });
  });

  describe('s vlastnosťou draft', () => {
    it('ukáže v poli text od rodiča', async () => {
      await vykresli(<FeedPostComments postId={5} draft={{ value: 'Text od rodiča', onChange: jest.fn() }} />);

      expect(pole()).toHaveValue('Text od rodiča');
    });

    it('pri písaní ohlási rodičovi nový text a pole ostane pri hodnote od rodiča, kým ju rodič nezmení', async () => {
      const onChange = jest.fn();
      await vykresli(<FeedPostComments postId={5} draft={{ value: 'Text od rodiča', onChange }} />);

      napis('Iný text');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('Iný text');
      expect(pole()).toHaveValue('Text od rodiča');
    });

    it('text prežije odmountovanie a opätovné vykreslenie komentárov', async () => {
      await vykresli(<Rodic />);
      napis('Rozpísaný komentár');
      expect(textRodica()).toBe('Rozpísaný komentár');

      fireEvent.click(screen.getByRole('button', { name: 'Prepnúť komentáre' }));
      expect(screen.queryByLabelText(NAZOV_POLA)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Prepnúť komentáre' }));
      await pockajNaZoznam();

      expect(pole()).toHaveValue('Rozpísaný komentár');
    });

    it('odošle text, ktorý drží rodič, a po úspechu ho rodič vyprázdni', async () => {
      mockedCreate.mockResolvedValue(komentar(1, 'Rozpísaný komentár'));
      await vykresli(<Rodic />);
      napis('Rozpísaný komentár');
      expect(textRodica()).toBe('Rozpísaný komentár');

      fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));

      await waitFor(() => expect(textRodica()).toBe(''));
      expect(pole()).toHaveValue('');
      expect(mockedCreate).toHaveBeenCalledTimes(1);
      expect(mockedCreate).toHaveBeenCalledWith(5, 'Rozpísaný komentár');
    });

    it('po zlyhaní odoslania ostane text v poli aj u rodiča', async () => {
      mockedCreate.mockRejectedValue({ response: { status: 500, data: {} } });
      await vykresli(<Rodic />);
      napis('Rozpísaný komentár');

      fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));

      await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
      expect(textRodica()).toBe('Rozpísaný komentár');
      expect(pole()).toHaveValue('Rozpísaný komentár');
    });

    it('text dlhší ako limit od rodiča vypne odoslanie, text na hranici limitu ho povolí', async () => {
      const dlhy = 'x'.repeat(501);
      const naHranici = 'x'.repeat(500);
      const { rerender } = await vykresli(
        <FeedPostComments postId={5} draft={{ value: dlhy, onChange: jest.fn() }} />,
      );

      expect(screen.getByTestId('feed-comment-counter')).toHaveTextContent('501/500');
      expect(screen.getByRole('button', { name: 'Pridať' })).toBeDisabled();

      rerender(<FeedPostComments postId={5} draft={{ value: naHranici, onChange: jest.fn() }} />);

      expect(screen.getByTestId('feed-comment-counter')).toHaveTextContent('500/500');
      expect(screen.getByRole('button', { name: 'Pridať' })).toBeEnabled();
    });

    it('vloženie emoji upraví text u rodiča', async () => {
      await vykresli(<Rodic />);
      napis('Ahoj');

      fireEvent.click(screen.getByRole('button', { name: 'Pridať emoji' }));

      expect(textRodica()).toBe('Ahoj😀');
      expect(pole()).toHaveValue('Ahoj😀');
    });
  });
});
