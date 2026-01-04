import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    checkRecoveryToken();
  }, []);

  const checkRecoveryToken = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Invalid or expired password reset link. Please request a new one.');
        setIsValidToken(false);
      } else {
        setIsValidToken(true);
      }
    } catch (err) {
      setError('Failed to verify reset link. Please try again.');
      setIsValidToken(false);
    } finally {
      setIsCheckingToken(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-10 border border-gray-200/50 backdrop-blur-sm">
          <div className="text-center mb-10">
            <img
              src="/solvera_energy_logo_redesign.png"
              alt="Solvera Energy"
              className="w-64 h-auto mx-auto mb-8"
            />
            <h1 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Reset Your Password</h1>
            <p className="text-slate-600 text-base">Enter your new password below</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-emerald-800 font-semibold mb-1">
                  Password successfully reset!
                </p>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  Redirecting to login page...
                </p>
              </div>
            </div>
          )}

          {!isValidToken ? (
            <div className="text-center">
              <p className="text-slate-700 mb-6 leading-relaxed">
                This password reset link is invalid or has expired.
              </p>
              <a
                href="/"
                className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 px-8 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-semibold shadow-lg shadow-orange-500/25"
              >
                Back to Login
              </a>
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-700 mb-2.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                    placeholder="Enter new password"
                    required
                    disabled={isSubmitting || success}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Must be at least 6 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all duration-200 text-slate-900 placeholder:text-slate-400"
                    placeholder="Confirm new password"
                    required
                    disabled={isSubmitting || success}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || success}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 px-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Password Reset!
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
