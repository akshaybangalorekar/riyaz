-- ============================================================================
-- 001_schema.sql — Riyaz on Supabase
--
-- What this replaces: marks.json, edits.json, manch.json and favs.json, which the
-- app writes through the GitHub Contents API using a personal access token. After
-- this, those four files stop being written and the database becomes the record.
--
-- The content itself — the raags, alankars, taals, every line of notation and the
-- list of recordings — stays in assets/data.js. It is read-only, it is the same for
-- everyone, and shipping it with the page means the app paints instantly instead of
-- waiting for a round trip. Only what changes goes in here.
--
-- This is ONE shared dataset, not one per person: the timings, corrections and
-- performances belong to the family, exactly as the four JSON files did. Every
-- signed-in account sees and edits the same rows. That is deliberate — a per-person
-- split would mean Atharv's practice timings vanishing when he signs in on a device
-- Akshay had set up.
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- marks — where each line starts on each recording
--
-- Keyed by (lesson, recording POSITION, line). The position matters: saved times
-- have always been keyed that way, which is why removing a recording shifts every
-- later one. Nothing here changes that; it only moves the storage.
--
-- payload is the whole entry, kept as jsonb because it has three shapes and they
-- must survive a round trip untouched:
--   {t: 47.24, at: 1690000000000}                     a single time
--   {takes: [{name, t, at}], cur: 0}                  the same thing sung twice
--   {del: true, at: 1690000000000}                    a time that was removed
-- The third is the tombstone added in v5.4.0. It carries no time and wins the
-- merge on its timestamp, which is what finally let a deleted offset stay deleted
-- across devices.
-- ---------------------------------------------------------------------------
create table if not exists marks (
  lesson_id   text        not null,
  media_pos   int         not null,
  line_idx    int         not null,
  payload     jsonb       not null,
  updated_at  timestamptz not null default now(),
  primary key (lesson_id, media_pos, line_idx)
);

-- ---------------------------------------------------------------------------
-- edits — corrections to the written notation
--
-- line_key is the index into the lesson's lines as a string: "12" for a line that
-- came with the raag, "1000" and up for one that was added. A row may be a
-- tombstone too ({del: true}), which is how a deleted line stays deleted.
-- ---------------------------------------------------------------------------
create table if not exists edits (
  lesson_id  text        not null,
  line_key   text        not null,
  payload    jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (lesson_id, line_key)
);

-- ---------------------------------------------------------------------------
-- manch — Atharva's performances
--
-- video_id is the YouTube id. perf_date is kept as text, not a date: the existing
-- data holds years ("2025"), full dates ("11 feb 2023") and one malformed
-- "20261025", and coercing those to a date would either fail or quietly invent a
-- day. The app already knows how to pull a year out of a string; let it.
-- ---------------------------------------------------------------------------
create table if not exists manch (
  id         uuid        primary key default gen_random_uuid(),
  video_id   text        not null,
  name       text        not null default '',
  place      text        not null default '',
  perf_date  text        not null default '',
  created_at timestamptz not null default now()
);
create index if not exists manch_year_idx on manch ((substring(perf_date from '[0-9]{4}')));

-- ---------------------------------------------------------------------------
-- favs — the practice programme, in the order it was lined up
--
-- A favourite is either a whole page (line_idx null) or one line of it. sort_order
-- keeps the order, which the JSON array used to carry implicitly.
-- ---------------------------------------------------------------------------
create table if not exists favs (
  id         bigserial   primary key,
  kind       text        not null check (kind in ('page', 'line')),
  lesson_id  text        not null,
  sect       text        not null default '',
  line_idx   int,
  label      text        not null default '',
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- photos — one reference photo per page
--
-- Stored as a data URL in the row, because that is what the app already holds and
-- what the export and the editors expect. If the images ever grow past a couple of
-- hundred KB each, move this column to Storage and keep the path here instead.
-- ---------------------------------------------------------------------------
create table if not exists photos (
  lesson_id  text        not null,
  sect       text        not null default '',
  data       text        not null,
  updated_at timestamptz not null default now(),
  primary key (lesson_id, sect)
);

-- ---------------------------------------------------------------------------
-- raags — raags added from the app
--
-- These used to live only in one browser's localStorage, which meant a raag added
-- on the iPad did not exist on the phone. payload is the raag's own structure.
-- ---------------------------------------------------------------------------
create table if not exists raags (
  key        text        primary key,
  payload    jsonb       not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Signed in is the whole test. These are family practice notes behind a login, the
-- same thing the four JSON files were behind a token. The app's own edit switch and
-- PIN still guard against a stray tap; this guards against the open internet.
-- ---------------------------------------------------------------------------
alter table marks  enable row level security;
alter table edits  enable row level security;
alter table manch  enable row level security;
alter table favs   enable row level security;
alter table photos enable row level security;
alter table raags  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['marks','edits','manch','favs','photos','raags'] loop
    execute format('drop policy if exists %I_rw on %I', t, t);
    execute format(
      'create policy %I_rw on %I for all to authenticated using (true) with check (true)',
      t, t);
  end loop;
end $$;

-- Nothing is readable by an anonymous visitor, including the publishable key holder.
revoke all on marks, edits, manch, favs, photos, raags from anon;

-- ---------------------------------------------------------------------------
-- updated_at, kept honest by the database rather than by the client
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['marks','edits','photos','raags'] loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- check: expect six tables
-- select table_name from information_schema.tables
--  where table_schema = 'public' order by table_name;
