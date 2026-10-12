/* Riyaz — Gurukool sargam practice
   Notation (Devanagari) + audio from Google Drive + a moving underline
   and per-line timings you set by ear with the stopwatch button. */
(function () {
  "use strict";
  var D = window.SANGEET || { lessons: [] };
  var GROUPS = ["Alankar", "Taal", "Raag"];
  var TABS = ["Favourites"].concat(GROUPS);

  var state = {
    group: localStorage.getItem("sk_group") || "Alankar",
    lessonId: localStorage.getItem("sk_lesson") || null,
    mediaIdx: 0,
    cur: -1,
    raf: 0,
    audio: null,
    segments: {},     // lessonId -> { lineIndex: {track, t} }   (local overrides)
    segPlay: null,     // {line, start, end, loop}
    segLoop: true,
    lineRows: [],
    sharedMarks: null, // marks.json loaded from the repo (shared across devices)
    cleared: {},       // lessons whose marks were cleared in this session
    edits: {},         // user corrections to the written notation
    editMode: false,   // is the notation editor open
    raagSect: null,    // which part of a raag is showing (aaroh / mukt / …)
    raagOpen: {},      // which raags are expanded in the rail
    fav: [],           // favourites: { id, m, sect, line } in the order you lined them up
    favAt: 0,          // when the list was last changed (for cross-device sync)
    playingLine: -1,   // which line the play button is currently running
    lineBtns: {}       // lineIndex -> its play button
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };

  function esc(s){ return String(s).replace(/[&<>]/g, function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];}); }

  /* ---------- notation tokeniser ---------- */
  function tokenize(text) {
    return text.split(/\s+/).filter(Boolean).map(function (tok) {
      if (tok === "|" || tok === "/" || tok === "।" || tok === "-" || tok === ",") {
        return { sep: true, t: tok === "," ? "," : (tok === "-" ? "–" : "|") };
      }
      var oct = 0, t = tok;
      if (t[0] === "^") { oct = 1; t = t.slice(1); }
      else if (t[0] === "_") { oct = -1; t = t.slice(1); }
      if (t.indexOf("\u093c") >= 0) { oct = -1; t = t.replace(/\u093c/g, ""); }
      return { sep: false, t: t, oct: oct };
    });
  }

  /* ---------- media url ---------- */
  function audioSources(m) {
    return [
      "audio/" + m.id + ".mp3",  // self-hosted in this repo (same origin on GitHub Pages)
      "https://raw.githubusercontent.com/akshaybangalorekar/riyaz/main/audio/" + m.id + ".mp3",
      "https://drive.usercontent.google.com/download?id=" + m.id + "&export=download&confirm=t"
    ];
  }
  function videoSrc(m) {
    return "https://drive.usercontent.google.com/download?id=" + m.id + "&export=download&confirm=t";
  }
  function mediaURL(m) {
    if (m.kind === "video") return "https://drive.google.com/file/d/" + m.id + "/preview";
    return audioSources(m)[0];
  }

  /* ---------- chrome ---------- */
  function renderTabs() {
    var el = $("#tabs");
    el.innerHTML = TABS.map(function (g) {
      return '<button class="sk-tab' + (g === state.group ? " on" : "") + '" data-g="' + g + '">' + g + "</button>";
    }).join("");
    Array.prototype.forEach.call(el.children, function (b) {
      b.onclick = function () {
        state.group = b.dataset.g;
        localStorage.setItem("sk_group", state.group);
        renderTabs();
        renderList();
        if (state.group === "Favourites") { renderFavStage(); return; }
        var first = lessonsOf(state.group)[0];
        if (first) open(first.id);
      };
    });
  }
  function lessonsOf(g) { return D.lessons.filter(function (l) { return l.group === g; }); }

  /* ---------- favourites (the programme line-up) ---------- */
  function favKey(e) { return e.id + "|" + (e.sect || "") + "|" + e.line; }
  var FAVS = "https://api.github.com/repos/akshaybangalorekar/riyaz/contents/favs.json";
  function favLoad() {
    try {
      var raw = JSON.parse(localStorage.getItem("sk_fav") || "null");
      if (raw && raw.list) { state.fav = raw.list || []; state.favAt = raw.at || 0; }
      else if (Array.isArray(raw)) { state.fav = raw; state.favAt = 0; }
      else { state.fav = []; state.favAt = 0; }
    } catch (e) { state.fav = []; state.favAt = 0; }
  }
  function favWriteLocal() {
    try { localStorage.setItem("sk_fav", JSON.stringify({ at: state.favAt, list: state.fav })); } catch (e) {}
  }
  function favSave() { state.favAt = Date.now(); favWriteLocal(); favSchedulePush(); }
  var favTimer = 0;
  function favSchedulePush() {
    if (!getToken() || favTimer) return;
    favTimer = setTimeout(function () { favTimer = 0; favPush(); }, 2500);
  }
  function favPush(cb) {
    var tok = getToken();
    if (!tok) { if (cb) cb("no-token"); return; }
    ghGet(tok, FAVS).then(function (cur) {
      if (!cur.ok) { if (cb) cb("unreadable"); return; }
      var body = { message: "Update favourites", branch: "main",
        content: b64(JSON.stringify({ at: state.favAt || Date.now(), list: state.fav }, null, 1)) };
      if (cur.sha) body.sha = cur.sha;
      var h = ghHdr(tok); h["Content-Type"] = "application/json";
      return fetch(FAVS, { method: "PUT", keepalive: true, cache: "no-store", headers: h, body: JSON.stringify(body) });
    }).then(function (r) { if (cb) cb(r && r.ok ? "ok" : "fail"); })
      .catch(function () { if (cb) cb("net"); });
  }
  function favPull(cb) {
    var tok = getToken();
    var p = tok ? ghGet(tok, FAVS).then(function (c) { return c.data; })
                : fetchPublic("favs.json?t=" + Date.now());
    p.then(function (j) {
      if (!j || typeof j !== "object" || !j.list) { if (cb) cb("fail"); return; }
      if ((j.at || 0) > (state.favAt || 0)) {          // the other device has the newer list
        state.fav = j.list || []; state.favAt = j.at || 0;
        favWriteLocal();
        renderList();
        if (state.group === "Favourites") renderFavStage();
      }
      if (cb) cb("ok");
    }).catch(function () { if (cb) cb("fail"); });
  }
  function favIdx(id, sect, line) {
    var k = id + "|" + (sect || "") + "|" + line;
    for (var i = 0; i < state.fav.length; i++) if (favKey(state.fav[i]) === k) return i;
    return -1;
  }
  function favHas(id, sect, line) { return favIdx(id, sect, line) >= 0; }
  function favLine(l, li) { return (l.lines && l.lines[li] ? l.lines[li].label : "") || ""; }
  function favLabel(e) {
    var l = lesson(e.id); if (!l) return e.id;
    var bits = [l.title];
    if (e.sect) bits.push(raagSectLabel(e.sect));
    var ln = favLine(l, e.line);
    if (ln) bits.push(ln);
    return bits.join(" \u00b7 ");
  }
  function favFirstAudio(l, sect) {
    if (sect) { var p = raagSectParts(l, sect); if (p.media.length) return p.media[0]; }
    var ms = l.media || [];
    for (var i = 0; i < ms.length; i++) if (ms[i].kind === "audio") return i;
    return ms.length ? 0 : -1;
  }
  function favToggle(id, sect, line, m) {
    var i = favIdx(id, sect, line);
    if (i >= 0) state.fav.splice(i, 1);
    else state.fav.push({ id: id, m: m, sect: sect || null, line: line });
    favSave(); renderList();
  }
  function favClear() { state.fav = []; favSave(); renderList(); }
  // every line under a rail heading
  function scopeLines(scope) {
    var out = [];
    function addLines(l, sect, m) {
      var idxs = [];
      if (sect) idxs = raagSectParts(l, sect).lines;
      else (l.lines || []).forEach(function (_, i) { idxs.push(i); });
      idxs.forEach(function (li) { out.push({ id: l.id, m: m, sect: sect || null, line: li }); });
    }
    if (scope.kind === "raag") {
      var l = lesson(scope.id);
      raagSections(l).forEach(function (x) { addLines(l, x.k, favFirstAudio(l, x.k)); });
    } else if (scope.kind === "part") {
      var l2 = lesson(scope.id);
      addLines(l2, scope.sect, favFirstAudio(l2, scope.sect));
    } else if (scope.kind === "taal") {
      lessonsOf("Taal").filter(function (x) { return (x.taal || "Taal") === scope.key; })
        .forEach(function (x) { addLines(x, null, favFirstAudio(x, null)); });
    } else if (scope.kind === "alankarSec") {
      lessonsOf("Alankar").forEach(function (x) {
        var m = mediaIdxFor(x, scope.key);
        if (m >= 0) addLines(x, null, m);
      });
    }
    return out;
  }
  function scopeAllFav(scope) {
    var list = scopeLines(scope);
    if (!list.length) return false;
    return list.every(function (e) { return favHas(e.id, e.sect, e.line); });
  }
  function favToggleScope(scope) {
    var list = scopeLines(scope), all = scopeAllFav(scope);
    if (all) {
      state.fav = state.fav.filter(function (e) {
        return !list.some(function (x) { return x.id === e.id && x.sect === (e.sect || null) && x.line === e.line; });
      });
    } else {
      list.forEach(function (e) { if (!favHas(e.id, e.sect, e.line)) state.fav.push(e); });
    }
    favSave(); renderList();
  }

  /* ---------- raag parts ---------- */
  var RAAG_SECS = [
    { k: "aaroh",   t: "आरोह · अवरोह · पकड़" },
    { k: "mukt",    t: "मुक्त आलाप" },
    { k: "laikari", t: "लयकारी" },
    { k: "tana",    t: "तान" },
    { k: "bandish", t: "बंदिश" }
  ];
  function raagSect(x) {
    var t = (x || "").toLowerCase();
    if (/aaroh|avroh|pakad|आरोह|अवरोह|पकड/.test(t)) return "aaroh";
    if (/mukt aalap|मुक्त आलाप/.test(t)) return "mukt";
    if (/laikari|लयकारी/.test(t)) return "laikari";
    if (/tana|तान/.test(t)) return "tana";
    return "bandish";   // bandish, khayal, antara, sthayi, taal and anything else
  }
  function raagSectParts(l, k) {
    var lines = [], media = [];
    (l.lines || []).forEach(function (ln, i) { if (raagSect(ln.label) === k) lines.push(i); });
    (l.media || []).forEach(function (m, i) { if (raagSect(m.name) === k) media.push(i); });
    return { lines: lines, media: media };
  }
  function raagSections(l) {
    return RAAG_SECS.filter(function (x) { var p = raagSectParts(l, x.k); return p.lines.length || p.media.length; });
  }
  function raagOrderList() {
    var ids = lessonsOf("Raag").map(function (l) { return l.id; });
    var saved = [];
    try { saved = JSON.parse(localStorage.getItem("sk_raag_order") || "[]") || []; } catch (e) {}
    var out = saved.filter(function (id) { return ids.indexOf(id) >= 0; });
    ids.forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); });
    return out;
  }
  function moveRaag(id, dir) {
    var list = raagOrderList(), i = list.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    list.splice(j, 0, list.splice(i, 1)[0]);
    try { localStorage.setItem("sk_raag_order", JSON.stringify(list)); } catch (e) {}
    renderList();
  }
  function raagSectLabel(k) {
    var hit = RAAG_SECS.filter(function (x) { return x.k === k; })[0];
    return hit ? hit.t : "";
  }

  function sunHTML(on, cls, attrs) {
    return '<button class="sun' + (on ? " on" : "") + (cls ? " " + cls : "") + '" type="button" ' + (attrs || "") +
      ' title="' + (on ? "Remove from favourites" : "Add to favourites") + '">\u2600</button>';
  }
  function alNumber(l) { var m = /(\d+)/.exec(l.title || ""); return m ? +m[1] : 0; }
  function mediaIdxFor(l, kind) {
    var ms = l.media || [];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (kind === "video") { if (m.kind === "video") return i; }
      else if (m.kind === "audio" && m.tr === kind) return i;
    }
    return -1;
  }
  function renderList() {
    var el = $("#list");
    if (state.group === "Favourites") {
      el.classList.add("sections");
      if (!state.fav.length) {
        el.innerHTML = '<div class="sk-sec"><div class="sk-empty" style="padding:24px 8px">Nothing lined up yet.<br>' +
          '<span class="sk-dim">Tap a \u2600 beside a heading in the rail, or beside a line on the page.</span></div></div>';
      } else {
        el.innerHTML = '<div class="sk-sec">' +
          '<div class="sk-favbar"><span class="sk-sec-h" style="margin:0">Programme (' + state.fav.length + ')</span>' +
          '<button class="sk-btn" id="favClear">Clear all</button></div>' +
          state.fav.map(function (e, i) {
            var on = (e.id === state.lessonId && (e.sect || null) === (state.raagSect || null)) ? " on" : "";
            return '<div class="sk-row"><button class="sk-item' + on + '" data-fi="' + i + '">' + esc(favLabel(e)) + "</button>" +
              sunHTML(true, "rail", 'data-fi="' + i + '"') + "</div>";
          }).join("") + "</div>";
        var cb = $("#favClear"); if (cb) cb.onclick = favClear;
        Array.prototype.forEach.call(el.querySelectorAll(".sk-item"), function (b) {
          b.onclick = function () { openFav(+b.dataset.fi); };
        });
        Array.prototype.forEach.call(el.querySelectorAll(".sun"), function (b) {
          b.onclick = function (ev) { ev.stopPropagation(); state.fav.splice(+b.dataset.fi, 1); favSave(); renderList(); };
        });
      }
      return;
    }
    if (state.group === "Alankar") {
      el.classList.add("sections");
      var secs = [{ k: "komal", h: "Komal" }, { k: "shuddha", h: "Shuddha" }, { k: "video", h: "Alankar + Taal" }];
      var html = "";
      secs.forEach(function (sec) {
        var items = lessonsOf("Alankar").filter(function (l) { return mediaIdxFor(l, sec.k) >= 0; })
          .sort(function (a, b) { return alNumber(a) - alNumber(b); });
        if (!items.length) return;
        var sc = { kind: "alankarSec", key: sec.k };
        html += '<div class="sk-sec"><div class="sk-sec-h"><span>' + sec.h + "</span>" +
          sunHTML(scopeAllFav(sc), "rail", 'data-scope="' + sec.k + '" data-kind="alankarSec"') + '</div><div class="sk-grid">' +
          items.map(function (l) {
            var i = mediaIdxFor(l, sec.k);
            var on = (l.id === state.lessonId && state.mediaIdx === i) ? " on" : "";
            return '<button class="sk-num' + on + '" data-id="' + l.id + '" data-m="' + i + '">' + alNumber(l) + "</button>";
          }).join("") + "</div></div>";
      });
      el.innerHTML = html;
      Array.prototype.forEach.call(el.querySelectorAll(".sk-num"), function (b) {
        b.onclick = function () { open(b.dataset.id, +b.dataset.m); };
      });
      Array.prototype.forEach.call(el.querySelectorAll(".sun"), function (b) {
        b.onclick = function (e) { e.stopPropagation(); favToggleScope({ kind: b.dataset.kind, key: b.dataset.scope }); };
      });
      return;
    }
    if (state.group === "Taal") {
      el.classList.add("sections");
      var tl = lessonsOf("Taal"), count = {};
      tl.forEach(function (l) { var k = l.taal || "Taal"; count[k] = (count[k] || 0) + 1; });
      var order = [], groups = {};
      tl.forEach(function (l) {
        var k = l.taal || "Taal";
        if (!groups[k]) { groups[k] = []; order.push(k); }
        groups[k].push(l);
      });
      el.innerHTML = order.map(function (k) {
        var g = groups[k];
        if (g.length === 1) {                       // single file: name – matras on one row
          var l = g[0];
          return '<div class="sk-sec"><button class="sk-item' + (l.id === state.lessonId ? " on" : "") + '" data-id="' + l.id + '">' +
            '<span class="sk-big">' + esc(k) + '</span>' +
            (l.sub ? '<span class="sk-dash">\u2013</span><span class="sk-small">' + esc(l.sub) + "</span>" : "") +
            "</button></div>";
        }
        var sc2 = { kind: "taal", key: k };
        return '<div class="sk-sec"><div class="sk-sec-h"><span>' + esc(k) + "</span>" +
          sunHTML(scopeAllFav(sc2), "rail", 'data-scope="' + esc(k) + '" data-kind="taal"') + "</div>" +   // several: one heading
          g.map(function (l) {
            return '<button class="sk-item' + (l.id === state.lessonId ? " on" : "") + '" data-id="' + l.id + '">' +
              esc(l.title) + (l.sub ? '<span class="sk-sub">' + esc(l.sub) + "</span>" : "") + "</button>";
          }).join("") + "</div>";
      }).join("");
      Array.prototype.forEach.call(el.querySelectorAll(".sk-item"), function (b) {
        b.onclick = function () { open(b.dataset.id); };
      });
      Array.prototype.forEach.call(el.querySelectorAll(".sun"), function (b) {
        b.onclick = function (e) { e.stopPropagation(); favToggleScope({ kind: "taal", key: b.dataset.scope }); };
      });
      return;
    }
    if (state.group === "Raag") {
      el.classList.add("sections");
      el.innerHTML = raagOrderList().map(function (id) { return lesson(id); }).filter(Boolean).map(function (l) {
        var open = state.raagOpen[l.id];
        if (open === undefined) open = (l.id === state.lessonId);
        return '<div class="sk-sec">' +
          '<div class="sk-raagh">' +
          '<button class="sk-sec-h raag raagtoggle" data-r="' + l.id + '">' +
            '<span class="car">' + (open ? "\u25be" : "\u25b8") + "</span>" + esc(l.title) + "</button>" +
          sunHTML(scopeAllFav({ kind: "raag", id: l.id }), "rail", 'data-scope="' + l.id + '" data-kind="raag"') +
          '<span class="sk-move">' +
            '<button class="mv" data-r="' + l.id + '" data-d="-1" title="Move up">\u25b2</button>' +
            '<button class="mv" data-r="' + l.id + '" data-d="1" title="Move down">\u25bc</button>' +
          "</span></div>" +
          (open ? raagSections(l).map(function (x) {
            var on = (l.id === state.lessonId && state.raagSect === x.k) ? " on" : "";
            return '<div class="sk-row"><button class="sk-item' + on + '" data-id="' + l.id + '" data-s="' + x.k + '">' +
              esc(x.t) + "</button>" +
              sunHTML(scopeAllFav({ kind: "part", id: l.id, sect: x.k }), "rail",
                'data-scope="' + l.id + '" data-sect="' + x.k + '" data-kind="part"') + "</div>";
          }).join("") : "") + "</div>";
      }).join("");
      Array.prototype.forEach.call(el.querySelectorAll(".mv"), function (b) {
        b.onclick = function (e) { if (e) e.stopPropagation(); moveRaag(b.dataset.r, +b.dataset.d); };
      });
      Array.prototype.forEach.call(el.querySelectorAll(".raagtoggle"), function (b) {
        b.onclick = function () {
          var id = b.dataset.r, cur = state.raagOpen[id];
          if (cur === undefined) cur = (id === state.lessonId);
          state.raagOpen[id] = !cur;
          renderList();
        };
      });
      Array.prototype.forEach.call(el.querySelectorAll(".sk-item"), function (b) {
        b.onclick = function () { open(b.dataset.id, -1, b.dataset.s); };
      });
      Array.prototype.forEach.call(el.querySelectorAll(".sun"), function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          favToggleScope({ kind: b.dataset.kind, id: b.dataset.scope, sect: b.dataset.sect, key: b.dataset.scope });
        };
      });
      return;
    }
    el.classList.remove("sections");
    el.innerHTML = lessonsOf(state.group).map(function (l) {
      return '<button class="sk-item' + (l.id === state.lessonId ? " on" : "") + '" data-id="' + l.id + '">' +
        esc(l.title) + (l.sub ? '<span class="sk-sub">' + esc(l.sub) + "</span>" : "") + "</button>";
    }).join("");
    Array.prototype.forEach.call(el.children, function (b) {
      b.onclick = function () { open(b.dataset.id); };
    });
  }

  /* ---------- lesson ---------- */
  function lesson(id) { return D.lessons.filter(function (l) { return l.id === id; })[0]; }

  function stopAll() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (state.audio) { try { state.audio.pause(); } catch (e) {} state.audio = null; }
    state.segPlay = null; state.lineRows = [];
  }

  function setRail(hidden) {
    var m = document.querySelector(".sk-main");
    if (!m) return;
    m.classList.toggle("rail-hidden", !!hidden);
    var b = $("#btnRail");
    if (b) { b.textContent = hidden ? "\u203a" : "\u2039"; b.setAttribute("aria-expanded", hidden ? "false" : "true"); }
  }
  function toggleRail() {
    var m = document.querySelector(".sk-main");
    setRail(!(m && m.classList.contains("rail-hidden")));
  }

  function renderFavStage() {
    var st = $("#stage");
    if (!st) return;
    st.innerHTML = '<div class="sk-h1">Favourites</div>' +
      '<div class="sk-dim" style="margin-top:6px">' +
      (state.fav.length
        ? state.fav.length + " item" + (state.fav.length > 1 ? "s" : "") +
          " lined up. Tap one in the rail to open it and play it straight away."
        : "Nothing lined up yet \u2014 tap a \u2600 beside a heading in the rail, or beside a line on the page.") +
      "</div>";
  }

  function openFav(i) {
    var e = state.fav[i];
    if (!e) return;
    open(e.id, e.m, e.sect);
    setTimeout(function () { playLine(e.line); }, 120);
  }

  function open(id, mIdx, sect) {
    var l = lesson(id);
    if (!l) return;
    stopAll();
    state.lessonId = id;
    state.raagSect = sect || null;
    if (l.group === "Raag" && !state.raagSect) {      // one part per page, never the whole raag
      var rs = raagSections(l);
      if (rs.length) state.raagSect = rs[0].k;
    }
    state.mediaIdx = 0;
    var part = state.raagSect ? raagSectParts(l, state.raagSect) : null;
    if (mIdx != null && mIdx >= 0 && l.media[mIdx]) state.mediaIdx = mIdx;
    else if (part && part.media.length) state.mediaIdx = part.media[0];
    else if (part) state.mediaIdx = -1;
    else for (var _mi = 0; _mi < l.media.length; _mi++) { if (!l.media[_mi].missing) { state.mediaIdx = _mi; break; } }
    localStorage.setItem("sk_lesson", id);
    renderList();
    renderStage(l);
  }

  function renderStage(l) {
    var s = $("#stage");
    var mcur = l.media[state.mediaIdx] || {};
    var curVideo = mcur.kind === "video";
    var secHasLines = !(l.group === "Raag" && state.raagSect) ||
      raagSectParts(l, state.raagSect).lines.length > 0;
    var fname = mcur.name || "";      // the real file name, extension and all
    if (l.title) {   // "Raag दुर्गा - Aaroh..." -> "Aaroh..." (the name is already in the heading)
      var names = [l.title], bare = l.title.replace(/^Raag\s+/i, "");
      if (bare !== l.title) names.push(bare);
      names.forEach(function (nm) {
        var pre = new RegExp("^" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[-\u2013\u2014]\\s*");
        fname = fname.replace(pre, "");
      });
    }
    var head = l.title, meta = [];
    if (l.group === "Taal" && l.taal) {          // taal name big, matras + file name small
      head = l.taal;
      if (l.sub) meta.push(l.sub);
      if (fname) meta.push(fname);
    } else if (l.group === "Alankar" || l.group === "Raag") {
      if (l.group === "Raag" && state.raagSect) { var sl = raagSectLabel(state.raagSect); if (sl) meta.push(sl); }
      if (fname) meta.push(fname);
    }
    var html = '<div class="sk-h1">' + esc(head) +
      (meta.length ? ' <span class="sk-file">' + esc(meta.join(" \u00b7 ")) + "</span>" : "") +
      (mcur.id ? ' <a class="sk-drive" href="https://drive.google.com/file/d/' + mcur.id +
        '/view" target="_blank" rel="noopener" title="Open this file in Google Drive">\u2197 Drive</a>' : "") +
      "</div>";
    if (l.sub && l.group !== "Taal") html += '<div class="sk-hsub">' + esc(l.sub) + "</div>";

    // media tabs — an alankar page shows no Komal/Shuddha tabs (the rail picks those)
    var tabMs = [];
    l.media.forEach(function (m, i) {
      if (l.group === "Alankar" && m.kind !== "video") return;
      if (l.group === "Raag" && state.raagSect && raagSect(m.name) !== state.raagSect) return;
      tabMs.push({ m: m, i: i });
    });
    if (tabMs.length > 1) {
      html += '<div class="sk-mediatabs">' + tabMs.map(function (t) {
        var m = t.m, i = t.i, nm = esc(m.name.replace(/\.[a-z0-9]+$/i, ""));
        if (m.missing) return '<button class="sk-mtab miss' + (i === state.mediaIdx ? " on" : "") + '" data-i="' + i + '">🎧 ' + nm + ' <b class="sk-mtag">no mp3</b></button>';
        return '<button class="sk-mtab' + (i === state.mediaIdx ? " on" : "") + '" data-i="' + i + '">' +
          (m.kind === "video" ? "🎬 " : "🎧 ") + nm + "</button>";
      }).join("") + "</div>";
    }
    html += '<div class="sk-player' + (curVideo ? " vidstick" : "") + '" id="player"></div>';

    // stop button — above the notation so it stays on screen even on long lessons
    if (l.lines && l.lines.length) {
      html += '<div class="sk-stoprow">' +
        
        (curVideo || !secHasLines ? "" : '<span class="sk-hint">Tap <b>\u25b6</b> to play a line \u00b7 <b>\u23f1</b> to set its start.</span>') +
        '<button class="sk-editbtn' + (state.editMode ? " on" : "") + '" id="btnEditNotation" type="button">\u270e ' +
        (state.editMode ? "Done editing" : "Edit notation") + "</button>" +
        "</div>";
    }

    // notation (shown right under the player, so it is visible while listening)
    if (l.lines && l.lines.length && secHasLines) {
      html += '<div class="sk-notation" id="notation"></div>';
    } else {
      html += '<div class="sk-dim" style="margin-top:10px">No written notation for this part — listen to the recording.</div>';
    }

    // controls: audio lessons only, and never on Alankar (just the per-line buttons there)
    var bareLesson = l.group === "Alankar";
    if (l.lines && l.lines.length && !curVideo && !bareLesson) {
      html += '<div class="sk-controls">' +
        '<button class="sk-btn' + (state.segLoop ? " on" : "") + '" id="btnLoop">Repeat line</button>' +
        
        '<div class="sk-ctl"><label>Rate</label><input type="range" id="rngRate" min="0.5" max="1.25" step="0.05" value="1"><span class="sk-rate" id="lblRate">1.00×</span></div>' +
        "</div>";
    }
    s.innerHTML = html;

    // wire media tabs
    Array.prototype.forEach.call(s.querySelectorAll(".sk-mtab"), function (b) {
      b.onclick = function () { state.mediaIdx = +b.dataset.i; renderList(); renderStage(l); };
    });

    renderPlayer(l);
    if (l.lines && l.lines.length && secHasLines) { renderNotation(l); if (!curVideo && !bareLesson) wireControls(l); }
    var ebtn = $("#btnEditNotation");
    if (ebtn) ebtn.onclick = function () { state.editMode = !state.editMode; renderStage(l); };
  }

  function renderPlayer(l) {
    var m = l.media[state.mediaIdx];
    var p = $("#player");
    p.classList.remove("bare");
    if (!m) { p.innerHTML = '<div class="sk-dim">No audio or video for this lesson.</div>'; return; }
    if (m.missing) { p.innerHTML = '<div class="sk-missing">🎧 <b>' + esc(m.name.replace(/\.[a-z0-9]+$/i, "")) + '</b> &mdash; we don&rsquo;t have this mp3 file yet.</div>'; return; }
    if (m.kind === "video") {
      p.innerHTML =
        '<div class="vidwrap">' +
          '<video id="vid" class="sk-video" playsinline preload="metadata" src="' + videoSrc(m) + '"></video>' +
          '<div class="vctl" id="vctl">' +
            '<button class="vbtn" id="vPlay" type="button" aria-label="play">\u25b6</button>' +
            '<div class="vtrack" id="vTrack"><div class="vfill" id="vFill"></div></div>' +
            '<span class="vtime" id="vTime">0:00 / 0:00</span>' +
          "</div>" +
        "</div>";
      var vd = $("#vid"), ctl = $("#vctl"), vfill = $("#vFill"), vtime = $("#vTime"), vtr = $("#vTrack");
      function vupd() {
        var d = vd.duration;
        vfill.style.width = (d ? (vd.currentTime / d * 100) : 0) + "%";
        vtime.textContent = fmtTime(vd.currentTime) + " / " + fmtTime(d);
      }
      var hideT = 0;
      function showCtl() {
        if (!ctl) return;
        ctl.classList.add("on");
        clearTimeout(hideT);
        hideT = setTimeout(function () { ctl.classList.remove("on"); }, 5000);   // 5s after last activity
      }
      $("#vPlay").onclick = function () { if (vd.paused) vd.play().catch(function () {}); else vd.pause(); showCtl(); };
      vd.addEventListener("play", function () { $("#vPlay").textContent = "\u275a\u275a"; vupd(); showCtl(); });
      vd.addEventListener("pause", function () { $("#vPlay").textContent = "\u25b6"; showCtl(); });
      vd.addEventListener("timeupdate", vupd);
      vd.addEventListener("loadedmetadata", vupd);
      vd.addEventListener("error", function () {      // can't play natively? fall back to Drive's player
        var w = p.querySelector(".vidwrap");
        if (w) w.innerHTML = '<iframe class="sk-iframe" src="' + mediaURL(m) + '" allow="autoplay; fullscreen" allowfullscreen></iframe>';
      });
      var dragv = false;
      function vseek(e) {
        var r = vtr.getBoundingClientRect();
        var f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        if (vd.duration) vd.currentTime = f * vd.duration;
        vupd();
      }
      vtr.addEventListener("pointerdown", function (e) { dragv = true; try { this.setPointerCapture(e.pointerId); } catch (x) {} vseek(e); showCtl(); });
      vtr.addEventListener("pointermove", function (e) { if (dragv) vseek(e); });
      vtr.addEventListener("pointerup", function () { dragv = false; });
      vtr.addEventListener("pointercancel", function () { dragv = false; });
      var wrap = p.querySelector(".vidwrap");
      if (wrap) {
        ["pointerenter", "pointermove", "pointerdown", "pointerleave"].forEach(function (ev) {
          wrap.addEventListener(ev, showCtl);
        });
      }
      vupd();
      showCtl();
    } else {
      p.innerHTML =
        '<div class="pl">' +
          '<button class="pl-btn" id="plPlay" type="button" aria-label="play">▶</button>' +
          '<button class="pl-btn sm" id="plBack" type="button">−5</button>' +
          '<div class="pl-track" id="plTrack"><div class="pl-bar"><div class="pl-fill" id="plFill"></div></div></div>' +
          '<span class="pl-time" id="plTime">0:00 / 0:00</span>' +
          '<button class="pl-btn sm" id="plFwd" type="button">+5</button>' +
        "</div>" +
        '<audio id="au" preload="none" referrerpolicy="no-referrer" src="' + mediaURL(m) + '"></audio>' +
        '<div class="sk-dim">🎧 ' + esc(m.name) + "</div>";
      var au = $("#au");
      state.audio = au;
      var srcs = audioSources(m), si = 0;
      au.addEventListener("error", function () {
        si++;
        if (si < srcs.length) { au.src = srcs[si]; au.load(); }
      });
      au.addEventListener("play", function () { ensureLoop(); syncLineBtns(); });
      au.addEventListener("pause", function () { syncLineBtns(); });
      au.addEventListener("ended", function () { state.segPlay = null; clearLineHL(); state.playingLine = -1; syncLineBtns(); });
      /* compact player */
      var playBtn = $("#plPlay"), fill = $("#plFill"), timeEl = $("#plTime"), track = $("#plTrack"), bar = track.firstChild;
      function upd() {
        var d = au.duration;
        fill.style.width = (d ? (au.currentTime / d * 100) : 0) + "%";
        timeEl.textContent = fmtTime(au.currentTime) + " / " + fmtTime(d);
      }
      playBtn.onclick = function () { if (au.paused) au.play().catch(function () {}); else au.pause(); };
      au.addEventListener("play", function () { playBtn.textContent = "❚❚"; });
      au.addEventListener("pause", function () { playBtn.textContent = "▶"; });
      au.addEventListener("timeupdate", upd);
      au.addEventListener("loadedmetadata", upd);
      au.addEventListener("durationchange", upd);
      $("#plBack").onclick = function () { au.currentTime = Math.max(0, au.currentTime - 5); upd(); };
      $("#plFwd").onclick = function () { var d = au.duration || (au.currentTime + 5); au.currentTime = Math.min(d, au.currentTime + 5); upd(); };
      var dragging = false;
      function seekAt(e) {
        var r = bar.getBoundingClientRect();
        var f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        if (au.duration) au.currentTime = f * au.duration;
        upd();
      }
      track.addEventListener("pointerdown", function (e) { dragging = true; try { this.setPointerCapture(e.pointerId); } catch (x) {} seekAt(e); });
      track.addEventListener("pointermove", function (e) { if (dragging) seekAt(e); });
      track.addEventListener("pointerup", function () { dragging = false; });
      track.addEventListener("pointercancel", function () { dragging = false; });
    }
  }

  function renderNotation(l) {
    var box = $("#notation");
    if (!box) return;
    box.innerHTML = "";
    state.lineBtns = {};
    var curIsVideo = (l.media[state.mediaIdx] || {}).kind === "video";
    var secKey = (l.group === "Raag" && state.raagSect) ? state.raagSect : null;
    l.lines.forEach(function (line, li) {
      if (line.onlyVideo && !curIsVideo) return;
      if (secKey && raagSect(line.label) !== secKey) return;
      var row = document.createElement("div");
      row.className = "sk-line";
      state.lineRows[li] = row;
      var ctl = document.createElement("span");
      ctl.className = "ln-ctl";
      var pb = document.createElement("button");
      pb.className = "ln-btn playb"; pb.type = "button"; pb.textContent = "▶";
      pb.title = "Play or pause this line";
      pb.onclick = function () { toggleLine(li); };
      state.lineBtns[li] = pb;
      var mb = document.createElement("button");
      mb.className = "ln-btn mark"; mb.type = "button"; mb.textContent = "⏱";
      mb.title = "Set this line's start at the current position";
      mb.onclick = function () { markLine(li); };
      ctl.appendChild(pb);
      ctl.appendChild(mb);
      var sunb = document.createElement("button");
      sunb.className = "ln-btn sunb" + (favHas(l.id, secKey, li) ? " on" : "");
      sunb.type = "button"; sunb.textContent = "\u2600";
      sunb.title = "Add this line to favourites";
      sunb.onclick = function () { favToggle(l.id, secKey, li, state.mediaIdx); renderNotation(l); };
      ctl.appendChild(sunb);
      var seg = segsOf()[li];
      if (seg) {
        var tm = document.createElement("span");
        tm.className = "ln-time"; tm.textContent = fmtTime(seg.t);
        ctl.appendChild(tm);
      }
      row.appendChild(ctl);
      if (line.label) {
        var lb = document.createElement("span");
        lb.className = "sk-lbl"; lb.textContent = line.label;
        row.appendChild(lb);
      }
      if (line.bandish) {                 // a bandish gets the swimlane view, not a swar run
        row.appendChild(bandishView(l, li, line));
        box.appendChild(row);
        if (state.editMode) box.appendChild(bandishEditor(l, li, line));
        return;
      }
      var unit = line.unit || 0, noteN = 0;
      tokenize(lineText(l, li)).forEach(function (tk) {
        if (tk.sep) {
          var sp = document.createElement("span");
          sp.className = "sk-sep"; sp.textContent = tk.t;
          row.appendChild(sp);
        } else {
          var sw = document.createElement("span");
          sw.className = "sk-sw" + (tk.oct === 1 ? " oct1" : tk.oct === -1 ? " octm" : "");
          if (unit > 1) {
            var g = Math.floor(noteN / unit);
            sw.className += (g % 2 ? " grpB" : " grpA") + (noteN % unit === 0 ? " gstart" : "");
          }
          noteN++;
          sw.textContent = tk.t;
          row.appendChild(sw);
        }
      });
      box.appendChild(row);
    });
  }

  /* ---------- written-notation edits ----------
     The sheet does not always read cleanly, and every device hears things
     differently, so any line can be corrected here. Edits live on the device
     and are merged (never replaced) with whatever another device wrote. */
  var EDITS = "https://api.github.com/repos/akshaybangalorekar/riyaz/contents/edits.json";

  function editsFor(id) { if (!state.edits[id]) state.edits[id] = {}; return state.edits[id]; }
  function editOf(id, li) {          // lookup must not create an entry just by looking
    var e = state.edits[id];
    return (e && e[String(li)]) || null;
  }
  function lineText(l, li) {
    var e = editOf(l.id, li);
    if (e && typeof e.t === "string") return e.t;
    return (l.lines[li].text || "");
  }
  function bandishRows(l, li) {
    var b = l.lines[li].bandish;
    if (!b) return [];
    var e = editOf(l.id, li), ov = (e && e.b) || {};
    return b.rows.map(function (r, ri) {
      var o = ov[String(ri)] || {};
      return { swar: o.swar || r.swar, lyric: o.lyric || r.lyric, arc: o.arc || r.arc };
    });
  }
  function setLineEdit(id, li, obj) {
    var e = editsFor(id), k = String(li);
    if (obj) e[k] = obj; else delete e[k];
    if (!Object.keys(e).length) delete state.edits[id];   // keep the file tidy
    saveEdits(); scheduleEditsPush();
  }
  function saveEdits() { try { localStorage.setItem("sk_edits", JSON.stringify(state.edits || {})); } catch (e) {} }
  function loadEdits() { try { var r = localStorage.getItem("sk_edits"); if (r) state.edits = JSON.parse(r) || {}; } catch (e) {} }

  function mergeEdits() {
    var out = {};
    for (var a = 0; a < arguments.length; a++) {
      var src = arguments[a] || {};
      Object.keys(src).forEach(function (k) {
        out[k] = out[k] || {};
        var lines = src[k] || {};
        Object.keys(lines).forEach(function (li) {
          var v = lines[li]; if (!v || typeof v !== "object") return;
          var prev = out[k][li];
          if (!prev) { out[k][li] = v; return; }
          var m = {};
          if (typeof prev.t === "string" || typeof v.t === "string") m.t = (v.t !== undefined ? v.t : prev.t);
          var pb = prev.b || {}, vb = v.b || {};
          var ks = Object.keys(pb).concat(Object.keys(vb));
          if (ks.length) { m.b = {}; ks.forEach(function (ri) { m.b[ri] = vb[ri] || pb[ri]; }); }
          out[k][li] = m;
        });
      });
    }
    return out;
  }
  var editTimer = 0, editPushing = false, editDirty = false;
  function scheduleEditsPush(delay) {
    if (!getToken()) return;
    editDirty = true;
    if (editTimer) return;
    editTimer = setTimeout(function () { editTimer = 0; flushEdits(); }, delay || 1500);
  }
  function flushEdits() {
    if (!getToken() || !editDirty || editPushing) return;
    editPushing = true;
    pushEdits(function (r) {
      editPushing = false;
      if (r === "ok") editDirty = false; else scheduleEditsPush(8000);
    });
  }
  function pushEdits(cb) {
    var tok = getToken();
    if (!tok) { if (cb) cb("no-token"); return; }
    ghGet(tok, EDITS).then(function (cur) {
      if (!cur.ok) { if (cb) cb("unreadable"); return; }     // never overwrite an unread file
      var merged = mergeEdits(cur.data || {}, state.edits || {});
      var body = { message: "Update notation edits", branch: "main", content: b64(JSON.stringify(merged, null, 1)) };
      if (cur.sha) body.sha = cur.sha;
      var h = ghHdr(tok); h["Content-Type"] = "application/json";
      return fetch(EDITS, { method: "PUT", keepalive: true, cache: "no-store", headers: h, body: JSON.stringify(body) });
    }).then(function (r) {
      if (r && r.ok) { if (cb) cb("ok"); } else if (cb) cb("fail", r && r.status);
    }).catch(function (e) { if (cb) cb(e && e.status ? "fail" : "net", e && e.status); });
  }
  function pullEdits(cb) {
    var tok = getToken();
    var p = tok
      ? ghGet(tok, EDITS).then(function (cur) { return cur.ok ? cur.data : null; })
      : fetchPublic("edits.json?t=" + Date.now());
    p.then(function (j) {
      if (j === null || typeof j !== "object") { if (cb) cb("fail"); return; }
      state.edits = mergeEdits(state.edits || {}, j);
      saveEdits();
      if (state.lessonId && GROUPS.indexOf(state.group) >= 0 && lesson(state.lessonId)) renderStage(lesson(state.lessonId));
      if (cb) cb("ok");
    }).catch(function () { if (cb) cb("fail"); });
  }

  /* ---------- the bandish swimlane ---------- */
  function vibhagStart(vb, i) {
    var acc = 0;
    for (var k = 0; k < vb.length; k++) { if (acc === i && k > 0) return true; acc += vb[k]; }
    return false;
  }
  function bandishView(l, li, line) {
    var b = line.bandish, N = b.matras || 16, vb = b.vibhag || [4, 4, 4, 4];
    var rows = bandishRows(l, li);
    var wrap = document.createElement("div"); wrap.className = "bnd";
    var head = document.createElement("div"); head.className = "bnd-head";
    head.innerHTML = '<b>' + esc(b.taal || "") + '</b><span>' + N + ' \u092e\u093e\u0924\u094d\u0930\u093e</span>';
    wrap.appendChild(head);

    function lane(cls) {
      var el = document.createElement("div"); el.className = "bnd-lane " + cls;
      for (var i = 0; i < N; i++) {
        var c = document.createElement("span");
        c.className = "bnd-cell" + (vibhagStart(vb, i) ? " bnd-vs" : "");
        el.appendChild(c);
      }
      return el;
    }
    var nums = lane("bnd-nums");
    for (var i = 0; i < N; i++) nums.children[i].textContent = String(i + 1);
    wrap.appendChild(nums);

    rows.forEach(function (r) {
      var rw = document.createElement("div"); rw.className = "bnd-row";
      var sl = lane("bnd-swar"), ll = lane("bnd-lyr");
      for (var i = 0; i < N; i++) {
        sl.children[i].textContent = r.swar[i] || "";
        ll.children[i].textContent = r.lyric[i] || "";
      }
      rw.appendChild(sl);
      var lw = document.createElement("div"); lw.className = "bnd-lyrwrap";
      lw.appendChild(ll);
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "bnd-arcs");
      svg.setAttribute("viewBox", "0 0 " + (N * 10) + " 10");
      svg.setAttribute("preserveAspectRatio", "none");
      (r.arc || []).forEach(function (a) {
        var x1 = a[0] * 10 + 2.5, x2 = (a[1] + 1) * 10 - 2.5;
        var pa = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pa.setAttribute("d", "M" + x1 + " 1.4 Q " + ((x1 + x2) / 2) + " 8.4 " + x2 + " 1.4");
        pa.setAttribute("fill", "none");
        svg.appendChild(pa);
      });
      lw.appendChild(svg);
      rw.appendChild(lw);
      wrap.appendChild(rw);
    });
    return wrap;
  }

  /* ---------- the editors ---------- */
  function notationEditor(l, li) {
    var d = document.createElement("div"); d.className = "ed";
    var ta = document.createElement("textarea");
    ta.className = "ed-ta"; ta.rows = 2; ta.value = lineText(l, li);
    d.appendChild(ta);
    var bar = document.createElement("div"); bar.className = "ed-bar";
    var sv = document.createElement("button"); sv.className = "ed-btn"; sv.type = "button"; sv.textContent = "Save";
    sv.onclick = function () { setLineEdit(l.id, li, { t: ta.value }); renderNotation(l); };
    var rs = document.createElement("button"); rs.className = "ed-btn ghost"; rs.type = "button"; rs.textContent = "Reset";
    rs.onclick = function () { setLineEdit(l.id, li, null); renderNotation(l); };
    bar.appendChild(sv); bar.appendChild(rs);
    var tip = document.createElement("span"); tip.className = "ed-tip";
    tip.textContent = "swar separated by spaces \u00b7 ^ upper octave \u00b7 _ lower \u00b7 | a bar";
    bar.appendChild(tip);
    d.appendChild(bar);
    return d;
  }
  function bandishEditor(l, li, line) {
    var d = document.createElement("div"); d.className = "ed ed-bandish";
    var rows = bandishRows(l, li), fields = [];
    rows.forEach(function (r, ri) {
      var box = document.createElement("div"); box.className = "ed-brow";
      var n = document.createElement("span"); n.className = "ed-bn"; n.textContent = "Line " + (ri + 1);
      box.appendChild(n);
      var a = document.createElement("textarea"); a.className = "ed-ta"; a.rows = 1;
      a.value = r.swar.join(" "); a.title = "swar, one per matra";
      var b = document.createElement("textarea"); b.className = "ed-ta lyr"; b.rows = 1;
      b.value = r.lyric.join(" "); b.title = "the song's letters, one per matra";
      box.appendChild(a); box.appendChild(b);
      d.appendChild(box);
      fields.push({ ri: ri, a: a, b: b });
    });
    var bar = document.createElement("div"); bar.className = "ed-bar";
    var sv = document.createElement("button"); sv.className = "ed-btn"; sv.type = "button"; sv.textContent = "Save";
    sv.onclick = function () {
      var b = {};
      fields.forEach(function (f) {
        b[String(f.ri)] = {
          swar: f.a.value.split(/\s+/).filter(Boolean),
          lyric: f.b.value.split(/\s+/).filter(Boolean)
        };
      });
      setLineEdit(l.id, li, { b: b });
      renderNotation(l);
    };
    var rs = document.createElement("button"); rs.className = "ed-btn ghost"; rs.type = "button"; rs.textContent = "Reset";
    rs.onclick = function () { setLineEdit(l.id, li, null); renderNotation(l); };
    bar.appendChild(sv); bar.appendChild(rs);
    var tip = document.createElement("span"); tip.className = "ed-tip";
    tip.textContent = "first box = swar for each of the 16 matras \u00b7 second box = the song's letters";
    bar.appendChild(tip);
    d.appendChild(bar);
    return d;
  }

  function wireControls(l) {
    var bl = $("#btnLoop");
    if (bl) bl.onclick = function () {
      state.segLoop = !state.segLoop; this.classList.toggle("on", state.segLoop);
      if (state.segPlay) state.segPlay.loop = state.segLoop;
    };
    updateMarksMsg();
    var rr = $("#rngRate");
    if (rr) rr.oninput = function () {
      var r = +this.value;
      $("#lblRate").textContent = r.toFixed(2) + "×";
      if (state.audio) state.audio.playbackRate = r;
    };
  }

  /* ---------- per-line segments (listen to one line at a time) ---------- */
  function fmtTime(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  /* Marks are stored per audio file, because every recording has its own
     timeline:  marks[lesson][track][line] = { t, at }   (track 0 = Komal, 1 = Shuddha …)
     Older saves were marks[lesson][line] = { track, t } and are migrated here. */
  function isLine(k) { return /^\d+$/.test(k); }
  function normalizeLesson(src) {
    var dst = {};
    function put(tr, ln, e) {
      if (tr == null || ln == null) return;
      dst[tr] = dst[tr] || {};
      var cur = dst[tr][ln];
      dst[tr][ln] = (cur && ((cur.at || 0) > (e.at || 0))) ? cur : e;
    }
    Object.keys(src || {}).forEach(function (key) {
      var v = src[key];
      if (!v || typeof v !== "object") return;
      // per-track shape: the value holds line entries (key = track)
      Object.keys(v).forEach(function (k2) {
        var e = v[k2];
        if (isLine(k2) && e && typeof e === "object" && typeof e.t === "number")
          put(key, k2, { t: e.t, at: e.at || 0 });
      });
      // legacy shape: the value is itself one line's mark (key = line)
      if (typeof v.t === "number") put(String(v.track || 0), key, { t: v.t, at: v.at || 0 });
    });
    return dst;
  }
  function normalizeAll(m) {
    var out = {};
    Object.keys(m || {}).forEach(function (les) { out[les] = normalizeLesson(m[les]); });
    return out;
  }
  function saveSharedCache() {
    try {
      localStorage.setItem("sk_shared_marks", JSON.stringify(state.sharedMarks || {}));
      localStorage.setItem("sk_shared_at", String(Date.now()));
    } catch (e) {}
  }
  function loadSharedCache() {
    try {
      var raw = localStorage.getItem("sk_shared_marks");
      if (!raw) return;
      var j = JSON.parse(raw);
      if (j && typeof j === "object") state.sharedMarks = normalizeAll(j);
    } catch (e) {}
  }
  function sharedCachedAt() { try { return +localStorage.getItem("sk_shared_at") || 0; } catch (e) { return 0; } }
  function loadAllLocal() {
    try {
      Object.keys(localStorage).forEach(function (kk) {
        if (kk.indexOf("sk_seg_") !== 0) return;
        try { state.segments[kk.slice(7)] = normalizeLesson(JSON.parse(localStorage.getItem(kk) || "{}") || {}); } catch (e) {}
      });
    } catch (e) {}
  }
  function trackKey() { return String(state.mediaIdx); }
  function localSegs() {                     // this device's marks for the CURRENT audio file
    var k = state.lessonId;
    if (!state.segments[k]) state.segments[k] = {};
    var tr = trackKey();
    if (!state.segments[k][tr]) state.segments[k][tr] = {};
    return state.segments[k][tr];
  }
  function newer(a, b) { return (((b && b.at) || 0) >= ((a && a.at) || 0)) ? b : a; }
  function segsOf() {                        // merged marks for the CURRENT audio file
    var k = state.lessonId, tr = trackKey(), base = {};
    if (state.cleared[k]) return base;
    var sh = state.sharedMarks && state.sharedMarks[k] && state.sharedMarks[k][tr];
    if (sh) { try { base = JSON.parse(JSON.stringify(sh)); } catch (e) { base = {}; } }
    var loc = localSegs();
    Object.keys(loc).forEach(function (i) { base[i] = newer(base[i], loc[i]); });
    return base;
  }
  function saveSegs() { try { localStorage.setItem("sk_seg_" + state.lessonId, JSON.stringify(state.segments[state.lessonId] || {})); } catch (e) {} }
  function lineEnds() {
    var segs = segsOf(), l = lesson(state.lessonId), n = l && l.lines ? l.lines.length : 0, ends = [];
    for (var i = 0; i < n; i++) {
      var s = segs[i]; ends[i] = null;
      if (!s) continue;
      for (var j = 0; j < n; j++) {
        var o = segs[j];
        if (o && o.t > s.t + 0.05 && (ends[i] === null || o.t < ends[i])) ends[i] = o.t;
      }
    }
    return ends;
  }
  function markLine(li) {
    if (!state.audio) return;
    delete state.cleared[state.lessonId];
    localSegs()[li] = { t: +state.audio.currentTime.toFixed(2), at: Date.now() };
    saveAllLocal();
    renderNotation(lesson(state.lessonId));
    var r = state.lineRows[li]; if (r) r.classList.add("marked");
    updateMarksMsg();
    schedulePush();
  }
  function stopPlayback() {
    if (state.audio) { try { state.audio.pause(); } catch (e) {} }
    state.segPlay = null;
    clearLineHL();
    var vv = document.getElementById("vid");
    if (vv) { try { vv.pause(); vv.currentTime = 0; } catch (e) {} }
    var f = document.querySelector(".sk-iframe");
    if (f) { try { f.src = f.src; } catch (e) {} }   // reloading the frame halts the video
  }
  function clearLineHL() { state.lineRows.forEach(function (r) { if (r) r.classList.remove("playing"); }); }
  function highlightLine(li) {
    clearLineHL();
    var r = state.lineRows[li];
    if (r) { r.classList.add("playing"); if (r.scrollIntoView) r.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }
  function syncLineBtns() {
    var au = state.audio;
    Object.keys(state.lineBtns).forEach(function (k) {
      var b = state.lineBtns[k]; if (!b) return;
      var playing = (state.playingLine === +k && au && !au.paused);
      b.textContent = playing ? "\u275a\u275a" : "▶";
      b.classList.toggle("on", !!playing);
    });
  }
  function toggleLine(li) {
    var au = state.audio;
    if (state.playingLine === li && au) {          // same line: pause, or resume where it stopped
      if (au.paused) au.play().catch(function () {});
      else au.pause();
      syncLineBtns();
      return;
    }
    playLine(li);
  }
  function playLine(li) {
    var l = lesson(state.lessonId); if (!l) return;
    state.playingLine = li;
    var s = segsOf()[li];
    if (!s) {  // not marked yet -> play the whole current track
      if (state.audio) { state.segPlay = null; state.audio.currentTime = 0; ensureLoop(); state.audio.play().catch(function () {}); }
      highlightLine(li);
      syncLineBtns();
      return;
    }
    startSeg(li);
  }
  function startSeg(li) {
    var au = state.audio, s = segsOf()[li]; if (!au || !s) return;
    var ends = lineEnds();
    au.currentTime = s.t;
    state.segPlay = { line: li, start: s.t, end: (ends[li] != null ? ends[li] : 1e9), loop: state.segLoop };
    ensureLoop();
    au.play().catch(function () {});
    highlightLine(li);
    syncLineBtns();
  }

  function mkMsg(t) { var e = $("#mkMsg"); if (e) e.textContent = t || ""; }

  /* ---------- marks: local storage + GitHub sync ---------- */
  var GH = "https://api.github.com/repos/akshaybangalorekar/riyaz/contents/marks.json";
  var APP_VER = "2026-10-11a";

  function getToken() { try { return localStorage.getItem("sk_gh_token") || ""; } catch (e) { return ""; } }
  function storageOK() {
    try { localStorage.setItem("sk_t", "1"); localStorage.removeItem("sk_t"); return true; } catch (e) { return false; }
  }
  function b64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function unb64(b) { try { return decodeURIComponent(escape(atob((b || "").replace(/\s/g, "")))); } catch (e) { return ""; } }
  function ghHdr(tok) {
    var h = { "Accept": "application/vnd.github+json" };
    if (tok) h["Authorization"] = "Bearer " + tok;
    return h;
  }
  function saveAllLocal() {
    Object.keys(state.segments).forEach(function (k) {
      try { localStorage.setItem("sk_seg_" + k, JSON.stringify(state.segments[k])); } catch (e) {}
    });
    try { localStorage.setItem("sk_marks_saved", String(Date.now())); } catch (e) {}
  }
  function localMarks() {
    var out = {};
    Object.keys(state.segments).forEach(function (k) {
      if (state.cleared[k]) return;
      out[k] = normalizeLesson(state.segments[k] || {});
    });
    return out;
  }
  function mergeMarks() {
    var out = {};
    for (var a = 0; a < arguments.length; a++) {
      var src = normalizeAll(arguments[a] || {});   // never let a legacy shape pollute
      Object.keys(src).forEach(function (k) {
        out[k] = out[k] || {};          // never skip a lesson: it would drop it from the file
        var tracks = src[k] || {};
        Object.keys(tracks).forEach(function (tr) {
          out[k][tr] = out[k][tr] || {};
          var lines = tracks[tr] || {};
          Object.keys(lines).forEach(function (ln) { out[k][tr][ln] = newer(out[k][tr][ln], lines[ln]); });
        });
      });
    }
    return out;
  }
  function allMarks() { return mergeMarks(state.sharedMarks || {}, localMarks()); }
  function marksCount() {
    var m = allMarks(), n = 0;
    Object.keys(m).forEach(function (k) {
      var tracks = m[k] || {};
      Object.keys(tracks).forEach(function (tr) { n += Object.keys(tracks[tr] || {}).length; });
    });
    return n;
  }
  // Every message here is written to be understood by a child: say what happened,
  // say whether anything was lost, say what happens next. No jargon, no codes alone.
  function syncWords(key, st) {
    if (key === "net") return "No internet right now. Your timings are safe on this device. I\u2019ll try again in a moment.";
    if (key === "noreach") return "I can\u2019t reach the internet to check for new timings, so I\u2019m showing the timings saved on this device" +
      (sharedCachedAt() ? " (from " + new Date(sharedCachedAt()).toLocaleString() + ")" : "") + ". I\u2019ll try again in a moment.";
    if (key === "noread") return "I found the timings on the internet but couldn\u2019t read them, so I\u2019m showing the copy saved on this device" +
      (sharedCachedAt() ? " (from " + new Date(sharedCachedAt()).toLocaleString() + ")" : "") + ". I\u2019ll try again in a moment.";
    if (key === "unreadable") return "I couldn\u2019t read the timings on the internet, so I didn\u2019t save anything just now. Nothing was lost. I\u2019ll try again in a moment.";
    if (key === "would-drop") return "I stopped saving because it would have erased some timings. Nothing was lost. I\u2019ll try again in a moment.";
    if (key === "savefail") return "Saving didn\u2019t work" + (st ? " (error " + st + ")" : "") + ". Your timings are safe on this device. I\u2019ll try again in a moment.";
    if (key === "notoken") return "This device can show the timings but can\u2019t save new ones.";
    return "";
  }
  function activeProblem() { return state.pushProblem || state.pullProblem || null; }

  // a slim note under the header, shown only when something is wrong
  function renderSyncNote() {
    var host = document.querySelector(".sk-head");
    if (!host) return;
    var el = document.getElementById("syncNote");
    var key = activeProblem();
    if (!key) { if (el && el.parentNode) el.parentNode.removeChild(el); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "syncNote"; el.className = "sk-syncnote"; el.setAttribute("role", "status");
      host.parentNode.insertBefore(el, host.nextSibling);
    }
    var txt = syncWords(key, state.pushProblem === key ? state.pushProblemStatus : "");
    if (el.textContent !== txt) el.textContent = txt;
  }
  function setSyncProblem(which, key, st) {
    if (which === "push") { state.pushProblem = key || null; state.pushProblemStatus = key ? (st || "") : ""; }
    else { state.pullProblem = key || null; }
    renderSyncNote();
    updateMarksMsg();
  }

  function updateMarksMsg(res, st) {
    var p = 0, l = 0;
    try { p = +localStorage.getItem("sk_marks_pushed") || 0; l = +localStorage.getItem("sk_marks_pulled") || 0; } catch (e) {}
    function T(x) { return x ? new Date(x).toLocaleTimeString() : "not yet"; }
    var el = $("#setStatus");
    if (!el) return;
    var key = activeProblem();
    if (key) { el.textContent = "\u26a0 " + syncWords(key, state.pushProblemStatus); return; }
    if (!getToken()) { el.textContent = "This device can show the timings but can\u2019t save new ones. Last checked " + T(l) + "."; return; }
    el.textContent = "\u2713 All good \u2014 " + marksCount() + " timings saved, and every device has them. Last checked " + T(l) + " \u00b7 last saved " + T(p) + ".";
  }

  // GET marks.json from GitHub -> { sha, data }
  function ghGet(tok, url) {
    return fetch((url || GH) + "?t=" + Date.now(), { cache: "no-store", headers: ghHdr(tok) }).then(function (r) {
      if (r.status === 404) return { sha: null, data: {}, ok: true };
      if (!r.ok) { var e = new Error("http"); e.status = r.status; throw e; }
      return r.json().then(function (j) {
        var data = null;
        try { data = JSON.parse(unb64(j.content || "")); } catch (e) { data = null; }
        if (!data || typeof data !== "object") return { sha: j.sha || null, data: null, ok: false };
        return { sha: j.sha || null, data: data, ok: true };
      });
    });
  }

  function pushMarks(cb) {
    var tok = getToken();
    if (!tok) { if (cb) cb("no-token"); return; }
    ghGet(tok).then(function (cur) {
      // A push must always start from the server copy. If we could not read it,
      // STOP: writing now would overwrite every mark this device does not hold.
      if (!cur.ok) { if (cb) cb("unreadable"); return; }
      var merged = mergeMarks(cur.data || {}, localMarks());
      // belt and braces: a push may add to the file, never remove a lesson from it
      var lost = Object.keys(cur.data || {}).filter(function (k) { return !(k in merged); });
      if (lost.length) { if (cb) cb("would-drop", lost.join(", ")); return; }
      var body = { message: "Update line marks", branch: "main", content: b64(JSON.stringify(merged, null, 1)) };
      if (cur.sha) body.sha = cur.sha;
      var h = ghHdr(tok); h["Content-Type"] = "application/json";
      return fetch(GH, { method: "PUT", keepalive: true, cache: "no-store", headers: h, body: JSON.stringify(body) });
    }).then(function (r) {
      if (r && r.ok) { try { localStorage.setItem("sk_marks_pushed", String(Date.now())); } catch (e) {} if (cb) cb("ok"); }
      else if (cb) cb("fail", r && r.status);
    }).catch(function (e) { if (cb) cb(e && e.status ? "fail" : "net", e && e.status); });
  }

  var pushTimer = 0, pushing = false, dirty = false;
  function schedulePush(delay) {
    if (!getToken()) return;
    dirty = true;
    if (pushTimer) return;
    pushTimer = setTimeout(function () { pushTimer = 0; flushPush(); }, delay || 2000);
  }
  function flushPush() {
    if (!getToken()) { updateMarksMsg(); return; }
    if (!dirty) { updateMarksMsg(); return; }
    if (pushing) { schedulePush(1500); return; }
    pushing = true;
    pushMarks(function (r, st) {
      pushing = false;
      if (r === "ok") dirty = false; else schedulePush(8000);
      setSyncProblem("push", r === "ok" ? null
        : r === "net" ? "net"
        : r === "unreadable" ? "unreadable"
        : r === "would-drop" ? "would-drop"
        : r === "fail" ? "savefail"
        : null, st);
    });
  }
  function autoSaveTick() { saveAllLocal(); updateMarksMsg(); flushPush(); }

  function marksFreshness(m) {
    var best = 0;
    Object.keys(m || {}).forEach(function (k) {
      var tracks = m[k] || {};
      Object.keys(tracks).forEach(function (tr) {
        var lines = tracks[tr] || {};
        Object.keys(lines).forEach(function (ln) { var a = (lines[ln] || {}).at || 0; if (a > best) best = a; });
      });
    });
    return best;
  }
  function fetchPublic(url) {
    return fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) { var e = new Error("http"); e.status = r.status; throw e; } return r.json(); })
      .catch(function () { return null; });
  }
  function pullMarks(cb) {
    var tok = getToken();
    var badRead = false;
    var p = tok
      ? ghGet(tok).then(function (cur) { if (!cur.ok) { badRead = true; return null; } return cur.data; })
      : Promise.all([
          fetchPublic("marks.json?t=" + Date.now()),
          fetchPublic("https://raw.githubusercontent.com/akshaybangalorekar/riyaz/main/marks.json?t=" + Date.now())
        ]).then(function (both) {
          var a = both[0], b = both[1];
          if (!a) return b;
          if (!b) return a;
          return marksFreshness(a) >= marksFreshness(b) ? a : b;
        });
    p.then(function (j) {
      if (j === null || typeof j !== "object") { state.pullFailed = true; setSyncProblem("pull", badRead ? "noread" : "noreach"); if (cb) cb("fail"); retryPull(); return; }
      state.sharedMarks = normalizeAll(j);
      saveSharedCache();
      try { localStorage.setItem("sk_marks_pulled", String(Date.now())); } catch (e) {}
      // Redraw the open lesson with the marks we just loaded. This used to call an
      // undefined helper, which threw - so the marks arrived but the page was never
      // redrawn (no timings on screen) and the failure was reported as "no internet".
      try {
        if (state.lessonId && GROUPS.indexOf(state.group) >= 0 && lesson(state.lessonId)) renderStage(lesson(state.lessonId));
      } catch (e) {}
      state.pullFailed = false;
      pullTries = 0;
      setSyncProblem("pull", null);
      updateMarksMsg();
      if (cb) cb("ok");
    }).catch(function () { state.pullFailed = true; setSyncProblem("pull", "noreach"); if (cb) cb("fail"); retryPull(); });
  }
  var pullTries = 0;
  function retryPull() {
    if (pullTries >= 3) return;
    pullTries++;
    setTimeout(function () { pullMarks(); }, 3000 * pullTries);
  }
  function closeSettings() { var m = $("#skSettings"); if (m) m.classList.remove("on"); }
  function openSettings() {
    var box = $("#skSettingsBox"); if (!box) return;
    box.innerHTML =
      '<div class="set-h">Settings</div>' +
      '<div class="set-lab">GitHub token &mdash; stored only in this browser</div>' +
      '<input id="setToken" class="set-input" type="password" autocomplete="off" placeholder="github_pat_\u2026">' +
      '<div class="set-actions">' +
        '<button class="sk-btn" id="setSave">Save</button>' +
        '<button class="sk-btn" id="setSync">Sync now</button>' +
        '<button class="sk-btn" id="setTake">Use server copy</button>' +
        '<button class="sk-btn" id="setClear">Remove</button>' +
        '<button class="sk-btn" id="setClose">Close</button>' +
      '</div>' +
      '<div class="set-msg" id="setMsg"></div>' +
      '<p class="set-note">Scope: the <b>riyaz</b> repo only, permission <b>Contents: Read and write</b>. Marks load and save automatically.</p>' +
      '<p class="set-note">Status: <span id="setStatus"></span></p>' +
      (storageOK() ? '' : '<p class="set-warn">\u26a0 This browser is blocking local storage, so the token and your marks cannot be kept. Leave Private Browsing (or allow cookies for this site), then enter the token again.</p>') +
      '<p class="set-note dim">Build ' + APP_VER + '</p>';
    var m = $("#skSettings"); if (m) m.classList.add("on");
    var ti = $("#setToken");
    if (getToken()) ti.placeholder = "Token saved (enter a new one to replace)";
    $("#setSave").onclick = function () {
      var v = (ti.value || "").trim();
      if (!v) { $("#setMsg").textContent = "Enter a token first"; return; }
      try { localStorage.setItem("sk_gh_token", v); } catch (e) {}
      if (!getToken()) { $("#setMsg").textContent = "This browser will not store the token \u2014 local storage is blocked."; return; }
      ti.value = ""; ti.placeholder = "Token saved";
      $("#setMsg").textContent = "Checking the token\u2026";
      pullMarks(function (pr) {
        if (pr !== "ok") { $("#setMsg").textContent = "Could not read marks with this token \u2014 check the token and its access to this repo."; updateMarksMsg("fail"); return; }
        dirty = true;
        pushMarks(function (r, st) {
          $("#setMsg").textContent = r === "ok"
            ? "Connected \u2014 marks now save automatically"
            : "Save failed" + (st ? " (HTTP " + st + ")" : "") + " \u2014 the token needs Contents: Read and write on this repo.";
          updateMarksMsg(r, st);
        });
      });
    };
    $("#setSync").onclick = function () {
      $("#setMsg").textContent = "Syncing\u2026";
      pullMarks(function () {
        dirty = true;
        pushMarks(function (r, st) {
          $("#setMsg").textContent = r === "ok" ? "Synced \u2014 marks are up to date." : "Sync failed" + (st ? " (HTTP " + st + ")" : "") + ".";
          updateMarksMsg(r, st);
        });
      });
    };
    $("#setTake").onclick = function () {
      if (!window.confirm("Replace this device's line marks with the copy from GitHub?")) return;
      $("#setMsg").textContent = "Taking the GitHub copy\u2026";
      pullMarks(function (pr) {
        if (pr !== "ok") { $("#setMsg").textContent = "Could not read the GitHub copy."; return; }
        state.segments = {}; state.cleared = {};
        try { Object.keys(localStorage).forEach(function (kk) { if (kk.indexOf("sk_seg_") === 0) localStorage.removeItem(kk); }); } catch (e) {}
        dirty = false;
        if (state.lessonId && lesson(state.lessonId)) renderStage(lesson(state.lessonId));
        updateMarksMsg();
        $("#setMsg").textContent = "Now showing the GitHub copy.";
      });
    };
    $("#setClear").onclick = function () { try { localStorage.removeItem("sk_gh_token"); } catch (e) {} $("#setMsg").textContent = "Token removed"; updateMarksMsg(); };
    $("#setClose").onclick = closeSettings;
    updateMarksMsg();
  }

  function ensureLoop() { if (!state.raf) loop(); }
  function loop() {
    state.raf = requestAnimationFrame(loop);
    var au = state.audio; if (!au) return;
    var t = au.currentTime;
    // per-line segment: loop it, or stop at its end
    if (state.segPlay) {
      var sp = state.segPlay;
      if (t >= sp.end - 0.03) {
        if (sp.loop) { try { au.currentTime = sp.start; } catch (e) {} }
        else { au.pause(); state.segPlay = null; clearLineHL(); }
      }
    }
  }

  /* ---------- boot ---------- */
  // deep link:  ?lesson=rg_bhairavi   or   #rg_bhairavi
  (function () {
    var m = /[?&]lesson=([^&#]+)/.exec(location.search);
    var id = m ? decodeURIComponent(m[1]) : (location.hash ? location.hash.slice(1) : "");
    if (id && lesson(id)) { state.lessonId = id; state.group = lesson(id).group; }
    var tm = /[?&]tool=([^&#]+)/.exec(location.search);
    if (tm) { state.vadyaOpen = true; }
  })();
  favLoad();
  favLoad();
  loadAllLocal();
  loadSharedCache();
  loadEdits();
  renderSyncNote();
  renderTabs();
  pullMarks();
  favPull();
  pullEdits();
  setInterval(autoSaveTick, 60000);    // background save + push every minute
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { saveAllLocal(); saveEdits(); flushPush(); flushEdits(); favPush(); }
    else { pullMarks(); favPull(); pullEdits(); }
  });
  window.addEventListener("pagehide", function () { saveAllLocal(); saveEdits(); flushPush(); flushEdits(); });
  window.addEventListener("online", function () { flushPush(); });
  var railBtn = $("#btnRail"); if (railBtn) railBtn.onclick = toggleRail;
  var gear = $("#btnSettings"); if (gear) gear.onclick = function () {
    var b = $("#skSettings");
    if (b && b.classList.contains("on")) closeSettings(); else openSettings();
  };
  if (location.hash === "#settings") openSettings();
  /* Vadya panel — mounted once; hiding it never stops the instruments */
  var vbox = $("#skVadyaBox");
  if (vbox && window.RIYAZ && window.RIYAZ.vadya) window.RIYAZ.vadya.mount(vbox);
  var vb = $("#btnVadya");
  function toggleVadya() {
    var p = $("#skVadya"); if (!p) return;
    var on = p.classList.toggle("on");
    if (vb) vb.classList.toggle("on", on);
    if (on) { var close = $("#skSettings"); if (close) close.classList.remove("on"); }
  }
  if (vb) vb.onclick = toggleVadya;
  if (/[?&]vadya=1/.test(location.search)) toggleVadya();
  if (GROUPS.indexOf(state.group) < 0) { state.group = GROUPS[0]; }
  renderList();
  if (state.group === "Favourites") { renderList(); renderFavStage(); }
  else {
    var start = state.lessonId && lesson(state.lessonId) ? state.lessonId : (lessonsOf(state.group)[0] || {}).id;
    if (start) open(start);
  }
})();
