import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, ShieldAlert, Activity } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Find the URL to redirect back to (default: dashboard)
  const from = location.state?.from?.pathname || '/';

  const validateEmail = (val) => {
    if (!val) return 'Email is required';
    if (!val.includes('@') || !val.includes('.')) return 'Please enter a valid institutional email';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const emailErr = validateEmail(email);
    if (emailErr) {
      setValidationError(emailErr);
      return;
    }

    if (!password) {
      setValidationError('Password is required');
      return;
    }

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      // Handled by context error state or try-catch
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Decorative background grid and glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl z-10 backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 mb-3 border border-brand-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">OcuCare</h1>
          <p className="text-sm text-slate-400 mt-1">Multi-AI Clinical Productivity Suite</p>
        </div>

        {(authError || validationError) && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 font-medium">{validationError || authError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Institutional Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              placeholder="dr.smith@ocucare.com"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Security Password
              </label>
              <Link 
                to="/forgot-password" 
                className="text-xs text-brand-400 hover:text-brand-300 hover:underline transition"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-brand-500 focus:ring-brand-500 focus:ring-offset-slate-900 focus:ring-2"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 select-none transition">
                Keep session authenticated
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition transform active:scale-95 text-sm"
          >
            Authenticate Portal Access
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Authorized clinicians only. Need access?{' '}
            <Link 
              to="/signup" 
              className="text-brand-400 hover:text-brand-300 font-semibold transition hover:underline"
            >
              Register Workspace Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
