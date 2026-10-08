'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AccountSettingsMobileView } from '../modules/AccountSettingsModule';
import {
  DASHBOARD_HOME_PATH,
  dashboardSectionPath,
  isSameDashboardPath,
} from '../components/dashboardRoutes';
import { stepBackFromMobileSettings } from './mobileSettingsOrigin';

type MobileSettingsInput = {
  activeModule: string;
  activeRightItem: string;
  handleMobileBack: (isInSubcategories?: boolean, skillsDescribeSkillId?: number | null) => void;
  handleMainModuleChange: (moduleId: string) => void;
  setActiveModule: (module: string) => void;
};

/** Mobilné Nastavenia: zoznam Nastavení (otvorenie, zatvorenie) a podobrazovka nastavení účtu. */
export function useMobileSettings({
  activeModule,
  activeRightItem,
  handleMobileBack,
  handleMainModuleChange,
  setActiveModule,
}: MobileSettingsInput) {
  const [mobileAccountSettingsView, setMobileAccountSettingsView] =
    useState<AccountSettingsMobileView>('overview');

  useEffect(() => {
    if (activeModule !== 'account-settings' && activeRightItem !== 'account-settings') {
      setMobileAccountSettingsView('overview');
    }
  }, [activeModule, activeRightItem]);

  const handleAccountSettingsMobileBack = useCallback(() => {
    if (mobileAccountSettingsView !== 'overview') {
      setMobileAccountSettingsView('overview');
      return;
    }

    handleMobileBack();
  }, [handleMobileBack, mobileAccountSettingsView]);

  /**
   * Hamburger = vstup do Nastavení, teda navigácia, nie len otvorenie menu.
   *
   * Keď už adresa na zozname stojí, nenaviguje sa znova – len sa zosúladí
   * modul. Sem sa totiž dá prísť aj „zvnútra": hostiteľ sledovaných ponúk si
   * po kroku späť pýta zobrazenie zoznamu a druhý záznam by bol navyše.
   */
  const handleMobileSettingsOpen = useCallback(() => {
    const settingsPath = dashboardSectionPath('settings');
    if (typeof window !== 'undefined' && isSameDashboardPath(window.location.pathname, settingsPath)) {
      setActiveModule('settings');
      return;
    }
    handleMainModuleChange('settings');
  }, [handleMainModuleChange, setActiveModule]);

  /**
   * Krížik zavrie zoznam tak, ako ho otvorila história – krokom späť.
   *
   * Pri priamom vstupe (odkaz, nová karta) pod zoznamom žiadny záznam appky
   * nie je a krok späť by z nej odišiel; vtedy sa ide na Nástenku.
   *
   * Zoznam sa zatvára LEN kým je naozaj zobrazený. Jeho riadky totiž po
   * navigácii do sekcie volajú zatvorenie ešte raz (z čias, keď bol zoznam iba
   * stavom menu a zatvorenie nič nenavigovalo). Odkedy je zoznam obrazovkou
   * s adresou, bol by to druhý krok, ktorý by práve otvorenú sekciu vzápätí
   * vrátil – obrazovka ostala na zozname a sekcia bola dosiahnuteľná až
   * tlačidlom „dopredu".
   */
  const handleMobileSettingsClose = useCallback(() => {
    const settingsPath = dashboardSectionPath('settings');
    if (typeof window !== 'undefined' && !isSameDashboardPath(window.location.pathname, settingsPath)) {
      return;
    }
    if (stepBackFromMobileSettings()) return;
    setActiveModule('home');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', DASHBOARD_HOME_PATH);
    }
  }, [setActiveModule]);

  return {
    mobileAccountSettingsView,
    setMobileAccountSettingsView,
    handleAccountSettingsMobileBack,
    handleMobileSettingsOpen,
    handleMobileSettingsClose,
  };
}
