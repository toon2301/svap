import type { DesktopOnboardingStep } from '@/types';
import type { ProfileEditHighlightTarget } from './profileEditTutorialLogic';

export const DESKTOP_ONBOARDING_MAIN_STEPS = [
  'navigation',
  'profile_icon',
  'profile_edit',
  'search',
  'help_request',
  'requests',
  'messages',
  'dashboard_finish',
] as const;

export type DesktopOnboardingDisplayStep = (typeof DESKTOP_ONBOARDING_MAIN_STEPS)[number];
type Translate = (key: string, fallback: string) => string;

export function getDesktopOnboardingDisplayStep(
  step: DesktopOnboardingStep,
): DesktopOnboardingDisplayStep | null {
  if (step === 'edit_form') return 'profile_edit';
  return DESKTOP_ONBOARDING_MAIN_STEPS.includes(step as DesktopOnboardingDisplayStep)
    ? (step as DesktopOnboardingDisplayStep)
    : null;
}

export function getDesktopOnboardingStepContent(
  displayStep: DesktopOnboardingDisplayStep | null,
  activeProfileHighlightTarget: ProfileEditHighlightTarget,
  t: Translate,
) {
  if (displayStep === 'dashboard_finish') {
    return {
      title: t('tutorial.dashboardFinishStep.title', 'Si pripraveny zacat'),
      body: t(
        'tutorial.dashboardFinishStep.description',
        'Teraz uz poznas zaklady Svaply. Prajeme ti vela uspechov.',
      ),
    };
  }

  if (displayStep === 'navigation') {
    return {
      title: t('onboarding.desktop.navigation.title', 'Vitaj na Svaply'),
      body: t(
        'onboarding.desktop.navigation.body',
        'Pomocou navigacie vlavo sa dostanes ku vsetkym dolezitym castiam aplikacie.',
      ),
    };
  }

  if (displayStep === 'profile_icon') {
    return {
      title: t('onboarding.mobile.profileIcon.title', 'Toto je tvoj profil'),
      body: t(
        'onboarding.mobile.profileIcon.body',
        'Uprav si profil, pridaj portfolio a spravuj svoje ponuky, dopyty ci nove prilezitosti.',
      ),
    };
  }

  if (displayStep === 'profile_edit') {
    if (activeProfileHighlightTarget === 'skills') {
      return {
        title: t('tutorial.createCardStep.title', 'Vytvor svoju prvu kartu'),
        body: t(
          'tutorial.createCardStep.description',
          'Mozes ponuknut svoje sluzby alebo pridat dopyt na to, co hladas.',
        ),
      };
    }

    return {
      title: t('onboarding.mobile.editProfile.title', 'Vypln svoj profil'),
      body: t(
        'onboarding.mobile.editProfile.body',
        'Ostatni pouzivatelia tak lepsie uvidia kto si a co ponukas.',
      ),
    };
  }

  if (displayStep === 'search') {
    return {
      title: t('tutorial.searchStep.title', 'Vyhladavaj ludi a prilezitosti'),
      body: t(
        'tutorial.searchStep.description',
        'Najdi pouzivatelov, ponuky a dopyty alebo objav odporucane ponuky.',
      ),
    };
  }

  if (displayStep === 'help_request') {
    return {
      title: t('tutorial.helpRequestStep.title', 'Potrebujes pomoc alebo sluzbu?'),
      body: t(
        'tutorial.helpRequestStep.description',
        'O ponuku mozes poziadat priamo na profile pouzivatela.',
      ),
    };
  }

  if (displayStep === 'requests') {
    return {
      title: t('tutorial.requestsStep.title', 'Maj prehlad o svojich ziadostiach'),
      body: t(
        'tutorial.requestsStep.description',
        'Sleduj odoslane aj prijate ziadosti na jednom mieste.',
      ),
    };
  }

  if (displayStep === 'messages') {
    return {
      title: t('tutorial.messagesStep.title', 'Zostante v kontakte'),
      body: t(
        'tutorial.messagesStep.description',
        'Cez spravy mozes jednoducho komunikovat s pouzivatelmi a riesit spoluprace.',
      ),
    };
  }

  return null;
}
