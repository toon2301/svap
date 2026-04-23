'use client';

import React from 'react';

type ConversationEmptyStateProps = {
  text: string;
};

export function ConversationEmptyState({ text }: ConversationEmptyStateProps) {
  return <div className="py-8 text-center text-sm text-gray-600 dark:text-gray-400">{text}</div>;
}
