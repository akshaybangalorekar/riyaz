/* Riyaz — Gurukool sargam practice
   Notation (Devanagari) + audio from Google Drive + a moving underline
   that follows the audio at a tempo the learner sets (tap-tempo or slider). */
(function () {
  "use strict";
  var D = window.SANGEET || { lessons: [] };
  var GROUPS = ["Alankar", "Taal", "Raag"];
  var TABS = GROUPS;

  var state = {
    group: localStorage.getItem("sk_group") || "Alankar",
    lessonId: localStorage.getItem("sk_lesson") || null,
    mediaIdx: 0,
    swaras: [],      // {el, line}
    cur: -1,
    follow: false,
    speed: 2.0,      // swaras per second
    baseT: 0,
    baseI: 0,
    tap: [],
    raf: 0,
    audio: null,
    segments: {},     // lessonId -> { lineIndex: {track, t} }   (local overrides)
    segPlay: null,     // {line, start, end, loop}
    segLoop: true,
    lineRows: [],
    sharedMarks: null, // marks.json loaded from the repo (shared across devices)
    cleared: {}        // lessons whose marks were cleared in this session
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
        var first = lessonsOf(state.group)[0];
        if (first) open(first.id);
      };
    });
  }
  function lessonsOf(g) { return D.lessons.filter(function (l) { return l.group === g; }); }

  function renderList() {
    var el = $("#list");
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
    state.follow = false; state.swaras = []; state.cur = -1; state.tap = [];
    state.segPlay = null; state.lineRows = [];
  }

  function open(id) {
    var l = lesson(id);
    if (!l) return;
    stopAll();
    state.lessonId = id; state.mediaIdx = 0;
    for (var _mi = 0; _mi < l.media.length; _mi++) { if (!l.media[_mi].missing) { state.mediaIdx = _mi; break; } }
    localStorage.setItem("sk_lesson", id);
    renderList();
    renderStage(l);
  }

  function renderStage(l) {
    var s = $("#stage");
    var html = '<div class="sk-h1">' + esc(l.title) + "</div>";
    if (l.sub) html += '<div class="sk-hsub">' + esc(l.sub) + "</div>";

    // media tabs
    if (l.media.length > 1) {
      html += '<div class="sk-mediatabs">' + l.media.map(function (m, i) {
        var nm = esc(m.name.replace(/\.[a-z0-9]+$/i, ""));
        if (m.missing) return '<button class="sk-mtab miss' + (i === state.mediaIdx ? " on" : "") + '" data-i="' + i + '">🎧 ' + nm + ' <b class="sk-mtag">no mp3</b></button>';
        return '<button class="sk-mtab' + (i === state.mediaIdx ? " on" : "") + '" data-i="' + i + '">' +
          (m.kind === "video" ? "🎬 " : "🎧 ") + nm + "</button>";
      }).join("") + "</div>";
    }
    html += '<div class="sk-player" id="player"></div>';

    // notation (shown right under the player, so it is visible while listening)
    if (l.lines && l.lines.length) {
      html += '<div class="sk-notation" id="notation"></div>';
    } else {
      html += '<div class="sk-dim" style="margin-top:10px">No written notation for this lesson — watch the video.</div>';
    }

    // controls (only if there is notation)
    if (l.lines && l.lines.length) {
      html += '<div class="sk-controls">' +
        '<button class="sk-btn" id="btnFollow">▶ Follow line</button>' +
        '<button class="sk-btn tap" id="btnTap">Tap tempo</button>' +
        '<button class="sk-btn" id="btnNext">Next ›</button>' +
        '<button class="sk-btn' + (state.segLoop ? " on" : "") + '" id="btnLoop">Repeat</button>' +
        '<button class="sk-btn" id="btnClear">Clear marks</button>' +
        '<div class="sk-ctl"><label>Speed</label><input type="range" id="rngSpeed" min="0.5" max="6" step="0.1" value="' + state.speed + '"><span class="sk-rate" id="lblSpeed">' + state.speed.toFixed(1) + ' notes/s</span></div>' +
        '<div class="sk-ctl"><label>Rate</label><input type="range" id="rngRate" min="0.5" max="1.25" step="0.05" value="1"><span class="sk-rate" id="lblRate">1.00×</span></div>' +
        "</div>" +
        '<div class="sk-hint">Line practice: tap a line&rsquo;s <b>▶</b> to hear just that line. The first time, play the audio and tap <b>⏱</b> on each line as it begins — after that every line plays on its own.</div>';
    }
    s.innerHTML = html;

    // wire media tabs
    Array.prototype.forEach.call(s.querySelectorAll(".sk-mtab"), function (b) {
      b.onclick = function () { state.mediaIdx = +b.dataset.i; renderStage(l); };
    });

    renderPlayer(l);
    if (l.lines && l.lines.length) { renderNotation(l); wireControls(l); }
  }

  function renderPlayer(l) {
    var m = l.media[state.mediaIdx];
    var p = $("#player");
    if (!m) { p.innerHTML = '<div class="sk-dim">No audio or video for this lesson.</div>'; return; }
    if (m.missing) { p.innerHTML = '<div class="sk-missing">🎧 <b>' + esc(m.name.replace(/\.[a-z0-9]+$/i, "")) + '</b> &mdash; we don&rsquo;t have this mp3 file yet.</div>'; return; }
    if (m.kind === "video") {
      p.innerHTML = '<iframe class="sk-iframe" src="' + mediaURL(m) + '" allow="autoplay; fullscreen" allowfullscreen></iframe>' +
        '<div class="sk-dim">🎬 ' + esc(m.name) + "</div>";
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
      au.addEventListener("play", function () { ensureLoop(); startFollowBase(); });
      au.addEventListener("seeked", function () { startFollowBase(); });
      au.addEventListener("ended", function () { state.follow = false; state.segPlay = null; clearLineHL(); syncBtn(); });
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
    box.innerHTML = "";
    state.swaras = [];
    l.lines.forEach(function (line, li) {
      var row = document.createElement("div");
      row.className = "sk-line";
      state.lineRows[li] = row;
      var ctl = document.createElement("span");
      ctl.className = "ln-ctl";
      var pb = document.createElement("button");
      pb.className = "ln-btn"; pb.type = "button"; pb.textContent = "▶";
      pb.title = "Play just this line";
      pb.onclick = function () { playLine(li); };
      var mb = document.createElement("button");
      mb.className = "ln-btn mark"; mb.type = "button"; mb.textContent = "⏱";
      mb.title = "Set this line's start at the current position";
      mb.onclick = function () { markLine(li); };
      ctl.appendChild(pb); ctl.appendChild(mb);
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
      var unit = line.unit || 0, noteN = 0;
      tokenize(line.text).forEach(function (tk) {
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
          var idx = state.swaras.length;
          sw.dataset.i = idx;
          sw.onclick = function () { setCur(idx); };
          state.swaras.push({ el: sw, line: li });
          row.appendChild(sw);
        }
      });
      box.appendChild(row);
    });
  }

  function wireControls(l) {
    var bf = $("#btnFollow");
    bf.onclick = function () {
      state.follow = !state.follow;
      if (state.follow && state.audio && state.audio.paused) state.audio.play().catch(function(){});
      startFollowBase();
      syncBtn();
    };
    $("#btnTap").onclick = function () {
      var now = performance.now();
      state.tap.push(now);
      if (state.tap.length > 5) state.tap.shift();
      if (state.tap.length >= 2) {
        var iv = [];
        for (var i = 1; i < state.tap.length; i++) iv.push(state.tap[i] - state.tap[i - 1]);
        var avg = iv.reduce(function (a, b) { return a + b; }, 0) / iv.length;
        if (avg > 80) {
          state.speed = Math.max(0.5, Math.min(6, 1000 / avg));
          $("#rngSpeed").value = state.speed;
          $("#lblSpeed").textContent = state.speed.toFixed(1) + " notes/s";
          startFollowBase();
        }
      }
    };
    $("#btnNext").onclick = function () { setCur(state.cur + 1); startFollowBase(); };
    var bl = $("#btnLoop");
    if (bl) bl.onclick = function () {
      state.segLoop = !state.segLoop; this.classList.toggle("on", state.segLoop);
      if (state.segPlay) state.segPlay.loop = state.segLoop;
    };
    var bc = $("#btnClear");
    if (bc) bc.onclick = function () {
      state.segments[state.lessonId] = {}; saveSegs(); state.segPlay = null;
      state.cleared[state.lessonId] = true;
      if (state.audio) state.audio.pause();
      renderNotation(lesson(state.lessonId));
      schedulePush();
    };
    updateMarksMsg();
    $("#rngSpeed").oninput = function () {
      state.speed = +this.value;
      $("#lblSpeed").textContent = state.speed.toFixed(1) + " notes/s";
      startFollowBase();
    };
    $("#rngRate").oninput = function () {
      var r = +this.value;
      $("#lblRate").textContent = r.toFixed(2) + "×";
      if (state.audio) state.audio.playbackRate = r;
      startFollowBase();
    };
  }

  function syncBtn() {
    var bf = $("#btnFollow");
    if (!bf) return;
    bf.classList.toggle("on", state.follow);
    bf.textContent = state.follow ? "⏸ Stop follow" : "▶ Follow line";
  }

  /* ---------- the moving underline ---------- */
  function setCur(i) {
    var n = state.swaras.length;
    if (!n) return;
    i = ((i % n) + n) % n;
    state.cur = i;
    for (var k = 0; k < n; k++) {
      var el = state.swaras[k].el;
      el.classList.toggle("done", state.follow ? k < i : (k < i));
      el.classList.toggle("cur", k === i);
    }
    var cur = state.swaras[i].el;
    if (cur && cur.scrollIntoView) {
      var r = cur.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 60)
        cur.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }  /* ---------- per-line segments (listen to one line at a time) ---------- */
  function fmtTime(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function localSegs() {
    var k = state.lessonId;
    if (!state.segments[k]) {
      try { state.segments[k] = JSON.parse(localStorage.getItem("sk_seg_" + k) || "{}") || {}; }
      catch (e) { state.segments[k] = {}; }
    }
    return state.segments[k];
  }
  function newer(a, b) { return (((b && b.at) || 0) >= ((a && a.at) || 0)) ? b : a; }
  function segsOf() {
    var k = state.lessonId, base = {};
    if (state.cleared[k]) return base;
    if (state.sharedMarks && state.sharedMarks[k]) {
      try { base = JSON.parse(JSON.stringify(state.sharedMarks[k])); } catch (e) { base = {}; }
    }
    var loc = localSegs();
    Object.keys(loc).forEach(function (i) { base[i] = newer(base[i], loc[i]); });
    return base;
  }
  function saveSegs() { try { localStorage.setItem("sk_seg_" + state.lessonId, JSON.stringify(localSegs())); } catch (e) {} }
  function allMarks() {
    var out = {};
    if (state.sharedMarks) Object.keys(state.sharedMarks).forEach(function (k) { try { out[k] = JSON.parse(JSON.stringify(state.sharedMarks[k])); } catch (e) { out[k] = {}; } });
    Object.keys(state.segments).forEach(function (k) {
      out[k] = out[k] || {};
      Object.keys(state.segments[k]).forEach(function (i) { out[k][i] = state.segments[k][i]; });
    });
    return out;
  }
  function loadSharedMarks() {
    fetch("marks.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { state.sharedMarks = j || {}; if (state.lessonId && !isTool(state.group) && lesson(state.lessonId)) renderStage(lesson(state.lessonId)); })
      .catch(function () { state.sharedMarks = {}; });
  }
  function lineEnds() {
    var segs = segsOf(), l = lesson(state.lessonId), n = l && l.lines ? l.lines.length : 0, ends = [];
    for (var i = 0; i < n; i++) {
      var s = segs[i]; ends[i] = null;
      if (!s) continue;
      for (var j = 0; j < n; j++) {
        var o = segs[j];
        if (o && o.track === s.track && o.t > s.t + 0.05 && (ends[i] === null || o.t < ends[i])) ends[i] = o.t;
      }
    }
    return ends;
  }
  function markLine(li) {
    if (!state.audio) return;
    delete state.cleared[state.lessonId];
    localSegs()[li] = { track: state.mediaIdx, t: +state.audio.currentTime.toFixed(2), at: Date.now() };
    saveAllLocal();
    renderNotation(lesson(state.lessonId));
    var r = state.lineRows[li]; if (r) r.classList.add("marked");
    updateMarksMsg();
    schedulePush();
  }
  function clearLineHL() { state.lineRows.forEach(function (r) { if (r) r.classList.remove("playing"); }); }
  function highlightLine(li) {
    clearLineHL();
    var r = state.lineRows[li];
    if (r) { r.classList.add("playing"); if (r.scrollIntoView) r.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }
  function playLine(li) {
    var l = lesson(state.lessonId); if (!l) return;
    var s = segsOf()[li];
    if (!s) {  // not marked yet -> play the whole current track
      if (state.audio) { state.segPlay = null; state.audio.currentTime = 0; ensureLoop(); state.audio.play().catch(function () {}); }
      highlightLine(li);
      return;
    }
    if (s.track !== state.mediaIdx) { state.mediaIdx = s.track; renderStage(l); setTimeout(function () { startSeg(li); }, 90); }
    else startSeg(li);
  }
  function startSeg(li) {
    var au = state.audio, s = segsOf()[li]; if (!au || !s) return;
    var ends = lineEnds();
    au.currentTime = s.t;
    state.segPlay = { line: li, start: s.t, end: (ends[li] != null ? ends[li] : 1e9), loop: state.segLoop };
    ensureLoop();
    au.play().catch(function () {});
    highlightLine(li);
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
      out[k] = out[k] || {};
      var src = state.segments[k] || {};
      Object.keys(src).forEach(function (i) { out[k][i] = src[i]; });
    });
    return out;
  }
  function mergeMarks() {
    var out = {};
    for (var a = 0; a < arguments.length; a++) {
      var src = arguments[a] || {};
      Object.keys(src).forEach(function (k) {
        if (state.cleared[k]) return;
        out[k] = out[k] || {};
        var rows = src[k] || {};
        Object.keys(rows).forEach(function (i) { out[k][i] = newer(out[k][i], rows[i]); });
      });
    }
    return out;
  }
  function allMarks() { return mergeMarks(state.sharedMarks || {}, localMarks()); }
  function marksCount() {
    var m = allMarks(), n = 0;
    Object.keys(m).forEach(function (k) { n += Object.keys(m[k] || {}).length; });
    return n;
  }
  function updateMarksMsg(res, st) {
    var p = 0, l = 0;
    try { p = +localStorage.getItem("sk_marks_pushed") || 0; l = +localStorage.getItem("sk_marks_pulled") || 0; } catch (e) {}
    function T(x) { return x ? new Date(x).toLocaleTimeString() : "\u2014"; }
    var el = $("#setStatus");
    if (!el) return;
    var bits = [marksCount() + " lines marked", "loaded " + T(l), "saved " + T(p), getToken() ? "GitHub connected" : "no token"];
    if (res === "fail") bits.push("\u26a0 save failed" + (st ? " (HTTP " + st + ")" : ""));
    else if (res === "net") bits.push("\u26a0 save failed (offline?)");
    el.textContent = bits.join(" \u00b7 ");
  }

  // GET marks.json from GitHub -> { sha, data }
  function ghGet(tok) {
    return fetch(GH + "?t=" + Date.now(), { cache: "no-store", headers: ghHdr(tok) }).then(function (r) {
      if (r.status === 404) return { sha: null, data: {} };
      if (!r.ok) { var e = new Error("http"); e.status = r.status; throw e; }
      return r.json().then(function (j) {
        var data = {};
        try { data = JSON.parse(unb64(j.content || "")) || {}; } catch (e) { data = {}; }
        return { sha: j.sha || null, data: data };
      });
    });
  }

  function pushMarks(cb) {
    var tok = getToken();
    if (!tok) { if (cb) cb("no-token"); return; }
    ghGet(tok).then(function (cur) {
      // start from the remote copy so we never drop marks written on another device,
      // then overlay the local edits (newest stamp wins)
      var merged = mergeMarks(cur.data || {}, localMarks());
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
      updateMarksMsg(r, st);
    });
  }
  function autoSaveTick() { saveAllLocal(); updateMarksMsg(); flushPush(); }

  function pullMarks(cb) {
    var tok = getToken();
    var p = tok
      ? ghGet(tok).then(function (cur) { return cur.data; })
      : fetch("marks.json?t=" + Date.now(), { cache: "no-store" })
          .then(function (r) { if (!r.ok) { var e = new Error("http"); e.status = r.status; throw e; } return r.json(); })
          .catch(function () { return null; });
    p.then(function (j) {
      if (j === null) { updateMarksMsg(); if (cb) cb("fail"); return; }
      state.sharedMarks = j || {};
      try { localStorage.setItem("sk_marks_pulled", String(Date.now())); } catch (e) {}
      if (state.lessonId && !isTool(state.group) && lesson(state.lessonId)) renderStage(lesson(state.lessonId));
      updateMarksMsg();
      if (cb) cb("ok");
    }).catch(function () { updateMarksMsg(); if (cb) cb("fail"); });
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
    $("#setClear").onclick = function () { try { localStorage.removeItem("sk_gh_token"); } catch (e) {} $("#setMsg").textContent = "Token removed"; updateMarksMsg(); };
    $("#setClose").onclick = closeSettings;
    updateMarksMsg();
  }

  function ensureLoop() { if (!state.raf) loop(); }
  function startFollowBase() {
    if (!state.audio) return;
    state.baseT = state.audio.currentTime;
    state.baseI = state.cur < 0 ? 0 : state.cur;
    ensureLoop();
  }
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
    // follow underline
    if (state.follow && state.swaras.length) {
      var n = state.swaras.length;
      var adv = Math.floor((t - state.baseT) * state.speed);
      var idx = ((state.baseI + adv) % n + n) % n;
      if (idx !== state.cur) setCur(idx);
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
  renderTabs();
  pullMarks();
  setInterval(autoSaveTick, 60000);    // background save + push every minute
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { saveAllLocal(); flushPush(); }
    else { pullMarks(); }
  });
  window.addEventListener("pagehide", function () { saveAllLocal(); flushPush(); });
  window.addEventListener("online", function () { flushPush(); });
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
  var start = state.lessonId && lesson(state.lessonId) ? state.lessonId : (lessonsOf(state.group)[0] || {}).id;
  if (start) open(start);
})();
