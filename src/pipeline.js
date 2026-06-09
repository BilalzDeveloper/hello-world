// Image intake → resize → hash → dedupe → batch analysis → review queue.
// Full implementation lands in the pipeline stage; these exports define the
// contract used by server.js and userbot.js.

async function ingestImage(buffer, meta) {
  throw new Error('pipeline not implemented yet (stage 4)');
}

async function runBatchCycle() {
  throw new Error('pipeline not implemented yet (stage 4)');
}

function startCron() {}

module.exports = { ingestImage, runBatchCycle, startCron };
