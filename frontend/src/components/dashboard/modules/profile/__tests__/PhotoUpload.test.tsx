import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PhotoUpload from '../../profile/PhotoUpload';

describe('PhotoUpload', () => {
  it('disables button when uploading', () => {
    render(<PhotoUpload onPhotoSelect={jest.fn()} isUploading />);
    const btn = screen.getByTitle('Pridať fotku');
    expect(btn).toBeDisabled();
  });

  it('rejects non-image file type and large files', () => {
    render(<PhotoUpload onPhotoSelect={jest.fn()} />);
    const btn = screen.getByTitle('Pridať fotku');
    fireEvent.click(btn);
    // create hidden input and dispatch change
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Non-image
    const bad = new File(['x'], 'x.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [bad] } });
    expect(screen.getByText(/Prosím vyber obrázok/)).toBeInTheDocument();
    // Large image > 5MB (simulate size)
    Object.defineProperty(bad, 'type', { value: 'image/png' });
    Object.defineProperty(bad, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [bad] } });
    expect(screen.getByText(/príliš veľký/)).toBeInTheDocument();
  });
});


