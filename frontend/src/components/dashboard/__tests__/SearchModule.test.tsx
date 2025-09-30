import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchModule from '../modules/SearchModule';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('SearchModule', () => {
  it('renders search header', () => {
    render(<SearchModule />);
    
    expect(screen.getByText('Vyhľadávanie zručností')).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    render(<SearchModule />);
    
    const searchInput = screen.getByPlaceholderText('Hľadať zručnosti, používateľov alebo kategórie...');
    expect(searchInput).toBeInTheDocument();
  });

  it('updates search query when typing', () => {
    render(<SearchModule />);
    
    const searchInput = screen.getByPlaceholderText('Hľadať zručnosti, používateľov alebo kategórie...');
    fireEvent.change(searchInput, { target: { value: 'React' } });
    
    expect(searchInput).toHaveValue('React');
  });

  it('shows filters when filter button is clicked', () => {
    render(<SearchModule />);
    
    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);
    
    expect(screen.getByText('Kategória')).toBeInTheDocument();
    expect(screen.getByText('Úroveň')).toBeInTheDocument();
    expect(screen.getByText('Lokácia')).toBeInTheDocument();
  });

  it('hides filters when filter button is clicked again', () => {
    render(<SearchModule />);
    
    const filterButton = screen.getByRole('button', { name: /filter/i });
    
    // Open filters
    fireEvent.click(filterButton);
    expect(screen.getByText('Kategória')).toBeInTheDocument();
    
    // Close filters
    fireEvent.click(filterButton);
    expect(screen.queryByText('Kategória')).not.toBeInTheDocument();
  });

  it('renders search results section', () => {
    render(<SearchModule />);
    
    expect(screen.getByText('Výsledky vyhľadávania')).toBeInTheDocument();
  });

  it('shows empty state when no search query', () => {
    render(<SearchModule />);
    
    expect(screen.getByText('Začnite vyhľadávanie')).toBeInTheDocument();
    expect(screen.getByText('Zadajte zručnosť, ktorú hľadáte, alebo použite filtre')).toBeInTheDocument();
  });

  it('shows loading state when search query is entered', () => {
    render(<SearchModule />);
    
    const searchInput = screen.getByPlaceholderText('Hľadať zručnosti, používateľov alebo kategórie...');
    fireEvent.change(searchInput, { target: { value: 'React' } });
    
    expect(screen.getByText('Hľadám výsledky...')).toBeInTheDocument();
  });

  it('renders filter options correctly', () => {
    render(<SearchModule />);
    
    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);
    
    // Check category options
    const categorySelect = screen.getByDisplayValue('Všetky kategórie');
    expect(categorySelect).toBeInTheDocument();
    
    // Check level options
    const levelSelect = screen.getByDisplayValue('Všetky úrovne');
    expect(levelSelect).toBeInTheDocument();
    
    // Check location options
    const locationSelect = screen.getByDisplayValue('Všetky lokácie');
    expect(locationSelect).toBeInTheDocument();
  });
});
