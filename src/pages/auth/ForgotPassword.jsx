import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound, CheckCircle, Mail, Key } from 'lucide-react';

const ForgotPassword = () => {
  const [step, setStep] = useState('REQUEST'); // REQUEST, VERIFY, RESET, SUCCESS
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate();

  const API_URL = 'http://localhost:5000/api';

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch reset code');
      }

      setStatusMessage(data.message);
      setStep('VERIFY');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid code verified');
      }

      setTempToken(data.tempToken);
      setStep('RESET');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tempToken, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not reset password');
      }

      setStep('SUCCESS');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl z-10 backdrop-blur-md">
        <div className="mb-6">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* STEP A: REQUEST EMAIL */}
        {step === 'REQUEST' && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 mb-3 border border-brand-500/20">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Reset Account Access</h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter your institutional email to dispatch a 6-digit security code.
              </p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Institutional Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  placeholder="dr.smith@ocucare.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition disabled:opacity-50 text-sm"
              >
                {loading ? 'Dispatching Code...' : 'Dispatch Verification Code'}
              </button>
            </form>
          </div>
        )}

        {/* STEP B: VERIFY OTP */}
        {step === 'VERIFY' && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 mb-3 border border-brand-500/20">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Security Verification</h2>
              <p className="text-sm text-slate-400 mt-1">
                Please enter the 6-digit verification code sent to your environment logs.
              </p>
            </div>

            {statusMessage && (
              <div className="mb-5 p-3.5 bg-brand-950/40 border border-brand-800/30 rounded-xl">
                <p className="text-xs text-brand-300 leading-normal">{statusMessage}</p>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center tracking-[0.5em] text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  placeholder="000000"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition disabled:opacity-50 text-sm"
              >
                {loading ? 'Verifying Code...' : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => setStep('REQUEST')}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-300 transition mt-2 hover:underline"
              >
                Resend Code
              </button>
            </form>
          </div>
        )}

        {/* STEP C: RESET PASSWORD */}
        {step === 'RESET' && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 mb-3 border border-brand-500/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Choose New Password</h2>
              <p className="text-sm text-slate-400 mt-1">
                Establish a secure password of at least 8 characters.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition disabled:opacity-50 text-sm"
              >
                {loading ? 'Committing Password...' : 'Commit New Password'}
              </button>
            </form>
          </div>
        )}

        {/* STEP D: SUCCESS SCREEN */}
        {step === 'SUCCESS' && (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20 animate-bounce">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Password Updated</h2>
            <p className="text-sm text-slate-400 mt-2 mb-6">
              Your security credentials have been successfully updated in our database.
            </p>
            <Link
              to="/login"
              className="inline-block w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition text-sm"
            >
              Sign In to OcuCare
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
