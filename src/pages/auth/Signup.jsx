import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, ShieldAlert, BadgeCheck } from 'lucide-react';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [licenseId, setLicenseId] = useState('');
  
  const [validationError, setValidationError] = useState('');
  const { signup, error: authError } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!fullName || !email || !password) {
      setValidationError('All fields are required');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setValidationError('Please enter a valid institutional email');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return;
    }

    try {
      await signup(fullName, email, password, clinicName, licenseId);
      navigate('/');
    } catch (err) {
      // Error handled by AuthContext
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl z-10 backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 mb-3 border border-brand-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create OcuCare Account</h1>
          <p className="text-sm text-slate-400 mt-1">Register new clinician credentials</p>
        </div>

        {(authError || validationError) && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 font-medium">{validationError || authError}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Full Name (with Prefix)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              placeholder="Dr. Jordan Vance"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Institutional Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              placeholder="jordan.vance@clinic.org"
              required
            />
          </div>



          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password (Min 8 Characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              placeholder="••••••••••••"
              required
            />
          </div>

          <div className="flex items-start gap-2 py-1">
            <BadgeCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-400 leading-tight">
              By checking this, you certify that you are a licensed health practitioner accessing secure patient files under HIPAA compliance.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition transform active:scale-95 text-sm mt-2"
          >
            Register Clinician Credentials
          </button>
        </form>

        <div className="mt-6 text-center pt-5 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Already have an active account?{' '}
            <Link 
              to="/login" 
              className="text-brand-400 hover:text-brand-300 font-semibold transition hover:underline"
            >
              Sign In Instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
