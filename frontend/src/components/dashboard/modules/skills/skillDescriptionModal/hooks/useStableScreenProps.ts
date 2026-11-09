'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SkillsDescriptionScreenProps } from '../types';

type Props = SkillsDescriptionScreenProps;

/** Kľúče vstupov, ktoré sú funkciami rodiča; zoznam nižšie musí obsahovať každý z nich, inak sa kód nepreloží. */
type CallbackKey = {
  [K in keyof Props]-?: NonNullable<Props[K]> extends (...args: never[]) => unknown ? K : never;
}[keyof Props];

const CALLBACK_KEYS: Record<CallbackKey, true> = {
  onBack: true,
  onDescriptionChange: true,
  onDetailedDescriptionChange: true,
  onTagsChange: true,
  onDistrictChange: true,
  onCountryCodeChange: true,
  onDistrictCodeChange: true,
  onLocationChange: true,
  onExperienceChange: true,
  onPriceChange: true,
  onUrgencyChange: true,
  onDurationTypeChange: true,
  onImagesChange: true,
  onExistingImagesChange: true,
  onRemoveExistingImage: true,
  onOpeningHoursChange: true,
  onIsHiddenChange: true,
};

const CALLBACK_NAMES = Object.keys(CALLBACK_KEYS) as CallbackKey[];

type Forwarder = (...args: unknown[]) => unknown;

/** Vytvorí pre každú funkciu rodiča jednu stabilnú funkciu, ktorá pri volaní zavolá vždy najnovšiu verziu z `latest`. */
function createForwarders(latest: { current: Props }): Record<CallbackKey, Forwarder> {
  const forwarders = {} as Record<CallbackKey, Forwarder>;
  CALLBACK_NAMES.forEach((name) => {
    forwarders[name] = (...args) => (latest.current[name] as Forwarder | undefined)?.(...args);
  });
  return forwarders;
}

/** Majú dva zoznamy tagov rovnaký obsah (poradie aj text)? */
function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((tag, index) => tag === b[index]);
}

/**
 * Stabilné vstupy obrazovky Popis ponuky (nálezy 322 a 323). Smerovač pri každom prekreslení vytvára nové pole tagov
 * (`tags || []`) a nové obslužné funkcie a hook obrazovky ich má v závislostiach efektov. Nové prázdne pole preto
 * vrátilo tagy, ktoré používateľ práve pridal, na prázdne (322), a efekty, ktoré zapisujú krajinu a okres do rodiča,
 * bežali v slučke prekreslení (323). Hook vráti tie isté vstupy, no `initialTags` má rovnakú referenciu, kým sa
 * nezmení jeho obsah, a každá funkcia `on…` je stabilná a volá vždy najnovšiu funkciu rodiča. Funkcia, ktorú rodič
 * nedal (napr. `onRemoveExistingImage` pri novej ponuke), ostáva nedefinovaná; ostatné vstupy sa nemenia.
 */
export function useStableScreenProps(props: Props): Props {
  const latest = useRef(props);
  // Najnovšie funkcie rodiča sa zapíšu v tom istom commite, pred efektmi hooku obrazovky, ktoré ich volajú.
  useLayoutEffect(() => {
    latest.current = props;
  });

  const forwarders = useMemo(() => createForwarders(latest), []);

  const incomingTags = props.initialTags ?? [];
  const [stableTags, setStableTags] = useState<string[]>(incomingTags);
  const initialTags = sameTags(stableTags, incomingTags) ? stableTags : incomingTags;
  if (initialTags !== stableTags) setStableTags(initialTags);

  const stable: Props = { ...props, initialTags };
  CALLBACK_NAMES.forEach((name) => {
    (stable as Record<CallbackKey, unknown>)[name] = props[name] ? forwarders[name] : undefined;
  });
  return stable;
}
