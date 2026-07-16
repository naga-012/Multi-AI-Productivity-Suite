import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper function to hash password
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function initDb() {
  db.serialize(() => {
    // 1. Create Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        clinic_name TEXT NOT NULL,
        license_id TEXT NOT NULL,
        profile_image TEXT,
        last_login TEXT,
        otp_code TEXT,
        otp_expires TEXT
      )
    `);

    // 2. Create Patients Table
    db.run(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        visual_acuity_od TEXT NOT NULL,
        visual_acuity_os TEXT NOT NULL,
        iop_od INTEGER,
        iop_os INTEGER,
        risk_tier TEXT NOT NULL,
        medical_history TEXT, -- JSON array of tags
        retinal_scan_path TEXT,
        last_visit TEXT,
        notes TEXT
      )
    `);

    // 3. Create Tasks Table
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Create Notes Table
    db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        clinician_name TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create Chat History Table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. User Analytics Table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_analytics (
        user_id INTEGER NOT NULL,
        tool_key TEXT NOT NULL,
        total_invocations INTEGER DEFAULT 0,
        last_used_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, tool_key)
      )
    `);

    // 7. Activity Logs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action_description TEXT NOT NULL,
        category_tag TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Saved Assets Table
    db.run(`
      CREATE TABLE IF NOT EXISTS saved_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        asset_title TEXT NOT NULL,
        tool_source TEXT NOT NULL,
        content_payload TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --- SEED DATA ---

    // Seed Clinician Users
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT INTO users (full_name, email, password_hash, role, clinic_name, license_id, profile_image)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          "Dr. Sarah Smith",
          "dr.smith@ocucare.com",
          hashPassword("Password123!"),
          "Chief Ophthalmologist",
          "OcuCare Eye Institute",
          "MD-998877",
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300"
        );

        stmt.run(
          "Dr. Alex Rivera",
          "dr.rivera@ocucare.com",
          hashPassword("Password123!"),
          "Resident Ophthalmologist",
          "OcuCare Eye Institute",
          "MD-112233",
          "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300"
        );

        stmt.finalize();
        console.log("Seeded default clinician users.");
      }
    });

    // Seed Patient Records
    db.get("SELECT COUNT(*) as count FROM patients", (err, row) => {
      if (row && row.count === 0) {
        const patientsList = [
          {
            name: "John Doe",
            age: 65,
            gender: "Male",
            email: "john.doe@gmail.com",
            phone: "+1 (555) 123-4567",
            visual_acuity_od: "20/50",
            visual_acuity_os: "20/30",
            iop_od: 18,
            iop_os: 17,
            risk_tier: "High",
            medical_history: JSON.stringify(["Type 2 Diabetes", "Hypertension", "Diabetic Retinopathy Suspect"]),
            retinal_scan_path: "/scans/john_doe.jpg",
            last_visit: "2026-06-15",
            notes: "Patient complains of gradual blurring in the right eye. Retinal scan shows microaneurysms. Needs close diabetic eye tracking."
          },
          {
            name: "Jane Smith",
            age: 72,
            gender: "Female",
            email: "jane.smith@yahoo.com",
            phone: "+1 (555) 234-5678",
            visual_acuity_od: "20/40",
            visual_acuity_os: "20/40",
            iop_od: 24,
            iop_os: 22,
            risk_tier: "High",
            medical_history: JSON.stringify(["Glaucoma Risk", "Ocular Hypertension"]),
            retinal_scan_path: null,
            last_visit: "2026-05-20",
            notes: "Elevated IOP bilaterally. Optic nerve head shows signs of mild cupping (C/D ratio 0.65). Initiated Latanoprost drops daily."
          },
          {
            name: "Robert Johnson",
            age: 58,
            gender: "Male",
            email: "rjohnson@hotmail.com",
            phone: "+1 (555) 345-6789",
            visual_acuity_od: "20/20",
            visual_acuity_os: "20/25",
            risk_tier: "Stable",
            iop_od: 15,
            iop_os: 14,
            medical_history: JSON.stringify(["Cataract Post-Op", "Presbyopia"]),
            retinal_scan_path: null,
            last_visit: "2026-07-01",
            notes: "1-month post-op check for phacoemulsification with IOL in OD. Healing well. Target visual acuity achieved."
          },
          {
            name: "Emily Davis",
            age: 45,
            gender: "Female",
            email: "emilydavis@outlook.com",
            phone: "+1 (555) 456-7890",
            visual_acuity_od: "20/30",
            visual_acuity_os: "20/30",
            iop_od: 16,
            iop_os: 16,
            risk_tier: "Medium",
            medical_history: JSON.stringify(["Dry Eye Syndrome", "Early Macular Degeneration (AMD)"]),
            retinal_scan_path: null,
            last_visit: "2026-04-12",
            notes: "Drusen spotted in macula during exam. Recommended AREDS2 vitamins and routine Amsler grid self-testing."
          },
          {
            name: "Michael Wilson",
            age: 69,
            gender: "Male",
            email: "mwilson69@gmail.com",
            phone: "+1 (555) 567-8901",
            visual_acuity_od: "20/80",
            visual_acuity_os: "20/70",
            iop_od: 19,
            iop_os: 18,
            risk_tier: "High",
            medical_history: JSON.stringify(["Advanced Dry AMD", "Cardiovascular Disease"]),
            retinal_scan_path: "/scans/michael_wilson.jpg",
            last_visit: "2026-06-25",
            notes: "Geographic atrophy extending into the central fovea. Progressive vision loss. Refer to low vision occupational therapy."
          },
          {
            name: "Linda Martinez",
            age: 51,
            gender: "Female",
            email: "linda.m@gmail.com",
            phone: "+1 (555) 678-9012",
            visual_acuity_od: "20/20",
            visual_acuity_os: "20/20",
            iop_od: 12,
            iop_os: 13,
            risk_tier: "Stable",
            medical_history: JSON.stringify(["Mild Dry Eyes"]),
            retinal_scan_path: null,
            last_visit: "2026-07-10",
            notes: "Using preservative-free artificial tears. Ocular surface intact. Discharge from regular close follow-ups; baseline annual review."
          },
          {
            name: "William Anderson",
            age: 77,
            gender: "Male",
            email: "wanderson@live.com",
            phone: "+1 (555) 789-0123",
            visual_acuity_od: "20/100",
            visual_acuity_os: "20/80",
            iop_od: 26,
            iop_os: 25,
            risk_tier: "High",
            medical_history: JSON.stringify(["Severe Open-Angle Glaucoma", "Type 2 Diabetes"]),
            retinal_scan_path: "/scans/william_anderson.jpg",
            last_visit: "2026-07-02",
            notes: "Progressive visual field narrowing. Schedule for Selective Laser Trabeculoplasty (SLT) to manage high pressure."
          },
          {
            name: "Elizabeth Taylor",
            age: 63,
            gender: "Female",
            email: "etaylor@me.com",
            phone: "+1 (555) 890-1234",
            visual_acuity_od: "20/25",
            visual_acuity_os: "20/25",
            iop_od: 14,
            iop_os: 15,
            risk_tier: "Medium",
            medical_history: JSON.stringify(["Diabetes Mellitus", "Hyperlipidemia"]),
            retinal_scan_path: null,
            last_visit: "2026-05-15",
            notes: "No signs of diabetic retinopathy. HbA1c is stable at 6.8%. Follow up in 6 months for retinal screen."
          },
          {
            name: "David Thomas",
            age: 70,
            gender: "Male",
            email: "dthomas@yahoo.com",
            phone: "+1 (555) 901-2345",
            visual_acuity_od: "20/20",
            visual_acuity_os: "20/20",
            iop_od: 15,
            iop_os: 15,
            risk_tier: "Stable",
            medical_history: JSON.stringify(["None"]),
            retinal_scan_path: null,
            last_visit: "2026-07-14",
            notes: "Healthy eyes. Retinal vasculature normal, macular structure well preserved. Return in 12-24 months."
          },
          {
            name: "Barbara Jackson",
            age: 80,
            gender: "Female",
            email: "barbara.jack@gmail.com",
            phone: "+1 (555) 012-3456",
            visual_acuity_od: "20/120",
            visual_acuity_os: "20/100",
            iop_od: 16,
            iop_os: 15,
            risk_tier: "High",
            medical_history: JSON.stringify(["Exudative Wet AMD", "Arthritis"]),
            retinal_scan_path: "/scans/barbara_jackson.jpg",
            last_visit: "2026-06-20",
            notes: "Choroidal neovascularization present. Scheduled for monthly anti-VEGF (Eylea) injections in the right eye."
          },
          {
            name: "Richard White",
            age: 54,
            gender: "Male",
            email: "rwhite54@gmail.com",
            phone: "+1 (555) 123-9999",
            visual_acuity_od: "20/30",
            visual_acuity_os: "20/30",
            iop_od: 21,
            iop_os: 20,
            risk_tier: "Medium",
            medical_history: JSON.stringify(["Suspicious Optic Discs", "Family History of Glaucoma"]),
            retinal_scan_path: null,
            last_visit: "2026-03-10",
            notes: "Optic nerve cup-to-disc ratio is borderline (0.6 OD, 0.55 OS). Visual fields and OCT scan scheduled to check nerve fiber layer."
          },
          {
            name: "Susan Harris",
            age: 67,
            gender: "Female",
            email: "sharris@gmail.com",
            phone: "+1 (555) 321-0987",
            visual_acuity_od: "20/30",
            visual_acuity_os: "20/30",
            iop_od: 15,
            iop_os: 16,
            risk_tier: "Stable",
            medical_history: JSON.stringify(["Cataract Mild", "Hypothyroidism"]),
            retinal_scan_path: null,
            last_visit: "2026-06-08",
            notes: "Nuclear sclerosis grade 1+ bilaterally. No immediate surgical intervention needed. Prescription adjusted."
          },
          {
            name: "Joseph Martin",
            age: 71,
            gender: "Male",
            email: "jmartin@yahoo.com",
            phone: "+1 (555) 987-6543",
            visual_acuity_od: "20/40",
            visual_acuity_os: "20/40",
            iop_od: 17,
            iop_os: 17,
            risk_tier: "Medium",
            medical_history: JSON.stringify(["Non-proliferative Diabetic Retinopathy (NPDR)", "Hypertension"]),
            retinal_scan_path: null,
            last_visit: "2026-05-18",
            notes: "Few dot-blot hemorrhages in posterior pole. Macula is clear. Control blood glucose strictly and review in 4 months."
          },
          {
            name: "Margaret Thompson",
            age: 74,
            gender: "Female",
            email: "mthompson@gmail.com",
            phone: "+1 (555) 765-4321",
            visual_acuity_od: "20/70",
            visual_acuity_os: "20/60",
            iop_od: 23,
            iop_os: 21,
            risk_tier: "High",
            medical_history: JSON.stringify(["Glaucoma Risk", "Early Dry AMD"]),
            retinal_scan_path: "/scans/margaret_thompson.jpg",
            last_visit: "2026-07-05",
            notes: "Co-existence of early macular changes and high intraocular pressures. Regular visual field profiling and drug adherence checked."
          },
          {
            name: "Charles Garcia",
            age: 62,
            gender: "Male",
            email: "cgarcia@gmail.com",
            phone: "+1 (555) 876-5432",
            visual_acuity_od: "20/20",
            visual_acuity_os: "20/20",
            iop_od: 14,
            iop_os: 14,
            risk_tier: "Stable",
            medical_history: JSON.stringify(["Presbyopia"]),
            retinal_scan_path: null,
            last_visit: "2026-07-15",
            notes: "Comprehensive refraction complete. Dispensed new progressive lenses. Fundus appearance normal."
          }
        ];

        const stmt = db.prepare(`
          INSERT INTO patients (name, age, gender, email, phone, visual_acuity_od, visual_acuity_os, iop_od, iop_os, risk_tier, medical_history, retinal_scan_path, last_visit, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        patientsList.forEach(p => {
          stmt.run(
            p.name,
            p.age,
            p.gender,
            p.email,
            p.phone,
            p.visual_acuity_od,
            p.visual_acuity_os,
            p.iop_od || null,
            p.iop_os || null,
            p.risk_tier,
            p.medical_history,
            p.retinal_scan_path,
            p.last_visit,
            p.notes
          );
        });

        stmt.finalize();
        console.log("Seeded 15 patient records.");
      }
    });

    // Seed Initial Tasks
    db.get("SELECT COUNT(*) as count FROM tasks", (err, row) => {
      if (row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT INTO tasks (patient_id, title, description, status, priority, due_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          1,
          "Verify diabetic retinopathy scan markers",
          "Review John Doe's fundus photography scans for microaneurysm expansions.",
          "pending",
          "high",
          "2026-07-20"
        );

        stmt.run(
          2,
          "Glaucoma IOP Check",
          "Measure Jane Smith's intraocular pressure post 2 weeks on Latanoprost.",
          "pending",
          "high",
          "2026-07-22"
        );

        stmt.run(
          7,
          "Schedule Selective Laser Trabeculoplasty",
          "Coordinate outpatient surgical booking for SLT in right eye for William Anderson.",
          "pending",
          "high",
          "2026-07-25"
        );

        stmt.run(
          10,
          "Deliver Anti-VEGF injection",
          "Perform scheduled Eylea injection in OD for Barbara Jackson.",
          "pending",
          "high",
          "2026-07-21"
        );

        stmt.run(
          4,
          "Refraction revision and Amsler check",
          "Examine Emily Davis's central visual field with Amsler grid template.",
          "completed",
          "medium",
          "2026-07-10"
        );

        stmt.finalize();
        console.log("Seeded baseline clinic workflow tasks.");
      }
    });

    // Seed Initial Notes
    db.get("SELECT COUNT(*) as count FROM notes", (err, row) => {
      if (row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT INTO notes (patient_id, clinician_name, text)
          VALUES (?, ?, ?)
        `);

        stmt.run(1, "Dr. Sarah Smith", "Informed patient of importance of strict glycemic control. Recommended low carb nutrition plans.");
        stmt.run(2, "Dr. Sarah Smith", "Instructed patient to apply Latanoprost drop exactly at bedtime in both eyes.");
        stmt.run(7, "Dr. Alex Rivera", "Discussed risks and benefits of SLT procedure. Informed consent forms signed.");

        stmt.finalize();
        console.log("Seeded baseline patient clinic history notes.");
      }
    });

    // Seed Telemetry Analytics
    db.get("SELECT COUNT(*) as count FROM user_analytics", (err, row) => {
      if (row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT INTO user_analytics (user_id, tool_key, total_invocations)
          VALUES (?, ?, ?)
        `);

        // Dr. Sarah Smith (ID 1)
        stmt.run(1, 'summarizer', 15);
        stmt.run(1, 'writer', 8);
        stmt.run(1, 'resumebuilder', 3);
        stmt.run(1, 'translator', 22);
        stmt.run(1, 'codeassistant', 12);
        stmt.run(1, 'dataanalyzer', 9);
        stmt.run(1, 'notesgenerator', 14);
        stmt.run(1, 'studyassistant', 18);

        // Dr. Alex Rivera (ID 2)
        stmt.run(2, 'summarizer', 4);
        stmt.run(2, 'translator', 6);

        stmt.finalize();
        console.log("Seeded baseline user tool analytics.");
      }
    });

    // Seed Activity Logs
    db.get("SELECT COUNT(*) as count FROM activity_logs", (err, row) => {
      if (row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT INTO activity_logs (user_id, action_description, category_tag)
          VALUES (?, ?, ?)
        `);

        stmt.run(1, "Translated timeline consult note to Telugu", "translator");
        stmt.run(1, "Analyzed spreadsheet patient screening CSV", "dataanalyzer");
        stmt.run(1, "Generated study assessment flashcards for OCT", "studyassistant");
        stmt.run(1, "Summarized medical publication PDF", "summarizer");
        stmt.run(1, "Troubleshot CORS exception for backend Node services", "codeassistant");

        stmt.finalize();
        console.log("Seeded baseline user activity logs.");
      }
    });

    // Seed Saved Assets
    db.get("SELECT COUNT(*) as count FROM saved_assets", (err, row) => {
      if (row && row.count === 0) {
        const stmt = db.prepare(`
          INSERT INTO saved_assets (user_id, asset_title, tool_source, content_payload)
          VALUES (?, ?, ?, ?)
        `);

        stmt.run(1, "Macular Degeneration Summary Report", "summarizer", "Executive Summary: Macular degeneration is a leading cause of vision loss... Action Items: Schedule anti-VEGF injection.");
        stmt.run(1, "Diabetic Retinopathy Patient Referral Email", "writer", "Dear Dr. Jones, I am referring patient John Doe for a retina consultation. His macular scan shows early signs of exudate... Sincerely, Dr. Sarah Smith.");
        stmt.run(1, "Ophthalmic Surgical Residency Cover Letter", "resumebuilder", "Dear Director, I am writing to express my enthusiastic interest in the Ophthalmology fellowship program... I have logged 500+ successful screening cases.");

        stmt.finalize();
        console.log("Seeded baseline user saved assets.");
      }
    });
  });
}

export default db;
