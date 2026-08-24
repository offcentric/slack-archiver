import '@/app/css/global.css';
import { SessionProvider } from '@/context/SessionContext';
import NavBar from '@/components/NavBar';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        {children}
    );
}