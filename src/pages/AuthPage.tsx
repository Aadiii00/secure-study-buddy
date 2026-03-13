import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Eye, EyeOff, ArrowLeft, Mail, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

// Common disposable/temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', 'fakeinbox.com', 'tempail.com',
  'tempr.email', 'temp-mail.org', 'temp-mail.io', 'mohmal.com',
  'getnada.com', 'maildrop.cc', 'harakirimail.com', 'tmail.ws',
  '10minutemail.com', 'minutemail.com', 'emailondeck.com', 'crazymailing.com',
  'discard.email', 'mailnesia.com', 'spamgourmet.com', 'safetymail.info',
  'mytemp.email', 'binkmail.com', 'bobmail.info', 'clrmail.com',
]);

const isDisposableEmail = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
};

const isValidEmailFormat = (email: string): boolean => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
};

const AuthPage = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [adminMode, setAdminMode] = useState<'login' | 'signup'>('login');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const { signIn, signUp, resendVerification, signOut } = useAuth();
  const navigate = useNavigate();

  const enforceRole = async (expectedRole: 'admin' | 'student') => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Not signed in.');

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (error) throw error;
    const actual = data?.role as 'admin' | 'student' | undefined;
    if (!actual) throw new Error('No role assigned to this account.');
    if (actual !== expectedRole) throw new Error(`This account is not ${expectedRole}.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!isValidEmailFormat(email)) {
          throw new Error('Please enter a valid email address.');
        }
        if (isDisposableEmail(email)) {
          throw new Error('Temporary/disposable email addresses are not allowed. Please use a permanent email.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const { needsVerification } = await signUp(email, password, fullName);
        if (needsVerification) {
          setMode('verify');
          toast.success('Verification email sent! Check your inbox.');
        } else {
          toast.success('Account created!');
          navigate('/dashboard');
        }
      } else if (mode === 'login') {
        if (!isValidEmailFormat(email)) {
          throw new Error('Please enter a valid email address.');
        }
        await signIn(email, password);
        await enforceRole('student');
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else if (mode === 'forgot') {
        if (!isValidEmailFormat(email)) {
          throw new Error('Please enter a valid email address.');
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Password reset link sent!');
        setMode('login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      if (adminMode === 'signup') {
        if (!isValidEmailFormat(adminEmail)) {
          throw new Error('Please enter a valid email address.');
        }
        if (isDisposableEmail(adminEmail)) {
          throw new Error('Temporary/disposable email addresses are not allowed. Please use a permanent email.');
        }
        if (adminPassword.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await signUp(adminEmail, adminPassword, adminFullName);
        toast.success('Admin account created. Please sign in.');
        setAdminMode('login');
        return;
      }

      if (!isValidEmailFormat(adminEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      await signIn(adminEmail, adminPassword);
      await enforceRole('admin');
      toast.success('Welcome back!');
      navigate('/admin');
    } catch (error: any) {
      try {
        await signOut();
      } catch {
        // ignore signOut errors
      }
      toast.error(error.message || 'Authentication failed');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerification(email);
      toast.success('Verification email resent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const SocialButtons = ({ onSuccessRoute }: { onSuccessRoute: '/dashboard' | '/admin' }) => {
    const handleOAuth = async (provider: 'google' | 'github') => {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error(error.message || `${provider} sign-in failed`);
        return;
      }
      try {
        await enforceRole(onSuccessRoute === '/admin' ? 'admin' : 'student');
        navigate(onSuccessRoute);
      } catch (e: any) {
        try {
          await signOut();
        } catch {
          // ignore signOut errors
        }
        toast.error(e?.message || 'Authentication failed');
      }
    };

    return (
      <>
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-2">
          <Button type="button" variant="outline" className="w-full" onClick={() => handleOAuth('google')}>
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <Button type="button" variant="outline" className="w-full" onClick={() => handleOAuth('github')}>
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#111827" d="M12 .5C5.73.5.75 5.6.75 12.04c0 5.15 3.17 9.52 7.58 11.07.55.1.75-.24.75-.53 0-.26-.01-1.12-.02-2.03-3.08.69-3.73-1.24-3.73-1.24-.5-1.32-1.23-1.67-1.23-1.67-1.01-.71.08-.7.08-.7 1.12.08 1.71 1.18 1.71 1.18.99 1.76 2.6 1.25 3.23.95.1-.74.39-1.25.7-1.54-2.46-.29-5.05-1.27-5.05-5.66 0-1.25.43-2.27 1.14-3.07-.11-.29-.49-1.47.11-3.06 0 0 .93-.31 3.05 1.17a10.2 10.2 0 0 1 2.78-.39c.94 0 1.89.13 2.78.39 2.12-1.48 3.05-1.17 3.05-1.17.6 1.59.22 2.77.11 3.06.71.8 1.14 1.82 1.14 3.07 0 4.4-2.59 5.36-5.06 5.65.4.36.76 1.07.76 2.17 0 1.57-.01 2.83-.01 3.22 0 .29.2.64.76.53 4.41-1.55 7.57-5.92 7.57-11.07C23.25 5.6 18.27.5 12 .5z"/>
            </svg>
            Continue with GitHub
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen px-4">
      <div className="max-w-5xl mx-auto py-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>

        <div className="flex items-center justify-center gap-2 mb-10">
          <Shield className="w-6 h-6" />
          <span className="text-xl font-semibold">Tracxn<span className="text-red-500">Labs</span></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student */}
          <div className="border border-border rounded-xl p-6 bg-background min-h-[640px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Student</h2>
                <p className="text-sm text-muted-foreground">Access exams, results, and  leaderboard.</p>
              </div>
            </div>

            {mode === 'verify' ? (
              <div className="text-center flex-1 flex flex-col justify-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Verify your email</h3>
                <p className="text-sm text-muted-foreground mb-2">We've sent a verification link to</p>
                <p className="text-sm font-medium mb-6 break-all">{email}</p>

                <div className="border border-border rounded-lg p-4 mb-6 text-left space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">Check your inbox (and spam folder)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">Click the verification link in the email</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">Come back and sign in</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full mb-3" onClick={handleResend} disabled={resending}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Sending...' : 'Resend verification email'}
                </Button>

                <Button variant="ghost" className="w-full" onClick={() => { setMode('login'); }}>
                  Back to Sign In
                </Button>
              </div>
            ) : mode === 'forgot' ? (
              <>
                <button onClick={() => setMode('login')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h3 className="text-base font-semibold mb-1">Reset Password</h3>
                <p className="text-sm text-muted-foreground mb-6">We'll send you a reset link.</p>
              </>
            ) : (
              <div className="flex rounded-lg border border-border p-1 mb-6">
                <button
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <Input
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={mode === 'signup'}
                />
              )}
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {mode !== 'forgot' && (
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </Button>
            </form>

            {mode !== 'forgot' && <SocialButtons onSuccessRoute="/dashboard" />}
          </div>

          {/* Admin */}
          <div className="border border-border rounded-xl p-6 bg-background min-h-[640px] flex flex-col">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Admin</h2>
                <p className="text-sm text-muted-foreground">Manage exams, monitor attempts, and analytics.</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground">Restricted</span>
            </div>

            <div className="flex rounded-lg border border-border p-1 mb-6">
              <button
                onClick={() => setAdminMode('login')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  adminMode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAdminMode('signup')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  adminMode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              {adminMode === 'signup' && (
                <Input
                  placeholder="Full Name"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  required={adminMode === 'signup'}
                />
              )}
              <Input
                type="email"
                placeholder="Email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  type={showAdminPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button type="submit" disabled={adminLoading} className="w-full">
                {adminLoading ? 'Processing...' : adminMode === 'login' ? 'Sign In as Admin' : 'Create Admin Account'}
              </Button>
            </form>

            <SocialButtons onSuccessRoute="/admin" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
