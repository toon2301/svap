'use client';

import type { User } from '../../../types';
import PrivacySettingsMobileSection from './PrivacySettingsMobileSection';
import PrivacySettingsModule from './PrivacySettingsModule';

interface PrivacySettingsProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
  /** Šípka späť desktopovej obrazovky. */
  onBack?: () => void;
}

/**
 * Súkromie v oboch rozloženiach naraz (nález 286). Mobilná aj desktopová obrazovka sa vykresľujú vždy a o tom, ktorá
 * je vidno, rozhoduje CSS: mobilná je `block lg:hidden`, desktopová `hidden lg:flex`. Predtým medzi nimi prepínal
 * príznak `useIsMobile`, ktorý je v prvom vykreslení vždy „desktop“, takže sa na telefóne na jeden až dva snímky ukázala
 * desktopová obrazovka, ktorá je pod lg skrytá (prázdna plocha), a až potom mobilná. Údaje používateľa sú už v pamäti,
 * takže ovládanie je vidno od prvého snímku. Zobrazená je vždy len jedna obrazovka, druhá má `display: none`, takže
 * nezaberá miesto a nedá sa v nej nič ovládať ani prečítať.
 */
export default function PrivacySettings({ user, onUserUpdate, onBack }: PrivacySettingsProps) {
  return (
    <div>
      <PrivacySettingsMobileSection user={user} onUserUpdate={onUserUpdate} />
      <PrivacySettingsModule user={user} onUserUpdate={onUserUpdate} onBack={onBack} />
    </div>
  );
}
