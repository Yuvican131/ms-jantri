"use client"

import dynamic from 'next/dynamic'
import { Toaster } from "@/components/ui/toaster"

const ThemeProvider = dynamic(() => import("@/hooks/use-theme").then(mod => mod.ThemeProvider), { ssr: false })
const FirebaseClientProvider = dynamic(() => import("@/firebase").then(mod => mod.FirebaseClientProvider), { ssr: false })

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <FirebaseClientProvider>
        {children}
        <Toaster />
      </FirebaseClientProvider>
    </ThemeProvider>
  )
}