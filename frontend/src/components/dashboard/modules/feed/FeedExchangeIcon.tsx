'use client';

/**
 * Ikona výmeny – marker zdieľaného príspevku.
 *
 * Vytiahnutá z karty, aby ju vedel použiť aj vnorený náhľad zdieľaného
 * obsahu a mobilná obrazovka detailu bez toho, aby si ju kreslili znova.
 */

export default function ExchangeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M7 10h14l-4-4" />
      <path d="M17 14H3l4 4" />
    </svg>
  );
}
