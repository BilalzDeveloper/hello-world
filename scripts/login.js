// One-time Telegram login → prints the session string for TELEGRAM_SESSION.
//
// Built for GitHub Codespaces on a phone: plain stdin prompts via
// readline/promises, no raw-mode/fancy TUI. Run with:
//
//   node scripts/login.js
//
// You will be asked for: api_id, api_hash (from https://my.telegram.org),
// your phone number (+44…), the code Telegram sends you, and your 2FA
// password if you have one.

require('dotenv').config();
const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

(async () => {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const ask = async (q, fallback) => {
    if (fallback) {
      const a = (await rl.question(`${q} [${fallback}]: `)).trim();
      return a || String(fallback);
    }
    let a = '';
    while (!a) a = (await rl.question(`${q}: `)).trim();
    return a;
  };

  console.log('── UKSC Telegram login ─────────────────────────────────────');
  const apiId = Number(await ask('api_id', process.env.TELEGRAM_API_ID));
  const apiHash = await ask('api_hash', process.env.TELEGRAM_API_HASH);

  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: () => ask('Phone number (international, e.g. +447…)'),
    phoneCode: () => ask('Code Telegram just sent you'),
    password: () => ask('2FA password (enter if none)', ' ').then((p) => p.trim()),
    onError: (err) => console.error('Login error:', err.message),
  });

  const session = client.session.save();
  console.log('');
  console.log('Login OK ✓  Copy EVERYTHING between the markers (one long line):');
  console.log('');
  console.log('──────── COPY-THIS-START ────────');
  console.log(session);
  console.log('──────── COPY-THIS-END ──────────');
  console.log('');
  console.log('Set it as the TELEGRAM_SESSION secret on Fly (and in .env locally).');
  console.log('Keep it private — it IS your Telegram login.');

  await client.disconnect();
  rl.close();
  process.exit(0);
})().catch((e) => {
  console.error('Login failed:', e.message);
  process.exit(1);
});
