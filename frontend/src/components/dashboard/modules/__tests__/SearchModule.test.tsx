import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchModule from '../SearchModule';
import type { User } from '../../../../types';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue({
      data: { skills: [], users: [] },
    }),
  },
  endpoints: {
    dashboard: {
      search: '/dashboard/search/',
    },
  },
}));

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  user_type: 'individual',
  is_verified: false,
  is_public: true,
  created_at: '',
  updated_at: '',
  profile_completeness: 0,
};

describe('SearchModule', () => {
  it('renders heading and inputs', () => {
    render(<SearchModule user={mockUser} />);

    expect(screen.getByText('Vyhľadávanie')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Hľada(ť|jte) používateľov, zručnosti/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Kde hľadáš\? \(okres, mesto\.\.\.\)/i),
    ).toBeInTheDocument();
  });

  it('shows empty state when nothing searched yet', () => {
    render(<SearchModule user={mockUser} />);

    expect(screen.getByText('Začnite vyhľadávať')).toBeInTheDocument();
    expect(
      screen.getByText(/Nájdite používateľov so zručnosťami/i),
    ).toBeInTheDocument();
  });

  it('updates search query on input change and triggers search on submit', async () => {
    render(<SearchModule user={mockUser} />);

    const searchInput = screen.getByPlaceholderText(
      /Hľada(ť|jte) používateľov, zručnosti/i,
    ) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'React' } });

    expect(searchInput.value).toBe('React');

    const submitButton = screen.getByRole('button', { name: /Hľadať/i });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(
        screen.getByText(/Pre zadané vyhľadávanie sa nenašli žiadne výsledky/i),
      ).toBeInTheDocument(),
    );
  });
});