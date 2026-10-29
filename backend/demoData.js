// Reversible, clearly labeled demo dataset for manual end-to-end testing.
// Run with: npm run demo:seed
// Remove only these demo records with: npm run demo:reset
// This script never deletes or modifies non-demo profiles or their content.
const { openDb, hashPw } = require('./db');

const PREFIX = 'demo-';
const PASSWORD = 'HangoutDemo2026!';
const profiles = [
  { id: 'demo-alex', email: 'alex@demo.hangout.test', name: 'Alex Morgan', username: 'alexm', bio: 'Coffee walks, city photos, and finding hidden spots.', avatar: 'https://i.pravatar.cc/240?img=12', birth: '2001-04-12' },
  { id: 'demo-maya', email: 'maya@demo.hangout.test', name: 'Maya Chen', username: 'mayac', bio: 'Design student. Always up for a matcha or a gallery.', avatar: 'https://i.pravatar.cc/240?img=47', birth: '2002-08-21' },
  { id: 'demo-leo', email: 'leo@demo.hangout.test', name: 'Leo Papas', username: 'leop', bio: 'Basketball, live music, and spontaneous plans.', avatar: 'https://i.pravatar.cc/240?img=13', birth: '2000-11-03' },
  { id: 'demo-sofia', email: 'sofia@demo.hangout.test', name: 'Sofia Reyes', username: 'sofiar', bio: 'Outdoor person. Sunset walks are always a yes.', avatar: 'https://i.pravatar.cc/240?img=44', birth: '2003-02-17' },
  { id: 'demo-niko', email: 'niko@demo.hangout.test', name: 'Niko Andreou', username: 'nikoa', bio: 'Local food, board games, and making new friends.', avatar: 'https://i.pravatar.cc/240?img=59', birth: '2001-07-29' },
];
const gatherings = [
  { id:'demo-gathering-coffee', host:'demo-maya', title:'Matcha & slow Sunday', category:'coffee', description:'A relaxed cafe hangout to meet new people, chat, and discover a new favorite drink. Beginners welcome.', hours:3, max:6, lat:37.9764, lng:23.7348, address:'Kolokotroni Street, Athens' },
  { id:'demo-gathering-basketball', host:'demo-leo', title:'Casual basketball run', category:'sports', description:'Friendly half-court games. No pressure and all skill levels welcome. Bring water.', hours:5, max:8, lat:37.9895, lng:23.7281, address:'Pedion tou Areos, Athens' },
  { id:'demo-gathering-sunset', host:'demo-sofia', title:'Sunset walk on the hill', category:'outdoors', description:'Easy paced walk, city views, and a few photos before sunset. Meet at the public entrance.', hours:8, max:7, lat:37.9681, lng:23.7262, address:'Philopappos Hill entrance, Athens' },
  { id:'demo-gathering-boardgames', host:'demo-niko', title:'Board games & new friends', category:'other', description:'Quick party games and strategy games at a cozy cafe. Come solo or bring a friend.', hours:26, max:6, lat:37.9812, lng:23.7274, address:'Monastiraki Square area, Athens' },
  { id:'demo-gathering-photo', host:'demo-alex', title:'Street photography stroll', category:'outdoors', description:'A casual photo walk through central Athens. Phone cameras are absolutely fine.', hours:30, max:8, lat:37.9757, lng:23.7225, address:'Syntagma Square, Athens' },
];
function isoHours(hours) { return new Date(Date.now() + hours * 3600000).toISOString(); }

function seed(db) {
  const tx = db.prepare('SELECT 1');
  tx.get();
  db.exec('BEGIN IMMEDIATE');
  try {
    // Replace only our own fixture set, making reseeding idempotent.
    cleanup(db);
    const insertProfile = db.prepare(`INSERT INTO profiles
      (id,email,password_hash,display_name,birth_date,bio,avatar_url,username,profile_public,share_location)
      VALUES (?,?,?,?,?,?,?,?,1,0)`);
    for (const p of profiles) insertProfile.run(p.id,p.email,hashPw(PASSWORD),p.name,p.birth,p.bio,p.avatar,p.username);

    const insertGathering = db.prepare(`INSERT INTO gatherings
      (id,host_id,title,category,description,start_time,end_time,max_guests,lat_exact,lng_exact,address,lat_fuzz,lng_fuzz,visibility)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'approval')`);
    for (const g of gatherings) {
      const start = isoHours(g.hours);
      const end = new Date(new Date(start).getTime() + 2 * 3600000).toISOString();
      insertGathering.run(g.id,g.host,g.title,g.category,g.description,start,end,g.max,g.lat,g.lng,g.address,g.lat + 0.0011,g.lng - 0.0012);
    }

    const join = db.prepare('INSERT INTO join_requests (id,gathering_id,user_id,status) VALUES (?,?,?,?)');
    join.run('demo-request-coffee','demo-gathering-coffee','demo-alex','approved');
    join.run('demo-request-coffee-pending','demo-gathering-coffee','demo-leo','pending');
    join.run('demo-request-basketball','demo-gathering-basketball','demo-maya','approved');
    join.run('demo-request-sunset','demo-gathering-sunset','demo-niko','pending');

    const post = db.prepare('INSERT INTO posts (id,user_id,body,media_url,media_type,source_gathering_id) VALUES (?,?,?,NULL,NULL,?)');
    post.run('demo-post-1','demo-maya','Found a tiny matcha place that feels like a secret garden. Who is joining next time?','demo-gathering-coffee');
    post.run('demo-post-2','demo-leo','The best plans are the ones you make an hour before. Basketball this week?','demo-gathering-basketball');
    post.run('demo-post-3','demo-sofia','Athens looks different when you slow down and watch the sunset.','demo-gathering-sunset');
    post.run('demo-post-4','demo-niko','Need a new board-game crew. I promise to explain the rules before we start 😄','demo-gathering-boardgames');

    const conv = db.prepare("INSERT INTO conversations (id,type,gathering_id,title) VALUES (?,'gathering',?,?)");
    const member = db.prepare('INSERT INTO conversation_members (conversation_id,user_id) VALUES (?,?)');
    const msg = db.prepare('INSERT INTO messages (id,conversation_id,gathering_id,user_id,body,is_system) VALUES (?,?,?,?,?,0)');
    const chatSets = [
      { id:'demo-chat-coffee', gid:'demo-gathering-coffee', title:'Matcha & slow Sunday', members:['demo-maya','demo-alex'], messages:[['demo-maya','Hey! I booked a table for 11:30 ☕'],['demo-alex','Perfect, I will be there a few minutes early.'],['demo-maya','Great — look for the little plant by the window.']] },
      { id:'demo-chat-basketball', gid:'demo-gathering-basketball', title:'Casual basketball run', members:['demo-leo','demo-maya'], messages:[['demo-leo','Bring water if you can. We will play a few short games.'],['demo-maya','Sounds good! I might bring a friend too.']] },
    ];
    for (const c of chatSets) {
      conv.run(c.id,c.gid,c.title);
      for (const uid of c.members) member.run(c.id,uid);
      for (const [i,m] of c.messages.entries()) msg.run(c.id+'-message-'+i,c.id,c.gid,m[0],m[1]);
    }
    const follow = db.prepare('INSERT INTO host_follows (follower_id,host_id) VALUES (?,?)');
    follow.run('demo-alex','demo-maya'); follow.run('demo-maya','demo-leo'); follow.run('demo-niko','demo-sofia');
    const like = db.prepare('INSERT INTO post_likes (post_id,user_id) VALUES (?,?)');
    like.run('demo-post-1','demo-alex'); like.run('demo-post-1','demo-niko'); like.run('demo-post-2','demo-maya');
    db.exec('COMMIT');
    console.log('Demo data seeded. Login: alex@demo.hangout.test / ' + PASSWORD);
    console.log('Other demo accounts: maya@demo.hangout.test, leo@demo.hangout.test, sofia@demo.hangout.test, niko@demo.hangout.test (same password).');
    console.log('Remove only demo fixtures with: npm run demo:reset');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function cleanup(db) {
  // Delete dependent records first. All IDs/emails are explicitly namespaced demo fixtures.
  db.prepare("DELETE FROM post_likes WHERE post_id LIKE 'demo-%' OR user_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM host_follows WHERE follower_id LIKE 'demo-%' OR host_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM conversation_members WHERE conversation_id LIKE 'demo-%' OR user_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM messages WHERE id LIKE 'demo-%' OR conversation_id LIKE 'demo-%' OR user_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM conversations WHERE id LIKE 'demo-%' OR gathering_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM join_requests WHERE id LIKE 'demo-%' OR gathering_id LIKE 'demo-%' OR user_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM posts WHERE id LIKE 'demo-%' OR user_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM notifications WHERE id LIKE 'demo-%' OR user_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM reports WHERE id LIKE 'demo-%' OR reporter_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM blocks WHERE blocker_id LIKE 'demo-%' OR blocked_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM push_tokens WHERE user_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM live_locations WHERE user_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM memory_share_consents WHERE user_id LIKE 'demo-%' OR post_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM post_memory_media WHERE post_id LIKE 'demo-%' OR media_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM memory_media WHERE uploader_id LIKE 'demo-%' OR memory_id IN (SELECT id FROM memories WHERE gathering_id LIKE 'demo-%')").run();
  db.prepare("DELETE FROM memories WHERE gathering_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM share_events WHERE target_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM gatherings WHERE id LIKE 'demo-%' OR host_id LIKE 'demo-%'").run();
  db.prepare("DELETE FROM profiles WHERE id LIKE 'demo-%' OR email LIKE '%@demo.hangout.test'").run();
}
function reset(db) {
  db.exec('BEGIN IMMEDIATE');
  try { cleanup(db); db.exec('COMMIT'); console.log('Demo records removed. Non-demo records were left untouched.'); }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

const db = openDb();
try {
  if (process.argv[2] === 'reset') reset(db);
  else if (process.argv[2] === 'seed' || !process.argv[2]) seed(db);
  else throw new Error('Usage: node demoData.js [seed|reset]');
} finally {
  db.close();
}
