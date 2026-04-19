import express from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { sub: string; username: string; role: string };
  }
}
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'shers_emergency_secret_2026';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function rid() {
  return crypto.randomBytes(12).toString('hex');
}

function ensureColumn(db: Database.Database, table: string, col: string, defSql: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${defSql}`);
  }
}

function migrateDb(db: Database.Database) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT,
      department TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_status (
      user_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'available',
      current_location TEXT,
      last_updated TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sensor_events (
      id TEXT PRIMARY KEY,
      sensor_type TEXT NOT NULL,
      location TEXT NOT NULL,
      value REAL,
      unit TEXT,
      alert_level TEXT DEFAULT 'normal',
      timestamp TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT,
      location TEXT,
      severity TEXT,
      status TEXT,
      detected_at TEXT,
      resolved_at TEXT,
      response_time_seconds INTEGER
    );
  `);

  ensureColumn(db, 'incidents', 'description', 'description TEXT');
  ensureColumn(db, 'incidents', 'assigned_to', 'assigned_to TEXT');
  ensureColumn(db, 'incidents', 'reported_by', 'reported_by TEXT');
  ensureColumn(db, 'incidents', 'resolution_notes', 'resolution_notes TEXT');
  ensureColumn(db, 'incidents', 'ai_narrative', 'ai_narrative TEXT');
  ensureColumn(db, 'incidents', 'narrative_generated_at', 'narrative_generated_at TEXT');

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender TEXT,
      content TEXT,
      msg_type TEXT,
      created_at TEXT
    );
  `);
  ensureColumn(db, 'messages', 'sender_id', 'sender_id TEXT');
  ensureColumn(db, 'messages', 'channel', "channel TEXT DEFAULT 'general'");

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user TEXT,
      action TEXT,
      details TEXT,
      timestamp TEXT
    );
  `);
  ensureColumn(db, 'audit_logs', 'incident_id', 'incident_id TEXT');
  ensureColumn(db, 'audit_logs', 'user_id', 'user_id TEXT');
  ensureColumn(db, 'users', 'is_active', 'is_active INTEGER DEFAULT 1');
}

/** Keeps built-in demo accounts working even if shers.db was created by an older build or seeded incorrectly. */
function ensureDemoUsers(db: Database.Database) {
  const demos = [
    { username: 'admin', password: 'admin123', role: 'admin', full_name: 'Admin User', department: 'Management' },
    { username: 'staff', password: 'staff123', role: 'staff', full_name: 'Staff Member', department: 'Front Desk' },
    { username: 'security', password: 'security123', role: 'security', full_name: 'Security Officer', department: 'Security' },
  ];

  const insUser = db.prepare(
    `INSERT INTO users (id, username, password_hash, role, full_name, department, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`
  );
  const insTeam = db.prepare(
    `INSERT OR IGNORE INTO team_status (user_id, status, current_location, last_updated) VALUES (?, 'available', 'Front Desk', datetime('now'))`
  );

  for (const u of demos) {
    const hash = bcrypt.hashSync(u.password, 10);
    const dupes = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').all(u.username) as { id: string }[];
    if (dupes.length > 1) {
      const keepId = dupes[0].id;
      for (const { id } of dupes.slice(1)) {
        db.prepare('DELETE FROM team_status WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
      }
    }
    const row = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(u.username) as { id: string } | undefined;
    if (row) {
      db.prepare(
        `UPDATE users SET username = ?, password_hash = ?, role = ?, full_name = ?, department = ?, is_active = 1 WHERE id = ?`
      ).run(u.username, hash, u.role, u.full_name, u.department, row.id);
      insTeam.run(row.id);
    } else {
      const id = crypto.randomUUID();
      insUser.run(id, u.username, hash, u.role, u.full_name, u.department);
      insTeam.run(id);
    }
  }
}

function mapIncident(row: any) {
  if (!row) return row;
  const title = row.title || row.type || 'Incident';
  return {
    ...row,
    title,
    type: title,
    created_at: row.detected_at || row.created_at,
  };
}

function insertAudit(
  db: Database.Database,
  opts: { user: string; action: string; details: string; incident_id?: string | null; user_id?: string | null }
) {
  db.prepare(
    `INSERT INTO audit_logs (id, user, action, details, timestamp, incident_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(rid(), opts.user, opts.action, opts.details, new Date().toISOString(), opts.incident_id ?? null, opts.user_id ?? null);
}

const HOTEL_LOCATIONS = [
  'Kitchen',
  'Lobby',
  'Pool Area',
  'Gym',
  'Parking Garage',
  'Boiler Room',
  'Conference Room',
  'Restaurant',
  'Rooftop',
];

const SENSOR_TYPES = [
  { type: 'smoke', unit: 'ppm', normal: [0, 5] as [number, number], warning: [5, 20] as [number, number], critical: [20, 100] as [number, number] },
  { type: 'co2', unit: 'ppm', normal: [400, 800], warning: [800, 1200], critical: [1200, 2000] },
  { type: 'gas_leak', unit: 'ppm', normal: [0, 10], warning: [10, 30], critical: [30, 100] },
  { type: 'temperature', unit: '°C', normal: [18, 28], warning: [28, 40], critical: [40, 80] },
  { type: 'motion', unit: 'count', normal: [0, 5], warning: [5, 15], critical: [15, 50] },
  { type: 'panic_button', unit: 'triggered', normal: [0, 0], warning: [0, 0], critical: [1, 1] },
];

const ESCALATION = [
  'fire',
  'smoke',
  'help me',
  'emergency',
  'injured',
  'unconscious',
  'bleeding',
  'attack',
  'gun',
  'bomb',
  'chest pain',
  'not breathing',
];

function stripJsonFence(s: string) {
  let t = s.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
  }
  return t.trim();
}

function isGeminiKeyError(err: unknown): boolean {
  const s = JSON.stringify(err);
  const m = err instanceof Error ? err.message : String(err);
  return s.includes('API_KEY_INVALID') || m.includes('API key not valid') || m.includes('API_KEY_INVALID');
}

async function runThreatAnalysis(db: Database.Database, ai: GoogleGenAI) {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const sensors = db
    .prepare(
      `SELECT * FROM sensor_events WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT 200`
    )
    .all(since) as any[];

  const incSince = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const incidents = db
    .prepare(`SELECT id, title, severity, location, status, detected_at FROM incidents WHERE detected_at >= ? ORDER BY detected_at DESC LIMIT 50`)
    .all(incSince) as any[];

  const hour = new Date().getHours();
  let timeContext = 'afternoon';
  if (hour >= 22 || hour < 6) timeContext = 'late night';
  else if (hour < 12) timeContext = 'morning';
  else if (hour < 17) timeContext = 'afternoon';
  else timeContext = 'evening';

  const locs = [...new Set(sensors.map((s) => s.location))].join(', ') || 'N/A';
  const sensorBlock = sensors
    .slice(0, 80)
    .map((s) => `${s.timestamp} | ${s.location} | ${s.sensor_type} | ${s.value} ${s.unit} | ${s.alert_level}`)
    .join('\n');

  const incBlock = incidents
    .map((i) => `${i.severity} | ${i.title} | ${i.location} | ${i.status}`)
    .join('\n');

  const prompt = `You are an AI safety analyst for a hotel emergency response system.

Current time: ${timeContext} (${new Date().toISOString()})
Analysis window: last 30 minutes

SENSOR READINGS (sample):
${sensorBlock}

RECENT INCIDENTS (last 6 hours):
${incBlock}

LOCATIONS TO ASSESS: ${locs}

Respond ONLY with valid JSON matching this shape (no markdown):
{"predictions":[{"location":"Kitchen","riskScore":72,"riskLevel":"high","primaryThreat":"text","reasoning":"text","confidence":78,"contributingFactors":["a","b"]}],"overallRiskLevel":"high","analysisTimestamp":"${new Date().toISOString()}","recommendedActions":["action"],"analysisWindowMinutes":30}

Rules: riskLevel is low|moderate|high|critical. Only include predictions with riskScore > 20. Empty predictions if all clear.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: 'Output JSON only. No prose.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predictions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                location: { type: Type.STRING },
                riskScore: { type: Type.NUMBER },
                riskLevel: { type: Type.STRING },
                primaryThreat: { type: Type.STRING },
                reasoning: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                contributingFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['location', 'riskScore', 'riskLevel', 'primaryThreat', 'reasoning', 'confidence', 'contributingFactors'],
            },
          },
          overallRiskLevel: { type: Type.STRING },
          analysisTimestamp: { type: Type.STRING },
          recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          analysisWindowMinutes: { type: Type.NUMBER },
        },
        required: ['predictions', 'overallRiskLevel', 'analysisTimestamp', 'recommendedActions', 'analysisWindowMinutes'],
      },
    },
  });

  const parsed = JSON.parse(stripJsonFence(response.text || '{}')) as any;
  return {
    predictions: parsed.predictions || [],
    overallRiskLevel: parsed.overallRiskLevel || 'low',
    analysisTimestamp: parsed.analysisTimestamp || new Date().toISOString(),
    recommendedActions: parsed.recommendedActions || [],
    analysisWindowMinutes: parsed.analysisWindowMinutes ?? 30,
  };
}

async function startServer() {
  const db = new Database('shers.db');
  migrateDb(db);
  ensureDemoUsers(db);

  const genaiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const ai = genaiKey.length > 0 ? new GoogleGenAI({ apiKey: genaiKey }) : null;

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json());

  const broadcast = (payload: object) => {
    const msg = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  };

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token');
    if (!token) {
      ws.close(1008, 'Unauthorized');
      return;
    }
    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'PING') ws.send(JSON.stringify({ type: 'PONG' }));
      } catch {
        /* ignore */
      }
    });
  });

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const tok = authHeader && authHeader.split(' ')[1];
    if (!tok) return res.sendStatus(401);
    try {
      req.user = jwt.verify(tok, JWT_SECRET) as any;
      next();
    } catch {
      return res.sendStatus(403);
    }
  };

  app.post('/api/auth/login', (req, res) => {
    const username = String((req.body as any)?.username ?? '').trim();
    const password = String((req.body as any)?.password ?? '');
    const row = db
      .prepare('SELECT * FROM users WHERE lower(username) = lower(?) AND COALESCE(is_active, 1) = 1')
      .get(username) as any;
    if (!row) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    let passwordOk = bcrypt.compareSync(password, row.password_hash);
    // Legacy demo: older SHERS stored bcrypt(sec123) — accept only if hash matches, then migrate to security123.
    if (!passwordOk && String(row.username).toLowerCase() === 'security' && password === 'sec123') {
      passwordOk = bcrypt.compareSync('sec123', row.password_hash);
      if (passwordOk) {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync('security123', 10), row.id);
      }
    }

    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ sub: row.id, username: row.username, role: row.role }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({
      access_token: token,
      token,
      role: row.role,
      user: {
        id: row.id,
        username: row.username,
        role: row.role,
        full_name: row.full_name,
        department: row.department,
      },
    });
  });

  app.get('/api/auth/me', authenticateToken, (req, res) => {
    const row = db.prepare('SELECT id, username, role, full_name, department, phone FROM users WHERE id = ?').get(req.user.sub) as any;
    if (!row) return res.sendStatus(404);
    res.json(row);
  });

  app.get('/api/incidents', authenticateToken, (req, res) => {
    const status = req.query.status as string | undefined;
    let sql = `
      SELECT i.*, u.full_name as assigned_to_name
      FROM incidents i
      LEFT JOIN users u ON u.id = i.assigned_to
    `;
    const params: any[] = [];
    if (status) {
      sql += ' WHERE i.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY i.detected_at DESC';
    const rows = db.prepare(sql).all(...params) as any[];
    res.json(rows.map(mapIncident));
  });

  app.post('/api/incidents', authenticateToken, (req, res) => {
    const body = req.body || {};
    const type = body.type || body.title || 'Incident';
    const { location, severity, description } = body;
    if (!location || !severity) {
      return res.status(400).json({ error: 'location and severity required' });
    }
    const id = crypto.randomUUID();
    const detected_at = new Date().toISOString();
    const reported_by = req.user.sub;

    db.prepare(
      `INSERT INTO incidents (id, title, location, severity, status, detected_at, description, reported_by)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`
    ).run(id, type, location, severity, detected_at, description || null, reported_by);

    insertAudit(db, {
      user: req.user.username,
      action: 'INCIDENT_CREATED',
      details: `Created ${type} at ${location}`,
      incident_id: id,
      user_id: req.user.sub,
    });

    const incident = mapIncident(db.prepare('SELECT * FROM incidents WHERE id = ?').get(id));
    broadcast({ type: 'INCIDENT_NEW', payload: incident });
    broadcast({ type: 'new_incident', incident });

    if (severity === 'critical' && process.env.TWILIO_ACCOUNT_SID) {
      console.log(`[Twilio SMS] Alert: ${type} at ${location}`);
    }

    res.json(incident);
  });

  app.patch('/api/incidents/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });

    const { status, assigned_to, resolution_notes } = req.body || {};
    if (status !== undefined) {
      if (status === 'resolved') {
        const resolved_at = new Date().toISOString();
        const diff = (new Date(resolved_at).getTime() - new Date(row.detected_at).getTime()) / 1000;
        db.prepare(
          `UPDATE incidents SET status = ?, resolved_at = ?, response_time_seconds = ?, resolution_notes = COALESCE(?, resolution_notes) WHERE id = ?`
        ).run('resolved', resolved_at, Math.floor(diff), resolution_notes ?? null, id);
      } else {
        db.prepare(`UPDATE incidents SET status = ?, assigned_to = COALESCE(?, assigned_to), resolution_notes = COALESCE(?, resolution_notes) WHERE id = ?`).run(
          status,
          assigned_to ?? null,
          resolution_notes ?? null,
          id
        );
      }
    } else {
      db.prepare(`UPDATE incidents SET assigned_to = COALESCE(?, assigned_to), resolution_notes = COALESCE(?, resolution_notes) WHERE id = ?`).run(
        assigned_to ?? null,
        resolution_notes ?? null,
        id
      );
    }

    insertAudit(db, {
      user: req.user.username,
      action: 'INCIDENT_UPDATED',
      details: JSON.stringify(req.body),
      incident_id: id,
      user_id: req.user.sub,
    });

    const incident = mapIncident(
      db
        .prepare(
          `SELECT i.*, u.full_name as assigned_to_name FROM incidents i LEFT JOIN users u ON u.id = i.assigned_to WHERE i.id = ?`
        )
        .get(id)
    );
    broadcast({ type: 'INCIDENT_UPDATED', payload: incident });
    if ((req.body || {}).status === 'resolved') {
      broadcast({ type: 'incident_resolved', incident_id: id });
    }
    res.json(incident);
  });

  app.patch('/api/incidents/:id/resolve', authenticateToken, (req, res) => {
    const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });
    const resolved_at = new Date().toISOString();
    const diff = (new Date(resolved_at).getTime() - new Date(row.detected_at).getTime()) / 1000;
    db.prepare(`UPDATE incidents SET status = ?, resolved_at = ?, response_time_seconds = ? WHERE id = ?`).run('resolved', resolved_at, Math.floor(diff), req.params.id);
    insertAudit(db, {
      user: req.user.username,
      action: 'INCIDENT_UPDATED',
      details: 'resolved via legacy endpoint',
      incident_id: req.params.id,
      user_id: req.user.sub,
    });
    broadcast({ type: 'INCIDENT_UPDATED', payload: mapIncident(db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id)) });
    broadcast({ type: 'incident_resolved', incident_id: req.params.id });
    res.json({ id: req.params.id, status: 'resolved' });
  });

  app.post('/api/incidents/:id/generate-narrative', authenticateToken, async (req, res) => {
    if (!ai || !genaiKey) return res.status(503).json({ error: 'Gemini not configured' });
    const { id } = req.params;
    const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
    if (!inc) return res.status(404).json({ error: 'Not found' });

    const audits = db
      .prepare(`SELECT * FROM audit_logs WHERE incident_id = ? OR details LIKE ? ORDER BY timestamp ASC`)
      .all(id, `%${id}%`) as any[];

    const sensors = db
      .prepare(
        `SELECT * FROM sensor_events WHERE datetime(timestamp) BETWEEN datetime(?, '-10 minutes') AND datetime(?, '+10 minutes')`
      )
      .all(inc.detected_at, inc.detected_at) as any[];

    const assigned = inc.assigned_to
      ? (db.prepare('SELECT full_name FROM users WHERE id = ?').get(inc.assigned_to) as any)?.full_name
      : '';

    let responseTimeMinutes = '';
    if (inc.resolved_at && inc.detected_at) {
      responseTimeMinutes = String(
        Math.round((new Date(inc.resolved_at).getTime() - new Date(inc.detected_at).getTime()) / 60000)
      );
    } else {
      responseTimeMinutes = 'N/A';
    }

    const prompt = `You are a professional hospitality safety officer writing an official incident report.

INCIDENT: ID ${inc.id}, Type: ${inc.title}, Severity: ${inc.severity}, Location: ${inc.location}
Description: ${inc.description || ''}
Reported: ${inc.detected_at} | Resolved: ${inc.resolved_at || 'Still open'}
Response time (minutes): ${responseTimeMinutes} | Assigned to: ${assigned}
Resolution notes: ${inc.resolution_notes || ''}

ACTIVITY LOG:
${audits.map((a) => `${a.timestamp} | ${a.action} | ${a.details}`).join('\n')}

SENSOR DATA (±10 min):
${sensors.map((s) => `${s.timestamp} | ${s.sensor_type} | ${s.location} | ${s.value} ${s.unit}`).join('\n')}

Write sections: ## Summary ## Timeline ## Root Cause Analysis ## Response Assessment ## Recommendations ## Compliance Notes
Be specific. Professional tone.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { systemInstruction: 'Write clear markdown. No JSON.' },
    });

    const narrative = response.text || '';
    const generated = new Date().toISOString();
    db.prepare(`UPDATE incidents SET ai_narrative = ?, narrative_generated_at = ? WHERE id = ?`).run(narrative, generated, id);
    insertAudit(db, {
      user: req.user.username,
      action: 'AI_NARRATIVE_GENERATED',
      details: `Narrative for ${id}`,
      incident_id: id,
      user_id: req.user.sub,
    });

    res.json({ narrative, generated_at: generated });
  });

  app.get('/api/incidents/:id/narrative', authenticateToken, (req, res) => {
    const row = db.prepare('SELECT ai_narrative, narrative_generated_at FROM incidents WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ narrative: row.ai_narrative, generated_at: row.narrative_generated_at });
  });

  app.get('/api/sensors/recent', authenticateToken, (req, res) => {
    const rows = db.prepare(`SELECT * FROM sensor_events ORDER BY timestamp DESC LIMIT 50`).all() as any[];
    res.json(rows);
  });

  app.get('/api/team', authenticateToken, (req, res) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.full_name, u.role, u.department, t.status, t.current_location, t.last_updated
         FROM users u
         LEFT JOIN team_status t ON t.user_id = u.id
         WHERE u.is_active = 1
         ORDER BY u.full_name`
      )
      .all() as any[];
    res.json(rows);
  });

  app.patch('/api/team/:userId/status', authenticateToken, (req, res) => {
    const { userId } = req.params;
    const { status, current_location } = req.body || {};
    if (!status) return res.status(400).json({ error: 'status required' });
    db.prepare(`UPDATE team_status SET status = ?, current_location = COALESCE(?, current_location), last_updated = datetime('now') WHERE user_id = ?`).run(
      status,
      current_location ?? null,
      userId
    );
    const payload = { userId, status, location: current_location };
    broadcast({ type: 'TEAM_STATUS_UPDATE', payload });
    res.json({ ok: true });
  });

  app.get('/api/messages', authenticateToken, (req, res) => {
    const channel = (req.query.channel as string) || 'general';
    const rows = db
      .prepare(
        `SELECT m.*, COALESCE(u.full_name, u.username, m.sender) as sender_name
         FROM messages m
         LEFT JOIN users u ON u.id = m.sender_id
         WHERE COALESCE(NULLIF(TRIM(m.channel), ''), 'general') = ?
         ORDER BY m.created_at DESC
         LIMIT 100`
      )
      .all(channel) as any[];
    res.json(rows);
  });

  app.post('/api/messages', authenticateToken, (req, res) => {
    const { content, channel, sender, msg_type } = req.body || {};
    if (!content) return res.status(400).json({ error: 'content required' });
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const ch = channel || 'general';
    const senderLabel = sender || req.user.username;
    db.prepare(`INSERT INTO messages (id, sender, content, msg_type, created_at, sender_id, channel) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id,
      senderLabel,
      content,
      msg_type || 'staff',
      created_at,
      req.user.sub,
      ch
    );
    const message = db
      .prepare(
        `SELECT m.*, COALESCE(u.full_name, u.username, m.sender) as sender_name
         FROM messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.id = ?`
      )
      .get(id) as any;
    broadcast({ type: 'NEW_MESSAGE', payload: message });
    broadcast({ type: 'new_message', message });
    res.json(message);
  });

  app.get('/api/analytics', authenticateToken, (req, res) => {
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const since14 = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const bySeverity = db
      .prepare(
        `SELECT severity, COUNT(*) as count FROM incidents WHERE detected_at >= ? GROUP BY severity`
      )
      .all(since30) as { severity: string; count: number }[];

    const byLocation = db
      .prepare(
        `SELECT location, COUNT(*) as count FROM incidents WHERE detected_at >= ? GROUP BY location ORDER BY count DESC LIMIT 6`
      )
      .all(since30) as { location: string; count: number }[];

    const byDay = db
      .prepare(
        `SELECT date(detected_at) as date, COUNT(*) as count FROM incidents WHERE detected_at >= ? GROUP BY date(detected_at) ORDER BY date ASC`
      )
      .all(since14) as { date: string; count: number }[];

    const byHourRaw = db
      .prepare(
        `SELECT CAST(strftime('%H', detected_at) AS INTEGER) as hour,
                CAST(strftime('%w', detected_at) AS INTEGER) as day,
                COUNT(*) as count
         FROM incidents WHERE detected_at >= ?
         GROUP BY hour, day`
      )
      .all(since30) as { hour: number; day: number; count: number }[];

    const resolved = db.prepare(`SELECT * FROM incidents WHERE status = 'resolved' AND resolved_at IS NOT NULL`).all() as any[];
    const avgResponseTimeMinutes =
      resolved.length === 0
        ? 0
        : Math.round(
            resolved.reduce((acc, i) => acc + (i.response_time_seconds || 0), 0) / resolved.length / 60
          );

    const resolvedToday = db
      .prepare(`SELECT COUNT(*) as c FROM incidents WHERE status = 'resolved' AND resolved_at >= ?`)
      .get(startToday.toISOString()) as { c: number };

    res.json({
      bySeverity: bySeverity.map((r) => ({ severity: r.severity, count: r.count })),
      byLocation,
      byDay,
      byHour: byHourRaw.map((r) => ({ hour: r.hour, day: r.day, count: r.count })),
      avgResponseTimeMinutes,
      resolvedToday: resolvedToday.c,
    });
  });

  app.get('/api/threat-intel/latest', authenticateToken, async (req, res) => {
    if (!ai) return res.status(503).json({ error: 'Gemini not configured' });
    try {
      const report = await runThreatAnalysis(db, ai);
      insertAudit(db, { user: 'System', action: 'THREAT_ANALYSIS', details: report.overallRiskLevel });
      res.json(report);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e?.message || 'threat analysis failed' });
    }
  });

  const guestChatHandler = async (req: express.Request, res: express.Response) => {
    if (!ai) return res.status(503).json({ error: 'Gemini not configured' });
    const { message, sessionId, history } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });

    const sys = `You are ARIA, the AI emergency assistant for Grand Hotel. You help guests report emergencies and get assistance.
Always be calm and professional. For life-threatening emergencies, immediately say you are alerting hotel staff.
Respond concisely in 2-3 sentences maximum.`;

    const parts: string[] = [];
    (history || []).slice(-8).forEach((h: any) => {
      parts.push(`${h.role}: ${h.content}`);
    });
    parts.push(`user: ${message}`);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: parts.join('\n'),
      config: { systemInstruction: sys },
    });
    const reply = response.text || '';

    const low = message.toLowerCase();
    const escalated = ESCALATION.some((k) => low.includes(k));
    let incidentId: string | undefined;

    if (escalated) {
      const id = crypto.randomUUID();
      const detected_at = new Date().toISOString();
      const desc = `Auto-escalated from AI chatbot: ${message}`;
      db.prepare(
        `INSERT INTO incidents (id, title, location, severity, status, detected_at, description) VALUES (?, 'Guest SOS', ?, 'urgent', 'active', ?, ?)`
      ).run(id, `Guest-reported (session: ${sessionId || 'unknown'})`, detected_at, desc);
      const incident = mapIncident(db.prepare('SELECT * FROM incidents WHERE id = ?').get(id));
      broadcast({ type: 'INCIDENT_NEW', payload: incident });
      broadcast({ type: 'new_incident', incident });
      incidentId = id;
    }

    res.json({ reply, escalated, incidentId });
  };

  app.post('/api/guest/chat', guestChatHandler);
  app.post('/api/guest-chat', guestChatHandler);

  app.get('/api/audit-log', authenticateToken, (req, res) => {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
    res.json(logs);
  });

  if (ai && genaiKey) {
    let threatInterval: ReturnType<typeof setInterval> | null = null;
    let warnedInvalidGeminiKey = false;

    const stopThreatLoop = () => {
      if (threatInterval) {
        clearInterval(threatInterval);
        threatInterval = null;
      }
    };

    const pushThreat = async () => {
      try {
        const report = await runThreatAnalysis(db, ai!);
        insertAudit(db, {
          user: 'System',
          action: 'THREAT_ANALYSIS',
          details: `${report.overallRiskLevel} | ${report.predictions?.length || 0} preds`,
        });
        broadcast({ type: 'THREAT_UPDATE', payload: report });
        if (report.overallRiskLevel === 'critical' && process.env.TWILIO_ACCOUNT_SID) {
          console.log('[Twilio] Critical threat intel — would notify admin');
        }
      } catch (e) {
        if (isGeminiKeyError(e)) {
          stopThreatLoop();
          if (!warnedInvalidGeminiKey) {
            warnedInvalidGeminiKey = true;
            console.warn(
              '[SHERS] GEMINI_API_KEY is missing, invalid, or rejected by Google (check .env — no quotes/spaces). Threat intel loop stopped. Login and sensors still work.'
            );
          }
          return;
        }
        console.error('Threat loop', e);
      }
    };

    setTimeout(() => {
      void pushThreat();
    }, 2000);
    threatInterval = setInterval(() => {
      void pushThreat();
    }, 60_000);
  }

  setInterval(() => {
    const count = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < count; i++) {
      const sensor = SENSOR_TYPES[Math.floor(Math.random() * SENSOR_TYPES.length)];
      const location = HOTEL_LOCATIONS[Math.floor(Math.random() * HOTEL_LOCATIONS.length)];
      const rand = Math.random();
      let range = sensor.normal;
      let alertLevel = 'normal';
      if (rand > 0.95) {
        range = sensor.critical;
        alertLevel = 'critical';
      } else if (rand > 0.85) {
        range = sensor.warning;
        alertLevel = 'warning';
      }
      const value = range[0] + Math.random() * (range[1] - range[0]);
      const event = {
        id: crypto.randomUUID(),
        sensor_type: sensor.type,
        location,
        value: parseFloat(value.toFixed(2)),
        unit: sensor.unit,
        alert_level: alertLevel,
        timestamp: new Date().toISOString(),
      };
      db.prepare(
        `INSERT INTO sensor_events (id, sensor_type, location, value, unit, alert_level, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(event.id, event.sensor_type, event.location, event.value, event.unit, event.alert_level, event.timestamp);
      broadcast({ type: 'SENSOR_UPDATE', payload: event });
      broadcast({
        type: 'sensor_alert',
        sensor: sensor.type,
        title: `${sensor.type.replace(/_/g, ' ').toUpperCase()} DETECTED`,
        location,
        severity: alertLevel === 'critical' ? 'critical' : alertLevel === 'warning' ? 'urgent' : 'info',
        confidence_pct: Math.floor(Math.random() * 30) + 70,
        time: event.timestamp,
      });

      if (alertLevel === 'critical' && sensor.type !== 'motion') {
        const incId = crypto.randomUUID();
        const type =
          sensor.type === 'smoke' ? 'Fire Alert' : sensor.type === 'gas_leak' ? 'Gas Leak' : 'Sensor Alert';
        const description = `Auto-detected: ${sensor.type} sensor reading ${event.value} ${sensor.unit} at ${location}`;
        db.prepare(
          `INSERT INTO incidents (id, title, location, severity, status, detected_at, description) VALUES (?, ?, ?, 'critical', 'active', datetime('now'), ?)`
        ).run(incId, type, location, description);
        const incident = mapIncident(db.prepare('SELECT * FROM incidents WHERE id = ?').get(incId));
        broadcast({ type: 'INCIDENT_NEW', payload: incident });
        broadcast({ type: 'new_incident', incident });
      }
    }

    if (Math.random() < 0.1) {
      const riskLocation = ['Kitchen', 'Boiler Room', 'Parking Garage'][Math.floor(Math.random() * 3)];
      const anomalyReadings = [
        { sensor_type: 'gas_leak', value: (Math.random() * 40 + 60).toFixed(1), unit: 'ppm', alert_level: 'critical' },
        { sensor_type: 'co2', value: (Math.random() * 500 + 900).toFixed(0), unit: 'ppm', alert_level: 'warning' },
      ];
      for (const r of anomalyReadings) {
        const eid = crypto.randomUUID();
        db.prepare(
          `INSERT INTO sensor_events (id, sensor_type, location, value, unit, alert_level, timestamp) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
        ).run(eid, r.sensor_type, riskLocation, parseFloat(String(r.value)), r.unit, r.alert_level);
      }
    }
  }, 25_000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      root: __dirname,
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} in use. Stop other SHERS dev server or: lsof -ti :${PORT} | xargs kill`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SHERS running http://localhost:${PORT}`);
  });
}

startServer();
