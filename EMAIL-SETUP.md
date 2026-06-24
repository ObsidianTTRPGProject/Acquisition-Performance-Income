# Email notifications — one-time setup

The app now emails your team automatically on four events:

- **A new vote is raised** → everyone is emailed to go and vote.
- **A vote result is recorded** → everyone is emailed the outcome.
- **A task is assigned to a member** → that one person is emailed.
- **Bills due soon / overdue** → a daily digest to everyone (optional, see step 5).

The sending happens on a small server-side function (a Supabase *Edge Function*) so your
SendGrid key is never exposed in the browser. Setup is a one-time job, ~15 minutes.

Until this is set up, the app still works perfectly — it just silently skips the emails.

---

## Step 1 — Create a SendGrid account and verify your sender

1. Go to https://sendgrid.com and sign up for a free account (the free tier sends up to
   100 emails/day, which is plenty for a small team).
2. In the SendGrid dashboard, open **Settings → Sender Authentication**.
3. Under **Single Sender Verification**, click **Verify a Single Sender**.
4. Fill in the form using an email address **you control** (e.g. your Gmail). This becomes
   the "from" address on every notification. Submit it.
5. SendGrid sends a confirmation email to that address — open it and click **Verify**.

> You chose single-sender (no domain) setup, so this is all that's required — no DNS records.

## Step 2 — Create a SendGrid API key

1. In SendGrid, open **Settings → API Keys → Create API Key**.
2. Name it e.g. `property-app`, choose **Restricted Access**, and give it **Mail Send → Full Access**
   (that one permission is enough). Create it.
3. **Copy the key now** — SendGrid only shows it once. It starts with `SG.`

## Step 3 — Create the Edge Function in Supabase

1. Open your project: https://supabase.com/dashboard/project/wwlrjzirvnlwcufktlvr
2. In the left sidebar click **Edge Functions** → **Create a function** (or **Deploy a new function**).
3. Name it exactly: **`notify`**  (lower-case, this name must match).
4. Paste in the entire contents of `supabase/functions/notify/index.ts` (in your repo /
   the file I've shared alongside this guide), replacing any starter code.
5. Click **Deploy**.

## Step 4 — Set the function secrets

Still in **Edge Functions**, open **Manage secrets** (sometimes under
**Project Settings → Edge Functions → Secrets**) and add these three:

| Name | Value |
|------|-------|
| `SENDGRID_API_KEY` | the `SG.…` key from Step 2 |
| `FROM_EMAIL` | the exact address you verified in Step 1 |
| `APP_URL` | `https://obsidianttrpgproject.github.io/Assets-Properties-Investments/` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically — you don't add them.

Save. That's it — raising a vote, recording a result, or assigning a task will now send email.

## Step 5 — (Optional) Daily "bills due soon" email

This one runs on a schedule rather than from a button. To turn it on:

1. In Supabase open **Database → Cron** (or **Integrations → Cron**, depending on dashboard version)
   and click **Create job**.
2. Schedule: `0 23 * * *` (runs daily; this is 23:00 UTC ≈ 9:30am Adelaide — adjust if you like).
3. Have it call the function. The simplest is an HTTP request to:
   `https://wwlrjzirvnlwcufktlvr.supabase.co/functions/v1/notify`
   with header `Authorization: Bearer <your service_role key>` and JSON body `{"kind":"bills_scan"}`.
   (Supabase's cron UI has a "Supabase Edge Function" preset that fills most of this in.)

If you'd rather skip the daily bills email, just don't do Step 5 — the other three triggers
work without it.

---

## Testing it

1. Make sure every team member has a row in **profiles** with their email (they do automatically
   once they've logged in at least once).
2. In the app, raise a test vote on any property. Within a few seconds everyone should get
   "New vote: …".
3. If nothing arrives: in Supabase open **Edge Functions → notify → Logs**. Common causes are a
   typo in `FROM_EMAIL` (must exactly match the verified sender) or the API key lacking Mail Send.

## How it fails safely

The app calls the function "fire-and-forget" — if the function isn't deployed yet, or SendGrid
is down, the vote/task/bill is still saved normally and the UI never blocks or errors. You can
set this up whenever you're ready.
