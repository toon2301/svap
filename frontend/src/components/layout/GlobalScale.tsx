'use client';

import React, { useEffect, useState } from 'react';

interface GlobalScaleProps {
  children: React.ReactNode;
}

// Pevný dizajn pre celú aplikáciu
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

export default function GlobalScale({ children }: GlobalScaleProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (typeof window === 'undefined') return;

      const { innerWidth, innerHeight } = window;
      const scaleX = innerWidth / BASE_WIDTH;
      const scaleY = innerHeight / BASE_HEIGHT;
      const nextScale = Math.min(scaleX, scaleY);

      setScale(nextScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div
      id="app-root"
      style={{
        width: `${BASE_WIDTH}px`,
        height: `${BASE_HEIGHT}px`,
        transformOrigin: 'top left',
        transform: `scale(${scale})`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}


