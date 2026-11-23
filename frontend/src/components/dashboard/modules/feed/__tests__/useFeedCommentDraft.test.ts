/**
 * Rozpracovaný komentár okna detailu príspevku (PR #323, nález CodeRabbitu).
 *
 * Text drží okno, nie komentáre, takže ho neodnesie odmountovanie komentárov pri prepnutí rozloženia. Patrí príspevku,
 * pre ktorý vznikol: iný príspevok má prázdne pole, návrat k pôvodnému vráti jeho text a neskorý zápis (odpoveď servera po
 * odoslaní, keď sa okno medzitým prepne) ostane pri príspevku, z ktorého sa odosielalo.
 */

import { act, renderHook } from '@testing-library/react';
import { useFeedCommentDraft } from '../useFeedCommentDraft';

function pripravHook(postId = 7) {
  return renderHook(({ id }) => useFeedCommentDraft(id), {
    initialProps: { id: postId },
  });
}

describe('useFeedCommentDraft', () => {
  it('začína s prázdnym textom', () => {
    const { result } = pripravHook();

    expect(result.current.value).toBe('');
  });

  it('uloží text, ktorý do poľa napíše používateľ', () => {
    const { result } = pripravHook();

    act(() => result.current.onChange('Rozpísaný komentár'));

    expect(result.current.value).toBe('Rozpísaný komentár');
  });

  it('prepísanie textu na prázdny reťazec pole vyprázdni', () => {
    const { result } = pripravHook();
    act(() => result.current.onChange('Rozpísaný komentár'));

    act(() => result.current.onChange(''));

    expect(result.current.value).toBe('');
  });

  it('iný príspevok má prázdne pole a text pôvodného sa k nemu nedostane', () => {
    const { result, rerender } = pripravHook(7);
    act(() => result.current.onChange('Text pre sedem'));

    rerender({ id: 8 });

    expect(result.current.value).toBe('');
  });

  it('po návrate na pôvodný príspevok je jeho text späť a text druhého príspevku ostáva pri ňom', () => {
    const { result, rerender } = pripravHook(7);
    act(() => result.current.onChange('Text pre sedem'));
    rerender({ id: 8 });
    act(() => result.current.onChange('Text pre osem'));

    rerender({ id: 7 });
    expect(result.current.value).toBe('Text pre sedem');

    rerender({ id: 8 });
    expect(result.current.value).toBe('Text pre osem');
  });

  it('neskorý zápis zo staršieho renderu vyprázdni pole svojho príspevku, nie toho, ktorý je práve na obrazovke', () => {
    const { result, rerender } = pripravHook(7);
    act(() => result.current.onChange('Text pre sedem'));
    // Obsluha, ktorú komentáre držia v rozbehnutom odosielaní: patrí príspevku 7.
    const obsluhaSedmicky = result.current.onChange;

    rerender({ id: 8 });
    act(() => result.current.onChange('Text pre osem'));
    act(() => obsluhaSedmicky(''));

    expect(result.current.value).toBe('Text pre osem');
    rerender({ id: 7 });
    expect(result.current.value).toBe('');
  });

  it('obsluha zápisu ostáva tá istá, kým sa nezmení príspevok', () => {
    const { result, rerender } = pripravHook(7);
    const pred = result.current.onChange;

    act(() => result.current.onChange('Rozpísaný komentár'));
    rerender({ id: 7 });
    expect(result.current.onChange).toBe(pred);

    rerender({ id: 8 });
    expect(result.current.onChange).not.toBe(pred);
  });

  it('objekt s textom ostáva ten istý, kým sa nezmení text alebo príspevok', () => {
    const { result, rerender } = pripravHook(7);
    const pred = result.current;

    rerender({ id: 7 });
    expect(result.current).toBe(pred);

    act(() => result.current.onChange('Rozpísaný komentár'));
    expect(result.current).not.toBe(pred);
  });
});
