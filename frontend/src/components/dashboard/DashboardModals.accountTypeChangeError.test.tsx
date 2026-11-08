/**
 * Zmena typu účtu v okne `DashboardModals` (nález 302). Keď server zmenu odmietne, predtým sa ukázalo natívne okno
 * prehliadača `alert()` s doslovným slovenským textom bez prekladu. Teraz sa ukáže toast: text zo servera, inak
 * preložený záložný text `accountType.changeFailed`. Okno ostane otvorené a typ účtu sa nezmení.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { User } from '@/types';
import DashboardModals from './DashboardModals';
import type { UseSkillsModalsResult } from './hooks/useSkillsModals';
import cs from '../../../messages/cs.json';
import de from '../../../messages/de.json';
import en from '../../../messages/en.json';
import hu from '../../../messages/hu.json';
import pl from '../../../messages/pl.json';
import sk from '../../../messages/sk.json';

const mockRefreshUser = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ refreshUser: mockRefreshUser }),
}));

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn(), patch: jest.fn() },
  endpoints: {
    skills: { list: '/skills/', detail: (id: number) => `/skills/${id}/` },
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('./modules/accountType/AccountTypeModal', () => ({
  __esModule: true,
  default: (props: { onConfirm: () => void }) => (
    <button type="button" onClick={() => props.onConfirm()}>
      Potvrdiť firemný účet
    </button>
  ),
}));

jest.mock('./modules/accountType/PersonalAccountModal', () => ({
  __esModule: true,
  default: (props: { onConfirm: () => void }) => (
    <button type="button" onClick={() => props.onConfirm()}>
      Potvrdiť osobný účet
    </button>
  ),
}));

jest.mock('./modules/skills/SkillsCategoryModal', () => () => null);
jest.mock('./modules/skills/AddCustomCategoryModal', () => () => null);
jest.mock('./modules/skills/SkillDescriptionModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/offerImageUpload', () => ({ uploadOfferImage: jest.fn() }));
jest.mock('./hooks/offerImageRefresh', () => ({ startBoundedImageRefresh: jest.fn() }));
jest.mock('./modules/profile/profileOffersRefresh', () => ({ scheduleProfileOffersRefresh: jest.fn() }));

const mockedPatch = api.patch as jest.Mock;
const mockedToastError = toast.error as jest.Mock;

const FALLBACK_TEXT = 'Nepodarilo sa zmeniť typ účtu. Skús to znova.';

/** Stav okien ponúk bez otvorených okien; na zmenu typu účtu ho okno nepoužíva. */
function createSkillsState(): UseSkillsModalsResult {
  return {
    selectedSkillsCategory: null,
    setSelectedSkillsCategory: jest.fn(),
    standardCategories: [],
    setStandardCategories: jest.fn(),
    customCategories: [],
    setCustomCategories: jest.fn(),
    isSkillsCategoryModalOpen: false,
    setIsSkillsCategoryModalOpen: jest.fn(),
    isSkillDescriptionModalOpen: false,
    setIsSkillDescriptionModalOpen: jest.fn(),
    isAddCustomCategoryModalOpen: false,
    setIsAddCustomCategoryModalOpen: jest.fn(),
    editingCustomCategoryIndex: null,
    setEditingCustomCategoryIndex: jest.fn(),
    editingStandardCategoryIndex: null,
    setEditingStandardCategoryIndex: jest.fn(),
    toLocalSkill: (skill) => skill as never,
    applySkillUpdate: jest.fn(),
    loadSkills: jest.fn().mockResolvedValue(undefined),
    fetchSkillDetail: jest.fn(),
    handleRemoveSkillImage: jest.fn(),
    removeStandardCategory: jest.fn(),
    removeCustomCategory: jest.fn(),
  };
}

/** Vykreslí okná s oboma oknami typu účtu a vráti mocky, ktoré si test po potvrdení skontroluje. */
function renderModals(translate: (key: string, fallback: string) => string = (_key, fallback) => fallback) {
  const props = {
    setAccountType: jest.fn(),
    setIsAccountTypeModalOpen: jest.fn(),
    setIsPersonalAccountModalOpen: jest.fn(),
    onUserUpdate: jest.fn(),
  };
  render(
    <DashboardModals
      accountType="personal"
      setAccountType={props.setAccountType}
      isAccountTypeModalOpen
      setIsAccountTypeModalOpen={props.setIsAccountTypeModalOpen}
      isPersonalAccountModalOpen
      setIsPersonalAccountModalOpen={props.setIsPersonalAccountModalOpen}
      skillsState={createSkillsState()}
      activeModule="skills-offer"
      t={translate}
      user={{ id: 5 } as User}
      onUserUpdate={props.onUserUpdate}
    />,
  );
  return props;
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe.each([
  { label: 'firemný účet', button: 'Potvrdiť firemný účet', userType: 'company', accountType: 'business' },
  { label: 'osobný účet', button: 'Potvrdiť osobný účet', userType: 'individual', accountType: 'personal' },
])('zmena typu účtu na $label', ({ button, userType, accountType }) => {
  it('pri odmietnutí serverom ukáže toast s jeho textom, nie natívne okno, a okno ostane otvorené', async () => {
    mockedPatch.mockRejectedValue({ response: { data: { error: 'Typ účtu teraz nemožno zmeniť.' } } });
    const props = renderModals();

    fireEvent.click(screen.getByRole('button', { name: button }));

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledTimes(1));
    expect(mockedPatch).toHaveBeenCalledWith('/auth/profile/', { user_type: userType });
    expect(mockedToastError).toHaveBeenCalledWith('Typ účtu teraz nemožno zmeniť.');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(props.setIsAccountTypeModalOpen).not.toHaveBeenCalled();
    expect(props.setIsPersonalAccountModalOpen).not.toHaveBeenCalled();
    expect(props.setAccountType).not.toHaveBeenCalled();
    expect(mockRefreshUser).not.toHaveBeenCalled();
  });

  it('bez textu od servera ukáže preklad `accountType.changeFailed`', async () => {
    mockedPatch.mockRejectedValue({});
    renderModals((key, fallback) => (key === 'accountType.changeFailed' ? 'Preklad zo súboru prekladov' : fallback));

    fireEvent.click(screen.getByRole('button', { name: button }));

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledTimes(1));
    expect(mockedToastError).toHaveBeenCalledWith('Preklad zo súboru prekladov');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('bez prekladu ukáže záložný slovenský text', async () => {
    mockedPatch.mockRejectedValue({});
    renderModals();

    fireEvent.click(screen.getByRole('button', { name: button }));

    await waitFor(() => expect(mockedToastError).toHaveBeenCalledWith(FALLBACK_TEXT));
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('po úspechu okno zavrie, typ účtu zmení a nič neukáže', async () => {
    mockedPatch.mockResolvedValue({ data: { user: { id: 5 } } });
    const props = renderModals();

    fireEvent.click(screen.getByRole('button', { name: button }));

    await waitFor(() => expect(props.setAccountType).toHaveBeenCalledWith(accountType));
    expect(props.onUserUpdate).toHaveBeenCalledWith({ id: 5 });
    expect(mockRefreshUser).toHaveBeenCalledWith({ force: true });
    expect(mockedToastError).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('preklad `accountType.changeFailed`', () => {
  it('existuje vo všetkých šiestich jazykoch', () => {
    [sk, cs, en, pl, de, hu].forEach((messages) => {
      expect(typeof messages.accountType.changeFailed).toBe('string');
      expect(messages.accountType.changeFailed.trim()).not.toBe('');
    });
  });

  it('záložný text v kóde sa zhoduje so slovenským prekladom', () => {
    expect(sk.accountType.changeFailed).toBe(FALLBACK_TEXT);
  });
});
