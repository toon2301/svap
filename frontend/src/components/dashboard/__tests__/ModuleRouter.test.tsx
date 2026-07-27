import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { User } from '@/types';

// Stub HomeModule – overujeme len WIRING (že case 'home' ho renderuje + dostáva
// navigačné callbacky), nie jeho vnútro.
jest.mock('../modules/HomeModule', () => ({
  __esModule: true,
  default: (props: {
    user: { id: number };
    setActiveModule?: unknown;
    onEditProfileClick?: unknown;
    onSkillsOfferClick?: unknown;
  }) => (
    <div
      data-testid="home-module"
      data-nav={`${typeof props.setActiveModule}|${typeof props.onEditProfileClick}|${typeof props.onSkillsOfferClick}`}
    >
      HomeModule for {props.user.id}
    </div>
  ),
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
jest.mock('@/hooks', () => ({ useIsMobile: () => false }));

import ModuleRouter from '../ModuleRouter';

const mockUser = {
  id: 42,
  username: 'u',
  email: 'u@e.com',
  first_name: 'U',
  last_name: 'U',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '',
  updated_at: '',
  profile_completeness: 50,
} as User;

function baseProps() {
  return {
    user: mockUser,
    activeModule: 'home',
    activeRightItem: '',
    isRightSidebarOpen: false,
    accountType: 'personal' as const,
    onUserUpdate: jest.fn(),
    handleRightSidebarToggle: jest.fn(),
    closeOwnProfileEdit: jest.fn(),
    setActiveModule: jest.fn(),
    setIsSkillsCategoryModalOpen: jest.fn(),
    setSelectedSkillsCategory: jest.fn(),
    setIsSkillDescriptionModalOpen: jest.fn(),
    setIsAddCustomCategoryModalOpen: jest.fn(),
    setEditingCustomCategoryIndex: jest.fn(),
    setEditingStandardCategoryIndex: jest.fn(),
    standardCategories: [],
    customCategories: [],
    setAccountType: jest.fn(),
    setIsAccountTypeModalOpen: jest.fn(),
    setIsPersonalAccountModalOpen: jest.fn(),
    removeStandardCategory: jest.fn(),
    removeCustomCategory: jest.fn(),
    selectedSkillsCategory: null,
    onEditProfileClick: jest.fn(),
    onSkillsOfferClick: jest.fn(),
  };
}

describe('ModuleRouter – home', () => {
  it('renders HomeModule for the "home" module and forwards navigation callbacks', () => {
    render(<ModuleRouter {...baseProps()} />);

    // HomeModule sa reálne renderuje (dostáva user prop).
    expect(screen.getByTestId('home-module')).toBeInTheDocument();
    expect(screen.getByText('HomeModule for 42')).toBeInTheDocument();

    // Navigačné callbacky (N1) sa reálne posielajú do HomeModule.
    expect(screen.getByTestId('home-module')).toHaveAttribute(
      'data-nav',
      'function|function|function',
    );

    // Pôvodný placeholder text sa už nezobrazuje (onboarding target "home-welcome"
    // je teraz ohraničený vnútri HomeModule, nie na wrapperi).
    expect(
      screen.queryByText('Vyber si sekciu z navigácie pre pokračovanie.'),
    ).not.toBeInTheDocument();
  });
});
