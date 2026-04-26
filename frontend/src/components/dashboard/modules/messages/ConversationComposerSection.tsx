'use client';

import type React from 'react';
import { ConversationDesktopComposer } from './ConversationDesktopComposer';
import { ConversationMobileComposer } from './ConversationMobileComposer';

type ConversationComposerSectionProps = {
  isMobile: boolean;
  imageInputRef: React.MutableRefObject<HTMLInputElement | null>;
  cameraInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onPendingImageInputChange: React.ChangeEventHandler<HTMLInputElement>;
  mobileComposerProps: React.ComponentProps<typeof ConversationMobileComposer>;
  desktopComposerProps: React.ComponentProps<typeof ConversationDesktopComposer>;
};

export function ConversationComposerSection({
  isMobile,
  imageInputRef,
  cameraInputRef,
  onPendingImageInputChange,
  mobileComposerProps,
  desktopComposerProps,
}: ConversationComposerSectionProps) {
  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        data-testid="conversation-image-picker-input"
        className="hidden"
        onChange={onPendingImageInputChange}
      />
      {isMobile ? (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          data-testid="conversation-camera-picker-input"
          className="hidden"
          onChange={onPendingImageInputChange}
        />
      ) : null}

      {isMobile ? (
        <ConversationMobileComposer {...mobileComposerProps} />
      ) : (
        <ConversationDesktopComposer {...desktopComposerProps} />
      )}
    </>
  );
}
