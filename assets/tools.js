/* Riyaz — Vadya: Tanpura · Manjeera · Tabla
   All sound is synthesised in the browser with the Web Audio API.
   The Vadya panel can be hidden at any time; the instruments keep playing. */
(function () {
  "use strict";

  /* ---------------- audio plumbing ---------------- */
  var ctx = null, master = null, vbus = null;
  function AC() {
    if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (ctx.state === "suspended") { ctx.resume(); }
    return ctx;
  }
  function bus() {
    var c = AC();
    if (!master) { master = c.createGain(); master.gain.value = 0.9; master.connect(c.destination); }
    return master;
  }
  function vg() {
    var c = AC();
    if (!vbus) {
      vbus = c.createGain(); vbus.gain.value = 0.85;
      var comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 26; comp.ratio.value = 4;
      comp.attack.value = 0.004; comp.release.value = 0.25;
      vbus.connect(comp); comp.connect(bus());
    }
    return vbus;
  }
  function noise(t, dur, f, q, gain, type) {
    var c = AC(), n = c.createBufferSource();
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2); }
    n.buffer = buf;
    var bp = c.createBiquadFilter(); bp.type = type || "bandpass"; bp.frequency.value = f; bp.Q.value = q;
    var g = c.createGain(); g.gain.value = gain;
    n.connect(bp); bp.connect(g); g.connect(vg()); n.start(t);
  }

  /* ---------------- scales ---------------- */
  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function scaleList() {
    var out = [];
    for (var i = 0; i < 12; i++) out.push({ name: NOTE_NAMES[i], sa: 261.63 * Math.pow(2, i / 12) });
    return out;
  }
  var SCALES = scaleList();
  function scaleName(sa) {
    for (var i = 0; i < SCALES.length; i++) if (Math.abs(SCALES[i].sa - sa) < 0.5) return SCALES[i].name;
    return "C";
  }

  /* ---------------- state ---------------- */
  var S = {
    tanpura: { on: false, sa: 261.63, fourth: "Pa", vol: 0.75, next: 0, step: 0.95, idx: 0 },
    manjeera: { on: false, type: 1, every: 1, bpm: 80, vol: 0.5, next: 0 },
    tabla: { on: false, taal: "teentaal", mode: 0, bpm: 80, sa: 261.63, vol: 0.7, next: 0, matra: 0, cycle: 0, liveV: 0 },
    harm: { sa: 261.63, vol: 0.7, drone: false, voices: {}, droneVoices: [] }
  };

  /* ---------------- tanpura ---------------- */
  function pluck(freq, when, gain, dur) {
    var c = AC();
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200; lp.Q.value = 0.4;
    var out = c.createGain(); out.gain.value = 1; lp.connect(out); out.connect(vg());
    var parts = [[1, 1.0], [2, 0.62], [3, 0.40], [4, 0.26], [5, 0.17], [6, 0.11], [7, 0.07], [8, 0.05], [9, 0.03]];
    parts.forEach(function (p, i) {
      var o = c.createOscillator(); o.type = "sine";
      o.frequency.value = freq * p[0] * (1 + i * 0.0012);
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(gain * p[1], when + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur * (1 - i * 0.055));
      o.connect(g); g.connect(lp); o.start(when); o.stop(when + dur + 0.15);
    });
    // jawari shimmer
    var o2 = c.createOscillator(); o2.type = "triangle"; o2.frequency.value = freq * 2.01;
    var g2 = c.createGain();
    g2.gain.setValueAtTime(0.0001, when);
    g2.gain.exponentialRampToValueAtTime(gain * 0.10, when + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.5);
    o2.connect(g2); g2.connect(lp); o2.start(when); o2.stop(when + dur);
    noise(when, 0.012, freq * 6, 1, gain * 0.05);
  }
  function tanpuraStrings() {
    var sa = S.tanpura.sa;
    var pa = sa * Math.pow(2, S.tanpura.fourth === "Ma" ? 5 / 12 : 7 / 12) * 0.5; // mandra Pa / Ma
    return [pa, sa, sa, sa * 0.5];
  }
  function scheduleTanpura(horizon) {
    var T = S.tanpura;
    if (T.next < AC().currentTime) T.next = AC().currentTime + 0.1;
    while (T.next < horizon) {
      var strs = tanpuraStrings();
      pluck(strs[T.idx % 4], T.next, T.vol * 0.15, 4.2);
      T.idx++;
      T.next += T.step;
    }
  }
  function tanpuraStart() {
    AC(); vg();
    S.tanpura.idx = 0;
    S.tanpura.next = AC().currentTime + 0.12;
    S.tanpura.on = true;
    ensureTick();
  }
  function tanpuraStop() { S.tanpura.on = false; }

  /* ---------------- manjeera ---------------- */
  var MJ = [
    { name: "Thin (small)", f: 3300, d: 0.26, g: 1.0 },
    { name: "Medium", f: 2650, d: 0.36, g: 0.95 },
    { name: "Thick (large)", f: 2000, d: 0.52, g: 0.9 },
    { name: "Deep", f: 1450, d: 0.68, g: 0.85 }
  ];
  function manjeeraHit(type, when, gain) {
    var c = AC(), m = MJ[type] || MJ[1];
    var ratios = [1, 1.41, 1.93, 2.68, 3.42, 4.28];
    ratios.forEach(function (r, i) {
      var o = c.createOscillator(); o.type = "sine"; o.frequency.value = m.f * r;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(gain * m.g * (0.55 / (i + 1)), when + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, when + m.d * (1 - i * 0.1));
      o.connect(g); g.connect(vg()); o.start(when); o.stop(when + m.d + 0.08);
    });
    noise(when, 0.03, m.f * 1.3, 0.7, gain * 0.5);
  }
  function scheduleManjeera(horizon) {
    var M = S.manjeera;
    var step = 60 / M.bpm * Math.max(1, M.every);
    if (M.next < AC().currentTime) M.next = AC().currentTime + 0.1;
    while (M.next < horizon) {
      manjeeraHit(M.type, M.next, M.vol);
      M.next += step;
    }
  }
  function manjeeraStart() { AC(); vg(); S.manjeera.next = AC().currentTime + 0.12; S.manjeera.on = true; ensureTick(); }
  function manjeeraStop() { S.manjeera.on = false; }

  /* ---------------- tabla ---------------- */
  function bayan(t, f, dur, gain, open) {
    var c = AC(), o = c.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f * 1.9, t);
    o.frequency.exponentialRampToValueAtTime(f, t + (open ? 0.13 : 0.06));
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
    o.connect(g); g.connect(lp); lp.connect(vg()); o.start(t); o.stop(t + dur + 0.05);
    var o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 2.01;
    var g2 = c.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(gain * 0.22, t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.55);
    o2.connect(g2); g2.connect(lp); o2.start(t); o2.stop(t + dur);
    noise(t, 0.02, 190, 1, gain * 0.22);
  }
  function dayan(t, f, dur, gain, bright) {
    var c = AC();
    var ratios = [1, 1.59, 2.14, 2.30, 2.65, 3.50];
    var amps = [1, 0.55, 0.38, 0.30, 0.20, 0.11];
    for (var i = 0; i < ratios.length; i++) {
      var o = c.createOscillator(); o.type = "sine"; o.frequency.value = f * ratios[i];
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain * amps[i], t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (1 - i * 0.11));
      o.connect(g); g.connect(vg()); o.start(t); o.stop(t + dur + 0.06);
    }
    noise(t, 0.012, bright ? 2900 : 1900, 1.3, gain * 0.42);
  }
  function slap(t, gain) { noise(t, 0.05, 1600, 0.8, gain * 0.7); dayan(t, 720, 0.05, gain * 0.22, 1); }

  function bol(name, t, sa) {
    var b = sa * 0.5;   // bayan reference
    var d = sa;         // dayan reference
    switch (name) {
      case "धा": bayan(t, b, 0.50, 0.9, 1); dayan(t, d, 0.40, 0.52, 0); break;
      case "धिं": bayan(t, b * 0.97, 0.56, 0.9, 1); dayan(t, d * 1.19, 0.56, 0.56, 1); break;
      case "धि": bayan(t, b, 0.38, 0.85, 1); dayan(t, d * 1.06, 0.24, 0.46, 0); break;
      case "दिं": bayan(t, b * 1.05, 0.30, 0.6, 1); dayan(t, d * 1.19, 0.50, 0.5, 1); break;
      case "दि": bayan(t, b * 1.05, 0.24, 0.55, 1); dayan(t, d * 1.06, 0.19, 0.42, 0); break;
      case "दा": dayan(t, d, 0.28, 0.55, 0); break;
      case "ना": dayan(t, d, 0.38, 0.68, 0); break;
      case "तिं": dayan(t, d * 1.24, 0.52, 0.72, 1); break;
      case "ति": dayan(t, d * 1.10, 0.13, 0.56, 1); break;
      case "ता": slap(t, 0.85); dayan(t, d * 1.24, 0.08, 0.34, 1); break;
      case "टा": slap(t, 0.8); break;
      case "टे": slap(t, 0.8); break;
      case "ट": slap(t, 0.7); break;
      case "ते": dayan(t, d * 1.16, 0.11, 0.5, 1); break;
      case "के": slap(t, 0.75); break;
      case "क": slap(t, 0.55); break;
      case "कि": slap(t, 0.55); break;
      case "कत": slap(t, 0.65); dayan(t, d * 1.08, 0.09, 0.28, 1); break;
      case "गे": bayan(t, b, 0.52, 0.95, 1); break;
      case "ग": bayan(t, b * 1.06, 0.26, 0.8, 0); break;
      case "गि": bayan(t, b * 1.06, 0.20, 0.7, 0); break;
      case "तू": bayan(t, b * 1.1, 0.30, 0.68, 1); dayan(t, d * 0.97, 0.14, 0.28, 0); break;
      case "तु": bayan(t, b * 1.1, 0.24, 0.58, 0); break;
      case "र": dayan(t, d * 1.16, 0.09, 0.42, 1); break;
      case "ध": bayan(t, b, 0.28, 0.68, 1); break;
      case "घे": bayan(t, b * 0.94, 0.5, 0.9, 1); break;
      case "धे": bayan(t, b, 0.5, 0.88, 1); dayan(t, d * 1.08, 0.32, 0.46, 0); break;
      default: dayan(t, d, 0.3, 0.55, 0);
    }
  }

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
  var MODES = ["Plain theka", "Tirakit ending", "Dugun ending", "Changing (each cycle)"];
  var TIRAKIT = ["ति", "र", "कि", "ट"];
  function taalById(id) { for (var i = 0; i < TAALS.length; i++) if (TAALS[i].id === id) return TAALS[i]; return TAALS[6]; }
  function variation(taal, v) {
    var bols = taal.bols.map(function (m) { return m.slice(); });
    if (v === 1) { bols[taal.matras - 2] = TIRAKIT.slice(); }
    else if (v === 2) {
      var lastLen = taal.vibhag[taal.vibhag.length - 1], start = taal.matras - lastLen, flat = [];
      for (var i = start; i < taal.matras; i++) { flat = flat.concat(taal.bols[i]); }
      var doubled = flat.concat(flat);
      for (var j = 0; j < lastLen; j++) { bols[start + j] = doubled.slice(j * 2, j * 2 + 2); }
    }
    return bols;
  }
  function scheduleTabla(horizon) {
    var T = S.tabla, taal = taalById(T.taal);
    var v = T.mode === 3 ? (T.cycle % 3) : T.mode;
    T.liveV = v;
    var bols = variation(taal, v);
    if (T.next < AC().currentTime) T.next = AC().currentTime + 0.12;
    while (T.next < horizon) {
      var m = T.matra, arr = bols[m], dur = 60 / T.bpm, sub = dur / arr.length;
      for (var i = 0; i < arr.length; i++) bol(arr[i], T.next + i * sub, T.sa);
      T.next += dur;
      T.matra++;
      if (T.matra >= taal.matras) { T.matra = 0; T.cycle++; }
    }
    var ui = window.__vadyaUI;
    if (ui && ui.tablaBeat) ui.tablaBeat(T.matra);
  }
  function tablaStart() { AC(); vg(); S.tabla.matra = 0; S.tabla.cycle = 0; S.tabla.next = AC().currentTime + 0.12; S.tabla.on = true; ensureTick(); }
  function tablaStop() { S.tabla.on = false; }

  /* ---------------- one scheduler for everything ---------------- */
  var tickTimer = null;
  function ensureTick() {
    if (tickTimer) return;
    tickTimer = setInterval(function () {
      try {
        var h = AC().currentTime + 0.18;
        if (S.tanpura.on) scheduleTanpura(h);
        if (S.manjeera.on) scheduleManjeera(h);
        if (S.tabla.on) scheduleTabla(h);
      } catch (e) { window.__tickErr = String((e && e.message) || e); }
    }, 25);
  }

  /* ---------------- sur peti (harmonium) ---------------- */
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
  function reed(freq, gain) {
    var c = AC(), t = c.currentTime;
    var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0004, gain), t + 0.05);
    var oscs = [];
    [[1, 0.60, "sawtooth"], [2, 0.30, "triangle"], [3, 0.16, "triangle"], [4, 0.09, "sine"], [6, 0.05, "sine"]].forEach(function (s) {
      var o = c.createOscillator(); o.type = s[2]; o.frequency.value = freq * s[0];
      var og = c.createGain(); og.gain.value = s[1];
      o.connect(og); og.connect(lp); o.start(t); oscs.push(o);
    });
    var lfo = c.createOscillator(); lfo.frequency.value = 5.2;
    var lg = c.createGain(); lg.gain.value = freq * 0.006;
    lfo.connect(lg); oscs.forEach(function (o) { lg.connect(o.frequency); }); lfo.start(t);
    lp.connect(g); g.connect(vg());
    return {
      stop: function () {
        var e = AC().currentTime;
        try { g.gain.cancelScheduledValues(e); g.gain.setValueAtTime(g.gain.value || 0.0004, e); } catch (x) {}
        g.gain.exponentialRampToValueAtTime(0.0001, e + 0.18);
        oscs.forEach(function (o) { try { o.stop(e + 0.2); } catch (x) {} });
        try { lfo.stop(e + 0.2); } catch (x) {}
      }
    };
  }
  function harmNoteOn(semi) {
    var H = S.harm;
    if (H.voices[semi]) return;
    H.voices[semi] = reed(H.sa * Math.pow(2, semi / 12), 0.30 * H.vol);
  }
  function harmNoteOff(semi) {
    var H = S.harm;
    if (H.voices[semi]) { H.voices[semi].stop(); delete H.voices[semi]; }
  }
  function harmDrone(on) {
    var H = S.harm;
    H.droneVoices.forEach(function (v) { v.stop(); });
    H.droneVoices = [];
    H.drone = on;
    if (on) {
      H.droneVoices.push(reed(H.sa / 2, 0.22 * H.vol));
      H.droneVoices.push(reed((H.sa / 2) * Math.pow(2, 7 / 12), 0.22 * H.vol));
    }
  }

  /* ---------------- panel ---------------- */
  var NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function scaleSelect(id, cur) {
    return '<select id="' + id + '" class="v-sel">' + SCALES.map(function (s) {
      return '<option value="' + s.sa.toFixed(2) + '"' + (Math.abs(s.sa - cur) < 0.5 ? " selected" : "") + ">" + s.name + "</option>";
    }).join("") + "</select>";
  }
  function volRow(id, val) {
    return '<div class="v-vol"><span>Vol</span><input type="range" id="' + id + '" min="0" max="100" step="1" value="' +
      Math.round(val * 100) + '"><span class="v-pct" id="' + id + 'Lbl">' + Math.round(val * 100) + '%</span></div>';
  }
  function mount(el) {
    el.innerHTML =
      '<div class="v-head">Vadya</div>' +
      '<div class="v-cards">' +

      '<div class="v-card">' +
        '<div class="v-title">Tanpura</div>' +
        '<div class="v-row"><label>Scale</label>' + scaleSelect("vTpScale", S.tanpura.sa) + '</div>' +
        '<div class="v-row"><label>4th string</label><select id="vTpFourth" class="v-sel">' +
          '<option value="Pa"' + (S.tanpura.fourth === "Pa" ? " selected" : "") + '>Pa</option>' +
          '<option value="Ma"' + (S.tanpura.fourth === "Ma" ? " selected" : "") + '>Ma</option></select></div>' +
        '<div class="v-row"><button class="sk-btn" id="vTpPlay">▶ Play</button></div>' +
        volRow("vTpVol", S.tanpura.vol) +
      "</div>" +

      '<div class="v-card">' +
        '<div class="v-title">Manjeera</div>' +
        '<div class="v-row"><label>Type</label><select id="vMjType" class="v-sel">' +
          MJ.map(function (m, i) { return '<option value="' + i + '"' + (i === S.manjeera.type ? " selected" : "") + ">" + m.name + "</option>"; }).join("") +
        "</select></div>" +
        '<div class="v-row"><label>Beats</label><select id="vMjEvery" class="v-sel">' +
          '<option value="1"' + (S.manjeera.every === 1 ? " selected" : "") + ">Every beat</option>" +
          '<option value="2"' + (S.manjeera.every === 2 ? " selected" : "") + ">Every 2nd beat</option>" +
          '<option value="4"' + (S.manjeera.every === 4 ? " selected" : "") + ">Every 4th beat</option>" +
        "</select></div>" +
        '<div class="v-row"><label>Tempo</label><input type="range" id="vMjBpm" min="40" max="240" step="1" value="' + S.manjeera.bpm + '"><span class="v-pct" id="vMjBpmLbl">' + S.manjeera.bpm + ' BPM</span></div>' +
        '<div class="v-row"><button class="sk-btn" id="vMjPlay">▶ Play</button></div>' +
        volRow("vMjVol", S.manjeera.vol) +
      "</div>" +

      '<div class="v-card">' +
        '<div class="v-title">Tabla</div>' +
        '<div class="v-row"><label>Scale</label>' + scaleSelect("vTbScale", S.tabla.sa) + '</div>' +
        '<div class="v-row"><label>Taal</label><select id="vTbTaal" class="v-sel">' +
          TAALS.map(function (t) { return '<option value="' + t.id + '"' + (t.id === S.tabla.taal ? " selected" : "") + ">" + t.name + " · " + t.matras + " matra</option>"; }).join("") +
        "</select></div>" +
        '<div class="v-row"><label>Variation</label><select id="vTbMode" class="v-sel">' +
          MODES.map(function (m, i) { return '<option value="' + i + '"' + (i === S.tabla.mode ? " selected" : "") + ">" + m + "</option>"; }).join("") +
        "</select></div>" +
        '<div class="v-row"><label>Tempo</label><input type="range" id="vTbBpm" min="40" max="240" step="1" value="' + S.tabla.bpm + '"><span class="v-pct" id="vTbBpmLbl">' + S.tabla.bpm + ' BPM</span></div>' +
        '<div class="v-row"><button class="sk-btn" id="vTbPlay">▶ Play</button></div>' +
        volRow("vTbVol", S.tabla.vol) +
      "</div>" +

      '<div class="v-card v-card-wide">' +
        '<div class="v-title">Sur Peti (harmonium)</div>' +
        '<div class="v-row"><label>Scale</label>' + scaleSelect("vHmScale", S.harm.sa) + '</div>' +
        '<div class="v-row"><button class="sk-btn" id="vHmDrone">▶ Drone (सा–प)</button></div>' +
        '<div class="sp-scroll"><div class="sp-keys" id="vHmKeys"></div></div>' +
        volRow("vHmVol", S.harm.vol) +
      "</div>" +

      "</div>" +
      '<div class="v-note">Tip: the panel can be hidden — the instruments keep playing.</div>';

    function wirePlay(id, st, startFn, stopFn) {
      var b = el.querySelector("#" + id);
      function sync() { b.textContent = st.on ? "⏸ Stop" : "▶ Play"; b.classList.toggle("on", st.on); }
      b.onclick = function () { AC(); if (st.on) stopFn(); else startFn(); sync(); };
      sync();
      return sync;
    }
    var tpSync = wirePlay("vTpPlay", S.tanpura, tanpuraStart, tanpuraStop);
    var mjSync = wirePlay("vMjPlay", S.manjeera, manjeeraStart, manjeeraStop);
    var tbSync = wirePlay("vTbPlay", S.tabla, tablaStart, tablaStop);
    window.__vadyaSync = function () { tpSync(); mjSync(); tbSync(); };

    el.querySelector("#vTpScale").onchange = function () { S.tanpura.sa = parseFloat(this.value); S.tanpura.idx = 0; };
    el.querySelector("#vTpFourth").onchange = function () { S.tanpura.fourth = this.value; };
    el.querySelector("#vTpVol").oninput = function () { S.tanpura.vol = this.value / 100; el.querySelector("#vTpVolLbl").textContent = this.value + "%"; };

    el.querySelector("#vMjType").onchange = function () { S.manjeera.type = parseInt(this.value, 10); };
    el.querySelector("#vMjEvery").onchange = function () { S.manjeera.every = parseInt(this.value, 10); };
    el.querySelector("#vMjBpm").oninput = function () { S.manjeera.bpm = parseInt(this.value, 10); el.querySelector("#vMjBpmLbl").textContent = this.value + " BPM"; };
    el.querySelector("#vMjVol").oninput = function () { S.manjeera.vol = this.value / 100; el.querySelector("#vMjVolLbl").textContent = this.value + "%"; };

    el.querySelector("#vTbScale").onchange = function () { S.tabla.sa = parseFloat(this.value); };
    el.querySelector("#vTbTaal").onchange = function () { S.tabla.taal = this.value; S.tabla.matra = 0; S.tabla.cycle = 0; };
    el.querySelector("#vTbMode").onchange = function () { S.tabla.mode = parseInt(this.value, 10); S.tabla.cycle = 0; };
    el.querySelector("#vTbBpm").oninput = function () { S.tabla.bpm = parseInt(this.value, 10); el.querySelector("#vTbBpmLbl").textContent = this.value + " BPM"; };
    el.querySelector("#vTbVol").oninput = function () { S.tabla.vol = this.value / 100; el.querySelector("#vTbVolLbl").textContent = this.value + "%"; };

    /* harmonium */
    var keysBox = el.querySelector("#vHmKeys");
    if (keysBox) {
      var ww = 100 / WHITES.length, kh = "";
      WHITES.forEach(function (k) { kh += '<div class="sp-key white" data-semi="' + k.s + '" style="width:' + ww + '%">' + labelHTML(k) + "</div>"; });
      BLACKS.forEach(function (k) { var left = (k.a + 1) * ww - (ww * 0.62) / 2; kh += '<div class="sp-key black" data-semi="' + k.s + '" style="left:' + left + "%;width:" + (ww * 0.62) + '%">' + labelHTML(k) + "</div>"; });
      keysBox.innerHTML = kh;
      Array.prototype.forEach.call(keysBox.querySelectorAll(".sp-key"), function (k) {
        var semi = parseInt(k.dataset.semi, 10);
        k.addEventListener("pointerdown", function (e) { e.preventDefault(); try { k.setPointerCapture(e.pointerId); } catch (x) {} harmNoteOn(semi); k.classList.add("on"); });
        k.addEventListener("pointerup", function () { harmNoteOff(semi); k.classList.remove("on"); });
        k.addEventListener("pointercancel", function () { harmNoteOff(semi); k.classList.remove("on"); });
        k.addEventListener("pointerleave", function () { harmNoteOff(semi); k.classList.remove("on"); });
      });
    }
    var hd = el.querySelector("#vHmDrone");
    if (hd) hd.onclick = function () {
      var on = !S.harm.drone;
      harmDrone(on);
      this.textContent = on ? "⏸ Drone (सा–प)" : "▶ Drone (सा–प)";
      this.classList.toggle("on", on);
    };
    var hsc = el.querySelector("#vHmScale");
    if (hsc) hsc.onchange = function () { S.harm.sa = parseFloat(this.value); if (S.harm.drone) harmDrone(true); };
    var hv = el.querySelector("#vHmVol");
    if (hv) hv.oninput = function () { S.harm.vol = this.value / 100; el.querySelector("#vHmVolLbl").textContent = this.value + "%"; };
  }

  window.RIYAZ = { vadya: { mount: mount, state: S, ensureTick: ensureTick } };
})();
