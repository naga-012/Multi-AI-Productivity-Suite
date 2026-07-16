import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Stethoscope, Building2, Award, Clock, Save, Edit2, X, AlertCircle } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile, error: authError } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [clinicName, setClinicName] = useState(user?.clinic_name || '');
  const [licenseId, setLicenseId] = useState(user?.license_id || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateProfile(fullName, email, clinicName, licenseId);
      setSuccess('Profile updated successfully and synchronized with the secure local database.');
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update user profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFullName(user?.full_name || '');
    setEmail(user?.email || '');
    setClinicName(user?.clinic_name || '');
    setLicenseId(user?.license_id || '');
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clinician Workspace settings</h1>
          <p className="text-slate-400 text-sm">Configure your personal credentials and clinic settings.</p>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl transition"
          >
            <Edit2 className="w-3.5 h-3.5" /> Modify Settings
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/30 rounded-xl text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {(error || authError) && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl flex items-start gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p>{error || authError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clinician Card Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="relative mb-4 group">
            <img
              src={user?.profile_image || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300"}
              alt="Clinician Avatar"
              className="w-24 h-24 rounded-2xl object-cover border border-slate-700 bg-slate-950 shadow-md"
            />
            <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer">
              <span className="text-[10px] text-white font-medium uppercase tracking-wider">Change photo</span>
            </div>
          </div>
          <h2 className="text-lg font-bold text-white leading-snug">{user?.full_name}</h2>
          <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-semibold rounded-full">
            {user?.role || 'Clinician'}
          </span>

          <div className="w-full border-t border-slate-800 mt-6 pt-5 space-y-3.5 text-left text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-500" />
                <span>License Status</span>
              </div>
              <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">Verified</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                <span>HIPAA Gateways</span>
              </div>
              <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">Enforced</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Last Session</span>
              </div>
              <span className="font-semibold text-slate-300">
                {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Credentials Form Card */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Stethoscope className="w-4 h-4 text-brand-400" /> Clinical Metadata
          </h3>

          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Clinician Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditing}
                className="w-full bg-slate-950 border border-slate-800 disabled:border-slate-850 disabled:bg-slate-950/50 disabled:text-slate-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Professional Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className="w-full bg-slate-950 border border-slate-800 disabled:border-slate-850 disabled:bg-slate-950/50 disabled:text-slate-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                required
              />
            </div>


          </form>

          <div className="mt-8 border-t border-slate-800 pt-5">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-brand-400" /> Security Clearances
            </h4>
            <p className="text-xs text-slate-500 leading-normal">
              Your clinician credentials grant you access to patient profiles, diagnostic uploading portals, and clinic queues. Any change in your email address will require re-verifying institutional databases. All patient query events are logged for security audits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
