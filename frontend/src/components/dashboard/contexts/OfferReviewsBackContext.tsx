'use client';

/**
 * Šípka späť na stránke recenzií (desktop).
 *
 * Mobil ju má v hornej lište a dostáva ju cez `onMobileBack` rozloženia. Desktop
 * žiadnu lištu nemá, takže šípka musí byť priamo na stránke recenzií, a tá
 * potrebuje ten istý handler (`handleOfferReviewsBack`), ktorý vzniká v
 * `DashboardContent`. Stránku recenzií skladá `ModuleRouter` v
 * `DashboardModuleContent` až pod ňou, preto handler putuje kontextom, nie
 * ďalšou sadou props cez štyri vrstvy.
 *
 * Bez providera (samostatne vykreslená stránka v teste) je hodnota `undefined`
 * a šípka sa nezobrazí.
 */

import { createContext, useContext, type ReactNode } from 'react';

type OfferReviewsBack = () => void;

const OfferReviewsBackContext = createContext<OfferReviewsBack | undefined>(undefined);

export function OfferReviewsBackProvider({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack?: OfferReviewsBack;
}) {
  return <OfferReviewsBackContext.Provider value={onBack}>{children}</OfferReviewsBackContext.Provider>;
}

export function useOfferReviewsBack(): OfferReviewsBack | undefined {
  return useContext(OfferReviewsBackContext);
}
