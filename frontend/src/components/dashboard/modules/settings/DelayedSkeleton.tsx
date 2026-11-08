'use client';

import type { ReactNode } from 'react';

import { useDelayedLoading } from '@/hooks/useDelayedLoading';

type DelayedSkeletonProps = {
  /** `true`, kým sa údaje načítavajú; po skončení sa nič nevykreslí. */
  isLoading: boolean;
  /** Text pre čítače obrazovky („Načítavam…“). */
  label: string;
  /** Kostra s rovnakými rozmermi ako výsledok. */
  children: ReactNode;
  /** Oneskorenie (ms), pod ktorým sa kostra vôbec neukáže; predvolene 200. */
  delayMs?: number;
  /** Má obal kostry pulzovať? Kostry, ktoré pulzujú samy, majú `false`, aby sa pulz nenásobil. */
  pulse?: boolean;
  /** `data-testid` obalu (predvolene `delayed-skeleton`). */
  testId?: string;
};

/**
 * Obal kostry pre sekcie Nastavení (nález 286). Kostra je v DOM od prvého snímku, no prvých `delayMs` je neviditeľná
 * (`invisible` drží jej miesto), takže rýchla odpoveď kostru nikdy neukáže a rozloženie sa nehýbe. Až keď načítavanie
 * trvá dlhšie, kostra sa ukáže. Obal má `role="status"` a `aria-busy`, samotná kostra je pre čítače skrytá a ich text
 * nesie `label`. Pulz kostry (`animate-pulse`) pri nastavení „Znížiť pohyb“ vypína globálny blok `prefers-reduced-motion`
 * v `globals.css`.
 */
export default function DelayedSkeleton({
  isLoading,
  label,
  children,
  delayMs,
  pulse = true,
  testId = 'delayed-skeleton',
}: DelayedSkeletonProps) {
  const visible = useDelayedLoading(isLoading, delayMs);

  if (!isLoading) return null;

  return (
    <div role="status" aria-busy="true" data-testid={testId} data-visible={visible ? 'true' : 'false'}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={visible ? (pulse ? 'animate-pulse' : '') : 'invisible'}>
        {children}
      </div>
    </div>
  );
}
