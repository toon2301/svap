import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import DescriptionSection from './DescriptionSection';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock('@emoji-mart/react', () => () => null);

function DescriptionHarness({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);

  return (
    <DescriptionSection
      description={value}
      onChange={setValue}
      error=""
      onErrorChange={jest.fn()}
      isOpen
      showEmojiButton={false}
    />
  );
}

describe('DescriptionSection', () => {
  it('shows the used/maximum counter and a hard HTML limit', () => {
    render(<DescriptionHarness initialValue={'a'.repeat(137)} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '150');
    expect(screen.getByText('137 / 150')).toBeInTheDocument();
  });

  it('clips an over-limit input instead of accepting character 151', () => {
    render(<DescriptionHarness />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: `${'a'.repeat(150)}x` } });

    expect(input).toHaveValue('a'.repeat(150));
    expect(screen.getByText('150 / 150')).toBeInTheDocument();
  });
});
