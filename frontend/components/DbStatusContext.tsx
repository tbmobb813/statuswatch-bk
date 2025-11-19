"use client";

import React, { createContext, useCallback, useContext, useState } from 'react';

type DbStatus = {
  dbUnavailable: boolean;
  setDbUnavailable: (v: boolean) => void;
};

const DbStatusContext = createContext<DbStatus | undefined>(undefined);

export const DbStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [dbUnavailable, setDbUnavailableState] = useState(false);

  const setDbUnavailable = useCallback((v: boolean) => {
    setDbUnavailableState(v);
  }, []);

  return (
    <DbStatusContext.Provider value={{ dbUnavailable, setDbUnavailable }}>
      {children}
    </DbStatusContext.Provider>
  );
};

export function useDbStatus() {
  const ctx = useContext(DbStatusContext);
  if (!ctx) throw new Error('useDbStatus must be used within DbStatusProvider');
  return ctx;
}

export default DbStatusContext;
