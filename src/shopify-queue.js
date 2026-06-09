// Throttled Shopify publisher. Full implementation lands in the shopify stage;
// these exports define the contract used by server.js.

async function enqueue(reviewIds) {
  throw new Error('shopify queue not implemented yet (stage 5)');
}

async function getStatus() {
  return { running: false, items: [] };
}

function resumeUnfinished() {}

module.exports = { enqueue, getStatus, resumeUnfinished };
