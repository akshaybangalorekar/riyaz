-- ============================================================================
-- 002_data_seed.sql — the four JSON files, moved into the tables
--
-- Generated from the live marks.json, edits.json, manch.json and favs.json, so the
-- contents are exactly what the app has been carrying, not a retyped approximation.
--
-- Safe to re-run: every row is an upsert on its primary key, so running it twice
-- leaves the same data rather than duplicating it.
--
-- Run 001_schema.sql first.
-- ============================================================================

begin;

-- ---------- marks: where each line starts on each recording ----------
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al1', 0, 0, '{"t":0,"at":1791685230783}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al1', 0, 1, '{"t":30.15,"at":1791685248873}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al1', 1, 0, '{"t":0,"at":1791684503663}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al1', 1, 1, '{"t":28.77,"at":1791684521997}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al10', 0, 0, '{"t":0,"at":1791687623112}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al10', 0, 1, '{"t":21.76,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al10', 1, 0, '{"t":0,"at":1791687634046}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al10', 1, 1, '{"t":22.34,"at":1791687648970}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al11', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al11', 0, 1, '{"t":27.68,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al11', 1, 0, '{"t":0,"at":1791687655612}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al11', 1, 1, '{"t":44.08,"at":1791687697450}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al12', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al12', 0, 1, '{"t":26.62,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al12', 1, 0, '{"t":0,"at":1791687703511}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al12', 1, 1, '{"t":28.16,"at":1791687714794}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al13', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al13', 0, 1, '{"t":42.27,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al13', 1, 0, '{"t":0,"at":1791687720948}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al13', 1, 1, '{"t":44.85,"at":1791687727603}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al14', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al14', 0, 1, '{"t":37.68,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al14', 1, 0, '{"t":0,"at":1791687736660}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al14', 1, 1, '{"t":49.95,"at":1791687746883}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al15', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al15', 0, 1, '{"t":61.8,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al15', 1, 0, '{"t":0,"at":1791687754359}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al15', 1, 1, '{"t":64.27,"at":1791687763110}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al16', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al16', 0, 1, '{"t":61.25,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al16', 1, 0, '{"t":0,"at":1791687773309}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al16', 1, 1, '{"t":83.12,"at":1791687807325}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al17', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al17', 0, 1, '{"t":48.98,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al17', 1, 0, '{"t":0,"at":1791687815867}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al17', 1, 1, '{"t":44.32,"at":1791687857491}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al18', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al18', 1, 0, '{"t":0,"at":1791687872565}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al18', 1, 1, '{"t":41.84,"at":1791687894990}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al19', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al19', 0, 1, '{"t":32.04,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al19', 1, 0, '{"t":0,"at":1791687902706}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al19', 1, 1, '{"t":40.55,"at":1791687922329}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al2', 0, 0, '{"t":0,"at":1791685262351}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al2', 0, 1, '{"t":22.24,"at":1791685274174}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al2', 1, 0, '{"t":0,"at":1791684530730}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al2', 1, 1, '{"t":19.12,"at":1791684544601}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al20', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al20', 0, 1, '{"t":35.48,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al21', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al21', 0, 1, '{"t":52.38,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al22', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al22', 0, 1, '{"t":58.23,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al3', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al3', 0, 1, '{"t":19.29,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al3', 1, 0, '{"t":0,"at":1791685285942}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al3', 1, 1, '{"t":19.67,"at":1791685296516}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al4', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al4', 0, 1, '{"t":36.37,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al4', 1, 0, '{"t":0,"at":1791687496809}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al4', 1, 1, '{"t":31.98,"at":1791687510982}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al5', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al5', 0, 1, '{"t":28.57,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al5', 1, 0, '{"t":0,"at":1791687517032}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al5', 1, 1, '{"t":34.76,"at":1791687536631}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al6', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al6', 0, 1, '{"t":29.26,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al6', 2, 0, '{"t":0,"at":1791687548731}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al6', 2, 1, '{"t":28.75,"at":1791687561597}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al7', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al7', 0, 1, '{"t":31.1,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al7', 2, 0, '{"t":0,"at":1791687571547}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al7', 2, 1, '{"t":26.52,"at":1791687580247}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al8', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al8', 0, 1, '{"t":27.78,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al8', 1, 0, '{"t":0,"at":1791687589020}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al8', 1, 1, '{"t":43.78,"at":1791687602818}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al9', 0, 0, '{"t":0,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al9', 0, 1, '{"t":27.75,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al9', 1, 0, '{"t":0,"at":1791687609603}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('al9', 1, 1, '{"t":41.5,"at":1791687616579}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 47, '{"takes":[{"name":"Komal","t":304.4,"at":1794543318959}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 48, '{"takes":[{"name":"Komal","t":365.25,"at":1794543379820}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 0, 49, '{"takes":[{"name":"Komal","t":427.98,"at":1794543442536}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 0, '{"takes":[{"name":"Take 1","t":3.57,"at":1792473714916}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 1, '{"takes":[{"name":"Take 1","t":13.78,"at":1792473725132}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 2, '{"takes":[{"name":"Take 1","t":30.37,"at":1792473741715}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 1, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 2, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 2, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 2, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 2, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 2, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 2, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 2, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 3, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 3, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 3, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 3, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 3, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 3, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 3, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 4, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 4, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 4, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 4, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 4, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 4, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 4, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 5, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 5, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 5, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 5, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 5, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 5, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 5, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 22, '{"takes":[{"name":"Take 1","t":1.48,"at":1792756944800}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 23, '{"takes":[{"name":"Take 1","t":29.98,"at":1792756993534}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 24, '{"takes":[{"name":"Take 1","t":45.58,"at":1792757019251}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 25, '{"takes":[{"name":"Take 1","t":61.3,"at":1792757045101}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 26, '{"takes":[{"name":"Take 1","t":77.59,"at":1792757081652}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 27, '{"takes":[{"name":"Take 1","t":93.29,"at":1792757097352}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 28, '{"takes":[{"name":"Take 1","t":109.39,"at":1792757113453}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 29, '{"takes":[{"name":"Take 1","t":125.47,"at":1792757139653}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 6, 30, '{"takes":[{"name":"Take 1","t":141.91,"at":1792757156089}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 7, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 7, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 7, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 7, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 7, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 7, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 7, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 8, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 8, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 8, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 8, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 8, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 8, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 8, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 9, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 9, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 9, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 9, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 9, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 9, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 9, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 12, '{"takes":[{"name":"Take 1","t":8.58,"at":1792757546737}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 13, '{"takes":[{"name":"Take 1","t":56.3,"at":1792757604576}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 14, '{"takes":[{"name":"Take 1","t":72.24,"at":1792757620522}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 15, '{"takes":[{"name":"Take 1","t":88.06,"at":1792757636339}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 16, '{"takes":[{"name":"Take 1","t":104.09,"at":1792757662477}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 17, '{"takes":[{"name":"Take 1","t":119.16,"at":1792757687672}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 18, '{"takes":[{"name":"Take 1","t":136.2,"at":1792757724959}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 19, '{"takes":[{"name":"Take 1","t":151.99,"at":1792757740742}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 20, '{"takes":[{"name":"Take 1","t":168.15,"at":1792757756911}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 10, 21, '{"takes":[{"name":"Take 1","t":184.22,"at":1792757887559}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 29, '{"takes":[{"name":"Take 1","t":11.26,"at":1792757216554}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 30, '{"takes":[{"name":"Take 1","t":56.22,"at":1792757261504}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 11, 31, '{"takes":[{"name":"Take 1","t":113.03,"at":1792757318322}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 12, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 12, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 12, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 12, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 12, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 12, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 12, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 13, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 13, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 13, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 13, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 13, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 13, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 13, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 14, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 14, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 14, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 14, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 14, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 14, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 14, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 15, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 15, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 15, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 15, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 15, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 15, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 15, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 16, 3, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 16, 4, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 16, 5, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 16, 6, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 16, 7, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 16, 8, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_bhairavi', 16, 9, '{"del":true,"at":1794462421170}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 0, '{"takes":[{"name":"Take 1","t":1.18,"at":1792473351891}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 1, '{"t":21.67,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 2, '{"t":38.85,"at":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 3, '{"takes":[{"name":"Komal","t":47.24,"at":1792474436677}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 4, '{"takes":[{"name":"Komal","t":70.03,"at":1792474459458}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 5, '{"takes":[{"name":"Komal","t":103.3,"at":1792474492741}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 6, '{"takes":[{"name":"Komal","t":136.59,"at":1792474526023}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 7, '{"takes":[{"name":"Komal","t":159.81,"at":1792474549239}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 8, '{"takes":[{"name":"Komal","t":190.64,"at":1792474580074}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 9, '{"takes":[{"name":"Komal","t":243.87,"at":1792474633304}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 10, '{"takes":[{"name":"Komal","t":298.21,"at":1792474687636}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 11, '{"takes":[{"name":"Komal","t":358.49,"at":1792474747922}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 0, 12, '{"takes":[{"name":"Komal","t":415.66,"at":1792474805087}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 0, '{"t":0,"at":1792760277819}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 1, '{"t":10.01,"at":1792760277819}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 2, '{"t":18.56,"at":1792760277819}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 3, '{"takes":[{"name":"Komal","t":47.24,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 4, '{"takes":[{"name":"Komal","t":70.03,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 5, '{"takes":[{"name":"Komal","t":103.3,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 6, '{"takes":[{"name":"Komal","t":136.59,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 7, '{"takes":[{"name":"Komal","t":159.81,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 8, '{"takes":[{"name":"Komal","t":190.64,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 9, '{"takes":[{"name":"Komal","t":243.87,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 10, '{"takes":[{"name":"Komal","t":298.21,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 11, '{"takes":[{"name":"Komal","t":358.49,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 12, '{"takes":[{"name":"Komal","t":415.66,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 13, '{"takes":[{"name":"Komal","t":5.48,"at":1792474937000}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 14, '{"takes":[{"name":"Komal","t":44.85,"at":1792474976367}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 15, '{"takes":[{"name":"Komal","t":132.75,"at":1792475064269}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 1, 16, '{"takes":[{"name":"Komal","t":184.27,"at":1792475115786}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 2, 13, '{"takes":[{"name":"Komal","t":0,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 2, 14, '{"takes":[{"name":"Komal","t":46.21,"at":1792839034983}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 2, 15, '{"takes":[{"name":"Komal","t":132.75,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 2, 16, '{"takes":[{"name":"Komal","t":184.27,"at":1792760277819}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 3, 17, '{"takes":[{"name":"Take 1","t":0.49,"at":1792833766637}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 3, 18, '{"takes":[{"name":"Take 1","t":55.94,"at":1792833823602}],"cur":0}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();
insert into marks (lesson_id, media_pos, line_idx, payload) values ('rg_durga', 6, 15, '{"t":0,"at":1791759120346}'::jsonb)
  on conflict (lesson_id, media_pos, line_idx) do update set payload = excluded.payload, updated_at = now();

-- ---------- edits: corrections to the written notation ----------
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '0', '{"t":"सा ~रे ~ग म प ~ध ~नि ^सा","at":1792473773680}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '1', '{"t":"^सा ~नि ~ध प म ~ग ~रे सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '2', '{"t":"~नि(स) सा ग(म) म ध(ग) प | ~ग म ग म ~रे ^सा","at":1792473772197}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '3', '{"t":"~_ध(सा) ~_ध(सा) सा | सा ~_नी(सा) ~रे(नी) सा | ~ग ~रे(ग) सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '4', '{"t":"सा ~_नी ~रे सा ~_ध(नी) | ~_ध(नी) | ~_प | {~_प ~_ध ~_नी सा} | ~ग रे(ग) सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '5', '{"t":"_प ~_नी ~_ध(नी) ~_ध(नी) सा | सा ~_नी ~रे सा | सा ~रे(ग) ग | ~ग म ~रे(ग) ~रे(ग) सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '6', '{"t":"सा ~रे(ग) ~ग म | {~ग म ~ग म} ~रे(ग) | ~_ध(_नी) ~_ध(_नी) ~ग(~_ध) ~रे(ग) सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '7', '{"t":"~रे(ग) ~ग रे(ग) |  सा  | ~_ध(_नी)  ग  ~रे  सा  | {सा  रे  ग  म}  | ~ग  म  | {~ग  म  प  म  ~ग  म ~रे(~ग)} | ~_ध(~_नी)  ~_ध(~_नी)  ~ग(~_ध) | सा ~रे सा "}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '8', '{"t":"~ग म प | | ~ग(म) ~ग(म) म(प) प | प ग(म) म | {ग म प म रे(ग)} | सा रे(ग) ग(म) म रे(ग) | ~ग | सा ~रे सा "}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '9', '{"t":"सा ~ग(म) म(प) प | म प ~ग(म) ~ग(म) म प | {प म ~ग म प ~ध} | प | नी ध(नी) प | प ~ग म | ~ग म रे(ग) | सा "}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '10', '{"b":{"0":{"swar":["-","-","-","-","-","-","-","-","-","-","-","-","-","-","~_नी","सा"],"lyric":["-","-","-","-","-","-","-","-","-","-","-","-","-","-","मा","हा"]},"1":{"swar":["प","--","प","प","ध","{पम}","{गुरे}","ग","{गम}","प","ग","{मग}","रे","सा","ध","--"],"lyric":["दे","s","व","म","हे","{ss}","{श्वs}","रे","देs","s","व","{नs}","प","ति","चं","s"]},"2":{"swar":["~_नी","सा","--","सा","~रे","सा","~ग","रे","~ग","-","{पम}","~रे","--","सा","~_नी","सा"],"lyric":["द्र","भा","s","ल","ध","र","ग","रे","मुं","s","{ss}","मा","s","ल","क","र"]},"3":{"swar":["~ग","म","प","~ध","~नी","^सा","^~रे","^सा","~नि","~ध","प","म","~ग","~रे","~_नी","सा"],"lyric":["त्रि","शू","ल","ड","म","रू","ध","र","नी","s","ल","कं","s","ठ","म","हा"]}},"at":1794463269126}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '11', '{"label":"Bandish : Mahadev Maheshwara (Antara)","b":{"0":{"swar":["-","-","-","-","-","-","-","-","-","-","-","-","-","-","~dh","--"],"lyric":["-","-","-","-","-","-","-","-","-","-","-","-","-","-","^pa","s"]},"1":{"swar":["~ध","~ध","~ध","म","~ध","~नी","~नी","सां","--","~नी","सां","~रें","सां","सां","प","~ध"],"lyric":["ch","व","द","न","shi","va","pi","na","s","ka","vi","sha","dha","ra","gau","s"]},"2":{"swar":["{~नीसां}","{रें~गं}","~गं","~गं","~गं","रें","~गं","रें","~गं","मं","~रें","~रें","सां","सां","~^re","{^sa~ni}"],"lyric":["{रीs}","{ss}","ह","re","गि","रि","जा","s","प","ति","शं","s","क","र","त्रि","{पुs}"]},"3":{"swar":["~ध","{पम}","~ग","--","~ग","--","{~गम}","{में}","~ग","म","~रे","~रे","सा","सा","~_नी","सा"],"lyric":["रा","{ss}","री","s","गं","s","{गाs}","s","ध","र","ह","र","ह","र","र","स"]},"4":{"swar":["~ग","म","प","~ध","~नि","^सा","~^रे","^सा","~नि","~ध","प","म","~ग","~रे","~_नी","sa"],"lyric":["दा","s","स","क","ह","त","सु","मि","र","न","क","र","म","न","म","हा"]}},"at":1792382779431}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '12', '{"t":"सा ~ग म ध | ~प म ~ग म | ~रे ~रे सा सा | ~रे सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '13', '{"t":"~ग म ~ग म | प म ~ग म | ~रे ~रे सा ~ग | ~रे सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '14', '{"t":"~_ध ~_नि सा रे | ~ग म ~ग ~रे | ग रे सा ~ध | ~नि सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '15', '{"t":"सा ~_नि रे सा | ~ग रे म ~ग | ~ग ~रे सा म | ~ग ~रे"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '16', '{"t":"सा ~रे _ग म | प म ~ग म | ~रे - सा ~ध | ~ध सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '17', '{"t":"~रे - ~ग म | प म ~ग म | रे - सा {~ग ~म} | {~ग ~रे} सा","at":1791803769814}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '18', '{"t":"~रे सा ~ग ~रे | म ~ग प म | ~ग ~रे सा {~प ~म} | {~ग ~रे} सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '19', '{"t":"ग म प ~ध | प म ग रे | {~ग ~रे} {~सा ~रे} सा ध | {~ग ~रे} सा","at":1791803761383}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '20', '{"t":"प ~ध ~नी सा | ~नी ~ध प म | {~ग ~म} {~ग ~रे} सा ग | रे सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '21', '{"t":"प ~ध ~नी सा | ~रे सा ~नी ~ध | {~प ~म} {~ग ~रे} सा {~ग ~म} | {~ग ~म} {~ग ~रे}","at":1791803741434}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '22', '{"t":"ग म प ध | नि ध प प | ~ग म प ~ध | ~नि ~सा पंच वदन....","at":1791853523213}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '23', '{"t":"प नि ~ध प | ग म {नी ध} प  | प _ध _नी  सा | ~नि ~ध पंच वदन....","at":1791805601990}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '24', '{"t":"नी ध प प | {ग म} {प ध} {नि ध} प | प ध नि {सा नि} | {सा नि} ~ध पंच वदन....","at":1791805684523}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '25', '{"t":"सा _रे _ग प | ध नि ध प | {प ध}  {नि सा} {रे सा} {नि ध} | {सा नि} ~ध पंच वदन....","at":1791805708403}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '26', '{"t":"~ग प ~ध सा  | ~रे ~^ग ~रे सा | {सा नी} {रे सा} {ग रे} सा  | ~नी  ~ध  पंच वदन....","at":1791805768410}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '27', '{"t":"सा ~रे ~ग प | ध सा रे सा | {^_रे ^_ग} {^_रे ^_ग} ^_रे सा | ~ध ~ध पंच वदन....","at":1791805865798}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '28', '{"t":"रे ~_नी सा रे | ~ग प ~ध सा | {प ~ध} {सा ^~रे} {~ग ~रे} {~नी  ~ध} | प ~ध पंच वदन...."}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '29', '{"t":"{रे ~नी} {सा रे} ग {~रे ~ग} | म  {~ग ~रे} {~ग ~रे} {~नी ~ध} | {प ध} {सा रे} ~ग ~रे | {नी ध} सा पंच वदन...."}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '30', '{"t":"{सा ^रे} {~ग ~रे} ~_नी  ~_ध  | {_प ~_ध } {सा ~रे} ~^ग प  | {_ग  प } {~ध ~नी} ~ध  म | {~ग  ~रे} {~ग प} पंच वदन....","at":1791806491687}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '31', '{"t":"{~ग ~रे} {~ग ~प} {~ध ~नी} {~ध ~म} | ग  रे  ग  प  | {प ध} {सा ^रे} {~^ग ~^ग} {~^रे ~^ग} | ~^रे  सा  पंच वदन...."}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '32', '{"b":{"0":{"swar":["-","-","-","-","{गम}","{गम}","{पम}","{गरे}","{गरे}","{गरे}","सा","क(सा)","र({गरे})","न(सा)","महा","देव","...."],"lyric":[]}},"at":1791890397508}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '33', '{"b":{"0":{"swar":["-","-","-","-","{सारे}","{गम}","{पम}","{गरे}","{गरे}","{गरे}","सा","क(सा)","र({गरे})","न(सा)","महा","देव","...."],"lyric":[]}},"at":1791890813551}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '34', '{"b":{"0":{"swar":["-","-","-","-","_ध_नि","सारे","गम","गरे","गरे","सा_नि","सा","{धनि}","{धनि}","सा","महा","देव","...."],"lyric":[]}},"at":1791891183985}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '35', '{"b":{"0":{"swar":["-","-","-","-","_ध_नि","_धसा","_निसा","_निरे","साग","रेसा","_निसा","{मग}","{रेसा}","सा","महा","देव","...."],"lyric":[]}},"at":1791891804518}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '36', '{"b":{"0":{"swar":["-","-","-","-","_ध_नि","_धसा","_निसा","सारे","गम","गरे","सा","{पम}","~ग~रे","सा","महा","देव","...."],"lyric":[]}},"at":1791892188948}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '37', '{"b":{"0":{"swar":["-","-","-","-","_प_ध","_निसा","रेसा","गरे","मग","रेसा","_नीसा","{सारे}","{गम}","{गरे}","महा","देव","...."],"lyric":[]}}}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '38', '{"b":{"0":{"swar":["-","-","-","-","_प_नि","_धसा","_निरे","साग","रेम","गरे","सा","{सारे}","{~गम}","प","महा","देव","...."],"lyric":[]}},"at":1791978364234}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '39', '{"b":{"0":{"swar":["-","-","-","-","_पध","_निसा","रेसा","सारे","गम","गरे","सा","{सारे}","{~गम}","प","महा","देव","...."],"lyric":[]}}}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '40', '{"b":{"0":{"swar":["-","-","-","-","_ध_नि","सारे","गग","सारे","गम","गरे","सा","{सारे}","{~गम}","प","महा","देव","...."],"lyric":[]}},"at":1791980215641}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '41', '{"b":{"0":{"swar":["-","-","-","-","सारे","ग","रेग","म","गम","गरे","सा","{सारे}","{~गम}","प","महा","देव","...."],"lyric":[]}},"at":1791980457425}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '42', '{"b":{"0":{"swar":["-","-","-","-","रेग","म","गम","प","पम","गरे","सा","{सारे}","{~गम}","प","महा","देव","...."],"lyric":[]}},"at":1791980530375}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '43', '{"b":{"0":{"swar":["-","-","-","-","रेग","रेग","म","गम","गम","गरे","सा","{सारे}","{~गम}","प","महा","देव","...."],"lyric":[]}},"at":1791980584613}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '44', '{"b":{"0":{"swar":["-","-","-","-","गम","प","पम","ग","रेग","रेसा","नीसा","{सारे}","{~गम}","प","महा","देव","...."],"lyric":[]}}}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '45', '{"b":{"0":{"swar":["-","-","-","-","पम","गरे","गरे","सा","_ध_नि","सारे","_निसा","{सारे}","{~गम}","प","महा","देव","...."],"lyric":[]}},"at":1791980697825}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '46', '{"b":{"0":{"swar":["-","-","-","-","सारे","गम","पध","पम","गम","गरे","सा","{सारे}","{~गम}","प","महा","देव","...."],"lyric":[]}},"at":1791980738410}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '1000', '{"t":"~ग म प ~ध(नी) प | प ~ध ~नी सा ~ध(नी) | ~ध(नी) प सा ~ग(म) म(प) ध(म) प | ~ध प {म ~ग} | {~ग म प म रे(ग)} | ~रे(म) सा ","label":"Mukt Aalap 8","sect":"mukt","at":1791801629439}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '1001', '{"t":"प ध(नी) ध(नी) नी(सा) सा | ध(नी) ध(नी) नी(सा) सा | नी सा ध(नी) | प | ~ग म प नी ~ध(नी) प | {प ~ध प ~ध} प म | {म प म प} म ~ग | ग रे(ग) सा ","label":"Mukt Aalap 9","sect":"mukt","at":1791801629439}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '1002', '{"t":"~ध(नी) ~ध(नी) ~नी(सा) सा | ~ध(नी) ~ध(नी) सा | ~ध ~नी सा ~^रे | सा | सा ~नी ~रे(नी) सा ~ध(नी) प | {प ~ध ~नी सा ~^रे सा ~ध} | प | ~ध प {म ~ग} | {सा ~ग म प ~ग म ~रे(ग) }| ~_ध ग - [ग म ग ग] सा ~रे सा ","label":"Mukt Aalap 10","sect":"mukt"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '1003', '{"del":true,"at":1794463269126}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '1004', '{"del":true,"at":1794463269126}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhairavi', '1005', '{"del":true,"at":1794463269126}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhimpalasi', '7', '{"b":{"0":{"swar":["-","-","-","-","-","-","-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","","","","","","","",""]}}}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_bhimpalasi', '1000', '{}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '0', '{"t":"सा रे म प ध ^सा","at":1792473372674}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1', '{"t":"^सा ध प म रे सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '2', '{"t":"रे म प , ध म प ध , म रे सा","at":1792838251969}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '3', '{"t":"सा _ध(sa) _ध(sa) सा | _ध सा रे | _ध(sa) _ध(sa) सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '4', '{"t":"सा रे _ध(sa) सा | सा _ध(sa) _प | _म _प _ध | _ध(sa) _ध(sa) सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '5', '{"t":"_म _प _ध(sa) _ध(sa) सा | सा _ध सा रे | रे _ध(sa) _ध(sa) सा","at":1792315470756}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '6', '{"t":"_ध सा रे म रे | _ध रे _ध(sa) _ध(sa) सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '7', '{"t":"सा र म रे(ma) | _ध सा रे म रे(ma) | _ध रे _ध(sa) _ध(sa) सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '8', '{"t":"सा re म | _ध सा रे म | रे(ma) म प | रे(ma) रे(ma) प | {म प ma प <ध} म> रे | सा रे ध(sa) सा","at":1792315823432}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '9', '{"t":"re म प | ma pa <ध ma> re | {सा र ma pa} <ध ma> re | रे(म) रे(ma) प | <dha ma> re | sa re _dha(sa) sa"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '10', '{"t":"ma pa ध प | ^सा ध(sa) प | ^sa ^re dha(sa) pa | ^sa {dha pa ma} | re ma re pa | ma pa dha {pa ma} | ma re sa","at":1792838582675}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '11', '{"t":"ध {प म} | ^सा {ध प म} | रे म प ध प म | म रे | {सा रे सा सा} _ध | _म _प _ध(sa) _dha(sa) सा","at":1792891003665}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '12', '{"t":"म प ध(sa) ध(sa) ^सा | ^सा ध | म प ध ^सा {dha pa ma} | रे म रे प | {म प ध प ध} प म | म रे सा","at":1792838080527}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '13', '{"t":"म ध(sa) ध(sa) ^सा | ^सा {ध प म} | म प ध(sa) ध(sa) ^sa | {^सा ^रे ^सा ^sa} ध प म | म प ध ^सा {ध प म} | म रे प | {म प ध प ध} प म | म रे(ma) _ध(sa) सा","at":1792891346797}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '14', '{"t":"ध(sa) ^सा | {प ध प म रे म रे सा रे म प} ध(sa) | ध(sa) ^सा | प ध ^सा ^रे ध(sa) | ^रे ध(sa) | ध(sa) ध(sa) ^सा | ध ^sa {ध प म} | म रे प | {म प ध ^सा ^रे} ध(sa) ध(sa) ^सा | {^सा ^रे ^सा ^sa} ध(sa) प | {म प ध प ध} म रे(ma) | रे(ma) रे(ma) _ध(sa) सा"}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '15', '{"t":"म प ध(sa) ध(sa) ^सा | ध ^सा ^रे ^म ^रे(ma) ^सा | ^सा ^रे ^सा ^sa ध(sa) प | म प ध ^सा ध(sa) प | {म प म प ध} म रे(ma) | म प ध ^सा ध(sa) प | र म प ध म रे(ma) | re प | म प ध सा {ध प म} रे | _ध(sa) _ध(sa) सा","at":1792839515359}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '16', '{"t":"ध ^रे ^सा | ध प म रे । म प ध(sa) ध(sa) ^सा | ध ^सा ^रे {सा ^रे ^सा ^सा} ध(sa) | {ध ^स ^re ^म ^रे} | {^सा ^रे ^sa ^sa} ध(sa) | म प ध ^sa ध(sa) प | प ध म प रे म re प | म प ध(sa) ध(sa) प | re म | {re ma प ध म प ध} pa | ध प म रे | _ध(sa) _ध(sa) सा","at":1792839714012}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '17', '{"label":"Bandish : Sakhi Mori (Sthayi)","b":{"0":{"swar":["pa","pa","{2.re.ma.pa.dha.ma.pa.dha}","","dha","dha","{pa ma}","re(ma)","re(ma)","sa"],"lyric":["sa","khi","mo","--","ri","roo","ma","jhoo","--","ma"]},"1":{"swar":["{saa dha}","sa","{ma re}","pa","pa","mapa","dha","padha","{2.sa.sa.dha.pa.ma.ma.re.sa}",""],"lyric":["baa","--","da","--","la","gara","je","{ba ra}","se","--"]}},"at":1794463269125}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '18', '{"label":"Bandish : Sakhi Mori (Antara)","b":{"0":{"swar":["ma","--","{sa dha}","{sa dha}","dha","sa","--","sa","dha","sa"],"lyric":["rai","--","naa","--","^a","dhe","--","--","--","ree"]},"1":{"swar":["sa","dha","sa","re","re","ma","re","{sa re sa sa}","{dha sa}","{dha pa ma}"],"lyric":["kaa","ree","bi","juu","ree","cha","ma","ke","--","--"]},"2":{"swar":["pa","pa","{2.re.ma.pa.dha.ma.pa.dha}","","dha","dhapa","ma","re","re","sa"],"lyric":["kai","se","jaa","--","u","ja","la","bha","ra","na"]}},"bd":{"rows":3},"at":1792840274230}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '19', '{"b":{"0":{"swar":["baa","--","da"],"lyric":[]}},"at":1792189284517}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '54', '{"b":{"0":{"swar":["-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","",""]},"1":{"swar":["-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","",""]},"2":{"swar":["-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","",""]},"3":{"swar":["-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","",""]},"4":{"swar":["-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","",""]},"5":{"swar":["-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","",""]}}}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '55', '{"b":{"0":{"swar":["-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","",""]},"1":{"swar":["-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","",""]},"2":{"swar":["-","-","-","-","-","-","-","-","-","-"],"lyric":["","","","","","","","","",""]}}}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1000', '{"del":true,"at":1794463269121}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1001', '{"del":true,"at":1794463269121}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1002', '{"del":true,"at":1794463269121}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1003', '{"del":true,"at":1794463269122}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1004', '{"del":true,"at":1794463269123}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1005', '{"del":true,"at":1794463269123}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1006', '{"del":true,"at":1794463269123}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1007', '{"del":true,"at":1794463269123}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1008', '{"del":true,"at":1794463269124}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1009', '{"del":true,"at":1794463269124}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1010', '{"del":true,"at":1794463269124}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1011', '{"del":true,"at":1794463269125}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();
insert into edits (lesson_id, line_key, payload) values ('rg_durga', '1012', '{"del":true,"at":1794463269125}'::jsonb)
  on conflict (lesson_id, line_key) do update set payload = excluded.payload, updated_at = now();

-- ---------- manch: performances ----------
delete from manch;
insert into manch (video_id, name, place, perf_date, created_at) values ('M4u_vobMPlk', '20251024 · Carnegie primary school · Grade 4 Diwali celebration', 'Carnegie Primary School', '2025', to_timestamp(1792803125570/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('1xp2C8K2lQ8', '20241013 · Bola to mrudunga', 'Melbourne Home', '2024', to_timestamp(1792803201303/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('96o6QOqIMgU', '20240908 Melbourne Ganpati Festival https://www.youtube.com/live/PTgkXemxaRg?si=m3Octk632QYQxo5E', 'Melbourne Ganapati Festival', '2024', to_timestamp(1792803246456/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('WbJR244CGO4', '11 August', 'Raghvendra Swami Math Chudi Puja', '2024', to_timestamp(1792804128176/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('Xdxquur5Jgw', '20260621 Raag Bhairavi · riaaz session · Melbourne Hindustan Music Society', 'Camberwell', '2026', to_timestamp(1792804254264/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('3v82BioKD7k', '20240122 · Ram Ram Ram', 'Melbourne Home', '2024', to_timestamp(1792804342062/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('nRZx3DEyj3A', '24 October', 'Melbourne Home - Narayani', '2023', to_timestamp(1792804378599/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('vKTU0ziswVg', '20230211 · 26th Pattabhishek Vardanti Bhajan Seva', 'Karla', '11 feb 2023', to_timestamp(1792804488914/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('OaY54Jb6Tbs', '20230108 · Sangam · Nirguna Sagunakaram', 'Home - Nirguna Full', '8 jan 2023', to_timestamp(1792804691152/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('9XMIrdAf5KU', 'Sangam', 'Home - Sangam', '8 jan 2023', to_timestamp(1792804744286/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('aLsPOnLz4wo', '20221111 Saraswati vandana', 'Home', '11 Nov 2022', to_timestamp(1792804782990/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('Hql8upM2O-k', '20221005 · Jai Devi Jai Devi', 'Home', '5 Oct 2022', to_timestamp(1792804808187/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('6DMLarKqRsU', 'More nachate', 'Home - Sangam', '29 May 2022', to_timestamp(1792804834754/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('kJhhajAIob4', 'Atharv''s Performance', 'Home - Andheri Sabha Diwali', '13 Nov 2020', to_timestamp(1792804880042/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('iq225mjwZ8U', '20201109 · Ramaha Yati · Rehersal', 'Home - Diwali Program', '09 Nov 2020', to_timestamp(1792804940110/1000.0));
insert into manch (video_id, name, place, perf_date, created_at) values ('QEB-wBSUeRk', '20261025 · Raag Durga · Riyaz Session', 'North Balwyn', '20261025', to_timestamp(1792925496890/1000.0));

-- ---------- favs: the practice programme ----------
delete from favs;
insert into favs (kind, lesson_id, sect, line_idx, label, sort_order) values ('page', 'rg_bhairavi', 'aaroh', null, '', 0);

commit;

-- check: expect the counts above
-- select 'marks' t, count(*) from marks union all
-- select 'edits', count(*) from edits union all
-- select 'manch', count(*) from manch union all
-- select 'favs',  count(*) from favs;