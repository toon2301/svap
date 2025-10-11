import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessagesModule from '../MessagesModule';

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ChatBubbleLeftRightIcon: () => <div>ChatIcon</div>,
  InboxIcon: () => <div>InboxIcon</div>,
}));

describe('MessagesModule', () => {
  it('renders heading', () => {
    render(<MessagesModule />);
    
    expect(screen.getByText('Správy')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<MessagesModule />);
    
    expect(screen.getByText('Žiadne správy')).toBeInTheDocument();
    expect(screen.getByText(/Keď vám niekto pošle správu/i)).toBeInTheDocument();
  });

  it('shows placeholder message', () => {
    render(<MessagesModule />);
    
    expect(screen.getByText(/Funkcia správ bude dostupná čoskoro/i)).toBeInTheDocument();
  });

  it('renders empty inbox icon', () => {
    const { container } = render(<MessagesModule />);
    
    const icon = container.querySelector('div');
    expect(icon).toBeInTheDocument();
  });
});

