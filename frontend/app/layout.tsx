import '@/app/globals.css';
import NavBar from '@/components/NavBar';
import {SessionProvider} from '@/context/SessionContext';
import React from 'react';

export const metadata = {
    title: 'Slack Archive',
    description: 'Browse the Slack archive for workspaces you can access.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="en">
            <body>
                <SessionProvider>
                    <NavBar/>
                    <main>{children}</main>
                </SessionProvider>
            </body>
        </html>
    );
}
