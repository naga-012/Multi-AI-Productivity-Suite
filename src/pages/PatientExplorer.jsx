import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Eye, Filter, UserCheck, ShieldAlert, ArrowRight, Activity, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const PatientExplorer = () => {
  const { token, API_URL } = useAuth();
  
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch(`${API_URL}/patients`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error('Failed to retrieve patients');
        }
        const data = await res.json();
        setPatients(data);
      } catch (err) {
        console.error(err);
        setError('Error synchronizing patient files.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [token]);

  // Filter & Search Logic
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.medical_history.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRisk = 
      riskFilter === 'All' || 
      patient.risk_tier === riskFilter;

    return matchesSearch && matchesRisk;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Patient Directory</h1>
          <p className="text-slate-400 text-sm">Longitudinal medical logs and risk profile charts.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Filter and Search Bar controls */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            placeholder="Search by name, email, or pathology history (e.g. Glaucoma)..."
          />
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-brand-400" />
            <span>Risk Tier:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:ring-0 focus:outline-none font-semibold cursor-pointer"
            >
              <option value="All" className="bg-slate-950 text-slate-200">All Tiers</option>
              <option value="High" className="bg-slate-950 text-rose-400">High Risk</option>
              <option value="Medium" className="bg-slate-950 text-amber-400">Medium Risk</option>
              <option value="Stable" className="bg-slate-950 text-emerald-400">Stable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Table Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredPatients.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UserCheck className="w-12 h-12 stroke-[1] mx-auto mb-2 text-slate-600" />
            <p className="text-sm">No patient files matching search parameters found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/40">
                  <th className="px-6 py-4">Demographics</th>
                  <th className="px-6 py-4">Risk Profile</th>
                  <th className="px-6 py-4">Visual Acuity (OD / OS)</th>
                  <th className="px-6 py-4">Intraocular Pressures</th>
                  <th className="px-6 py-4">Medical History Tags</th>
                  <th className="px-6 py-4">Last Visit</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredPatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-slate-950/40 transition">
                    <td className="px-6 py-4.5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-100 text-sm">{patient.name}</p>
                        <p className="text-slate-400">{patient.gender}, {patient.age} years old</p>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border ${
                        patient.risk_tier === 'High' 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                          : (patient.risk_tier === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          patient.risk_tier === 'High' 
                            ? 'bg-rose-500' 
                            : (patient.risk_tier === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500')
                        }`} />
                        {patient.risk_tier}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="font-semibold text-slate-200">
                        {patient.visual_acuity_od} <span className="text-slate-500">/</span> {patient.visual_acuity_os}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      {patient.iop_od || patient.iop_os ? (
                        <span className="font-semibold text-slate-350">
                          {patient.iop_od || '--'} <span className="text-slate-500">/</span> {patient.iop_os || '--'} mmHg
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Not Checked</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {patient.medical_history.map((tag, idx) => (
                          <span key={idx} className="bg-slate-800 text-[10px] text-slate-300 font-medium px-2 py-0.5 rounded border border-slate-700/30">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-medium text-slate-400">
                      {patient.last_visit ? patient.last_visit : 'First consultation'}
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      <div className="inline-flex gap-2">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 font-semibold rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Link>
                        <Link
                          to="/diagnose"
                          state={{ selectedPatientId: patient.id }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition"
                        >
                          <Activity className="w-3.5 h-3.5" /> AI Scan
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientExplorer;
