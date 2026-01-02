'use client';

import { useState, useEffect, useRef } from 'react';
import type { ScrollableTextProps } from './types';

export function ScrollableText({ text }: ScrollableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [autoDirection, setAutoDirection] = useState<'forward' | 'backward'>('forward');
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Zisti, či sme na mobile (šírka menšia ako lg breakpoint)
  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 1024);
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => {
      window.removeEventListener('resize', updateIsMobile);
    };
  }, []);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      const needsScroll = textWidth > containerWidth;
      setShouldScroll(needsScroll);
      if (needsScroll) {
        // Vypočítaj, o koľko pixelov musíme posunúť text doľava
        setTranslateX(containerWidth - textWidth);
      }
    }
  }, [text]);

  // Na mobile: automatická animácia tam a späť v slučke
  useEffect(() => {
    const shouldAutoAnimate = isMobile && shouldScroll;

    if (shouldAutoAnimate) {
      // Vyčisti prípadný starý interval
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
      }

      // Začni smerom dopredu
      setAutoDirection('forward');

      // Každých 9 sekúnd prehoď smer (8s animácia + ~1s pauza na konci)
      autoIntervalRef.current = setInterval(() => {
        setAutoDirection((prev) => (prev === 'forward' ? 'backward' : 'forward'));
      }, 9000);
    } else {
      // Zastav auto animáciu, vráť na začiatok
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
      setAutoDirection('backward');
    }

    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    };
  }, [isMobile, shouldScroll]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        ref={textRef}
        className={`font-medium inline-block whitespace-nowrap transition-transform ease-in-out ${
          isMobile ? 'duration-[8000ms]' : 'duration-[2000ms]'
        }`}
        style={{
          transform:
            shouldScroll &&
            // Na mobile sa riadime autoDirection, na desktope hoverom
            (isMobile ? autoDirection === 'forward' : isHovered)
              ? `translateX(${translateX}px)`
              : 'translateX(0)',
        }}
      >
        {text}
      </span>
    </div>
  );
}


