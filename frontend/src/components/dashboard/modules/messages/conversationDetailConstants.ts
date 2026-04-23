import type React from 'react';

export const MESSAGE_POLL_INTERVAL_MS = 10_000;
export const MOBILE_LATEST_SCROLL_THRESHOLD_PX = 80;
export const MOBILE_SCROLL_TO_BOTTOM_BUTTON_THRESHOLD_PX = 300;
export const MOBILE_MESSAGE_SIDE_PADDING_CLASS = 'px-1.5 pt-4 pb-2';
export const DESKTOP_MESSAGE_SIDE_PADDING_CLASS = 'px-4 py-4 sm:px-5 lg:px-6';
export const MOBILE_OWN_MESSAGE_BUBBLE_SUPPRESSION_STYLE: React.CSSProperties = {
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  touchAction: 'manipulation',
};
