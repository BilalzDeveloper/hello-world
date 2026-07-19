// GramJS userbot on my PERSONAL account.
//
// STRICTLY READ-ONLY toward vendors: this module never replies, reacts,
// marks-as-read or sends anything to any vendor chat. The ONLY outbound
// messages are to my own Saved Messages (sendSavedMessage below).

const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');

const db = require('./db');
const vendors = require('./vendors');
const pipeline = require('./pipeline');

let client = null;
let myId = null;

// Opt-in trace: set USERBOT_DEBUG=1 to log every message the userbot sees and
// why it was kept or skipped. Off by default so production logs stay quiet.
const dbg = process.env.USERBOT_DEBUG
  ? (m) => console.log('userbot[dbg]:', m)
  : () => {};

// Worker-declared batches: a text-only message in a chat flagged is_worker
// (vendor_chats.is_worker) opens a batch that subsequent photos from that
// chat attach to, until WORKER_BATCH_TIMEOUT_MS of silence passes — after
// that, photos fall back to today's normal per-photo vendor resolution. A
// new batch header always supersedes whatever batch was still open.
const WORKER_BATCH_TIMEOUT_MS = Number(process.env.WORKER_BATCH_TIMEOUT_MS) || 20 * 60 * 1000;
const openBatches = new Map(); // chatId -> { batchId, vendor, lastPhotoAt }

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

async function start() {
  const apiId = Number(env('TELEGRAM_API_ID'));
  const apiHash = env('TELEGRAM_API_HASH');
  const session = new StringSession(env('TELEGRAM_SESSION'));

  client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 1e9,        // reconnect forever
    retryDelay: 3000,
    autoReconnect: true,
    floodSleepThreshold: 300,
  });

  await client.connect();
  if (!(await client.checkAuthorization())) {
    throw new Error('TELEGRAM_SESSION invalid/expired — re-run scripts/login.js');
  }
  const me = await client.getMe();
  myId = me.id;
  console.log(`userbot connected as ${me.firstName || ''} (@${me.username || me.id})`);

  await loadOpenBatches();
  client.addEventHandler(onNewMessage, new NewMessage({}));
  return client;
}

// Survive a restart mid-batch: reload whatever batch was still "open" (last
// photo within the timeout window) per chat, so photos keep attaching to it.
async function loadOpenBatches() {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (tg_chat_id) tg_chat_id, id, vendor, last_photo_at
     FROM batches
     WHERE last_photo_at > now() - interval '1 millisecond' * $1
     ORDER BY tg_chat_id, last_photo_at DESC`,
    [WORKER_BATCH_TIMEOUT_MS]
  );
  for (const r of rows) {
    openBatches.set(String(r.tg_chat_id), {
      batchId: r.id,
      vendor: r.vendor,
      lastPhotoAt: new Date(r.last_photo_at).getTime(),
    });
  }
  if (rows.length) console.log(`userbot: resumed ${rows.length} open worker batch(es)`);
}

async function onNewMessage(event) {
  try {
    const msg = event.message;
    if (!msg) return;

    const isSaved = msg.peerId?.userId && String(msg.peerId.userId) === String(myId);
    dbg(`message in chat ${msg.chatId} — saved:${!!isSaved} out:${!!msg.out} private:${!!msg.isPrivate} group:${!!msg.isGroup} hasImage:${hasImage(msg)} caption:${JSON.stringify((msg.message || '').slice(0, 40))}`);
    // Listen to: incoming private/group messages, plus my own Saved Messages
    // (where I forward WhatsApp photos). Ignore broadcasts and my own
    // outgoing messages in other chats.
    if (!isSaved) {
      if (msg.out) return dbg('  skip: my own outgoing message');
      if (!(msg.isPrivate || msg.isGroup)) return dbg('  skip: not a private/group chat');
    }

    const chatId = String(msg.chatId);
    const caption = msg.message || '';

    // Chats mapped as IGNORED are skipped silently — even with captions.
    const mapping = await db.query(
      'SELECT vendor, is_worker FROM vendor_chats WHERE tg_chat_id = $1', [chatId]
    );
    const mappedVendor = mapping.rows[0]?.vendor || null;
    const isWorkerChat = Boolean(mapping.rows[0]?.is_worker);
    if (mappedVendor === vendors.VENDOR_IGNORED) return;

    // Worker chats: a text-only message opens a new batch. Photos sent right
    // after it (within WORKER_BATCH_TIMEOUT_MS) attach to that batch instead
    // of going through the normal per-photo vendor resolution below.
    if (isWorkerChat && !hasImage(msg) && caption.trim()) {
      await openWorkerBatch(chatId, caption.trim(), mappedVendor);
      return dbg(`  worker batch header opened in chat ${chatId}`);
    }

    if (!hasImage(msg)) return dbg('  skip: no photo/image document');

    let vendor;
    let batchId = null;
    const open = isWorkerChat ? getOpenBatch(chatId) : null;
    if (open) {
      vendor = open.vendor;
      batchId = open.batchId;
      await touchBatch(chatId, batchId);
    } else {
      // Vendor resolution order: caption code → chat mapping → UNASSIGNED.
      vendor = vendors.matchVendorCode(caption);
      if (!vendor && mappedVendor && vendors.VENDORS.includes(mappedVendor)) {
        vendor = mappedVendor;
      }
      if (!vendor) {
        vendor = vendors.VENDOR_UNASSIGNED;
        await rememberChat(msg, chatId); // surface on the mapping screen
      }
    }

    const buffer = await client.downloadMedia(msg); // highest resolution
    if (!buffer || !buffer.length) return;

    const result = await pipeline.ingestImage(buffer, {
      vendor,
      source: 'telegram',
      chatId,
      msgId: Number(msg.id),
      caption,
      batchId,
    });
    console.log(`userbot: photo from chat ${chatId} → ${vendor}` +
      (batchId ? ` (batch ${batchId})` : '') +
      (result?.duplicate ? ' (duplicate, cached)' : ''));
  } catch (e) {
    console.error('userbot handler error:', e.message);
  }
}

async function openWorkerBatch(chatId, instructions, mappedVendor) {
  // Same resolution order as a normal photo caption, applied once per batch.
  let vendor = vendors.matchVendorCode(instructions);
  if (!vendor && mappedVendor && vendors.VENDORS.includes(mappedVendor)) vendor = mappedVendor;
  if (!vendor) vendor = vendors.VENDOR_UNASSIGNED;

  const { rows } = await db.query(
    `INSERT INTO batches (tg_chat_id, vendor, instructions, started_at, last_photo_at)
     VALUES ($1, $2, $3, now(), now()) RETURNING id`,
    [chatId, vendor, instructions]
  );
  const batchId = rows[0].id;
  openBatches.set(chatId, { batchId, vendor, lastPhotoAt: Date.now() });
  console.log(`userbot: worker batch ${batchId} opened in chat ${chatId} → ${vendor}: ${instructions.slice(0, 80)}`);
}

// Returns the still-open batch for a chat, or null if none / it expired
// (expired entries are dropped so the next photo falls back to normal
// per-photo resolution instead of silently reattaching to a stale batch).
function getOpenBatch(chatId) {
  const open = openBatches.get(chatId);
  if (!open) return null;
  if (Date.now() - open.lastPhotoAt > WORKER_BATCH_TIMEOUT_MS) {
    openBatches.delete(chatId);
    return null;
  }
  return open;
}

async function touchBatch(chatId, batchId) {
  const open = openBatches.get(chatId);
  if (open) open.lastPhotoAt = Date.now();
  await db.query('UPDATE batches SET last_photo_at = now() WHERE id = $1', [batchId]);
}

function hasImage(msg) {
  if (msg.photo) return true;
  const doc = msg.document;
  return Boolean(doc && typeof doc.mimeType === 'string' && doc.mimeType.startsWith('image/'));
}

async function rememberChat(msg, chatId) {
  let title = '';
  try {
    const chat = await msg.getChat();
    title = chat?.title || [chat?.firstName, chat?.lastName].filter(Boolean).join(' ')
      || chat?.username || '';
  } catch {}
  await db.query(
    `INSERT INTO vendor_chats (tg_chat_id, vendor, chat_title, mapped_at)
     VALUES ($1, NULL, $2, NULL)
     ON CONFLICT (tg_chat_id) DO UPDATE
       SET chat_title = COALESCE(NULLIF(EXCLUDED.chat_title, ''), vendor_chats.chat_title)`,
    [chatId, title]
  );
}

// The ONLY place anything is ever sent: my own Saved Messages.
async function sendSavedMessage(text) {
  if (!client) {
    console.log('digest (userbot offline):\n' + text);
    return;
  }
  try {
    await client.sendMessage('me', { message: text, parseMode: undefined });
  } catch (e) {
    console.error('saved-messages send failed:', e.message);
  }
}

module.exports = { start, sendSavedMessage };
