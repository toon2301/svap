'use client';

/**
 * Rozpracovaný komentár okna detailu príspevku a jeho odosielanie (PR #323, nálezy CodeRabbitu a Codexu).
 *
 * Okno detailu na počítači prepína rozloženie (dva stĺpce ⇄ jeden stĺpec) pri prechode cez 1 024 px aj vtedy, keď sa
 * zmení, či má príspevok čo ukázať v médiovej ploche. Komentáre sa pri tom odmountujú a vykreslia na inom mieste stromu, takže
 * to, čo mali vo vlastnom stave, by sa stratilo: pole „Napíš komentár“ by sa vyprázdnilo uprostred písania. Preto okno drží
 * text a komentáre ho dostávajú vlastnosťou `draft`.
 *
 * Rovnako okno drží, že sa komentár práve odosiela. Inak by nová inštancia komentárov začala s tlačidlom „Pridať“ znova
 * použiteľným, takže by sa ten istý komentár dal odoslať druhýkrát (server duplicity nerozpozná), a odpoveď na pôvodné
 * odoslanie by vymazala text, ktorý používateľ medzitým napísal. Preto sa pole po úspešnom odoslaní vyprázdni len vtedy,
 * keď ešte obsahuje odoslaný text (`onSent`).
 *
 * Všetko patrí príspevku, pre ktorý to vzniklo:
 *
 *  - po prepnutí okna na iný príspevok je pole prázdne, nie je blokované odosielaním z predošlého príspevku a rozpísaný
 *    komentár sa nikdy neodošle k inému príspevku,
 *  - po návrate na pôvodný príspevok je jeho text späť a odosielanie, ak ešte beží, tiež (kým sa okno nezavrie, zatvorením
 *    sa všetko zahodí),
 *  - zápis, ktorý príde neskoro (odpoveď servera po odoslaní, keď sa okno medzitým prepne na iný príspevok), ovplyvní
 *    príspevok, z ktorého sa odosielalo, a nie ten, ktorý je práve na obrazovke.
 */

import { useCallback, useMemo, useState } from 'react';
import type { FeedCommentDraft } from './FeedPostComments.types';

type Koncept = { text: string; submitting: boolean };

const PRAZDNY: Koncept = { text: '', submitting: false };

export function useFeedCommentDraft(postId: number): FeedCommentDraft {
  const [koncepty, setKoncepty] = useState<Record<number, Koncept>>({});
  const { text, submitting } = koncepty[postId] ?? PRAZDNY;

  // `postId` je v obsluhách zachytené: neskorý zápis zo staršieho renderu ostane pri svojom príspevku.
  const zmen = useCallback(
    (zmena: (aktualny: Koncept) => Koncept) =>
      setKoncepty((vsetky) => ({ ...vsetky, [postId]: zmena(vsetky[postId] ?? PRAZDNY) })),
    [postId],
  );
  const onChange = useCallback(
    (novyText: string) => zmen((aktualny) => ({ ...aktualny, text: novyText })),
    [zmen],
  );
  const onSubmittingChange = useCallback(
    (odosiela: boolean) => zmen((aktualny) => ({ ...aktualny, submitting: odosiela })),
    [zmen],
  );
  // Okrajové medzery sa nepočítajú: na server odchádza orezaný text, v poli ich môže mať používateľ viac.
  const onSent = useCallback(
    (odoslanyText: string) =>
      zmen((aktualny) => (aktualny.text.trim() === odoslanyText ? { ...aktualny, text: '' } : aktualny)),
    [zmen],
  );

  return useMemo(
    () => ({ value: text, onChange, submitting, onSubmittingChange, onSent }),
    [text, onChange, submitting, onSubmittingChange, onSent],
  );
}
