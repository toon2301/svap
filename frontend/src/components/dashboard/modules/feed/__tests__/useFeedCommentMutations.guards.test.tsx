/**
 * Ochrany obsluh mutácií komentárov proti nesprávnemu volaniu (medzera z K42, mutácie I1 až I4).
 *
 * Rozhranie nedovolí vyvolať obsluhu s nesplnenými podmienkami (tlačidlá sú vypnuté, pole je prázdne), takže ich cez
 * komponent nevidno. Obsluhy sú však verejné rozhranie hooku a ochrany sú ich zmluva: pridanie sa neodošle, keď sa nedá
 * odoslať, úprava a odpoveď sa neodošlú prázdne ani druhýkrát, kým prvé odoslanie beží, a potvrdenie zmazania bez
 * vybraného komentára nevolá server (inak by zlyhalo chybou a ukázalo hlášku o neúspešnom zmazaní).
 *
 * Druhá skupina overuje stav hooku po úspešnej odpovedi (mutácia H7 z K42): pole odpovede sa vyprázdni a zavrie. V komponente
 * sa to odlíšiť nedá, lebo tlačidlo „Odpovedať“ pole pri každom otvorení vynuluje; stav hooku je však jeho verejné rozhranie.
 *
 * Test mockuje len vonkajšie moduly (`feedApi`, toast).
 */

import { act, renderHook } from '@testing-library/react';
import { useFeedCommentMutations } from '../useFeedCommentMutations';
import {
  createFeedPostComment,
  deleteFeedPostComment,
  updateFeedPostComment,
  type FeedPostComment,
} from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  getFeedPost: jest.fn(),
  createFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

const mockedCreate = createFeedPostComment as jest.MockedFunction<typeof createFeedPostComment>;
const mockedUpdate = updateFeedPostComment as jest.MockedFunction<typeof updateFeedPostComment>;
const mockedDelete = deleteFeedPostComment as jest.MockedFunction<typeof deleteFeedPostComment>;
const toastError = jest.requireMock('react-hot-toast').default.error as jest.Mock;

const author = { id: 1, display_name: 'Jana', slug: 'jana', user_type: 'individual', avatar_url: null };
const existing = {
  id: 1,
  text: 'Môj komentár',
  author,
  can_delete: true,
  can_edit: true,
  likes_count: 0,
  is_liked_by_me: false,
  parent_comment_id: null,
  replies: [],
  replies_count: 0,
  created_at: '2026-01-01',
} as FeedPostComment;

function setup(overrides: { canSubmit?: boolean; trimmed?: string } = {}) {
  const props = {
    postId: 5,
    t: (_key: string, fallback?: string) => fallback ?? '',
    trimmed: overrides.trimmed ?? 'Nový komentár',
    canSubmit: overrides.canSubmit ?? true,
    setSubmitting: jest.fn(),
    setText: jest.fn(),
    onCountChange: jest.fn(),
    loadSeqRef: { current: 0 },
    markSeen: jest.fn(),
    setComments: jest.fn(),
    scrollToTopRef: { current: null },
    setExpandedReplies: jest.fn(),
  };
  const view = renderHook(() => useFeedCommentMutations(props));
  return { ...view, props };
}

/** Odošle obsluhu a nechá React zapísať stav „odosiela sa“; odpoveď servera nikdy nepríde. */
function pending<T>() {
  return new Promise<T>(() => undefined);
}

describe('useFeedCommentMutations – ochrany obsluh', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedDelete.mockReset();
    toastError.mockReset();
  });

  it('pridanie sa neodošle, keď sa nedá odoslať', async () => {
    const { result, props } = setup({ canSubmit: false });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(props.setSubmitting).not.toHaveBeenCalled();
  });

  it('úprava s prázdnym textom nič neodošle', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.handleSubmitEdit(existing, '');
    });

    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('úprava sa neodošle druhýkrát, kým prvé ukladanie beží', async () => {
    mockedUpdate.mockReturnValue(pending());
    const { result } = setup();

    act(() => {
      void result.current.handleSubmitEdit(existing, 'Upravený text');
    });
    // Po zápise stavu „ukladá sa“ dostane obsluha nové hodnoty a druhé volanie už nepôjde na server.
    act(() => {
      void result.current.handleSubmitEdit(existing, 'Upravený text');
    });

    expect(mockedUpdate).toHaveBeenCalledTimes(1);
  });

  it('odpoveď s prázdnym alebo len medzerovým textom nič neodošle', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.handleSubmitReply(1);
    });
    act(() => result.current.setReplyText('   '));
    await act(async () => {
      await result.current.handleSubmitReply(1);
    });

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('odpoveď sa neodošle druhýkrát, kým prvé odosielanie beží', async () => {
    mockedCreate.mockReturnValue(pending());
    const { result } = setup();
    act(() => result.current.setReplyText('Moja odpoveď'));

    act(() => {
      void result.current.handleSubmitReply(1);
    });
    act(() => {
      void result.current.handleSubmitReply(1);
    });

    expect(mockedCreate).toHaveBeenCalledTimes(1);
  });

  it('potvrdenie zmazania bez vybraného komentára nevolá server ani nehlási chybu', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(mockedDelete).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe('useFeedCommentMutations – stav po úspešnej odpovedi', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
  });

  it('po úspešnej odpovedi vyprázdni pole odpovede a zavrie ho', async () => {
    mockedCreate.mockResolvedValue({ ...existing, id: 13, text: 'Moja odpoveď', parent_comment_id: 1 });
    const { result } = setup();
    act(() => result.current.setReplyingTo(1));
    act(() => result.current.setReplyText('Moja odpoveď'));

    await act(async () => {
      await result.current.handleSubmitReply(1);
    });

    expect(mockedCreate).toHaveBeenCalledWith(5, 'Moja odpoveď', 1);
    expect(result.current.replyText).toBe('');
    expect(result.current.replyingTo).toBeNull();
  });

  it('po zlyhaní odpovede nechá rozpísaný text aj otvorené pole', async () => {
    mockedCreate.mockRejectedValue({ response: { status: 500, data: {} } });
    const { result } = setup();
    act(() => result.current.setReplyingTo(1));
    act(() => result.current.setReplyText('Moja odpoveď'));

    await act(async () => {
      await result.current.handleSubmitReply(1);
    });

    expect(result.current.replyText).toBe('Moja odpoveď');
    expect(result.current.replyingTo).toBe(1);
  });
});
