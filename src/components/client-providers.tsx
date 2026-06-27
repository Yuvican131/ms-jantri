"use client"

import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/hooks/use-theme"
import { FirebaseClientProvider } from "@/firebase"

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