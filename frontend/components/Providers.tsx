"use client";

import React from 'react';
import { DbStatusProvider } from './DbStatusContext';
import DBUnavailableBanner from './DBUnavailableBanner';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DbStatusProvider>
      <DBUnavailableBanner />
      {children}
    </DbStatusProvider>
  );
}
