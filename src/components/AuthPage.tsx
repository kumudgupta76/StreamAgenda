'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckSquare, Mail, Lock, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Invalid email or password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/popup-closed-by-user': return 'Sign-in popup was closed. Please try again.';
    case 'auth/popup-blocked': return 'Sign-in popup was blocked. Please allow popups.';
    default: return 'An error occurred. Please try again.';
  }
}

export function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try { await signIn(signInEmail, signInPassword); }
    catch (err: any) { setError(getFirebaseErrorMessage(err.code)); }
    finally { setIsLoading(false); }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (signUpPassword !== signUpConfirmPassword) { setError('Passwords do not match.'); return; }
    if (signUpPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsLoading(true);
    try { await signUp(signUpEmail, signUpPassword, signUpName || undefined); }
    catch (err: any) { setError(getFirebaseErrorMessage(err.code)); }
    finally { setIsLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try { await signInWithGoogle(); }
    catch (err: any) { setError(getFirebaseErrorMessage(err.code)); }
    finally { setGoogleLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-primary/90 via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CheckSquare className="h-6 w-6" />
            </div>
            <span className="text-3xl font-bold font-headline tracking-tight">Task Buddy</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Your agendas,<br />organized beautifully.
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md leading-relaxed">
            Create, manage, and present your task agendas with rich details, due dates, and beautiful presentation mode. Synced across all your devices.
          </p>
          <div className="flex flex-col gap-4 mt-10 max-w-sm">
            {['Rich markdown task details', 'Presentation & slideshow mode', 'Real-time cloud sync'].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-primary-foreground/90">
                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-3 w-3" />
                </div>
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold font-headline tracking-tight">Task Buddy</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">Sign in to sync your agendas across devices</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-6 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full h-12 gap-3 text-sm font-medium rounded-xl border-2 hover:bg-muted/50 transition-all"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || isLoading}
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-5 w-5" />}
            Continue with Google
          </Button>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-xs text-muted-foreground uppercase tracking-wider">or continue with email</span>
            </div>
          </div>

          <Tabs defaultValue="signin" className="w-full" onValueChange={() => setError(null)}>
            <TabsList className="grid w-full grid-cols-2 mb-6 h-11 rounded-xl p-1">
              <TabsTrigger value="signin" className="rounded-lg text-sm font-medium">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-sm font-medium">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input id="signin-email" type="email" placeholder="you@example.com" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required disabled={isLoading} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input id="signin-password" type="password" placeholder="••••••••" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required disabled={isLoading} />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl font-medium text-sm" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input id="signup-name" type="text" placeholder="Your name" value={signUpName} onChange={e => setSignUpName(e.target.value)} className="pl-10 h-11 rounded-xl" disabled={isLoading} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={signUpEmail} onChange={e => setSignUpEmail(e.target.value)} className="pl-10 h-11 rounded-xl" required disabled={isLoading} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="signup-password" type="password" placeholder="6+ chars" value={signUpPassword} onChange={e => setSignUpPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required minLength={6} disabled={isLoading} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirm</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input id="signup-confirm" type="password" placeholder="••••••••" value={signUpConfirmPassword} onChange={e => setSignUpConfirmPassword(e.target.value)} className="pl-10 h-11 rounded-xl" required minLength={6} disabled={isLoading} />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl font-medium text-sm" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-[11px] text-muted-foreground text-center mt-8 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
