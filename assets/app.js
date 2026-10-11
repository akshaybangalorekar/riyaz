/* Riyaz — Gurukool sargam practice
   Notation (Devanagari) + audio from Google Drive + a moving underline
   and per-line timings you set by ear with the stopwatch button. */
(function () {
  "use strict";
  var D = window.SANGEET || { lessons: [] };
  var GROUPS = ["Alankar", "Taal", "Raag"];
  var TABS = GROUPS;

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
    raagSect: null     // which part of a raag is showing (aaroh / mukt / …)
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
        setRail(false);
        renderTabs();
        renderList();
        var first = lessonsOf(state.group)[0];
        if (first) open(first.id);
      };
    });
  }
  function lessonsOf(g) { return D.lessons.filter(function (l) { return l.group === g; }); }

  /* ---------- raag parts ---------- */
  var RAAG_SECS = [
    { k: "aaroh",   t: "आरोह · अवरोह · पकड़" },
    { k: "mukt",    t: "मुक्त आलाप" },
    { k: "bada",    t: "बड़ा ख्याल" },
    { k: "bandish", t: "बंदिश" },
    { k: "laikari", t: "लयकारी" },
    { k: "tana",    t: "तान" },
    { k: "other",   t: "अन्य" }
  ];
  function raagSect(x) {
    var t = (x || "").toLowerCase();
    if (/aaroh|avroh|pakad|आरोह|अवरोह|पकड/.test(t)) return "aaroh";
    if (/mukt aalap|मुक्त आलाप/.test(t)) return "mukt";
    if (/bada khayal|badakhyal|बड़ा ख्याल/.test(t)) return "bada";
    if (/laikari|लयकारी/.test(t)) return "laikari";
    if (/tana|तान/.test(t)) return "tana";
    if (/chhota khayal|bandish|antara|sthayi|बंदिश|अंतरा|स्थायी/.test(t)) return "bandish";
    return "other";
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
  function raagSectLabel(k) {
    var hit = RAAG_SECS.filter(function (x) { return x.k === k; })[0];
    return hit ? hit.t : "";
  }

  function alNumber(l) { var m = /(\d+)/.exec(l.title || ""); return m ? +m[1] : 0; }
  function mediaIdxFor(l, kind) {
    var ms = l.media || [];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], nm = (m.name || "").toLowerCase();
      if (kind === "video") { if (m.kind === "video") return i; }
      else if (m.kind === "audio" && nm.indexOf(kind) === 0) return i;
    }
    return -1;
  }
  function renderList() {
    var el = $("#list");
    if (state.group === "Alankar") {
      el.classList.add("sections");
      var secs = [{ k: "komal", h: "Komal" }, { k: "shuddha", h: "Shuddha" }, { k: "video", h: "Alankar + Taal" }];
      var html = "";
      secs.forEach(function (sec) {
        var items = lessonsOf("Alankar").filter(function (l) { return mediaIdxFor(l, sec.k) >= 0; })
          .sort(function (a, b) { return alNumber(a) - alNumber(b); });
        if (!items.length) return;
        html += '<div class="sk-sec"><div class="sk-sec-h">' + sec.h + '</div><div class="sk-grid">' +
          items.map(function (l) {
            var i = mediaIdxFor(l, sec.k);
            var on = (l.id === state.lessonId && state.mediaIdx === i) ? " on" : "";
            return '<button class="sk-num' + on + '" data-id="' + l.id + '" data-m="' + i + '">' + alNumber(l) + "</button>";
          }).join("") + "</div></div>";
      });
      el.innerHTML = html;
      Array.prototype.forEach.call(el.querySelectorAll(".sk-num"), function (b) {
        b.onclick = function () { open(b.dataset.id, +b.dataset.m); setRail(true); };
      });
      return;
    }
    if (state.group === "Taal") {
      el.classList.add("sections");
      var tl = lessonsOf("Taal"), count = {};
      tl.forEach(function (l) { var k = l.taal || "Taal"; count[k] = (count[k] || 0) + 1; });
      el.innerHTML = '<div class="sk-sec">' + tl.map(function (l) {
        var k = l.taal || "Taal";
        var extra = count[k] > 1 && l.title ? l.title + (l.sub ? " \u00b7 " : "") : "";
        return '<button class="sk-item' + (l.id === state.lessonId ? " on" : "") + '" data-id="' + l.id + '">' +
          '<span class="sk-big">' + esc(k) + '</span>' +
          '<span class="sk-dash">\u2013</span>' +
          '<span class="sk-small">' + esc(extra + (l.sub || "")) + "</span></button>";
      }).join("") + "</div>";
      Array.prototype.forEach.call(el.querySelectorAll(".sk-item"), function (b) {
        b.onclick = function () { open(b.dataset.id); setRail(true); };
      });
      return;
    }
    if (state.group === "Raag") {
      el.classList.add("sections");
      el.innerHTML = lessonsOf("Raag").map(function (l) {
        return '<div class="sk-sec"><div class="sk-sec-h raag">' + esc(l.title) + "</div>" +
          raagSections(l).map(function (x) {
            var on = (l.id === state.lessonId && state.raagSect === x.k) ? " on" : "";
            return '<button class="sk-item' + on + '" data-id="' + l.id + '" data-s="' + x.k + '">' + esc(x.t) + "</button>";
          }).join("") + "</div>";
      }).join("");
      Array.prototype.forEach.call(el.querySelectorAll(".sk-item"), function (b) {
        b.onclick = function () { open(b.dataset.id, -1, b.dataset.s); setRail(true); };
      });
      return;
    }
    el.classList.remove("sections");
    el.innerHTML = lessonsOf(state.group).map(function (l) {
      return '<button class="sk-item' + (l.id === state.lessonId ? " on" : "") + '" data-id="' + l.id + '">' +
        esc(l.title) + (l.sub ? '<span class="sk-sub">' + esc(l.sub) + "</span>" : "") + "</button>";
    }).join("");
    Array.prototype.forEach.call(el.children, function (b) {
      b.onclick = function () { open(b.dataset.id); setRail(true); };
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

  function open(id, mIdx, sect) {
    var l = lesson(id);
    if (!l) return;
    stopAll();
    state.lessonId = id;
    state.raagSect = sect || null;
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
    var fname = (mcur.name || "").replace(/\.[a-z0-9]+$/i, "");
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
      (meta.length ? ' <span class="sk-file">' + esc(meta.join(" \u00b7 ")) + "</span>" : "") + "</div>";
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
        (l.group === "Alankar" ? "" : '<button class="sk-btn stop" id="btnStop" type="button">■ Stop</button>') +
        (curVideo || !secHasLines ? "" : '<span class="sk-hint">Tap <b>▶</b> to play a line · <b>■</b> to stop · <b>⏱</b> to set its start.</span>') +
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
        '<button class="sk-btn" id="btnClear">Clear marks</button>' +
        '<div class="sk-ctl"><label>Rate</label><input type="range" id="rngRate" min="0.5" max="1.25" step="0.05" value="1"><span class="sk-rate" id="lblRate">1.00×</span></div>' +
        "</div>";
    }
    s.innerHTML = html;

    // wire media tabs
    Array.prototype.forEach.call(s.querySelectorAll(".sk-mtab"), function (b) {
      b.onclick = function () { state.mediaIdx = +b.dataset.i; renderList(); renderStage(l); };
    });

    renderPlayer(l);
    var sb = $("#btnStop"); if (sb) sb.onclick = stopPlayback;
    if (l.lines && l.lines.length && secHasLines) { renderNotation(l); if (!curVideo && !bareLesson) wireControls(l); }
  }

  function renderPlayer(l) {
    var m = l.media[state.mediaIdx];
    var p = $("#player");
    p.classList.remove("bare");
    if (!m) { p.innerHTML = '<div class="sk-dim">No audio or video for this lesson.</div>'; return; }
    if (m.missing) { p.innerHTML = '<div class="sk-missing">🎧 <b>' + esc(m.name.replace(/\.[a-z0-9]+$/i, "")) + '</b> &mdash; we don&rsquo;t have this mp3 file yet.</div>'; return; }
    if (m.kind === "video") {
      p.innerHTML = '<div class="vidwrap"><iframe class="sk-iframe" src="' + mediaURL(m) + '" allow="autoplay; fullscreen" allowfullscreen></iframe></div>';
    } else if (l.group === "Alankar") {
      // alankar pages have no on-screen player: the per-line ▶ buttons drive playback
      p.classList.add("bare");
      p.innerHTML = '<audio id="au" preload="none" referrerpolicy="no-referrer" src="' + mediaURL(m) + '"></audio>';
      var au0 = $("#au");
      state.audio = au0;
      var srcs0 = audioSources(m), si0 = 0;
      au0.addEventListener("error", function () { si0++; if (si0 < srcs0.length) { au0.src = srcs0[si0]; au0.load(); } });
      au0.addEventListener("play", function () { ensureLoop(); });
      au0.addEventListener("ended", function () { state.segPlay = null; clearLineHL(); });
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
      au.addEventListener("play", function () { ensureLoop(); });
      au.addEventListener("ended", function () { state.segPlay = null; clearLineHL(); });
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
      pb.className = "ln-btn"; pb.type = "button"; pb.textContent = "▶";
      pb.title = "Play just this line";
      pb.onclick = function () { playLine(li); };
      var mb = document.createElement("button");
      mb.className = "ln-btn mark"; mb.type = "button"; mb.textContent = "⏱";
      mb.title = "Set this line's start at the current position";
      mb.onclick = function () { markLine(li); };
      ctl.appendChild(pb);
      if (l.group === "Alankar") {          // per-row stop, for alankar only
        var sb2 = document.createElement("button");
        sb2.className = "ln-btn stopb"; sb2.type = "button"; sb2.textContent = "■";
        sb2.title = "Stop";
        sb2.onclick = function () { stopPlayback(); };
        ctl.appendChild(sb2);
      }
      ctl.appendChild(mb);
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
          row.appendChild(sw);
        }
      });
      box.appendChild(row);
    });
  }

  function wireControls(l) {
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
  function normalizeLesson(src) {
    var dst = {};
    Object.keys(src || {}).forEach(function (key) {
      var v = src[key];
      if (!v || typeof v !== "object") return;
      if (typeof v.t === "number") {                       // legacy entry
        var tr = String(v.track || 0);
        dst[tr] = dst[tr] || {};
        dst[tr][key] = { t: v.t, at: v.at || 0 };
      } else {                                             // already per-track
        dst[key] = dst[key] || {};
        Object.keys(v).forEach(function (ln) {
          var e = v[ln];
          if (e && typeof e.t === "number") dst[key][ln] = { t: e.t, at: e.at || 0 };
        });
      }
    });
    return dst;
  }
  function normalizeAll(m) {
    var out = {};
    Object.keys(m || {}).forEach(function (les) { out[les] = normalizeLesson(m[les]); });
    return out;
  }
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
    var f = document.querySelector(".sk-iframe");
    if (f) { try { f.src = f.src; } catch (e) {} }   // reloading the frame halts the video
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
      var tracks = state.segments[k] || {};
      Object.keys(tracks).forEach(function (tr) {
        out[k][tr] = out[k][tr] || {};
        var lines = tracks[tr] || {};
        Object.keys(lines).forEach(function (ln) { out[k][tr][ln] = lines[ln]; });
      });
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
    var p = tok
      ? ghGet(tok).then(function (cur) { return cur.data; })
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
      if (j === null) { updateMarksMsg(); if (cb) cb("fail"); return; }
      state.sharedMarks = normalizeAll(j || {});
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
  loadAllLocal();
  renderTabs();
  pullMarks();
  setInterval(autoSaveTick, 60000);    // background save + push every minute
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { saveAllLocal(); flushPush(); }
    else { pullMarks(); }
  });
  window.addEventListener("pagehide", function () { saveAllLocal(); flushPush(); });
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
  var start = state.lessonId && lesson(state.lessonId) ? state.lessonId : (lessonsOf(state.group)[0] || {}).id;
  if (start) open(start);
})();
