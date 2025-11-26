'use client';

import React, { useEffect } from 'react';

interface GlobalScaleProps {
  children: React.ReactNode;
}

// Základná desktop šírka, pri ktorej je dizajn "ideálny"
const BASE_WIDTH = 1600;
// Minimálne zmenšenie (aby text nebol extrémne malý)
const MIN_SCALE = 0.8;

export default function GlobalScale({ children }: GlobalScaleProps) {
  useEffect(() => {
    const updateScale = () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      const width = window.innerWidth;
      let scale = 1;

      // Na mobiloch / malých tabletoch nechávame prirodzený responzívny layout
      if (width >= 1024) {
        scale = Math.max(MIN_SCALE, Math.min(1, width / BASE_WIDTH));
      }

      // Aplikujeme scale priamo na html element
      const html = document.documentElement;
      html.style.transform = `scale(${scale})`;
      html.style.transformOrigin = 'top left';
      html.style.width = `${100 / scale}%`;
      html.style.height = `${100 / scale}%`;
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      // Cleanup - obnovíme pôvodné hodnoty
      if (typeof document !== 'undefined') {
        const html = document.documentElement;
        html.style.transform = '';
        html.style.transformOrigin = '';
        html.style.width = '';
        html.style.height = '';
      }
    };
  }, []);

  return <>{children}</>;
}


