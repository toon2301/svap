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

    expect(screen.getByText('Hľadať')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Vyhľadávanie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('does not show no-results message before search', () => {
    render(<SearchModule user={mockUser} />);

    expect(
      screen.queryByText(/Pre zadané vyhľadávanie sa nenašli žiadne výsledky/i),
    ).not.toBeInTheDocument();
  });

  it('updates search query on input change and triggers search on submit', async () => {
    render(<SearchModule user={mockUser} />);

    const searchInput = screen.getByPlaceholderText(
      'Vyhľadávanie',
    ) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'React' } });

    expect(searchInput.value).toBe('React');

    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() =>
      expect(
        screen.getByText(/Pre zadané vyhľadávanie sa nenašli žiadne výsledky/i),
      ).toBeInTheDocument(),
    );
  });
});