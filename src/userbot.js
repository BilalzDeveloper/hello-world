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

  client.addEventHandler(onNewMessage, new NewMessage({}));
  return client;
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

    if (!hasImage(msg)) return dbg('  skip: no photo/image document');

    const chatId = String(msg.chatId);
    const caption = msg.message || '';

    // Chats mapped as IGNORED are skipped silently — even with captions.
    const mapping = await db.query(
      'SELECT vendor FROM vendor_chats WHERE tg_chat_id = $1', [chatId]
    );
    const mappedVendor = mapping.rows[0]?.vendor || null;
    if (mappedVendor === vendors.VENDOR_IGNORED) return;

    // Vendor resolution order: caption code → chat mapping → UNASSIGNED.
    let vendor = vendors.matchVendorCode(caption);
    if (!vendor && mappedVendor && vendors.VENDORS.includes(mappedVendor)) {
      vendor = mappedVendor;
    }
    if (!vendor) {
      vendor = vendors.VENDOR_UNASSIGNED;
      await rememberChat(msg, chatId); // surface on the mapping screen
    }

    const buffer = await client.downloadMedia(msg); // highest resolution
    if (!buffer || !buffer.length) return;

    const result = await pipeline.ingestImage(buffer, {
      vendor,
      source: 'telegram',
      chatId,
      msgId: Number(msg.id),
      caption,
    });
    console.log(`userbot: photo from chat ${chatId} → ${vendor}` +
      (result?.duplicate ? ' (duplicate, cached)' : ''));
  } catch (e) {
    console.error('userbot handler error:', e.message);
  }
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
