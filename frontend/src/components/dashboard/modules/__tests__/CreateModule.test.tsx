import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateModule from '../CreateModule';

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  PlusCircleIcon: () => <div>PlusIcon</div>,
  DocumentTextIcon: () => <div>DocIcon</div>,
  PhotoIcon: () => <div>PhotoIcon</div>,
  VideoCameraIcon: () => <div>VideoIcon</div>,
}));

describe('CreateModule', () => {
  it('renders heading', () => {
    render(<CreateModule />);
    
    expect(screen.getByText('Vytvoriť')).toBeInTheDocument();
  });

  it('renders all create options', () => {
    render(<CreateModule />);
    
    expect(screen.getByText('Príspevok')).toBeInTheDocument();
    expect(screen.getByText('Ponuka')).toBeInTheDocument();
    expect(screen.getByText('Požiadavka')).toBeInTheDocument();
    expect(screen.getByText('Fotka')).toBeInTheDocument();
  });

  it('renders create option descriptions', () => {
    render(<CreateModule />);
    
    expect(screen.getByText(/Zdieľajte svoje myšlienky/i)).toBeInTheDocument();
    expect(screen.getByText(/Ponúknite svoje zručnosti/i)).toBeInTheDocument();
    expect(screen.getByText(/Hľadajte zručnosti/i)).toBeInTheDocument();
  });

  it('shows placeholder message', () => {
    render(<CreateModule />);
    
    expect(screen.getByText(/Funkcia vytvárania obsahu bude dostupná čoskoro/i)).toBeInTheDocument();
  });

  it('renders create buttons as grid', () => {
    const { container } = render(<CreateModule />);
    
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });
});

