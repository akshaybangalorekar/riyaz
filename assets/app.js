/* संगीत-चैम्प — गुरुकूल स्वरलिपि अभ्यास
   Notation (Devanagari) + audio from Google Drive + a moving underline
   that follows the audio at a tempo the learner sets (tap-tempo or slider). */
(function () {
  "use strict";
  var D = window.SANGEET || { lessons: [] };
  var GROUPS = ["अलंकार", "ताल", "राग"];
  var TOOLS = (window.RIYAZ && window.RIYAZ.tools) || [];
  var TABS = GROUPS.concat(TOOLS.map(function (t) { return t.name; }));
  function isTool(g) { return TOOLS.some(function (t) { return t.name === g; }); }

  var state = {
    group: localStorage.getItem("sk_group") || "अलंकार",
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
    toolCleanup: null,
    segments: {},      // lessonId -> { lineIndex: {track, t} }   (local overrides)
    segPlay: null,     // {line, start, end, loop}
    segLoop: true,
    lineRows: [],
    sharedMarks: null  // marks.json loaded from the repo (shared across devices)
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
        if (isTool(state.group)) { showTool(state.group); return; }
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
    if (state.toolCleanup) { try { state.toolCleanup(); } catch (e) {} state.toolCleanup = null; }
    state.follow = false; state.swaras = []; state.cur = -1; state.tap = [];
    state.segPlay = null; state.lineRows = [];
  }

  function open(id) {
    var l = lesson(id);
    if (!l) return;
    stopAll();
    $(".sk-main").classList.remove("tool-mode");
    state.lessonId = id; state.mediaIdx = 0;
    localStorage.setItem("sk_lesson", id);
    renderList();
    renderStage(l);
  }

  function showTool(name) {
    stopAll();
    var t = TOOLS.filter(function (x) { return x.name === name; })[0];
    if (!t) return;
    $(".sk-main").classList.add("tool-mode");
    var stage = $("#stage");
    stage.innerHTML = "";
    state.toolCleanup = t.mount(stage);
  }

  function renderStage(l) {
    var s = $("#stage");
    var html = '<div class="sk-h1">' + esc(l.title) + "</div>";
    if (l.sub) html += '<div class="sk-hsub">' + esc(l.sub) + "</div>";

    // media tabs
    if (l.media.length > 1) {
      html += '<div class="sk-mediatabs">' + l.media.map(function (m, i) {
        return '<button class="sk-mtab' + (i === state.mediaIdx ? " on" : "") + '" data-i="' + i + '">' +
          (m.kind === "video" ? "🎬 " : "🎧 ") + esc(m.name.replace(/\.[a-z0-9]+$/i, "")) + "</button>";
      }).join("") + "</div>";
    }
    html += '<div class="sk-player" id="player"></div>';

    // notation (shown right under the player, so it is visible while listening)
    if (l.lines && l.lines.length) {
      html += '<div class="sk-notation" id="notation"></div>';
    } else {
      html += '<div class="sk-dim" style="margin-top:10px">इस पाठ की लिखित स्वरलिपि नहीं है — वीडियो देखें।</div>';
    }

    // controls (only if there is notation)
    if (l.lines && l.lines.length) {
      html += '<div class="sk-controls">' +
        '<button class="sk-btn" id="btnFollow">▶ रेखा चलाओ</button>' +
        '<button class="sk-btn tap" id="btnTap">ताल दबाएँ</button>' +
        '<button class="sk-btn" id="btnNext">अगला ›</button>' +
        '<button class="sk-btn' + (state.segLoop ? " on" : "") + '" id="btnLoop">दोहराएँ</button>' +
        '<button class="sk-btn" id="btnClear">चिह्न हटाएँ</button>' +
        '<div class="sk-ctl"><label>गति</label><input type="range" id="rngSpeed" min="0.5" max="6" step="0.1" value="' + state.speed + '"><span class="sk-rate" id="lblSpeed">' + state.speed.toFixed(1) + ' स्वर/से.</span></div>' +
        '<div class="sk-ctl"><label>आवाज़</label><input type="range" id="rngRate" min="0.5" max="1.25" step="0.05" value="1"><span class="sk-rate" id="lblRate">1.00×</span></div>' +
        "</div>" +
        '<div class="sk-hint">पंक्ति-अभ्यास: किसी पंक्ति का <b>▶</b> दबाकर सिर्फ़ वही पंक्ति सुनें। पहली बार ऑडियो चलाते समय हर पंक्ति की शुरुआत पर उस पंक्ति का <b>⏱</b> दबाएँ — फिर हर पंक्ति अलग चलेगी।</div>' +
        '<div class="marks-bar">' +
          '<button class="sk-btn" id="mkSave">GitHub पर सहेजें</button>' +
          '<button class="sk-btn" id="mkDl">डाउनलोड</button>' +
          '<input id="mkToken" class="mk-token" type="password" autocomplete="off" placeholder="GitHub token (सिर्फ़ इस ब्राउज़र में रहेगा)">' +
          '<span class="mk-msg" id="mkMsg"></span>' +
        "</div>";
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
    if (!m) { p.innerHTML = '<div class="sk-dim">इस पाठ के लिए कोई ऑडियो/वीडियो नहीं मिला।</div>'; return; }
    if (m.kind === "video") {
      p.innerHTML = '<iframe class="sk-iframe" src="' + mediaURL(m) + '" allow="autoplay; fullscreen" allowfullscreen></iframe>' +
        '<div class="sk-dim">🎬 ' + esc(m.name) + "</div>";
    } else {
      p.innerHTML = '<audio class="sk-audio" id="au" controls preload="none" referrerpolicy="no-referrer" src="' + mediaURL(m) + '"></audio>' +
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
      pb.title = "सिर्फ़ यह पंक्ति सुनें";
      pb.onclick = function () { playLine(li); };
      var mb = document.createElement("button");
      mb.className = "ln-btn mark"; mb.type = "button"; mb.textContent = "⏱";
      mb.title = "अभी की जगह = इस पंक्ति की शुरुआत";
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
      tokenize(line.text).forEach(function (tk) {
        if (tk.sep) {
          var sp = document.createElement("span");
          sp.className = "sk-sep"; sp.textContent = tk.t;
          row.appendChild(sp);
        } else {
          var sw = document.createElement("span");
          sw.className = "sk-sw" + (tk.oct === 1 ? " oct1" : tk.oct === -1 ? " octm" : "");
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
          $("#lblSpeed").textContent = state.speed.toFixed(1) + " स्वर/से.";
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
      if (state.audio) state.audio.pause();
      renderNotation(lesson(state.lessonId));
    };
    var ms = $("#mkSave");
    if (ms) ms.onclick = saveMarksToGitHub;
    var md = $("#mkDl");
    if (md) md.onclick = function () {
      var blob = new Blob([JSON.stringify(allMarks(), null, 1)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "marks.json";
      document.body.appendChild(a); a.click(); a.remove();
    };
    $("#rngSpeed").oninput = function () {
      state.speed = +this.value;
      $("#lblSpeed").textContent = state.speed.toFixed(1) + " स्वर/से.";
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
    bf.textContent = state.follow ? "⏸ रेखा रोकें" : "▶ रेखा चलाओ";
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
  function segsOf() {
    var k = state.lessonId, base = {};
    if (state.sharedMarks && state.sharedMarks[k]) {
      try { base = JSON.parse(JSON.stringify(state.sharedMarks[k])); } catch (e) { base = {}; }
    }
    var loc = localSegs();
    Object.keys(loc).forEach(function (i) { base[i] = loc[i]; });
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
    localSegs()[li] = { track: state.mediaIdx, t: +state.audio.currentTime.toFixed(2) };
    saveSegs();
    renderNotation(lesson(state.lessonId));
    var r = state.lineRows[li]; if (r) r.classList.add("marked");
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
  function saveMarksToGitHub() {
    var inp = $("#mkToken");
    var tok = (inp && inp.value.trim()) || localStorage.getItem("sk_gh_token") || "";
    if (!tok) { mkMsg("GitHub token डालें (एक बार)"); return; }
    try { localStorage.setItem("sk_gh_token", tok); } catch (e) {}
    mkMsg("सहेजा जा रहा है…");
    var api = "https://api.github.com/repos/akshaybangalorekar/riyaz/contents/marks.json";
    var hdr = { "Authorization": "Bearer " + tok, "Accept": "application/vnd.github+json" };
    fetch(api, { headers: hdr, cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var payload = { message: "Update line marks", branch: "main", content: btoa(unescape(encodeURIComponent(JSON.stringify(allMarks(), null, 1)))) };
        if (j && j.sha) payload.sha = j.sha;
        return fetch(api, { method: "PUT", headers: { "Authorization": "Bearer " + tok, "Accept": "application/vnd.github+json", "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      })
      .then(function (r) { mkMsg(r && r.ok ? "सहेज लिया — सब डिवाइस पर दिखेगा" : "सहेजना असफल (token की अनुमति जाँचें)"); })
      .catch(function () { mkMsg("नेटवर्क समस्या"); });
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
    if (tm) { var tn = decodeURIComponent(tm[1]); var tl = TOOLS.filter(function (x) { return x.id === tn || x.name === tn; })[0]; if (tl) state.group = tl.name; }
  })();
  renderTabs();
  loadSharedMarks();
  if (isTool(state.group)) {
    showTool(state.group);
  } else {
    renderList();
    var start = state.lessonId && lesson(state.lessonId) ? state.lessonId : (lessonsOf(state.group)[0] || {}).id;
    if (start) open(start);
  }
})();
