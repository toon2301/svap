'use client';

/**
 * Vloženie emoji na pozíciu kurzora v textarea.
 *
 * Samotný picker je existujúci `DesktopEmojiPickerButton` z messages (obal nad
 * @emoji-mart) – tento hook rieši len to, čo mu chýba: kam sa emoji vloží.
 * Bez neho by emoji vždy skončilo na konci textu, aj keď kurzor stojí v strede.
 *
 * Zámerne samostatný a bez väzby na feed – Fáza 4.3 (composer voľného
 * príspevku) ho vie použiť rovnako, stačí ref na jej textarea.
 */

import { useCallback, useRef } from 'react';

export function useEmojiInsertion(
  value: string,
  onChange: (next: string) => void,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Hodnota cez ref, aby insertEmoji nemenilo identitu pri každom písmene –
  // inak by sa DesktopEmojiPickerButton prerenderoval na každý úder klávesy.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const insertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    const current = valueRef.current;

    if (!textarea) {
      onChangeRef.current(current + emoji);
      return;
    }

    const start = textarea.selectionStart ?? current.length;
    const end = textarea.selectionEnd ?? start;
    const next = current.slice(0, start) + emoji + current.slice(end);
    onChangeRef.current(next);

    // Kurzor za vložené emoji – po re-renderi, inak by ho React prepísal.
    const caret = start + emoji.length;
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  }, []);

  return { textareaRef, insertEmoji };
}
