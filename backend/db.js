const { DatabaseSync } = require('node:sqlite');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'hangout.db');

function openDb() {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      username TEXT UNIQUE,
      profile_public INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TRIGGER IF NOT EXISTS profiles_age_check BEFORE INSERT ON profiles
    BEGIN
      SELECT CASE
        WHEN (julianday('now') - julianday(NEW.birth_date)) / 365.25 < 18
          THEN RAISE(ABORT, 'age must be 18-29')
        WHEN (julianday('now') - julianday(NEW.birth_date)) / 365.25 >= 30
          THEN RAISE(ABORT, 'age must be 18-29')
      END;
    END;
    CREATE TABLE IF NOT EXISTS gatherings (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL REFERENCES profiles(id),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_guests INTEGER NOT NULL DEFAULT 10,\n      challenge TEXT NOT NULL DEFAULT '',\n      mission_mode INTEGER NOT NULL DEFAULT 0,
      lat_exact REAL NOT NULL,
      lng_exact REAL NOT NULL,
      address TEXT NOT NULL,
      lat_fuzz REAL NOT NULL,
      lng_fuzz REAL NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'approval',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      cancelled_at TEXT
    );
    CREATE TABLE IF NOT EXISTS join_requests (
      id TEXT PRIMARY KEY,
      gathering_id TEXT NOT NULL REFERENCES gatherings(id),
      user_id TEXT NOT NULL REFERENCES profiles(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(gathering_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id),
      gathering_id TEXT REFERENCES gatherings(id),
      user_id TEXT NOT NULL REFERENCES profiles(id),
      body TEXT NOT NULL,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      blocker_id TEXT NOT NULL REFERENCES profiles(id),
      blocked_id TEXT NOT NULL REFERENCES profiles(id),
      UNIQUE(blocker_id, blocked_id)
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id),
      body TEXT,
      media_url TEXT,
      media_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS post_likes (
      post_id TEXT NOT NULL REFERENCES posts(id),
      user_id TEXT NOT NULL REFERENCES profiles(id),
      PRIMARY KEY (post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      data TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS host_follows (
      follower_id TEXT NOT NULL REFERENCES profiles(id),
      host_id TEXT NOT NULL REFERENCES profiles(id),
      PRIMARY KEY (follower_id, host_id)
    );
    CREATE TABLE IF NOT EXISTS push_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id),
      token TEXT NOT NULL,
      platform TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, token)
    );
    CREATE TABLE IF NOT EXISTS notification_prefs (
      new_gathering INTEGER NOT NULL DEFAULT 1,
      request_status INTEGER NOT NULL DEFAULT 1,
      approaching INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      gathering_id TEXT REFERENCES gatherings(id),
      title TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_message_at TEXT,
      last_message_preview TEXT,
      last_message_sender_id TEXT,
      read_only INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      user_id TEXT NOT NULL REFERENCES profiles(id),
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_read_at TEXT,
      muted_at TEXT,
      PRIMARY KEY (conversation_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES profiles(id),
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS share_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      ref TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const notifyCols = ['notify_new_gathering','notify_request_status','notify_approaching'];
  for (const c of notifyCols) {
    try { db.exec(`ALTER TABLE profiles ADD COLUMN ${c} INTEGER NOT NULL DEFAULT 1`); } catch (e) {}
  }
  for (const c of ['is_founding_host','is_admin']) {
    try { db.exec(`ALTER TABLE profiles ADD COLUMN ${c} INTEGER NOT NULL DEFAULT 0`); } catch (e) {}
  }
  try { db.exec(`UPDATE profiles SET notify_new_gathering=1 WHERE notify_new_gathering IS NULL OR notify_new_gathering=0`); } catch(e){}
  try { db.exec(`UPDATE profiles SET notify_request_status=1 WHERE notify_request_status IS NULL OR notify_request_status=0`); } catch(e){}
  try { db.exec(`UPDATE profiles SET notify_approaching=1 WHERE notify_approaching IS NULL OR notify_approaching=0`); } catch(e){}
  try { db.exec('ALTER TABLE profiles ADD COLUMN profile_public INTEGER NOT NULL DEFAULT 1'); } catch (e) {}
  try { db.exec('ALTER TABLE profiles ADD COLUMN username TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE profiles ADD COLUMN share_location INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
  db.exec(`CREATE TABLE IF NOT EXISTS live_locations (
    user_id TEXT PRIMARY KEY REFERENCES profiles(id),
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  // IRL Mode migrations and social proof.
  try { db.exec("ALTER TABLE gatherings ADD COLUMN challenge TEXT NOT NULL DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE gatherings ADD COLUMN mission_mode INTEGER NOT NULL DEFAULT 0"); } catch (e) {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS gathering_attendance (
      gathering_id TEXT NOT NULL REFERENCES gatherings(id),
      user_id TEXT NOT NULL REFERENCES profiles(id),
      confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (gathering_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS gathering_recaps (
      id TEXT PRIMARY KEY,
      gathering_id TEXT NOT NULL REFERENCES gatherings(id),
      creator_id TEXT NOT NULL REFERENCES profiles(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (gathering_id, creator_id)
    );
  `);
  // migration: messages columns
  for (const c of ['conversation_id','is_system']) {
    try { db.exec(`ALTER TABLE messages ADD COLUMN ${c} ${c==='is_system'?'INTEGER NOT NULL DEFAULT 0':'TEXT'}`); } catch (e) {}
  }
  // backfill conversations for existing gatherings
  try {
    const gs = db.prepare('SELECT id,title FROM gatherings').all();
    for (const g of gs) {
      const c = db.prepare('SELECT id FROM conversations WHERE gathering_id = ?').get(g.id);
      if (!c) {
        const cid = require('crypto').randomUUID();
        db.prepare('INSERT INTO conversations (id,type,gathering_id,title) VALUES (?,?,?,?)').run(cid, 'gathering', g.id, g.title);
        // add host as member
        const host = db.prepare('SELECT host_id FROM gatherings WHERE id = ?').get(g.id);
        if (host) {
          try { db.prepare('INSERT INTO conversation_members (conversation_id,user_id) VALUES (?,?)').run(cid, host.host_id); } catch(e){}
        }
        // backfill messages
        db.prepare('UPDATE messages SET conversation_id = ? WHERE gathering_id = ? AND conversation_id IS NULL').run(cid, g.id);
        // add approved guests
        const approved = db.prepare("SELECT user_id FROM join_requests WHERE gathering_id = ? AND status = 'approved'").all(g.id);
        for (const r of approved) {
          try { db.prepare('INSERT INTO conversation_members (conversation_id,user_id) VALUES (?,?)').run(cid, r.user_id); } catch(e){}
        }
      }
    }
  } catch (e) {}
  return db;
}

function uid() { return crypto.randomUUID(); }
const TOKEN_SECRET = process.env.TOKEN_SECRET || (process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(32).toString('hex'));
if (!TOKEN_SECRET) throw new Error('TOKEN_SECRET must be set in production');

function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(pw), salt, 64);
  return 'scrypt$' + salt.toString('hex') + '$' + derived.toString('hex');
}
function verifyPw(pw, stored) {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) {
    const [, saltHex, hashHex] = stored.split('$');
    if (!saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
  }
  const legacy = crypto.createHash('sha256').update(String(pw)).digest('hex');
  const actual = Buffer.from(legacy);
  const expected = Buffer.from(stored);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function tokenFor(userId) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: now, exp: now + 30 * 24 * 60 * 60 })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function verifyToken(tok) {
  const [payload, sig] = (tok || '').split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url'));
  const actual = Buffer.from(sig);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return decoded.uid && decoded.exp > Math.floor(Date.now() / 1000) ? decoded.uid : null;
  } catch { return null; }
}

// fuzz a coordinate to ~300m circle (0.0027 deg ~ 300m)
function fuzzCoord(v) { return Math.round((v + (Math.random() - 0.5) * 0.0054) * 100000) / 100000; }

function isApprovedMember(db, gatheringId, userId) {
  const g = db.prepare('SELECT host_id FROM gatherings WHERE id = ?').get(gatheringId);
  if (!g) return false;
  if (g.host_id === userId) return true;
  const r = db.prepare("SELECT status FROM join_requests WHERE gathering_id = ? AND user_id = ?").get(gatheringId, userId);
  return r && r.status === 'approved';
}

function publicGathering(row, requesterId, db) {
  const base = {
    id: row.id, host_id: row.host_id, title: row.title, category: row.category,
    description: row.description, start_time: row.start_time, end_time: row.end_time,
    challenge: row.challenge || '', mission_mode: !!row.mission_mode,
    max_guests: row.max_guests, visibility: row.visibility, created_at: row.created_at,
    cancelled_at: row.cancelled_at, lat: row.lat_fuzz, lng: row.lng_fuzz, address: null,
    exact: false,
  };
  if (requesterId && isApprovedMember(db, row.id, requesterId)) {
    base.lat = row.lat_exact; base.lng = row.lng_exact; base.address = row.address; base.exact = true;
  }
  return base;
}

module.exports = { openDb, uid, hashPw, verifyPw, tokenFor, verifyToken, fuzzCoord, isApprovedMember, publicGathering, DB_PATH };
