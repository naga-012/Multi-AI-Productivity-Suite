import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import db, { initDb, hashPassword } from './db.js';

const app = express();
const port = 5000;

// Initialize Database
initDb();

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer for mock file uploads
const upload = multer({ dest: 'uploads/' });

// Setup Multer specifically for clinical documents
const docUpload = multer({
  dest: 'backend/uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ext === 'txt' || ext === 'pdf' || ext === 'docx') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only .pdf, .docx, and .txt files are supported.'));
    }
  }
});

// Setup Multer specifically for sheet spreadsheets
const sheetUpload = multer({
  dest: 'backend/uploads/',
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ext === 'csv' || ext === 'xlsx') {
      cb(null, true);
    } else {
      cb(new Error('Invalid sheet format. Only .csv and .xlsx files are supported.'));
    }
  }
});

// Token authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  if (token.startsWith('mock-jwt-token-')) {
    const userId = token.replace('mock-jwt-token-', '');
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error verification' });
      }
      if (!user) {
        return res.status(403).json({ error: 'Invalid session user' });
      }
      // Remove password hash from memory
      delete user.password_hash;
      req.user = user;
      next();
    });
  } else {
    return res.status(403).json({ error: 'Invalid token signature' });
  }
};

// Helper to log user activity and increment metrics
function logUserActivity(userId, actionDescription, categoryTag) {
  db.run(
    'INSERT INTO activity_logs (user_id, action_description, category_tag) VALUES (?, ?, ?)',
    [userId, actionDescription, categoryTag],
    (err) => {
      if (err) console.error('Error logging user activity:', err.message);
    }
  );

  db.run(`
    INSERT INTO user_analytics (user_id, tool_key, total_invocations)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id, tool_key) DO UPDATE SET 
      total_invocations = total_invocations + 1,
      last_used_timestamp = CURRENT_TIMESTAMP
  `, [userId, categoryTag], (err) => {
    if (err) console.error('Error updating user analytics:', err.message);
  });
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// GET CURRENT USER PROFILE
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// UPDATE USER PROFILE
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { full_name, email, clinic_name, license_id } = req.body;
  if (!full_name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  const finalClinicName = clinic_name || '';
  const finalLicenseId = license_id || '';
  
  db.run(
    `UPDATE users 
     SET full_name = ?, email = ?, clinic_name = ?, license_id = ?
     WHERE id = ?`,
    [full_name, email, finalClinicName, finalLicenseId, req.user.id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Email address is already in use' });
        }
        return res.status(500).json({ error: 'Could not update user profile' });
      }
      db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (user) delete user.password_hash;
        res.json({ message: 'Profile updated successfully', user });
      });
    }
  );
});

// SIGNUP
app.post('/api/auth/signup', (req, res) => {
  const { full_name, email, password, clinic_name, license_id } = req.body;
  
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  
  const finalClinicName = clinic_name || '';
  const finalLicenseId = license_id || '';
  
  // Basic validation rules
  if (!email.includes('@') || email.length < 5) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const pHash = hashPassword(password);
  const defaultAvatar = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300";

  db.run(
    `INSERT INTO users (full_name, email, password_hash, role, clinic_name, license_id, profile_image)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [full_name, email, pHash, "General Practitioner", finalClinicName, finalLicenseId, defaultAvatar],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Email is already registered' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      const newUserId = this.lastID;
      const token = `mock-jwt-token-${newUserId}`;
      db.get('SELECT * FROM users WHERE id = ?', [newUserId], (err, user) => {
        if (user) delete user.password_hash;
        res.status(201).json({ token, user });
      });
    }
  );
});

// LOGIN
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const pHash = hashPassword(password);
  db.get(
    'SELECT * FROM users WHERE email = ? AND password_hash = ?',
    [email, pHash],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database retrieval error' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password combination' });
      }

      // Update last login
      const now = new Date().toISOString();
      db.run('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);

      const token = `mock-jwt-token-${user.id}`;
      delete user.password_hash;
      res.json({ token, user });
    }
  );
});

// FORGOT PASSWORD (OTP GENERATION)
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database check failed' });
    if (!user) return res.status(404).json({ error: 'No account registered with this email' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

    db.run(
      'UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?',
      [otp, expires, user.id],
      (err) => {
        if (err) return res.status(500).json({ error: 'Error generating reset token' });

        // PRINT OTP TO CONSOLE FOR CLINICAL VALIDATION TESTING
        console.log(`\n======================================`);
        console.log(`[OCUCARE SECURITY GATEWAY] OTP CODE`);
        console.log(`Recipient: ${email}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`Expires: ${expires}`);
        console.log(`======================================\n`);

        res.json({ message: 'A 6-digit verification code has been generated and logged.' });
      }
    );
  });
});

// VERIFY OTP
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  db.get(
    'SELECT * FROM users WHERE email = ? AND otp_code = ?',
    [email, otp],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Database validation failed' });
      if (!user) return res.status(400).json({ error: 'Invalid verification code' });

      const expiry = new Date(user.otp_expires);
      if (expiry < new Date()) {
        return res.status(400).json({ error: 'Verification code has expired' });
      }

      // Generate temporary authorization code/token for password override
      const tempToken = `reset-auth-token-${user.id}`;
      res.json({ message: 'Code verified successfully', tempToken });
    }
  );
});

// RESET PASSWORD
app.post('/api/auth/reset-password', (req, res) => {
  const { email, tempToken, newPassword } = req.body;
  if (!email || !tempToken || !newPassword) {
    return res.status(400).json({ error: 'Missing reset parameters' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  // Extract user ID from tempToken
  if (!tempToken.startsWith('reset-auth-token-')) {
    return res.status(400).json({ error: 'Invalid reset authorization token' });
  }
  const userId = tempToken.replace('reset-auth-token-', '');

  const pHash = hashPassword(newPassword);

  db.run(
    `UPDATE users 
     SET password_hash = ?, otp_code = NULL, otp_expires = NULL 
     WHERE id = ? AND email = ?`,
    [pHash, userId, email],
    function(err) {
      if (err) return res.status(500).json({ error: 'Could not reset password' });
      if (this.changes === 0) return res.status(400).json({ error: 'Invalid reset payload' });

      res.json({ message: 'Password has been successfully updated' });
    }
  );
});

// ==========================================
// 2. PATIENT RECORDS ENDPOINTS
// ==========================================

// GET ALL PATIENTS
app.get('/api/patients', authenticateToken, (req, res) => {
  db.all('SELECT * FROM patients', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Parse medical history JSON string
    const patients = rows.map(r => ({
      ...r,
      medical_history: JSON.parse(r.medical_history || '[]')
    }));
    res.json(patients);
  });
});

// GET PATIENT BY ID
app.get('/api/patients/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM patients WHERE id = ?', [id], (err, patient) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    patient.medical_history = JSON.parse(patient.medical_history || '[]');
    res.json(patient);
  });
});

// ==========================================
// 3. MULTI-MODAL DIAGNOSTIC ENDPOINT
// ==========================================

// POST AI DIAGNOSIS
app.post('/api/patients/:id/diagnose', authenticateToken, upload.single('scan'), (req, res) => {
  const { id } = req.params;
  const fileName = req.file ? req.file.originalname : 'retinal_scan_uploaded.jpg';

  db.get('SELECT * FROM patients WHERE id = ?', [id], (err, patient) => {
    if (err) return res.status(500).json({ error: 'Database search error' });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Simulate 3-second diagnostic model computation delay
    setTimeout(() => {
      // Determine diagnostic pathology based on mock patients or randomize it if none.
      let riskScore = 75;
      let pathology = "Signs of early Non-Proliferative Diabetic Retinopathy (NPDR)";
      let actionItems = "1. Schedule standard diabetic macular edema review.\n2. Advise strict monitoring of daily glucose logs.\n3. Re-evaluate in 3 months.";
      let newRiskTier = "High";

      if (patient.name.toLowerCase().includes('smith')) {
        riskScore = 82;
        pathology = "Optic Nerve Cupping & Elevated IOP (Signs of Glaucoma Progression)";
        actionItems = "1. Perform automated visual field threshold testing.\n2. Increase dosage or add secondary drop therapy (e.g. Timolol).\n3. Re-check pressure in 2 weeks.";
        newRiskTier = "High";
      } else if (patient.name.toLowerCase().includes('davis')) {
        riskScore = 55;
        pathology = "Macular Drusen Cluster (Early Stage Age-related Macular Degeneration)";
        actionItems = "1. Confirm intake of AREDS2 formulation vitamins.\n2. Perform Amsler Grid calibration review.\n3. Baseline fundus autofluorescence in 6 months.";
        newRiskTier = "Medium";
      } else if (patient.name.toLowerCase().includes('johnson')) {
        riskScore = 15;
        pathology = "Clean Retinal Field, Stable Pseudophakia (Normal Post-Op)";
        actionItems = "1. Discontinue post-op anti-inflammatory drops.\n2. General annual routine checkup.";
        newRiskTier = "Stable";
      }

      // Update patient risk tier and scan path in database
      const scanPath = `/scans/${id}_${fileName}`;
      db.run(
        `UPDATE patients 
         SET risk_tier = ?, retinal_scan_path = ?, last_visit = ? 
         WHERE id = ?`,
        [newRiskTier, scanPath, new Date().toISOString().split('T')[0], id],
        (err) => {
          if (err) return res.status(500).json({ error: 'Failed to update patient diagnosis record' });

          // Create a clinical task associated with this diagnosis
          const taskTitle = `Follow-up: AI Pathology detected for ${patient.name}`;
          const taskDesc = `AI reported a ${riskScore}% risk of: ${pathology}. Immediate care action points:\n${actionItems}`;
          const priority = riskScore > 70 ? 'high' : (riskScore > 40 ? 'medium' : 'low');
          const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 5 days from now

          db.run(
            `INSERT INTO tasks (patient_id, title, description, status, priority, due_date)
             VALUES (?, ?, ?, 'pending', ?, ?)`,
            [id, taskTitle, taskDesc, priority, dueDate],
            function(err) {
              if (err) console.error('Could not auto-generate follow-up task:', err.message);

              // Add a clinical notes entry
              const clinicianName = req.user.full_name || 'AI Diagnostics Subagent';
              const noteText = `[AI Diagnostic Scan Completed]
Pathology Identified: ${pathology}
Computed Risk Score: ${riskScore}%
Suggested Care Actions:
${actionItems}`;

              db.run(
                `INSERT INTO notes (patient_id, clinician_name, text)
                 VALUES (?, ?, ?)`,
                [id, clinicianName, noteText],
                (noteErr) => {
                  if (noteErr) console.error('Could not auto-generate patient history note:', noteErr.message);

                  res.json({
                    success: true,
                    diagnosed_at: new Date().toISOString(),
                    risk_score: riskScore,
                    pathology: pathology,
                    action_items: actionItems,
                    new_risk_tier: newRiskTier,
                    scan_path: scanPath,
                    task_created_id: this ? this.lastID : null
                  });
                }
              );
            }
          );
        }
      );
    }, 3000);
  });
});

// ==========================================
// 4. TASK QUEUE ENDPOINTS
// ==========================================

// GET ALL TASKS
app.get('/api/tasks', authenticateToken, (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY status ASC, created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CREATE CUSTOM TASK
app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, description, priority, due_date, patient_id } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  db.run(
    `INSERT INTO tasks (patient_id, title, description, status, priority, due_date)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
    [patient_id || null, title, description || '', priority || 'medium', due_date || ''],
    function(err) {
      if (err) return res.status(500).json({ error: 'Could not create task' });
      db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, task) => {
        res.status(201).json(task);
      });
    }
  );
});

// UPDATE TASK STATUS
app.patch('/api/tasks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  db.run(
    `UPDATE tasks SET status = ? WHERE id = ?`,
    [status, id],
    function(err) {
      if (err) return res.status(500).json({ error: 'Could not update task' });
      db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, task) => {
        res.json(task);
      });
    }
  );
});

// ==========================================
// 5. PATIENT CLINICAL NOTES ENDPOINTS
// ==========================================

// GET CLINICAL NOTES FOR PATIENT
app.get('/api/patients/:id/notes', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.all(
    'SELECT * FROM notes WHERE patient_id = ? ORDER BY created_at DESC',
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ADD CLINICAL NOTE
app.post('/api/patients/:id/notes', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Note content is required' });
  }

  const clinicianName = req.user.full_name;

  db.run(
    `INSERT INTO notes (patient_id, clinician_name, text)
     VALUES (?, ?, ?)`,
    [id, clinicianName, text],
    function(err) {
      if (err) return res.status(500).json({ error: 'Could not insert note' });
      db.get('SELECT * FROM notes WHERE id = ?', [this.lastID], (err, note) => {
        res.status(201).json(note);
      });
    }
  );
});

// ==========================================
// 6. AI CHAT ASSISTANT ENDPOINTS
// ==========================================

// GET CHAT HISTORY FOR USER SESSION
app.get('/api/ai/chat/history', authenticateToken, (req, res) => {
  const sessionId = req.query.session_id || 'default_session';
  const userId = req.user.id;

  db.all(
    'SELECT role, content, timestamp FROM chat_history WHERE user_id = ? AND session_id = ? ORDER BY timestamp ASC',
    [userId, sessionId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to retrieve chat logs' });
      res.json(rows);
    }
  );
});

// CLEAR CHAT HISTORY FOR USER SESSION
app.delete('/api/ai/chat/history', authenticateToken, (req, res) => {
  const sessionId = req.query.session_id || 'default_session';
  const userId = req.user.id;

  db.run(
    'DELETE FROM chat_history WHERE user_id = ? AND session_id = ?',
    [userId, sessionId],
    function(err) {
      if (err) return res.status(500).json({ error: 'Could not clear chat history' });
      res.json({ message: 'Chat history cleared successfully', deletedCount: this.changes });
    }
  );
});

// POST CHAT MESSAGE (AI RESPONSE ROUTER)
app.post('/api/ai/chat', authenticateToken, (req, res) => {
  const { message, persona, session_id } = req.body;
  const sessionId = session_id || 'default_session';
  const userId = req.user.id;

  if (!message) {
    return res.status(400).json({ error: 'Prompt message is required' });
  }

  // 1. Save user query into history
  db.run(
    'INSERT INTO chat_history (user_id, session_id, role, content) VALUES (?, ?, ?, ?)',
    [userId, sessionId, 'user', message],
    (err) => {
      if (err) console.error('Could not save user query to history:', err.message);

      // 2. Compute simulated response with a 1.2-second timeout
      setTimeout(() => {
        let responseContent = '';
        const lowercaseMsg = message.toLowerCase();

        if (persona === 'Medical Writer') {
          // --- MEDICAL WRITER PERSONA ---
          if (lowercaseMsg.includes('referral') || lowercaseMsg.includes('letter')) {
            responseContent = `Here is a drafted clinical referral template for your patient:

\`\`\`text
OCUCARE EYE INSTITUTE
100 Medical Plaza, Suite 400

Date: ${new Date().toLocaleDateString()}
To: Dr. Arthur Vance, Vitreoretinal Specialist
From: ${req.user.full_name}, ${req.user.role}

RE: Clinical Referral for Ophthalmology Assessment
Patient: John Doe (Age 65)

Dear Dr. Vance,

I am writing to refer Mr. John Doe for an urgent vitreoretinal evaluation. 

During his examination today, visual acuity in the right eye (OD) was recorded at 20/50. Retinal fundus photography revealed multiple microaneurysms, hard exudates, and signs consistent with early Non-Proliferative Diabetic Retinopathy (NPDR). The patient has a 10-year history of Type 2 Diabetes.

I would appreciate your expert consult regarding the macular structural status and whether macular edema therapies (such as anti-VEGF injections) are indicated at this time.

Sincerely,
${req.user.full_name}
License: ${req.user.license_id}
\`\`\``;
          } else if (lowercaseMsg.includes('summary') || lowercaseMsg.includes('summarize')) {
            responseContent = `### Clinical Patient Dossier Summary

**Patient demographics**: John Doe (Age 65, Male)  
**Baseline Vision**: 20/50 OD (Right Eye) | 20/30 OS (Left Eye)  
**Intraocular Pressures**: 18 OD | 17 OS mmHg (Stable range)  

**Identified Pathologies**:  
- Type 2 Diabetes Mellitus  
- Non-proliferative Diabetic Retinopathy Suspect  
- Moderate visual acuity impairment in the right eye.

**Action Plan**:  
1. Continuous glycemic management (HbA1c target < 7.0%).  
2. Follow-up diagnostic scan scheduled in 90 days.  
3. Vitreoretinal consult booked for diabetic macular edema screening.`;
          } else {
            responseContent = `I am ready to help you draft clinical summaries, referral letters, or clean up patient progress notes.

**Quick Templates available**:
1. *Type "referral letter"* to generate a professional specialist referral letter.
2. *Type "summarize patient"* to format patient history logs into clean, readable clinical charts.`;
          }
        } 
        else if (persona === 'Code & Tech Support') {
          // --- CODE & TECH SUPPORT ---
          if (lowercaseMsg.includes('sql') || lowercaseMsg.includes('database') || lowercaseMsg.includes('query')) {
            responseContent = `Here is the SQLite schema query you requested for compiling patients based on high-risk ocular classifications:

\`\`\`sql
-- Retrieve all high-risk patients with glaucoma or diabetes history
SELECT id, name, age, risk_tier, medical_history 
FROM patients 
WHERE risk_tier = 'High' 
  AND (medical_history LIKE '%Glaucoma%' OR medical_history LIKE '%Diabetes%');
\`\`\`

You can run this query using your local SQLite interface. Let me know if you need helper scripts to automate the database extraction.`;
          } else {
            responseContent = `Here is a Node.js endpoint script to query clinical tasks grouped by priority tiers:

\`\`\`javascript
// Fetch all high-priority tasks
app.get('/api/tasks/high-priority', (req, res) => {
  const sql = "SELECT * FROM tasks WHERE priority = 'high' AND status = 'pending'";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
\`\`\`

Let me know if you are troubleshooting other tools or need script configurations!`;
          }
        }
        else if (persona === 'Brainstorming Partner') {
          // --- BRAINSTORMING ---
          responseContent = `### Clinical Symptom-Risk Brainstorming

Based on the symptom profile described, here is a breakdown of potential differential diagnoses and investigations:

1. **Vitreous Traction / Posterior Vitreous Detachment (PVD)**
   - *Symptom Match*: Sudden flashings of light (photopsias) associated with new floaters.
   - *Risk Tier*: Moderate.
   - *Recommended Action*: Dilated fundus examination using binocular indirect ophthalmoscopy to rule out peripheral retinal tears.

2. **Acute Angle-Closure Glaucoma**
   - *Symptom Match*: Severe eye pain, headache, colored halos around lights.
   - *Risk Tier*: Critical Emergency.
   - *Recommended Action*: Immediate gonioscopy, IOP measurement, and initiating topical IOP-lowering drops (or systemic acetazolamide).

3. **Macular Hole (Stage 1-2)**
   - *Symptom Match*: Central metamorphopsia (straight lines appearing wavy) and central visual drop.
   - *Recommended Action*: Optical Coherence Tomography (OCT) scan of the foveal region to evaluate vitreomacular interfaces.`;
        }
        else {
          // --- GENERAL CLINICAL ---
          if (lowercaseMsg.includes('diabetic') || lowercaseMsg.includes('retinopathy')) {
            responseContent = `### Diabetic Retinopathy (DR) Clinical Guidelines

Diabetic Retinopathy is categorized primarily into two stages:

1. **Non-Proliferative Diabetic Retinopathy (NPDR)**
   - *Features*: Microaneurysms, dot-and-blot hemorrhages, cotton-wool spots, and hard exudates.
   - *Management*: Glycemic index checks, blood pressure stabilization, and screening every 6-12 months.

2. **Proliferative Diabetic Retinopathy (PDR)**
   - *Features*: Neovascularization (growth of fragile new blood vessels) arising from the retina or optic disc, vitreous hemorrhage, and tractional retinal detachment.
   - *Management*: Urgent panretinal photocoagulation (PRP) laser or intravitreal anti-VEGF injection.

Let me know if you would like me to summarize these parameters or link them to a specific patient chart.`;
          } else {
            responseContent = `Hello ${req.user.full_name}. I am your OcuCare Assistant, configured for general clinical queries. 

I can assist you with:
- Reviewing ophthalmology screening guidelines (e.g., AAO screening intervals).
- Analyzing symptoms like elevated IOP, optic nerve cupping, or visual field deficits.
- Linking diagnostic guidelines to patient metrics.

How can I assist you with your clinical tasks today?`;
          }
        }

        // 3. Save AI response into history
        db.run(
          'INSERT INTO chat_history (user_id, session_id, role, content) VALUES (?, ?, ?, ?)',
          [userId, sessionId, 'assistant', responseContent],
          (err) => {
            if (err) console.error('Could not save AI reply to history:', err.message);

            res.json({
              role: 'assistant',
              content: responseContent,
              timestamp: new Date().toISOString()
            });
          }
        );
      }, 1200);
    }
  );
});

// ==========================================
// 7. AI DOCUMENT SUMMARIZER ENDPOINTS
// ==========================================

app.post('/api/documents/upload', authenticateToken, (req, res) => {
  docUpload.single('document')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }
    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      path: req.file.path
    });
  });
});

app.post('/api/documents/summarize', authenticateToken, (req, res) => {
  const { fileId, originalName } = req.body;
  if (!fileId) {
    return res.status(400).json({ error: 'fileId is required' });
  }

  // Determine path
  let filePath = `backend/uploads/${fileId}`;
  
  // Sandbox testing bypass for sample patient history
  if (fileId === 'sample_patient_history.txt') {
    filePath = 'backend/uploads/sample_patient_history.txt';
  }

  fs.readFile(filePath, 'utf8', (err, rawText) => {
    let documentContent = rawText || '';
    const fileExt = (originalName || fileId).split('.').pop().toLowerCase();

    if (err) {
      // If binary or missing, provide placeholder
      if (fileExt === 'pdf' || fileExt === 'docx') {
        documentContent = `[OCT ANALYSIS AND CLINICAL RECORDS METADATA]\nFilename: ${originalName || fileId}\nClassification: Glaucomatous Nerve Fiber Bundle Thinning\nVisual Field: Nasal defect OD\nPhysician notes indicate Latanoprost compliance checked.`;
      } else {
        return res.status(404).json({ error: 'Document asset not found or unreadable.' });
      }
    }

    // Simulate 2-second extraction delay
    setTimeout(() => {
      let executiveSummary = '';
      let keyPoints = [];
      let actionItems = [];

      const lowercaseContent = documentContent.toLowerCase();

      if (lowercaseContent.includes('vance') || lowercaseContent.includes('pat-9022') || fileId === 'sample_patient_history.txt') {
        // Seed patient: Johnathan Vance
        executiveSummary = "This document profiles patient Johnathan Vance (Age 68), participant in the GL-401 study for early glaucomatous nerve degradation. The patient presents with controlled Type 2 Diabetes and moderate hypertension. Ophthalmology findings indicated elevated IOP (initially 23 mmHg OD, 22 mmHg OS) which has successfully stabilized to 16 mmHg OD, 15 mmHg OS after daily bedtime Latanoprost therapy. Optic nerve cup-to-disc ratio is 0.65 OD / 0.55 OS. Superior temporal sector thinning of the retinal nerve fiber layer (RNFL) was identified in the right eye (OD) during the latest optical coherence tomography (OCT) scan.";
        
        keyPoints = [
          "Patient Name: Johnathan Vance, Age 68, ID PAT-9022 (GL-401 Protocol)",
          "Clinical History: Visual fields showed nasal step defects in the right eye (OD) during late 2025 examinations.",
          "Therapy Management: Daily bedtime Latanoprost drops lowered bilateral IOP from 23/22 mmHg to 16/15 mmHg.",
          "Nerve fiber status: Borderline disc cupping (0.65 OD, 0.55 OS) with superior temporal RNFL thinning OD."
        ];

        actionItems = [
          "Monitor clinician task queues for daily Latanoprost drop compliance updates.",
          "Schedule repeat SITA-Standard 24-2 visual field examination and RNFL OCT in 6 months.",
          "Arrange annual endocrinological check for diabetic cardiovascular profiling.",
          "Advise patient to report colored halos or sudden eye pain immediately."
        ];
      } else {
        // Generic Clinical Document fallback summarizer
        executiveSummary = `Clinical document summary of ${originalName || 'uploaded asset'}. The record documents visual acuity trends, patient history parameters, and ophthalmic assessments. The medical documentation reviews drug therapies and progress indexes across multiple consult periods.`;
        
        keyPoints = [
          `File classified: Ophthalmic Record Summary (.${fileExt} format)`,
          "Primary visual acuity records and intraocular pressures checked during recent exams.",
          "Progress indices evaluate RNFL thickness margins and visual field charts.",
          "Comorbidity logs track medication profiles and drug compliance indices."
        ];

        actionItems = [
          "Validate patient details against electronic health records.",
          "Verify follow-up parameters and schedule secondary optical tests as indicated.",
          "Commit note summaries directly to the patient's longitudinal record timeline."
        ];
      }

      logUserActivity(req.user.id, 'Summarized document: ' + (originalName || fileId), 'summarizer');
      res.json({
        success: true,
        fileName: originalName || fileId,
        fileText: documentContent,
        summary: {
          executiveSummary,
          keyPoints,
          actionItems
        }
      });
    }, 2000);
  });
});

// ==========================================
// 8. AI EMAIL & DOCUMENT GENERATOR ENDPOINTS
// ==========================================

app.post('/api/documents/generate', authenticateToken, (req, res) => {
  const { archetype, keyInputs, tone, length } = req.body;
  if (!archetype || !keyInputs) {
    return res.status(400).json({ error: 'Archetype and core inputs are required' });
  }

  // 1.5-second processing timeout simulation
  setTimeout(() => {
    let generatedContent = '';
    const nowStr = new Date().toLocaleDateString();

    if (archetype === 'Professional Email') {
      if (tone === 'Formal') {
        generatedContent = `Subject: Professional Consultation and Referral Assessment

Dear Colleague,

I am writing to provide a clinical progress update and seek your consultation regarding a patient under my care who presents with the following details:

"${keyInputs}"

Based on this clinical presentation, I believe a formal evaluation is warranted. Please review these parameters and let me know your recommended timelines for follow-up testing or therapeutic interventions.

Best regards,
${req.user.full_name}, MD
${req.user.clinic_name}
License: ${req.user.license_id}`;
      } else if (tone === 'Empathetic') {
        generatedContent = `Subject: OcuCare Health Update and Next Steps

Dear Patient,

I wanted to reach out personally to share the summary of your recent clinical findings and outline our care plan:

"${keyInputs}"

Please rest assured that our medical team is closely monitoring these parameters. We want to ensure you feel supported at every stage of your treatment. Let us know if you have any immediate questions or visual symptoms.

Warm regards,
${req.user.full_name}
${req.user.clinic_name}`;
      } else { // Direct
        generatedContent = `Subject: Clinical Task Update: Patient Ocular File

Team,

Please review the following clinical indicators and action items immediately:

Context: "${keyInputs}"

Immediate actions:
1. Cross-reference metrics with database profiles.
2. Confirm follow-up appointment scheduling.
3. Update active clinician task queue lists.

Regards,
${req.user.full_name}`;
      }
    } 
    else if (archetype === 'Leave Application') {
      generatedContent = `Date: ${nowStr}
To: Clinical Residency Director
From: ${req.user.full_name}, ${req.user.role}

Subject: Request for Clinical Leave of Absence

Dear Director,

I am writing to formally request a clinical leave of absence due to the following requirements:

"${keyInputs}"

I have coordinated coverage for my active shifts and patient rounds during this window. I will ensure all clinical task queues are up to date prior to my departure. Thank you for your consideration of this request.

Sincerely,
${req.user.full_name}`;
    } 
    else if (archetype === 'Cover Letter') {
      generatedContent = `Date: ${nowStr}
To: Fellowship Selection Committee
From: ${req.user.full_name}, MD

Subject: Application for Clinical Ophthalmology Fellowship

Dear Members of the Committee,

I am writing to express my strong interest in the Clinical Ophthalmology Fellowship. Having reviewed your program goals, I believe my qualifications align closely, specifically regarding my work in:

"${keyInputs}"

My clinical experience at ${req.user.clinic_name} has prepared me to contribute effectively to your active research protocols and patient care workflows. I welcome the opportunity to discuss my application further.

Sincerely,
${req.user.full_name}
License: ${req.user.license_id}`;
    } 
    else { // Business Proposal
      generatedContent = `PROJECT PROPOSAL: OPHTHALMOLOGY WORKSPACE EQUIPMENT UPGRADE
Location: ${req.user.clinic_name}
Date: ${nowStr}

=========================================
1. EXECUTIVE SUMMARY
=========================================
This proposal outlines the strategic acquisition and financing metrics for updating clinical diagnostic gear:

"${keyInputs}"

=========================================
2. CLINICAL PROJECTED PROJECTIONS & ROI
=========================================
By integrating these equipment improvements, we estimate:
- A 30% reduction in patient diagnostic wait times.
- Enhanced accuracy in tracking progressive fiber layer thinning.
- Improved clinic queue productivity and throughput.

Submitted by:
${req.user.full_name}, Chief Operations lead`;
    }

    // Apply length filters (simulate text trim or expansion)
    if (length === 'Concise') {
      const lines = generatedContent.split('\n');
      generatedContent = lines.filter(line => !line.startsWith('Dear') && !line.startsWith('RE:') && !line.startsWith('Date:') && !line.startsWith('To:') && !line.startsWith('From:')).slice(0, 7).join('\n');
      generatedContent = `[CONCISE CONTEXT DRAFT]\n\n${generatedContent.trim()}`;
    } else if (length === 'Detailed') {
      generatedContent = `${generatedContent}\n\n=========================================\nCONFIDENTIALITY NOTICE & HIPAA DISCLAIMER\nThis document draft contains protected health information (PHI) intended solely for clinical coordination and HIPAA compliant communications. Unauthorized reproduction or redistribution is strictly prohibited.`;
    }

    logUserActivity(req.user.id, 'Generated document draft: ' + archetype, 'writer');
    res.json({
      success: true,
      archetype,
      tone,
      length,
      document: generatedContent
    });
  }, 1500);
});

// ==========================================
// 9. AI RESUME BUILDER & ATS OPTIMIZER ENDPOINTS
// ==========================================

app.post('/api/resume/optimize', authenticateToken, (req, res) => {
  const { experienceText, targetJobDescription } = req.body;
  if (!experienceText || !targetJobDescription) {
    return res.status(400).json({ error: 'Candidacy experience and target job description are required' });
  }

  // 1.5-second processing timeout simulation
  setTimeout(() => {
    const lowercaseExp = experienceText.toLowerCase();
    const lowercaseJob = targetJobDescription.toLowerCase();

    // Semi-realistic ATS Keyword matching logic
    const importantATSKeywords = [
      'clinical', 'glaucoma', 'trials', 'data', 'retina', 'patients', 
      'visual field', 'compliance', 'database', 'metrics', 'rnfl', 'oct',
      'protocols', 'hipaa', 'ophthalmology', 'biomicroscopy', 'coordination'
    ];

    const presentKeywords = importantATSKeywords.filter(kw => lowercaseExp.includes(kw));
    const requiredInJob = importantATSKeywords.filter(kw => lowercaseJob.includes(kw));
    
    // Missing keywords are those that are in the job description but not in candidate's experience
    const missingKeywords = requiredInJob.filter(kw => !presentKeywords.includes(kw));

    // Compute ATS Score based on match ratio (base 45% if minimal match)
    let score = 45;
    if (requiredInJob.length > 0) {
      const matchRatio = (requiredInJob.length - missingKeywords.length) / requiredInJob.length;
      score = Math.round(45 + matchRatio * 50); // scales 45% to 95%
    }
    if (score > 100) score = 100;

    // Compile STAR optimized bullet points with bold metrics
    const optimizedBullets = [
      `Managed clinical coordination operations for **120+ clinical trial participants** under study protocol GL-401, securing a **99.6% compliance index** for Latanoprost bedtime drop administration.`,
      `Analyzed longitudinal optical coherence tomography (OCT) data arrays and RNFL thickness trends, reducing diagnostic reporting times by **24%** across multi-departmental glaucoma clinics.`,
      `Maintained electronic health records (EHR) database integrity in full alignment with **HIPAA secure directives**, eliminating patient record auditing anomalies over a **3-year operation window**.`
    ];

    logUserActivity(req.user.id, 'Optimized resume content matching ATS requirements', 'resumebuilder');
    res.json({
      success: true,
      atsScore: score,
      optimizedBullets,
      missingATSKeywords: missingKeywords.length > 0 ? missingKeywords : ['None']
    });
  }, 1500);
});

// ==========================================
// 10. RETARGETED MULTI-LANGUAGE TRANSLATOR ENDPOINTS
// ==========================================

app.post('/api/translate/process', authenticateToken, (req, res) => {
  const { text, targetLanguage, sourceLanguage } = req.body;
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Text content and target language are required' });
  }

  // 1-second simulated delay
  setTimeout(() => {
    let detectedLang = 'English';
    const lowercaseText = text.toLowerCase();

    // Basic vocabulary triggers for auto-detect simulation (including Telugu Unicode range)
    if (/[\u0C00-\u0C7F]/.test(text)) {
      detectedLang = 'Telugu';
    } else if (/[\u0600-\u06FF]/.test(text)) {
      detectedLang = 'Arabic';
    } else if (/[\u0900-\u097F]/.test(text)) {
      detectedLang = 'Hindi';
    } else if (lowercaseText.includes('retinopatía') || lowercaseText.includes('gracias') || lowercaseText.includes('gotas') || lowercaseText.includes('ojo')) {
      detectedLang = 'Spanish';
    } else if (lowercaseText.includes('diabétique') || lowercaseText.includes('bonjour') || lowercaseText.includes('rétinien')) {
      detectedLang = 'French';
    } else if (lowercaseText.includes('retinopathy') || lowercaseText.includes('retinal') || lowercaseText.includes('pressure') || lowercaseText.includes('visual')) {
      detectedLang = 'English';
    } else {
      detectedLang = 'Auto-Detected (Spanish)';
    }

    // Curated mock translation dictionary including Telugu translations
    const translationDict = {
      'your retinal scan shows early signs of diabetic retinopathy.': {
        'Spanish': 'Su escaneo de retina muestra signos tempranos de retinopatía diabética.',
        'French': 'Votre scanner rétinien montre des signes précoces de rétinopathie diététique.',
        'Mandarin': '您的视网膜扫描显示出糖尿病性视网膜病变的早期迹象。',
        'Hindi': 'आपके रेटिनल स्कैन में डायबिटिक रेटिनोपैथी के शुरुआती लक्षण दिख रहे हैं।',
        'Arabic': 'يظهر فحص شبكية العين علامات مبكرة لاعتلال الشبكية السكري.',
        'Telugu': 'మీ రెటినాల్ స్కాన్ డయాబెటిక్ రెటినోపతి యొక్క ప్రారంభ సంకేతాలను చూపుతోంది।',
        'Vietnamese': 'Kết quả chụp võng mạc của bạn cho thấy các dấu hiệu sớm của bệnh võng mạc tiểu đường.',
        'Italian': 'La scansione retinica mostra segni precoci di retinopatia diabetica.',
        'German': 'Ihr Netzhautscan zeigt frühe Anzeichen einer diabetischen Retinopathie.',
        'Portuguese': 'O seu exame de retina mostra sinais precoces de retinopatia diabética.'
      },
      'please make sure to take your latanoprost bedtime eye drops daily.': {
        'Spanish': 'Por favor, asegúrese de usar sus gotas oftálmicas de Latanoprost diariamente al acostarse.',
        'French': 'Veuillez vous assurer de prendre vos gouttes oculaires de Latanoprost au coucher tous les jours.',
        'Mandarin': '请确保每天睡前使用拉坦前列素滴眼液。',
        'Hindi': 'कृपया सुनिश्चित करें कि आप रोजाना सोते समय लैटनोप्रोस्ट आई ड्रॉप्स लें।',
        'Arabic': 'يرجى التأكد من تناول قطرات العين ليتانوبروست يوميًا عند النوم.',
        'Telugu': 'దయచేసి ప్రతిరోజూ పడుకునే ముందు మీ లాటానోప్రోస్ట్ కంటి చుక్కలను వేసుకోవాలని గుర్తుంచుకోండి।',
        'Vietnamese': 'Hãy chắc chắn rằng bạn sử dụng thuốc nhỏ mắt Latanoprost trước khi đi ngủ hàng ngày.',
        'Italian': 'Assicurati di assumere giornalmente le gocce oculari di Latanoprost prima di andare a dormire.',
        'German': 'Bitte stellen Sie sicher, dass Sie täglich Ihre Latanoprost-Augentropfen vor dem Schlafengehen einnehmen.'
      }
    };

    // Clean text to lookup
    const lookupKey = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    let translated = '';

    // Search dictionary
    const dictMatch = Object.keys(translationDict).find(key => {
      const cleanKey = key.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      return cleanKey === lookupKey || cleanKey.includes(lookupKey) || lookupKey.includes(cleanKey);
    });

    if (dictMatch && translationDict[dictMatch][targetLanguage]) {
      translated = translationDict[dictMatch][targetLanguage];
    } else {
      // Fallback: Generate structured premium mock clinical output translation block
      translated = `[${targetLanguage} Clinical Translation]\n\nLa siguiente información clínica ha sido procesada con precisión médica:\n"${text}"\n\n[Disclaimer: Translated via OcuCare Medical Core. Confirmed for patient coordination.]`;
      if (targetLanguage === 'Telugu') {
        translated = `[Telugu Translation]\n\nఈ క్రింది వైద్య రికార్డు ఖచ్చితత్వంతో అనువదించబడింది:\n"${text}"\n\n[Disclaimer: OcuCare మెడికల్ అనువాదం. ధృవీకరించబడింది.]`;
      } else if (targetLanguage === 'Hindi') {
        translated = `[Hindi Translation]\n\nनिम्नलिखित नैदानिक रिकॉर्ड का चिकित्सा सटीकता के साथ अनुवाद किया गया है:\n"${text}"`;
      } else if (targetLanguage === 'Arabic') {
        translated = `[Arabic Translation]\n\nتم ترجمة السجل السريري التالي بدقة طبية عالية:\n"${text}"`;
      } else if (targetLanguage === 'Mandarin') {
        translated = `[Mandarin Translation]\n\n以下临床记录已按医疗级精度进行翻译：\n"${text}"`;
      }
    }

    logUserActivity(req.user.id, 'Translated clinical text to ' + targetLanguage, 'translator');
    res.json({
      success: true,
      translatedText: translated,
      detectedLanguage: detectedLang,
      targetLanguage
    });
  }, 1000);
});

// ==========================================
// 11. AI CODE ASSISTANT & DEVELOPER STUDIO ENDPOINTS
// ==========================================

app.post('/api/code/process', authenticateToken, (req, res) => {
  const { mode, sourceCode, errorLog, languages } = req.body;
  if (!mode || !sourceCode) {
    return res.status(400).json({ error: 'Mode and source code prompt are required' });
  }

  // 1.5-second simulated timeout
  setTimeout(() => {
    let outputCode = '';
    let explanationText = '';

    const cleanSource = sourceCode.trim();
    const cleanError = (errorLog || '').trim();

    if (mode === 'convert') {
      const srcLang = languages?.source || 'sql';
      const tgtLang = languages?.target || 'python';

      if (srcLang.toLowerCase() === 'sql' && tgtLang.toLowerCase() === 'python') {
        outputCode = `from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary key=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    role = Column(String(50), default='resident')
`;
        explanationText = `- Declared SQLAlchemy declarative base class mapping models to database tables natively.
- Created 'User' mapped model class targeting the 'users' physical relation schema.
- Mapped individual properties (id, full_name, email, role) to matching column constraints.
- Declared string limits and nullable settings to match database integrity guidelines.`;
      } else {
        // Fallback convert code block
        outputCode = `// [Converted to ${tgtLang} from ${srcLang}]
// Source block:
// ${cleanSource.split('\n').join('\n// ')}

export function processedTranslation() {
  console.log("Processing code segment in ${tgtLang}...");
  return true;
}`;
        explanationText = `- Evaluated source syntax constructs for the ${srcLang} script.
- Re-mapped variable bindings and function statements to match ${tgtLang} compiler specifications.
- Verified output conforms to modern coding conventions.`;
      }
    } 
    else if (mode === 'debug') {
      outputCode = `import express from 'express';
import cors from 'cors';

const app = express();

// FIXED: Enabled CORS configuration explicitly to resolve origin blockage
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5000'],
  credentials: true
}));

app.use(express.json());

app.post('/api/diagnose', (req, res) => {
  res.json({ status: 'active', diagnosticResult: 'Normal limits' });
});
`;
      explanationText = `- Identified CORS policy blockage error trace: "${cleanError || 'Access-Control-Allow-Origin header missing'}".
- Resolved exception by installing and configuring the 'cors' middleware block.
- Declared permitted Origin scopes targeting local Vite/Express development URLs.
- Enabled credentials transfers across network borders.`;
    } 
    else if (mode === 'explain') {
      outputCode = cleanSource;
      explanationText = `- Analyzed Javascript/React Context declaration code.
- Evaluated 'useAuth' context custom React hook binding user logins and credentials headers.
- Traced the active token session validators executing inside Express servers.
- Verified how state values coordinate across downstream dashboard pages.`;
    } 
    else { // generate
      outputCode = `import sqlite3 from 'sqlite3';

// Setup database connection and tables
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(\`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      visual_acuity_od TEXT,
      visual_acuity_os TEXT,
      intraocular_pressure_od INTEGER,
      intraocular_pressure_os INTEGER
    )
  \`);

  console.log("OcuCare local in-memory SQLite database initialized successfully.");
});
`;
      explanationText = `- Synthesized SQLite table structures mapping patient metrics.
- Added visual acuity (OD/OS) string values and IOP integer bounds.
- Wrapped execution blocks inside db.serialize constraints to ensure orderly setup.`;
    }

    logUserActivity(req.user.id, 'Processed code compilation mode: ' + mode, 'codeassistant');
    res.json({
      success: true,
      outputCode,
      explanationText
    });
  }, 1500);
});

// ==========================================
// 12. AI DATA ANALYZER ENDPOINTS
// ==========================================

app.post('/api/analyzer/upload', authenticateToken, (req, res) => {
  sheetUpload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No spreadsheet file was uploaded.' });
    }
    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    });
  });
});

app.post('/api/analyzer/process', authenticateToken, (req, res) => {
  const { fileId, originalName } = req.body;
  if (!fileId) {
    return res.status(400).json({ error: 'fileId is required' });
  }

  // Determine path
  let filePath = `backend/uploads/${fileId}`;
  if (fileId === 'vrinda_store_clean.csv') {
    filePath = 'backend/uploads/vrinda_store_clean.csv';
  }

  fs.readFile(filePath, 'utf8', (err, rawText) => {
    // If file missing or unreadable, we handle fallback gracefully
    const fileContent = rawText || '';
    
    // Simulate 2-second analysis latency
    setTimeout(() => {
      // Metric figures calculations
      let totalVolume = 12; // default based on dummy csv
      let meanAmount = 1279;
      let maxAmount = 2100;
      let categoriesCount = 4; // Amazon, Myntra, Flipkart, Shopify

      // High-fidelity structured metrics matching our dummy dataset
      const barData = [
        { name: 'Amazon', value: 3497 },
        { name: 'Myntra', value: 5150 },
        { name: 'Flipkart', value: 1100 },
        { name: 'Shopify', value: 3550 }
      ];

      const lineData = [
        { label: 'Jan', value: 2149 },
        { label: 'Feb', value: 2049 },
        { label: 'Mar', value: 3050 },
        { label: 'Apr', value: 1449 },
        { label: 'May', value: 3050 },
        { label: 'Jun', value: 2550 }
      ];

      const aiInsights = [
        "Peak sales distribution identified on **Myntra** ($5,150) dominating early second-quarter retail performance matrices.",
        "Categorical anomaly: order cancellations spike to **18.2%** during February, indicating localized shipping bottlenecks.",
        "Average order basket values hold stable at **$1,279** with high-margin customer return indices of less than **3.5%**.",
        "Operational recommendation: scale Amazon ad bidding during seasonal dips (late Q2) to balance marketplace revenue distributions."
      ];

      // Custom clinical data if parsed text contains patient indicators
      if (fileContent.toLowerCase().includes('patient') || originalName.toLowerCase().includes('patient')) {
        totalVolume = 85;
        meanAmount = 16.2; // IOP mean
        maxAmount = 23;    // IOP max
        categoriesCount = 3; // Glaucoma, Cataract, AMD

        barData.length = 0;
        barData.push(
          { name: 'Glaucoma', value: 45 },
          { name: 'Cataract', value: 25 },
          { name: 'AMD', value: 15 }
        );

        lineData.length = 0;
        lineData.push(
          { label: 'Week 1', value: 21 },
          { label: 'Week 2', value: 18 },
          { label: 'Week 3', value: 19 },
          { label: 'Week 4', value: 16 },
          { label: 'Week 5', value: 15 },
          { label: 'Week 6', value: 15 }
        );

        aiInsights.length = 0;
        aiInsights.push(
          "Average intraocular pressure (IOP) stabilized from **21 mmHg** to a healthy mean of **16.2 mmHg** post bedtime Latanoprost therapy.",
          "Anatomical visual step anomalies detected in **12.4%** of the screening cohort, indicating need for closer visual fields checks.",
          "Clinical recommendation: automate follow-up scheduling tasks in the queue when patient IOP thresholds exceed **22 mmHg**."
        );
      }

      logUserActivity(req.user.id, 'Analyzed database sheet: ' + originalName, 'dataanalyzer');
      res.json({
        success: true,
        fileName: originalName,
        metrics: {
          totalVolume,
          meanAmount,
          maxAmount,
          categoriesCount
        },
        chartData: {
          barData,
          lineData
        },
        aiInsights
      });

    }, 2000);
  });
});

// ==========================================
// 13. AI NOTES GENERATOR ENDPOINTS
// ==========================================

app.post('/api/notes/generate', authenticateToken, (req, res) => {
  const { rawText, formatType } = req.body;
  if (!rawText) {
    return res.status(400).json({ error: 'Raw text transcript is required.' });
  }

  // 1.5-second simulated timeout
  setTimeout(() => {
    const lowercaseText = rawText.toLowerCase();
    
    // Default Glaucoma seeded responses
    let nestedNotes = [
      "Elevated **Intraocular Pressure (IOP)** stands as the primary modifiable risk factor for glaucoma optic nerve degradation.",
      "First-Line Therapy: Prostaglandin analogs (e.g. **Latanoprost**) act by increasing uveoscleral outflow pathways.",
      "Second-Line Therapy: Beta-blockers (e.g. **Timolol**) act by reducing ciliary body aqueous humor production.",
      "Surgical Intervention: Refractory cases require **Laser Trabeculoplasty** or surgical **Trabeculectomy**."
    ];

    let flashcards = [
      { id: 1, front: "What is the primary modifiable risk factor in glaucoma management?", back: "Elevated intraocular pressure (IOP) that leads to optic nerve damage." },
      { id: 2, front: "How do prostaglandin analogs like Latanoprost lower IOP?", back: "By enhancing the uveoscleral outflow of aqueous humor." },
      { id: 3, front: "What surgical option is typical for refractory glaucoma?", back: "Laser trabeculoplasty or surgical trabeculectomy to create a new drainage pathway." }
    ];

    let mindMapNodes = [
      { id: "root", label: "Glaucoma Treatment Pathways", parentId: null },
      { id: "meds", label: "Pharmacological Therapy", parentId: "root" },
      { id: "latanoprost", label: "Prostaglandin Analogs (Outflow)", parentId: "meds" },
      { id: "timolol", label: "Beta-Blockers (Production)", parentId: "meds" },
      { id: "surgery", label: "Surgical Intervention", parentId: "root" },
      { id: "trabeculoplasty", label: "Laser Trabeculoplasty", parentId: "surgery" },
      { id: "trabeculectomy", label: "Surgical Trabeculectomy", parentId: "surgery" }
    ];

    // Generic fallback translation if the user writes custom text
    if (!lowercaseText.includes('glaucoma') && !lowercaseText.includes('latanoprost')) {
      nestedNotes = [
        `Summary Concept: Paste contains **${rawText.slice(0, 30)}...** structures.`,
        "Key Point A: Evaluated core nouns and adjectives patterns.",
        "Key Point B: Reorganized sentence structure to maximize retention ratios."
      ];

      flashcards = [
        { id: 1, front: "What is the main subject of the provided text?", back: `The text focuses on: "${rawText.slice(0, 50)}..."` },
        { id: 2, front: "What is the first parsed conceptual takeaway?", back: "A summarized view of key terms and vocabulary." }
      ];

      mindMapNodes = [
        { id: "root", label: "Custom Text Summary", parentId: null },
        { id: "concepts", label: "Core Concepts", parentId: "root" },
        { id: "node1", label: `${rawText.slice(0, 20)}...`, parentId: "concepts" },
        { id: "insights", label: "Strategic Advice", parentId: "root" },
        { id: "node2", label: "Actionable points summary", parentId: "insights" }
      ];
    }

    logUserActivity(req.user.id, 'Generated structured study notes & mind maps', 'notesgenerator');
    res.json({
      success: true,
      nestedNotes,
      flashcards,
      mindMapNodes
    });
  }, 1500);
});

// ==========================================
// 14. AI VOICE ASSISTANT & COMMAND MATRIX ENDPOINTS
// ==========================================

app.post('/api/voice/parse', authenticateToken, (req, res) => {
  const { rawText } = req.body;
  if (!rawText) {
    return res.status(400).json({ error: 'Text vocal transcription is required.' });
  }

  const query = rawText.toLowerCase().trim();
  let command = 'unknown';
  let patientName = '';

  if (query.includes('dashboard') || query.includes('home')) {
    command = 'navigate_dashboard';
  } else if (query.includes('search patient') || query.includes('show patient') || query.includes('open patient')) {
    command = 'search_patient';
    // Extract everything after 'patient' or 'show patient'
    const parts = query.split(/patient\s+/);
    if (parts.length > 1) {
      patientName = parts[1].trim();
    }
  } else if (query.includes('read summary') || query.includes('read notes') || query.includes('read out')) {
    command = 'read_summary';
  } else if (query.includes('scan') || query.includes('diagnose') || query.includes('run diagnostic')) {
    command = 'run_scan_diagnosis';
  } else if (query.includes('clear') || query.includes('reset')) {
    command = 'clear_filters';
  }

  res.json({
    success: true,
    rawText,
    command,
    patientName
  });
});

// ==========================================
// 15. AI STUDY ASSISTANT & RETENTION SUITE ENDPOINTS
// ==========================================

app.post('/api/study/process', authenticateToken, (req, res) => {
  const { topic, mode, level } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Mastery study topic is required.' });
  }

  // 1.5-second simulated timeout
  setTimeout(() => {
    const lowercaseTopic = topic.toLowerCase();
    
    // Default seeded OCT Interpretation responses
    let explanationHTML = `### Optical Coherence Tomography (OCT) Interpretation Patterns

Optical Coherence Tomography (OCT) is a high-resolution, non-invasive cross-sectional optical imaging diagnostic test. It maps micrometer-level retinal layer thickness matrices using light waves reflectivity indices.

#### Key Structural Retinal Boundaries:
- **Retinal Pigment Epithelium (RPE)**: Visible as the outermost hyperreflective (bright white) thick band. Elevation ripples or breaks in this band typically indicate drusen or geographic atrophy.
- **Inner/Outer Segment Junction (EZ Line)**: The line immediately above the RPE representing photoreceptor integrity. Intactness directly correlates to visual acuity recovery.
- **Henle's Layer / OPL**: Fluid-filled pockets here form cystoid macular edema shapes.

#### Common Pathological Patterns:
- **Subretinal Fluid (SRF)**: Hyporeflective (dark) fluid pockets accumulating under the neurosensory retina, lifting it off the RPE.
- **Intraretinal Cystoid Spaces**: Pockets of fluid within the retinal layers, causing swelling and distortion.
- **Choroidal Neovascular Membrane (CNVM)**: Hyperreflective growth breaching Bruch's membrane, indicating active choroid vascular leakage.`;

    let quizArray = [
      {
        id: 1,
        question: "What does subretinal fluid (SRF) appear as on an OCT scan cross-section?",
        options: [
          "A dark, hyporeflective pocket underneath the neurosensory retina layer",
          "A thick, hyperreflective band above the RPE interface",
          "A thin wrinkling membrane adhering to the inner limiting surface",
          "A shadow column directly below a massive retinal hemorrhage"
        ],
        correctOption: 0,
        rationaleText: "Because fluid does not reflect back the laser scanning waves, it appears as a completely black/dark hyporeflective space separating retinal cells layers."
      },
      {
        id: 2,
        question: "A hyperreflective band breaching Bruch's membrane indicates which pathology?",
        options: [
          "Dry Macular Degeneration (Geographic Atrophy)",
          "Choroidal Neovascularization (Wet AMD CNV)",
          "Central Serous Chorioretinopathy (CSCR)",
          "Vitreomacular Traction Syndrome (VMT)"
        ],
        correctOption: 1,
        rationaleText: "CNV membranes consist of high-density new blood vessels growing upwards from the choroid, showing up on OCT as hyperreflective bands breaching the RPE boundary."
      },
      {
        id: 3,
        question: "Cystoid macular edema fluid collects primarily within which anatomical layer?",
        options: [
          "Retinal Pigment Epithelium (RPE)",
          "Henle's / Outer Plexiform Layer (OPL)",
          "Inner Limiting Membrane (ILM)",
          "Choriocapillaris layers"
        ],
        correctOption: 1,
        rationaleText: "Macular fluid leaks accumulate inside outer plexiform and inner nuclear layer boundaries, expanding into distinct cystoid spaces."
      }
    ];

    let flashcardsArray = [
      { id: 1, promptFront: "How does Drusen appear on OCT scans?", answerBack: "Drusen appear as focal, dome-shaped elevations of the RPE layer with moderate internal reflectivity." },
      { id: 2, promptFront: "What does shadowing behind a dense structure represent?", answerBack: "Shadowing is a dark columns vertical artifact below dense structures (e.g. blood, hard exudates) that block laser light penetration." },
      { id: 3, promptFront: "Identify the OCT sign of Vitreomacular Traction.", answerBack: "A highly reflective vitreous membrane pulling on the foveal surface, distorting retinal contours." }
    ];

    let practiceProblems = [
      {
        id: 1,
        scenario: "A 67-year-old patient reports progressive distortion of central lines. OCT scan reveals focal elevation of the RPE layer by hyporeflective fluid pockets and a hyperreflective subretinal lesion. What is the diagnosis?",
        answerExplanation: "This indicates neovascular (wet) AMD with choroidal neovascularization (CNV). The focal elevation is the active membrane, and hyporeflective pockets are subretinal fluid accumulations requiring anti-VEGF therapy."
      }
    ];

    // Generic fallback responses if the user inputs custom topic
    if (!lowercaseTopic.includes('oct') && !lowercaseTopic.includes('tomography') && !lowercaseTopic.includes('coherence')) {
      explanationHTML = `### Mastering: ${topic}

Mastery overview for study topic **${topic}** under level parameters **${level}**.

#### Essential Takeaways:
- **Core Principle**: Standard definitions of the subject matter.
- **Clinical Integration**: Practical diagnostic applications in healthcare environments.
- **Execution Workflow**: Step-by-step procedures to review.`;

      quizArray = [
        {
          id: 1,
          question: `What is the primary concern when evaluating ${topic}?`,
          options: [
            "Ensuring baseline patient safety guidelines",
            "Measuring mechanical calibration thresholds",
            "Analyzing vector variables coefficients",
            "Standard administrative record checks"
          ],
          correctOption: 0,
          rationaleText: `In health systems, patient safety and treatment efficacy remains the primary modifiable baseline concern when studying ${topic}.`
        }
      ];

      flashcardsArray = [
        { id: 1, promptFront: `What is the core definition of ${topic}?`, answerBack: `A clinical method or concept used to evaluate patient progress parameters.` }
      ];

      practiceProblems = [
        {
          id: 1,
          scenario: `A patient is scheduled for a consult regarding ${topic}. What should the clinician review first?`,
          answerExplanation: "The clinician must evaluate patient charts, historical visual acuity stats, and current guidelines logs before starting treatment runs."
        }
      ];
    }

    logUserActivity(req.user.id, 'Evaluated study revision assessments for ' + topic, 'studyassistant');
    res.json({
      success: true,
      topic,
      explanationHTML,
      quizArray,
      flashcardsArray,
      practiceProblems
    });
  }, 1500);
});

// ==========================================
// 16. CENTRALIZED MASTER DASHBOARD ENDPOINTS
// ==========================================

// Ensure favorites table exists
db.run("CREATE TABLE IF NOT EXISTS user_favorites (user_id INTEGER, tool_key TEXT, PRIMARY KEY (user_id, tool_key))");

// Get Telemetry usage data
app.get('/api/dashboard/telemetry', authenticateToken, (req, res) => {
  const userId = req.user.id;

  // Query 1: Total AI Invocations
  db.get('SELECT SUM(total_invocations) as total FROM user_analytics WHERE user_id = ?', [userId], (err, row1) => {
    const totalExecutions = (row1 && row1.total) || 0;

    // Query 2: Total Documents Saved
    db.get('SELECT COUNT(*) as total FROM saved_assets WHERE user_id = ?', [userId], (err, row2) => {
      const savedDocsCount = (row2 && row2.total) || 0;

      // Query 3: Languages Translated (from analytics)
      db.get("SELECT total_invocations FROM user_analytics WHERE user_id = ? AND tool_key = 'translator'", [userId], (err, row3) => {
        const languagesCount = (row3 && row3.total_invocations) || 0;

        // Query 4: Favorites pinned list
        db.all('SELECT tool_key FROM user_favorites WHERE user_id = ?', [userId], (err, favRows) => {
          const favorites = (favRows || []).map(r => r.tool_key);

          // Calculate compute time saved (e.g. 5.5 minutes saved per AI invocation)
          const minutesSaved = Math.round(totalExecutions * 5.5);

          res.json({
            success: true,
            totalExecutions,
            savedDocsCount,
            languagesCount,
            minutesSaved,
            favorites
          });
        });
      });
    });
  });
});

// Get recent history log (latest 10 entries)
app.get('/api/dashboard/history', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all(
    'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, history: rows || [] });
    }
  );
});

// Favorite toggle pref controller
app.post('/api/dashboard/favorite-toggle', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { toolKey } = req.body;

  if (!toolKey) {
    return res.status(400).json({ error: 'toolKey is required' });
  }

  db.get('SELECT * FROM user_favorites WHERE user_id = ? AND tool_key = ?', [userId, toolKey], (err, row) => {
    if (row) {
      // Remove favorite
      db.run('DELETE FROM user_favorites WHERE user_id = ? AND tool_key = ?', [userId, toolKey], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, favorited: false, toolKey });
      });
    } else {
      // Add favorite
      db.run('INSERT INTO user_favorites (user_id, tool_key) VALUES (?, ?)', [userId, toolKey], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, favorited: true, toolKey });
      });
    }
  });
});

// Get saved document assets list
app.get('/api/dashboard/assets', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all('SELECT * FROM saved_assets WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, assets: rows || [] });
  });
});

// Save document asset
app.post('/api/dashboard/save-asset', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { assetTitle, toolSource, contentPayload } = req.body;

  if (!assetTitle || !toolSource || !contentPayload) {
    return res.status(400).json({ error: 'Title, source, and payload are required' });
  }

  db.run(
    'INSERT INTO saved_assets (user_id, asset_title, tool_source, content_payload) VALUES (?, ?, ?, ?)',
    [userId, assetTitle, toolSource, contentPayload],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      logUserActivity(userId, `Exported saved asset: ${assetTitle}`, toolSource);

      res.json({
        success: true,
        assetId: this.lastID,
        assetTitle,
        toolSource
      });
    }
  );
});

// Delete saved asset
app.delete('/api/dashboard/assets/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const assetId = req.params.id;

  db.run('DELETE FROM saved_assets WHERE id = ? AND user_id = ?', [assetId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes > 0 });
  });
});

// Restart Nodemon Server Trigger
// Launch server
app.listen(port, () => {
  console.log(`OcuCare Engine running at http://localhost:${port}`);
});

