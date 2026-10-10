/* संगीत-चैम्प — गुरुकूल स्वरलिपि अभ्यास
   Notation (Devanagari) + audio from Google Drive + a moving underline
   that follows the audio at a tempo the learner sets (tap-tempo or slider). */
(function () {
  "use strict";
  var D = window.SANGEET || { lessons: [] };
  var GROUPS = ["अलंकार", "ताल", "राग"];

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
    audio: null
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
  function mediaURL(m) {
    if (m.kind === "video") return "https://drive.google.com/file/d/" + m.id + "/preview";
    return "https://drive.google.com/uc?export=download&id=" + m.id;
  }

  /* ---------- chrome ---------- */
  function renderTabs() {
    var el = $("#tabs");
    el.innerHTML = GROUPS.map(function (g) {
      return '<button class="sk-tab' + (g === state.group ? " on" : "") + '" data-g="' + g + '">' + g + "</button>";
    }).join("");
    Array.prototype.forEach.call(el.children, function (b) {
      b.onclick = function () {
        state.group = b.dataset.g;
        localStorage.setItem("sk_group", state.group);
        renderTabs(); renderList();
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
  }

  function open(id) {
    var l = lesson(id);
    if (!l) return;
    stopAll();
    state.lessonId = id; state.mediaIdx = 0;
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
        '<div class="sk-ctl"><label>गति</label><input type="range" id="rngSpeed" min="0.5" max="6" step="0.1" value="' + state.speed + '"><span class="sk-rate" id="lblSpeed">' + state.speed.toFixed(1) + ' स्वर/से.</span></div>' +
        '<div class="sk-ctl"><label>आवाज़</label><input type="range" id="rngRate" min="0.5" max="1.25" step="0.05" value="1"><span class="sk-rate" id="lblRate">1.00×</span></div>' +
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
      p.innerHTML = '<audio class="sk-audio" id="au" controls preload="none" src="' + mediaURL(m) + '"></audio>' +
        '<div class="sk-dim">🎧 ' + esc(m.name) + "</div>";
      var au = $("#au");
      state.audio = au;
      au.addEventListener("play", function () { startFollowBase(); });
      au.addEventListener("seeked", function () { startFollowBase(); });
      au.addEventListener("ended", function () { state.follow = false; syncBtn(); });
    }
  }

  function renderNotation(l) {
    var box = $("#notation");
    box.innerHTML = "";
    state.swaras = [];
    l.lines.forEach(function (line, li) {
      var row = document.createElement("div");
      row.className = "sk-line";
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
  }

  function startFollowBase() {
    if (!state.audio) return;
    state.baseT = state.audio.currentTime;
    state.baseI = state.cur < 0 ? 0 : state.cur;
    if (!state.raf) loop();
  }

  function loop() {
    state.raf = requestAnimationFrame(loop);
    if (!state.follow || !state.audio) return;
    var t = state.audio.currentTime;
    var n = state.swaras.length;
    if (!n) return;
    var adv = Math.floor((t - state.baseT) * state.speed);
    var idx = ((state.baseI + adv) % n + n) % n;
    if (idx !== state.cur) setCur(idx);
  }

  /* ---------- boot ---------- */
  // deep link:  ?lesson=rg_bhairavi   or   #rg_bhairavi
  (function () {
    var m = /[?&]lesson=([^&#]+)/.exec(location.search);
    var id = m ? decodeURIComponent(m[1]) : (location.hash ? location.hash.slice(1) : "");
    if (id && lesson(id)) { state.lessonId = id; state.group = lesson(id).group; }
  })();
  renderTabs(); renderList();
  var start = state.lessonId && lesson(state.lessonId) ? state.lessonId : (lessonsOf(state.group)[0] || {}).id;
  if (start) open(start);
})();
