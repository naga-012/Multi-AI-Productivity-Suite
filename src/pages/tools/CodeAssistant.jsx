import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Terminal, Bug, Info, ArrowLeftRight, Code, Clipboard, 
  CheckCircle2, Play, RefreshCw, Layers, FileCode, Check
} from 'lucide-react';

const CodeAssistant = () => {
  const { token, API_URL } = useAuth();

  // Mode state: generate, debug, explain, convert
  const [mode, setMode] = useState('generate');
  const [srcLang, setSrcLang] = useState('SQL');
  const [tgtLang, setTgtLang] = useState('Python');
  
  // Input fields
  const [sourceCode, setSourceCode] = useState('');
  const [errorLog, setErrorLog] = useState('');
  
  // Output states
  const [activeOutputTab, setActiveOutputTab] = useState('code'); // code, doc
  const [outputCode, setOutputCode] = useState('');
  const [explanationText, setExplanationText] = useState('');
  
  const [processing, setProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [error, setError] = useState('');

  const modeTabs = [
    { name: 'generate', label: 'Generate', desc: 'Synthesizes functional code scripts.', icon: Code },
    { name: 'debug', label: 'Debug', desc: 'Isolates and repairs syntax exceptions.', icon: Bug },
    { name: 'explain', label: 'Explain', desc: 'Explains complex blocks simply.', icon: Info },
    { name: 'convert', label: 'Convert', desc: 'Translates code across languages.', icon: ArrowLeftRight }
  ];

  const languagesList = ['JavaScript', 'Python', 'SQL', 'TypeScript', 'C++', 'HTML/CSS'];

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!sourceCode.trim()) return;

    setError('');
    setOutputCode('');
    setExplanationText('');
    setProcessing(true);

    try {
      const res = await fetch(`${API_URL}/code/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mode,
          sourceCode,
          errorLog: mode === 'debug' ? errorLog : '',
          languages: {
            source: srcLang,
            target: tgtLang
          }
        })
      });

      if (!res.ok) {
        throw new Error('Code processing simulator failed.');
      }

      const data = await res.json();
      setOutputCode(data.outputCode);
      setExplanationText(data.explanationText);
      setActiveOutputTab('code'); // default to code view tab
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with compiler simulator.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!outputCode) return;
    navigator.clipboard.writeText(outputCode);
    showToast('Code copied to clipboard.');
  };

  const handleCommitToBuffer = () => {
    if (!outputCode) return;
    // Simulate committing the code to a developer buffer log
    sessionStorage.setItem('ocucare_dev_buffer', outputCode);
    showToast('Code committed to local developer buffer.');
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Helper lines count logic for context window
  const linesCount = sourceCode.split('\n').length;

  // Preload test case triggers
  const handlePreloadTestCase = () => {
    if (mode === 'convert') {
      setSrcLang('SQL');
      setTgtLang('Python');
      setSourceCode(`CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'resident'
);`);
    } else if (mode === 'debug') {
      setSrcLang('JavaScript');
      setSourceCode(`const express = require('express');
const app = express();
app.post('/api/diagnose', (req, res) => {
  res.json({ status: 'active' });
});`);
      setErrorLog(`Access to fetch at 'http://localhost:5000/api/diagnose' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`);
    } else if (mode === 'explain') {
      setSrcLang('JavaScript');
      setSourceCode(`const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  next();
};`);
    } else {
      setSrcLang('SQL');
      setSourceCode(`-- Write an in-memory SQLite schema mapping patient metrics`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-5 right-5 bg-emerald-500 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-emerald-400/20 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Code Assistant & Dev Studio</h1>
        <p className="text-slate-400 text-sm">Generate clinical databases schemas, convert raw SQL tables, troubleshoot Express server CORS bugs, and document React hooks.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Workspace Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        
        {/* Left Column: Config Panel & Monospace Editor */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-5 shadow-sm">
          
          {/* Mode Pill Row Selector */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Functional Mode</span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 justify-between select-none">
              {modeTabs.map(tab => {
                const isSelected = mode === tab.name;
                return (
                  <button
                    key={tab.name}
                    type="button"
                    onClick={() => {
                      setMode(tab.name);
                      setOutputCode('');
                      setExplanationText('');
                    }}
                    className={`flex-1 py-2 text-center rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                      isSelected 
                        ? 'bg-slate-900 border border-slate-800 text-white' 
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                    title={tab.desc}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Languages Dropdowns matrix */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source Language</label>
              <select
                value={srcLang}
                onChange={(e) => setSrcLang(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
              >
                {languagesList.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Language</label>
              <select
                value={tgtLang}
                onChange={(e) => setTgtLang(e.target.value)}
                disabled={mode !== 'convert'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-30 cursor-pointer"
              >
                {languagesList.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monospace Code prompt editor */}
          <div className="flex-1 flex flex-col space-y-2 min-h-[160px]">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Context & Code Input</label>
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">{linesCount} Lines</span>
            </div>
            
            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              placeholder={
                mode === 'generate' ? '-- Write SQL DB initialization schema for OcuCare clinical metrics...' :
                mode === 'debug' ? 'Paste the buggy JS script block here...' :
                mode === 'explain' ? 'Paste obscure code logs you need step-by-step documentation for...' :
                'Paste SQL table creation script to translate into Python SQLAlchemy models...'
              }
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-800 resize-none transition"
            />
          </div>

          {/* Secondary error trace box (Visible during Debug mode only) */}
          {mode === 'debug' && (
            <div className="space-y-2 shrink-0">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Error Trace Logs</label>
              <textarea
                value={errorLog}
                onChange={(e) => setErrorLog(e.target.value)}
                placeholder="Paste compiler crash notes or CORS blockage logs here..."
                className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 font-mono text-[10px] text-red-300 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-slate-800 resize-none"
              />
            </div>
          )}

          {/* Actions panel */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePreloadTestCase}
              type="button"
              className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition uppercase tracking-wider"
            >
              Preload Demo
            </button>
            <button
              onClick={handleProcess}
              disabled={processing || !sourceCode.trim()}
              className="flex-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compiling...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 animate-pulse" />
                  <span>Run Compiler</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: Code output terminal */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-850 rounded-2xl p-5 flex flex-col h-[520px] shadow-2xl relative">
          
          {/* Header tabs switcher */}
          <div className="border-b border-slate-850 pb-3 mb-4 flex justify-between items-center shrink-0">
            <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveOutputTab('code')}
                disabled={!outputCode}
                className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                  activeOutputTab === 'code' 
                    ? 'bg-slate-950 text-white border border-slate-800' 
                    : 'text-slate-500 hover:text-slate-350 disabled:opacity-30'
                }`}
              >
                💻 Code View
              </button>
              <button
                onClick={() => setActiveOutputTab('doc')}
                disabled={!explanationText}
                className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                  activeOutputTab === 'doc' 
                    ? 'bg-slate-950 text-white border border-slate-800' 
                    : 'text-slate-500 hover:text-slate-350 disabled:opacity-30'
                }`}
              >
                📝 Explanation
              </button>
            </div>

            {/* Float control toolbar */}
            {outputCode && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-white rounded text-[9px] font-bold uppercase tracking-wider transition"
                >
                  <Clipboard className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={handleCommitToBuffer}
                  className="flex items-center gap-1 px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded text-[9px] font-bold uppercase tracking-wider transition"
                >
                  <Layers className="w-3 h-3" /> Commit Buffer
                </button>
              </div>
            )}
          </div>

          {/* Output viewport screen */}
          <div className="flex-1 overflow-auto min-h-0 flex">
            {outputCode ? (
              activeOutputTab === 'code' ? (
                <pre className="flex-1 font-mono text-xs text-brand-300 leading-relaxed overflow-x-auto whitespace-pre bg-slate-950 select-text p-2">
                  {outputCode}
                </pre>
              ) : (
                <div className="flex-1 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text p-2 space-y-3.5">
                  {explanationText}
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center px-6">
                <FileCode className="w-12 h-12 stroke-[1] mb-2 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-400">Terminal Idle</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                  Configure compilation variables on the left pane and hit Run Compiler to display code outputs.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default CodeAssistant;
