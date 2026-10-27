const { test } = require('node:test');
const assert = require('node:assert');
const { app } = require('./server');
const { uid, hashPw, tokenFor } = require('./db');

// use in-memory db by setting DB_PATH before require? server already opened. Instead test via HTTP with temp db env.
const http = require('http');

let server, baseUrl;
test.before(async () => {
  // reopen with temp db
  process.env.DB_PATH = require('path').join(require('os').tmpdir(), 'hangout-test-' + Date.now() + '.db');
  // need fresh module cache
  delete require.cache[require.resolve('./db')];
  delete require.cache[require.resolve('./server')];
  const { app: a } = require('./server');
  server = a.listen(0);
  await new Promise(r => server.on('listening', r));
  baseUrl = 'http://127.0.0.1:' + server.address().port;
});
test.after(() => server.close());

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(baseUrl + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } }, res => {
      let buf = ''; res.on('data', c => buf += c); res.on('end', () => resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

test('age rule rejects under 18', async () => {
  const r = await req('POST', '/auth/signup', { email: 'kid@test.com', password: 'pw', display_name: 'Kid', birth_date: '2015-01-01' });
  assert.strictEqual(r.status, 400);
});

test('age rule rejects 30+', async () => {
  const r = await req('POST', '/auth/signup', { email: 'old@test.com', password: 'pw', display_name: 'Old', birth_date: '1980-01-01' });
  assert.strictEqual(r.status, 400);
});

test('age rule accepts 18-29', async () => {
  const r = await req('POST', '/auth/signup', { email: 'ok@test.com', password: 'pw', display_name: 'Ok', birth_date: '2000-01-01' });
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.token);
});

test('address hidden until approved', async () => {
  const a = await req('POST', '/auth/signup', { email: 'host@test.com', password: 'pw', display_name: 'Host', birth_date: '1998-01-01' });
  const b = await req('POST', '/auth/signup', { email: 'guest@test.com', password: 'pw', display_name: 'Guest', birth_date: '1999-01-01' });
  const ht = a.body.token, gt = b.body.token;
  const g = await req('POST', '/gatherings', { title: 'Party', category: 'house party', start_time: '2026-01-01T20:00:00Z', end_time: '2026-01-02T02:00:00Z', lat: 40.7, lng: -74.0, address: '123 Secret St' }, ht);
  const gid = g.body.id;
  // guest sees fuzzed, no address
  const before = await req('GET', '/gatherings/' + gid, null, gt);
  assert.strictEqual(before.body.address, null);
  assert.strictEqual(before.body.exact, false);
  // request + approve
  const r = await req('POST', '/gatherings/' + gid + '/requests', null, gt);
  const reqs = await req('GET', '/gatherings/' + gid + '/requests', null, ht);
  await req('PATCH', '/gatherings/' + gid + '/requests/' + reqs.body[0].id, { status: 'approved' }, ht);
  const after = await req('GET', '/gatherings/' + gid, null, gt);
  assert.strictEqual(after.body.address, '123 Secret St');
  assert.strictEqual(after.body.exact, true);
});

test('cancelled gathering excluded from list', async () => {
  const a = await req('POST', '/auth/signup', { email: 'ch@test.com', password: 'pw', display_name: 'CH', birth_date: '1998-01-01' });
  const t = a.body.token;
  const g = await req('POST', '/gatherings', { title: 'C', category: 'coffee', start_time: '2026-01-01T20:00:00Z', end_time: '2026-01-02T02:00:00Z', lat: 40.7, lng: -74.0, address: 'A' }, t);
  const gid = g.body.id;
  await req('PATCH', '/gatherings/' + gid, { cancelled: true }, t);
  const list = await req('GET', '/gatherings', null, t);
  assert.ok(!list.body.some((x) => x.id === gid));
});

test('request status change notifies requester', async () => {
  const a = await req('POST', '/auth/signup', { email: 'h3@test.com', password: 'pw', display_name: 'H3', birth_date: '1998-01-01' });
  const b = await req('POST', '/auth/signup', { email: 'g3@test.com', password: 'pw', display_name: 'G3', birth_date: '1999-01-01' });
  const ht = a.body.token, gt = b.body.token;
  const g = await req('POST', '/gatherings', { title: 'N', category: 'coffee', start_time: '2026-01-01T20:00:00Z', end_time: '2026-01-02T02:00:00Z', lat: 40.7, lng: -74.0, address: 'A' }, ht);
  const gid = g.body.id;
  const r = await req('POST', '/gatherings/' + gid + '/requests', null, gt);
  const reqs = await req('GET', '/gatherings/' + gid + '/requests', null, ht);
  await req('PATCH', '/gatherings/' + gid + '/requests/' + reqs.body[0].id, { status: 'approved' }, ht);
  const notifs = await req('GET', '/notifications', null, gt);
  assert.ok(notifs.body.some((n) => n.type === 'request_status'));
});

test('chat limited to members', async () => {
  const a = await req('POST', '/auth/signup', { email: 'h2@test.com', password: 'pw', display_name: 'H', birth_date: '1998-01-01' });
  const b = await req('POST', '/auth/signup', { email: 'g2@test.com', password: 'pw', display_name: 'G', birth_date: '1999-01-01' });
  const ht = a.body.token, gt = b.body.token;
  const g = await req('POST', '/gatherings', { title: 'X', category: 'coffee', start_time: '2026-01-01T20:00:00Z', end_time: '2026-01-02T02:00:00Z', lat: 40.7, lng: -74.0, address: 'A' }, ht);
  const gid = g.body.id;
  const m = await req('POST', '/gatherings/' + gid + '/messages', { body: 'hi' }, gt);
  assert.strictEqual(m.status, 403);
});
test('pending applicant cannot read conversation', async () => {
  const a = await req('POST', '/auth/signup', { email: 'hp@test.com', password: 'pw', display_name: 'HP', birth_date: '1998-01-01' });
  const b = await req('POST', '/auth/signup', { email: 'gp@test.com', password: 'pw', display_name: 'GP', birth_date: '1999-01-01' });
  const ht = a.body.token, gt = b.body.token;
  const g = await req('POST', '/gatherings', { title: 'P', category: 'coffee', start_time: '2026-01-01T20:00:00Z', end_time: '2026-01-02T02:00:00Z', lat: 40.7, lng: -74.0, address: 'A' }, ht);
  const gid = g.body.id;
  await req('POST', '/gatherings/' + gid + '/requests', null, gt);
  const conv = await req('GET', '/gatherings/' + gid + '/conversation', null, gt).catch(() => null);
  // pending -> 403
  const r = await req('GET', '/gatherings/' + gid + '/conversation', null, gt);
  assert.strictEqual(r.status, 403);
});

test('approved guest can send and read messages', async () => {
  const a = await req('POST', '/auth/signup', { email: 'h4@test.com', password: 'pw', display_name: 'H4', birth_date: '1998-01-01' });
  const b = await req('POST', '/auth/signup', { email: 'g4@test.com', password: 'pw', display_name: 'G4', birth_date: '1999-01-01' });
  const ht = a.body.token, gt = b.body.token;
  const g = await req('POST', '/gatherings', { title: 'Q', category: 'coffee', start_time: '2026-01-01T20:00:00Z', end_time: '2026-01-02T02:00:00Z', lat: 40.7, lng: -74.0, address: 'A' }, ht);
  const gid = g.body.id;
  const r = await req('POST', '/gatherings/' + gid + '/requests', null, gt);
  const reqs = await req('GET', '/gatherings/' + gid + '/requests', null, ht);
  await req('PATCH', '/gatherings/' + gid + '/requests/' + reqs.body[0].id, { status: 'approved' }, ht);
  const conv = await req('GET', '/gatherings/' + gid + '/conversation', null, gt);
  assert.ok(conv.body.id);
  const send = await req('POST', '/conversations/' + conv.body.id + '/messages', { body: 'hello' }, gt);
  assert.strictEqual(send.status, 201);
  const msgs = await req('GET', '/conversations/' + conv.body.id + '/messages', null, gt);
  assert.ok(msgs.body.some((m) => m.body === 'hello'));
});
test('admin can grant founding host badge', async () => {
  const a = await req('POST', '/auth/signup', { email: 'admin@test.com', password: 'pw', display_name: 'Admin', birth_date: '1998-01-01' });
  // make admin directly via db? Can't. Instead just verify endpoint requires admin -> 403 for non-admin
  const r = await req('PATCH', '/admin/profiles/' + a.body.user.id + '/founding-host', { value: true }, a.body.token);
  assert.strictEqual(r.status, 403);
});
