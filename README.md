# Facebook Group Member Transfer Tool

A Python CLI tool that reads all members from one Facebook group and sends them invitations to join another group — using the official Facebook Graph API.

> **How it works:** Facebook's API does not allow force-adding users. Instead, the tool sends each member a standard group invitation that they must accept. This is intentional (anti-spam) and keeps the tool fully compliant with Facebook's Platform Policies.

---

## Requirements

- Python 3.8+
- A Facebook account that is **admin of both groups**
- A Facebook Developer App (free, setup takes ~10 minutes — see below)

---

## Installation

```bash
git clone https://github.com/bilalzdeveloper/hello-world.git
cd hello-world
pip install -r requirements.txt
cp .env.example .env
```

Then fill in `.env` with your credentials (see setup steps below).

---

## Facebook Developer App Setup

### Step 1 — Create the App

1. Go to [https://developers.facebook.com/apps/](https://developers.facebook.com/apps/) and click **Create App**.
2. Choose **Other** for use case, then **None** for app type.
3. Give it any name (e.g. "Group Transfer Tool"). Your app starts in Development Mode automatically — no review needed for personal use.

### Step 2 — Add Required Permissions

1. In the App Dashboard, go to **App Review → Permissions and Features**.
2. Find `groups_access_member_info` and click **Request** to add it to your app.
3. In Development Mode, this permission works without submitting for review, as long as your account is listed as an App Admin or Tester.

### Step 3 — Get Your User Access Token

1. Go to [https://developers.facebook.com/tools/explorer/](https://developers.facebook.com/tools/explorer/).
2. Select your app from the dropdown (top right).
3. Click **Generate Access Token**.
4. In the permissions selector, add: `groups_access_member_info` and `publish_to_groups`.
5. Click **Generate Access Token** again and authorize — this gives a short-lived token (~1–2 hours).
6. Copy the token.

### Step 4 — Collect Your Credentials

| Value | Where to find it |
|---|---|
| **App ID** | App Dashboard → Settings → Basic |
| **App Secret** | App Dashboard → Settings → Basic (click Show) |
| **User Access Token** | Graph API Explorer (Step 3 above) |
| **Source Group ID** | Open Group A on Facebook → the number in the URL: `facebook.com/groups/XXXXXXXX` |
| **Dest Group ID** | Open Group B on Facebook → same method |

### Step 5 — Fill in `.env`

```
FB_APP_ID=123456789
FB_APP_SECRET=abcdef1234567890abcdef1234567890
FB_ACCESS_TOKEN=EAAxxxxx...
SOURCE_GROUP_ID=111222333444555
DEST_GROUP_ID=666777888999000
```

### Step 6 — Exchange for a Long-Lived Token (recommended)

Short-lived tokens expire in ~2 hours. Exchange it for a 60-day token:

```bash
python main.py --exchange-token
```

Copy the printed token back into `.env` as `FB_ACCESS_TOKEN`.

---

## Usage

### Dry Run (read members only, no invitations sent)

```bash
python main.py --source SOURCE_GROUP_ID --dest DEST_GROUP_ID --dry-run
```

Exports a CSV of all members. Inspect it before running live.

### Live Transfer

```bash
python main.py --source SOURCE_GROUP_ID --dest DEST_GROUP_ID
```

Reads group IDs from command line (or you can omit them and use the values in `.env`).

### Options

| Flag | Default | Description |
|---|---|---|
| `--source` | — | Source group ID (Group A) |
| `--dest` | — | Destination group ID (Group B) |
| `--dry-run` | off | Read members, export CSV, do NOT send invitations |
| `--delay` | `18` | Seconds between invite calls (~200/hour rate limit) |
| `--exchange-token` | off | Swap short-lived token for 60-day token and exit |

### Example with custom delay

```bash
python main.py --source 111222333 --dest 444555666 --delay 20
```

---

## Output

After a live run, a timestamped CSV is saved in the current directory:

```
fb_transfer_20240115_143022.csv
```

| Column | Values |
|---|---|
| `name` | Member's display name |
| `user_id` | Numeric Facebook user ID |
| `status` | `invited`, `already_member`, `privacy_blocked`, `error`, `skipped` |
| `reason` | Error detail (empty on success) |

To verify invitations were sent: open Group B on Facebook → **Admin Panel → Members → Invited**.

---

## Rate Limiting

Facebook allows ~200 API calls per hour on a standard user token.

- Default delay is **18 seconds** between invite calls (~200/hour).
- On a rate-limit error the script sleeps 60 seconds and retries once.
- After 2 consecutive rate-limit errors it saves partial results and exits — re-run the script after an hour to continue.
- Use `--delay 30` for a more conservative rate if you have a large group.

---

## Policy Compliance

This tool:
- Uses only official Facebook Graph API endpoints
- Never force-adds users — only sends invitations users must accept
- Only requests `id` and `name` fields (no personal data harvesting)
- Respects rate limits
- Requires you to be admin of both groups

It does **not** scrape, automate a browser, or bypass any Facebook security mechanism.

---

## Troubleshooting

**"Permission denied reading group members"**
Your token is missing the `groups_access_member_info` permission. Re-generate the token in Graph API Explorer with that permission checked (Step 3).

**"Access token is invalid or expired"**
Run `python main.py --exchange-token` to get a fresh 60-day token, then update `.env`.

**Invitations not appearing in Group B**
Check that your account is an admin of Group B. The `POST /{group_id}/members` endpoint requires admin access.

**"publish_to_groups" not available in Explorer**
Some apps need this added under App Review → Permissions. In Development Mode it may appear as optional — add it and re-generate your token.
