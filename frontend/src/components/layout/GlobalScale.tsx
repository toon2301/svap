'use client';

import React, { useEffect, useState } from 'react';

interface GlobalScaleProps {
  children: React.ReactNode;
}

// Základná desktop šírka, pri ktorej je dizajn "ideálny"
const BASE_WIDTH = 1600;
// Minimálne zmenšenie (aby text nebol extrémne malý)
const MIN_SCALE = 0.8;

export default function GlobalScale({ children }: GlobalScaleProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (typeof window === 'undefined') return;

      const width = window.innerWidth;

      // Na mobiloch / malých tabletoch nechávame prirodzený responzívny layout
      if (width < 1024) {
        setScale(1);
        return;
      }

      const nextScale = Math.max(MIN_SCALE, Math.min(1, width / BASE_WIDTH));
      setScale(nextScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const compensatedWidth = `${100 / scale}%`;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: compensatedWidth,
        height: '100%',
      }}
    >
      {children}
    </div>
  );
}


