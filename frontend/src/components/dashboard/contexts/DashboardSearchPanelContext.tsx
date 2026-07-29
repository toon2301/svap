'use client';

import { createContext, useContext, type ReactNode } from 'react';

type OpenSearchPanel = () => void;

const DashboardSearchPanelContext = createContext<OpenSearchPanel | undefined>(undefined);

export function DashboardSearchPanelProvider({
  children,
  onOpen,
}: {
  children: ReactNode;
  onOpen?: OpenSearchPanel;
}) {
  return (
    <DashboardSearchPanelContext.Provider value={onOpen}>
      {children}
    </DashboardSearchPanelContext.Provider>
  );
}

export function useDashboardSearchPanel(): OpenSearchPanel | undefined {
  return useContext(DashboardSearchPanelContext);
}
