import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchModule from '../SearchModule';

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  MagnifyingGlassIcon: () => <div>SearchIcon</div>,
}));

describe('SearchModule', () => {
  it('renders search input', () => {
    render(<SearchModule />);
    
    const searchInput = screen.getByPlaceholderText(/Hľadať používateľov/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(<SearchModule />);
    
    expect(screen.getByText('Vyhľadávanie')).toBeInTheDocument();
  });

  it('shows empty state when no search query', () => {
    render(<SearchModule />);
    
    expect(screen.getByText('Začnite vyhľadávať')).toBeInTheDocument();
    expect(screen.getByText(/Nájdite používateľov so zručnosťami/i)).toBeInTheDocument();
  });

  it('updates search query on input change', () => {
    render(<SearchModule />);
    
    const searchInput = screen.getByPlaceholderText(/Hľadať používateľov/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'React' } });
    
    expect(searchInput.value).toBe('React');
  });

  it('shows search results message when query is entered', () => {
    render(<SearchModule />);
    
    const searchInput = screen.getByPlaceholderText(/Hľadať používateľov/i);
    fireEvent.change(searchInput, { target: { value: 'TypeScript' } });
    
    expect(screen.getByText(/Výsledky vyhľadávania pre:/i)).toBeInTheDocument();
  });

  it('shows placeholder message for search functionality', () => {
    render(<SearchModule />);
    
    const searchInput = screen.getByPlaceholderText(/Hľadať používateľov/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(screen.getByText(/Funkcia vyhľadávania bude dostupná čoskoro/i)).toBeInTheDocument();
  });
});

