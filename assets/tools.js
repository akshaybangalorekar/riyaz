/* रियाज़ — tools: सुर पेटी (harmonium) + तबला (theka machine with variations)
   All sound is synthesised in the browser with the Web Audio API — no samples, no downloads. */
(function () {
  "use strict";

  /* ---------------- audio plumbing ---------------- */
  var ctx = null, master = null;
  function AC() {
    if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (ctx.state === "suspended") { ctx.resume(); }
    return ctx;
  }
  function bus() {
    var c = AC();
    if (!master) { master = c.createGain(); master.gain.value = 0.85; master.connect(c.destination); }
    return master;
  }
  function noise(t, dur, f, q, gain) {
    var c = AC(), n = c.createBufferSource();
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2); }
    n.buffer = buf;
    var bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
    var g = c.createGain(); g.gain.value = gain;
    n.connect(bp); bp.connect(g); g.connect(bus()); n.start(t);
  }

  /* ---------------- sur peti (harmonium) ---------------- */
  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var DRONE = { sa: null, pa: null };

  function reed(freq, when) {
    var c = AC(), t = when || c.currentTime;
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.05);
    var oscs = [];
    var spec = [[1, 0.60, "sawtooth"], [2, 0.30, "triangle"], [3, 0.16, "triangle"], [4, 0.09, "sine"], [6, 0.05, "sine"]];
    spec.forEach(function (s) {
      var o = c.createOscillator(); o.type = s[2]; o.frequency.value = freq * s[0];
      var og = c.createGain(); og.gain.value = s[1];
      o.connect(og); og.connect(lp); o.start(t); oscs.push(o);
    });
    var lfo = c.createOscillator(); lfo.frequency.value = 5.2;
    var lg = c.createGain(); lg.gain.value = freq * 0.006;
    lfo.connect(lg); oscs.forEach(function (o) { lg.connect(o.frequency); }); lfo.start(t);
    lp.connect(g); g.connect(bus());
    return {
      stop: function () {
        var e = AC().currentTime;
        try { g.gain.cancelScheduledValues(e); g.gain.setValueAtTime(g.gain.value || 0.0001, e); } catch (x) {}
        g.gain.exponentialRampToValueAtTime(0.0001, e + 0.18);
        oscs.forEach(function (o) { try { o.stop(e + 0.2); } catch (x) {} });
        try { lfo.stop(e + 0.2); } catch (x) {}
      }
    };
  }

  var WHITES = [
    { n: "सा", s: -12, oct: -1 }, { n: "रे", s: -10, oct: -1 }, { n: "ग", s: -8, oct: -1 }, { n: "म", s: -7, oct: -1 },
    { n: "प", s: -5, oct: -1 }, { n: "ध", s: -2, oct: -1 }, { n: "नि", s: -1, oct: -1 },
    { n: "सा", s: 0 }, { n: "रे", s: 2 }, { n: "ग", s: 4 }, { n: "म", s: 5 }, { n: "प", s: 7 }, { n: "ध", s: 9 }, { n: "नि", s: 11 },
    { n: "सा", s: 12, oct: 1 }
  ];
  var BLACKS = [
    { n: "रे", s: -11, k: 1, a: 0 }, { n: "ग", s: -9, k: 1, a: 1 }, { n: "म", s: -6, tv: 1, a: 3 }, { n: "ध", s: -4, k: 1, a: 4 }, { n: "नि", s: -3, k: 1, a: 5 },
    { n: "रे", s: 1, k: 1, a: 7 }, { n: "ग", s: 3, k: 1, a: 8 }, { n: "म", s: 6, tv: 1, a: 10 }, { n: "ध", s: 8, k: 1, a: 11 }, { n: "नि", s: 10, k: 1, a: 12 }
  ];
  function labelHTML(k) {
    var cls = [];
    if (k.oct === 1) cls.push("up"); if (k.oct === -1) cls.push("dn");
    if (k.k) cls.push("komal"); if (k.tv) cls.push("tivra");
    return '<span class="' + cls.join(" ") + '">' + k.n + "</span>";
  }

  function mountSurPeti(el) {
    var base = parseFloat(localStorage.getItem("sk_tonic") || "261.63");
    var voices = {}, droneOn = false;

    var html =
      '<div class="sk-h1">सुर पेटी</div>' +
      '<div class="sk-hsub">हारमोनियम — स्वर दबाकर सुनें। सा (मूल स्वर) चुनें, तानपूरा चलाएँ।</div>' +
      '<div class="sp-bar">' +
      '  <label class="sp-lab">सा = <select id="spTonic">' + NOTE_NAMES.map(function (n, i) {
        var f = 261.63 * Math.pow(2, i / 12);
        return '<option value="' + f.toFixed(2) + '"' + (Math.abs(f - base) < 0.5 ? " selected" : "") + ">" + n + "</option>";
      }).join("") + "</select></label>" +
      '  <button class="sk-btn" id="spDrone">तानपूरा चलाएँ</button>' +
      '  <span class="sp-note" id="spNote">—</span>' +
      "</div>" +
      '<div class="sp-scroll"><div class="sp-keys" id="spKeys"></div></div>' +
      '<div class="sp-hint">टिप: कंप्यूटर पर <b>a w s e d f t g y h u j k</b> दबाकर भी बजा सकते हैं।</div>';

    el.innerHTML = html;

    var keysBox = el.querySelector("#spKeys");
    var W = WHITES.length, ww = 100 / W;
    var kh = "";
    WHITES.forEach(function (k, i) {
      kh += '<div class="sp-key white" data-semi="' + k.s + '" style="width:' + ww + '%">' + labelHTML(k) + "</div>";
    });
    BLACKS.forEach(function (k) {
      var left = (k.a + 1) * ww - (ww * 0.62) / 2;
      kh += '<div class="sp-key black" data-semi="' + k.s + '" style="left:' + left + "%;width:" + (ww * 0.62) + '%">' + labelHTML(k) + "</div>";
    });
    keysBox.innerHTML = kh;

    var noteLbl = el.querySelector("#spNote");

    function freqOf(semi) { return base * Math.pow(2, semi / 12); }
    function down(semi, keyEl) {
      AC(); bus();
      if (voices[semi]) return;
      var semiToName = {};
      WHITES.concat(BLACKS).forEach(function (k) { semiToName[k.s] = k.n; });
      voices[semi] = reed(freqOf(semi));
      noteLbl.textContent = (semiToName[semi] || "") + "  ·  " + Math.round(freqOf(semi)) + " Hz";
      if (keyEl) keyEl.classList.add("on");
    }
    function up(semi, keyEl) {
      if (voices[semi]) { voices[semi].stop(); delete voices[semi]; }
      if (keyEl) keyEl.classList.remove("on");
    }

    Array.prototype.forEach.call(keysBox.querySelectorAll(".sp-key"), function (k) {
      var semi = parseInt(k.dataset.semi, 10);
      k.addEventListener("pointerdown", function (e) { e.preventDefault(); k.setPointerCapture(e.pointerId); down(semi, k); });
      k.addEventListener("pointerup", function () { up(semi, k); });
      k.addEventListener("pointercancel", function () { up(semi, k); });
      k.addEventListener("pointerleave", function () { if (voices[semi]) up(semi, k); });
    });

    var KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12 };
    function kd(ev) {
      if (ev.repeat) return;
      var semi = KEYMAP[ev.key.toLowerCase()];
      if (semi === undefined) return;
      var kEl = keysBox.querySelector('.sp-key[data-semi="' + semi + '"]');
      down(semi, kEl);
    }
    function ku(ev) {
      var semi = KEYMAP[ev.key.toLowerCase()];
      if (semi === undefined) return;
      var kEl = keysBox.querySelector('.sp-key[data-semi="' + semi + '"]');
      up(semi, kEl);
    }
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    el.querySelector("#spTonic").onchange = function () {
      base = parseFloat(this.value);
      localStorage.setItem("sk_tonic", this.value);
      // retune drone if on
      if (droneOn) { stopDrone(); startDrone(); }
    };
    function startDrone() { AC(); bus(); DRONE.sa = reed(base / 2); DRONE.pa = reed((base / 2) * Math.pow(2, 7 / 12)); }
    function stopDrone() { [DRONE.sa, DRONE.pa].forEach(function (v) { if (v) v.stop(); }); DRONE.sa = DRONE.pa = null; }
    el.querySelector("#spDrone").onclick = function () {
      droneOn = !droneOn;
      this.classList.toggle("on", droneOn);
      this.textContent = droneOn ? "तानपूरा बंद करें" : "तानपूरा चलाएँ";
      if (droneOn) startDrone(); else stopDrone();
    };

    return function cleanup() {
      Object.keys(voices).forEach(function (s) { voices[s].stop(); delete voices[s]; });
      if (droneOn) { stopDrone(); droneOn = false; }
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }

  /* ---------------- tabla ---------------- */
  function bayan(t, f0, dur, gain) {
    var c = AC(), o = c.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f0 * 1.8, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.10);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
    o.connect(g); g.connect(lp); lp.connect(bus()); o.start(t); o.stop(t + dur + 0.05);
    noise(t, 0.018, 220, 1, gain * 0.25);
  }
  function dayan(t, f, dur, gain, bright) {
    var c = AC();
    var ratios = [1, 1.5, 2.32, 3.1], amps = [1, 0.5, 0.3, 0.16];
    for (var i = 0; i < ratios.length; i++) {
      var o = c.createOscillator(); o.type = "sine"; o.frequency.value = f * ratios[i];
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain * amps[i], t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (1 - i * 0.12));
      o.connect(g); g.connect(bus()); o.start(t); o.stop(t + dur + 0.05);
    }
    noise(t, 0.014, bright ? 2600 : 1700, 1.2, gain * 0.45);
  }
  function slap(t, gain) { noise(t, 0.05, 1500, 0.8, gain * 0.65); dayan(t, 720, 0.06, gain * 0.28, 1); }

  var BOL = {
    "धा": function (t) { bayan(t, 92, 0.50, 0.85); dayan(t, 520, 0.38, 0.5, 0); },
    "धिं": function (t) { bayan(t, 88, 0.55, 0.85); dayan(t, 600, 0.55, 0.55, 1); },
    "धि": function (t) { bayan(t, 92, 0.38, 0.8); dayan(t, 540, 0.22, 0.45, 0); },
    "दिं": function (t) { bayan(t, 96, 0.30, 0.55); dayan(t, 600, 0.50, 0.5, 1); },
    "दि": function (t) { bayan(t, 96, 0.24, 0.5); dayan(t, 540, 0.18, 0.42, 0); },
    "दा": function (t) { dayan(t, 520, 0.28, 0.55, 0); },
    "ना": function (t) { dayan(t, 520, 0.36, 0.65, 0); },
    "तिं": function (t) { dayan(t, 640, 0.50, 0.7, 1); },
    "ति": function (t) { dayan(t, 560, 0.13, 0.55, 1); },
    "ता": function (t) { slap(t, 0.85); dayan(t, 640, 0.08, 0.35, 1); },
    "टा": function (t) { slap(t, 0.8); },
    "टे": function (t) { slap(t, 0.8); },
    "ट": function (t) { slap(t, 0.7); },
    "ते": function (t) { dayan(t, 600, 0.11, 0.5, 1); },
    "के": function (t) { slap(t, 0.75); },
    "क": function (t) { slap(t, 0.55); },
    "कि": function (t) { slap(t, 0.55); },
    "कत": function (t) { slap(t, 0.65); dayan(t, 560, 0.09, 0.28, 1); },
    "गे": function (t) { bayan(t, 88, 0.50, 0.9); },
    "ग": function (t) { bayan(t, 96, 0.26, 0.75); },
    "गि": function (t) { bayan(t, 96, 0.2, 0.65); },
    "तू": function (t) { bayan(t, 100, 0.30, 0.65); dayan(t, 500, 0.14, 0.28, 0); },
    "तु": function (t) { bayan(t, 100, 0.24, 0.55); },
    "र": function (t) { dayan(t, 600, 0.09, 0.42, 1); },
    "ध": function (t) { bayan(t, 92, 0.28, 0.65); },
    "घे": function (t) { bayan(t, 84, 0.5, 0.9); },
    "धे": function (t) { bayan(t, 88, 0.5, 0.85); dayan(t, 560, 0.32, 0.45, 0); }
  };
  function playBol(b, t) { (BOL[b] || BOL["ना"])(t); }

  var TAALS = [
    { id: "dadra", name: "दादरा", matras: 6, vibhag: [3, 3], sam: 1, tali: [1], khali: [4],
      bols: [["धा"], ["धिं"], ["ना"], ["धा"], ["तिं"], ["ना"]] },
    { id: "keherwa", name: "केहरवा", matras: 8, vibhag: [4, 4], sam: 1, tali: [1], khali: [5],
      bols: [["धा"], ["गे"], ["ना"], ["ति"], ["ना"], ["क"], ["धिं"], ["ना"]] },
    { id: "rupak", name: "रूपक", matras: 7, vibhag: [3, 2, 2], sam: 1, tali: [4, 6], khali: [1],
      bols: [["ति"], ["ति"], ["ना"], ["धिं"], ["ना"], ["धिं"], ["ना"]] },
    { id: "jhap", name: "झप ताल", matras: 10, vibhag: [2, 3, 2, 3], sam: 1, tali: [1, 3, 8], khali: [6],
      bols: [["धिं"], ["ना"], ["धिं"], ["धिं"], ["ना"], ["तिं"], ["ना"], ["धिं"], ["धिं"], ["ना"]] },
    { id: "ektaal", name: "एक ताल", matras: 12, vibhag: [2, 2, 2, 2, 2, 2], sam: 1, tali: [1, 5, 9, 11], khali: [3, 7],
      bols: [["धिं"], ["धिं"], ["धा", "गे"], ["ति", "र", "कि", "ट"], ["तू"], ["ना"], ["कत"], ["ता"], ["धा", "गे"], ["ति", "र", "कि", "ट"], ["धिं"], ["ना"]] },
    { id: "chautal", name: "चौ ताल", matras: 12, vibhag: [4, 4, 2, 2], sam: 1, tali: [1, 5, 9, 11], khali: [3, 7],
      bols: [["धा"], ["धा"], ["दिं"], ["ता"], ["ते", "टे"], ["धा"], ["दिं"], ["ता"], ["ते", "टे"], ["क", "ता"], ["ग", "दि"], ["ग", "न"]] },
    { id: "teentaal", name: "तीन ताल", matras: 16, vibhag: [4, 4, 4, 4], sam: 1, tali: [1, 5, 13], khali: [9],
      bols: [["धा"], ["धिं"], ["धिं"], ["धा"], ["धा"], ["धिं"], ["धिं"], ["धा"], ["धा"], ["तिं"], ["तिं"], ["ता"], ["ता"], ["धिं"], ["धिं"], ["धा"]] }
  ];

  var MODES = ["सादा ठेका", "अंत में तिरकिट", "अंत में दुगुन", "बदलता हुआ"];
  var TIRAKIT = ["ति", "र", "कि", "ट"];

  function variation(taal, v) {
    var bols = taal.bols.map(function (m) { return m.slice(); });
    if (v === 1) { // fill the matra just before sam with a tirakita
      bols[taal.matras - 2] = TIRAKIT.slice();
    } else if (v === 2) { // last vibhag played twice (dugun)
      var lastLen = taal.vibhag[taal.vibhag.length - 1];
      var start = taal.matras - lastLen;
      var flat = [];
      for (var i = start; i < taal.matras; i++) { flat = flat.concat(taal.bols[i]); }
      var doubled = flat.concat(flat);
      for (var j = 0; j < lastLen; j++) { bols[start + j] = doubled.slice(j * 2, j * 2 + 2); }
    }
    return bols;
  }

  function mountTabla(el) {
    var st = { taal: TAALS[6], bpm: 80, mode: 0, playing: false, matra: 0, cycle: 0, next: 0, timer: null, uiT: [], cur: null, liveV: 0 };

    var html =
      '<div class="sk-h1">तबला</div>' +
      '<div class="sk-hsub">ताल चुनें, गति (BPM) ठीक करें — तबला ठेका बजाएगा। “बदलता हुआ” चुनने पर हर आवर्त में प्रकार बदलेगा, जिससे लय पकड़ने का अभ्यास होगा।</div>' +
      '<div class="tb-bar">' +
      '  <label class="tb-lab">ताल <select id="tbTaal">' + TAALS.map(function (t) {
        return '<option value="' + t.id + '"' + (t.id === "teentaal" ? " selected" : "") + ">" + t.name + " · " + t.matras + " मात्रा</option>";
      }).join("") + "</select></label>" +
      '  <label class="tb-lab">प्रकार <select id="tbMode">' + MODES.map(function (m, i) {
        return '<option value="' + i + '">' + m + "</option>";
      }).join("") + "</select></label>" +
      "</div>" +
      '<div class="tb-bar">' +
      '  <button class="sk-btn on" id="tbPlay">▶ बजाओ</button>' +
      '  <button class="sk-btn tap" id="tbTap">ताल दबाएँ</button>' +
      '  <div class="sk-ctl"><label>गति</label><input type="range" id="tbBpm" min="40" max="240" step="1" value="80"><span class="sk-rate" id="tbBpmLbl">80 BPM</span></div>' +
      "</div>" +
      '<div class="tb-now" id="tbNow">—</div>' +
      '<div class="tb-grid" id="tbGrid"></div>' +
      '<div class="tb-legend"><span class="lg sam">X सम</span><span class="lg tali">२/३ ताली</span><span class="lg khali">० खाली</span></div>';

    el.innerHTML = html;

    var grid = el.querySelector("#tbGrid"), nowLbl = el.querySelector("#tbNow"), bpmLbl = el.querySelector("#tbBpmLbl");
    var playBtn = el.querySelector("#tbPlay");

    function renderGrid() {
      var t = st.taal, cells = [], i = 0, m = 0;
      t.vibhag.forEach(function (len) {
        var row = '<div class="tb-vibhag">';
        for (var k = 0; k < len; k++) {
          var num = m + 1;
          var mark = "";
          if (num === t.sam) mark = "X";
          else if (t.khali.indexOf(num) >= 0) mark = "0";
          else if (t.tali.indexOf(num) >= 0) mark = String(t.tali.indexOf(num) + 1);
          var cls = "tb-cell";
          if (num === t.sam) cls += " sam";
          if (t.khali.indexOf(num) >= 0) cls += " khali";
          else if (t.tali.indexOf(num) >= 0) cls += " tali";
          row += '<div class="' + cls + '" data-m="' + (num - 1) + '"><span class="tb-num">' + num + (mark ? " " + mark : "") +
            '</span><span class="tb-bol">' + t.bols[num - 1].join(" ") + "</span></div>";
          m++;
        }
        row += "</div>";
        cells.push(row);
      });
      grid.innerHTML = cells.join("");
    }

    function bolsNow() {
      var t = st.taal;
      var v = st.mode === 3 ? (st.cycle % 3) : st.mode;
      if (st.mode === 3) st.liveV = v; else st.liveV = st.mode;
      return variation(t, v);
    }

    function highlight(m) {
      var prev = grid.querySelector(".tb-cell.cur");
      if (prev) prev.classList.remove("cur");
      var c = grid.querySelector('.tb-cell[data-m="' + m + '"]');
      if (c) c.classList.add("cur");
      var t = st.taal;
      nowLbl.textContent = "मात्रा " + (m + 1) + " / " + t.matras + "  ·  " + t.bols[m].join(" ") +
        (st.mode === 3 ? "   (प्रकार " + (st.liveV + 1) + ")" : "");
    }

    function scheduleMatra(m, when, bols) {
      var dur = 60 / st.bpm, sub = dur / bols[m].length;
      for (var i = 0; i < bols[m].length; i++) { playBol(bols[m][i], when + i * sub); }
      var delay = Math.max(0, (when - AC().currentTime) * 1000);
      st.uiT.push(setTimeout(function () { if (st.playing) highlight(m); }, delay));
    }

    function tick() {
      if (!st.playing) return;
      var bols = st.curBols;
      while (st.next < AC().currentTime + 0.12) {
        scheduleMatra(st.matra, st.next, bols);
        st.next += 60 / st.bpm;
        st.matra++;
        if (st.matra >= st.taal.matras) {
          st.matra = 0; st.cycle++;
          st.curBols = bolsNow();
        }
      }
    }

    function start() {
      AC(); bus();
      st.playing = true; st.matra = 0; st.cycle = 0;
      st.curBols = bolsNow();
      st.next = AC().currentTime + 0.15;
      st.timer = setInterval(tick, 25);
      tick();
      playBtn.textContent = "⏸ रोको"; playBtn.classList.add("on");
    }
    function stop() {
      st.playing = false;
      if (st.timer) clearInterval(st.timer); st.timer = null;
      st.uiT.forEach(clearTimeout); st.uiT = [];
      var prev = grid.querySelector(".tb-cell.cur"); if (prev) prev.classList.remove("cur");
      nowLbl.textContent = "—";
      playBtn.textContent = "▶ बजाओ"; playBtn.classList.remove("on");
    }

    playBtn.onclick = function () { if (st.playing) stop(); else start(); };
    el.querySelector("#tbTaal").onchange = function () {
      st.taal = TAALS.filter(function (t) { return t.id === this.value; }.bind(this))[0];
      st.matra = 0; st.cycle = 0; renderGrid();
      if (st.playing) { st.curBols = bolsNow(); st.next = AC().currentTime + 0.1; }
    };
    el.querySelector("#tbMode").onchange = function () { st.mode = parseInt(this.value, 10); st.cycle = 0; if (st.playing) st.curBols = bolsNow(); };
    el.querySelector("#tbBpm").oninput = function () { st.bpm = parseInt(this.value, 10); bpmLbl.textContent = st.bpm + " BPM"; };
    var taps = [];
    el.querySelector("#tbTap").onclick = function () {
      var n = performance.now(); taps.push(n); if (taps.length > 5) taps.shift();
      if (taps.length >= 2) {
        var iv = []; for (var i = 1; i < taps.length; i++) iv.push(taps[i] - taps[i - 1]);
        var avg = iv.reduce(function (a, b) { return a + b; }, 0) / iv.length;
        if (avg > 150) { st.bpm = Math.max(40, Math.min(240, Math.round(60000 / avg))); el.querySelector("#tbBpm").value = st.bpm; bpmLbl.textContent = st.bpm + " BPM"; }
      }
    };

    renderGrid();
    return function cleanup() { stop(); };
  }

  window.RIYAZ = {
    tools: [
      { id: "surpeti", name: "सुर पेटी", mount: mountSurPeti },
      { id: "tabla", name: "तबला", mount: mountTabla }
    ]
  };
})();
