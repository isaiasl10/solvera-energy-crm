import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

type LoginProps = {
  loading: boolean;
};

export default function Login({ loading }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        console.log('Session already exists on login page load');
      }
    });
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const emailClean = email.trim().toLowerCase();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: emailClean,
      password,
    });

    console.log('LOGIN DEBUG', {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      email: emailClean,
      hasSession: !!data?.session,
      error: signInError,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setResetSuccess(false);

    const emailClean = email.trim().toLowerCase();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailClean, {
      redirectTo: 'https://auric-core.io/reset-password',
    });

    if (resetError) {
      setError(resetError.message);
      setIsSubmitting(false);
      return;
    }

    setResetSuccess(true);
    setIsSubmitting(false);
  };

  const handleBackToLogin = () => {
    setIsResetMode(false);
    setResetSuccess(false);
    setError('');
    setPassword('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 via-blue-700 to-slate-700 p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.1),transparent_50%)]"></div>
            <div className="relative z-10 text-center">
              <div className="mb-8">
                <img
                  src="/auric_core_2.png"
                  alt="Auric-Core"
                  className="h-56 w-auto mx-auto drop-shadow-2xl"
                />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Auric-Core</h2>
              <p className="text-lg text-blue-50 max-w-md">
                Enterprise energy management platform built for the future
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>

          <div className="p-12 lg:p-16 flex flex-col justify-center">
            <div className="lg:hidden text-center mb-10">
              <div className="mb-6 flex justify-center">
                <img
                  src="/auric_core_2.png"
                  alt="Auric-Core"
                  className="h-44 w-auto"
                />
              </div>
            </div>

            <div className="mb-10">
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                {isResetMode ? 'Reset Password' : 'Welcome Back'}
              </h1>
              <p className="text-slate-600 text-base">
                {isResetMode
                  ? 'Enter your email to receive a password reset link'
                  : 'Sign in to your account to continue'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 leading-relaxed">{error}</p>
              </div>
            )}

            {resetSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-emerald-800 font-semibold mb-1">
                    Password reset email sent!
                  </p>
                  <p className="text-sm text-emerald-700 leading-relaxed">
                    Check your inbox for a link to reset your password.
                  </p>
                </div>
              </div>
            )}

            {isResetMode ? (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2.5">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-base"
                    placeholder="you@example.com"
                    required
                    disabled={isSubmitting || resetSuccess}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || resetSuccess}
                  className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white py-4 px-4 rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-base"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full text-slate-600 hover:text-slate-900 transition-colors font-semibold flex items-center justify-center gap-2 py-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2.5">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-base"
                    placeholder="you@example.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-900 mb-2.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 text-slate-900 placeholder:text-slate-400 text-base"
                    placeholder="Enter your password"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white py-4 px-4 rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-base"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                Need help? Contact your administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
