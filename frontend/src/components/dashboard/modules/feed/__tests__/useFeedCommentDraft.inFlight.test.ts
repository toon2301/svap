/**
 * Odosielanie komentára v koncepte okna detailu (PR #323, nálezy CodeRabbitu a Codexu).
 *
 * Okno drží nielen text rozpísaného komentára, ale aj to, že sa práve odosiela: komentáre sa pri prepnutí rozloženia
 * odmountujú a nová inštancia by inak začala s tlačidlom „Pridať“ znova použiteľným. Odosielanie patrí príspevku, z ktorého
 * sa odosiela. Po úspešnom odoslaní sa pole vyprázdni len vtedy, keď ešte obsahuje odoslaný text, takže odpoveď servera,
 * ktorá dorazí neskoro, nezmaže text napísaný medzitým.
 */

import { act, renderHook } from '@testing-library/react';
import { useFeedCommentDraft } from '../useFeedCommentDraft';

function pripravHook(postId = 7) {
  return renderHook(({ id }) => useFeedCommentDraft(id), {
    initialProps: { id: postId },
  });
}

describe('useFeedCommentDraft: odosielanie', () => {
  it('začína bez odosielania', () => {
    const { result } = pripravHook();

    expect(result.current.submitting).toBe(false);
  });

  it('nastaví a zruší odosielanie', () => {
    const { result } = pripravHook();

    act(() => result.current.onSubmittingChange(true));
    expect(result.current.submitting).toBe(true);

    act(() => result.current.onSubmittingChange(false));
    expect(result.current.submitting).toBe(false);
  });

  it('odosielanie patrí príspevku: iný príspevok nie je blokovaný a po návrate beží ďalej', () => {
    const { result, rerender } = pripravHook(7);
    act(() => result.current.onSubmittingChange(true));

    rerender({ id: 8 });
    expect(result.current.submitting).toBe(false);

    rerender({ id: 7 });
    expect(result.current.submitting).toBe(true);
  });

  it('neskoré ukončenie odosielania zo staršieho renderu zruší odosielanie svojho príspevku, nie toho na obrazovke', () => {
    const { result, rerender } = pripravHook(7);
    act(() => result.current.onSubmittingChange(true));
    // Obsluha, ktorú komentáre držia v rozbehnutom odosielaní: patrí príspevku 7.
    const ukoncenieSedmicky = result.current.onSubmittingChange;

    rerender({ id: 8 });
    act(() => result.current.onSubmittingChange(true));
    act(() => ukoncenieSedmicky(false));

    expect(result.current.submitting).toBe(true);
    rerender({ id: 7 });
    expect(result.current.submitting).toBe(false);
  });

  it('písanie nemení odosielanie a odosielanie nemení text', () => {
    const { result } = pripravHook();

    act(() => result.current.onSubmittingChange(true));
    act(() => result.current.onChange('Rozpísaný komentár'));
    expect(result.current.submitting).toBe(true);
    expect(result.current.value).toBe('Rozpísaný komentár');

    act(() => result.current.onSubmittingChange(false));
    expect(result.current.value).toBe('Rozpísaný komentár');
  });

  it('obsluha odosielania ostáva tá istá, kým sa nezmení príspevok', () => {
    const { result, rerender } = pripravHook(7);
    const pred = result.current.onSubmittingChange;

    act(() => result.current.onSubmittingChange(true));
    rerender({ id: 7 });
    expect(result.current.onSubmittingChange).toBe(pred);

    rerender({ id: 8 });
    expect(result.current.onSubmittingChange).not.toBe(pred);
  });
});

describe('useFeedCommentDraft: vyprázdnenie po odoslaní', () => {
  it('vyprázdni pole, ak ešte obsahuje odoslaný text', () => {
    const { result } = pripravHook();
    act(() => result.current.onChange('Rozpísaný komentár'));

    act(() => result.current.onSent('Rozpísaný komentár'));

    expect(result.current.value).toBe('');
  });

  it('berie ohľad na okrajové medzery v poli', () => {
    const { result } = pripravHook();
    act(() => result.current.onChange('  Rozpísaný komentár \n'));

    act(() => result.current.onSent('Rozpísaný komentár'));

    expect(result.current.value).toBe('');
  });

  it('nechá pole, ak sa text medzitým zmenil', () => {
    const { result } = pripravHook();
    act(() => result.current.onChange('Nový komentár'));

    act(() => result.current.onSent('Rozpísaný komentár'));

    expect(result.current.value).toBe('Nový komentár');
  });

  it('nechá aj text, ktorý odoslaný text len dopĺňa', () => {
    const { result } = pripravHook();
    act(() => result.current.onChange('Rozpísaný komentár a ešte niečo'));

    act(() => result.current.onSent('Rozpísaný komentár'));

    expect(result.current.value).toBe('Rozpísaný komentár a ešte niečo');
  });

  it('neskoré vyprázdnenie zo staršieho renderu vyprázdni len pole svojho príspevku', () => {
    const { result, rerender } = pripravHook(7);
    act(() => result.current.onChange('Text pre sedem'));
    // Obsluha, ktorú komentáre držia v rozbehnutom odosielaní: patrí príspevku 7.
    const odoslanieSedmicky = result.current.onSent;

    rerender({ id: 8 });
    act(() => result.current.onChange('Text pre sedem'));
    act(() => odoslanieSedmicky('Text pre sedem'));

    // Pole príspevku 8 obsahuje rovnaký text, no nepatrí odoslaniu zo sedmičky.
    expect(result.current.value).toBe('Text pre sedem');
    rerender({ id: 7 });
    expect(result.current.value).toBe('');
  });

  it('obsluha vyprázdnenia ostáva tá istá, kým sa nezmení príspevok', () => {
    const { result, rerender } = pripravHook(7);
    const pred = result.current.onSent;

    act(() => result.current.onChange('Rozpísaný komentár'));
    rerender({ id: 7 });
    expect(result.current.onSent).toBe(pred);

    rerender({ id: 8 });
    expect(result.current.onSent).not.toBe(pred);
  });
});
