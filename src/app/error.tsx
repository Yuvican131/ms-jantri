'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Something went wrong!</CardTitle>
          <CardDescription>An unexpected error occurred.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We&apos;ve logged the error and will look into it. Please try again.
          </p>
          {error?.message && (
            <p className="text-xs font-mono bg-muted p-2 rounded text-destructive break-all">
              {error.message}
            </p>
          )}
          <Button onClick={() => reset()} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
