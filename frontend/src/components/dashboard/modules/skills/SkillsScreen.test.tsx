import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import toast from 'react-hot-toast';
import SkillsScreen from './SkillsScreen';

type ActionProps = {
  onFirstOptionClick?: () => void;
  onSecondOptionClick?: () => void;
  onAddCategory?: () => void;
};

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('./SkillsDesktopSection', () => ({
  __esModule: true,
  default: ({
    onFirstOptionClick,
    onSecondOptionClick,
    onAddCategory,
  }: ActionProps) => (
    <div>
      <button data-testid={'desktop-first'} onClick={onFirstOptionClick}>
        first
      </button>
      <button data-testid={'desktop-second'} onClick={onSecondOptionClick}>
        second
      </button>
      <button data-testid={'desktop-custom'} onClick={onAddCategory}>
        custom
      </button>
    </div>
  ),
}));

jest.mock('./SkillsMobileSection', () => ({
  __esModule: true,
  default: ({ onFirstOptionClick }: ActionProps) => (
    <button data-testid={'mobile-first'} onClick={onFirstOptionClick}>
      mobile first
    </button>
  ),
}));

const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;

const cards = [
  { category: 'Domácnosť', subcategory: 'Upratovanie' },
  { category: 'Remeslá', subcategory: 'Maliar' },
  { category: 'IT', subcategory: 'Web' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

it('shows a toast and blocks every add entry point when the section already has three cards', () => {
  const onFirstOptionClick = jest.fn();
  const onSecondOptionClick = jest.fn();
  const onAddCategory = jest.fn();

  render(
    <SkillsScreen
      title={'Ponúkam'}
      onFirstOptionClick={onFirstOptionClick}
      onSecondOptionClick={onSecondOptionClick}
      onAddCategory={onAddCategory}
      standardCategories={cards.slice(0, 2)}
      customCategories={cards.slice(2)}
    />,
  );

  fireEvent.click(screen.getByTestId('desktop-first'));
  fireEvent.click(screen.getByTestId('desktop-second'));
  fireEvent.click(screen.getByTestId('desktop-custom'));
  fireEvent.click(screen.getByTestId('mobile-first'));

  expect(mockedToastError).toHaveBeenCalledTimes(4);
  expect(mockedToastError).toHaveBeenLastCalledWith(
    'Môžeš mať maximálne 3 karty v tejto sekcii.',
  );
  expect(onFirstOptionClick).not.toHaveBeenCalled();
  expect(onSecondOptionClick).not.toHaveBeenCalled();
  expect(onAddCategory).not.toHaveBeenCalled();
});

it('allows add actions while the section is below the limit', () => {
  const onFirstOptionClick = jest.fn();
  const onSecondOptionClick = jest.fn();
  const onAddCategory = jest.fn();

  render(
    <SkillsScreen
      title={'Hľadám'}
      onFirstOptionClick={onFirstOptionClick}
      onSecondOptionClick={onSecondOptionClick}
      onAddCategory={onAddCategory}
      standardCategories={cards.slice(0, 2)}
    />,
  );

  fireEvent.click(screen.getByTestId('desktop-first'));
  fireEvent.click(screen.getByTestId('desktop-second'));
  fireEvent.click(screen.getByTestId('desktop-custom'));

  expect(mockedToastError).not.toHaveBeenCalled();
  expect(onFirstOptionClick).toHaveBeenCalledTimes(1);
  expect(onSecondOptionClick).toHaveBeenCalledTimes(1);
  expect(onAddCategory).toHaveBeenCalledTimes(1);
});
