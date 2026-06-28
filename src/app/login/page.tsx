"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { initializeFirebase } from "@/firebase"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<any>(null)
  const [checking, setChecking] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const { auth: authInstance } = initializeFirebase()
    if (authInstance) {
      setAuth(authInstance)
      const unsub = onAuthStateChanged(authInstance, async (user) => {
        if (user && !user.isAnonymous) router.push("/")
        else {
          if (user?.isAnonymous) {
            setSigningOut(true)
            await signOut(authInstance)
            setSigningOut(false)
          }
          setChecking(false)
        }
      })
      return () => unsub()
    } else {
      setError("Firebase is not configured. Please check your environment setup.")
      setChecking(false)
    }
  }, [router])

  if (checking || signingOut) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const handleSignIn = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return }
    if (!auth) { setError("Firebase not initialized"); return }
    setError("")
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/")
    } catch (e: any) {
      setError(e.message || "Sign in failed")
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">GridSheet Manager</CardTitle>
          <CardDescription>Sign in to manage your brokerage operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleSignIn}>Sign In</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
