const express = require('express');
const cors = require('cors');
const { openDb, uid, hashPw, verifyPw, tokenFor, verifyToken, fuzzCoord, isApprovedMember, publicGathering } = require('./db');

const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});
// simple in-memory rate limit for message sends
async function sendPush(userIds, title, body, data) {
  try {
    const tokens = [];
    for (const uid2 of userIds) {
      const rows = db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(uid2);
      for (const r of rows) tokens.push(r.token);
    }
    if (!tokens.length) return;
    const messages = tokens.map((t) => ({ to: t, title, body, data: data || {}, sound: 'default' }));
    await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messages) });
  } catch (e) { console.error('push send failed', e.message); }
}
const msgRate = new Map();
const authAttempts = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
function limitAuth(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let attempt = authAttempts.get(key);
  if (!attempt || now - attempt.startedAt >= AUTH_WINDOW_MS) attempt = { startedAt: now, count: 0 };
  attempt.count += 1;
  authAttempts.set(key, attempt);
  if (authAttempts.size > 10000) {
    for (const [ip, entry] of authAttempts) if (now - entry.startedAt >= AUTH_WINDOW_MS) authAttempts.delete(ip);
  }
  if (attempt.count > 20) {
    res.setHeader('Retry-After', Math.ceil((attempt.startedAt + AUTH_WINDOW_MS - now) / 1000));
    return res.status(429).json({ error: 'too many authentication attempts' });
  }
  next();
}
function rateLimitMsg(userId) {
  const now = Date.now();
  const arr = (msgRate.get(userId) || []).filter((t) => now - t < 60000);
  if (arr.length >= 20) return false;
  arr.push(now);
  msgRate.set(userId, arr);
  return true;
}
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin(origin, callback) {
  const localDevOrigin = process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  callback(null, !origin || allowedOrigins.includes(origin) || localDevOrigin);
} }));
app.use(express.json({ limit: '15mb' }));

const db = openDb();
app.get('/health', (_req, res) => {
  try { db.prepare('SELECT 1').get(); res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});

function auth(req, res, next) {
  const tok = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const uid2 = verifyToken(tok);
  if (!uid2) return res.status(401).json({ error: 'unauthorized' });
  const prof = db.prepare('SELECT id,email,display_name,birth_date,bio,avatar_url,username,profile_public,share_location,is_admin,is_founding_host,created_at FROM profiles WHERE id = ?').get(uid2);
  if (!prof) return res.status(401).json({ error: 'unauthorized' });
  req.userId = uid2;
  req.profile = prof;
  next();
}

// ---- auth ----
app.post('/auth/signup', limitAuth, (req, res) => {
  const { email, password, display_name, birth_date, bio, avatar_url } = req.body || {};
  if (!email || !password || !display_name || !birth_date) return res.status(400).json({ error: 'missing fields' });
  if (typeof email !== 'string' || typeof password !== 'string' || typeof display_name !== 'string') return res.status(400).json({ error: 'invalid fields' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'password must be 8-128 characters' });
  if (display_name.trim().length < 1 || display_name.trim().length > 60) return res.status(400).json({ error: 'display name must be 1-60 characters' });
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ error: 'invalid email' });
  const birthDate = new Date(birth_date);
  if (Number.isNaN(birthDate.getTime())) return res.status(400).json({ error: 'invalid birth date' });
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 18 || age >= 30) return res.status(400).json({ error: 'age must be 18-29' });
  const id = uid();
  try {
    db.prepare('INSERT INTO profiles (id,email,password_hash,display_name,birth_date,bio,avatar_url) VALUES (?,?,?,?,?,?,?)')
      .run(id, normalizedEmail, hashPw(password), display_name.trim(), birthDate.toISOString().slice(0, 10), bio || '', avatar_url || '');
  } catch (e) {
    return res.status(400).json({ error: 'email taken or invalid' });
  }
  res.json({ token: tokenFor(id), user: { id, email, display_name } });
});

app.post('/auth/signin', limitAuth, (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) return res.status(401).json({ error: 'invalid credentials' });
  const normalizedEmail = email.trim().toLowerCase();
  const p = db.prepare('SELECT * FROM profiles WHERE email = ? OR lower(email) = ? ORDER BY CASE WHEN email = ? THEN 0 ELSE 1 END LIMIT 1').get(email.trim(), normalizedEmail, email.trim());
  if (!p || !verifyPw(password, p.password_hash)) return res.status(401).json({ error: 'invalid credentials' });
  if (!p.password_hash.startsWith('scrypt$')) db.prepare('UPDATE profiles SET password_hash = ? WHERE id = ?').run(hashPw(password), p.id);
  res.json({ token: tokenFor(p.id), user: { id: p.id, email: p.email, display_name: p.display_name } });
});

// ---- me / profiles ----
app.post('/me/push-token', auth, (req, res) => {
  const { token, platform } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  const id = uid('pt');
  db.prepare('INSERT OR IGNORE INTO push_tokens (id, user_id, token, platform) VALUES (?,?,?,?)').run(id, req.userId, token, platform || null);
  res.json({ ok: true });
});
app.delete('/me/push-token', auth, (req, res) => {
  const { token } = req.body || {};
  if (token) db.prepare('DELETE FROM push_tokens WHERE user_id = ? AND token = ?').run(req.userId, token);
  else db.prepare('DELETE FROM push_tokens WHERE user_id = ?').run(req.userId);
  res.json({ ok: true });
});
app.post('/me/location', auth, (req, res) => {
  const { lat, lng } = req.body || {};
  const p = db.prepare('SELECT share_location FROM profiles WHERE id = ?').get(req.userId);
  if (!p || !p.share_location) return res.status(403).json({ error: 'location sharing disabled' });
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat/lng required' });
  db.prepare('INSERT INTO live_locations (user_id, lat, lng, updated_at) VALUES (?,?,?,datetime(\'now\')) ON CONFLICT(user_id) DO UPDATE SET lat=excluded.lat, lng=excluded.lng, updated_at=datetime(\'now\')').run(req.userId, lat, lng);
  res.json({ ok: true });
});
app.get('/locations/shared', auth, (req, res) => {
  // locations of users who share_location=1, updated within last 10 minutes, excluding blocked users both ways
  const blocked = new Set(db.prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ?').all(req.userId).map(b => b.blocked_id));
  const blockedBy = new Set(db.prepare('SELECT blocker_id FROM blocks WHERE blocked_id = ?').all(req.userId).map(b => b.blocker_id));
  const rows = db.prepare(`SELECT ll.user_id, ll.lat, ll.lng, ll.updated_at, p.display_name, p.avatar_url
    FROM live_locations ll JOIN profiles p ON p.id = ll.user_id
    WHERE p.share_location = 1 AND ll.updated_at > datetime('now', '-10 minutes')`).all();
  const out = rows.filter(r => !blocked.has(r.user_id) && !blockedBy.has(r.user_id) && r.user_id !== req.userId)
    .map(r => ({ user_id: r.user_id, display_name: r.display_name, avatar_url: r.avatar_url, lat: r.lat, lng: r.lng, updated_at: r.updated_at }));
  res.json(out);
});
app.get('/me', auth, (req, res) => res.json(req.profile));
app.patch('/me', auth, (req, res) => {
  const { display_name, bio, avatar_url, username, profile_public, share_location } = req.body || {};
  db.prepare('UPDATE profiles SET display_name=COALESCE(?,display_name), bio=COALESCE(?,bio), avatar_url=COALESCE(?,avatar_url), username=COALESCE(?,username), profile_public=COALESCE(?,profile_public), share_location=COALESCE(?,share_location) WHERE id=?')
    .run(display_name ?? null, bio ?? null, avatar_url ?? null, username ?? null, profile_public == null ? null : (profile_public ? 1 : 0), share_location == null ? null : (share_location ? 1 : 0), req.userId);
  res.json(db.prepare('SELECT id,email,display_name,birth_date,bio,avatar_url,username,profile_public,share_location,is_admin,is_founding_host,created_at FROM profiles WHERE id = ?').get(req.userId));
});
app.get('/u/:id', auth, (req, res) => {
  const p = db.prepare('SELECT id,display_name,bio,avatar_url,created_at,is_founding_host,profile_public FROM profiles WHERE id = ?').get(req.params.id);
  if (!p || (!p.profile_public && req.params.id !== req.userId)) return res.status(404).json({ error: 'not found' });
  // gatherings hosted/attending
  const hosted = db.prepare('SELECT id,title,category,start_time FROM gatherings WHERE host_id = ? AND cancelled_at IS NULL').all(req.params.id);
  const attending = db.prepare(`SELECT g.id,g.title,g.category,g.start_time FROM gatherings g JOIN join_requests r ON r.gathering_id=g.id WHERE r.user_id=? AND r.status='approved'`).all(req.params.id);
  const { profile_public, ...publicProfile } = p;
  res.json({ ...publicProfile, hosted, attending });
});

// ---- gatherings ----
app.get('/gatherings', auth, (req, res) => {
  const { category, from, to } = req.query;
  let sql = 'SELECT * FROM gatherings WHERE cancelled_at IS NULL';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (from) { sql += ' AND start_time >= ?'; params.push(from); }
  if (to) { sql += ' AND start_time <= ?'; params.push(to); }
  const rows = db.prepare(sql).all(...params);
  const blocked = new Set(db.prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ?').all(req.userId).map(b => b.blocked_id));
  const blockedBy = new Set(db.prepare('SELECT blocker_id FROM blocks WHERE blocked_id = ?').all(req.userId).map(b => b.blocker_id));
  const out = rows.filter(r => !blocked.has(r.host_id) && !blockedBy.has(r.host_id)).map(r => {
    const g = publicGathering(r, req.userId, db);
    const approved = db.prepare("SELECT COUNT(*) c FROM join_requests WHERE gathering_id=? AND status='approved'").get(r.id).c;
    g.spots_left = Math.max(0, r.max_guests - approved);
    return g;
  });
  res.json(out);
});

app.get('/gatherings/:id', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM gatherings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const blocked = db.prepare('SELECT 1 FROM blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)').get(req.userId, row.host_id, row.host_id, req.userId);
  if (blocked) return res.status(404).json({ error: 'not found' });
  const out = publicGathering(row, req.userId, db);
  // spots left
  const approved = db.prepare("SELECT COUNT(*) c FROM join_requests WHERE gathering_id=? AND status='approved'").get(req.params.id).c;
  out.spots_left = Math.max(0, row.max_guests - approved);
  // requester's join request status
  const jr = db.prepare('SELECT status FROM join_requests WHERE gathering_id=? AND user_id=?').get(req.params.id, req.userId);
  out.my_request_status = jr ? jr.status : null;
  // host profile
  const host = db.prepare('SELECT id,display_name,bio,avatar_url,is_founding_host FROM profiles WHERE id=?').get(row.host_id);
  out.host = host || null;
  res.json(out);
});

app.post('/gatherings', auth, (req, res) => {
  const { title, category, description, start_time, end_time, max_guests, lat, lng, address, visibility } = req.body || {};
  if (!title || !category || !start_time || !end_time || lat == null || lng == null || !address) return res.status(400).json({ error: 'missing fields' });
  const id = uid();
  const latF = fuzzCoord(lat), lngF = fuzzCoord(lng);
  db.prepare('INSERT INTO gatherings (id,host_id,title,category,description,start_time,end_time,max_guests,lat_exact,lng_exact,address,lat_fuzz,lng_fuzz,visibility) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, req.userId, title, category, description || '', start_time, end_time, max_guests || 10, lat, lng, address, latF, lngF, visibility || 'approval');
  // create conversation + add host
  const cid = uid();
  db.prepare('INSERT INTO conversations (id,type,gathering_id,title) VALUES (?,?,?,?)').run(cid, 'gathering', id, title);
  db.prepare('INSERT INTO conversation_members (conversation_id,user_id) VALUES (?,?)').run(cid, req.userId);
  // notify followers ... (existing)
  const followers = db.prepare('SELECT follower_id FROM host_follows WHERE host_id = ?').all(req.userId);
  for (const f of followers) {
    const fp = db.prepare('SELECT notify_new_gathering FROM profiles WHERE id = ?').get(f.follower_id);
    if (fp && fp.notify_new_gathering) notify(f.follower_id, 'new_gathering', 'New hangout from a host you follow', title, { gathering_id: id });
  }
  res.status(201).json({ id });
});

app.patch('/gatherings/:id', auth, (req, res) => {
  const g = db.prepare('SELECT * FROM gatherings WHERE id = ?').get(req.params.id);
  if (!g || g.host_id !== req.userId) return res.status(403).json({ error: 'forbidden' });
  const { title, description, start_time, end_time, max_guests, cancelled } = req.body || {};
  db.prepare('UPDATE gatherings SET title=COALESCE(?,title), description=COALESCE(?,description), start_time=COALESCE(?,start_time), end_time=COALESCE(?,end_time), max_guests=COALESCE(?,max_guests), cancelled_at=COALESCE(?,cancelled_at) WHERE id=?')
    .run(title ?? null, description ?? null, start_time ?? null, end_time ?? null, max_guests ?? null, cancelled ? new Date().toISOString() : null, req.params.id);
  if (cancelled) {
    const conv = db.prepare('SELECT id FROM conversations WHERE gathering_id = ?').get(req.params.id);
    if (conv) {
      db.prepare('UPDATE conversations SET read_only=1, updated_at=? WHERE id=?').run(new Date().toISOString(), conv.id);
      const sysId = uid();
      db.prepare('INSERT INTO messages (id,conversation_id,gathering_id,user_id,body,is_system) VALUES (?,?,?,?,?,1)').run(sysId, conv.id, req.params.id, req.userId, 'The host cancelled this gathering.');
      db.prepare('UPDATE conversations SET last_message_at=?, last_message_preview=?, last_message_sender_id=?, updated_at=? WHERE id=?').run(new Date().toISOString(), 'The host cancelled this gathering.', req.userId, new Date().toISOString(), conv.id);
    }
  }
  res.json({ ok: true });
});

// ---- join requests ----
app.post('/gatherings/:id/requests', auth, (req, res) => {
  const g = db.prepare('SELECT * FROM gatherings WHERE id = ?').get(req.params.id);
  if (!g || g.cancelled_at) return res.status(404).json({ error: 'not found' });
  if (g.host_id === req.userId) return res.status(400).json({ error: 'host cannot request' });
  const id = uid();
  try {
    db.prepare('INSERT INTO join_requests (id,gathering_id,user_id) VALUES (?,?,?)').run(id, req.params.id, req.userId);
  } catch (e) { return res.status(400).json({ error: 'already requested' }); }
  res.status(201).json({ id, status: 'pending' });
});

app.get('/gatherings/:id/requests', auth, (req, res) => {
  const g = db.prepare('SELECT host_id FROM gatherings WHERE id = ?').get(req.params.id);
  if (!g || g.host_id !== req.userId) return res.status(403).json({ error: 'forbidden' });
  const rows = db.prepare(`SELECT r.*, p.display_name, p.avatar_url FROM join_requests r JOIN profiles p ON p.id=r.user_id WHERE r.gathering_id = ?`).all(req.params.id);
  res.json(rows);
});

app.patch('/gatherings/:id/requests/:rid', auth, (req, res) => {
  const g = db.prepare('SELECT host_id,max_guests FROM gatherings WHERE id = ?').get(req.params.id);
  if (!g || g.host_id !== req.userId) return res.status(403).json({ error: 'forbidden' });
  const { status } = req.body || {};
  if (!['approved', 'declined'].includes(status)) return res.status(400).json({ error: 'bad status' });
  if (status === 'approved') {
    const approved = db.prepare("SELECT COUNT(*) c FROM join_requests WHERE gathering_id=? AND status='approved'").get(req.params.id).c;
    if (approved >= g.max_guests) return res.status(400).json({ error: 'full' });
  }
  db.prepare('UPDATE join_requests SET status = ? WHERE id = ? AND gathering_id = ?').run(status, req.params.rid, req.params.id);
  const jr2 = db.prepare('SELECT user_id FROM join_requests WHERE id = ?').get(req.params.rid);
  // if approved, add to conversation + system message
  if (status === 'approved') {
    const conv = db.prepare('SELECT id FROM conversations WHERE gathering_id = ?').get(req.params.id);
    if (conv) {
      try { db.prepare('INSERT INTO conversation_members (conversation_id,user_id) VALUES (?,?)').run(conv.id, jr2.user_id); } catch (e) {}
      const sysId = uid();
      db.prepare('INSERT INTO messages (id,conversation_id,gathering_id,user_id,body,is_system) VALUES (?,?,?,?,?,1)').run(sysId, conv.id, req.params.id, req.userId, 'A participant was approved and joined the chat.');
      // update conversation last message
      db.prepare('UPDATE conversations SET last_message_at=?, last_message_preview=?, last_message_sender_id=?, updated_at=? WHERE id=?').run(new Date().toISOString(), 'A participant was approved and joined the chat.', req.userId, new Date().toISOString(), conv.id);
    }
  }
  if (jr2) {
    const gtitle = db.prepare('SELECT title FROM gatherings WHERE id = ?').get(req.params.id);
    notify(jr2.user_id, 'request_status', 'Join request ' + status, (gtitle ? gtitle.title : 'Gathering') + ' — your request was ' + status, { gathering_id: req.params.id, status });
  }
  res.json({ ok: true });
});

app.delete('/gatherings/:id/requests/:rid', auth, (req, res) => {
  const g = db.prepare('SELECT host_id FROM gatherings WHERE id = ?').get(req.params.id);
  if (!g || g.host_id !== req.userId) return res.status(403).json({ error: 'forbidden' });
  db.prepare('DELETE FROM join_requests WHERE id = ? AND gathering_id = ?').run(req.params.rid, req.params.id);
  res.json({ ok: true });
});
app.get('/gatherings/:id/messages', auth, (req, res) => {
  if (!isApprovedMember(db, req.params.id, req.userId)) return res.status(403).json({ error: 'forbidden' });
  const rows = db.prepare(`SELECT m.*, p.display_name FROM messages m JOIN profiles p ON p.id=m.user_id WHERE m.gathering_id = ? ORDER BY m.created_at`).all(req.params.id);
  res.json(rows);
});
app.post('/gatherings/:id/messages', auth, (req, res) => {
  if (!isApprovedMember(db, req.params.id, req.userId)) return res.status(403).json({ error: 'forbidden' });
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'missing body' });
  const id = uid();
  db.prepare('INSERT INTO messages (id,gathering_id,user_id,body) VALUES (?,?,?,?)').run(id, req.params.id, req.userId, body);
  res.status(201).json({ id });
});

// ---- safety ----
app.post('/blocks', auth, (req, res) => {
  const { user_id } = req.body || {};
  if (!user_id || user_id === req.userId) return res.status(400).json({ error: 'bad target' });
  const id = uid();
  try { db.prepare('INSERT INTO blocks (id,blocker_id,blocked_id) VALUES (?,?,?)').run(id, req.userId, user_id); } catch (e) {}
  res.json({ ok: true });
});
app.post('/reports', auth, (req, res) => {
  const { target_type, target_id, reason } = req.body || {};
  if (!target_type || !target_id || !reason) return res.status(400).json({ error: 'missing fields' });
  const id = uid();
  db.prepare('INSERT INTO reports (id,reporter_id,target_type,target_id,reason) VALUES (?,?,?,?,?)').run(id, req.userId, target_type, target_id, reason);
  res.status(201).json({ id });
});

// ---- my gatherings ----
app.get('/me/gatherings', auth, (req, res) => {
  const hosting = db.prepare('SELECT * FROM gatherings WHERE host_id = ? AND cancelled_at IS NULL').all(req.userId);
  const attending = db.prepare(`SELECT g.* FROM gatherings g JOIN join_requests r ON r.gathering_id=g.id WHERE r.user_id=? AND r.status='approved'`).all(req.userId);
  res.json({ hosting: hosting.map(g => publicGathering(g, req.userId, db)), attending: attending.map(g => publicGathering(g, req.userId, db)) });
});

// ---- feed ----
app.get('/feed', auth, (req, res) => {
  const blocked = new Set(db.prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ?').all(req.userId).map(b => b.blocked_id));
  const blockedBy = new Set(db.prepare('SELECT blocker_id FROM blocks WHERE blocked_id = ?').all(req.userId).map(b => b.blocker_id));
  const { user_id } = req.query;
  let sql = 'SELECT p.*, pr.display_name, pr.avatar_url FROM posts p JOIN profiles pr ON pr.id = p.user_id';
  const params = [];
  if (user_id) { sql += ' WHERE p.user_id = ?'; params.push(user_id); }
  sql += ' ORDER BY p.created_at DESC LIMIT 100';
  const rows = db.prepare(sql).all(...params);
  const out = rows.filter(r => !blocked.has(r.user_id) && !blockedBy.has(r.user_id)).map(r => {
    const likes = db.prepare('SELECT COUNT(*) c FROM post_likes WHERE post_id = ?').get(r.id).c;
    const liked = !!db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(r.id, req.userId);
    return { id: r.id, user_id: r.user_id, body: r.body, media_url: r.media_url, media_type: r.media_type, created_at: r.created_at, author: { id: r.user_id, display_name: r.display_name, avatar_url: r.avatar_url }, likes, liked };
  });
  res.json(out);
});

app.post('/feed', auth, (req, res) => {
  const { body, media_url, media_type } = req.body || {};
  if (!body && !media_url) return res.status(400).json({ error: 'empty post' });
  const id = uid();
  db.prepare('INSERT INTO posts (id,user_id,body,media_url,media_type) VALUES (?,?,?,?,?)').run(id, req.userId, body || '', media_url || null, media_type || null);
  res.status(201).json({ id });
});

app.delete('/feed/:id', auth, (req, res) => {
  const p = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  if (p.user_id !== req.userId) return res.status(403).json({ error: 'forbidden' });
  db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(req.params.id);
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/feed/:id/like', auth, (req, res) => {
  try { db.prepare('INSERT INTO post_likes (post_id,user_id) VALUES (?,?)').run(req.params.id, req.userId); } catch (e) {}
  const likes = db.prepare('SELECT COUNT(*) c FROM post_likes WHERE post_id = ?').get(req.params.id).c;
  res.json({ likes });
});

app.delete('/feed/:id/like', auth, (req, res) => {
  db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(req.params.id, req.userId);
  const likes = db.prepare('SELECT COUNT(*) c FROM post_likes WHERE post_id = ?').get(req.params.id).c;
  res.json({ likes });
});
// ---- notifications ----
function notify(userId, type, title, body, data) {
  if (!userId) return;
  const p = db.prepare('SELECT notify_new_gathering,notify_request_status,notify_approaching FROM profiles WHERE id=?').get(userId);
  if (!p) return;
  if (type === 'new_gathering' && !p.notify_new_gathering) return;
  if (type === 'request_status' && !p.notify_request_status) return;
  if (type === 'approaching' && !p.notify_approaching) return;
  db.prepare('INSERT INTO notifications (id,user_id,type,title,body,data) VALUES (?,?,?,?,?,?)').run(uid(), userId, type, title, body || null, data ? JSON.stringify(data) : null);
}

app.get('/notifications', auth, (req, res) => {
  // generate approaching notifications (idempotent-ish: skip if already exists in last 24h)
  const now = new Date();
  const in24 = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  const soon = db.prepare(`SELECT g.* FROM gatherings g JOIN join_requests r ON r.gathering_id=g.id WHERE r.user_id=? AND r.status='approved' AND g.cancelled_at IS NULL AND g.start_time >= ? AND g.start_time <= ?`).all(req.userId, now.toISOString(), in24);
  for (const g of soon) {
    const exists = db.prepare(`SELECT 1 FROM notifications WHERE user_id=? AND type='approaching' AND json_extract(data,'$.gathering_id')=? AND created_at >= ?`).get(req.userId, g.id, new Date(now.getTime() - 24*3600*1000).toISOString());
    if (!exists) notify(req.userId, 'approaching', 'Upcoming hangout', g.title + ' starts soon', { gathering_id: g.id });
  }
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.userId);
  res.json(rows.map(r => ({ ...r, data: r.data ? JSON.parse(r.data) : null })));
});

app.patch('/notifications/:id/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

app.post('/notifications/read-all', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.userId);
  res.json({ ok: true });
});

app.get('/me/notification-prefs', auth, (req, res) => {
  res.json({ new_gathering: !!req.profile.notify_new_gathering, request_status: !!req.profile.notify_request_status, approaching: !!req.profile.notify_approaching });
});

app.patch('/me/notification-prefs', auth, (req, res) => {
  const { new_gathering, request_status, approaching } = req.body || {};
  db.prepare('UPDATE profiles SET notify_new_gathering=COALESCE(?,notify_new_gathering), notify_request_status=COALESCE(?,notify_request_status), notify_approaching=COALESCE(?,notify_approaching) WHERE id=?')
    .run(new_gathering == null ? null : (new_gathering ? 1 : 0), request_status == null ? null : (request_status ? 1 : 0), approaching == null ? null : (approaching ? 1 : 0), req.userId);
  res.json({ new_gathering: !!db.prepare('SELECT notify_new_gathering FROM profiles WHERE id=?').get(req.userId).notify_new_gathering, request_status: !!db.prepare('SELECT notify_request_status FROM profiles WHERE id=?').get(req.userId).notify_request_status, approaching: !!db.prepare('SELECT notify_approaching FROM profiles WHERE id=?').get(req.userId).notify_approaching });
});

// ---- host follows ----
app.post('/hosts/:id/follow', auth, (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: 'cannot follow self' });
  try { db.prepare('INSERT INTO host_follows (follower_id,host_id) VALUES (?,?)').run(req.userId, req.params.id); } catch (e) {}
  res.json({ ok: true });
});
app.delete('/hosts/:id/follow', auth, (req, res) => {
  db.prepare('DELETE FROM host_follows WHERE follower_id=? AND host_id=?').run(req.userId, req.params.id);
  res.json({ ok: true });
});

// notify followers when a host creates a gathering (hook into POST /gatherings)
// We'll add after creating: handled below by patching? Instead wrap: add notification call in existing handler via monkey? We'll just add a second endpoint? 
// Simpler: modify POST /gatherings to notify followers. Done by editing handler separately.

// ---- admin (gated by is_admin) ----
function adminOnly(req, res, next) {
  if (!req.profile.is_admin) return res.status(403).json({ error: 'forbidden' });
  next();
}

app.get('/admin/gatherings', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM gatherings ORDER BY start_time DESC LIMIT 200').all();
  res.json(rows.map(r => publicGathering(r, req.userId, db)));
});
app.get('/admin/hosts/inactive', auth, adminOnly, (req, res) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const rows = db.prepare(`SELECT p.id,p.display_name,p.email,p.created_at, (SELECT COUNT(*) FROM gatherings g WHERE g.host_id=p.id AND g.created_at >= ?) c FROM profiles p`).all(cutoff);
  res.json(rows.filter(r => r.c === 0).map(r => ({ id: r.id, display_name: r.display_name, email: r.email, created_at: r.created_at })));
});
app.get('/admin/reports', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 200').all();
  res.json(rows);
});
app.get('/admin/cancellations', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM gatherings WHERE cancelled_at IS NOT NULL ORDER BY cancelled_at DESC LIMIT 200').all();
  res.json(rows.map(r => publicGathering(r, req.userId, db)));
});
app.patch('/admin/profiles/:id/founding-host', auth, adminOnly, (req, res) => {
  const { value } = req.body || {};
  db.prepare('UPDATE profiles SET is_founding_host = ? WHERE id = ?').run(value ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// ---- profile includes founding host + admin ----
// patch /u/:id response to include founding host
// (handled by editing /u/:id handler separately)

// ---- conversations (messages inbox) ----
function isMember(db, convId, userId) {
  return !!db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(convId, userId);
}

app.get('/conversations', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.* FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
  `).all(req.userId);
  const out = rows.map((c) => {
    const unread = db.prepare(`SELECT COUNT(*) c FROM messages m WHERE m.conversation_id = ? AND m.created_at > COALESCE((SELECT last_read_at FROM conversation_members WHERE conversation_id=? AND user_id=?), '1970-01-01') AND m.user_id != ?`).get(c.id, c.id, req.userId, req.userId).c;
    const memberCount = db.prepare('SELECT COUNT(*) c FROM conversation_members WHERE conversation_id = ?').get(c.id).c;
    let gathering = null;
    if (c.gathering_id) {
      const g = db.prepare('SELECT id,title,category,start_time,end_time,cancelled_at FROM gatherings WHERE id = ?').get(c.gathering_id);
      if (g) gathering = g;
    }
    const muted = !!db.prepare('SELECT muted_at FROM conversation_members WHERE conversation_id=? AND user_id=?').get(c.id, req.userId)?.muted_at;
    return {
      id: c.id, type: c.type, gathering_id: c.gathering_id, title: c.title,
      last_message_at: c.last_message_at, last_message_preview: c.last_message_preview,
      last_message_sender_id: c.last_message_sender_id, read_only: !!c.read_only,
      created_at: c.created_at, updated_at: c.updated_at,
      unread_count: unread, member_count: memberCount, muted,
      gathering,
    };
  });
  const { q } = req.query;
  let filtered = out;
  if (q) {
    const low = String(q).toLowerCase();
    filtered = out.filter((c) => (c.title || '').toLowerCase().includes(low) ||
      (c.last_message_preview || '').toLowerCase().includes(low) ||
      (c.gathering && (c.gathering.title || '').toLowerCase().includes(low)));
  }
  res.json(filtered);
});

app.get('/conversations/:id', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!c || !isMember(db, c.id, req.userId)) return res.status(404).json({ error: 'not found' });
  const memberCount = db.prepare('SELECT COUNT(*) c FROM conversation_members WHERE conversation_id = ?').get(c.id).c;
  const members = db.prepare(`SELECT cm.user_id, cm.joined_at, cm.muted_at, p.display_name, p.avatar_url, p.is_founding_host FROM conversation_members cm JOIN profiles p ON p.id = cm.user_id WHERE cm.conversation_id = ?`).all(c.id);
  let gathering = null;
  if (c.gathering_id) {
    const g = db.prepare('SELECT * FROM gatherings WHERE id = ?').get(c.gathering_id);
    if (g) {
      // hide address if not approved
      const approved = isApprovedMember(db, g.id, req.userId);
      gathering = {
        id: g.id, title: g.title, category: g.category, description: g.description,
        start_time: g.start_time, end_time: g.end_time, visibility: g.visibility,
        cancelled_at: g.cancelled_at, address: approved ? g.address : null,
        lat: approved ? g.lat_exact : g.lat_fuzz, lng: approved ? g.lng_exact : g.lng_fuzz, exact: approved,
      };
    }
  }
  const muted = !!db.prepare('SELECT muted_at FROM conversation_members WHERE conversation_id=? AND user_id=?').get(c.id, req.userId)?.muted_at;
  res.json({ ...c, read_only: !!c.read_only, member_count: memberCount, members, gathering, muted });
});

app.get('/conversations/:id/messages', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!c || !isMember(db, c.id, req.userId)) return res.status(404).json({ error: 'not found' });
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before;
  let sql = `SELECT m.*, p.display_name, p.avatar_url FROM messages m JOIN profiles p ON p.id = m.user_id WHERE m.conversation_id = ?`;
  const params = [c.id];
  if (before) { sql += ' AND m.created_at < ?'; params.push(before); }
  sql += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(limit);
  const rows = db.prepare(sql).all(...params);
  res.json(rows.reverse().map((m) => ({
    id: m.id, conversation_id: m.conversation_id, sender_id: m.user_id,
    body: m.body, is_system: !!m.is_system, created_at: m.created_at,
    sender: { id: m.user_id, display_name: m.display_name, avatar_url: m.avatar_url },
  })));
});

// direct messaging
app.post('/conversations/direct', auth, (req, res) => {
  const { otherUserId } = req.body || {};
  if (!otherUserId || otherUserId === req.userId) return res.status(400).json({ error: 'invalid user' });
  const other = db.prepare('SELECT id, display_name FROM profiles WHERE id = ?').get(otherUserId);
  if (!other) return res.status(404).json({ error: 'user not found' });
  // block check both directions
  const blocked = db.prepare('SELECT 1 FROM blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)').get(req.userId, otherUserId, otherUserId, req.userId);
  if (blocked) return res.status(403).json({ error: 'cannot message this user' });
  // find existing direct conversation
  const existing = db.prepare(`SELECT c.id FROM conversations c JOIN conversation_members cm1 ON cm1.conversation_id=c.id JOIN conversation_members cm2 ON cm2.conversation_id=c.id WHERE c.type='direct' AND cm1.user_id=? AND cm2.user_id=?`).get(req.userId, otherUserId);
  if (existing) return res.json({ id: existing.id });
  const cid = uid('conv');
  const title = other.display_name;
  db.prepare('INSERT INTO conversations (id, type, title) VALUES (?,?,?)').run(cid, 'direct', title);
  db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?,?)').run(cid, req.userId);
  db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?,?)').run(cid, otherUserId);
  res.status(201).json({ id: cid });
});

app.post('/conversations/:id/messages', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!c || !isMember(db, c.id, req.userId)) return res.status(404).json({ error: 'not found' });
  if (!rateLimitMsg(req.userId)) return res.status(429).json({ error: 'too many messages' });
  if (c.read_only) return res.status(403).json({ error: 'conversation is read-only' });
  const { body } = req.body || {};
  const trimmed = (body || '').trim();
  if (!trimmed) return res.status(400).json({ error: 'empty message' });
  if (trimmed.length > 2000) return res.status(400).json({ error: 'message too long' });
  // block check: if any member blocked the sender? For gathering chats, allow but safety via block/report separately.
  const id = uid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO messages (id,conversation_id,gathering_id,user_id,body,is_system) VALUES (?,?,?,?,?,0)').run(id, c.id, c.gathering_id, req.userId, trimmed);
  const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
  db.prepare('UPDATE conversations SET last_message_at=?, last_message_preview=?, last_message_sender_id=?, updated_at=? WHERE id=?').run(now, preview, req.userId, now, c.id);
  const others = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ? AND muted_at IS NULL').all(c.id, req.userId).map((r) => r.user_id);
  sendPush(others, c.title || 'New message', trimmed.slice(0, 80), { conversationId: c.id });
  res.status(201).json({ id, created_at: now });
});

app.patch('/conversations/:id/read', auth, (req, res) => {
  const c = db.prepare('SELECT id FROM conversations WHERE id = ?').get(req.params.id);
  if (!c || !isMember(db, c.id, req.userId)) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?').run(new Date().toISOString(), c.id, req.userId);
  res.json({ ok: true });
});

app.patch('/conversations/:id/mute', auth, (req, res) => {
  const c = db.prepare('SELECT id FROM conversations WHERE id = ?').get(req.params.id);
  if (!c || !isMember(db, c.id, req.userId)) return res.status(404).json({ error: 'not found' });
  const { muted } = req.body || {};
  db.prepare('UPDATE conversation_members SET muted_at = ? WHERE conversation_id = ? AND user_id = ?').run(muted ? new Date().toISOString() : null, c.id, req.userId);
  res.json({ ok: true });
});

app.get('/conversations/:id/members', auth, (req, res) => {
  const c = db.prepare('SELECT id FROM conversations WHERE id = ?').get(req.params.id);
  if (!c || !isMember(db, c.id, req.userId)) return res.status(404).json({ error: 'not found' });
  const members = db.prepare(`SELECT cm.user_id, cm.joined_at, cm.muted_at, p.display_name, p.avatar_url, p.is_founding_host FROM conversation_members cm JOIN profiles p ON p.id = cm.user_id WHERE cm.conversation_id = ?`).all(c.id);
  res.json(members);
});

// keep legacy gathering messages endpoints working (delegate to conversation)
app.get('/gatherings/:id/messages', auth, (req, res) => {
  const g = db.prepare('SELECT id FROM gatherings WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'not found' });
  if (!isApprovedMember(db, req.params.id, req.userId)) return res.status(403).json({ error: 'forbidden' });
  const conv = db.prepare('SELECT id FROM conversations WHERE gathering_id = ?').get(req.params.id);
  if (!conv) return res.json([]);
  const rows = db.prepare(`SELECT m.*, p.display_name, p.avatar_url FROM messages m JOIN profiles p ON p.id = m.user_id WHERE m.conversation_id = ? ORDER BY m.created_at`).all(conv.id);
  res.json(rows.map((m) => ({ id: m.id, conversation_id: m.conversation_id, gathering_id: m.gathering_id, user_id: m.user_id, body: m.body, is_system: !!m.is_system, created_at: m.created_at, display_name: m.display_name, avatar_url: m.avatar_url })));
});

app.post('/gatherings/:id/messages', auth, (req, res) => {
  const g = db.prepare('SELECT id FROM gatherings WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'not found' });
  if (!isApprovedMember(db, req.params.id, req.userId)) return res.status(403).json({ error: 'forbidden' });
  const conv = db.prepare('SELECT id, read_only FROM conversations WHERE gathering_id = ?').get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'no conversation' });
  if (conv.read_only) return res.status(403).json({ error: 'conversation is read-only' });
  const { body } = req.body || {};
  const trimmed = (body || '').trim();
  if (!trimmed) return res.status(400).json({ error: 'missing body' });
  if (trimmed.length > 2000) return res.status(400).json({ error: 'message too long' });
  const id = uid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO messages (id,conversation_id,gathering_id,user_id,body) VALUES (?,?,?,?,?)').run(id, conv.id, req.params.id, req.userId, trimmed);
  const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
  db.prepare('UPDATE conversations SET last_message_at=?, last_message_preview=?, last_message_sender_id=?, updated_at=? WHERE id=?').run(now, preview, req.userId, now, conv.id);
  res.status(201).json({ id });
});

// ---- public share / landing pages ----
app.get('/public/g/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM gatherings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.cancelled_at) return res.json({ ...publicGathering(row, null, db), status: 'cancelled' });
  const now = new Date();
  const status = new Date(row.start_time) > now ? 'upcoming' : (new Date(row.end_time) > now ? 'live' : 'ended');
  const host = db.prepare('SELECT id,display_name,avatar_url,bio,username,profile_public FROM profiles WHERE id = ?').get(row.host_id);
  const approved = db.prepare("SELECT COUNT(*) c FROM join_requests WHERE gathering_id=? AND status='approved'").get(row.id).c;
  res.json({
    ...publicGathering(row, null, db),
    status,
    spots_left: Math.max(0, row.max_guests - approved),
    host: host && host.profile_public ? { id: host.id, display_name: host.display_name, avatar_url: host.avatar_url, bio: host.bio, username: host.username } : { id: host.id, display_name: host.display_name, avatar_url: host.avatar_url },
  });
});

app.get('/public/u/:id', (req, res) => {
  // accept id or username
  let p = db.prepare('SELECT id,display_name,bio,avatar_url,username,profile_public,is_founding_host,created_at FROM profiles WHERE id = ? OR username = ?').get(req.params.id, req.params.id);
  if (!p || !p.profile_public) return res.status(404).json({ error: 'not found' });
  const hosted = db.prepare('SELECT id,title,category,start_time,end_time,cancelled_at FROM gatherings WHERE host_id = ? AND cancelled_at IS NULL').all(p.id);
  const now = new Date().toISOString();
  const upcoming = hosted.filter((g) => g.start_time >= now);
  res.json({ profile: p, upcoming_gatherings: upcoming.map((g) => ({ id: g.id, title: g.title, category: g.category, start_time: g.start_time, end_time: g.end_time })) });
});

app.post('/analytics/share', (req, res) => {
  const { type, target_type, target_id, ref } = req.body || {};
  if (!type || !target_type || !target_id) return res.status(400).json({ error: 'missing fields' });
  db.prepare('INSERT INTO share_events (id,type,target_type,target_id,ref) VALUES (?,?,?,?,?)').run(uid(), type, target_type, target_id, ref || null);
  res.json({ ok: true });
});

function escHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

app.get('/share/g/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM gatherings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).send('Not found');
  const host = db.prepare('SELECT display_name FROM profiles WHERE id = ?').get(row.host_id);
  const approved = db.prepare("SELECT COUNT(*) c FROM join_requests WHERE gathering_id=? AND status='approved'").get(row.id).c;
  const status = row.cancelled_at ? 'Cancelled' : (new Date(row.start_time) > new Date() ? 'Upcoming' : (new Date(row.end_time) > new Date() ? 'Live' : 'Ended'));
  const title = escHtml(row.title);
  const desc = escHtml(row.description || '');
  const hostName = escHtml(host ? host.display_name : 'Host');
  const time = escHtml(new Date(row.start_time).toLocaleString());
  const deepLink = `hangout://g/${row.id}`;
  const appStore = 'https://apps.apple.com/app/hangout-map/id0000000000'; // placeholder
  const playStore = 'https://play.google.com/store/apps/details?id=com.hangout.map';
  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Hangout</title>
<meta property="og:title" content="${title} — Hangout">
<meta property="og:description" content="${desc || 'Join this hangout on Hangout'}">
<meta property="og:type" content="website">
<meta property="og:image" content="/share/card/g/${row.id}.svg">
<meta name="twitter:card" content="summary_large_image">
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#080B12;color:#F5F7FA;padding:24px}
.card{max-width:480px;margin:0 auto;background:#111722;border:1px solid #1F2937;border-radius:16px;padding:24px}
h1{color:#C8FF36;margin:0 0 8px} .meta{color:#9AA4B2;font-size:14px;margin:4px 0}
.btn{display:block;text-align:center;background:#C8FF36;color:#080B12;font-weight:700;padding:14px;border-radius:12px;text-decoration:none;margin-top:16px}
.btn2{display:block;text-align:center;background:transparent;color:#F5F7FA;border:1px solid #1F2937;padding:12px;border-radius:12px;text-decoration:none;margin-top:8px}
.status{display:inline-block;padding:4px 10px;border-radius:999px;background:#1F2937;color:#C8FF36;font-size:12px;font-weight:600;margin-bottom:12px}
</style></head><body>
<div class="card">
<span class="status">${status}</span>
<h1>${title}</h1>
<p class="meta">${desc}</p>
<p class="meta">Hosted by ${hostName}</p>
<p class="meta">🕐 ${time}</p>
<p class="meta">Category: ${escHtml(row.category)} · Spots left: ${Math.max(0, row.max_guests - approved)}/${row.max_guests}</p>
${row.cancelled_at ? '<p style="color:#ff6b6b">This gathering has been cancelled.</p>' : (status === 'Ended' ? '<p style="color:#9AA4B2">This gathering has ended.</p>' : `<a class="btn" href="${deepLink}">Request to Join in App</a>`)}
<a class="btn2" href="${playStore}">Get Hangout on Android</a>
<a class="btn2" href="${appStore}">Get Hangout on iOS</a>
</div>
<script>
// attempt deep link
setTimeout(()=>{ window.location.href = '${deepLink}'; }, 200);
</script>
</body></html>`;
  res.type('html').send(html);
});

app.get('/share/u/:id', (req, res) => {
  const p = db.prepare('SELECT id,display_name,bio,avatar_url,username,profile_public,is_founding_host FROM profiles WHERE id = ? OR username = ?').get(req.params.id, req.params.id);
  if (!p || !p.profile_public) return res.status(404).send('Not found');
  const hosted = db.prepare('SELECT id,title,category,start_time FROM gatherings WHERE host_id = ? AND cancelled_at IS NULL').all(p.id);
  const now = new Date().toISOString();
  const upcoming = hosted.filter((g) => g.start_time >= now);
  const name = escHtml(p.display_name);
  const bio = escHtml(p.bio || '');
  const deepLink = `hangout://u/${p.id}`;
  const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} on Hangout</title>
<meta property="og:title" content="${name} on Hangout">
<meta property="og:description" content="${bio || 'Join Hangout'}">
<meta property="og:type" content="profile">
<meta property="og:image" content="/share/card/u/${p.id}.svg">
<style>body{margin:0;font-family:-apple-system,sans-serif;background:#080B12;color:#F5F7FA;padding:24px}
.card{max-width:480px;margin:0 auto;background:#111722;border:1px solid #1F2937;border-radius:16px;padding:24px;text-align:center}
h1{color:#C8FF36;margin:0 0 8px} .meta{color:#9AA4B2;font-size:14px}
.btn{display:block;text-align:center;background:#C8FF36;color:#080B12;font-weight:700;padding:14px;border-radius:12px;text-decoration:none;margin-top:16px}
.item{background:#171F2C;padding:12px;border-radius:10px;margin-top:8px;text-align:left}
</style></head><body>
<div class="card">
<h1>${name}</h1>
<p class="meta">${bio}</p>
${p.is_founding_host ? '<p style="color:#C8FF36;font-size:12px">✦ Founding host</p>' : ''}
<h3 style="color:#F5F7FA;margin-top:16px">Upcoming hangouts</h3>
${upcoming.length ? upcoming.map((g) => `<div class="item"><a href="/share/g/${g.id}" style="color:#F5F7FA;text-decoration:none">${escHtml(g.title)}</a><div class="meta">${escHtml(g.category)} · ${new Date(g.start_time).toLocaleString()}</div></div>`).join('') : '<p class="meta">No upcoming hangouts.</p>'}
<a class="btn" href="hangout://signup?ref=${p.id}">Join Hangout</a>
</div></body></html>`;
  res.type('html').send(html);
});

// share card SVG
app.get('/share/card/g/:id.svg', (req, res) => {
  const row = db.prepare('SELECT * FROM gatherings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).send('');
  const host = db.prepare('SELECT display_name FROM profiles WHERE id = ?').get(row.host_id);
  const title = escHtml(row.title);
  const cat = escHtml(row.category);
  const hostName = escHtml(host ? host.display_name : 'Host');
  const time = escHtml(new Date(row.start_time).toLocaleString());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
<rect width="1080" height="1920" fill="#080B12"/>
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111722"/><stop offset="1" stop-color="#080B12"/></linearGradient></defs>
<rect width="1080" height="1920" fill="url(#g)"/>
<circle cx="540" cy="300" r="200" fill="#C8FF36" opacity="0.08"/>
<text x="540" y="260" text-anchor="middle" font-family="system-ui" font-size="48" fill="#C8FF36" font-weight="800">HANGOUT</text>
<text x="540" y="420" text-anchor="middle" font-family="system-ui" font-size="72" fill="#F5F7FA" font-weight="900">${title}</text>
<text x="540" y="520" text-anchor="middle" font-family="system-ui" font-size="40" fill="#C8FF36">${cat}</text>
<text x="540" y="620" text-anchor="middle" font-family="system-ui" font-size="36" fill="#9AA4B2">Hosted by ${hostName}</text>
<text x="540" y="700" text-anchor="middle" font-family="system-ui" font-size="32" fill="#9AA4B2">${time}</text>
<rect x="240" y="1600" width="600" height="80" rx="40" fill="#C8FF36"/>
<text x="540" y="1650" text-anchor="middle" font-family="system-ui" font-size="36" fill="#080B12" font-weight="800">Join on Hangout</text>
</svg>`;
  res.type('image/svg+xml').send(svg);
});

app.get('/share/card/u/:id.svg', (req, res) => {
  const p = db.prepare('SELECT display_name FROM profiles WHERE id = ? OR username = ?').get(req.params.id, req.params.id);
  const name = escHtml(p ? p.display_name : 'User');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
<rect width="1080" height="1920" fill="#080B12"/>
<text x="540" y="900" text-anchor="middle" font-family="system-ui" font-size="72" fill="#F5F7FA" font-weight="900">${name}</text>
<text x="540" y="1000" text-anchor="middle" font-family="system-ui" font-size="40" fill="#C8FF36">on Hangout</text>
<rect x="240" y="1600" width="600" height="80" rx="40" fill="#C8FF36"/>
<text x="540" y="1650" text-anchor="middle" font-family="system-ui" font-size="36" fill="#080B12" font-weight="800">Join Hangout</text>
</svg>`;
  res.type('image/svg+xml').send(svg);
});

const PORT = process.env.PORT || 4000;
app.get('/gatherings/:id/conversation', auth, (req, res) => {
  if (!isApprovedMember(db, req.params.id, req.userId)) return res.status(403).json({ error: 'forbidden' });
  const conv = db.prepare('SELECT id FROM conversations WHERE gathering_id = ?').get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'not found' });
  res.json(conv);
});
if (require.main === module) app.listen(PORT, () => console.log('Hangout API on :' + PORT));
module.exports = { app, db };
