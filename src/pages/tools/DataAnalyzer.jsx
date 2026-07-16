import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Upload, BarChart3, TrendingUp, Sparkles, RefreshCw, Printer, 
  Trash2, Award, ShieldAlert, CheckCircle2, ChevronRight, FileSpreadsheet
} from 'lucide-react';

const DataAnalyzer = () => {
  const { token, API_URL } = useAuth();

  // Ingestion states
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  // Dashboard parsed data matrix
  const [result, setResult] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setError('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx') {
      setError('Invalid format. Only Excel spreadsheets (.xlsx) or CSV files (.csv) are permitted.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) { // 20MB
      setError('Spreadsheet file exceeds OcuCare HIPAA 20MB upload margins.');
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  const handleProcess = async (fileToProcess) => {
    const file = fileToProcess || selectedFile;
    if (!file) return;

    setError('');
    setUploading(true);
    setUploadProgress(15);

    // Simulate upload percentage tracker
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 90) return prev + 25;
        clearInterval(progressInterval);
        return prev;
      });
    }, 150);

    try {
      let processPayload;

      if (file === 'vrinda_store_clean.csv') {
        // Sample store data route
        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploading(false);
        setAnalyzing(true);

        const res = await fetch(`${API_URL}/analyzer/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileId: 'vrinda_store_clean.csv',
            originalName: 'vrinda_store_clean.csv'
          })
        });

        if (!res.ok) throw new Error('Candidacy data compiler simulation crashed.');
        processPayload = await res.json();
      } else {
        // Live file form data upload
        const formData = new FormData();
        formData.append('file', file);

        const resUpload = await fetch(`${API_URL}/analyzer/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        clearInterval(progressInterval);

        if (!resUpload.ok) {
          const errData = await resUpload.json();
          throw new Error(errData.error || 'Failed to ingest sheet.');
        }

        const uploadData = await resUpload.json();
        setUploadProgress(100);
        setUploading(false);
        setAnalyzing(true);

        // Process sheet data
        const resProcess = await fetch(`${API_URL}/analyzer/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileId: uploadData.fileId,
            originalName: uploadData.originalName
          })
        });

        if (!resProcess.ok) throw new Error('Parser failed to read structured matrices.');
        processPayload = await resProcess.json();
      }

      setResult(processPayload);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error processing sheet statistics.');
      setUploading(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setResult(null);
    setError('');
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper values for custom SVG charts normalization
  const getMaxChartValue = (dataList) => {
    if (!dataList || dataList.length === 0) return 100;
    return Math.max(...dataList.map(item => item.value)) * 1.15;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      
      {/* Configuration Header (Hidden during Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Data Analyzer & Insights</h1>
          <p className="text-slate-400 text-sm">Upload transactional spreadsheets, review order distributions, and display cognitive insights.</p>
        </div>

        {result && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            <Printer className="w-4 h-4" /> Export Report / Print
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs print:hidden">
          {error}
        </div>
      )}

      {/* State A: File uploader dashboard (Hidden during Print) */}
      {!result && !uploading && !analyzing && (
        <div className="max-w-xl mx-auto space-y-6 print:hidden">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
            <label
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition select-none ${
                dragActive 
                  ? 'border-brand-500 bg-brand-500/5' 
                  : 'border-slate-800 bg-slate-950 hover:border-slate-750'
              }`}
            >
              <input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              
              <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 mb-4">
                <FileSpreadsheet className="w-6 h-6 animate-pulse" />
              </div>
              
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-200">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="space-y-1 text-slate-400">
                  <p className="text-sm font-bold text-slate-200">Drag & drop spreadsheet asset</p>
                  <p className="text-xs text-slate-500">Supports CSV and Excel sheets (.csv, .xlsx)</p>
                </div>
              )}
            </label>

            <button
              onClick={() => handleProcess()}
              disabled={!selectedFile}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" /> Run Analytics Compiler
            </button>
          </div>

          {/* Pre-baked quick check data button */}
          <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-450">
              <Upload className="w-4 h-4 text-brand-400" />
              <span>Preview the workspace instantly using preloaded store CSV logs.</span>
            </div>
            <button
              onClick={() => handleProcess('vrinda_store_clean.csv')}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-brand-400 hover:text-brand-300 font-semibold rounded-lg transition"
            >
              Use Sample Store Data
            </button>
          </div>
        </div>
      )}

      {/* Loading States */}
      {(uploading || analyzing) && (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-md print:hidden">
          <div className="relative w-12 h-12 mx-auto">
            <RefreshCw className="w-12 h-12 text-brand-500 animate-spin stroke-[1.5]" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {uploading ? 'Ingesting Structured Spreadsheets...' : 'AI Compiling Row Matrices...'}
            </h3>
            <p className="text-xs text-slate-500">
              {uploading ? `Ingestion status: ${uploadProgress}%` : 'Evaluating chronological channels, categorizing data, and mapping heat trends...'}
            </p>
          </div>
        </div>
      )}

      {/* State B: Analytics Dashboard Grid */}
      {result && (
        <div className="space-y-6">
          
          {/* Summary KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Volume</span>
              <p className="text-xl font-extrabold text-white">
                {result.metrics.totalVolume.toLocaleString()} {result.fileName.includes('patient') ? 'Patients' : 'Records'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Average basket / IOP</span>
              <p className="text-xl font-extrabold text-white">
                {result.fileName.includes('patient') ? `${result.metrics.meanAmount} mmHg` : `$${result.metrics.meanAmount}`}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Peak Metric / IOP</span>
              <p className="text-xl font-extrabold text-white">
                {result.fileName.includes('patient') ? `${result.metrics.maxAmount} mmHg` : `$${result.metrics.maxAmount}`}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-xl space-y-1 shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active categories</span>
              <p className="text-xl font-extrabold text-white">
                {result.metrics.categoriesCount} Channels
              </p>
            </div>
          </div>

          {/* Charting & AI Insights layout splits */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Visual SVG charts container (Left Panel) */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Custom SVG Bar Chart */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-brand-400" /> Categorical Distributions
                  </span>

                  <div className="flex-1 flex justify-center items-center">
                    <svg width="100%" height="220" viewBox="0 0 320 220" className="overflow-visible select-none">
                      {/* Bar columns */}
                      {result.chartData.barData.map((bar, idx) => {
                        const maxVal = getMaxChartValue(result.chartData.barData);
                        const normalizedHeight = (bar.value / maxVal) * 130;
                        const barWidth = 32;
                        const spacing = 45;
                        const x = 30 + idx * (barWidth + spacing);
                        const y = 170 - normalizedHeight;

                        return (
                          <g key={idx}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={normalizedHeight}
                              rx="6"
                              className="fill-brand-500 hover:fill-brand-450 transition-all duration-300"
                            />
                            {/* Values label at top */}
                            <text
                              x={x + barWidth / 2}
                              y={y - 8}
                              textAnchor="middle"
                              className="text-[9px] fill-slate-350 font-bold"
                            >
                              {result.fileName.includes('patient') ? bar.value : `$${bar.value}`}
                            </text>
                            {/* Category title at bottom */}
                            <text
                              x={x + barWidth / 2}
                              y="192"
                              textAnchor="middle"
                              className="text-[9px] fill-slate-500 font-bold"
                            >
                              {bar.name}
                            </text>
                          </g>
                        );
                      })}
                      {/* Axis Line */}
                      <line x1="15" y1="172" x2="310" y2="172" className="stroke-slate-800 stroke-1" />
                    </svg>
                  </div>
                </div>

                {/* Custom SVG Trend Line Chart */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Chronological Trends
                  </span>

                  <div className="flex-1 flex justify-center items-center">
                    <svg width="100%" height="220" viewBox="0 0 320 220" className="overflow-visible select-none">
                      {/* Coordinates generator for path */}
                      {(() => {
                        const maxVal = getMaxChartValue(result.chartData.lineData);
                        const points = result.chartData.lineData.map((d, idx) => {
                          const x = 30 + idx * 50;
                          const y = 170 - (d.value / maxVal) * 130;
                          return { x, y, label: d.label, val: d.value };
                        });

                        const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                        return (
                          <g>
                            {/* Trend Line Path */}
                            <path
                              d={pathD}
                              className="fill-none stroke-brand-500 stroke-2"
                            />
                            {/* Gradient Fill Under Line */}
                            <path
                              d={`${pathD} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`}
                              className="fill-brand-500/5 stroke-none"
                            />
                            {/* Data points */}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4"
                                  className="fill-brand-500 stroke-slate-950 stroke-1 hover:r-6 cursor-pointer transition-all"
                                />
                                {/* Value popup at dots */}
                                <text
                                  x={p.x}
                                  y={p.y - 8}
                                  textAnchor="middle"
                                  className="text-[8px] fill-slate-300 font-bold bg-slate-900"
                                >
                                  {result.fileName.includes('patient') ? p.val : `$${p.val}`}
                                </text>
                                {/* X Axis Month label */}
                                <text
                                  x={p.x}
                                  y="192"
                                  textAnchor="middle"
                                  className="text-[9px] fill-slate-500 font-bold"
                                >
                                  {p.label}
                                </text>
                              </g>
                            ))}
                          </g>
                        );
                      })()}
                      {/* Axis Line */}
                      <line x1="15" y1="172" x2="310" y2="172" className="stroke-slate-800 stroke-1" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>

            {/* AI Cognitive Insights Panel (Right Panel) */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-1.5 shrink-0">
                <Sparkles className="w-4 h-4 text-brand-400" /> ✨ AI Automated Trends & Analysis
              </span>

              <div className="flex-1 overflow-y-auto space-y-3 pt-3.5 pr-1 select-text">
                {result.aiInsights.map((insight, idx) => {
                  const parts = insight.split(/(\*\*.*?\*\*)/g);
                  return (
                    <div 
                      key={idx} 
                      className="p-3 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl flex items-start gap-2.5 transition"
                    >
                      <ChevronRight className="w-4 h-4 text-brand-450 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-slate-350 leading-relaxed">
                        {parts.map((p, pIdx) => {
                          if (p.startsWith('**') && p.endsWith('**')) {
                            return <strong key={pIdx} className="font-extrabold text-white">{p.slice(2, -2)}</strong>;
                          }
                          return p;
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Sticky footer control tray (Hidden during Print) */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-md print:hidden shrink-0">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{result.fileName}</span>
            </div>
            
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear database state
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default DataAnalyzer;
