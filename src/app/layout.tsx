'use client'

import './globals.css'
import { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="gxomz4vHGaoGsrkZ7_POOOSYoudFDmzW8ieMYLKNVwY" />
      </head>    
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
