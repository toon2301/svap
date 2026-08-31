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
import {
  isTopOverlayLayer,
  pushOverlayLayer,
} from '../shared/overlayLayers';

type UseFeedDialogOptions = {
  open: boolean;
  onClose: () => void;
  /** False počas odosielania – Escape ani backdrop vtedy nezatvárajú. */
  canClose?: boolean;
  /**
   * Je obsah dialógu už vykreslený?
   *
   * Dialóg vykreslený portálom sa mountuje až v druhom kroku (najprv treba
   * nájsť cieľový uzol), takže pri prvom behu efektu je `containerRef` ešte
   * prázdny a fokus by nemal kam ísť – a keďže `open` sa už nemení, druhá
   * šanca by neprišla. Volajúci sem preto pošle, kedy je kontajner naozaj
   * pripravený. Dialógy, ktoré sa vykresľujú rovno, nemusia riešiť nič.
   */
  ready?: boolean;
};

export function useFeedDialog({
  open,
  onClose,
  canClose = true,
  ready = true,
}: UseFeedDialogOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Refy, aby listener nebolo treba pripájať znova pri každej zmene props.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const canCloseRef = useRef(canClose);
  canCloseRef.current = canClose;

  // Uloženie/obnova fokusu + Tab trap z existujúceho hooku appky.
  useModalFocusTrap(open, containerRef);

  // Poradie vrstiev. Dialógy sa dajú otvárať jeden nad druhým (napr. zoznam
  // lajkov nad oknom detailu príspevku) a všetky počúvajú Escape na `window`,
  // takže sa navzájom nedajú zastaviť cez `stopPropagation`. Register určí,
  // ktorý z nich stlačenie patrí.
  const layerRef = useRef<symbol | null>(null);
  useEffect(() => {
    if (!open) return;
    const layer = pushOverlayLayer();
    layerRef.current = layer.id;
    return () => {
      layer.release();
      layerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Register sa číta až tu: vrchná vrstva sa mení počas života dialógu a
      // hodnota v stave by v tej istej udalosti bola ešte stará (React
      // prekreslí až po dobehnutí listenerov).
      if (!isTopOverlayLayer(layerRef.current)) return;
      if (!canCloseRef.current) return;
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || !ready) return;
    const root = containerRef.current;
    if (!root) return;
    // Prvý ovládateľný prvok, inak samotný kontajner (má tabIndex={-1}).
    const focusable = root.querySelector<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], select:not([disabled])',
    );
    (focusable ?? root).focus?.();
  }, [open, ready]);

  return containerRef;
}
