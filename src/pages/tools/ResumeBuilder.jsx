import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, Briefcase, Award, GraduationCap, CheckCircle2, 
  Download, Sparkles, Printer, RefreshCw, AlertCircle, HeartHandshake 
} from 'lucide-react';

const ResumeBuilder = () => {
  const { token, API_URL } = useAuth();

  // Personal Info Form State (Pre-filled with Jane Doe Coordinator Profile)
  const [fullName, setFullName] = useState('Jane Doe');
  const [jobTitle, setJobTitle] = useState('Clinical Research Coordinator');
  const [email, setEmail] = useState('jane.doe@ocucare.com');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  const [address, setAddress] = useState('Boston, MA - OcuCare Eye Institute');
  
  // Experience Details
  const [expTitle, setExpTitle] = useState('Assistant Clinical Coordinator');
  const [expCompany, setExpCompany] = useState('OcuCare Eye Institute');
  const [expDates, setExpDates] = useState('2024 - Present');
  const [expText, setExpText] = useState('Assisted with patient trials. Tracked eye scan records. Recorded visual acuity details.');

  // Education Details
  const [eduDegree, setEduDegree] = useState('Bachelor of Science in Biology');
  const [eduSchool, setEduSchool] = useState('Boston University');
  const [eduDates, setEduDates] = useState('2020 - 2024');

  // Skills
  const [skills, setSkills] = useState('Ophthalmology, OCT Scan, HIPAA compliance, Patient Screening');

  // ATS Target Job Description
  const [targetJob, setTargetJob] = useState(
    'Seeking a Senior Clinical Trial Coordinator with experience in Glaucoma protocols, visual field assessments, RNFL thinning analysis, and HIPAA compliance.'
  );

  // Optimized States
  const [optimizing, setOptimizing] = useState(false);
  const [bullets, setBullets] = useState([
    'Assisted with patient trials, ensuring secure database records for study targets.',
    'Tracked eye scan records and RNFL indicators across ophthalmology segments.',
    'Recorded baseline visual acuity (OD/OS) and intraocular pressures for clinical assessment.'
  ]);
  const [atsScore, setAtsScore] = useState(48); // Pre-optimization default score
  const [missingKeywords, setMissingKeywords] = useState(['Glaucoma', 'RNFL thinning', 'Visual field']);
  const [error, setError] = useState('');

  const handleOptimize = async (e) => {
    e.preventDefault();
    if (!expText.trim() || !targetJob.trim()) return;

    setError('');
    setOptimizing(true);

    try {
      const res = await fetch(`${API_URL}/resume/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          experienceText: expText,
          targetJobDescription: targetJob
        })
      });

      if (!res.ok) {
        throw new Error('ATS optimization pipeline failed.');
      }

      const data = await res.json();
      setAtsScore(data.atsScore);
      setBullets(data.optimizedBullets);
      setMissingKeywords(data.missingATSKeywords);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with OcuCare ATS engine.');
    } finally {
      setOptimizing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      
      {/* Configuration Header (Hidden during Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Resume Builder & ATS Optimizer</h1>
          <p className="text-slate-400 text-sm">Align candidate resumes with target job metrics, optimize STAR bullet keywords, and print clean PDFs.</p>
        </div>
        
        {/* Actions panel */}
        <div className="flex items-center gap-3">
          {/* ATS Score Indicator */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">ATS Score:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
              atsScore >= 80 
                ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                : (atsScore >= 50 ? 'bg-amber-500/10 text-amber-450 border border-amber-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20')
            }`}>
              {atsScore}%
            </span>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            <Printer className="w-4 h-4" /> Export PDF / Print
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs print:hidden">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        
        {/* Left Column: Form Wizards (Hidden during Print) */}
        <div className="lg:col-span-2 space-y-6 print:hidden">
          {/* Wizard Forms Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm h-fit">
            <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand-400" /> Candidacy Details
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Candidate Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Institutional Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="border-t border-slate-850 pt-4 space-y-3.5">
              <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Experience details</span>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="Role title"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={expDates}
                    onChange={(e) => setExpDates(e.target.value)}
                    placeholder="Dates (e.g. 2024-Present)"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <textarea
                  value={expText}
                  onChange={(e) => setExpText(e.target.value)}
                  placeholder="Describe your daily duties (e.g. screened patient charts, managed database inputs)..."
                  className="w-full h-20 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* ATS Optimization configuration */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm h-fit">
            <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-400" /> ATS Keyword Optimizer
            </h3>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Target Job Description</label>
              <textarea
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                placeholder="Paste the target job details here to check match score..."
                className="w-full h-24 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none transition"
              />
            </div>

            {missingKeywords.length > 0 && missingKeywords[0] !== 'None' && (
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Suggested missing keywords</span>
                <div className="flex flex-wrap gap-1.5">
                  {missingKeywords.map((kw, idx) => (
                    <span key={idx} className="bg-amber-500/10 text-amber-450 border border-amber-500/20 text-[9px] font-semibold px-2 py-0.5 rounded">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleOptimize}
              disabled={optimizing || !expText.trim() || !targetJob.trim()}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              {optimizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning ATS density...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Optimize STAR bullets</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Print Preview Canvas (Occupies full width during print) */}
        <div className="lg:col-span-3 flex justify-center print:w-full print:block">
          <div className="w-full max-w-[680px] bg-white text-slate-900 shadow-xl border border-slate-200/50 p-10 aspect-[1/1.414] rounded-2xl flex flex-col justify-between resume-print-canvas print:rounded-none print:border-none print:shadow-none print:p-0 select-text">
            
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-5 text-center space-y-1.5">
              <h2 className="text-2xl font-black tracking-wide uppercase text-slate-900">{fullName}</h2>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{jobTitle}</p>
              <div className="text-[10px] text-slate-500 font-medium space-x-2 pt-1.5">
                <span>{email}</span>
                <span>•</span>
                <span>{phone}</span>
                <span>•</span>
                <span>{address}</span>
              </div>
            </div>

            {/* Experience Section */}
            <div className="space-y-3 pt-6 flex-1">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                Professional Experience
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline font-bold text-xs text-slate-800">
                    <span>{expTitle}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{expDates}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{expCompany}</p>
                </div>

                {/* Bullets List (clean formatting for ATS) */}
                <ul className="list-disc pl-4 text-[10px] text-slate-700 space-y-2 leading-relaxed">
                  {bullets.map((bullet, idx) => {
                    // Render bold STAR metrics properly inside the white canvas
                    const parts = bullet.split(/(\*\*.*?\*\*)/g);
                    return (
                      <li key={idx}>
                        {parts.map((p, pIdx) => {
                          if (p.startsWith('**') && p.endsWith('**')) {
                            return <strong key={pIdx} className="font-bold text-slate-900">{p.slice(2, -2)}</strong>;
                          }
                          return p;
                        })}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Education Section */}
            <div className="space-y-3 pt-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                Education
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline font-bold text-xs text-slate-800">
                  <span>{eduDegree}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{eduDates}</span>
                </div>
                <p className="text-[10px] text-slate-600 font-medium">{eduSchool}</p>
              </div>
            </div>

            {/* Skills Section */}
            <div className="space-y-3 pt-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                Technical Skills & Clearances
              </h3>
              <p className="text-[10px] text-slate-700 leading-relaxed">
                {skills}
              </p>
            </div>

            {/* Print Footer */}
            <div className="border-t border-slate-200 mt-8 pt-4 text-center text-[8px] text-slate-400 font-medium uppercase tracking-widest leading-none">
              OcuCare Secure Credentials Registry • Certified HIPAA Operator Database Record
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ResumeBuilder;
