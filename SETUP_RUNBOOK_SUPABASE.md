# Riyaz on Supabase — setup, in order

This is the same shape as the quest board: a Supabase project, numbered SQL run in
the SQL editor, one publishable key pasted into the page, accounts made by hand in
the dashboard.

What changes for Riyaz: the app stops writing `marks.json`, `edits.json`,
`manch.json` and `favs.json` through the GitHub token, and reads and writes the
database instead. The notation itself stays in `assets/data.js` — it is read-only
and shipping it with the page is what makes the app paint instantly.

---

## 1. Make the project (5 minutes)

1. Go to `supabase.com/dashboard`, sign in, **New project**.
2. Name it `riyaz`. Pick the region closest to you — `Southeast Asia (Singapore)`
   is the nearest to India.
3. Save the database password somewhere; nothing here needs it, but losing it is
   annoying.
4. Wait for it to finish provisioning.

## 2. Run the two migrations (2 minutes)

In the project: **SQL Editor → New query**. Paste the whole of each file and run it.

**First `migrations/001_schema.sql`.** It creates six tables — `marks`, `edits`,
`manch`, `favs`, `photos`, `raags` — turns on Row Level Security, and adds the
policies. Expect "Success. No rows returned".

**Then `migrations/002_data_seed.sql`.** This is your existing data: 265 timed
lines, 90 notation corrections, 16 performances, 1 favourite. Expect four
"INSERT 0 n" lines.

Check both worked:

```sql
select 'marks' t, count(*) from marks union all
select 'edits', count(*) from edits union all
select 'manch', count(*) from manch union all
select 'favs',  count(*) from favs;
```

You should get **265, 90, 16, 1**.

## 3. Make the accounts (3 minutes)

**Authentication → Users → Add user → Create new user.**

- Email and password.
- **Tick "Auto Confirm User"**, otherwise the sign-in waits on a confirmation
  email that may never arrive.

Do it for each person who needs the app. Everyone signed in sees the same data —
this is one shared set of practice notes, not one per person, because that is what
the four JSON files were.

## 4. The key (1 minute)

**Settings → API keys →** copy the key beginning `sb_publishable_`.

This one is meant to be public. It goes in the page, and Row Level Security is what
keeps it safe — an anonymous visitor with that key can read nothing, because the
policies only apply to `authenticated` and the tables are revoked from `anon`.

Paste it where the app asks for it. Once it is in, the app signs in and the GitHub
token in Settings becomes unnecessary.

## 5. What the app does after this

- Reads `marks`, `edits`, `manch`, `favs`, `photos`, `raags` from Supabase on load.
- Writes on change, one row at a time, rather than rewriting a whole file — which
  removes the last-write-wins problem the JSON files had. Two devices editing
  different lines no longer overwrite each other.
- The tombstones (`{del: true}`) still work exactly as before: a deleted offset
  stays deleted, now because a row says so rather than because a merge resolved it.

## 6. What is not here yet

- **The app itself has not been switched over.** This repo has the schema, the
  data and this runbook. The sync layer still talks to GitHub until the rewrite
  lands, and the rewrite needs the project URL and publishable key from steps 1
  and 4 to be testable.
- **No offline mode.** You chose online-only, so the app needs a connection to read
  or write. The notation still renders from `data.js` without a network, but the
  timings will not be there until the fetch returns.
- **Photos are still data URLs in a column.** Fine at a few hundred KB each; move
  them to Storage if they grow.
- **The four JSON files are left in place** as a backup. Once you are satisfied the
  database has everything, they can be deleted and the GitHub-token path removed
  from Settings.

---

## Rolling back

Nothing here touches the existing files, so rolling back is: stop using the
Supabase build. `marks.json`, `edits.json`, `manch.json` and `favs.json` are still
in the repo with the same contents they had before the migration.
