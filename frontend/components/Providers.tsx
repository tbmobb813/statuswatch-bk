"use client";

import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DbStatusProvider } from './DbStatusContext';
import DBUnavailableBanner from './DBUnavailableBanner'; 

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DbStatusProvider>
        <DBUnavailableBanner />
        {children}
      </DbStatusProvider>
    </ThemeProvider>
  );
}
