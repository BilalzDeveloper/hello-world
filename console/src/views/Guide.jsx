import React from 'react';
import { CheckIcon, AlertCircleIcon } from '../icons.jsx';

const SECTIONS = [
  { id: 'started', label: 'Getting started' },
  { id: 'workflow', label: 'Daily workflow' },
  { id: 'vendors', label: 'Registering a vendor' },
  { id: 'ready', label: 'Publishing ready listings' },
  { id: 'review', label: 'Reviewing a draft' },
  { id: 'settings', label: 'Settings' },
  { id: 'reference', label: 'Quick reference' },
  { id: 'trouble', label: 'If something looks wrong' },
];

function jump(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Guide() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', margin: '0 0 4px', color: '#1a1a1a' }}>User guide</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: '#6b6b6b', maxWidth: 680 }}>
          How to run the console day to day — from a vendor's photo landing on Telegram to a priced listing going live on Shopify.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {SECTIONS.map((s) => (
          <div
            key={s.id}
            onClick={() => jump(s.id)}
            className="so-menu-trigger"
            style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 999, padding: '6px 13px', fontSize: 12.5, fontWeight: 600, color: '#3a3a3a', cursor: 'pointer' }}
          >
            {s.label}
          </div>
        ))}
      </div>

      <GuideSection id="started" title="Getting started">
        <Steps
          items={[
            ['Open the console', "Visit the console's address in a browser, on desktop or phone. On mobile, add it to your home screen when prompted — it installs and runs like a normal app."],
            ['Enter the app password', <>Type it into the password field and click <Click>Log in</Click>. A wrong password shows a red error under the field.</>],
            ['Find your way around', <>Desktop shows four sections down the left: <Field>Today</Field>, <Field>Listing review</Field>, <Field>Vendors</Field>, <Field>Settings</Field>. On mobile the same sit in a bar along the bottom. The numbers next to <em>Listing review</em> and <em>Vendors</em> are live queue counts, not notifications to dismiss — they only drop once the underlying item is handled.</>],
          ]}
        />
        <Callout>
          <b>On desktop only:</b> a status line at the bottom of the sidebar reads either <em>"All caught up"</em> with a green dot, or <em>"N items need review"</em> with an amber one — a one-glance read on whether anything needs you right now.
        </Callout>
      </GuideSection>

      <GuideSection id="workflow" title="Daily workflow">
        <p style={pText}>
          Start every shift on <Field>Today</Field>. It's a dashboard, not a queue — three cards summarise what's waiting, each a shortcut into the screen that handles it.
        </p>
        <Steps
          items={[
            ['Pull the latest photos', <>Click <Click>Check now</Click> to ask Telegram for anything new right away, instead of waiting for the next automatic pass.</>],
            ['Clear Vendor requests first', "An unregistered sender's photos go nowhere until you map them to a vendor — handling these first is what unblocks new drafts from reaching the review queue at all."],
            ['Publish the Ready pile', 'High-confidence, already-priced drafts are the fastest win — usually a single click clears most of the queue.'],
            ['Work through Listing review', "What's left needs a human judgement call: a missing price, an odd title, or low AI confidence."],
          ]}
        />
      </GuideSection>

      <GuideSection id="vendors" title="Registering a vendor">
        <p style={pText}>
          Open <Field>Vendors</Field>. Every card there is a Telegram chat the console has never mapped to a vendor — nothing it sends reaches the live catalog until you act on it.
        </p>
        <Steps
          items={[
            ['Identify the sender', 'Read the chat name and chat ID at the top of the card, and how many photos are sitting there, waiting.'],
            ["Match it to a vendor code", "Open the dropdown and pick the vendor this sender actually is. If you don't recognise them, confirm with a colleague first — this decides which vendor's name every future photo from that chat is filed under."],
            ['Confirm', <>Click <Click>Register vendor</Click>. Its queued photos start flowing into Listing review immediately. If the sender shouldn't be feeding the pipeline at all, click <Click tone="danger">Reject</Click> instead.</>],
          ]}
        />
        <Callout tone="warn">
          <b>Careful:</b> registering the wrong vendor code files every one of that sender's photos under the wrong vendor. If you're unsure who a chat belongs to, leave it pending rather than guess.
        </Callout>
      </GuideSection>

      <GuideSection id="ready" title="Publishing ready listings">
        <p style={pText}>
          On <Field>Listing review</Field>, the green banner at the top holds every high-confidence, pre-priced draft — the ones that don't need editing, only your go-ahead.
        </p>
        <Steps
          items={[
            ['Scan for duplicate flags', <>An amber-outlined row marked <Chip tone="warn">Possible duplicate</Chip> shares the same vendor, price, sizes and colours as another draft — almost always one item the AI described twice. These are held out of the bulk action automatically.</>],
            ['Publish everything else in one click', <>Click <Click>Approve &amp; publish all</Click>. It ships every draft in the banner except the flagged duplicates.</>],
            ['Handle flagged rows individually', <>If a flagged pair really is two different items, click <Click>Publish</Click> — it asks <em>"Publish anyway?"</em> once as confirmation, then ships it.</>],
            ['…or merge true duplicates', <>Tick two or more flagged rows and click <Click>Merge selected</Click> to combine them into one product — this works even across different vendor tags.</>],
          ]}
        />
        <Callout tone="good">
          <b>Why this is safe:</b> the duplicate check only fires on an exact match of vendor, price, sizes <em>and</em> colours — different items essentially never collide on all four by accident, so a flag is worth a second look, not a false alarm.
        </Callout>
      </GuideSection>

      <GuideSection id="review" title="Reviewing a draft by hand">
        <p style={pText}>Below the ready-to-publish banner sits the actual review queue — drafts the AI wasn't confident about, or that never got a price.</p>
        <Steps
          items={[
            ['Narrow the queue, if useful', <>Use <Field>Vendor</Field> to focus on one vendor, and <Field>Sort</Field> to bring low-confidence drafts to the top, or group everything by vendor.</>],
            ['Check the actual photos', 'Click any thumbnail to open it full-size before trusting the AI\'s read of size, colour or condition.'],
            ['Fix the details', <>Click straight into <Field>title</Field>, <Field>sizes</Field>, <Field>colours</Field> or the notes line — each saves the moment you click away.</>],
            ['Set the Collection', "Pick where it belongs in the Shopify catalog. If Settings already has a default for this product type, it's often filled in for you — just confirm it's right."],
            ['Enter a Sell price', <>Required — <Click>Approve &amp; publish</Click> stays disabled and reads <em>"Enter a price to publish"</em> until a valid price is in the box.</>],
            ['Split, if one photo set is really two items', <>Tick the photos that belong to the second item, then click <Click>Split into new draft</Click> — it peels them off into their own draft.</>],
            ['Publish or reject', <>Click <Click>Approve &amp; publish</Click> once it's right, or <Click tone="danger">Reject</Click> to drop the draft entirely.</>],
            ['Optional: fill in Marketing', <>Open <Field>Marketing</Field> on the card for AI-drafted SEO title/description, tags, social caption, email blurb, and ad copy — edit any of them, or click <Click>Copy</Click> to paste one elsewhere.</>],
          ]}
        />
      </GuideSection>

      <GuideSection id="settings" title="Settings">
        <p style={pText}>Two things live here: the default that shapes every future draft, and a read-only look at what the AI drafting is costing.</p>
        <Steps
          items={[
            ['Set a default Collection per product type', 'This is only the starting point for new drafts — you can still override any single one later in Listing review without changing the default for everyone else.'],
            ['Save your changes', <>Click <Click>Save changes</Click> — it only lights up once something in the table actually differs from what's saved.</>],
            ['Check AI spend if you need to', <>The usage card shows spend on Claude Haiku 4.5 photo analysis for Today, This month and All time. It's spend, not remaining balance — check the Anthropic account itself at <Field>platform.claude.com</Field> for what credit is left.</>],
          ]}
        />
      </GuideSection>

      <GuideSection id="reference" title="Quick reference">
        <p style={pText}>Colour and badges carry meaning everywhere in the console.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RefRow signal={<Chip tone="good">Good confidence</Chip>} meaning="AI is confident; price auto-filled — lands in the Ready-to-publish banner." />
          <RefRow signal={<Chip tone="warn">Low confidence</Chip>} meaning="AI wasn't sure, or no price was set — sits in the manual review queue." />
          <RefRow signal={<Chip tone="warn">Possible duplicate</Chip>} meaning="Shares vendor, price, sizes and colours with another ready draft — merge or confirm individually." />
          <RefRow signal={<Dot color="#0c8a5f" />} meaning={'Green status dot — "All caught up", nothing pending anywhere.'} />
          <RefRow signal={<Dot color="#e0b261" />} meaning={'Amber status dot — N items need review, across Listing review and Vendors combined.'} />
          <RefRow signal="Coloured dot next to a title" meaning="Each vendor keeps one consistent colour across Listing review and Vendors, so a queue is scannable by source at a glance." />
          <RefRow signal="Number badge on a nav item" meaning="Live queue depth for that screen — it only falls when the underlying item is registered, rejected, published or rejected." />
        </div>
      </GuideSection>

      <GuideSection id="trouble" title="If something looks wrong" last>
        <p style={pText}>The console is built so mistakes are cheap to catch before they matter.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 16 }}>
          <MiniCard title="A screen won't load" body={<>A pink banner reading "Couldn't load…" means the console couldn't reach the data it needed. Click <Click>Retry</Click> — if it keeps failing, flag it rather than refreshing repeatedly.</>} />
          <MiniCard title='"Publish failed — retry"' body={<>A draft that failed to reach Shopify shows this badge. Fix a price if it wasn't set, then click <Click>Approve &amp; publish</Click> again.</>} />
          <MiniCard title="An empty queue" body={'"Review queue clear" or "No pending vendor requests" isn\'t an error — it means you\'re caught up. New items appear on their own.'} />
          <MiniCard title="The safety net" body={'Nothing reaches the live Shopify catalog until you — or an explicit "publish all" — approve it. Editing, filtering and sorting a draft never publishes it by accident.'} />
        </div>
        <Callout>
          <b>Rule of thumb:</b> when in doubt, reject or leave a vendor request pending rather than guess — a rejected sender can always be revisited, but a listing published under the wrong vendor, or wrongly merged, is harder to undo once it's live.
        </Callout>
      </GuideSection>
    </div>
  );
}

const pText = { fontSize: 13, color: '#5a5a5a', lineHeight: 1.55, margin: '0 0 14px', maxWidth: 640 };

function GuideSection({ id, title, children, last }) {
  return (
    <div id={id} style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: 12, padding: 20, marginBottom: last ? 0 : 16, scrollMarginTop: 16 }}>
      <h2 style={{ fontSize: 16.5, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px', letterSpacing: '-.2px' }}>{title}</h2>
      {children}
    </div>
  );
}

function Steps({ items }) {
  return (
    <ol style={{ listStyle: 'none', margin: '0 0 6px', padding: 0 }}>
      {items.map(([title, body], i) => (
        <li key={i} style={{ position: 'relative', padding: '0 0 16px 32px' }}>
          <span
            style={{
              position: 'absolute', left: 0, top: 0, width: 21, height: 21, borderRadius: '50%',
              border: '1.6px solid #4b53b5', color: '#4b53b5', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {i + 1}
          </span>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a1a', marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.55 }}>{body}</div>
        </li>
      ))}
    </ol>
  );
}

function Click({ children, tone = 'accent' }) {
  const styles = {
    accent: { color: '#4b53b5', background: '#eef0fb' },
    danger: { color: '#b3261e', background: '#fce9e7' },
  };
  return <span style={{ ...styles[tone], fontWeight: 700, fontSize: 12.5, borderRadius: 6, padding: '1px 7px' }}>{children}</span>;
}

function Field({ children }) {
  return (
    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#52525b', background: '#f3f3f4', border: '1px solid #e8e8e8', borderRadius: 6, padding: '1px 7px' }}>
      {children}
    </span>
  );
}

function Chip({ children, tone }) {
  const styles = {
    good: { color: '#0a7a52', background: '#e7f4ee' },
    warn: { color: '#9a5b00', background: '#fbf1dd' },
  };
  return <span style={{ ...styles[tone], fontWeight: 700, fontSize: 11.5, borderRadius: 999, padding: '3px 9px', display: 'inline-block' }}>{children}</span>;
}

function Dot({ color }) {
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />;
}

function Callout({ children, tone }) {
  const styles = {
    default: { color: '#4a4a4a', background: '#fafafa', border: '1px solid #ececec' },
    warn: { color: '#9a5b00', background: '#fbf1dd', border: '1px solid #f3e2ba' },
    good: { color: '#0a5c3e', background: '#f7faf8', border: '1px solid #cfe8da' },
  };
  const s = styles[tone] || styles.default;
  const Icon = tone === 'warn' ? AlertCircleIcon : CheckIcon;
  return (
    <div style={{ ...s, display: 'flex', alignItems: 'flex-start', gap: 9, borderRadius: 9, padding: '11px 14px', fontSize: 12.5, lineHeight: 1.55 }}>
      <span style={{ marginTop: 2, flex: '0 0 auto' }}>
        {tone ? <Icon size={14} width={2} stroke="currentColor" /> : <span style={{ width: 14, display: 'inline-block' }} />}
      </span>
      <span>{children}</span>
    </div>
  );
}

function MiniCard({ title, body }) {
  return (
    <div style={{ border: '1px solid #eee', background: '#fafafa', borderRadius: 9, padding: '12px 14px' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a', marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#6b6b6b', lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

function RefRow({ signal, meaning }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: 10, borderBottom: '1px solid #f1f1f1' }}>
      <div style={{ flex: '0 0 180px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#3a3a3a' }}>{signal}</div>
      <div style={{ flex: 1, fontSize: 12.5, color: '#6b6b6b', lineHeight: 1.5 }}>{meaning}</div>
    </div>
  );
}
