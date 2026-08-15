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
  it('shows the used/maximum counter without an HTML length cap', () => {
    render(<DescriptionHarness initialValue={'a'.repeat(137)} />);

    const input = screen.getByRole('textbox');
    // HTML maxLength ráta v UTF-16 jednotkách, takže by pole zavrelo už na
    // 75 emoji a rozpolilo by surrogate pár. Limit drží limitSkillDescription
    // v code-pointoch – tak, ako ho meria backend.
    expect(input).not.toHaveAttribute('maxlength');
    expect(screen.getByText('137 / 150')).toBeInTheDocument();
  });

  it('clips an over-limit input instead of accepting character 151', () => {
    render(<DescriptionHarness />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: `${'a'.repeat(150)}x` } });

    expect(input).toHaveValue('a'.repeat(150));
    expect(screen.getByText('150 / 150')).toBeInTheDocument();
  });

  it('lets the user type 150 emoji, the same as the backend allows', () => {
    render(<DescriptionHarness />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '😀'.repeat(150) } });

    expect(input).toHaveValue('😀'.repeat(150));
    expect(screen.getByText('150 / 150')).toBeInTheDocument();
  });

  it('clips emoji whole, never leaving half of one behind', () => {
    render(<DescriptionHarness />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '😀'.repeat(151) } });

    expect(input).toHaveValue('😀'.repeat(150));
    expect(screen.getByText('150 / 150')).toBeInTheDocument();
  });
});
