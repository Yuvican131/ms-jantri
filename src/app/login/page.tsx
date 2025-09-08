
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const { signInWithPhone } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This effect ensures the reCAPTCHA verifier is initialized when the component mounts.
    // The verifier is attached to a DOM element, so it needs to run on the client.
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          // This callback is sometimes useful for debugging, but not essential for the flow.
        }
      });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
        toast({ title: 'Phone number is required', variant: 'destructive'});
        return;
    }
    try {
      const appVerifier = window.recaptchaVerifier!;
      const result = await signInWithPhone(`+${phoneNumber}`, appVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      toast({ title: 'OTP Sent', description: 'An OTP has been sent to your phone.' });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Failed to Send OTP',
        description: 'Please try again. Ensure the phone number is correct and includes the country code.',
        variant: 'destructive',
      });
       // Important: Reset the reCAPTCHA on error. 
       // This renders a new reCAPTCHA widget, getting it out of a broken state.
       if (window.recaptchaVerifier) {
         window.recaptchaVerifier.render().then((widgetId) => {
            // @ts-ignore - grecaptcha is available on the window
            if (window.grecaptcha) {
              window.grecaptcha.reset(widgetId);
            }
         });
       }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) {
      toast({ title: 'Please send OTP first.', variant: 'destructive'});
      return;
    }
    if (!otp) {
        toast({ title: 'OTP is required.', variant: 'destructive'});
        return;
    }
    try {
      await confirmationResult.confirm(otp);
      router.push('/');
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Sign-in Failed',
        description: 'Invalid OTP or an error occurred.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your phone number below to login to your account.
          </CardDescription>
        </CardHeader>
        {!otpSent ? (
          <form onSubmit={handleSendOtp}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number (with country code)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 911234567890"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit">Send OTP</Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter your 6-digit OTP"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" type="submit">Verify OTP & Sign In</Button>
              <Button variant="link" size="sm" onClick={() => {
                setOtpSent(false);
                setPhoneNumber('');
                setOtp('');
              }}>
                Change phone number
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
      {/* This empty div is where the invisible reCAPTCHA widget will be rendered by Firebase */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
