'use client';

/**
 * Spoločné správanie feed dialógov (nahlásenie, zdieľanie).
 *
 * Stavia na existujúcom ``useModalFocusTrap`` (uloží a obnoví predchádzajúci
 * fokus + Tab trap) a dopĺňa dve veci, ktoré ten hook nerieši:
 *  - Escape zatvorí dialóg (len keď to volajúci povolí – napr. nie počas
 *    odosielania, nech sa požiadavka nestratí),
 *  - fokus sa pri otvorení presunie DNU, aby klávesnica nezostala v pozadí.
 *
 * Vďaka tomu majú oba dialógy jednu implementáciu namiesto dvoch kópií.
 */

import { useEffect, useRef } from 'react';
import { useModalFocusTrap } from '../profile/useModalFocusTrap';

type UseFeedDialogOptions = {
  open: boolean;
  onClose: () => void;
  /** False počas odosielania – Escape ani backdrop vtedy nezatvárajú. */
  canClose?: boolean;
};

export function useFeedDialog({
  open,
  onClose,
  canClose = true,
}: UseFeedDialogOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Refy, aby listener nebolo treba pripájať znova pri každej zmene props.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const canCloseRef = useRef(canClose);
  canCloseRef.current = canClose;

  // Uloženie/obnova fokusu + Tab trap z existujúceho hooku appky.
  useModalFocusTrap(open, containerRef);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!canCloseRef.current) return;
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = containerRef.current;
    if (!root) return;
    // Prvý ovládateľný prvok, inak samotný kontajner (má tabIndex={-1}).
    const focusable = root.querySelector<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], select:not([disabled])',
    );
    (focusable ?? root).focus?.();
  }, [open]);

  return containerRef;
}
