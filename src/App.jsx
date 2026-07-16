import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Authentication Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';

// Application Pages
import DashboardHome from './pages/DashboardHome';
import PatientExplorer from './pages/PatientExplorer';
import DiagnosticPortal from './pages/DiagnosticPortal';
import PatientDetail from './pages/PatientDetail';
import Profile from './pages/Profile';
import Summarizer from './pages/tools/Summarizer';
import EmailWriter from './pages/tools/EmailWriter';
import ResumeBuilder from './pages/tools/ResumeBuilder';
import Translator from './pages/tools/Translator';
import CodeAssistant from './pages/tools/CodeAssistant';
import DataAnalyzer from './pages/tools/DataAnalyzer';
import NotesGenerator from './pages/tools/NotesGenerator';
import StudyAssistant from './pages/tools/StudyAssistant';

// AI Chat Assistant
import ChatAssistant from './components/chat/ChatAssistant';

// Voice Assistant Ticker Console
import VoiceConsole from './components/voice/VoiceConsole';

// Icons
import { 
  Activity, Users, Sparkles, User, LogOut, LayoutDashboard, Bot, FileText, PenTool, Briefcase, Globe, Terminal, BarChart3, BookOpen, GraduationCap 
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, token, API_URL } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // AI Chat Assistant Sidebar states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activePatientContext, setActivePatientContext] = useState(null);

  // Extract patient ID from URL pathname if viewing a profile
  const patientMatch = location.pathname.match(/\/patients\/(\d+)/);
  const currentPatientId = patientMatch ? patientMatch[1] : null;

  useEffect(() => {
    if (currentPatientId && token) {
      fetch(`${API_URL}/patients/${currentPatientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data) {
          setActivePatientContext(data);
        } else {
          setActivePatientContext(null);
        }
      })
      .catch(() => setActivePatientContext(null));
    } else {
      setActivePatientContext(null);
    }
  }, [currentPatientId, token, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/patients', label: 'Patient Directory', icon: Users },
    { path: '/diagnose', label: 'AI Scan Portal', icon: Sparkles },
    { path: '/tools/summarizer', label: 'Doc Summarizer', icon: FileText },
    { path: '/tools/writer', label: 'AI Email Writer', icon: PenTool },
    { path: '/tools/resumebuilder', label: 'AI Resume Builder', icon: Briefcase },
    { path: '/tools/translator', label: 'AI Translator', icon: Globe },
    { path: '/tools/codeassistant', label: 'AI Code Assistant', icon: Terminal },
    { path: '/tools/dataanalyzer', label: 'AI Data Analyzer', icon: BarChart3 },
    { path: '/tools/notesgenerator', label: 'AI Notes Generator', icon: BookOpen },
    { path: '/tools/studyassistant', label: 'AI Study Assistant', icon: GraduationCap },
    { path: '/profile', label: 'Clinician Profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col fixed h-full z-20 print:hidden">
        {/* Brand header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center border border-brand-500/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <span className="font-bold text-lg text-white tracking-wide">OcuCare</span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition ${
                  isActive 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Clinician user footer context */}
        {user && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img
                src={user.profile_image || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300"}
                alt="Clinician Mini Profile"
                className="w-9 h-9 rounded-lg object-cover border border-slate-800"
              />
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate leading-tight">{user.full_name}</p>
                <p className="text-[10px] text-slate-550 truncate mt-0.5">{user.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white rounded-xl text-[11px] font-bold tracking-wider transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out Portal
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 pl-64 min-h-screen flex flex-col bg-slate-950 print:pl-0 print:bg-white">
        {/* Workspace Top Sticky Navigation Header */}
        <header className="h-16 border-b border-slate-855 px-6 flex items-center justify-between bg-slate-900/40 backdrop-blur-md sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace Mode:</span>
            <span className="text-[11px] font-semibold text-slate-350 uppercase tracking-wider">
              {location.pathname === '/' ? 'Operations Dashboard' : 
               location.pathname.startsWith('/patients') ? 'Patient Dossier Records' : 
               location.pathname.startsWith('/diagnose') ? 'Retinal Scan Analyzer' : 
               location.pathname.startsWith('/tools/summarizer') ? 'AI Document Summarizer' :
               location.pathname.startsWith('/tools/writer') ? 'AI Email & Document Writer' :
               location.pathname.startsWith('/tools/resumebuilder') ? 'AI Resume Builder & ATS Optimizer' :
               location.pathname.startsWith('/tools/translator') ? 'AI Clinical Translator' :
               location.pathname.startsWith('/tools/codeassistant') ? 'AI Code Assistant & Dev Studio' :
               location.pathname.startsWith('/tools/dataanalyzer') ? 'AI Data Analyzer & Cognitive Insights' :
               location.pathname.startsWith('/tools/notesgenerator') ? 'AI Notes Generator & Study Studio' :
               location.pathname.startsWith('/tools/studyassistant') ? 'AI Study Assistant & Retention Suite' :
               location.pathname.startsWith('/profile') ? 'Clinician Configuration' : 'OcuCare Workspace'}
            </span>
          </div>

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border ${
              isChatOpen 
                ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/15' 
                : 'bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Assistant</span>
            {activePatientContext && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </button>
        </header>

        <div className="flex-1">
          {children}
        </div>
        
        <footer className="border-t border-slate-850 py-5 text-center text-[10px] text-slate-500">
          OcuCare Clinician Panel v1.0.0 • HIPAA Compliant Patient Workspace Database • AI Diagnostics Subagent Loop
        </footer>
      </main>

      {/* Floating Slider AI Chat Assistant Drawer */}
      <ChatAssistant 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        activePatientContext={activePatientContext} 
      />

      {/* Floating global audio triggers */}
      <VoiceConsole />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Guarded Application Views */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><DashboardHome /></Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/patients" element={
            <ProtectedRoute>
              <Layout><PatientExplorer /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/patients/:id" element={
            <ProtectedRoute>
              <Layout><PatientDetail /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/diagnose" element={
            <ProtectedRoute>
              <Layout><DiagnosticPortal /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tools/summarizer" element={
            <ProtectedRoute>
              <Layout><Summarizer /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tools/writer" element={
            <ProtectedRoute>
              <Layout><EmailWriter /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tools/resumebuilder" element={
            <ProtectedRoute>
              <Layout><ResumeBuilder /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tools/translator" element={
            <ProtectedRoute>
              <Layout><Translator /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tools/codeassistant" element={
            <ProtectedRoute>
              <Layout><CodeAssistant /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tools/dataanalyzer" element={
            <ProtectedRoute>
              <Layout><DataAnalyzer /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tools/notesgenerator" element={
            <ProtectedRoute>
              <Layout><NotesGenerator /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/tools/studyassistant" element={
            <ProtectedRoute>
              <Layout><StudyAssistant /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout><Profile /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
