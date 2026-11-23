'use client';

/**
 * Rozpracovaný komentár okna detailu príspevku (PR #323, nález CodeRabbitu).
 *
 * Okno detailu na počítači prepína rozloženie (dva stĺpce ⇄ jeden stĺpec) pri prechode cez 1 024 px aj vtedy, keď sa
 * zmení, či má príspevok fotku. Komentáre sa pri tom odmountujú a vykreslia na inom mieste stromu, takže text, ktorý mali
 * vo vlastnom stave, by sa stratil: pole „Napíš komentár“ by sa vyprázdnilo uprostred písania. Preto ho drží okno a
 * komentáre ho dostávajú vlastnosťou `draft`.
 *
 * Text patrí príspevku, pre ktorý vznikol:
 *
 *  - po prepnutí okna na iný príspevok je pole prázdne a rozpísaný komentár sa nikdy neodošle k inému príspevku,
 *  - po návrate na pôvodný príspevok je jeho text späť, kým sa okno nezavrie (zatvorením sa všetko zahodí),
 *  - zápis, ktorý príde neskoro (odpoveď servera po odoslaní, keď sa okno medzitým prepne na iný príspevok), vyprázdni
 *    pole toho príspevku, z ktorého sa odosielalo, a nie pole, ktoré je práve na obrazovke.
 */

import { useCallback, useMemo, useState } from 'react';
import type { FeedCommentDraft } from './FeedPostComments.types';

export function useFeedCommentDraft(postId: number): FeedCommentDraft {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const value = drafts[postId] ?? '';
  // `postId` je v obsluhe zachytené: neskorý zápis zo staršieho renderu ostane pri svojom príspevku.
  const onChange = useCallback(
    (text: string) => setDrafts((current) => ({ ...current, [postId]: text })),
    [postId],
  );
  return useMemo(() => ({ value, onChange }), [value, onChange]);
}
