import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Activity, FileText, Globe, Clock, Star, ArrowRight, Eye, Trash2, Calendar, 
  Terminal, BarChart3, BookOpen, GraduationCap, PenTool, Briefcase, Sparkles, X, CheckCircle2
} from 'lucide-react';

const DashboardHome = () => {
  const { token, API_URL, user } = useAuth();

  // Telemetry stats
  const [telemetry, setTelemetry] = useState({
    totalExecutions: 0,
    savedDocsCount: 0,
    languagesCount: 0,
    minutesSaved: 0,
    favorites: []
  });

  // Logs & Assets states
  const [history, setHistory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // UI state overlays
  const [selectedAsset, setSelectedAsset] = useState(null); // Current asset in quick-view modal
  const [loading, setLoading] = useState(true);
  const [successToast, setSuccessToast] = useState('');
  const [error, setError] = useState('');

  // 8 Core AI tools dictionary list
  const OCUCARE_TOOLS = [
    { key: 'summarizer', label: 'Doc Summarizer', path: '/tools/summarizer', desc: 'Drag-and-drop file parsing & structured extraction reports.', icon: FileText, color: 'text-indigo-400 border-indigo-950/40 bg-indigo-950/10' },
    { key: 'writer', label: 'Email Writer', path: '/tools/writer', desc: 'Compose patient summaries, time-off drafts, & cover letters.', icon: PenTool, color: 'text-sky-400 border-sky-950/40 bg-sky-950/10' },
    { key: 'resumebuilder', label: 'Resume Optimizer', path: '/tools/resumebuilder', desc: 'ATS optimized candidate builders with STAR rewriters.', icon: Briefcase, color: 'text-emerald-400 border-emerald-950/40 bg-emerald-950/10' },
    { key: 'translator', label: 'Clinical Translator', path: '/tools/translator', desc: 'Preserves medical context across 20+ global languages.', icon: Globe, color: 'text-amber-400 border-amber-950/40 bg-amber-950/10' },
    { key: 'codeassistant', label: 'Developer Studio', path: '/tools/codeassistant', desc: 'Syntax highlights sandbox compilers & ORM schema converters.', icon: Terminal, color: 'text-rose-400 border-rose-950/40 bg-rose-950/10' },
    { key: 'dataanalyzer', label: 'Data Analyzer', path: '/tools/dataanalyzer', desc: 'Spreadsheet import grids with visual custom SVG graphs.', icon: BarChart3, color: 'text-purple-400 border-purple-950/40 bg-purple-950/10' },
    { key: 'notesgenerator', label: 'Notes Harvester', path: '/tools/notesgenerator', desc: 'Transcripts segmentation, flashcards, & visual mind maps.', icon: BookOpen, color: 'text-cyan-400 border-cyan-950/40 bg-cyan-950/10' },
    { key: 'studyassistant', label: 'Study Assistant', path: '/tools/studyassistant', desc: 'Interactive MCQs, reviews flip decks, & case solutions.', icon: GraduationCap, color: 'text-teal-400 border-teal-950/40 bg-teal-950/10' }
  ];

  const fetchDashboardData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resTel, resHist, resAssets] = await Promise.all([
        fetch(`${API_URL}/dashboard/telemetry`, { headers }),
        fetch(`${API_URL}/dashboard/history`, { headers }),
        fetch(`${API_URL}/dashboard/assets`, { headers })
      ]);

      if (!resTel.ok || !resHist.ok || !resAssets.ok) {
        throw new Error('Failed to fetch user telemetry databases');
      }

      const telData = await resTel.json();
      const histData = await resHist.json();
      const assetsData = await resAssets.json();

      setTelemetry({
        totalExecutions: telData.totalExecutions || 0,
        savedDocsCount: telData.savedDocsCount || 0,
        languagesCount: telData.languagesCount || 0,
        minutesSaved: telData.minutesSaved || 0,
        favorites: telData.favorites || []
      });

      setHistory(histData.history || []);
      setAssets(assetsData.assets || []);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve telemetry datasets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const handleFavoriteToggle = async (toolKey, e) => {
    e.preventDefault();
    e.stopPropagation(); // prevent card click navigation redirection
    try {
      const res = await fetch(`${API_URL}/dashboard/favorite-toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ toolKey })
      });

      if (res.ok) {
        const data = await res.json();
        setTelemetry(prev => {
          const updatedFavs = data.favorited 
            ? [...prev.favorites, toolKey]
            : prev.favorites.filter(k => k !== toolKey);
          return { ...prev, favorites: updatedFavs };
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAsset = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete saved document "${title}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/dashboard/assets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== id));
        setTelemetry(prev => ({ ...prev, savedDocsCount: Math.max(0, prev.savedDocsCount - 1) }));
        setSuccessToast(`Deleted "${title}" successfully.`);
        setTimeout(() => setSuccessToast(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper formatting for relative time offsets
  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    // Fallback if clock offsets skew
    if (seconds < 6) return 'Just now';

    const intervals = [
      { label: 'h', secs: 3600 },
      { label: 'm', secs: 60 },
      { label: 's', secs: 1 }
    ];

    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      const count = Math.floor(seconds / interval.secs);
      if (count >= 1) {
        return `${count}${interval.label} ago`;
      }
    }
    return 'Just now';
  };

  // Filter saved assets by query string
  const filteredAssets = assets.filter(asset => 
    asset.asset_title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    asset.tool_source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  // Check if account has zero stats -> Onboarding empty state
  const isAccountEmpty = telemetry.totalExecutions === 0 && assets.length === 0;

  return (
    <div className="p-6 space-y-7 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-5 right-5 bg-emerald-500 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-emerald-400/20 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Clinical Greeting Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight">OcuCare Administrative Console</h1>
          <p className="text-xs text-slate-400">Welcome, {user?.full_name || 'Clinician'}. Monitor system processing telemetry logs and manage saved documents.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-400 select-none">
          <Calendar className="w-3.5 h-3.5 text-brand-400" />
          <span className="uppercase tracking-wider">Operations Log: {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-900/30 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* 1. Core Telemetry KPI Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Executions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-slate-700 transition">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total AI Executions</span>
            <p className="text-2xl font-bold text-white">{telemetry.totalExecutions}</p>
          </div>
          <div className="w-11 h-11 bg-slate-950 border border-slate-855 rounded-xl flex items-center justify-center text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Saved Documents */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-slate-700 transition">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saved Documents</span>
            <p className="text-2xl font-bold text-white">{telemetry.savedDocsCount}</p>
          </div>
          <div className="w-11 h-11 bg-slate-950 border border-slate-855 rounded-xl flex items-center justify-center text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Languages Translated */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-slate-700 transition">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Languages Handled</span>
            <p className="text-2xl font-bold text-white">{telemetry.languagesCount}</p>
          </div>
          <div className="w-11 h-11 bg-slate-950 border border-slate-855 rounded-xl flex items-center justify-center text-amber-400">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        {/* Compute Saved */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-slate-700 transition">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time Saved (Est.)</span>
            <p className="text-2xl font-bold text-white">{telemetry.minutesSaved} min</p>
          </div>
          <div className="w-11 h-11 bg-slate-950 border border-slate-855 rounded-xl flex items-center justify-center text-rose-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Onboarding conditional empty state */}
      {isAccountEmpty ? (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 max-w-xl mx-auto py-10">
          <Sparkles className="w-10 h-10 text-brand-400 mx-auto animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Your Workspace Command Center is Empty</h3>
          <p className="text-xs text-slate-450 leading-relaxed max-w-sm mx-auto">
            You haven't run any AI process sessions yet. Use our diagnostic tools, translation overlays, or notes harvesters to build up your telemetry stats!
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/tools/summarizer"
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow transition"
            >
              Summarize First Document
            </Link>
          </div>
        </div>
      ) : (

        <>
          {/* 2. Split Panel: Favorites vs Recent Activity Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            {/* Left Panel: Favorite Pinned Tools (customizable list) */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" /> Pinned AI Tools Grid
                </span>
                <span className="text-[9px] text-slate-550 uppercase tracking-wider">Star to Pin</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {OCUCARE_TOOLS.map(tool => {
                  const ToolIcon = tool.icon;
                  const isFav = telemetry.favorites.includes(tool.key);

                  return (
                    <Link
                      key={tool.key}
                      to={tool.path}
                      className={`border rounded-xl p-4 flex flex-col justify-between h-32 relative transition group ${
                        isFav 
                          ? 'bg-slate-950/70 border-slate-800 shadow-sm' 
                          : 'bg-slate-900 border-slate-850 hover:border-slate-850'
                      }`}
                    >
                      {/* Favorite star toggle control */}
                      <button
                        type="button"
                        onClick={(e) => handleFavoriteToggle(tool.key, e)}
                        className="absolute top-4 right-4 text-slate-650 hover:text-amber-500 z-10 transition-colors"
                        title={isFav ? "Unpin tool from favorites" : "Pin tool to favorites"}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'text-amber-500 fill-amber-500' : 'text-slate-600 hover:text-slate-400'}`} />
                      </button>

                      <div className="space-y-1.5 pr-6">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${tool.color}`}>
                          <ToolIcon className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-200 group-hover:text-white group-hover:underline transition-colors mt-1.5">{tool.label}</h3>
                        <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">{tool.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Recent activity chronological ledger timeline */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[390px]">
              <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-brand-400 shrink-0" /> Recent AI Audit Log
                </span>
                <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded border border-slate-850 font-bold uppercase tracking-wider text-slate-500 select-none">Chronological</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-10">No recent logs recorded.</p>
                ) : (
                  history.map((log, idx) => (
                    <div key={log.id || idx} className="flex gap-3 items-start select-text border-b border-slate-850 pb-3 last:border-0 last:pb-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="text-xs text-slate-300 leading-tight font-medium">{log.action_description}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-bold text-slate-550 uppercase tracking-widest bg-slate-950 px-1 py-0.2 rounded border border-slate-850">{log.category_tag}</span>
                          <span className="text-[8px] text-slate-550 font-mono">{formatTimeAgo(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* 3. Saved Documents Repository Searchable Table (Bottom Tier) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Documents Repository</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Search exported resumes, email drafts, study notes, or parsed reports.</p>
              </div>

              {/* Ingestion Search filter */}
              <input
                type="text"
                placeholder="Search by title or origin tool..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-955 border border-slate-850 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-slate-800 w-full md:w-64"
              />
            </div>

            {filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-slate-650 text-xs">
                {searchTerm ? 'No matches found.' : 'No documents saved yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse select-text">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-550 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Origin Tool</th>
                      <th className="py-2.5 px-3">Created Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {filteredAssets.map(asset => (
                      <tr key={asset.id} className="hover:bg-slate-950 transition">
                        <td className="py-3 px-3 text-xs font-semibold text-slate-200">{asset.asset_title}</td>
                        <td className="py-3 px-3 text-xs">
                          <span className="text-[9px] font-bold text-brand-400 uppercase tracking-widest bg-slate-955 border border-slate-850 px-2 py-0.5 rounded">
                            {asset.tool_source}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 font-mono">
                          {new Date(asset.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            onClick={() => setSelectedAsset(asset)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-955 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id, asset.asset_title)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-955 border border-slate-850 hover:border-red-900 text-slate-550 hover:text-red-400 rounded-lg text-[9px] font-bold uppercase tracking-wider transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </>
      )}

      {/* 4. Quick View Open Modal Overlay */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl animate-scale-in max-h-[500px]">
            
            <div className="flex justify-between items-center border-b border-slate-800 p-4 shrink-0">
              <div>
                <span className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Quick Document Review</span>
                <h3 className="text-xs font-bold text-white">{selectedAsset.asset_title}</h3>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-slate-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto min-h-0 flex-1 select-text">
              <pre className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap bg-slate-955 border border-slate-850 p-4.5 rounded-xl">
                {selectedAsset.content_payload}
              </pre>
            </div>

            <div className="border-t border-slate-800 p-4 shrink-0 flex justify-end">
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 bg-slate-955 border border-slate-850 hover:border-slate-750 text-slate-450 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardHome;
