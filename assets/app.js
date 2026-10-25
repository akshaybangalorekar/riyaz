/* Riyaz — Gurukool sargam practice
   Notation (Devanagari) + audio from Google Drive + a moving underline
   and per-line timings you set by ear with the stopwatch button. */
(function () {
  "use strict";
  var D = window.SANGEET || { lessons: [] };
  var GROUPS = ["Alankar", "Taal", "Raag"];
  var TABS = ["Favourites", "मंच"].concat(GROUPS);

  var state = {
    group: localStorage.getItem("sk_group") || "Alankar",
    lessonId: localStorage.getItem("sk_lesson") || null,
    mediaIdx: 0,
    cur: -1,
    raf: 0,
    audio: null,
    video: null,     // when the page is showing a video, this is it
    segments: {},     // lessonId -> { lineIndex: {track, t} }   (local overrides)
    segPlay: null,     // {line, start, end, loop}
    /* A line plays from its start to its end and then STOPS. It must not repeat: a line
       heard over and over makes it hard to tell where it finished. */
    segLoop: false,
    lineRows: [],
    sharedMarks: null, // marks.json loaded from the repo (shared across devices)
    cleared: {},       // lessons whose marks were cleared in this session
    edits: {},         // user corrections to the written notation
    editMode: false,   // set from the pen below
    editOpen: {},      // which lines have their editor open — each ✎ toggles one
    /* Editing is off unless it is switched on in Settings, so a stray tap cannot change
       the notation or a bandish. */
    canEdit: (function () { try { return localStorage.getItem("sk_can_edit") === "1"; } catch (e) { return false; } })(),
    grp: {},           // which Sthayi / Antara headings are folded away
    raagSect: null,    // which part of a raag is showing (aaroh / mukt / …)
    raagOpen: {},      // which raags are expanded in the rail
    fav: [],           // favourites: { id, m, sect, line } in the order you lined them up
    favAt: 0,          // when the list was last changed (for cross-device sync)
    playingLine: -1,   // which line the play button is currently running
    lineBtns: {}       // lineIndex -> its play button
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };

  function esc(s){ return String(s).replace(/[&<>]/g, function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];}); }

  /* ---------- when was it last saved to GitHub ---------- */
  var APP_VERSION = "4.3.0";   // major: final alankars, per-line spans, takes, safe playback
  var MELB = "Australia/Melbourne";
  function melbTime(ts) {
    try {
      return new Date(ts).toLocaleString("en-AU", {
        timeZone: MELB, day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true
      }).replace(/\u202f/g, " ") + " Melbourne";
    } catch (e) {
      try { return new Date(ts).toLocaleString() + " (local)"; } catch (e2) { return ""; }
    }
  }
  function savedAtValue() { try { return +localStorage.getItem("sk_last_push") || 0; } catch (e) { return 0; } }
  function showVersion() {
    var el = document.getElementById("appVer");
    if (el) el.textContent = "v" + APP_VERSION;
  }
  function showSavedAt() {
    var el = document.getElementById("savedAt");
    if (!el) return;
    var t = savedAtValue();
    el.textContent = t ? ("Last saved " + melbTime(t)) : "Not saved to GitHub yet";
    el.title = t ? ("Last push to GitHub: " + new Date(t).toISOString()) : "Nothing has been pushed from this device yet";
  }
  // a save from any device counts, so take the newest stamp we ever see
  function noteSavedAt(t) {
    t = +t || 0;
    if (!t) return;
    if (t > savedAtValue()) { try { localStorage.setItem("sk_last_push", String(t)); } catch (e) {} }
    showSavedAt();
  }
  function newestAt(o) {
    var best = 0;
    (function walk(x) {
      if (!x || typeof x !== "object") return;
      Object.keys(x).forEach(function (k) {
        if (k === "at") { var v = +x[k]; if (v > best) best = v; return; }
        walk(x[k]);
      });
    })(o);
    return best;
  }

  /* ---------- notation tokeniser ---------- */
  /* ---------- Latin letters in, Devanagari out ----------
     You can write in English letters and it comes out in Devanagari: sa re ga ma, or
     whole words like mahadev. The seven swar keep the spellings the app uses, so sa
     gives सा and ni gives नी rather than the bare स and नि. Anything already written
     in Devanagari is left exactly as it is. */
  var DEV_H = "\u094d";
  var TRANSLIT_C = [
    ["chh","\u091b"],["Ch","\u091b"],["kh","\u0916"],["gh","\u0918"],["ch","\u091a"],
    ["jh","\u091d"],["Th","\u0920"],["Dh","\u0922"],["th","\u0925"],["dh","\u0927"],
    ["ph","\u092b"],["bh","\u092d"],["sh","\u0936"],["Sh","\u0937"],
    ["ks","\u0915\u094d\u0937"],["tr","\u0924\u094d\u0930"],["gy","\u091c\u094d\u091e"],
    ["k","\u0915"],["g","\u0917"],["j","\u091c"],["T","\u091f"],["D","\u0921"],["N","\u0923"],
    ["t","\u0924"],["d","\u0926"],["n","\u0928"],["p","\u092a"],["b","\u092c"],["m","\u092e"],
    ["y","\u092f"],["r","\u0930"],["l","\u0932"],["v","\u0935"],["w","\u0935"],
    ["s","\u0938"],["h","\u0939"],["L","\u0933"]
  ];
  var TRANSLIT_V = [                      // the sign that follows a consonant
    ["ai","\u0948"],["au","\u094c"],["aa","\u093e"],["ii","\u0940"],["ee","\u0940"],
    ["uu","\u0942"],["oo","\u0942"],["A","\u093e"],["I","\u0940"],["U","\u0942"],
    ["i","\u093f"],["u","\u0941"],["e","\u0947"],["o","\u094b"],
    ["M","\u0902"],["H","\u0903"],["a",""]
  ];
  var TRANSLIT_VI = [                     // a vowel standing on its own
    ["ai","\u0910"],["au","\u0914"],["aa","\u0906"],["ii","\u0908"],["ee","\u0908"],
    ["uu","\u090a"],["oo","\u090a"],["A","\u0906"],["I","\u0908"],["U","\u090a"],
    ["i","\u0907"],["u","\u0909"],["e","\u090f"],["o","\u0913"],["a","\u0905"]
  ];
  var SARGAM = { sa: "\u0938\u093e", re: "\u0930\u0947", ri: "\u0930\u0947", ga: "\u0917",
                 ma: "\u092e", pa: "\u092a", dha: "\u0927", ni: "\u0928\u0940" };
  function pickTrans(list, str, i) {
    for (var k = 0; k < list.length; k++) {
      var p = list[k][0];
      if (str.substr(i, p.length) === p) return list[k];
    }
    return null;
  }
  function toDev(str) {
    str = String(str == null ? "" : str);
    if (!/[a-zA-Z]/.test(str)) return str;          // already Devanagari — leave it
    var out = "", i = 0, n = str.length;
    while (i < n) {
      var ch = str.charAt(i);
      if (!/[a-zA-Z]/.test(ch)) { out += ch; i++; continue; }
      /* s on its own is the avagraha ऽ — the sign for an अ swallowed by sandhi.
         स is written sa, and श is written sha. */
      if (ch === "s" || ch === "S") {
        var nx = str.charAt(i + 1);
        if (!/[a-zA-Z]/.test(nx) || !/[aeiouhAEIOU]/.test(nx)) { out += "\u093d"; i++; continue; }
      }
      var c = pickTrans(TRANSLIT_C, str, i);
      if (c) {
        out += c[1]; i += c[0].length;
        var v = pickTrans(TRANSLIT_V, str, i);
        if (v) { out += v[1]; i += v[0].length; }
        else if (i < n && /[a-zA-Z]/.test(str.charAt(i))) out += DEV_H;   // kya -> क्य
        continue;                                    // a word-final consonant keeps its short a
      }
      var vi = pickTrans(TRANSLIT_VI, str, i);
      if (vi) { out += vi[1]; i += vi[0].length; continue; }
      out += ch; i++;
    }
    return out;
  }
  function devSwar(t) {                              // a sargam name keeps the app's spelling
    var low = String(t == null ? "" : t).toLowerCase();
    return SARGAM[low] || toDev(t);
  }

  function tokenize(text) {
    return text.split(/\s+/).filter(Boolean).map(function (tok) {
      var t = tok, mkOpen = false, mkClose = false, mkSpan = 1, mdOpen = false, mdClose = false, kanMk = false;
      /* If the braces sit inside the brackets — र({गरे}) — the murki belongs to the small
         note above, not to the whole swar. Only a brace outside the brackets wraps the
         main swar. */
      var pmk = /\(([^)]*)\)$/.exec(t);
      if (pmk && /[{}]/.test(pmk[1])) {
        kanMk = true;
        t = t.replace(/[{}]/g, "");           // keep the braces out of the kan text
      } else if (t.indexOf("{") >= 0 || t.indexOf("}") >= 0) {
        /* { ... }2 — the count after the closing brace says the group spreads over that
           many matras, so a long murki is not squeezed into a single beat. */
        var sp = /\}\s*[x\u00d7]?\s*(\d+)\s*$/.exec(t);
        if (sp) { mkSpan = parseInt(sp[1], 10); t = t.replace(/\}\s*[x\u00d7]?\s*\d+\s*$/, "}"); }
        mkOpen = t.indexOf("{") >= 0;
        mkClose = t.indexOf("}") >= 0;
        t = t.replace(/[{}]/g, "");
        /* {2.re.ma.pa} — the count comes first and the dots separate the swar */
        var lead = /^\s*(\d+)\s*[.\s]/.exec(t);
        if (lead) { mkSpan = parseInt(lead[1], 10); t = t.replace(/^\s*\d+\s*[.\s]/, ""); }
        t = t.replace(/\./g, " ");
      }
      /* < > wrap a meend — a slide from one swar to the next. Its curve is drawn above,
         so it is never confused with a murki's curve below. */
      if (t.indexOf("<") >= 0 || t.indexOf(">") >= 0) {
        mdOpen = t.indexOf("<") >= 0;
        mdClose = t.indexOf(">") >= 0;
        t = t.replace(/[<>]/g, "");
      }
      /* One dash on its own is an empty matra — leave the cell blank. Two or more
         dashes ask for a single dash to be shown instead. Every page, like the avagraha. */
      if (/^[-\u2010-\u2015\u2212]{2,}$/.test(t)) {
        return { sep: true, t: "\u2013", mkOpen: mkOpen, mkClose: mkClose, mkSpan: mkSpan, mdOpen: mdOpen, mdClose: mdClose };
      }
      if (/^[-\u2010-\u2015\u2212]$/.test(t)) {
        return { sep: false, t: "", oct: 0, komal: false, kan: "", kanKomal: false, kanOct: 0,
                 shruti: "", mkOpen: mkOpen, mkClose: mkClose, mkSpan: mkSpan, mdOpen: mdOpen, mdClose: mdClose };
      }
      if (t === "|" || t === "/" || t === "।" || t === ",") {
        return { sep: true, t: t === "," ? "," : "|", mkOpen: mkOpen, mkClose: mkClose, mkSpan: mkSpan, mdOpen: mdOpen, mdClose: mdClose };
      }
      if (!t) {                       // a brace standing on its own
        return { sep: false, t: "", oct: 0, komal: false, kan: "", kanKomal: false, kanOct: 0,
                 shruti: "", mkOpen: mkOpen, mkClose: mkClose, mkSpan: mkSpan, mdOpen: mdOpen, mdClose: mdClose };
      }
      var oct = 0, komal = false, guard = 0, octUp = false, octDn = false, dbl = false, tivra = false, orn = "";
      while (guard++ < 12) {                                       // markers may come in any order
        if (t.slice(0, 2) === "^^") { octUp = true; oct = 1; dbl = true; t = t.slice(2); continue; }   // ati-tār
        if (t.slice(0, 2) === "__") { octDn = true; oct = -1; dbl = true; t = t.slice(2); continue; }  // ati-mandra
        if (t[0] === "^") { octUp = true; oct = 1; t = t.slice(1); continue; }    // dot above
        if (t[0] === "_") { octDn = true; oct = -1; t = t.slice(1); continue; }   // dot below
        if (t[0] === "~") { komal = true; t = t.slice(1); continue; }   // komal — a horizontal underline
        if (t[0] === "+") { tivra = true; t = t.slice(1); continue; }   // tivra — a line above
        if (t[0] === "!") { orn = "\u0916\u091f\u0915\u093e"; t = t.slice(1); continue; }               // khatka
        if (t[0] === "%") { orn = "\u091c\u093c\u092e\u091c\u093c\u092e\u093e"; t = t.slice(1); continue; }  // zamzama
        if (t[0] === "@") { orn = "\u0906\u0902\u0926\u094b\u0932\u0928"; t = t.slice(1); continue; }        // andolan
        if (t[0] === "&") { orn = "\u0917\u092e\u0915"; t = t.slice(1); continue; }                    // gamak
        break;
      }
      var kan = "", shruti = "", g2 = 0;
      while (g2++ < 4) {                                          // a swar may carry either or both
        var km = /\(([^)]*)\)$/.exec(t);                          // kan-swar — a small note above
        if (km) { kan = km[1]; t = t.slice(0, km.index); continue; }
        var sm = /\[([0-9\u0966-\u096f]*)\]$/.exec(t);               // shruti — which microtone of the 22
        if (sm) { shruti = sm[1]; t = t.slice(0, sm.index); continue; }
        break;
      }
      if (t.indexOf("\u093c") >= 0) { oct = -1; t = t.replace(/\u093c/g, ""); }
      // the small kan note can itself be komal, or sit in another octave
      var kanKomal = false, kanOct = 0, kanOctUp = false, kanOctDn = false, g4 = 0, kt = kan;
      while (g4++ < 4) {
        if (kt[0] === "~") { kanKomal = true; kt = kt.slice(1); continue; }
        if (kt[0] === "^") { kanOctUp = true; kanOct = 1; kt = kt.slice(1); continue; }
        if (kt[0] === "_") { kanOctDn = true; kanOct = -1; kt = kt.slice(1); continue; }
        break;
      }
      kan = kt;
      /* whatever was typed in English letters becomes Devanagari here */
      return { sep: false, t: devSwar(t), oct: oct, octUp: octUp, octDn: octDn, komal: komal,
               dbl: dbl, tivra: tivra, orn: orn,
               kan: devSwar(kan), kanKomal: kanKomal, kanOct: kanOct, kanOctUp: kanOctUp, kanOctDn: kanOctDn,
               kanMk: kanMk, shruti: shruti, mkOpen: mkOpen, mkClose: mkClose, mkSpan: mkSpan, mdOpen: mdOpen, mdClose: mdClose };
    });
  }

  // one swar, with any of the three marks it may carry
  /* A token may hold more than one swar — two swar on a single matra, say.
     Each marker that follows a letter starts a new swar, so ~ग~रे is two komal
     swar rather than one swar with a stray tilde. */
  /* Split a group into its individual swar. It splits before every marker and
     before every swar letter, so ~गम becomes two swar that each carry the komal
     underline — the mark applies to the whole group, and each swar shows it. */
  var SWAR_START = /[\u0938\u0930\u0917\u092e\u092a\u0927\u0928]/;   // स र ग म प ध न
  function splitSwar(t) {
    /* Take each swar together with the marks written just before it, so a mark stays
       with its own swar: ग~म gives ["ग", "~म"] and the ~ marks म, while ~गम gives
       ["ग", "म"] and the ~ (lifted off the front) marks only ग. */
    var bits = t.match(/[~^_]*[\u0938\u0930\u0917\u092e\u092a\u0927\u0928][\u093e-\u094d\u0901\u0902]*/g);
    if (!bits || bits.length < 2) return null;   // a bar or a rest has no swar to split
    var out = [];
    bits.forEach(function (b) {
      var komal = false, oct = 0, g = 0;
      while (g++ < 4) {
        if (b[0] === "~") { komal = true; b = b.slice(1); continue; }
        if (b[0] === "^") { oct = 1; b = b.slice(1); continue; }
        if (b[0] === "_") { oct = -1; b = b.slice(1); continue; }
        break;
      }
      if (b) out.push({ t: b, komal: komal, oct: oct });
    });
    return out.length > 1 ? out : null;
  }
  function swarEl(tk, unit, noteN) {
    var parts = splitSwar(tk.t);
    if (parts) {                        // several swar inside one token
      var grp = document.createElement("span");
      grp.className = "sk-sw-grp";
      parts.forEach(function (p, i) {
        var sub = {};
        for (var k in tk) { if (Object.prototype.hasOwnProperty.call(tk, k)) sub[k] = tk[k]; }
        sub.t = p.t;
        /* A mark belongs to the swar it sits before. The marks the tokeniser lifted
           off the front were written before the first swar, so only that one takes
           them — ~गम underlines ग alone, and ~ग~म underlines both. */
        sub.komal = p.komal || (i === 0 && tk.komal);
        sub.tivra = (i === 0) && tk.tivra;
        sub.dbl = (i === 0) && tk.dbl;
        sub.orn = (i === 0) ? tk.orn : "";
        sub.oct = p.oct || (i === 0 ? tk.oct : 0);
        sub.octUp = (i === 0) && tk.octUp;      // the octave flags are separate fields,
        sub.octDn = (i === 0) && tk.octDn;      // so they must be cleared per part too
        if (p.oct === 1) { sub.octUp = true; sub.octDn = false; }
        if (p.oct === -1) { sub.octDn = true; sub.octUp = false; }
        sub.kan = ""; sub.shruti = "";            // a mark belongs to one swar
        grp.appendChild(oneSwar(sub, unit, noteN + i));
      });
      return grp;
    }
    return oneSwar(tk, unit, noteN);
  }
  /* the Devanagari name of a mark, shown when you hover it */
  function markName(tk) {
    var out = [];
    if (tk.tivra) out.push("\u0924\u0940\u0935\u094d\u0930");
    if (tk.komal) out.push("\u0915\u094b\u092e\u0932");
    if (tk.octUp || tk.oct === 1) out.push(tk.dbl ? "\u0905\u0924\u093f \u0924\u093e\u0930" : "\u0924\u093e\u0930 \u0938\u092a\u094d\u0924\u0915");
    if (tk.octDn || tk.oct === -1) out.push(tk.dbl ? "\u0905\u0924\u093f \u092e\u0902\u0926\u094d\u0930" : "\u092e\u0902\u0926\u094d\u0930 \u0938\u092a\u094d\u0924\u0915");
    if (tk.orn) out.push(tk.orn);
    if (tk.kan) out.push("\u0915\u0923");
    if (tk.t === "\u093d") return "\u0905\u0935\u0917\u094d\u0930\u0939";
    if (!out.length) return "\u0936\u0941\u0926\u094d\u0927 \u0938\u094d\u0935\u0930";
    return out.join(" ");
  }
  function oneSwar(tk, unit, noteN) {
    var sw = document.createElement("span");
    sw.className = "sk-sw" + ((tk.octUp || tk.oct === 1) ? (tk.dbl ? " oct1 oct2" : " oct1") : "") +
      ((tk.octDn || tk.oct === -1) ? (tk.dbl ? " octm octm2" : " octm") : "") +
      (tk.komal ? " komal" : "") + (tk.tivra ? " tivra" : "") +
      ((tk.kan || tk.orn || tk.shruti) ? " has-mark" : "");
    sw.setAttribute("data-mark", markName(tk));
    if (unit > 1) {
      var g = Math.floor(noteN / unit);
      sw.className += (g % 2 ? " grpB" : " grpA") + (noteN % unit === 0 ? " gstart" : "");
    }
    sw.textContent = tk.t;
    if (tk.kan) {                       // the small note rides above the main one
      sw.className += " kan-host";
      var k = document.createElement("span");
      k.className = "kan" + (tk.kanKomal ? " komal" : "") +
        ((tk.kanOctUp || tk.kanOct === 1) ? " oct1" : "") +
        ((tk.kanOctDn || tk.kanOct === -1) ? " octm" : "") +
        (tk.kanMk ? " kan-mk" : "");       // a murki over the small notes themselves
      var kparts = splitSwar(tk.kan);
      if (kparts) {                        // the small note may hold two swar with their own marks
        kparts.forEach(function (p, i) {
          var ks = document.createElement("span");
          ks.className = "kan-p" + (p.komal || (i === 0 && tk.kanKomal) ? " komal" : "") +
            (((i === 0) && (tk.kanOctUp || tk.kanOct === 1)) || p.oct === 1 ? " oct1" : "") +
            (((i === 0) && (tk.kanOctDn || tk.kanOct === -1)) || p.oct === -1 ? " octm" : "");
          ks.textContent = p.t;
          k.appendChild(ks);
        });
      } else {
        k.textContent = tk.kan;
      }
      sw.appendChild(k);
    }
    if (tk.orn) {                       // khatka, zamzama, andolan, gamak — named above the swar
      sw.className += " orn-host";
      var ornEl = document.createElement("span");
      ornEl.className = "orn"; ornEl.textContent = tk.orn;
      ornEl.setAttribute("data-mark", tk.orn);
      sw.appendChild(ornEl);
    }
    if (tk.shruti) {                    // the shruti number sits at the top right
      sw.className += " shr-host";
      var sh = document.createElement("span");
      sh.className = "shr"; sh.textContent = tk.shruti;
      sh.setAttribute("data-mark", "\u0936\u094d\u0930\u0941\u0924\u093f");
      sw.appendChild(sh);
    }
    return sw;
  }
  function sepEl(txt) {
    var sp = document.createElement("span");
    sp.className = "sk-sep"; sp.textContent = txt;
    sp.setAttribute("data-mark", txt === "|" ? "\u0935\u093f\u092d\u093e\u0917" : "\u0935\u093f\u0936\u094d\u0930\u093e\u092e");
    return sp;
  }

  /* ---------- media url ---------- */
  function audioSources(m) {
    /* a file you added may be a direct link to the audio itself, like the pre-loaded ones.
       Those can be seeked and timed; a Drive page cannot. */
    if (m && m.src) return [m.src];
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


  /* ---------- making the right file impossible to get wrong ----------
     The rule decides which recording a line belongs to; this is the belt to that braces. The
     saved times themselves are put where they belong, on every device, every time the app
     opens. A time sitting on a recording whose own name says it does not hold that line is
     moved to the recording that does. So even if some later version of the app lost the rule,
     or a device still carried times from an older set of files, the sound and the offset
     beside it would still agree. Nothing is deleted - a time is only ever moved, and only
     when another recording's name claims that line. */
  function tidyMarks() {
    var moved = 0;
    Object.keys(state.sharedMarks || {}).forEach(function (lid) {
      var l = lesson(lid); if (!l) return;
      var byLesson = state.sharedMarks[lid];
      Object.keys(byLesson).forEach(function (tr) {
        var m = l.media[+tr]; if (!m) return;
        var rng = mnRange(m.name); if (!rng) return;
        var lines = byLesson[tr];
        Object.keys(lines).forEach(function (li) {
          var num = mnLineNo((l.lines[+li] || {}).label);
          if (num == null) return;
          if (num >= rng.lo && num <= rng.hi) return;
          var dest = null;
          Object.keys(l.media).forEach(function (t2) {
            var r2 = mnRange((l.media[+t2] || {}).name);
            if (r2 && num >= r2.lo && num <= r2.hi) dest = t2;
          });
          if (dest == null || dest === tr) return;
          byLesson[dest] = byLesson[dest] || {};
          if (!byLesson[dest][li]) byLesson[dest][li] = lines[li];
          delete lines[li];
          moved++;
        });
      });
    });
    if (moved) {
      try { localStorage.setItem("sk_shared_marks", JSON.stringify(state.sharedMarks)); } catch (e) {}
      try { localStorage.setItem("sk_shared_at", String(Date.now())); } catch (e) {}
      try { if (typeof marksSchedulePush === "function") marksSchedulePush(); } catch (e) {}
    }
    return moved;
  }
  /* A quiet check that the rule is doing its job. If मुक्त आलाप 11 is ever found pointing at
     the wrong recording, it says so plainly rather than playing the wrong file in silence. */
  function guardCheck() {
    try {
      if (typeof trackForLine !== "function") { mkMsg("Warning: the line-to-recording rule is missing."); return; }
      var l = lesson("rg_durga"); if (!l) return;
      var li = -1;
      (l.lines || []).forEach(function (x, i) { if (/Mukt Aalap\s*11/i.test(x.label || "")) li = i; });
      if (li < 0) return;
      var p = trackForLine(l, li), want = null;
      Object.keys(l.media).forEach(function (t) {
        var r = mnRange((l.media[+t] || {}).name);
        if (r && 11 >= r.lo && 11 <= r.hi) want = +t;
      });
      if (want == null) return;
      if (!p || p.t !== want) mkMsg("Warning: मुक्त आलाप 11 is pointing at the wrong recording.");
    } catch (e) {}
  }
  /* ---------- मंच: the performance record ----------
     Each entry is one past performance: { id (the YouTube video), name, by, date, place, at }.
     Stored on this device and pushed to the repo exactly like the favourites, so it reaches
     every device and survives a cleared browser. */
  var MANCH = "https://api.github.com/repos/akshaybangalorekar/riyaz/contents/manch.json";
  function manchLoad() {
    try {
      var raw = JSON.parse(localStorage.getItem("sk_manch") || "null");
      if (raw && raw.list) { state.manch = raw.list || []; state.manchAt = raw.at || 0; }
      else { state.manch = []; state.manchAt = 0; }
    } catch (e) { state.manch = []; state.manchAt = 0; }
    try { state.manchSort = localStorage.getItem("sk_manch_sort") || "date"; } catch (e) { state.manchSort = "date"; }
  }
  function manchWriteLocal() {
    try { localStorage.setItem("sk_manch", JSON.stringify({ at: state.manchAt, list: state.manch })); } catch (e) {}
  }
  function manchSave() { state.manchAt = Date.now(); manchWriteLocal(); manchSchedulePush(); }
  var manchTimer = 0;
  function manchSchedulePush() {
    if (!getToken() || manchTimer) return;
    manchTimer = setTimeout(function () { manchTimer = 0; manchPush(); }, 2500);
  }
  function manchPush(cb) {
    var tok = getToken();
    if (!tok) { if (cb) cb("no-token"); return; }
    ghGet(tok, MANCH).then(function (cur) {
      if (!cur.ok) { if (cb) cb("unreadable"); return; }
      var body = { message: "Update मंच", branch: "main",
        content: b64(JSON.stringify({ at: state.manchAt || Date.now(), list: state.manch }, null, 1)) };
      if (cur.sha) body.sha = cur.sha;
      var h = ghHdr(tok); h["Content-Type"] = "application/json";
      return fetch(MANCH, { method: "PUT", keepalive: true, cache: "no-store", headers: h, body: JSON.stringify(body) });
    }).then(function (r) { if (r && r.ok) noteSavedAt(Date.now()); if (cb) cb(r && r.ok ? "ok" : "fail"); })
      .catch(function () { if (cb) cb("net"); });
  }
  function manchPull(cb) {
    var tok = getToken();
    var p = tok ? ghGet(tok, MANCH).then(function (c) { return c.data; })
                : fetchPublic("manch.json?t=" + Date.now());
    p.then(function (j) {
      if (!j || typeof j !== "object" || !j.list) { if (cb) cb("fail"); return; }
      noteSavedAt(j.at);
      if ((j.at || 0) > (state.manchAt || 0)) {
        state.manch = j.list || []; state.manchAt = j.at || 0;
        manchWriteLocal();
        if (state.group === "मंच") { renderList(); renderManchStage(); }
      }
      if (cb) cb("ok");
    }).catch(function () { if (cb) cb("fail"); });
  }


  /* A performance video is usually named with everything in it:
       "Atharv - Bada Khayal - Pune - 12 Aug 2024"
     So the year, the place and the details can be read from the name itself. */
  var MN_CITIES = ["pune","mumbai","bombay","bengaluru","bangalore","delhi","new delhi","chennai","madras",
    "kolkata","calcutta","hyderabad","nashik","nasik","nagpur","kolhapur","indore","bhopal","jaipur",
    "ahmedabad","surat","lucknow","varanasi","banaras","goa","panaji","kochi","cochin","mysore","mysuru",
    "thane","aurangabad","sangli","satara","belgaum","belagavi","hubli","mangalore","mangaluru",
    "coimbatore","madurai","visakhapatnam","vizag","bhubaneswar","patna","ranchi","guwahati","amritsar",
    "chandigarh","dehradun","shimla","jodhpur","udaipur","gwalior","jabalpur","rajkot","vadodara",
    "solapur","amravati","akola","latur","nanded","dharwad","davangere","shivamogga","tumkur","kerala",
    "london","dubai","singapore","toronto","new jersey","california","houston","london uk"];
  function mnTitleParts(title) {
    var t = String(title || "");
    var parts = t.split(/\s*[|\u2022\u00b7\u2013\u2014]\s*|\s+-\s+|\s*,\s*/).map(function (x) { return x.trim(); })
                 .filter(function (x) { return x.length; });
    var year = "", place = "", rest = [];
    parts.forEach(function (p) {
      var y = p.match(/\b(19|20)\d{2}\b/);
      if (y && !year) { year = y[0]; }
      var low = p.toLowerCase();
      var hit = null;
      for (var i = 0; i < MN_CITIES.length; i++) {
        if (low === MN_CITIES[i] || new RegExp("\\b" + MN_CITIES[i] + "\\b").test(low)) { hit = p; break; }
      }
      if (hit && !place) {
        /* when the name has no separators the whole thing matches, so take just the city */
        var w = low.match(new RegExp("\\b(" + MN_CITIES[i] + ")\\b", "i"));
        var city = w ? w[1] : (low === MN_CITIES[i] ? p : "");
        if (city) place = city.charAt(0).toUpperCase() + city.slice(1);
      }
      if (!y && !hit) rest.push(p);
    });
    /* if no separator was used, still try to pull the year out of the whole name */
    if (!year) { var m = t.match(/\b(19|20)\d{2}\b/); if (m) year = m[0]; }
    var name = rest.join(" \u00b7 ") || t;
    /* the year and the place out of the name itself */
    name = name.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s{2,}/g, " ").replace(/^[\s\u00b7-]+|[\s\u00b7-]+$/g, "");
    return { year: year, place: place, name: name || t };
  }
  /* the video id out of any shape of YouTube link */
  function ytId(u) {
    u = String(u || "").trim();
    var m1 = u.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
    if (m1) return m1[1];
    var m2 = u.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
    if (m2) return m2[1];
    var m3 = u.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
    if (m3) return m3[1];
    var m4 = u.match(/\/shorts\/([A-Za-z0-9_-]{6,})/);
    if (m4) return m4[1];
    return /^[A-Za-z0-9_-]{11}$/.test(u) ? u : "";
  }

  /* the year of an entry's date, for grouping. Anything unreadable sorts last. */
  function manchYear(e) {
    var m = String(e.date || "").match(/(\d{4})/);
    return m ? m[1] : "";
  }
  function manchSortKey(e) {
    if (state.manchSort === "place") return (e.place || "").toLowerCase() + "|" + (e.date || "");
    return (e.date || "9999") + "|" + (e.name || "").toLowerCase();
  }
  function manchSorted() {
    return state.manch.slice().sort(function (a, b) {
      var ka = manchSortKey(a), kb = manchSortKey(b);
      if (ka < kb) return -1; if (ka > kb) return 1; return 0;
    });
  }
  /* grouped by year, newest first when sorting by date */
  function manchGroups() {
    var list = manchSorted(), out = [], seen = {};
    list.forEach(function (e) {
      var y = manchYear(e) || "—";
      if (!seen[y]) { seen[y] = { year: y, items: [] }; out.push(seen[y]); }
      seen[y].items.push(e);
    });
    if (state.manchSort === "date") out.sort(function (a, b) { return (a.year < b.year) ? 1 : -1; });
    return out;
  }
  function manchSetSort(how) {
    state.manchSort = how;
    try { localStorage.setItem("sk_manch_sort", how); } catch (e) {}
    renderList(); renderManchStage();
  }
  function manchAdd(link, name, by, date, place) {
    var id = ytId(link);
    if (!id) { mkMsg("That does not look like a YouTube link."); return; }
    state.manch.push({ id: id, name: name || "", by: by || "", date: date || "", place: place || "", at: Date.now() });
    manchSave(); renderList(); renderManchStage();
  }
  function manchRemove(i) {
    var e = state.manch[i] || {};
    askConfirm("Remove the performance \u201c" + (e.name || "this one") + "\u201d?\n\nYou can put it back with Revert.",
      function () {
        pushHistory("removed the performance \u201c" + (e.name || "unnamed") + "\u201d");
        state.manch.splice(i, 1); manchSave(); renderList(); renderManchStage();
        mkMsg("Removed \u201c" + (e.name || "that performance") + "\u201d \u2014 press Revert to put it back.");
      });
  }
  function manchSet(i, field, val) {
    var e = state.manch[i]; if (!e) return;
    e[field] = val; manchSave();
  }
  /* ask YouTube for the title and the channel - it allows this app's address to read them */
  function manchFetchTitle(id, then) {
    fetch("https://www.youtube.com/oembed?url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + id) + "&format=json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (then) then(j || null); })
      .catch(function () { if (then) then(null); });
  }

  /* the page: a player for the chosen performance, then the list grouped by year */
  function renderManchStage() {
    var st = $("#stage"); if (!st) return;
    var gs = manchGroups(), html = '<div class="sk-h1">मंच</div>';
    var cur = state.manchIdx != null ? state.manch[state.manchIdx] : null;
    if (!state.manch.length) {
      html += '<div class="sk-dim" style="margin-top:6px">No performances yet.' +
        (state.canEdit ? " Add one below \u2014 paste a YouTube link." : "") + "</div>";
    } else {
      html += '<div class="sk-dim" style="margin-top:6px">' + state.manch.length +
        " performance" + (state.manch.length > 1 ? "s" : "") + "</div>";
    }
    html += '<div class="mn-sort">Sort by ' +
      '<button class="sk-btn mn-s' + (state.manchSort === "date" ? " on" : "") + '" data-s="date">date</button>' +
      '<button class="sk-btn mn-s' + (state.manchSort === "place" ? " on" : "") + '" data-s="place">location</button></div>';
    if (cur) {
      html += '<div class="mn-vid"><iframe id="mnFrame" src="https://www.youtube-nocookie.com/embed/' + cur.id +
        '?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" ' +
        'allowfullscreen loading="lazy"></iframe></div>' +
        '<div class="mn-now">' + esc(cur.name || "") +
        (cur.date ? " \u00b7 " + esc(cur.date) : "") + (cur.place ? " \u00b7 " + esc(cur.place) : "") + "</div>" +
        /* Some uploaders switch embedding off, and YouTube then refuses to play inside a frame.
           Offer the way through instead of leaving a dead rectangle. */
        '<div class="mn-open-yt"><a class="sk-btn" href="https://www.youtube.com/watch?v=' + cur.id +
        '" target="_blank" rel="noopener">Open on YouTube \u2197</a>' +
        '<span class="sk-dim">if it will not play here, it opens there</span></div>';
    }
    if (state.canEdit) {
      html += '<div class="mn-add">' +
        '<input class="sk-file-in mn-in" id="mnLink" type="url" placeholder="paste a YouTube link">' +
        '<input class="sk-file-in mn-in mn-sm" id="mnDate" type="text" placeholder="date (optional)">' +
        '<input class="sk-file-in mn-in mn-sm" id="mnPlace" type="text" placeholder="place (optional)">' +
        '<button class="sk-btn" id="mnGo">Add</button></div>' +
        '<div class="sk-dim mn-hint">The year, the place and the name are read from the video title itself when you paste a link.</div>';
    }
    gs.forEach(function (g) {
      html += '<div class="sk-sec"><div class="sk-sec-h">' + esc(g.year) + "</div>" +
        g.items.map(function (e) {
          var i = state.manch.indexOf(e);
          return '<div class="mn-row">' +
            '<button class="sk-item mn-open" data-i="' + i + '">' + esc(e.name || "(no name yet)") +
            ' <span class="mn-meta">' + esc([e.date, e.place].filter(Boolean).join(" \u00b7 ")) + "</span></button>" +
            (state.canEdit ? '<button class="sk-file-x mn-x" data-i="' + i + '" title="Remove this performance">\u2715</button>' : "") +
            "</div>";
        }).join("") + "</div>";
    });
    st.innerHTML = html;

    Array.prototype.forEach.call(st.querySelectorAll(".mn-s"), function (b) {
      b.onclick = function () { manchSetSort(b.dataset.s); };
    });
    Array.prototype.forEach.call(st.querySelectorAll(".mn-open"), function (b) {
      b.onclick = function () { state.manchIdx = +b.dataset.i; renderManchStage(); };
    });
    Array.prototype.forEach.call(st.querySelectorAll(".mn-x"), function (b) {
      b.onclick = function () { manchRemove(+b.dataset.i); };
    });
    var go = $("#mnGo");
    if (go) go.onclick = function () {
      var link = ($("#mnLink") || {}).value || "";
      var date = ($("#mnDate") || {}).value || "";
      var place = ($("#mnPlace") || {}).value || "";
      var id = ytId(link);
      if (!id) { mkMsg("That does not look like a YouTube link."); return; }
      /* add it straight away so nothing is lost, then fill in the name when YouTube answers */
      state.manch.push({ id: id, name: "", by: "", date: date, place: place, at: Date.now() });
      var i = state.manch.length - 1;
      manchSave(); renderList(); renderManchStage();
      manchFetchTitle(id, function (j) {
        if (!j || !j.title) return;
        /* the name carries the year and the place too - read them out of it */
        var p = mnTitleParts(j.title);
        state.manch[i].name = p.name || j.title;
        if (!state.manch[i].date && p.year) state.manch[i].date = p.year;
        if (!state.manch[i].place && p.place) state.manch[i].place = p.place;
        state.manch[i].by = "";                 /* who uploaded it is not wanted */
        manchSave(); renderList(); renderManchStage();
      });
    };
  }
  function renderManchRail() {
    var el = $("#list"); if (!el) return;
    el.classList.add("sections");
    if (!state.manch.length) {
      el.innerHTML = '<div class="sk-sec"><div class="sk-empty" style="padding:24px 8px">No performances yet.' +
        (state.canEdit ? "<br><span class=\"sk-dim\">Add one on the page.</span>" : "") + "</div></div>";
      return;
    }
    el.innerHTML = manchGroups().map(function (g) {
      return '<div class="sk-sec"><div class="sk-sec-h">' + esc(g.year) + "</div>" +
        g.items.map(function (e) {
          var i = state.manch.indexOf(e);
          return '<div class="sk-row"><button class="sk-item' + (state.manchIdx === i ? " on" : "") +
            '" data-i="' + i + '">' + esc(e.name || "(no name yet)") + "</button></div>";
        }).join("") + "</div>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll(".sk-item"), function (b) {
      b.onclick = function () { state.manchIdx = +b.dataset.i; renderManchStage(); };
    });
  }

  /* ==========================================================================
     GUIDED CREATION - adding a raag or a bandish without touching code.

     The one thing a new bandish needs and cannot guess is its taal, because the taal
     decides the matra count and where the vibhag bars fall. So the app asks. Picking a
     taal fills in the matras and the vibhag, and both stay editable, because a family's
     version of a taal can differ from the book's.
     ========================================================================== */
  var TAALS = [
    { n: "तीन ताल",        m: 16, v: [4, 4, 4, 4] },
    { n: "झप ताल",         m: 10, v: [2, 3, 2, 3] },
    { n: "एक ताल",         m: 12, v: [4, 4, 4] },
    { n: "चौ ताल",         m: 12, v: [4, 4, 4] },
    { n: "आड़ा चौताल",     m: 14, v: [2, 4, 4, 4] },
    { n: "सूल ताल",        m: 10, v: [2, 2, 2, 2, 2] },
    { n: "दादरा",          m: 6,  v: [3, 3] },
    { n: "केहेरवा",        m: 8,  v: [4, 4] },
    { n: "रूपक",           m: 7,  v: [3, 2, 2] },
    { n: "तीव्रा",         m: 7,  v: [3, 2, 2] },
    { n: "पंजाबी",         m: 16, v: [4, 4, 4, 4] },
    { n: "भजन",            m: 8,  v: [4, 4] }
  ];
  function taalByName(n) {
    for (var i = 0; i < TAALS.length; i++) if (TAALS[i].n === n) return TAALS[i];
    return null;
  }
  function vibhagText(v) { return (v || []).join("+"); }
  function parseVibhag(t) {
    var parts = String(t || "").split(/[+,]/).map(function (x) { return parseInt(x, 10); })
      .filter(function (x) { return x > 0; });
    var sum = 0;
    parts.forEach(function (x) { sum += x; });
    return { parts: parts, sum: sum };
  }

  /* one modal, used by both flows */
  function wizardOpen(html) {
    var m = $("#skWizard");
    if (!m) {
      m = document.createElement("div");
      m.id = "skWizard"; m.className = "sk-modal";
      m.innerHTML = '<div class="sk-modal-box wiz-box" id="wizBox"></div>';
      document.body.appendChild(m);
    }
    $("#wizBox").innerHTML = html;
    m.classList.add("on");
    m.onclick = function (ev) { if (ev.target === m) wizardClose(); };
    var first = $("#wizBox input, #wizBox select");
    if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 60);
  }
  function wizardClose() { var m = $("#skWizard"); if (m) m.classList.remove("on"); }

  function taalOptions(sel) {
    return TAALS.map(function (t) {
      return '<option value="' + esc(t.n) + '"' + (t.n === sel ? " selected" : "") + ">" +
        esc(t.n) + "  \u00b7  " + t.m + " \u092e\u093e\u0924\u094d\u0930\u093e</option>";
    }).join("");
  }
  /* the little line that confirms what will be built */
  function wizSummary(m, v) {
    var p = parseVibhag(v);
    var ok = p.sum === (+m || 0);
    return '<div class="wiz-sum' + (ok ? "" : " bad") + '" id="wizSum">' +
      (ok ? "\u2713 " : "\u26a0 ") + p.sum + " of " + m + " matras" +
      (ok ? "" : " \u2014 the vibhag must add up to the matra count") + "</div>";
  }
  function wizWire() {
    var sel = $("#wizTaal"), mIn = $("#wizMatras"), vIn = $("#wizVibhag"), sum = $("#wizSum");
    function refresh() {
      var m = parseInt(mIn.value, 10) || 0;
      sum.outerHTML = wizSummary(m, vIn.value);
    }
    if (sel) sel.onchange = function () {
      var t = taalByName(sel.value);
      if (t) { mIn.value = t.m; vIn.value = vibhagText(t.v); }
      refresh();
    };
    if (mIn) mIn.oninput = refresh;
    if (vIn) vIn.oninput = refresh;
  }

  /* ---------- Add a bandish ---------- */
  function askNewBandish(l) {
    if (!l) return;
    var sib = null;
    (l.lines || []).forEach(function (ln) { if (!sib && ln.bandish) sib = ln.bandish; });
    var startTaal = sib && sib.taal ? sib.taal : "\u0924\u0940\u0928 \u0924\u093e\u0932";
    var t = taalByName(startTaal) || TAALS[0];
    var m = sib ? (sib.matras || t.m) : t.m;
    var v = sib && sib.vibhag && sib.vibhag.length ? sib.vibhag : t.v;

    wizardOpen(
      '<div class="set-h">Add a bandish</div>' +
      '<div class="set-lab">Name it, and say which taal it is set to.</div>' +
      '<label class="wiz-l">Name</label>' +
      '<input id="wizName" class="set-input" type="text" placeholder="e.g. Sakhi Mori" autocomplete="off">' +
      '<label class="wiz-l">Taal</label>' +
      '<select id="wizTaal" class="set-input">' + taalOptions(startTaal) + "</select>" +
      '<div class="wiz-row">' +
        '<div><label class="wiz-l">Matras</label>' +
        '<input id="wizMatras" class="set-input" type="number" min="2" max="64" value="' + m + '"></div>' +
        '<div><label class="wiz-l">Vibhag</label>' +
        '<input id="wizVibhag" class="set-input" type="text" value="' + esc(vibhagText(v)) + '"></div>' +
      "</div>" +
      wizSummary(m, vibhagText(v)) +
      '<div class="wiz-sep">Recordings for this bandish only \u2014 optional</div>' +
      '<label class="wiz-l">Video link</label>' +
      '<input id="wizVideo" class="set-input" type="url" placeholder="YouTube or Drive link \u2014 plays in the app">' +
      '<label class="wiz-l">Audio link</label>' +
      '<input id="wizAudio" class="set-input" type="url" placeholder="mp3 link \u2014 this is what sets the offsets">' +
      '<div class="set-actions">' +
        '<button class="sk-btn wiz-go" id="wizGo">Create the bandish</button>' +
        '<button class="sk-btn" id="wizCancel">Cancel</button>' +
      "</div>" +
      '<div class="set-msg" id="wizMsg"></div>'
    );
    wizWire();
    $("#wizCancel").onclick = wizardClose;
    $("#wizGo").onclick = function () {
      var nm = ($("#wizName").value || "").trim();
      var mm = parseInt($("#wizMatras").value, 10) || 0;
      var vv = parseVibhag($("#wizVibhag").value);
      var msg = $("#wizMsg");
      if (!nm) { msg.textContent = "Give the bandish a name first."; return; }
      if (mm < 2) { msg.textContent = "The matra count must be at least 2."; return; }
      if (vv.sum !== mm) {
        msg.textContent = "The vibhag adds up to " + vv.sum + ", but you said " + mm + " matras.";
        return;
      }
      var chosenTaal = ($("#wizTaal") || {}).value || startTaal;   // the taal actually picked
      var vLink = ($("#wizVideo") || {}).value || "";
      var aLink = ($("#wizAudio") || {}).value || "";
      wizardClose();
      addBandishWith(l, { name: nm, taalName: chosenTaal, matras: mm, vibhag: vv.parts,
                          video: vLink.trim(), audio: aLink.trim() });
    };
  }

  /* build the two parts with the chosen taal */
  function addBandishWith(l, spec) {
    spec = spec || {};
    var nm = spec.name || nextBandishName(l);
    var taalName = spec.taalName || (spec.taal ? spec.taal.n : "\u0924\u0940\u0928 \u0924\u093e\u0932");
    var m = spec.matras || 16;
    var vib = (spec.vibhag && spec.vibhag.length ? spec.vibhag : [4, 4, 4, 4]).slice();
    pushHistory("added the bandish " + nm);
    histQuiet(function () { ["Sthayi", "Antara"].forEach(function (part) {
      var idx = nextAddIndex(l.id), sw = [], ly = [];
      for (var i = 0; i < m; i++) { sw.push("-"); ly.push(""); }
      setLineEdit(l.id, String(idx), {
        t: "", label: "Bandish " + nm + " (" + part + ")", sect: "bandish",
        bd: { taal: taalName, matras: m, vibhag: vib },
        b: { "0": { swar: sw, lyric: ly } }
      });
    }); });
    applyAdds();

    /* Attach the recordings to THIS bandish only, tagged with its number so no other
       bandish inherits them. The audio is what the offsets are set against; the video
       plays in the app. */
    var num = String(bandishNames(l).length);
    var added = 0;
    function attach(kind, url) {
      var id = driveId(url) || url;
      if (!id) return;
      l.media = l.media || [];
      l.media.push({ kind: kind, id: id, name: nm + " (" + kind + ")", bnd: num });
      added++;
    }
    if (spec.video) attach("video", spec.video);
    if (spec.audio) attach("audio", spec.audio);
    if (added) { try { if (typeof marksSchedulePush === "function") marksSchedulePush(); } catch (e) {} }

    renderList(); renderStage(l);
    try {
      mkMsg("Added \u201c" + nm + "\u201d \u2014 " + m + " matras of " + taalName +
            (added ? ", with " + added + " recording" + (added > 1 ? "s" : "") : "") + ".");
    } catch (e) {}
  }

  /* ---------- Add a raag ---------- */
  function askNewRaag() {
    var t = TAALS[0];
    wizardOpen(
      '<div class="set-h">Add a raag</div>' +
      '<div class="set-lab">Name it, and choose the taal its bandish will be set to. ' +
        'All five pages are created for you.</div>' +
      '<label class="wiz-l">Raag name</label>' +
      '<input id="wizName" class="set-input" type="text" placeholder="e.g. Bhoopali" autocomplete="off">' +
      '<label class="wiz-l">Taal for its bandish</label>' +
      '<select id="wizTaal" class="set-input">' + taalOptions(t.n) + "</select>" +
      '<div class="wiz-row">' +
        '<div><label class="wiz-l">Matras</label>' +
        '<input id="wizMatras" class="set-input" type="number" min="2" max="64" value="' + t.m + '"></div>' +
        '<div><label class="wiz-l">Vibhag</label>' +
        '<input id="wizVibhag" class="set-input" type="text" value="' + esc(vibhagText(t.v)) + '"></div>' +
      "</div>" +
      wizSummary(t.m, vibhagText(t.v)) +
      '<div class="wiz-what">You get: \u0906\u0930\u094b\u0939 \u00b7 \u0905\u0935\u0930\u094b\u0939 \u00b7 \u092a\u0915\u0921, ' +
        '\u092e\u0941\u0915\u094d\u0924 \u0906\u0932\u093e\u092a, \u0932\u092f\u0915\u093e\u0930\u0940, \u0924\u093e\u0928, \u092c\u0902\u0926\u093f\u0936 \u2014 all empty and ready.</div>' +
      '<div class="set-actions">' +
        '<button class="sk-btn wiz-go" id="wizGo">Create the raag</button>' +
        '<button class="sk-btn" id="wizCancel">Cancel</button>' +
      "</div>" +
      '<div class="set-msg" id="wizMsg"></div>'
    );
    wizWire();
    $("#wizCancel").onclick = wizardClose;
    $("#wizGo").onclick = function () {
      var nm = ($("#wizName").value || "").trim();
      var mm = parseInt($("#wizMatras").value, 10) || 0;
      var vv = parseVibhag($("#wizVibhag").value);
      var msg = $("#wizMsg");
      if (!nm) { msg.textContent = "Give the raag a name first."; return; }
      if (mm < 2) { msg.textContent = "The matra count must be at least 2."; return; }
      if (vv.sum !== mm) {
        msg.textContent = "The vibhag adds up to " + vv.sum + ", but you said " + mm + " matras.";
        return;
      }
      var sel = $("#wizTaal");
      wizardClose();
      addRaagWith(nm, { taalName: sel ? sel.value : t.n, matras: mm, vibhag: vv.parts });
    };
  }

  function addRaagWith(title, spec) {
    spec = spec || {};
    pushHistory("added the raag " + title);
    var id = "my_" + Date.now().toString(36);
    var list = userRaags();
    list.push({ id: id, title: title });
    saveUserRaags(list);
    var l = raagLesson(id, title);
    /* the bandish grids get the taal that was chosen */
    (l.lines || []).forEach(function (ln) {
      if (ln.bandish) {
        ln.bandish.taal = spec.taalName || "\u0924\u0940\u0928 \u0924\u093e\u0932";
        ln.bandish.matras = spec.matras || 16;
        ln.bandish.vibhag = (spec.vibhag || [4, 4, 4, 4]).slice();
        var sw = [], ly = [];
        for (var i = 0; i < ln.bandish.matras; i++) { sw.push("-"); ly.push(""); }
        ln.bandish.rows = [{ swar: sw, lyric: ly, arc: [] }];
      }
    });
    D.lessons.push(l);
    state.raagOpen[id] = true;
    open(id);
    renderList();
    try { mkMsg("Added raag \u201c" + title + "\u201d. Its pages are ready to fill."); } catch (e) {}
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
        if (state.group === "मंच") { renderManchStage(); return; }
        if (state.group === "Favourites") { renderFavStage(); return; }
        var first = lessonsOf(state.group)[0];
        if (first) open(first.id);
      };
    });
  }
  function lessonsOf(g) { return D.lessons.filter(function (l) { return l.group === g; }); }

  /* ---------- favourites (the programme line-up) ---------- */
  /* A favourite is either a PAGE (the heading sun: id + part, no line) or a single ITEM
     (a row sun: id + part + that line). The empty line is what marks the whole page. */
  function favKey(e) { return e.id + "|" + (e.sect || "") + "|" + (e.line == null ? "" : e.line); }
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
    }).then(function (r) { if (r && r.ok) noteSavedAt(Date.now()); if (cb) cb(r && r.ok ? "ok" : "fail"); })
      .catch(function () { if (cb) cb("net"); });
  }
  function favPull(cb) {
    var tok = getToken();
    var p = tok ? ghGet(tok, FAVS).then(function (c) { return c.data; })
                : fetchPublic("favs.json?t=" + Date.now());
    p.then(function (j) {
      if (!j || typeof j !== "object" || !j.list) { if (cb) cb("fail"); return; }
      noteSavedAt(j.at);
      if ((j.at || 0) > (state.favAt || 0)) {          // the other device has the newer list
        state.fav = j.list || []; state.favAt = j.at || 0;
        favWriteLocal();
        renderList();
        if (state.group === "मंच") renderManchStage();
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
    if (e.line != null) { var ln = favLine(l, e.line); if (ln) bits.push(ln); }
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
    else state.fav.push({ id: id, m: m, sect: sect || null, line: (line == null ? null : line) });
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
  /* The heading sun adds the PAGE itself, as one entry. A row sun adds that one item. */
  function favToggleScope(scope) {
    var list = scopeLines(scope);
    if (!list.length) return;
    var head = list[0];
    var e = { id: head.id, m: head.m, sect: head.sect || null, line: null };
    var k = favKey(e), i = -1;
    for (var j = 0; j < state.fav.length; j++) { if (favKey(state.fav[j]) === k) { i = j; break; } }
    if (i >= 0) state.fav.splice(i, 1);
    else state.fav.push(e);
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
  /* ---------- bandish are sub pages ----------
     A raag's बंदिश page is an index and nothing else. Each bandish is a sub page of it, and a
     bandish line is named "Bandish One (Sthayi)" / "Bandish One (Antara)" — the middle word is
     the name, edited on the index, and it is what the rail and the page heading show. */
  function bandishNames(l) {
    var out = [];
    function scan(list) {
      (list || []).forEach(function (ln) {
        var m = /^\s*bandish\s*(.*?)\s*\(/i.exec(ln.label || "");
        if (!m) return;
        var nm = m[1].trim() || "1";      // the unnamed bandish that came with a raag is 1
        if (out.indexOf(nm) < 0) out.push(nm);
      });
    }
    scan(l.lines);
    /* if the live list has somehow lost them, read the raag's own sheet, which cannot be empty */
    if (!out.length) scan(l._base);
    return out;
  }
  function bandishKey(label, names) {
    var m = /^\s*bandish\s*(.*?)\s*\(/i.exec(label || "");
    if (!m) return null;
    var nm = m[1].trim() || "1";
    var idx = names.indexOf(nm);
    return "bandish:" + (idx < 0 ? 1 : idx + 1);
  }
  function lineSection(l, label) {
    var k = bandishKey(label, bandishNames(l));
    if (k) return k;
    /* a bandish line whose name cannot be read still belongs to bandish 1 */
    if (/^\s*bandish\s*\(/i.test(label || "")) return "bandish:1";
    return raagSect(label);
  }
  function bandishNameOfKey(l, k) {
    var m = /^bandish:(\d+)$/.exec(k || "");
    if (!m) return "";
    return bandishNames(l)[+m[1] - 1] || "";
  }
  function raagSects(x) {
    var t = (x || "").toLowerCase(), out = [];
    if (/aaroh|avroh|pakad|\u0906\u0930\u094b\u0939|\u0905\u0935\u0930\u094b\u0939|\u092a\u0915\u0921/.test(t)) out.push("aaroh");
    if (/mukt aalap|\u092e\u0941\u0915\u094d\u0924\s*\u0906\u0932\u093e\u092a/.test(t)) out.push("mukt");
    if (/laikari|\u0932\u0948\u0915\u093e\u0930\u0940|\u0932\u092f\u0915\u093e\u0930\u0940/.test(t)) out.push("laikari");
    if (/tana|\u0924\u093e\u0928/.test(t)) out.push("tana");
    return out.length ? out : ["bandish"];
  }
  function raagSect(x) { return raagSects(x)[0]; }
  function raagSectParts(l, k) {
    var lines = [], media = [];
    (l.lines || []).forEach(function (ln, i) { if (lineSection(l, ln.label) === k) lines.push(i); });
    /* The बंदिश page itself is an index, so it carries no recording at all. */
    if (k === "bandish") return { lines: lines, media: media };

    /* A bandish sub page ("bandish:2") must show ONLY that bandish's own recordings.
       Every bandish recording is filed under "bandish" by name, so without the "bnd" tag
       every sub page saw every recording - adding a second bandish inherited the first
       one's video and audio. A recording with no tag predates this and belongs to the
       first bandish. */
    var bm = /^bandish:(\d+)$/.exec(k || "");
    if (bm) {
      var want = bm[1];
      (l.media || []).forEach(function (m, i) {
        if (raagSects(m.name).indexOf("bandish") < 0) return;
        var own = (m.bnd == null ? "1" : String(m.bnd));
        if (own === want) media.push(i);
      });
      return { lines: lines, media: media };
    }

    (l.media || []).forEach(function (m, i) { if (raagSects(m.name).indexOf(k) >= 0) media.push(i); });
    return { lines: lines, media: media };
  }
  function raagSections(l) {
    var out = [];
    RAAG_SECS.forEach(function (x) {
      if (x.k === "bandish") {
        /* page 5 exists for every raag, because it is the bandish index */
        out.push(x);
        bandishNames(l).forEach(function (nm, i) {
          out.push({ k: "bandish:" + (i + 1), t: "बंदिश " + nm, sub: true });
        });
        return;
      }
      var p = raagSectParts(l, x.k);
      if (p.lines.length || p.media.length) out.push(x);
    });
    return out;
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
    if (/^bandish:/.test(k || "")) return "बंदिश";
    var hit = RAAG_SECS.filter(function (x) { return x.k === k; })[0];
    return hit ? hit.t : "";
  }

  function sunHTML(on, cls, attrs) {
    return '<button class="sun' + (on ? " on" : "") + (cls ? " " + cls : "") + '" type="button" ' + (attrs || "") +
      ' title="' + (on ? "Remove from favourites" : "Add to favourites") + '">\u2600</button>';
  }
  /* FINAL TANAS — the fifteen tanas of Raag भैरवी are settled and signed off.
     Nothing in them is provisional any more, so no tana line carries a review
     note. Do not change them without being asked. */
  /* FINAL ALANKARS — alankars 1 to 22 are settled and signed off, and that is the
     end of the list. Alankar 23 exists in the data but is deliberately kept out of
     the rail, so nothing after 22 is ever offered. Do not change this without
     being asked. */
  var ALANKAR_LAST = 22;
  function alNumber(l) { var m = /(\d+)/.exec(l.title || ""); return m ? +m[1] : 0; }
  function alankarInScope(l) { return alNumber(l) >= 1 && alNumber(l) <= ALANKAR_LAST; }
  function bestOf(list, lid) {        // of several recordings serving one part, the one you timed
    if (!list || !list.length) return -1;
    var best = list[0], bestN = marksOn(lid, list[0]);
    for (var i = 1; i < list.length; i++) {
      var n = marksOn(lid, list[i]);
      if (n > bestN) { best = list[i]; bestN = n; }
    }
    return best;
  }
  function marksOn(lid, i) {          // how many lines carry a time on this recording
    var n = 0;
    [state.sharedMarks && state.sharedMarks[lid], state.segments && state.segments[lid]].forEach(function (src) {
      var t = src && src[String(i)];
      if (!t) return;
      Object.keys(t).forEach(function (k) {
        var e = t[k];
        if (e && !e.del && (e.takes || typeof e.t === "number")) n++;
      });
    });
    return n;
  }
  function mediaIdxFor(l, kind) {
    /* Several recordings can serve one part — an alankar has a komal take and
       more than one shuddha take. Open the one you actually timed, so your
       offsets are on screen when the page comes up. */
    var ms = l.media || [], best = -1, bestN = -1;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], ok = (kind === "video") ? (m.kind === "video") : (m.kind === "audio" && m.tr === kind);
      if (!ok) continue;
      var n = marksOn(l.id, i);
      if (best < 0 || n > bestN) { best = i; bestN = n; }
    }
    return best;
  }
  function renderList() {
    var el = $("#list");
    if (state.group === "मंच") { renderManchRail(); return; }
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
        var items = lessonsOf("Alankar")
          .filter(function (l) { return alankarInScope(l) && mediaIdxFor(l, sec.k) >= 0; })
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
            (l.mine && editingNow()
              ? '<button class="mv" data-name="' + l.id + '" title="Rename this raag">\u270e</button>' +
                '<button class="mv" data-drop="' + l.id + '" title="Remove this raag">\u2715</button>'
              : "") +
            '<button class="mv" data-r="' + l.id + '" data-d="-1" title="Move up">\u25b2</button>' +
            '<button class="mv" data-r="' + l.id + '" data-d="1" title="Move down">\u25bc</button>' +
          "</span></div>" +
          (open ? raagSections(l).map(function (x) {
            var on = (l.id === state.lessonId && state.raagSect === x.k) ? " on" : "";
            return '<div class="sk-row' + (x.sub ? " sk-row-sub" : "") + '"><button class="sk-item' + on +
              (x.sub ? " sub" : "") + '" data-id="' + l.id + '" data-s="' + x.k + '">' +
              esc(x.t) + "</button>" +
              sunHTML(scopeAllFav({ kind: "part", id: l.id, sect: x.k }), "rail",
                'data-scope="' + l.id + '" data-sect="' + x.k + '" data-kind="part"') + "</div>";
          }).join("") : "") + "</div>";
      }).join("");
      if (editingNow()) {                        // adding a raag is an editing job
        el.innerHTML += '<div class="sk-sec"><button class="sk-btn sk-addraag" id="btnAddRaag" type="button">+ Add Raag</button></div>';
        var ar = el.querySelector("#btnAddRaag");
        if (ar) ar.onclick = function () { askNewRaag(); };   /* guided */
      }
      Array.prototype.forEach.call(el.querySelectorAll(".mv"), function (b) {
        b.onclick = function (e) {
          if (e) e.stopPropagation();
          if (b.dataset.name) { renameRaag(b.dataset.name); return; }
          if (b.dataset.drop) { removeRaag(b.dataset.drop); return; }
          moveRaag(b.dataset.r, +b.dataset.d);
        };
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

  /* ---------- raags you add yourself ----------
     A raag you add is one lesson holding a blank line for each part, ready to fill in
     with the notation editor. Its name lives in sk_raags, so it can be renamed from
     the rail; its lines are edited like any other page. */
  function userRaags() {
    try { return JSON.parse(localStorage.getItem("sk_raags") || "[]") || []; } catch (e) { return []; }
  }
  function saveUserRaags(list) {
    try { localStorage.setItem("sk_raags", JSON.stringify(list)); } catch (e) {}
  }
  function blankBandish() {                 // a 16-matra grid, empty, ready to fill
    var sw = [], ly = [];
    for (var i = 0; i < 16; i++) { sw.push("-"); ly.push(""); }
    return { taal: "\u0924\u0940\u0928\u0924\u093e\u0932", matras: 16, vibhag: [4, 4, 4, 4],
             rows: [{ swar: sw, lyric: ly, arc: [] }] };
  }
  function raagLesson(id, title) {
    /* Every part works the same way it does in the built-in raags: the sung parts are
       written lines, and the tana and bandish are 16-matra grids. */
    return {
      id: id, group: "Raag", title: title || "New Raag", mine: true, media: [],
      lines: [
        { label: "Aaroh", text: "" },
        { label: "Avroh", text: "" },
        { label: "Pakad", text: "" },
        { label: "Mukt Aalap 1", text: "" },
        { label: "Sthayi Laikari 1", text: "" },
        { label: "Antara Laikari 1", text: "" },
        { label: "Tana 1", text: "", bandish: blankBandish() },
        { label: "Bandish (Sthayi)", text: "", bandish: blankBandish() },
        { label: "Bandish (Antara)", text: "", bandish: blankBandish() }
      ]
    };
  }
  function mergeUserRaags() {
    userRaags().forEach(function (r) {
      if (!r || !r.id) return;
      var cur = lesson(r.id);
      if (cur) { cur.title = r.title || cur.title; cur.mine = true; return; }
      D.lessons.push(raagLesson(r.id, r.title));
    });
  }
  function addRaag() {
    var id = "my_" + Date.now().toString(36);
    var list = userRaags();
    list.push({ id: id, title: "New Raag" });
    saveUserRaags(list);
    D.lessons.push(raagLesson(id, "New Raag"));
    state.raagOpen[id] = true;
    open(id);
    renderList();
  }
  function renameRaag(id) {
    var l = lesson(id); if (!l) return;
    var name = window.prompt("Name this raag", l.title || "");
    if (name == null) return;
    name = name.trim(); if (!name) return;
    l.title = name;
    var list = userRaags(), hit = false;
    list.forEach(function (r) { if (r.id === id) { r.title = name; hit = true; } });
    if (!hit) list.push({ id: id, title: name });
    saveUserRaags(list);
    renderList();
  }
  function removeRaag(id) {
    var l = lesson(id); if (!l) return;
    var _nm = l.title || "this raag";
    askConfirm("Remove the raag \u201c" + _nm + "\u201d from the rail?\n\nIts pages and notation go with it. You can put it back with Revert.",
      function () {
        pushHistory("removed the raag " + _nm);
        saveUserRaags(userRaags().filter(function (r) { return r.id !== id; }));
        D.lessons = D.lessons.filter(function (x) { return x.id !== id; });
        if (state.lessonId === id) state.lessonId = null;
        renderList();
        mkMsg("Removed " + _nm + " \u2014 press Revert to put it back.");
      });
  }

  function stopAll() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (state.audio) { try { state.audio.pause(); } catch (e) {} state.audio = null; }
    if (state.video) { try { state.video.pause(); } catch (e) {} state.video = null; }
    state.segPlay = null; state.lineRows = [];
  }

  function setRail(hidden) {
    var m = document.querySelector(".sk-main");
    if (!m) return;
    m.classList.toggle("rail-hidden", !!hidden);
    var b = $("#btnRail");
    if (b) {
      b.textContent = hidden ? "\u203a" : "\u2039";
      b.classList.toggle("hidden", !!hidden);
      b.style.setProperty("background", hidden ? "#e8a63e" : "", "important");
      b.style.setProperty("color", hidden ? "#20160d" : "", "important");
      b.style.setProperty("border-color", hidden ? "#e8a63e" : "", "important");
      b.setAttribute("aria-expanded", hidden ? "false" : "true");
      b.title = hidden ? "Show the list" : "Hide the list";
    }
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
          " lined up. Tap one in the rail to open that page. Nothing plays here."
        : "Nothing lined up yet \u2014 tap a \u2600 beside a heading in the rail, or beside a line on the page.") +
      "</div>";
  }

  function openFav(i) {
    var e = state.fav[i];
    if (!e) return;
    /* The programme is a running order, not a rehearsal: opening an entry takes you to
       the page and plays NOTHING. */
    open(e.id, e.m, e.sect);
  }

  function open(id, mIdx, sect) {
    var l = lesson(id);
    if (!l) return;
    stopAll();
    state.lessonId = id;
    state.raagSect = sect || null;
    if (l.group === "Raag") {                          // one part per page, never the whole raag
      var rs = raagSections(l);
      /* a section remembered from last time is only honoured if this raag really has it */
      if (state.raagSect && !rs.some(function (x) { return x.k === state.raagSect; })) state.raagSect = null;
      if (!state.raagSect && rs.length) state.raagSect = rs[0].k;
    }
    state.mediaIdx = 0;
    var part = state.raagSect ? raagSectParts(l, state.raagSect) : null;
    /* a part's page may only ever play that part's own recordings */
    var allowed = part ? part.media : null;
    var ok = (mIdx != null && mIdx >= 0 && l.media[mIdx] && (!allowed || !allowed.length || allowed.indexOf(mIdx) >= 0));
    if (ok) state.mediaIdx = mIdx;
    else if (part && part.media.length) {
      var vids = part.media.filter(function (i) { var m2 = l.media[i] || {}; return m2.kind === "video" && !m2.edit; });
      /* Open on the recording this part's lines are actually timed against, if there is one.
         Opening on a video hides the offsets and the play buttons, because a video has no line
         times - which is why भैरवी's लयकारी showed neither. */
      /* an editing-only recording is not a candidate while viewing: it must not appear, and
         it must not be played either - the player would otherwise open on it */
      var usable = part.media.filter(function (i) { var m2 = l.media[i] || {}; return state.canEdit || !m2.edit; });
      var timed = usable.filter(function (i) { return markCountOn(l.id, i) > 0; });
      if (timed.length) state.mediaIdx = bestOf(usable, id);
      else if (!pageEditing(l) && vids.length) state.mediaIdx = vids[0];
      else if (usable.length) state.mediaIdx = bestOf(usable, id);
      else state.mediaIdx = -1;                        /* nothing of this part's is viewable now */
    }
    else if (part) {
      var fm = -1;
      l.media.forEach(function (m, i) { if (fm < 0 && m.file) fm = i; });
      state.mediaIdx = fm;                             // a ticked file plays here
    }
    else for (var _mi = 0; _mi < l.media.length; _mi++) { if (!l.media[_mi].missing) { state.mediaIdx = _mi; break; } }
    localStorage.setItem("sk_lesson", id);
    localStorage.setItem("sk_sect", state.raagSect || "");   // so a refresh lands back here
    renderList();
    renderStage(l);
  }

  /* Editing is per page now: a pen beside the heading opens that page's editor, and clicking
     it again closes it. The Settings switch only decides whether the pens are offered. */
  /* ---------- editing switches itself off ----------
     Editing is on only while it is being used. Left alone for fifteen minutes it returns to
     view mode by itself. Any tap, click, keypress or touch restarts the fifteen minutes. */
  var EDIT_IDLE_MS = 15 * 60 * 1000;
  var editUntil = 0;
  function editTouched() { if (state.canEdit) editUntil = Date.now() + EDIT_IDLE_MS; }
  function editTimedOut() {
    if (!state.canEdit) return;
    if (!editUntil) { editTouched(); return; }
    if (Date.now() < editUntil) return;
    state.canEdit = false; state.editOpen = {};
    try { localStorage.setItem("sk_can_edit", "0"); } catch (e) {}
    try { mkMsg("Editing switched off after fifteen minutes of no use."); } catch (e) {}
    try { renderTabs(); renderList(); } catch (e) {}
    var l = lesson(state.lessonId); if (l) { try { renderStage(l); } catch (e) {} }
  }
  function editWatchStart() {
    editUntil = Date.now() + EDIT_IDLE_MS;
    ["click", "keydown", "touchstart", "input", "pointerdown"].forEach(function (ev) {
      document.addEventListener(ev, editTouched, true);
    });
    setInterval(editTimedOut, 30000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) editTimedOut(); });
  }
  function editingNow() { return !!state.canEdit; }
  /* View mode is a page with no editor open, even when editing is allowed. Audio and the
     clock belong to editing, so they stay out of the way until a pen is pressed. */
  function pageEditing(l) {
    if (!state.canEdit || !l) return false;
    var any = false;
    (l.lines || []).forEach(function (ln, i) { if (lineEditOpen(l, i)) any = true; });
    return any;
  }
  /* A line's editor is open when its own ✎ was pressed — or when the heading it sits under
     was, which is how स्थाई and अंतरा open for a whole bandish. */
  function lineEditOpen(l, li) {
    if (!state.canEdit) return false;
    var ln = (l.lines || [])[li] || {};
    var g = subGroup(ln.label || "");
    return !!state.editOpen[li] || (!!g && !!state.editOpen["g:" + g]);
  }

  function renderStage(l) {
    state.editMode = editingNow();
    var s = $("#stage");
    var mcur = l.media[state.mediaIdx] || {};
    var curVideo = mcur.kind === "video";
    var secHasLines = !(l.group === "Raag" && state.raagSect) || state.raagSect === "bandish" ||
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
      if (fname && state.canEdit) meta.push(fname);   /* editing only */
    } else if (l.group === "Alankar" || l.group === "Raag") {
      var bnm = (l.group === "Raag") ? bandishNameOfKey(l, state.raagSect) : "";
      if (bnm) head = l.title + ": " + bnm;        // Raag दुर्गा: 1
      if (l.group === "Raag" && state.raagSect) { var sl = raagSectLabel(state.raagSect); if (sl) meta.push(sl); }
      if (fname && state.canEdit) meta.push(fname);   /* editing only */
    }
    var html = '<div class="sk-h1">' + esc(head) +
      (meta.length ? ' <span class="sk-file">' + esc(meta.join(" \u00b7 ")) + "</span>" : "") +
      (state.canEdit && mcur.id ? ' <a class="sk-drive" href="https://drive.google.com/file/d/' + mcur.id +
        '/view" target="_blank" rel="noopener" title="Open this file in Google Drive">\u2197 Drive</a>' : "") +
      "</div>";
    if (l.sub && l.group !== "Taal") html += '<div class="sk-hsub">' + esc(l.sub) + "</div>";

    // media tabs — an alankar page shows no Komal/Shuddha tabs (the rail picks those)
    /* The tabs are taken from the same list the page itself uses to find a section's
       recordings, rather than worked out a second time. Two separate judgements about which
       recordings belong to a part is how they came to disagree and leave the row empty. */
    var tabMs = [];
    if (state.raagSect !== "bandish") {                       // page 5 is an index only
        /* The part's own recordings, plus your own files below. If that leaves nothing, every
         recording is shown instead - so a tab can never be missing and a recording can always
         be reached to be timed, whatever the names say.
         An audio recording's tab is an editing aid - it is how a line gets timed - so it shows
         only while editing. In view mode the page simply plays. A video keeps its tab. */
      var want = raagSectParts(l, state.raagSect).media;
      var mine = [];
      l.media.forEach(function (m, i) { if (!m.file && want.indexOf(i) >= 0 && (state.canEdit || (m.kind === "video" && !m.edit))) mine.push({ m: m, i: i }); });
      /* no fallback to every recording: a part shows its own and nothing else - showing
         everything put the bandish video on the aaroh and mukt pages. */
      tabMs = mine;
    }
    /* your own files come first in the row, so they are easy to pick and time. The list order
       itself is left alone, because the saved offsets are keyed by a recording's position. */
    tabMs.sort(function (a, b) { return (b.m.file ? 1 : 0) - (a.m.file ? 1 : 0); });
    if (tabMs.length > 1) {
      html += '<div class="sk-mediatabs">' + tabMs.map(function (t) {
        var m = t.m, i = t.i;
        /* the tab reads as the part, not the whole file name: "मुक्त आलाप 1-10" rather than
           "२०२६०८२३ - राग दुर्गा - आरोह औरोह - मुक्त आलाप 1-10" */
        var nm = String(m.name || "").replace(/\.[a-z0-9]+$/i, "").trim();
        nm = nm.replace(/^[\u0966-\u096f0-9]{6,8}\s*-\s*/, "");   /* drop a leading date */
        var seg = nm.split(" - ");
        if (seg.length > 2) nm = seg.slice(2).join(" - ");          /* past the raag and the singer */
        nm = esc(nm);
        if (m.missing) return '<button class="sk-mtab miss' + (i === state.mediaIdx ? " on" : "") + '" data-i="' + i + '">🎧 ' + nm + ' <b class="sk-mtag">no mp3</b></button>';
        return '<button class="sk-mtab' + (i === state.mediaIdx ? " on" : "") + '" data-i="' + i + '">' +
          (m.kind === "video" ? "🎬 " : "🎧 ") + nm + "</button>";
      }).join("") + "</div>";
    }
    html += '<div class="sk-player' + (curVideo ? " vidstick" : "") + '" id="player"></div>';

    // stop button — above the notation so it stays on screen even on long lessons
    if (l.lines && l.lines.length) {
      html += '<div class="sk-stoprow">' +
        
        (curVideo || !secHasLines || state.group === "Favourites" || !state.canEdit ? "" : '<span class="sk-hint">Tap <b>\u25b6</b> to play a line \u00b7 <b>\u23f1</b> to set its start.</span>') +
        (state.editMode ? ('<button class="sk-editbtn ghost' + (HISTORY.length ? "" : " off") + '" id="btnUndo" type="button"' +
        (HISTORY.length ? "" : " disabled") + ' title="' +
        (HISTORY.length ? "Put back: " + esc(HISTORY[HISTORY.length - 1].label) : "Nothing to put back yet") +
        '">\u21b6 Revert</button>') : "") +
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
    s.innerHTML = html;

    // wire media tabs
    Array.prototype.forEach.call(s.querySelectorAll(".sk-mtab"), function (b) {
      b.onclick = function () { state.mediaIdx = +b.dataset.i; renderList(); renderStage(l); };
    });

    renderPlayer(l);
    if (l.lines && l.lines.length && secHasLines) { renderNotation(l); if (!curVideo && !bareLesson) wireControls(l); }
    /* each line carries its own ✎, so there is no page-level one */
    var ubtn = $("#btnUndo");
    if (ubtn) ubtn.onclick = function () { doUndo(); };
  }

  function renderPlayer(l) {
    var m = l.media[state.mediaIdx];
    var p = $("#player");
    p.classList.remove("bare");
    if (!m) {
      /* A lesson with recordings is not "no audio or video": they are there, held back until
         editing, so saying otherwise would be untrue. */
      p.innerHTML = (l.media && l.media.length) ? "" : '<div class="sk-dim">No audio or video for this lesson.</div>';
      return;
    }
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
        "</div>" +
        '<div class="sk-dim">🎬 ' + esc(m.name) + "</div>";   // outside the wrapper, so the fallback cannot wipe it
      var vd = $("#vid"), ctl = $("#vctl"), vfill = $("#vFill"), vtime = $("#vTime"), vtr = $("#vTrack");
      /* A page showing a video must play that video and nothing else. Clearing the
         audio stops a line's play button from reaching for an mp3 left over from
         another part of the lesson. */
      state.video = vd; state.audio = null;
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
        hideT = setTimeout(function () { ctl.classList.remove("on"); }, 2500);   /* fades quickly, so it does not sit over the picture */
      }
      $("#vPlay").onclick = function () { if (vd.paused) vd.play().catch(function () {}); else vd.pause(); showCtl(); };
      vd.addEventListener("play", function () { $("#vPlay").textContent = "\u275a\u275a"; vupd(); showCtl(); });
      vd.addEventListener("pause", function () { $("#vPlay").textContent = "\u25b6"; showCtl(); });
      vd.addEventListener("timeupdate", vupd);
      vd.addEventListener("loadedmetadata", vupd);
      vd.addEventListener("error", function () {      // can't play natively? fall back to Drive's player
        state.video = null;                            // nothing on this page can be seeked any more
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
        ["pointerenter", "pointermove", "pointerdown"].forEach(function (ev) {
          wrap.addEventListener(ev, showCtl);
        });
        /* a touch screen never sends pointerleave, so leaving is handled by the fade alone */
        wrap.addEventListener("pointerleave", function () {
          var c = $("#vctl"); if (c) c.classList.remove("on");
        });
      }
      vupd();
      showCtl();
    } else {
      p.innerHTML =
        '<div class="pl' + (state.editMode ? "" : " pl-hidden") + '">' +
          '<button class="pl-btn" id="plPlay" type="button" aria-label="play">▶</button>' +
          '<button class="pl-btn sm" id="plBack" type="button">−5</button>' +
          '<span class="pl-time" id="plTime">0:00 / 0:00</span>' +
          '<button class="pl-btn sm" id="plFwd" type="button">+5</button>' +
        "</div>" +
        '<audio id="au" preload="metadata" referrerpolicy="no-referrer" src="' + mediaURL(m) + '"></audio>' +
        '<div class="sk-dim' + (state.editMode ? "" : " pl-hidden") + '">🎧 ' + esc(m.name) + "</div>";
      var au = $("#au");
      state.audio = au;
      /* A page can hold both a video and audio recordings. Once an audio plays, the video is
         no longer on screen, and the strip of recording tabs is not an obvious way back - so
         put the way back right here, under the player. */
      var vidIdx = -1;
      (l.media || []).forEach(function (mm, i) { if (mm.kind === "video") vidIdx = i; });
      if (vidIdx >= 0 && String(vidIdx) !== String(state.mediaIdx)) {
        var sv = document.createElement("div");
        sv.className = "showvid";
        var svb = document.createElement("button");
        svb.className = "sk-btn"; svb.type = "button";
        svb.textContent = "\ud83c\udfac Show video";
        svb.title = "Back to the video for this page";
        svb.onclick = function () { switchMedia(l, vidIdx); };
        sv.appendChild(svb);
        p.appendChild(sv);
      }
      var srcs = audioSources(m), si = 0;
      au.addEventListener("error", function () {
        si++;
        if (si < srcs.length) { au.src = srcs[si]; au.load(); }
      });
      au.addEventListener("play", function () { ensureLoop(); syncLineBtns(); });
      au.addEventListener("pause", function () { syncLineBtns(); });
      au.addEventListener("ended", function () { state.segPlay = null; clearLineHL(); state.playingLine = -1; syncLineBtns(); });
      /* compact player */
      var playBtn = $("#plPlay"), fill = $("#plFill"), timeEl = $("#plTime"), track = $("#plTrack"), bar = track && track.firstChild;
      function upd() {
        var d = au.duration;
        if (fill) fill.style.width = (d ? (au.currentTime / d * 100) : 0) + "%";
        if (timeEl) timeEl.textContent = fmtTime(au.currentTime) + " / " + fmtTime(d);
      }
      playBtn.onclick = function () { if (au.paused) au.play().catch(function () {}); else au.pause(); };
      au.addEventListener("play", function () { playBtn.textContent = "❚❚"; });
      /* paused part-way shows a circular arrow — press it and it carries on from here */
      au.addEventListener("pause", function () { if (!au.ended) playBtn.textContent = "↻"; });
      au.addEventListener("ended", function () { playBtn.textContent = "▶"; });
      au.addEventListener("timeupdate", upd);
      au.addEventListener("loadedmetadata", function () {
        if (au._pendingSeek != null) { try { au.currentTime = au._pendingSeek; } catch (e) {} au._pendingSeek = null; }
        upd();
      });
      au.addEventListener("canplay", function () {
        if (au._pendingSeek != null) { try { au.currentTime = au._pendingSeek; } catch (e) {} au._pendingSeek = null; }
      });
      au.addEventListener("durationchange", upd);
      $("#plBack").onclick = function () { au.currentTime = Math.max(0, au.currentTime - 5); upd(); };
      $("#plFwd").onclick = function () { var d = au.duration || (au.currentTime + 5); au.currentTime = Math.min(d, au.currentTime + 5); upd(); };
      var dragging = false;
      function seekAt(e) {
        if (!bar) return;
        var r = bar.getBoundingClientRect();
        var f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        if (au.duration) au.currentTime = f * au.duration;
        upd();
      }
      if (track) {                     // the seek bar is gone, so there is nothing to drag
        track.addEventListener("pointerdown", function (e) { dragging = true; try { this.setPointerCapture(e.pointerId); } catch (x) {} seekAt(e); });
        track.addEventListener("pointermove", function (e) { if (dragging) seekAt(e); });
        track.addEventListener("pointerup", function () { dragging = false; });
        track.addEventListener("pointercancel", function () { dragging = false; });
      }
    }
  }

  /* Sthayi and Antara sit side by side on one page, each behind its own
     collapsible heading. */
  function subGroup(label) {
    /* Sthayi / Antara anywhere in the name, so the bandish's "Bandish (Sthayi)" and
       "Bandish (Antara)" fold just like the laikari headings do. Both start folded. */
    var t = label || "";
    if (t.indexOf("\u26a0") >= 0) return "";   // a check-note is not a part heading
    var nm = (/^\s*bandish\s*(.*?)\s*\(/i.exec(t) || [])[1];
    var tail = nm ? " " + nm.trim() : "";      // so two bandish keep separate headings
    if (/Sthayi|\u0938\u094d\u0925\u093e\u0908/i.test(t)) return "\u0938\u094d\u0925\u093e\u0908" + tail;
    if (/Antara|\u0905\u0902?\u0924\u0930/i.test(t)) return "\u0905\u0902\u0924\u0930\u093e" + tail;
    return "";
  }
  function grpKey(l, g) { return l.id + "|" + (state.raagSect || "") + "|" + g; }
  /* The स्थाई and अंतरा headings start folded — twenty lines at once is a lot to
     scroll past — and open when you tap them. */
  function grpStartsClosed(g) {
    /* a bandish heading carries its name, so "स्थाई 2" must behave like "स्थाई" */
    return /^\u0938\u094d\u0925\u093e\u0908/.test(g || "") || /^\u0905\u0902\u0924\u0930/.test(g || "");
  }
  function grpOpen(l, g) {
    var f = state.grp[grpKey(l, g)];
    return f === undefined ? !grpStartsClosed(g) : f !== false;
  }
  function groupHeader(l, g) {
    var open = grpOpen(l, g);
    var n = 0;
    (l.lines || []).forEach(function (ln) {
      if (lineSection(l, ln.label) === state.raagSect && subGroup(ln.label) === g) n++;
    });
    var b = document.createElement("button");
    b.type = "button"; b.className = "grp-h" + (open ? " open" : "");
    b.innerHTML = '<span class="grp-car">' + (open ? "\u25be" : "\u25b8") + "</span>" +
      "<span>" + esc(g) + " " + esc(raagSectLabel(state.raagSect)) + "</span>" +
      '<span class="grp-n">' + n + "</span>";
    b.onclick = function () { state.grp[grpKey(l, g)] = !open; renderNotation(l); };
    if (state.canEdit) {
      var pen = document.createElement("button");
      pen.type = "button";
      pen.className = "grp-pen" + (state.editOpen["g:" + g] ? " on" : "");
      pen.textContent = "\u270e Edit";
      pen.title = state.editOpen["g:" + g] ? "Close the editor" : "Edit " + g;
      pen.onclick = function (e) {
        e.stopPropagation();
        state.editOpen["g:" + g] = !state.editOpen["g:" + g];
        renderNotation(l);
      };
      b.appendChild(pen);
    }
    return b;
  }

  /* ---------- the taal lane ----------
     A taal is laid out as its matras. On top sit the taal marks — × for sam, ० for
     khali, and the taali numbers for the rest — then the matra numbers, then the bols.
     A | in the line divides one vibhag from the next. */
  var TAAL_MARKS = {
    "\u0926\u093e\u0926\u0930\u093e": ["\u00d7", "\u0966"],
    "\u0915\u0947\u0939\u0947\u0930\u0935\u093e": ["\u00d7", "\u0966"],
    "\u0915\u0939\u0930\u0935\u093e": ["\u00d7", "\u0966"],
    "\u0930\u0942\u092a\u0915": ["\u0966", "2", "3"],
    "\u090f\u0915 \u0924\u093e\u0932": ["\u00d7", "\u0966", "2"],
    "\u091a\u094c \u0924\u093e\u0932": ["\u00d7", "\u0966", "2", "3"],
    "\u0924\u0940\u0928 \u0924\u093e\u0932": ["\u00d7", "2", "\u0966", "3"],
    "\u0924\u094d\u0930\u093f\u0924\u093e\u0932": ["\u00d7", "2", "\u0966", "3"],
    "\u0924\u093f\u0932\u0935\u093e\u0921\u093c\u093e": ["\u00d7", "2", "\u0966", "3"],
    "\u091d\u092a \u0924\u093e\u0932": ["\u00d7", "2", "\u0966", "3"],
    "\u091d\u0942\u092e\u0930\u093e": ["\u00d7", "2", "\u0966", "3"],
    "\u0926\u0940\u092a\u091a\u0902\u0926\u0940": ["\u00d7", "2", "\u0966", "3"],
    "\u092a\u0902\u091c\u093e\u092c\u0940": ["\u00d7", "2", "\u0966", "3"]
  };
  /* the same table, matched without fussing over spaces — झपताल and झप ताल are the same taal */
  function taalMarksFor(name) {
    var n = String(name || "").replace(/\s+/g, "").trim();
    if (!n) return null;
    var keys = Object.keys(TAAL_MARKS);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].replace(/\s+/g, "") === n) return TAAL_MARKS[keys[i]];
    }
    return null;
  }
  function taalView(l, li, line) {
    var wrap = document.createElement("div"); wrap.className = "tl";
    var txt = lineText(l, li) || "";
    var vib = txt.split(/\s*\|\s*/).map(function (x) {
      return x.trim().split(/\s+/).filter(Boolean);
    }).filter(function (a) { return a.length; });
    if (!vib.length) return wrap;
    var marks = TAAL_MARKS[String(l.taal || "").trim()] || null;
    var total = vib.reduce(function (a, b) { return a + b.length; }, 0);
    var marksRow = document.createElement("div"); marksRow.className = "tl-row tl-marks";
    var numsRow  = document.createElement("div"); numsRow.className  = "tl-row tl-nums";
    var bolsRow  = document.createElement("div"); bolsRow.className  = "tl-row tl-bols";
    var n = 0;
    vib.forEach(function (grp, gi) {
      var mk = marks && marks[gi] != null ? marks[gi] : (gi === 0 && !marks ? "\u00d7" : "");
      grp.forEach(function (bol, bi) {
        n++;
        var c1 = document.createElement("div");
        c1.className = "tl-cell m" + (mk === "\u00d7" ? " sam" : "") + (mk === "\u0966" ? " khali" : "");
        c1.textContent = bi === 0 ? mk : "";
        if (mk) c1.setAttribute("data-mark", mk === "\u00d7" ? "\u0938\u092e" : (mk === "\u0966" ? "\u0916\u093e\u0932\u0940" : "\u0924\u093e\u0932\u0940"));
        var c2 = document.createElement("div"); c2.className = "tl-cell n"; c2.textContent = String(n);
        var c3 = document.createElement("div");
        c3.className = "tl-cell b" + (bi === grp.length - 1 ? " vend" : "");
        c3.textContent = bol; c3.setAttribute("data-mark", "\u092c\u094b\u0932");
        marksRow.appendChild(c1); numsRow.appendChild(c2); bolsRow.appendChild(c3);
      });
    });
    wrap.appendChild(marksRow); wrap.appendChild(numsRow); wrap.appendChild(bolsRow);
    var cap = document.createElement("div"); cap.className = "tl-cap";
    cap.textContent = (l.taal || "Taal") + " \u00b7 " + total + " matras \u00b7 " + vib.length + " vibhag";
    wrap.appendChild(cap);
    return wrap;
  }

  /* Keep the lines of one heading together. An added line sits at the end of the list, so
     without this it would start a second स्थाई heading instead of joining the first.
     Lines are ordered by where their heading first appears, and stay in order within it. */
  function orderedLines(l, secKey) {
    var list = [];
    (l.lines || []).forEach(function (line, li) {
      if (secKey && lineSection(l, line.label) !== secKey) return;
      list.push({ line: line, li: li });
    });
    var firstAt = {};
    list.forEach(function (x, i) {
      var g = subGroup(x.line.label);
      if (g && firstAt[g] === undefined) firstAt[g] = i;
    });
    return list.map(function (x, i) {
      var g = subGroup(x.line.label);
      return { x: x, key: (g && firstAt[g] !== undefined) ? firstAt[g] : i, i: i };
    }).sort(function (a, b) { return (a.key - b.key) || (a.i - b.i); })
      .map(function (o) { return o.x; });
  }
  /* ---------- files: a Drive link per page ----------
     Every page carries its own list of links. In edit mode you add them and tick whether each
     one shows in view mode; in view mode you see only the ticked ones. Kept on this device. */
  function loadFiles() {
    if (state.files) return state.files;
    try { state.files = JSON.parse(localStorage.getItem("sk_files") || "{}"); } catch (e) { state.files = {}; }
    return state.files;
  }
  function saveFiles() { try { localStorage.setItem("sk_files", JSON.stringify(state.files || {})); } catch (e) {} }
  function fileKey(l) { return l.id + "|" + (state.raagSect || ""); }
  function fileList(l) {
    var all = loadFiles(), k = fileKey(l);
    if (!all[k]) all[k] = [];
    return all[k];
  }
  /* Pull the Drive file id out of a link, whichever shape it was pasted in. */
  function driveId(url) {
    var u = String(url || "");
    var m = /\/file\/d\/([A-Za-z0-9_-]{10,})/.exec(u) || /[?&]id=([A-Za-z0-9_-]{10,})/.exec(u) ||
            /\/d\/([A-Za-z0-9_-]{10,})/.exec(u);
    return m ? m[1] : "";
  }
  /* A file that is ticked to show plays at the top like any other recording, so it is added
     to this page's media. Drive serves it through its own player, which is the same route a
     Drive-hosted video already takes. */
  function isAudioURL(u) { return /\.(mp3|m4a|wav|ogg|aac|opus)(\?|#|$)/i.test(String(u || "")); }
  function fileMedia(l) {
    var list = fileList(l);
    /* While editing, every file is offered as a recording so it can be picked and given its
       line timings. The tick then means what it says: show it in view mode as well. */
    return list.filter(function (f) { return (f.view || state.canEdit) && (driveId(f.url) || isAudioURL(f.url)); })
      .map(function (f, i) {
        var nm = f.name || ("File " + (i + 1));
        if (isAudioURL(f.url)) {
          /* a direct link to the audio: plays here, so its lines can be timed */
          return { id: "u" + i, src: f.url, name: nm, kind: "audio", file: true };
        }
        /* A Drive file plays through Drive's direct address, the same route the app's own
           recordings use, so it can be seeked and timed. Only if that fails does it fall back
           to Drive's page player, which cannot. */
        var did = driveId(f.url);
        return { id: did, src: "https://drive.usercontent.google.com/download?id=" + did + "&export=download&confirm=t",
                 name: nm, kind: "audio", file: true };
      });
  }
  function applyFiles(l) {
    if (!l._mediaBase) l._mediaBase = (l.media || []).slice();
    l.media = l._mediaBase.concat(fileMedia(l));
  }

  /* The Files box is gone. Files are added to the sheet itself, so there is no Add a file,
     no Save files and no per-page link list. A stale build had brought it back. */
  function filesBox(l) { return null; }

  function filesBoxRemoved(l) {
    var list = fileList(l), ed = editingNow();
    var shown = ed ? list : list.filter(function (f) { return f.view && f.url; });
    if (!ed && !shown.length) return null;
    var d = document.createElement("div"); d.className = "sk-files";
    var h = document.createElement("div"); h.className = "sk-files-h";
    h.textContent = "Files";
    d.appendChild(h);
    list.forEach(function (f, i) {
      if (!ed && !(f.view && f.url)) return;
      if (ed) {
        var row = document.createElement("div"); row.className = "sk-file-row";
        var inp = document.createElement("input");
        inp.type = "url"; inp.className = "sk-file-in"; inp.value = f.url || "";
        inp.placeholder = "paste a Google Drive link";
        inp.oninput = function () { f.url = inp.value; saveFiles(); };
        var lab = document.createElement("span"); lab.className = "sk-file-lab"; lab.textContent = "show";
        lab.title = "tick to show this in view mode";
        var cb = document.createElement("input");
        cb.type = "checkbox"; cb.className = "sk-file-cb"; cb.checked = !!f.view;
        cb.onchange = function () { f.view = cb.checked; saveFiles(); };
        var rm = document.createElement("button");
        rm.type = "button"; rm.className = "sk-file-x"; rm.textContent = "\u2715";
        rm.title = "Remove this file";
        rm.onclick = function () {
          var _f = list[i] || {};
          askConfirm("Remove this file?\n\n" + (_f.url || "the file") + "\n\nYou can put it back with Revert.",
            function () {
              pushHistory("removed a file from this page");
              list.splice(i, 1); saveFiles(); renderStage(l);
              mkMsg("File removed \u2014 press Revert to put it back.");
            });
        };
        row.appendChild(inp); row.appendChild(lab); row.appendChild(cb); row.appendChild(rm);
        d.appendChild(row);
      } else {
        var a = document.createElement("a");
        a.className = "sk-file-link"; a.href = f.url; a.target = "_blank"; a.rel = "noopener";
        a.textContent = f.name || ("File " + (i + 1));
        d.appendChild(a);
      }
    });
    if (ed) {
      var add = document.createElement("button");
      add.type = "button"; add.className = "sk-file-add"; add.textContent = "+ Add a file";
      add.onclick = function () { list.push({ url: "", view: false }); saveFiles(); renderStage(l); };
      d.appendChild(add);
      /* Save files: keeps the links and shows them at the top of the page as recordings, so a
         file can be picked and given its own line timings, like any other recording. */
      var sv = document.createElement("button");
      sv.type = "button"; sv.className = "sk-file-add sk-file-save"; sv.textContent = "Save files";
      sv.title = "Save these links and show them at the top of the page";
      sv.onclick = function () { saveFiles(); applyFiles(l); renderStage(l); };
      d.appendChild(sv);
    }
    return d;
  }

  /* ---------- page 5: the बंदिश index ---------- */
  function nextBandishName(l) {
    var names = bandishNames(l), n = names.length + 1;
    while (names.indexOf(String(n)) >= 0) n++;
    return String(n);
  }
  function addBandish(l) {
    var nm = nextBandishName(l), sib = null;
    (l.lines || []).forEach(function (ln) { if (!sib && ln.bandish) sib = ln.bandish; });
    var taal = sib ? sib.taal : "\u0924\u0940\u0928\u0924\u093e\u0932";
    var m = sib ? (sib.matras || 16) : 16;
    var vib = (sib && sib.vibhag ? sib.vibhag : [4, 4, 4, 4]).slice();
    ["Sthayi", "Antara"].forEach(function (part) {
      var idx = nextAddIndex(l.id), sw = [], ly = [];
      for (var i = 0; i < m; i++) { sw.push("-"); ly.push(""); }
      setLineEdit(l.id, String(idx), {
        t: "", label: "Bandish " + nm + " (" + part + ")", sect: "bandish",
        bd: { taal: taal, matras: m, vibhag: vib },
        b: { "0": { swar: sw, lyric: ly } }
      });
    });
    applyAdds(); renderList(); renderStage(l);
  }
  function renameBandish(l, from, to) {
    if (!to || to === from) return;
    (l.lines || []).forEach(function (ln, i) {
      var m = /^\s*bandish\s*(.*?)\s*\((Sthayi|Antara|\u0938\u094d\u0925\u093e\u0908|\u0905\u0902\u0924\u0930\u093e)\)\s*$/i.exec(ln.label || "");
      if (!m) return;
      if ((m[1].trim() || "1") !== from) return;
      var key = (typeof ln.idx === "number") ? String(ln.idx) : String(i);
      setLineEdit(l.id, key, { label: "Bandish " + to + " (" + m[2] + ")" });
    });
    applyAdds(); renderList(); renderStage(l);
  }
  function removeBandish(l, nm) {
    var names = bandishNames(l);
    if (names.length <= 1) {
      mkMsg("This raag has only one bandish, so it cannot be removed. A raag needs at least one.");
      return;
    }
    askConfirm("Remove the bandish \u201c" + nm + "\u201d?\n\nIts \u0938\u094d\u0925\u093e\u0908 and \u0905\u0902\u0924\u0930\u093e are deleted. You can put it back with Revert.",
      function () {
        pushHistory("removed the bandish " + nm);
        histQuiet(function () {
        (l.lines || []).forEach(function (ln, i) {
          var m = /^\s*bandish\s*(.*?)\s*\(/i.exec(ln.label || "");
          if (!m) return;
          if ((m[1].trim() || "1") !== nm) return;
          var key = (typeof ln.idx === "number") ? String(ln.idx) : String(i);
          setLineEdit(l.id, key, null);
        }); });
        applyAdds(); renderList(); renderStage(l);
        mkMsg("Removed the bandish \u201c" + nm + "\u201d \u2014 press Revert to put it back.");
      });
  }

  function bandishIndex(l) {
    var d = document.createElement("div"); d.className = "bndx";
    var names = bandishNames(l);
    if (!names.length) {
      var none = document.createElement("div"); none.className = "sk-dim";
      none.textContent = "No bandish yet.";
      d.appendChild(none);
    }
    names.forEach(function (nm, i) {
      var row = document.createElement("div"); row.className = "bndx-row";
      var b = document.createElement("button");
      b.type = "button"; b.className = "bndx-open";
      b.textContent = "\u092c\u0902\u0926\u093f\u0936 " + nm;
      b.onclick = function () { open(l.id, null, "bandish:" + (i + 1)); };
      row.appendChild(b);
      if (state.canEdit) {
        var inp = document.createElement("input");
        inp.className = "bndx-name"; inp.value = nm; inp.placeholder = "bandish name";
        inp.title = "Rename this bandish";
        inp.onchange = function () { renameBandish(l, nm, inp.value.trim()); };
        row.appendChild(inp);
        var del = document.createElement("button");
        del.type = "button"; del.className = "bndx-x"; del.textContent = "\u2715";
        del.title = "Remove this bandish";
        del.onclick = function () { removeBandish(l, nm); };
        row.appendChild(del);
        var ok = document.createElement("button");
        ok.type = "button"; ok.className = "bndx-ok"; ok.textContent = "\u2713";
        ok.title = "Save this name";
        ok.onclick = function () { renameBandish(l, nm, inp.value.trim()); };
        row.appendChild(ok);
      }
      d.appendChild(row);
    });
    if (state.canEdit) {
      var add = document.createElement("button");
      add.type = "button"; add.className = "ed-addbtn";
      add.textContent = "+ Add a bandish";
      add.onclick = function () { askNewBandish(l); };
      d.appendChild(add);
    }
    return d;
  }

  /* On the मुक्त आलाप page "Mukt Aalap" adds nothing line after line, so the label reads as a
     plain number and the notation gets the room. The stored label is untouched, so the page
     still knows which part it is. */
  function displayLabel(label) {
    var t = label || "";
    if (!/mukt\s*aalap|\u092e\u0941\u0915\u094d\u0924\s*\u0906\u0932\u093e\u092a/i.test(t)) return t;
    var m = /(\d+)\s*$/.exec(t);                 // its number, wherever it sits in the label
    return m ? (m[1] + ".") : "";
  }

  var SAVED_T = {};
  /* Save says so, then returns to Save so it can be pressed again after more changes. The
     notation is redrawn when it flips back, so the page stays in step. */
  function flashSaved(l, btn, key, obj) {
    setLineEdit(l.id, key, obj);
    btn.textContent = "Saved";
    btn.classList.add("saved");
    clearTimeout(SAVED_T[key]);
    SAVED_T[key] = setTimeout(function () {
      btn.textContent = "Save";
      btn.classList.remove("saved");
      renderNotation(l);
    }, 4000);
  }

  function renderNotation(l) {
    var box = $("#notation");
    if (!box) return;
    box.innerHTML = "";
    state.lineBtns = {};
    var curIsVideo = (l.media[state.mediaIdx] || {}).kind === "video";
    var secKey = (l.group === "Raag" && state.raagSect) ? state.raagSect : null;
    // which sub-groups are on screen? (only worth headings when there are two)
    var grpCount = {};
    orderedLines(l, secKey).forEach(function (x) {
      var line = x.line;
      if (line.onlyVideo && !curIsVideo) return;
      if (secKey && lineSection(l, line.label) !== secKey) return;
      var g0 = subGroup(line.label);
      if (g0) grpCount[g0] = (grpCount[g0] || 0) + 1;
    });
    var useGroups = Object.keys(grpCount).length >= 2;
    var lastG = null;
    var _ends = lineEnds();   // a line runs until the next line's offset begins
    helpFirst = true;         // the notation table is shown once, on the first line drawn

    orderedLines(l, secKey).forEach(function (x) {
      var line = x.line, li = x.li;
      if (line.onlyVideo && !curIsVideo) return;
      if (secKey && lineSection(l, line.label) !== secKey) return;
      var grp = useGroups ? subGroup(line.label) : "";
      if (useGroups && grp && grp !== lastG) { box.appendChild(groupHeader(l, grp)); lastG = grp; }
      if (useGroups && grp && !grpOpen(l, grp)) return;   // this heading is folded away
      var row = document.createElement("div");
      row.className = "sk-line";
      state.lineRows[li] = row;
      var ctl = document.createElement("span");
      ctl.className = "ln-ctl";
      /* On a page whose recording is a video there is no per-line play button.
         Drive serves those videos through its own player, which cannot be seeked
         from here, so a play button would only promise something it cannot do. */
      /* No play button when the page was opened from the Favourites list: tapping a
         favourite already starts that line, so the button would only repeat it. On the
         lesson's own page the button stays. */
      var fromFav = state.group === "Favourites";
      if (!curIsVideo && !fromFav) {
        var bw = document.createElement("button");
        bw.className = "ln-btn sk5"; bw.type = "button"; bw.textContent = "\u22125";
        bw.title = "Back 5 seconds";
        bw.onclick = function () { skipLine(-5); };
        ctl.appendChild(bw);
        var fw = document.createElement("button");
        fw.className = "ln-btn sk5"; fw.type = "button"; fw.textContent = "+5";
        fw.title = "Forward 5 seconds";
        fw.onclick = function () { skipLine(5); };
        ctl.appendChild(fw);
        var pb = document.createElement("button");
        pb.className = "ln-btn playb"; pb.type = "button"; pb.textContent = "▶";
        pb.title = "Play or pause this line";
        pb.onclick = function () { toggleLine(li); };
        state.lineBtns[li] = pb;
        ctl.appendChild(pb);
        if (state.canEdit && !line.bandish) {     // a bandish opens from its स्थाई / अंतरा heading
          var eb = document.createElement("button");
          eb.className = "ln-btn penb" + (state.editOpen[li] ? " on" : "");
          eb.type = "button"; eb.textContent = "\u270e";
          eb.title = state.editOpen[li] ? "Close the editor" : "Edit this line";
          eb.onclick = function () { state.editOpen[li] = !state.editOpen[li]; renderNotation(l); };
          ctl.appendChild(eb);
        }
      }
      if (pageEditing(l) && !curIsVideo) {   // a clock on a video page has nothing it can time
        var mb = document.createElement("button");
        mb.className = "ln-btn mark"; mb.type = "button"; mb.textContent = "⏱";
        mb.title = "Set this line's start at the current position";
        mb.onclick = function () { markLine(li); };
        ctl.appendChild(mb);
      }
      var sunb = document.createElement("button");
      sunb.className = "ln-btn sunb" + (favHas(l.id, secKey, li) ? " on" : "");   // this item
      sunb.type = "button"; sunb.textContent = "\u2600";
      sunb.title = "Add this line to favourites";
      sunb.onclick = function () { favToggle(l.id, secKey, li, state.mediaIdx); renderNotation(l); };
      /* A bandish part keeps its own row of four under the heading, so this lone sun is not
         needed there - it was the only one of the line's buttons that showed, and it sat on
         its own under the स्थाई heading. */
      var _bl = (l.lines || [])[li] || {};
      if (tanaRowOf(l, li) === null && !_bl.bandish) ctl.appendChild(sunb);
      var seg = !curIsVideo ? segsOf()[li] : null;   // a video page shows no times at all
      if (!curIsVideo) {
        /* The row shows its offset and nothing else. The recording a line is timed against is
           not named here - that chip was noise, and it appeared in place of the time. A line
           with no saved time yet simply shows nothing. */
        /* ONE answer for the row: the line's time read from the recording that line is timed
           on. The row and the playback must never disagree about where a line ends. */
        var _off = offsetForLine(l, li);
        var _t = _off ? _off.t : null;
        if (_t != null) {
          var _end = _off.end;
          var tm = document.createElement("span");
          tm.className = "ln-time";
          tm.textContent = fmtTime(_t) + (_end != null ? " \u2013 " + fmtTime(_end) : "");
          tm.title = "This line's offset";
          ctl.appendChild(tm);
        }
      }
      // more than one take on this line?  show which one, and let it be changed
      var _e = !curIsVideo ? entryOf(l.id, li) : null;
      var _all = takesOf(_e);
      if (!curIsVideo && _all && _all.length > 1) {
        var tc = document.createElement("button");
        tc.type = "button"; tc.className = "ln-take";
        tc.textContent = (_all[+_e.cur || 0].name || "Take " + ((+_e.cur || 0) + 1)) + " \u25be";
        tc.title = "This line has more than one time \u2014 tap to change which one you are on";
        tc.onclick = function () {
          var st = localSegs(); st[li] = st[li] || { takes: _all, cur: 0 };
          st[li].cur = ((+st[li].cur || 0) + 1) % _all.length;
          saveAllLocal(); renderNotation(l); updateMarksMsg(); schedulePush();
        };
        ctl.appendChild(tc);
      }
      if (pageEditing(l) && !curIsVideo) {   // takes are about times, so not on a video page
        var addb = document.createElement("button");
        addb.type = "button"; addb.className = "ln-addtake";
        addb.textContent = "+";
        addb.title = "Give this line a second time \u2014 for a version sung again on the same recording";
        addb.onclick = function () {
          var st = localSegs();
          addTake(st, li);
          saveAllLocal(); renderNotation(l); updateMarksMsg(); schedulePush();
        };
        ctl.appendChild(addb);
      }
      if (tanaRowOf(l, li) === null) row.appendChild(ctl);   // a merged तान row keeps its own line clean
      if (line.label) {
        var lb = document.createElement("span");
        lb.className = "sk-lbl"; lb.textContent = displayLabel(line.label);
        /* on a bandish sub page the collapsible heading already names the part in Devanagari,
           so the line's own English label is not repeated inside */
        /* a bandish part and a merged तान row both say which they are in their own place,
           so the line's label is not repeated above the grid */
        if (/^bandish:/.test(secKey || "") || tanaRowOf(l, li) !== null) lb.style.display = "none";
        row.appendChild(lb);
      }
      if (l.group === "Taal") {           // a taal gets its own lane: marks, matra numbers, bols
        row.appendChild(taalView(l, li, line));
        box.appendChild(row);
        if (lineEditOpen(l, li)) box.appendChild(notationEditor(l, li));
        return;
      }
      if (line.bandish) {                 // a bandish gets the swimlane view, not a swar run
        row.appendChild(bandishView(l, li, line));
        box.appendChild(row);
        if (lineEditOpen(l, li)) box.appendChild(bandishEditor(l, li, line));
        return;
      }
      var unit = line.unit || 0, noteN = 0, mk = null;
      tokenize(lineText(l, li)).forEach(function (tk) {
        if (tk.mkOpen || tk.mdOpen) { mk = document.createElement("span"); mk.className = (tk.mdOpen ? "md-grp" : "mk-grp"); mk.setAttribute("data-mark", tk.mdOpen ? "\u092e\u0940\u0902\u0921" : "\u092e\u0941\u0930\u094d\u0915\u0940"); row.appendChild(mk); }
        if (tk.sep) {
          if ((tk.mkClose || tk.mdClose) && mk) mk = null;   // a bar right after the brace sits outside the curve
          (mk || row).appendChild(sepEl(tk.t));
        } else if (tk.t) {
          (mk || row).appendChild(swarEl(tk, unit, noteN)); noteN++;
          if ((tk.mkClose || tk.mdClose) && mk) mk = null;   // the last swar of the group is inside it
        } else if ((tk.mkClose || tk.mdClose) && mk) { mk = null; }
      });
      box.appendChild(row);
      if (lineEditOpen(l, li)) box.appendChild(notationEditor(l, li));
    });
    // while editing, one more line can be added right after the last one shown
    if (editingNow() && l.group === "Raag" && state.raagSect) {
      if (!/^bandish(:|$)/.test(state.raagSect || "")) {
        /* a bandish needs no button: press Enter in the swar or bol field for another line */
        var addb = document.createElement("button");
        addb.type = "button"; addb.className = "ed-addbtn";
        addb.textContent = "+ Add another " + (raagSectLabel(state.raagSect) || "line");
        addb.onclick = function () { addLine(l, state.raagSect); };
        box.appendChild(addb);
      }
    }
    if (state.raagSect === "bandish") box.appendChild(bandishIndex(l));
    var fb = filesBox(l);
    if (fb) box.appendChild(fb);
  }

  /* ---------- written-notation edits ----------
     The sheet does not always read cleanly, and every device hears things
     differently, so any line can be corrected here. Edits live on the device
     and are merged (never replaced) with whatever another device wrote. */
  var EDITS = "https://api.github.com/repos/akshaybangalorekar/riyaz/contents/edits.json";

  function editsFor(id) { if (!state.edits[id]) state.edits[id] = {}; return state.edits[id]; }

  /* Added lines live in the same store as the edits, at index 1000 and up, so they
     ride the same save-and-merge path. Nothing below 1000 is ever an added line. */
  var ADD_BASE = 1000;
  function addedKeys(id) {
    var e = state.edits[id] || {};
    return Object.keys(e).filter(function (k) { return +k >= ADD_BASE; })
      .sort(function (a, b) { return (+a) - (+b); });
  }
  function nextAddIndex(id) {
    var ks = addedKeys(id);
    return ks.length ? (+ks[ks.length - 1] + 1) : ADD_BASE;
  }
  function nextLabel(l, sect) {
    var re, base;
    if (sect === "mukt") { re = /^Mukt Aalap\s*(\d+)/i; base = "Mukt Aalap"; }
    else if (sect === "tana") { re = /^Tana\s*(\d+)/i; base = "Tana"; }
    else if (sect === "laikari") { re = /Laikari\s*(\d+)/i; base = "Sthayi Laikari"; }
    else if (sect === "bandish") { re = /Bandish\s*\(?(\w*)\)?\s*(\d*)/i; base = "Bandish"; }
    else { re = /(\d+)\s*$/; base = "Line"; }
    var max = 0;
    (l.lines || []).forEach(function (ln) {
      var m = re.exec(ln.label || "");
      if (m) { var n = +(m[1] && /^\d+$/.test(m[1]) ? m[1] : (m[2] || 0)); if (n > max) max = n; }
    });
    return base + " " + (max + 1);
  }
  // rebuild every lesson's line list as its built-in lines plus the added ones
  /* Older builds added a bandish "line" as a section of its own, which then sat outside
     स्थाई and अंतरा. A line of the bandish is a row of the grid, so fold any such stray line
     into the heading's grid and retire it. Runs on every load and is idempotent, because the
     retired line leaves a tombstone behind. */
  function foldStrayBandish(l) {
    var adds = addedKeys(l.id);
    if (!adds.length || !state.edits[l.id]) return;
    adds.forEach(function (k) {
      var v = state.edits[l.id][k];
      if (!v || v.del) return;
      if (v.sect && v.sect !== "bandish") return;            // other sections keep their own lines
      if (v.label && raagSect(v.label) !== "bandish") return;
      var head = (v.label && subGroup(v.label)) || SUBHEADS[0];
      var at = headLineIndex(l, head);
      if (at < 0) return;
      var b = l.lines[at] && l.lines[at].bandish;
      if (!b) return;
      var m = b.matras || 16;
      var map = {};
      bandishRows(l, at).forEach(function (r, i) { map[String(i)] = { swar: r.swar, lyric: r.lyric }; });
      var next = Object.keys(map).length;
      var rows = [];
      if (v.b) {
        Object.keys(v.b).sort(function (a, c) { return (+a) - (+c); })
          .forEach(function (rk) { rows.push(v.b[rk] || {}); });
      }
      rows.forEach(function (r) {
        var sw = r.swar || [], ly = r.lyric || [];
        if (sw.length !== m || ly.length !== m) {
          var s2 = [], l2 = [];
          for (var i = 0; i < m; i++) { s2.push(sw[i] || "-"); l2.push(ly[i] || ""); }
          sw = s2; ly = l2;
        }
        map[String(next)] = { swar: sw, lyric: ly };
        next++;
      });
      setLineEdit(l.id, at, { b: map });
      setLineEdit(l.id, k, null);                            // retire the stray line
    });
  }

  /* A bandish that came with the raag had no name — "Bandish (Sthayi)". Give it the name "1",
     so it becomes sub page 5a. Its grids are not touched. */
  function nameOldBandish(l) {
    if (bandishNames(l).length) return;
    var has = false;
    (l.lines || []).forEach(function (ln) { if (/^\s*bandish\s*\(/i.test(ln.label || "")) has = true; });
    if (!has) return;
    (l.lines || []).forEach(function (ln, i) {
      var m = /^\s*bandish\s*\((Sthayi|Antara|\u0938\u094d\u0925\u093e\u0908|\u0905\u0902\u0924\u0930\u093e)\)\s*$/i.exec(ln.label || "");
      if (m) setLineEdit(l.id, String(i), { label: "Bandish 1 (" + m[1] + ")" });
    });
  }

  function applyAdds() {
    D.lessons.forEach(function (l) {
      if (!l._base) l._base = (l.lines || []).slice();
      try { foldStrayBandish(l); } catch (e) {}
      try { nameOldBandish(l); } catch (e) {}
      var extra = addedKeys(l.id).filter(function (k) {
        return !(state.edits[l.id][k] || {}).del;          // tombstones are gone for good
      }).map(function (k) {
        var v = state.edits[l.id][k] || {};
        var lab = v.label;
        if (!lab) {
          // an older entry may have lost its label; put it back in the right part
          lab = (v.sect ? (raagSectLabel(v.sect) || "Added line") : "Added line") + " (added)";
        }
        var line = { label: lab, text: v.t || "", added: true, idx: +k };
        if (v.bd) {
          /* an added bandish line carries its own grid, so it draws the swar and bol lanes
             and gets the two-field editor, exactly like the bandish lines that came with the raag */
          var m = v.bd.matras || 16, sw = [], ly = [];
          for (var i = 0; i < m; i++) { sw.push("-"); ly.push(""); }
          line.bandish = { taal: v.bd.taal || "\u0924\u0940\u0928\u0924\u093e\u0932", matras: m,
                           vibhag: (v.bd.vibhag || [4, 4, 4, 4]).slice(),
                           rows: [{ swar: sw, lyric: ly, arc: [] }] };
        }
        return line;
      });
      /* A line that came with the raag keeps its original text unless an edit says otherwise.
         This is what makes a renamed bandish take effect — without it the rename is written
         but never shown. */
      l.lines = l._base.concat(extra).map(function (ln, i) {
        if (ln.added) return ln;
        var v = (state.edits[l.id] || {})[String(i)];
        if (!v || v.del) return ln;
        var out = {}, k;
        for (k in ln) out[k] = ln[k];
        if (typeof v.label === "string" && v.label) out.label = v.label;
        if (typeof v.t === "string") out.text = v.t;
        return out;
      });
    });
  }
  var SUBHEADS = ["\u0938\u094d\u0925\u093e\u0908", "\u0905\u0902\u0924\u0930\u093e"];
  /* Which heading a new bandish line belongs to: whichever of स्थाई / अंतरा is open,
     स्थाई first if both are. If neither is open it goes to स्थाई and that heading opens,
     so you can see where it landed. */
  function openSubHead(l) {
    for (var i = 0; i < SUBHEADS.length; i++) { if (grpOpen(l, SUBHEADS[i])) return SUBHEADS[i]; }
    return null;
  }
  function addLine(l, sect, label) {
    var idx = nextAddIndex(l.id);
    var s = sect || null, lab = label || nextLabel(l, s), extra = {};
    if (s === "bandish") {
      var head = openSubHead(l);
      if (!head) { head = SUBHEADS[0]; state.grp[grpKey(l, SUBHEADS[0])] = true; }
      /* A bandish line is a row of the heading's grid, not a section of its own — the same
         way भैरवी's स्थाई is one grid with several rows. So add a row to that grid. */
      var at = headLineIndex(l, head);
      if (at >= 0) { addRowToGrid(l, at); applyAdds(); renderList(); renderStage(l); return; }
      lab = "Bandish (" + (head === SUBHEADS[0] ? "Sthayi" : "Antara") + ")";
      var sib = null;
      (l.lines || []).forEach(function (ln) { if (!sib && ln.bandish) sib = ln.bandish; });
      var m = sib ? (sib.matras || 16) : 16, sw = [], ly = [];
      for (var i = 0; i < m; i++) { sw.push("-"); ly.push(""); }
      extra.bd = { taal: sib ? sib.taal : "\u0924\u0940\u0928\u0924\u093e\u0932", matras: m,
                   vibhag: (sib && sib.vibhag ? sib.vibhag : [4, 4, 4, 4]).slice() };
      extra.b = { "0": { swar: sw, lyric: ly } };
    }
    var obj = { t: "", label: lab, sect: s };
    Object.keys(extra).forEach(function (f) { obj[f] = extra[f]; });
    setLineEdit(l.id, String(idx), obj);
    applyAdds();
    renderList(); renderStage(l);
  }
  function removeAddedLine(l, li) {
    var line = (l.lines || [])[li];
    if (!line || !line.added) return;
    setLineEdit(l.id, String(line.idx), null);      // a tombstone, so it stays gone
    applyAdds();
    renderList(); renderStage(l);
  }
  function editKeyFor(l, li) {       // added lines are stored under their own index
    var ln = (l.lines || [])[li];
    return (ln && ln.added) ? String(ln.idx) : String(li);
  }
  function editOf(id, li) {          // lookup must not create an entry just by looking
    var e = state.edits[id], v = e && e[String(li)];
    return (v && !v.del) ? v : null;   // a tombstone reads as "no edit"
  }
  function lineText(l, li) {
    var e = editOf(l.id, editKeyFor(l, li));
    if (e && typeof e.t === "string") return e.t;
    return (l.lines[li].text || "");
  }
  function bandishRows(l, li) {
    var b = l.lines[li].bandish;
    if (!b) return [];
    var e = editOf(l.id, li), ov = (e && e.b) || {};
    var n = b.rows.length, m = b.matras || 16;
    if (e && e.bd && e.bd.rows) n = e.bd.rows;   // the count can be changed by adding or removing
    /* a row added by hand exists only in the edit, so allow for rows past the sheet's */
    Object.keys(ov).forEach(function (k) { var i = +k; if (i + 1 > n) n = i + 1; });
    var out = [];
    for (var i = 0; i < n; i++) {
      var r = b.rows[i];
      if (!r) {
        var sw = [], ly = [];
        for (var j = 0; j < m; j++) { sw.push("-"); ly.push(""); }
        r = { swar: sw, lyric: ly, arc: [] };
      }
      var o = ov[String(i)] || {};
      out.push({ swar: o.swar || r.swar, lyric: o.lyric || r.lyric, arc: o.arc || r.arc });
    }
    return out;
  }

  /* Add a blank line (row) to a grid, keeping every row that is already there. */
  function addRowToGrid(l, li) {
    var b = l.lines[li].bandish;
    if (!b) return;
    var rows = bandishRows(l, li), m = b.matras || 16, sw = [], ly = [];
    for (var i = 0; i < m; i++) { sw.push("-"); ly.push(""); }
    var map = {};
    rows.forEach(function (r, i) { map[String(i)] = { swar: r.swar, lyric: r.lyric }; });
    map[String(rows.length)] = { swar: sw, lyric: ly };
    setLineEdit(l.id, li, { b: map, bd: { rows: rows.length + 1 } });
    /* remember it, so the new line can be pointed out — a blank row added to a blank grid
       is otherwise invisible */
    state.flashRow = { li: li, ri: rows.length };
  }

  /* Take one row out of a grid and keep the rest, in order. */
  function removeGridRow(l, li, ri) {
    var _ln = (l.lines || [])[li] || {};
    askConfirm("Delete this row from " + (_ln.label || "the grid") + "?\n\nYou can put it back with Revert.",
      function () { pushHistory("deleted a row from " + (_ln.label || "a grid")); removeGridRowDo(l, li, ri); });
  }
  function removeGridRowDo(l, li, ri) {
    var rows = bandishRows(l, li);
    if (rows.length <= 1) return;                 // never leave a grid with no rows
    var map = {}, at = 0;
    rows.forEach(function (r, i) {
      if (i === ri) return;
      map[String(at)] = { swar: r.swar, lyric: r.lyric };
      at++;
    });
    setLineEdit(l.id, li, { b: map, bd: { rows: at } });
  }

  /* The line that carries a heading's grid, so a new line can be added to it. */
  function headLineIndex(l, head) {
    var at = -1;
    (l.lines || []).forEach(function (ln, i) {
      if (at < 0 && ln.bandish && raagSect(ln.label) === "bandish" && subGroup(ln.label) === head) at = i;
    });
    return at;
  }
  /* ---------- undo ----------
     Every change takes a copy of the edits first, so the last one can be put back. Kept in
     memory only and capped, so a long session cannot grow without bound. */

  /* ==========================================================================
     HISTORY - the last 100 things that changed something, each with a plain
     description so a revert can say what it is putting back.

     The old undo was a stack of bare snapshots: it covered line edits only, kept
     twenty-five, and could not tell you what it was about to restore. This keeps
     everything a delete can destroy - the edits, the favourites, the performance
     record, the files list and the user's own raags - and names each step.
     ========================================================================== */
  var HISTORY = [], HISTORY_MAX = 100;

  function snapState() {
    var o = { edits: state.edits || {}, fav: state.fav || [], manch: state.manch || [],
              files: state.files || null, raags: null };
    try { o.raags = JSON.parse(localStorage.getItem("sk_raags") || "[]"); } catch (e) {}
    try { return JSON.stringify(o); } catch (e) { return null; }
  }

  /* Call this BEFORE anything destructive, with a description in plain words. */
  var HIST_SUPPRESS = 0;
  /* Run fn without letting it add its own steps - one user action should make ONE history
     entry, named after the action, not three entries saying "an edit". */
  function histQuiet(fn) {
    HIST_SUPPRESS++;
    try { fn(); } finally { HIST_SUPPRESS--; }
  }
  function pushHistory(label) {
    if (HIST_SUPPRESS) return;
    var snap = snapState();
    if (!snap) return;
    HISTORY.push({ label: label || "a change", at: Date.now(), snap: snap });
    if (HISTORY.length > HISTORY_MAX) HISTORY.shift();
    historySyncButton();
  }
  function historySyncButton() {
    var ub = document.getElementById("btnUndo");
    if (!ub) return;
    if (!HISTORY.length) { ub.disabled = true; if (!/\boff\b/.test(ub.className)) ub.className += " off"; return; }
    ub.disabled = false;
    ub.className = ub.className.replace(/\s*off/, "");
    ub.textContent = "\u21b6 Revert";
    ub.title = "Put back: " + HISTORY[HISTORY.length - 1].label;
  }

  function restoreState(json) {
    var o; try { o = JSON.parse(json); } catch (e) { return false; }
    if (o.edits) state.edits = o.edits;
    if (o.fav) state.fav = o.fav;
    if (o.manch) state.manch = o.manch;
    if (o.files) state.files = o.files;
    if (o.raags) { try { localStorage.setItem("sk_raags", JSON.stringify(o.raags)); } catch (e) {} }
    try { saveEdits(); scheduleEditsPush(); } catch (e) {}
    try { favWriteLocal(); favSchedulePush(); } catch (e) {}
    try { manchWriteLocal(); manchSchedulePush(); } catch (e) {}
    try { saveFiles(); } catch (e) {}
    try { mergeUserRaags(); } catch (e) {}
    try { applyAdds(); } catch (e) {}
    try { renderList(); } catch (e) {}
    var l = state.lessonId && lesson(state.lessonId);
    if (l) { try { renderStage(l); } catch (e) {} }
    return true;
  }

  /* Revert the most recent step, and say what was put back. */
  function revertLast() {
    if (!HISTORY.length) { mkMsg("Nothing to revert yet."); return; }
    var step = HISTORY.pop();
    if (restoreState(step.snap)) {
      mkMsg("Put back: " + step.label + ".");
    } else {
      mkMsg("Could not put that back.");
      HISTORY.push(step);
    }
    historySyncButton();
    try { renderHistoryList(); } catch (e) {}
  }

  /* Revert everything down to (and including) step index i, newest first. */
  function revertTo(i) {
    if (i < 0 || i >= HISTORY.length) return;
    var step = HISTORY[i];
    HISTORY = HISTORY.slice(0, i);          // drop this step and everything after it
    if (restoreState(step.snap)) mkMsg("Put back: " + step.label + ".");
    historySyncButton();
    try { renderHistoryList(); } catch (e) {}
  }

  function histWhen(t) {
    try {
      var d = new Date(t), n = Date.now(), ago = Math.round((n - t) / 1000);
      if (ago < 60) return "just now";
      if (ago < 3600) return Math.round(ago / 60) + " min ago";
      if (ago < 86400) return Math.round(ago / 3600) + " h ago";
      return d.getDate() + "/" + (d.getMonth() + 1) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    } catch (e) { return ""; }
  }

  /* The history, listed in Settings, newest first. */
  function renderHistoryList() {
    var box = document.getElementById("histList");
    if (!box) return;
    if (!HISTORY.length) {
      box.innerHTML = '<div class="sk-dim" style="font-size:12.5px">Nothing yet. Deletes and edits will appear here, newest first, up to the last 100.</div>';
      return;
    }
    var out = [];
    for (var i = HISTORY.length - 1; i >= 0 && out.length < 100; i--) {
      var h = HISTORY[i];
      out.push('<div class="hist-row"><span class="hist-l">' + esc(h.label) + '</span>' +
        '<span class="hist-t">' + esc(histWhen(h.at)) + "</span>" +
        '<button class="sk-btn hist-b" data-hi="' + i + '">Revert</button></div>');
    }
    box.innerHTML = out.join("");
    Array.prototype.forEach.call(box.querySelectorAll(".hist-b"), function (b) {
      b.onclick = function () {
        var h = HISTORY[+b.dataset.hi];
        if (!h) return;
        askConfirm("Revert \u201c" + h.label + "\u201d?\n\nEverything after it will also be undone.",
          function () { revertTo(+b.dataset.hi); });
      };
    });
  }

  /* ------------------------------------------------------------------ 2. the confirm dialog
     One in-app dialog for every delete, so the wording and the look are the app's own. */
  function askConfirm(text, onYes, yesWord) {
    var m = document.getElementById("skConfirm");
    if (!m) {
      m = document.createElement("div");
      m.id = "skConfirm"; m.className = "sk-modal";
      m.innerHTML = '<div class="sk-modal-box cf-box">' +
        '<div class="cf-text" id="cfText"></div>' +
        '<div class="set-actions">' +
          '<button class="sk-btn cf-yes" id="cfYes">Yes, delete it</button>' +
          '<button class="sk-btn" id="cfNo">Keep it</button>' +
        "</div></div>";
      document.body.appendChild(m);
    }
    document.getElementById("cfText").textContent = text;
    var yes = document.getElementById("cfYes");
    yes.textContent = yesWord || "Yes, delete it";
    m.classList.add("on");
    m.onclick = function (ev) { if (ev.target === m) m.classList.remove("on"); };
    document.getElementById("cfNo").onclick = function () { m.classList.remove("on"); };
    yes.onclick = function () {
      m.classList.remove("on");
      try { onYes(); } catch (e) { mkMsg("That did not work: " + e.message); }
    };
  }

  var UNDO = [], UNDO_MAX = 25;   /* kept for compatibility */
  /* Every edit goes into the labelled history. The label is filled in by the caller where
     it knows what is being edited; otherwise it is a plain "an edit". */
  function snapshotEdits(label) {
    pushHistory(label || "an edit");
  }
  function doUndo() { revertLast(); }

  function setLineEdit(id, li, obj) {
    snapshotEdits();
    var e = editsFor(id), k = String(li);
    if (obj) {
      // merge, so saving the swar of an added line keeps its label and section
      var cur = (e[k] && !e[k].del) ? e[k] : {}, m = {};
      ["t", "label", "sect", "b", "bd"].forEach(function (f) { if (cur[f] !== undefined) m[f] = cur[f]; });
      Object.keys(obj).forEach(function (f) { m[f] = obj[f]; });
      m.at = Date.now();
      e[k] = m;
    } else {
      // a reset or a removal must travel, or the other device would put it back
      e[k] = { del: true, at: Date.now() };
    }
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
          var pa = +prev.at || 0, va = +v.at || 0;
          if (va > pa) { out[k][li] = v; return; }        // the newer edit wins outright
          if (va < pa) return;
          if (v.del && !prev.del) { out[k][li] = v; return; }   // same age: a delete wins
          if (prev.del && !v.del) return;
          var m = {};
          if (typeof prev.t === "string" || typeof v.t === "string") m.t = (v.t !== undefined ? v.t : prev.t);
          var pb = prev.b || {}, vb = v.b || {};
          var ks = Object.keys(pb).concat(Object.keys(vb));
          if (ks.length) { m.b = {}; ks.forEach(function (ri) { m.b[ri] = vb[ri] || pb[ri]; }); }
          if (prev.label || v.label) m.label = v.label || prev.label;
          if (prev.sect || v.sect) m.sect = v.sect || prev.sect;
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
      if (r && r.ok) { noteSavedAt(Date.now()); if (cb) cb("ok"); } else if (cb) cb("fail", r && r.status);
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
      noteSavedAt(newestAt(j));
      saveEdits();
      applyAdds();                 // added lines that arrived from another device
      renderList();
      if (state.lessonId && GROUPS.indexOf(state.group) >= 0 && lesson(state.lessonId)) renderStage(lesson(state.lessonId));
      if (cb) cb("ok");
    }).catch(function () { if (cb) cb("fail"); });
  }

  /* ---------- the 22 shrutis ----------
     Sa and Pa are achal (fixed). Each of Re, Ga, Ma, Dha, Ni takes four seats:
     two flavours (komal / shuddha) and, within each, a lower and a higher seat.
     2 + 5 x 4 = 22. Ratios and the traditional names differ between texts; the
     ones below are one widely cited listing, given so they can be compared. */
  var SHRUTIS = [
    { n: 1,  code: "S",  swar: "\u0938\u093e", name: "\u0924\u0940\u0935\u094d\u0930\u093e",        tone: "\u0938\u093e",              ratio: "1/1",     cents: "0.0" },
    { n: 2,  code: "r1", swar: "\u0930\u0947", name: "\u0915\u0941\u092e\u0941\u0926\u094d\u0935\u0924\u0940", tone: "\u0905\u0924\u093f \u0915\u094b\u092e\u0932 \u0930\u0947", ratio: "256/243", cents: "90.2" },
    { n: 3,  code: "r2", swar: "\u0930\u0947", name: "\u092e\u0928\u094d\u0926\u093e",          tone: "\u0915\u094b\u092e\u0932 \u0930\u0947",     ratio: "16/15",   cents: "111.7" },
    { n: 4,  code: "R1", swar: "\u0930\u0947", name: "\u091b\u0928\u094d\u0926\u094b\u0935\u0924\u0940", tone: "\u0936\u0941\u0926\u094d\u0927 \u0930\u0947", ratio: "10/9",    cents: "182.4" },
    { n: 5,  code: "R2", swar: "\u0930\u0947", name: "\u0926\u092f\u093e\u0935\u0924\u0940",      tone: "\u0924\u0940\u0935\u094d\u0930 \u0936\u0941\u0926\u094d\u0927 \u0930\u0947", ratio: "9/8", cents: "203.9" },
    { n: 6,  code: "g1", swar: "\u0917",  name: "\u0930\u091e\u094d\u091c\u0928\u0940",        tone: "\u0905\u0924\u093f \u0915\u094b\u092e\u0932 \u0917", ratio: "32/27",   cents: "294.1" },
    { n: 7,  code: "g2", swar: "\u0917",  name: "\u0930\u0915\u094d\u0924\u093f\u0915\u093e",        tone: "\u0915\u094b\u092e\u0932 \u0917",       ratio: "6/5",     cents: "315.6" },
    { n: 8,  code: "G1", swar: "\u0917",  name: "\u0930\u094c\u0926\u094d\u0930\u0940",        tone: "\u0936\u0941\u0926\u094d\u0927 \u0917",   ratio: "5/4",     cents: "386.3" },
    { n: 9,  code: "G2", swar: "\u0917",  name: "\u0915\u094d\u0930\u094b\u0927\u093e",        tone: "\u0924\u0940\u0935\u094d\u0930 \u0936\u0941\u0926\u094d\u0927 \u0917", ratio: "81/64", cents: "407.8" },
    { n: 10, code: "M1", swar: "\u092e",  name: "\u0935\u091c\u094d\u0930\u093f\u0915\u093e",        tone: "\u0936\u0941\u0926\u094d\u0927 \u092e",   ratio: "4/3",     cents: "498.0" },
    { n: 11, code: "M2", swar: "\u092e",  name: "\u092a\u094d\u0930\u0938\u093e\u0930\u093f\u0923\u0940",    tone: "\u090f\u0915 \u0936\u094d\u0930\u0941\u0924\u093f \u092e", ratio: "27/20", cents: "519.6" },
    { n: 12, code: "m1", swar: "\u092e\u093c", name: "\u092a\u094d\u0930\u0940\u0924\u093f",          tone: "\u0924\u0940\u0935\u094d\u0930 \u092e",   ratio: "45/32",   cents: "590.2" },
    { n: 13, code: "m2", swar: "\u092e\u093c", name: "\u092e\u093e\u0930\u094d\u091c\u0928\u0940",        tone: "\u0924\u0940\u0935\u094d\u0930\u0924\u092e \u092e", ratio: "729/512", cents: "611.7" },
    { n: 14, code: "P",  swar: "\u092a",  name: "\u0915\u094d\u0937\u093f\u0924\u093f",        tone: "\u092a",              ratio: "3/2",     cents: "702.0" },
    { n: 15, code: "d1", swar: "\u0927",  name: "\u0930\u0915\u094d\u0924\u093e",          tone: "\u0905\u0924\u093f \u0915\u094b\u092e\u0932 \u0927", ratio: "128/81", cents: "792.2" },
    { n: 16, code: "d2", swar: "\u0927",  name: "\u0938\u0928\u094d\u0926\u0940\u092a\u0928\u0940",      tone: "\u0915\u094b\u092e\u0932 \u0927",     ratio: "8/5",     cents: "813.7" },
    { n: 17, code: "D1", swar: "\u0927",  name: "\u0906\u0932\u093e\u092a\u093f\u0928\u0940",      tone: "\u0936\u0941\u0926\u094d\u0927 \u0927",   ratio: "5/3",     cents: "884.4" },
    { n: 18, code: "D2", swar: "\u0927",  name: "\u092e\u0926\u0928\u094d\u0924\u0940",        tone: "\u0924\u0940\u0935\u094d\u0930 \u0936\u0941\u0926\u094d\u0927 \u0927", ratio: "27/16", cents: "905.9" },
    { n: 19, code: "n1", swar: "\u0928\u093f", name: "\u0930\u094b\u0939\u093f\u0923\u0940",        tone: "\u0905\u0924\u093f \u0915\u094b\u092e\u0932 \u0928\u093f", ratio: "16/9", cents: "996.1" },
    { n: 20, code: "n2", swar: "\u0928\u093f", name: "\u0930\u092e\u094d\u092f\u093e",          tone: "\u0915\u094b\u092e\u0932 \u0928\u093f",     ratio: "9/5",     cents: "1017.6" },
    { n: 21, code: "N1", swar: "\u0928\u093f", name: "\u0909\u0917\u094d\u0930\u093e",          tone: "\u0936\u0941\u0926\u094d\u0927 \u0928\u093f", ratio: "15/8",    cents: "1088.3" },
    { n: 22, code: "N2", swar: "\u0928\u093f", name: "\u0915\u094d\u0937\u094b\u092d\u093f\u0928\u0940",      tone: "\u0924\u0940\u0935\u094d\u0930 \u0936\u0941\u0926\u094d\u0927 \u0928\u093f", ratio: "243/128", cents: "1109.8" }
  ];
  var SHR_SA = [ { hz: 146.83, t: "D3" }, { hz: 196.00, t: "G3" }, { hz: 220.00, t: "A3" }, { hz: 261.63, t: "C4" } ];
  var shrCtx = null, shrOsc = null, shrBtnEl = null;

  function shrStop() {
    if (shrOsc) { try { shrOsc.stop(); } catch (e) {} shrOsc = null; }
    if (shrBtnEl) { shrBtnEl.classList.remove("on"); shrBtnEl.textContent = "\u25b6"; shrBtnEl = null; }
  }
  function shrPlay(hz, btn) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!shrCtx) shrCtx = new Ctx();
      if (shrCtx.state === "suspended") shrCtx.resume();
      shrStop();
      var o = shrCtx.createOscillator(), g = shrCtx.createGain();
      o.type = "triangle"; o.frequency.value = hz;
      var t = shrCtx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.17, t + 0.04);
      g.gain.setValueAtTime(0.17, t + 1.05);
      g.gain.linearRampToValueAtTime(0, t + 1.4);
      o.connect(g); g.connect(shrCtx.destination);
      o.start(t); o.stop(t + 1.45);
      shrOsc = o; shrBtnEl = btn;
      if (btn) { btn.classList.add("on"); btn.textContent = "\u275a\u275a"; }
      o.onended = function () { if (btn) { btn.classList.remove("on"); btn.textContent = "\u25b6"; } };
    } catch (e) {}
  }
  function shrutiFrac(ratio) {
    var p = ratio.split("/");
    return (+p[0]) / (+p[1] || 1);
  }

  function mountShruti(box) {
    var sel = "", rows = SHRUTIS.map(function (s2) {
      return '<div class="shr-row" data-hz="' + (shrutiFrac(s2.ratio)).toFixed(6) + '">' +
        '<span class="shr-n">' + s2.n + "</span>" +
        '<span class="shr-code">' + esc(s2.code) + "</span>" +
        '<span class="shr-swar">' + esc(s2.swar) + "</span>" +
        '<span class="shr-name">' + esc(s2.name) + "</span>" +
        '<span class="shr-tone">' + esc(s2.tone) + "</span>" +
        '<span class="shr-ratio">' + esc(s2.ratio) + "</span>" +
        '<span class="shr-cents">' + esc(s2.cents) + "</span>" +
        '<button class="shr-play" type="button" aria-label="hear it">\u25b6</button>' +
      "</div>";
    }).join("");
    sel = SHR_SA.map(function (x, i) {
      return '<option value="' + x.hz + '"' + (i === 2 ? " selected" : "") + ">Sa = " + x.t + " (" + x.hz + " Hz)</option>";
    }).join("");
    box.innerHTML =
      '<div class="shr-head">\u0936\u094d\u0930\u0941\u0924\u093f \u2014 22 microtones in one saptak</div>' +
      '<div class="shr-intro">A shruti is the smallest pitch step the ear can tell apart. Sa and Pa are <b>achal</b> (fixed) \u2014 one seat each. ' +
      'Re, Ga, Ma, Dha and Ni each take <b>four</b> seats: two flavours (komal and shuddha) and, within each, a lower and a higher one. ' +
      '2 + 5 \u00d7 4 = <b>22</b>. Every seat below can be heard against Sa.</div>' +
      '<div class="shr-bar"><label for="shrSa">Play against</label><select id="shrSa" class="v-sel">' + sel + "</select>" +
        '<button class="shr-stop" id="shrStop" type="button">Stop</button></div>' +
      '<div class="shr-list">' +
        '<div class="shr-row shr-hrow"><span class="shr-n">#</span><span class="shr-code">code</span><span class="shr-swar"></span>' +
        '<span class="shr-name">name</span><span class="shr-tone">swar</span><span class="shr-ratio">ratio</span>' +
        '<span class="shr-cents">cents</span><span class="shr-play"></span></div>' + rows +
      "</div>" +
      '<div class="shr-note">Ratios and cents are one widely cited listing; the traditional names and the exact fractions differ between texts, ' +
      'so treat this as a map to listen against rather than the last word. Sa = ' +
      '<span id="shrSaNow">A3</span>.</div>';

    function saHz() { var e = box.querySelector("#shrSa"); return e ? +e.value : 220; }
    function saName() { var e = box.querySelector("#shrSa"); return e && e.selectedOptions[0] ? e.selectedOptions[0].textContent : ""; }
    function updSa() { var e = box.querySelector("#shrSaNow"); if (e) e.textContent = saName().replace(/^Sa = /, ""); }
    var se = box.querySelector("#shrSa");
    if (se) se.onchange = function () { updSa(); shrStop(); };
    updSa();
    var st = box.querySelector("#shrStop");
    if (st) st.onclick = function () { shrStop(); };
    Array.prototype.forEach.call(box.querySelectorAll(".shr-row[data-hz]"), function (r) {
      var b = r.querySelector(".shr-play");
      b.onclick = function () {
        if (b.classList.contains("on")) { shrStop(); return; }
        shrPlay(saHz() * (+r.dataset.hz), b);
      };
    });
  }

  /* ---------- the bandish swimlane ---------- */
  function vibhagStart(vb, i) {
    var acc = 0;
    for (var k = 0; k < vb.length; k++) { if (acc === i && k > 0) return true; acc += vb[k]; }
    return false;
  }
  /* ---------- तान: one grid, a row for each tana ----------
     The tanas share a taal and a matra count, so they read as one grid: only the first
     carries the heading, the taal marks and the matra numbers, and the rest stack under it.
     Each row still belongs to its own line, so its play button and its ✎ work as usual. */
  function tanaParts(l) {
    if (state.raagSect !== "tana") return [];
    var parts = [];
    (l.lines || []).forEach(function (ln, i) {
      if (/^\s*tana\s*\d+/i.test(ln.label || "") && ln.bandish) parts.push(i);
    });
    return parts.length > 1 ? parts : [];
  }
  function tanaRowOf(l, li) {
    var parts = tanaParts(l);
    if (!parts.length) return null;
    var at = parts.indexOf(li);
    return at < 0 ? null : at;      // 0 is the first, which carries the furniture
  }

  function bandishView(l, li, line) {
    var b = line.bandish, N = b.matras || 16, vb = b.vibhag || [4, 4, 4, 4];
    var rows = bandishRows(l, li);
    var tRow = tanaRowOf(l, li), tN = tanaParts(l).length;
    var wrap = document.createElement("div");
    wrap.className = "bnd" + (tRow !== null
      ? " merged" + (tRow === 0 ? " first" : "") + (tRow === tN - 1 ? " last" : "")
      : "");
    var trow = tRow;                              // null unless this is a tana in a merged grid
    var tFirst = (trow === null || trow === 0);   // the first carries the grid's furniture
    var head = document.createElement("div"); head.className = "bnd-head";
    head.innerHTML = '<b>' + esc(b.taal || "") + '</b><span>' + N + ' \u092e\u093e\u0924\u094d\u0930\u093e</span>';
    if (state.canEdit) {                       // a pen on the bandish grid itself
      var hpen = document.createElement("button");
      hpen.type = "button";
      hpen.className = "grp-pen" + (state.editOpen[li] ? " on" : "");
      hpen.textContent = "\u270e Edit";
      hpen.title = state.editOpen[li] ? "Close the editor" : "Edit this part";
      hpen.onclick = function () { state.editOpen[li] = !state.editOpen[li]; renderNotation(l); };
      head.appendChild(hpen);
    }
    if (!trow && line && line.bandish) {
      var bctl = document.createElement("div");
      bctl.className = "ln-ctl bnd-ctl";
      var off0 = offsetForLine(l, li);
      if (off0) {
        var ot = document.createElement("span");
        ot.className = "ln-time";
        ot.textContent = fmtTime(off0.t) + (off0.end != null ? " \u2013 " + fmtTime(off0.end) : "");
        ot.title = "This part's offset";
        bctl.appendChild(ot);
      }
      var bb = document.createElement("button");
      bb.className = "ln-btn sk5"; bb.type = "button"; bb.textContent = "\u22125";
      bb.title = "Back 5 seconds";
      bb.onclick = function () { skipLine(-5); };
      bctl.appendChild(bb);
      var bf = document.createElement("button");
      bf.className = "ln-btn sk5"; bf.type = "button"; bf.textContent = "+5";
      bf.title = "Forward 5 seconds";
      bf.onclick = function () { skipLine(5); };
      bctl.appendChild(bf);
      var bp = document.createElement("button");
      bp.className = "ln-btn playb"; bp.type = "button"; bp.textContent = "\u25b6";
      bp.title = "Play or pause this part";
      bp.onclick = function () { toggleLine(li); };
      state.lineBtns[li] = bp;
      bctl.appendChild(bp);
      var bs = document.createElement("button");
      bs.className = "ln-btn sunb" + (favHas(l.id, state.raagSect, li) ? " on" : "");
      bs.type = "button"; bs.textContent = "\u2600";
      bs.title = "Add this part to favourites";
      bs.onclick = function () { favToggle(l.id, state.raagSect, li, state.mediaIdx); renderNotation(l); };
      bctl.appendChild(bs);
      wrap.appendChild(bctl);
    }

    if (tFirst) wrap.appendChild(head);
          // a merged grid has one heading, at the top

    function lane(cls) {
      var el = document.createElement("div"); el.className = "bnd-lane " + cls;
      for (var i = 0; i < N; i++) {
        var c = document.createElement("span");
        c.className = "bnd-cell" + (vibhagStart(vb, i) ? " bnd-vs" : "");
        el.appendChild(c);
      }
      return el;
    }
    /* how many matras does the group written in this cell take?  { ... }2 says two. */
    function spanOf(a, b) {
      /* two ways to say it: {re ma pa dha}2 after the brace, or {2.re.ma.pa.dha} up front */
      function one(t) {
        t = String(t == null ? "" : t);
        var lead = /^\s*\{\s*(\d+)\s*[.\s]/.exec(t);
        if (lead) return +lead[1];
        var tail = /\}\s*[x\u00d7]?\s*(\d+)/.exec(t);
        return tail ? +tail[1] : 1;
      }
      return Math.max(1, Math.min(8, Math.max(one(a), one(b))));
    }
    /* {रे म प ध म प ध}2 — the group's swar are shared out over the matras it claims,
       so the matra line falls inside the group instead of the whole thing sitting in one. */
    function splitInto(text, span) {
      if (span < 2) return null;
      var raw = String(text == null ? "" : text);
      var m = /^\s*\{([^}]*)\}\s*[x\u00d7]?\s*\d*\s*([\s\S]*)$/.exec(raw);
      var body = (m ? m[1] : raw).trim();
      var tail = m ? (m[2] || "").trim() : "";
      /* a leading count inside the braces: {2.re.ma.pa.dha} */
      var lead2 = /^(\d+)\s*[.\s]/.exec(body);
      if (lead2) body = body.replace(/^\d+\s*[.\s]/, "").trim();
      /* Written with spaces (re ma pa dha) the words are already separated. Written as one
         run (remapadhamapadha) they are not, so divide it by swar instead — after turning
         the English letters into Devanagari, which is what splits it into single notes. */
      var toks, glue;
      if (/[.\s]/.test(body)) {
        toks = body.split(/[.\s]+/).filter(Boolean); glue = " ";
      } else {
        var dev = devSwar(body);
        var found = dev.match(/[~^_+]*[\u0938\u0930\u0917\u092e\u092a\u0927\u0928][\u093e-\u094d\u0901\u0902\u093c]*/g);
        toks = (found && found.length > 1) ? found : [body];
        glue = "";
      }
      if (!toks.length) return null;
      var parts = [], base = Math.floor(toks.length / span), rem = toks.length % span, at = 0;
      for (var i = 0; i < span; i++) {
        var take = base + (i < rem ? 1 : 0);
        if (at >= toks.length) take = 0;
        parts.push(toks.slice(at, at + take).join(glue));
        at += take;
      }
      /* anything written after the group is not part of it — it gets its own matra */
      return { parts: parts, tail: tail };
    }
    function applySpans(rowEl, spans) {
      var skip = 0;
      for (var i = 0; i < spans.length; i++) {
        var cell = rowEl.children[i];
        if (!cell) continue;
        if (skip > 0) { cell.style.display = "none"; skip--; continue; }
        if (spans[i] > 1) { cell.style.flexGrow = String(spans[i]); skip = spans[i] - 1; }
      }
    }
    if (line.review) {
      var rv = document.createElement("div"); rv.className = "bnd-review";
      rv.innerHTML = '<b>\u26a0 Check this one</b> \u2014 ' +
        esc(line.reviewText || 'I read it from a small photo and could not be sure of every swar. Tap Edit notation above and correct any note.') +
        ' <b>\u270e Edit notation</b>';
      wrap.appendChild(rv);
    }
    /* the taal marks sit above the numbers: × sam, ० khali, the taali numbers for the rest */
    var tmarks = taalMarksFor(b.taal);
    if (tmarks && tFirst) {
      var mkLane = lane("bnd-marks");
      /* where each vibhag begins — the first is matra 1, then every vb[i] later */
      var starts = [], acc = 0;
      for (var z = 0; z < vb.length; z++) { starts.push(acc); acc += vb[z]; }
      for (var vi2 = 0; vi2 < starts.length; vi2++) {
        var at = starts[vi2];
        if (at < 0 || at >= N) continue;
        var m = tmarks[vi2] || "";
        mkLane.children[at].textContent = m;
        if (m) mkLane.children[at].setAttribute("data-mark",
          m === "\u00d7" ? "\u0938\u092e" : (m === "\u0966" ? "\u0916\u093e\u0932\u0940" : "\u0924\u093e\u0932\u0940"));
      }
      var mkRow = document.createElement("div"); mkRow.className = "bnd-row hd";
      mkRow.appendChild(laneGap()); mkRow.appendChild(mkLane); mkRow.appendChild(laneGap());
      wrap.appendChild(mkRow);
    }
    function laneLabel(txt) {
      var el = document.createElement("span");
      el.className = "bnd-lab"; el.textContent = txt;
      return el;
    }
    function laneGap() {
      var el = document.createElement("span");
      el.className = "bnd-lab bnd-lab-gap";
      return el;
    }
    if (tFirst) {
      var nums = lane("bnd-nums");
      for (var i = 0; i < N; i++) nums.children[i].textContent = String(i + 1);
      var numsRow = document.createElement("div"); numsRow.className = "bnd-row hd";
      numsRow.appendChild(laneGap()); numsRow.appendChild(nums); numsRow.appendChild(laneGap());
      wrap.appendChild(numsRow);
    }

    /* Both lanes are written in the same notation, so both are drawn the same way:
       a murki in the lyric lane draws its curve just as it does in the swar lane. */
    function fillCell(cell, text) {
      var mk = null;
      tokenize(text || "").forEach(function (tk) {
        if (tk.mkOpen || tk.mdOpen) { mk = document.createElement("span"); mk.className = (tk.mdOpen ? "md-grp" : "mk-grp"); mk.setAttribute("data-mark", tk.mdOpen ? "\u092e\u0940\u0902\u0921" : "\u092e\u0941\u0930\u094d\u0915\u0940"); cell.appendChild(mk); }
        if (tk.sep) {
          if ((tk.mkClose || tk.mdClose) && mk) mk = null;
          (mk || cell).appendChild(sepEl(tk.t));
        } else if (tk.t) {
          (mk || cell).appendChild(swarEl(tk, 0, 0));
          if ((tk.mkClose || tk.mdClose) && mk) mk = null;
        } else if ((tk.mkClose || tk.mdClose) && mk) { mk = null; }
      });
    }
    rows.forEach(function (r, ri) {
      var rw = document.createElement("div");
      var fresh = state.flashRow && state.flashRow.li === li && state.flashRow.ri === ri;
      rw.className = "bnd-row" + (fresh ? " bnd-fresh" : "");
      if (fresh) {
        state.flashRow = null;
        setTimeout(function () { try { rw.classList.remove("bnd-fresh"); } catch (e) {} }, 2000);
      }
      var sl = lane("bnd-swar"), ll = lane("bnd-lyr");
      /* each lane keeps its own record, so a count on one line never skips the other's note */
      var usedSw = [], usedLy = [];
      for (var i = 0; i < N; i++) {
        if (usedSw[i] && usedLy[i]) continue;
        var swTxt = r.swar[i], lyTxt = (r.lyric || [])[i];
        /* The count drives both lanes: write {sa re ga ma pa}2 on the swar line and the
           words spread over the same two matras, and the other way round. */
        /* which line actually carries the group? only that line draws the murki curve —
           the other line still shares out its words over the same matras, but silently */
        var swDecl = spanOf(swTxt, null) > 1, lyDecl = spanOf(null, lyTxt) > 1;
        var span = Math.max(swDecl ? spanOf(swTxt, null) : 1, lyDecl ? spanOf(null, lyTxt) : 1);
        var swR = splitInto(swTxt, span);
        var lyR = splitInto(lyTxt, span);
        if (swR || lyR) {
          for (var k = 0; k < span && i + k < N; k++) {
            /* A lane only takes a covered matra if it has something to put there, or the
               matra is empty. So a count on one line never eats the other line's notes. */
            var swPart = swR ? (swR.parts[k] || "") : null;
            var lyPart = lyR ? (lyR.parts[k] || "") : null;
            var swTake = swR && (swPart || !String(r.swar[i + k] || "").trim());
            var lyTake = lyR && (lyPart || !String((r.lyric || [])[i + k] || "").trim());
            var cls = " mk-span" + (k === 0 ? " mk-s" : "") + (k === span - 1 ? " mk-e" : "");
            if (swTake) {
              fillCell(sl.children[i + k], swPart); usedSw[i + k] = 1;
              if (swDecl) sl.children[i + k].className += cls;
            }
            if (lyTake) {
              fillCell(ll.children[i + k], lyPart); usedLy[i + k] = 1;
              if (lyDecl) ll.children[i + k].className += cls;
            }
          }
          /* a swar written after the group is its own matra, and stays out of the curve */
          var after = i + span;
          if (after < N) {
            if (swR && swR.tail && !usedSw[after] && !String(r.swar[after] || "").trim()) {
              fillCell(sl.children[after], swR.tail); usedSw[after] = 1;
            } else if (lyR && lyR.tail && !usedLy[after] && !String((r.lyric || [])[after] || "").trim()) {
              fillCell(ll.children[after], lyR.tail); usedLy[after] = 1;
            }
          }
          continue;
        }
        if (!usedSw[i]) fillCell(sl.children[i], swTxt);
        if (!usedLy[i]) fillCell(ll.children[i], lyTxt);   // a tana grid has no lyric lane
      }
      /* every row has the same shape — a label column, the lane, and a matching gap —
         so the marks, the matra numbers and both lanes all start at the same place */
      var lab = laneLabel(trow !== null ? String(trow + 1) + "." : "\u0938\u094d\u0935\u0930");
      if (trow !== null) {                   // this tana is a row, so it keeps its own controls
        var rpb = document.createElement("button");
        rpb.className = "ln-btn playb"; rpb.type = "button"; rpb.textContent = "\u25b6";
        rpb.title = "Play or pause this tana";
        rpb.onclick = function () { toggleLine(li); };
        state.lineBtns[li] = rpb;
        lab.appendChild(rpb);
        var rsn = document.createElement("button");
        rsn.className = "ln-btn sunb" + (favHas(l.id, state.raagSect, li) ? " on" : "");   // this tana
        rsn.type = "button"; rsn.textContent = "\u2600";
        rsn.title = "Add this tana to favourites";
        rsn.onclick = function () { favToggle(l.id, state.raagSect, li, state.mediaIdx); renderNotation(l); };
        lab.appendChild(rsn);
        if (state.canEdit) {
          var reb = document.createElement("button");
          reb.className = "ln-btn penb" + (state.editOpen[li] ? " on" : "");
          reb.type = "button"; reb.textContent = "\u270e";
          reb.title = state.editOpen[li] ? "Close the editor" : "Edit this tana";
          reb.onclick = function () { state.editOpen[li] = !state.editOpen[li]; renderNotation(l); };
          lab.appendChild(reb);
        }
      }
      if (editingNow() && tFirst) {
        /* in edit mode every row can be removed — this takes out that one row only */
        var del = document.createElement("button");
        del.type = "button"; del.className = "bnd-del"; del.textContent = "\u2715";
        del.title = "Remove this line";
        del.onclick = function () {
          removeGridRow(l, li, ri);
          applyAdds(); renderList(); renderStage(l);
        };
        lab.appendChild(del);
      }
      rw.appendChild(lab);
      rw.appendChild(sl);
      rw.appendChild(laneGap());
      var lw = document.createElement("div"); lw.className = "bnd-lyrwrap";
      lw.appendChild(laneLabel("\u092c\u094b\u0932"));
      lw.appendChild(ll);
      lw.appendChild(laneGap());
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
      if (trow === null || (r.arc || []).length) rw.appendChild(lw);   // no बोल line on a tana
      wrap.appendChild(rw);
    });
    return wrap;
  }

  /* ---------- the editors ---------- */
  // the swar pad. Typing Devanagari means switching keyboards, so the notes
  // are one tap each. Whatever box you last touched is where they land.
  var lastTa = null;
  function trackTa(ta) {
    ta.addEventListener("focus", function () { lastTa = ta; });
    if (!lastTa) lastTa = ta;
  }
  var SWAR_PAD = [
    ["\u0938\u093e", "\u0938\u093e"], ["\u0930\u0947", "\u0930\u0947"], ["\u0917", "\u0917"],
    ["\u092e", "\u092e"], ["\u092a", "\u092a"], ["\u0927", "\u0927"], ["\u0928\u0940", "\u0928\u0940"],   // nishad, written deergh
    ["^", "^"], ["_", "_"], ["|", "|"], ["\u2013", "-"]
  ];
  function swarPad() {
    var box = document.createElement("span"); box.className = "ed-tools ed-swarrow";
    SWAR_PAD.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "ed-sw" + (i === 7 || i === 9 ? " alt" : "");
      b.textContent = p[0];
      b.title = p[1] === "^" ? "तार सप्तक — a dot above the swar (upper octave)"
        : p[1] === "_" ? "मंद्र सप्तक — a dot below the swar (lower octave)"
        : p[1] === "|" ? "Bar" : p[1] === "-" ? "Rest" : "Insert " + p[0];
      b.onclick = function () { insertSwar(p[1]); };
      box.appendChild(b);
    });
    return box;
  }
  function insertSwar(txt) {
    var ta = lastTa;
    if (!ta) return;
    var v = ta.value, s0 = ta.selectionStart, e0 = ta.selectionEnd;
    if (s0 === null || s0 === undefined) s0 = e0 = v.length;
    var before = v.slice(0, s0), after = v.slice(e0);
    try { ta.focus({ preventScroll: true }); } catch (x) { ta.focus(); }
    // inside a kan ( ) or shruti [ ] the swar must not bring spaces with it,
    // or the token would break in two
    if (/[([{][^)\]}]*$/.test(before)) {
      var skip = /^[)\]}]/.test(after) ? 1 : 0;      // a closing bracket right here
      ta.value = before + txt + after;               // keep it, do not eat it
      var q = s0 + txt.length + skip;                // caret steps past it
      ta.setSelectionRange(q, q);
      return;
    }
    var lead = (before && !/\s$/.test(before)) ? " " : "";
    var ins = lead + txt + " ";
    ta.value = before + ins + after;
    var pos = s0 + ins.length;
    ta.setSelectionRange(pos, pos);
  }


  // how to write each mark, since there are no buttons for them any more
  /* The notation rules, shown rather than described: for every rule the box on the
     left is exactly what you type, and the box on the right is what comes out. */
  function swarRun(text) {                 // draw a fragment the same way the notation does
    var box = document.createElement("span");
    box.className = "ed-syn-out";
    var mk = null;
    tokenize(text).forEach(function (tk) {
      if (tk.mkOpen || tk.mdOpen) { mk = document.createElement("span"); mk.className = (tk.mdOpen ? "md-grp" : "mk-grp"); mk.setAttribute("data-mark", tk.mdOpen ? "\u092e\u0940\u0902\u0921" : "\u092e\u0941\u0930\u094d\u0915\u0940"); box.appendChild(mk); }
      if (tk.sep) { (mk || box).appendChild(sepEl(tk.t)); if ((tk.mkClose || tk.mdClose) && mk) mk = null; }
      else if (tk.t) { (mk || box).appendChild(swarEl(tk, 0, 0)); if ((tk.mkClose || tk.mdClose) && mk) mk = null; }
      else if ((tk.mkClose || tk.mdClose) && mk) { mk = null; }
    });
    return box;
  }
  var SYNTAX = [
    ["सा रे ग म प ध नी", "शुद्ध स्वर", "the seven plain notes", "Start here. English words work too, not just swar: mahaadev gives महादेव, alankar gives अलंकार."],
    ["~रे", "कोमल", "flat — a line under the swar", "For the soft form of a swar. रे, ग, ध and नी each have one."],
    ["+म", "तीव्र", "sharp — a line above the swar", "Only म has a tivra form. Use it wherever the raag asks."],
    ["^सा", "तार सप्तक", "higher octave — a dot above", "For a swar in the upper octave."],
    ["_सा", "मंद्र सप्तक", "lower octave — a dot below", "For a swar in the lower octave."],
    ["^^सा", "अति तार", "two octaves up — two dots above", "Two octaves up — uncommon, but written this way."],
    ["__सा", "अति मंद्र", "two octaves down — two dots below", "Two octaves down."],
    ["<सा रे>", "मींड", "a glide from one swar to the next", "When you slide between two swar instead of singing them separately."],
    ["सा(रे)", "कण", "a small grace note above", "Write it in brackets straight after the swar it leans on, so it sits above that swar."],
    ["{सा रे ग}", "मुर्की", "a quick turn — curve under the group", "For a quick turn through two or three swar inside one matra."],
    ["{सा रे}2", "समूह", "spread over several matras", "When a group will not fit in one matra. The number is how many; }3, }4 also work."],
    ["!सा", "खटका", "a sharp flick on one swar", "To accent a swar inside a fast phrase. Its name shows above the swar."],
    ["%सा", "ज़मज़मा", "a quick trembling cluster", "Busier than a murki — a quick shake on one swar. Name above the swar."],
    ["@सा", "आंदोलन", "a slow, wide swing on one swar", "For a calm, singing movement. Name above the swar."],
    ["&सा", "गमक", "a strong shake on a held swar", "Heavier and slower than आंदोलन. Name above the swar."],
    ["रे[2]", "श्रुति", "which of the 22 microtones", "Write it straight after a swar, so it shows on that swar. On its own there is nothing to sit on."],
    ["गरे", "एक मात्रा", "two swar on one matra — no space", "When two swar share one matra, write them with no space between."],
    ["|", "विभाग", "the bar that divides the beat", "The bar between vibhags."],
    ["-", "खाली मात्रा", "an empty matra — stays blank", "Leaves the matra empty; a lone - disappears."],
    ["--", "विश्राम", "a rest you want to see", "When you want a dash to show."],
    ["s", "अवग्रह", "a swallowed अ — ऽ", "For a swallowed अ. A lone s becomes ऽ."]
  ];
  var helpFirst = true;
  /* the table of marks, drawn with live examples — used by the Help panel */
  function syntaxTable() {
    var tbl = document.createElement("div"); tbl.className = "ed-syn";
    var hr = document.createElement("div"); hr.className = "ed-syn-row ed-syn-head";
    hr.innerHTML = "<span>you type</span><span>you get</span><span>what it is called</span><span>when to use it</span>";
    tbl.appendChild(hr);
    SYNTAX.forEach(function (r) {
      var row = document.createElement("div"); row.className = "ed-syn-row";
      var a = document.createElement("code"); a.className = "ed-syn-in"; a.textContent = r[0];
      var b = swarRun(r[0]);
      var c = document.createElement("span"); c.className = "ed-syn-say";
      var nm = document.createElement("b"); nm.className = "ed-syn-name"; nm.textContent = r[1];
      c.appendChild(nm);
      if (r[2]) row.title = r[2];          // the short gloss shows on hover
      var d = document.createElement("span"); d.className = "ed-syn-when";
      d.textContent = r[3] || "";
      row.appendChild(a); row.appendChild(b); row.appendChild(c); row.appendChild(d);
      tbl.appendChild(row);
    });
    return tbl;
  }
  /* Each guide is a folded line: you see what it is about, and open it only if you want it.
     That way the whole of Help fits on one screen. */
  /* The rules of each page, so a new raag can be built the same way without asking. */
  function helpPageRules() {
    return [
      ["आरोह · अवरोह · पकड़", "Three lines - Aaroh, Avroh, Pakad - each with its own four buttons and offset. Video plays in both modes; audio only while editing."],
      ["मुक्त आलाप", "Numbered lines. 'Mukt Aalap' is not repeated on every line - just the number and the swars. Each line has its own four buttons and offset. A page may use more than one recording."],
      ["लयकारी", "Two groups, स्थाई and अंतरा, both closed at first. Plain text lines, each with its own four buttons and offset."],
      ["तान", "ONE grid for the page. Each तान is a row, with its number, play button and sun on that row. No lyric lane."],
      ["बंदिश index", "A list only - the bandish names, renaming, and Add a bandish, all while editing. No player."],
      ["बंदिश page", "Heading reads 'Raag <raag>: <name>'. Two collapsibles, स्थाई and अंतरा, both closed. Each holds one row of four buttons with its offset, then the taal heading, then the grid."],
      ["On every page", "Video plays in both modes, audio only while editing. No Drive link or file name while viewing. Nothing plays in Favourites. Editing switches off after fifteen minutes."],
      ["Which recording a line uses", "Decided by the range in the recording's own name - 'मुक्त आलाप 1-10' holds 1 to 10, '... 11-14' holds 11 to 14. Times on the wrong recording are moved to the right one whenever the app opens."],
      ["दुर्गा is final", "दुर्गा's pages, notation and offsets are finished and are not changed. Only तान and लयकारी will be added, when Atharva's guru teaches them."]
    ];
  }
  function helpSection(title, body) {
    var d = document.createElement("details"); d.className = "hp-sec";
    var t = document.createElement("summary"); t.className = "hp-t"; t.textContent = title;
    var p = document.createElement("div"); p.className = "hp-b"; p.innerHTML = body;
    d.appendChild(t); d.appendChild(p);
    return d;
  }
  function renderHelp() {
    var box = $("#skHelpBox");
    if (!box) return;
    box.innerHTML = "";
    var hint = document.createElement("div"); hint.className = "hp-hint";
    hint.textContent = "Tap any line to open it.";
    box.appendChild(hint);
    box.appendChild(helpSection("Write in English letters",
      "Type in English and it comes out in Devanagari \u2014 <code>sa re ga ma pa dha ni</code> gives \u0938\u093e \u0930\u0947 \u0917 \u092e \u092a \u0927 \u0928\u0940, " +
      "and whole words work too: <code>mahaadev</code> gives \u092e\u0939\u093e\u0926\u0947\u0935. " +
      "A lone <code>s</code> gives the avagraha \u093d. Anything already in Devanagari is left as it is."));
    var marks = document.createElement("details"); marks.className = "hp-marks";
    var ms = document.createElement("summary"); ms.className = "hp-t hp-t-big";
    ms.textContent = "How to write each mark";
    marks.appendChild(ms);
    var mw = document.createElement("div"); mw.className = "hp-b";
    mw.appendChild(syntaxTable());
    marks.appendChild(mw);
    box.appendChild(marks);
    box.appendChild(helpSection("Finding your way",
      "The rail on the left lists everything; the tabs across the top pick a group. " +
      "Inside a raag each part \u2014 \u0906\u0930\u094b\u0939 \u00b7 \u0905\u0935\u0930\u094b\u0939 \u00b7 \u092a\u0915\u0921, \u092e\u0941\u0915\u094d\u0924 \u0906\u0932\u093e\u092a, \u0932\u092f\u0915\u093e\u0930\u0940, \u0924\u093e\u0928, \u092c\u0902\u0926\u093f\u0936 \u2014 is its own page. " +
      "Where a part has a heading with a \u25b8 beside it, tap to open it."));
    box.appendChild(helpSection("Favourites",
      "The \u2600 beside a line, or beside a heading in the rail, adds it to your Favourites tab. " +
      "Open that tab to see your list; tap an item and it opens at that line and starts playing."));
    box.appendChild(helpSection("Writing notation",
      "Press <b>Edit notation</b> on a page to open the editors. A sung line has one box for the swar; " +
      "a bandish grid has two boxes per row \u2014 the swar, and the song\u2019s letters."));
    box.appendChild(helpSection("Adding your own raag",
      "Turn on edit mode, then press <b>+ Add Raag</b> at the foot of the rail. " +
      "It makes a raag with all five parts, each blank and ready to fill. " +
      "On a raag you made, the \u270e beside the name renames it and the \u2715 removes it."));
    box.appendChild(helpSection("Playing a line",
      "\u25b6 beside a line plays just that line. In edit mode \u23f1 sets where the line starts. " +
      "If a line is timed against a different recording, a small chip says which one."));
    box.appendChild(helpSection("Vadya, Shruti and Swar",
      "<b>Vadya</b> is the instrument set. <b>Shruti</b> gives the 22 microtones. " +
      "<b>Swar</b> listens on the microphone and names the note you are singing, with how far off you are in cents " +
      "and a dot above or below for the octave."));
    box.appendChild(helpSection("Two small things",
      "A single <code>-</code> is an empty matra and stays blank; write <code>--</code> if you want a dash to show."));
    box.appendChild(helpSection("The pages of a raag",
      "Every raag carries the same pages: <b>\u0906\u0930\u094b\u0939</b>, <b>\u0905\u0935\u0930\u094b\u0939</b> and <b>\u092a\u0915\u0921</b>; <b>\u092e\u0941\u0915\u094d\u0924 \u0906\u0932\u093e\u092a</b>; <b>\u0932\u092f\u0915\u093e\u0930\u0940</b> " +
      "(Sthayi Laikari 1\u201310 and Antara Laikari 1\u201310); <b>\u0924\u093e\u0928</b> (Tana 1\u201315); and <b>\u092c\u0902\u0926\u093f\u0936</b> " +
      "(Bandish (Sthayi) and Bandish (Antara)). \u0926\u0941\u0930\u094d\u0917\u093e and \u092d\u0940\u092e\u092a\u0932\u0938\u0940 follow \u092d\u0948\u0930\u0935\u0940\u2019s pattern, and their " +
      "\u0932\u092f\u0915\u093e\u0930\u0940 and \u0924\u093e\u0928 pages stay empty until your guru teaches them."));
    helpPageRules().forEach(function (r) { box.appendChild(helpSection(r[0], r[1])); });
    box.appendChild(helpSection("Files on a page",
      "Every page can carry its own list of files. In <b>edit mode</b> press <b>+ Add a file</b> and paste a " +
      "Google Drive link, then tick <b>show</b> beside it if it should appear in view mode. <b>\u2715</b> removes that file. " +
      "Untick a link to keep it but hide it. The links are kept on this device."));
    box.appendChild(helpSection("Resuming this project in a new chat",
      "Open <b>Settings</b> (\u2699) and expand <b>Project prompt</b>, then press <b>Copy prompt</b>. " +
      "Paste that as the first message in a new chat and whoever picks it up has the whole picture \u2014 " +
      "the files, the notation, the preferences and the way it is deployed.<br><br>" +
      "Use it when something breaks and you want it fixed, or when you want to add to the app in a fresh chat. " +
      "Copy it fresh each time, since it is updated whenever the app changes."));
  }

  function markHelp(lead, first) {
    /* The full list of marks lives in Help now, so the editor carries the lead text
       and a one-line reminder pointing at it. */
    var d = document.createElement("div"); d.className = "ed-tip";
    if (lead) {
      var ld = document.createElement("div"); ld.className = "ed-tip-lead";
      ld.innerHTML = lead; d.appendChild(ld);
    }
    var short = document.createElement("div"); short.className = "ed-tip-line";
    short.innerHTML = "Swar separated by spaces. <b>No space</b> = one matra. " +
      "Marks: <code>~</code> komal \u00b7 <code>^</code> t\u0101r \u00b7 <code>_</code> mandra \u00b7 " +
      "<code>{ }</code> murki \u00b7 <code>( )</code> kan \u00b7 <code>[ ]</code> shruti. " +
      "The full list is in <b>Help</b>.";
    d.appendChild(short);
    return d;
  }


  function notationEditor(l, li) {
    var d = document.createElement("div"); d.className = "ed";
    var ta = document.createElement("textarea");
    ta.className = "ed-ta"; ta.rows = 2; ta.value = lineText(l, li);
    trackTa(ta);
    d.appendChild(ta);
    var bar = document.createElement("div"); bar.className = "ed-bar";
    var sv = document.createElement("button"); sv.className = "ed-btn"; sv.type = "button"; sv.textContent = "Save";
    sv.onclick = function () { flashSaved(l, sv, editKeyFor(l, li), { t: ta.value }); };
    var rs = document.createElement("button"); rs.className = "ed-btn ghost"; rs.type = "button"; rs.textContent = "Reset";
    rs.onclick = function () { setLineEdit(l.id, editKeyFor(l, li), null); renderNotation(l); };
    bar.appendChild(sv); bar.appendChild(rs);
    if (l.lines[li] && l.lines[li].added) {
      var rm = document.createElement("button");
      rm.className = "ed-btn ghost"; rm.type = "button"; rm.textContent = "Remove this line";
      rm.onclick = function () { removeAddedLine(l, li); };
      bar.appendChild(rm);
    }
    bar.appendChild(markHelp("", helpFirst ? (helpFirst = false, true) : false));
    d.appendChild(bar);
    return d;
  }
  /* Split a row into one entry per matra. A group in braces stays whole however many
     spaces it holds inside, so {re ma pa dha ma pa dha}2 is a single matra carrying a
     count — not seven matras with the braces torn apart. */
  function splitMatras(text) {
    var out = [], cur = "", depth = 0, t = String(text == null ? "" : text);
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      if (ch === "{" || ch === "(" || ch === "<") depth++;
      if (ch === "}" || ch === ")" || ch === ">") { if (depth > 0) depth--; }
      if (/\s/.test(ch) && depth === 0) {
        if (cur) { out.push(cur); cur = ""; }
        continue;
      }
      cur += ch;
    }
    if (cur) out.push(cur);
    /* a group that claims several matras fills that many slots — the extra ones stay blank */
    var res = [];
    out.forEach(function (tok) {
      res.push(tok);
      var lead3 = /^\s*\{\s*(\d+)\s*[.\s]/.exec(tok);
      var m = /\}\s*[x\u00d7]?\s*(\d+)/.exec(tok);
      var n = lead3 ? +lead3[1] : (m ? +m[1] : 1);
      n = Math.max(1, Math.min(8, n));
      for (var k = 1; k < n; k++) res.push("");
    });
    return res;
  }
  function bandishEditor(l, li, line) {
    var d = document.createElement("div"); d.className = "ed ed-bandish";
    var rows = bandishRows(l, li);
    var matras = (line.bandish && line.bandish.matras) || 16;

    /* One field for the swar line and one for the words line — the same two lanes the page
       shows. Each line of the bandish is one line inside the field, one swar per matra. */
    function laneField(label, cls, value, title) {
      var wrap = document.createElement("div"); wrap.className = "ed-brow";
      var lb = document.createElement("span"); lb.className = "ed-bn"; lb.textContent = label;
      var ta = document.createElement("textarea");
      ta.className = "ed-ta" + (cls ? " " + cls : "");
      /* Every row of the line is shown, one per line, so Save writes them all back and a
         new row is simply the last line. A one-line box silently edits row 1 instead. */
      ta.rows = Math.max(1, String(value).split("\n").length);
      ta.value = value; ta.title = title;
      trackTa(ta);
      setTimeout(function () { try { ta.scrollTop = ta.scrollHeight; } catch (e) {} }, 0);
      wrap.appendChild(lb); wrap.appendChild(ta);
      return { wrap: wrap, ta: ta };
    }
    var sw = laneField("\u0938\u094d\u0935\u0930", "",
      rows.map(function (r) { return r.swar.join(" "); }).join("\n"),
      "the swar line \u2014 one line of the bandish per row, one swar per matra");
    var ly = laneField("\u092c\u094b\u0932", "lyr",
      rows.map(function (r) { return (r.lyric || []).join(" "); }).join("\n"),
      "the words line \u2014 one line of the bandish per row");
    d.appendChild(sw.wrap); d.appendChild(ly.wrap);

    var bar = document.createElement("div"); bar.className = "ed-bar";
    var sv = document.createElement("button"); sv.className = "ed-btn"; sv.type = "button"; sv.textContent = "Save";
    sv.onclick = function () {
      var swL = sw.ta.value.split("\n"), lyL = ly.ta.value.split("\n");
      var n = Math.max(rows.length, swL.length, lyL.length), b = {};
      for (var i = 0; i < n; i++) {
        b[String(i)] = { swar: splitMatras(swL[i] || ""), lyric: splitMatras(lyL[i] || "") };
      }
      flashSaved(l, sv, li, { b: b, bd: { rows: n } });
    };
    var rs = document.createElement("button"); rs.className = "ed-btn ghost"; rs.type = "button"; rs.textContent = "Reset";
    rs.onclick = function () { setLineEdit(l.id, li, null); renderNotation(l); };
    bar.appendChild(sv); bar.appendChild(rs);
    bar.appendChild(markHelp("\u0938\u094d\u0935\u0930 = the swar line, \u092c\u094b\u0932 = the words. " +
      "Each line of the bandish is one line in the box, and each matra is one word \u2014 a lone - leaves it empty. " +
      "<b>Press Enter for another line.</b> \u2715 on a row takes that line out. " +
      "Write {2.re.ma.pa} to spread a group over any number of matras.",
      helpFirst ? (helpFirst = false, true) : false));
    d.appendChild(bar);
    return d;
  }

  function wireControls(l) {
    /* The Repeat line button and the Rate scrub bar are gone; a line still repeats
       as it always did. This now only refreshes the marks message. */
    updateMarksMsg();
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
      dst[tr][ln] = (cur && (entryAt(cur) > entryAt(e))) ? cur : e;
    }
    Object.keys(src || {}).forEach(function (key) {
      var v = src[key];
      if (!v || typeof v !== "object") return;
      // per-track shape: the value holds line entries (key = track)
      Object.keys(v).forEach(function (k2) {
        var e = v[k2];
        if (isLine(k2) && e && typeof e === "object" && typeof e.t === "number")
          put(key, k2, { t: e.t, at: e.at || 0 });
        else if (isLine(k2) && e && typeof e === "object" && e.takes && e.takes.length)
          put(key, k2, { takes: e.takes.map(function (x) { return { name: x.name || "", t: +x.t || 0, at: +x.at || 0 }; }),
                         cur: +e.cur || 0 });
      });
      // legacy shape: the value is itself one line's mark (key = line)
      if (typeof v.t === "number") put(String(v.track || 0), key, { t: v.t, at: v.at || 0 });
      else if (v.takes && v.takes.length) put(String(v.track || 0), key, { takes: v.takes, cur: +v.cur || 0 });
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
  /* A line's offset may be saved against a different recording of the same part: मुक्त आलाप
     1-10 is one file and 11-14 is another. Read it from whichever recording of this part has
     it, so both sets of offsets show on the one page. */
  /* Every recording that actually holds a time for this lesson, in a sensible order: the
     part's own recordings first, then any other track the marks mention. A device's cached
     marks can be keyed differently from the sheet after files are added or removed, so the
     lookup must not depend on the sheet's list alone - that is why a line timed on the second
     मुक्त आलाप file could not be found and the app said no time was set. */
  function tracksWithData(l) {
    var trs = [];
    partTracks(l).forEach(function (t) { if (trs.indexOf(String(t)) < 0) trs.push(String(t)); });
    var sh = (state.sharedMarks && state.sharedMarks[l.id]) || {};
    var lo = (state.segments && state.segments[l.id]) || {};
    Object.keys(sh).forEach(function (t) { if (trs.indexOf(String(t)) < 0) trs.push(String(t)); });
    Object.keys(lo).forEach(function (t) { if (trs.indexOf(String(t)) < 0) trs.push(String(t)); });
    return trs.filter(function (t) {
      var m = l.media && l.media[+t];
      return m && m.kind !== "video";
    });
  }
  function markCountOn(lid, tr) {          // how many lines carry a time on this recording
    var sh = state.sharedMarks && state.sharedMarks[lid] && state.sharedMarks[lid][String(tr)];
    var lo = state.segments && state.segments[lid] && state.segments[lid][String(tr)];
    var n = {};
    Object.keys(sh || {}).forEach(function (k) { n[k] = 1; });
    Object.keys(lo || {}).forEach(function (k) { n[k] = 1; });
    return Object.keys(n).length;
  }
  function partTracks(l) {
    var part = state.raagSect ? raagSectParts(l, state.raagSect) : null;
    return (part && part.media.length) ? part.media.map(String) : [trackKey()];
  }
  function entryOn(l, li, tr) {
    var sh = state.sharedMarks && state.sharedMarks[l.id] && state.sharedMarks[l.id][tr];
    var lo = state.segments && state.segments[l.id] && state.segments[l.id][tr];
    var a = sh && sh[li], b = lo && lo[li];
    if (!a) return b || null;
    if (!b) return a;
    return (entryAt(b) >= entryAt(a)) ? b : a;
  }
  /* Which recording does a line belong to?
     A recording's name usually states the items it holds - "मुक्त आलाप 1-10" holds 1 to 10,
     "... 11-14" holds 11 to 14. When several recordings carry a time for the same line, the
     one whose stated range contains that line is the right one. */
  function mnRange(name) {
    var m = String(name || "").match(/(\d+)\s*[-\u2013]\s*(\d+)/);
    return m ? { lo: +m[1], hi: +m[2] } : null;
  }
  function mnLineNo(label) {
    var m = String(label || "").match(/(\d+)\s*$/);
    return m ? +m[1] : null;
  }
  function trackForLine(l, li) {
    var trs = tracksWithData(l), ln = (l.lines || [])[li] || {}, num = mnLineNo(ln.label);
    var cands = [];
    trs.forEach(function (t) {
      var e = entryOn(l, li, t), tk = takesOf(e);
      if (!(tk && tk.length)) return;
      cands.push({ t: +t, at: tk[+e.cur || 0].t, rng: mnRange((l.media[+t] || {}).name) });
    });
    if (!cands.length) return null;
    if (num != null) {
      for (var i = 0; i < cands.length; i++) {
        var r = cands[i].rng;
        if (r && num >= r.lo && num <= r.hi) return cands[i];
      }
    }
    return cands[0];
  }
  function offsetForLine(l, li) {
    var pick = trackForLine(l, li);
    if (!pick) return null;
    var tr = String(pick.t), t = pick.at, lines = l.lines || [], end = null;
    for (var j = li + 1; j < lines.length; j++) {
      var e2 = entryOn(l, j, tr), tk2 = takesOf(e2);
      if (tk2 && tk2.length && tk2[+e2.cur || 0].t > t + 0.05) { end = tk2[+e2.cur || 0].t; break; }
    }
    return { t: t, end: end, track: pick.t };
  }
  function trackKey() { return String(state.mediaIdx); }
  /* ---------- takes ----------
     One line can carry more than one time when the same thing is sung twice on the
     same recording — in Mukt Aalap the same alankar appears komal and then shuddha.
     A single time stays exactly the old shape {t, at}; two or more become
     {takes: [{name, t, at}], cur}. Nothing already saved has to move. */
  function entryAt(e) {
    if (!e) return 0;
    if (typeof e.at === "number") return e.at;
    var mx = 0; (e.takes || []).forEach(function (x) { if ((+x.at || 0) > mx) mx = +x.at || 0; });
    return mx;
  }
  function takesOf(e) {
    if (!e) return null;
    if (e.takes && e.takes.length) return e.takes;
    if (typeof e.t === "number") return [{ name: "", t: e.t, at: e.at || 0 }];
    return null;
  }
  function isMukt(label) { return /mukt aalap|\u092e\u0941\u0915\u094d\u0924 \u0906\u0932\u093e\u092a/i.test(label || ""); }
  function defaultTakeName(li, n) {
    var l = lesson(state.lessonId);
    var lab = l && l.lines[li] ? l.lines[li].label : "";
    if (isMukt(lab)) return n === 0 ? "Komal" : (n === 1 ? "Shuddha" : "Take " + (n + 1));
    return "Take " + (n + 1);
  }
  function curTake(e) {                       // the take a line is showing
    var ts = takesOf(e); if (!ts) return null;
    return ts[Math.min(Math.max(+e.cur || 0, 0), ts.length - 1)];
  }
  function segOfEntry(e) {                    // {t, at} for the take on screen
    var ts = takesOf(e); if (!ts) return null;
    var c = ts[Math.min(Math.max(+e.cur || 0, 0), ts.length - 1)];
    return { t: c.t, at: c.at || 0, of: e ? e.of : "" };
  }
  function entryOf(lid, li) {                 // newest entry for a line, on THIS recording
    var tr = trackKey();
    var sh = state.sharedMarks && state.sharedMarks[lid] && state.sharedMarks[lid][tr];
    var loc = state.segments && state.segments[lid] && state.segments[lid][tr];
    var a = sh && sh[li], b = loc && loc[li];
    if (!a) return b || null;
    if (!b) return a;
    return (entryAt(b) >= entryAt(a)) ? b : a;   // compare takes by their newest time
  }
  function writeTake(store, li, t) {          // put a time into the take on screen
    var e = store[li], ts = takesOf(e);
    var at = Date.now();
    if (!ts) { store[li] = { takes: [{ name: defaultTakeName(li, 0), t: t, at: at }], cur: 0 }; return; }
    var i = Math.min(Math.max(+e.cur || 0, 0), ts.length - 1);
    if (e.takes && e.takes.length) { e.takes[i].t = t; e.takes[i].at = at; }
    else store[li] = { takes: [{ name: defaultTakeName(li, 0), t: t, at: at }], cur: 0 };
  }
  function addTake(store, li) {               // hang a second time on the same line
    var e = store[li], ts = takesOf(e);
    if (!ts) ts = [{ name: defaultTakeName(li, 0), t: 0, at: 0 }];
    ts = ts.slice();
    ts.push({ name: defaultTakeName(li, ts.length), t: 0, at: 0 });
    store[li] = { takes: ts, cur: ts.length - 1 };
    return ts.length - 1;
  }
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
    Object.keys(loc).forEach(function (i) {
      var a = base[i], b = loc[i];
      base[i] = !a ? b : (!b ? a : ((entryAt(b) >= entryAt(a)) ? b : a));
    });
    var out = {};
    Object.keys(base).forEach(function (i) { var s2 = segOfEntry(base[i]); if (s2) out[i] = s2; });
    return out;
  }
  function saveSegs() { try { localStorage.setItem("sk_seg_" + state.lessonId, JSON.stringify(state.segments[state.lessonId] || {})); } catch (e) {} }
  /* ---------- which recording does a line belong to ----------
     Every recording has its own timeline, so a line's time only means anything
     against the recording it was measured on. A line may be timed on one file
     while you are listening to another; markAnywhere finds it either way, and
     opening the line takes the player to the right recording. */
  function mediaNameOf(l, i) { var m = l && l.media && l.media[i]; return m ? (m.name || "") : ""; }
  function shortMedia(n) {
    n = String(n || "").replace(/^\s*(Raag|\u0930\u093e\u0917)\s*/i, "");
    n = n.replace(/\.(mp3|mp4|mov|jpeg|jpg|png)$/i, "");
    n = n.replace(/^[\u0966-\u096f0-9\-\s]{6,}?\s*[-\u2013]\s*/, "");   // drop a leading date
    n = n.replace(/\s+[-\u2013]\s+/g, " \u00b7 ");   // only spaced dashes, so 9-10 stays whole
    return n.length > 46 ? n.slice(0, 44) + "\u2026" : n;
  }
  function markAnywhere(lid, li) {          // newest mark for this line, on ANY recording
    var sh = (state.sharedMarks && state.sharedMarks[lid]) || {};
    var loc = (state.segments && state.segments[lid]) || {};
    var best = null;
    Object.keys(sh).concat(Object.keys(loc)).forEach(function (tr) {
      if (!isLine(String(li))) return;
      var a = sh[tr] && sh[tr][li], b = loc[tr] && loc[tr][li];
      var e = newer(a, b);
      var sg = segOfEntry(e);
      if (!sg) return;
      if (!best || (sg.at > best.at)) best = { track: +tr, t: sg.t, at: sg.at, of: e.of || "" };
    });
    return best;
  }
  function markInOtherFile(l, li) {         // a line timed on a different recording
    /* ONE answer, the same one the offset display uses: the recording whose name says it
       holds this line. The old rule - "if the recording you are on has any time for this
       line, use it" - let a recording carrying stale times from an earlier set of files win,
       so मुक्त आलाप 11 played from the 1-10 file while the offset beside it was correct. */
    var pick = trackForLine(l, li);
    if (!pick) return null;
    if (String(pick.t) === String(state.mediaIdx)) return null;   // already on the right one
    return { track: pick.t };
  }
  function switchMedia(l, i, then) {       // move the player to another recording
    if (i == null || i < 0 || !l.media || !l.media[i]) return;
    var keep = state.raagSect;             // changing recording must not move you to another part
    state.mediaIdx = i;
    renderList();
    state.raagSect = keep;
    renderStage(l);
    state.raagSect = keep;
    if (then) setTimeout(then, 260);       // let the audio element come up first
  }
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
    var _l = lesson(state.lessonId);
    var _store = localSegs();
    writeTake(_store, li, +state.audio.currentTime.toFixed(2));
    _store[li].of = mediaNameOf(_l, state.mediaIdx);
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
  /* five seconds either way on whatever is playing */
  function skipLine(n) {
    var live = state.video || state.audio;
    if (!live) return;
    var d = live.duration;
    var to = live.currentTime + n;
    live.currentTime = Math.max(0, Math.min(d || to, to));
  }

  function syncLineBtns() {
    var au = state.audio, vd = state.video;
    Object.keys(state.lineBtns).forEach(function (k) {
      var b = state.lineBtns[k]; if (!b) return;
      var live = vd || au;
      var playing = (state.playingLine === +k && live && !live.paused);
      var held = (state.playingLine === +k && live && live.paused && !live.ended);
      b.textContent = playing ? "\u275a\u275a" : (held ? "\u21bb" : "▶");
      b.classList.toggle("on", !!playing);
    });
  }
  function toggleLine(li) {
    var vd = state.video, l0 = lesson(state.lessonId);
    if (vd && l0 && (l0.media[state.mediaIdx] || {}).kind === "video") {
      if (state.playingLine === li) { if (vd.paused) vd.play().catch(function () {}); else vd.pause(); }
      else videoLine(li);
      syncLineBtns();
      return;
    }
    var au = state.audio;
    if (state.playingLine === li && au) {          // same line: pause, or resume
      if (au.paused) {
        /* A re-render (the background sync does one) rebuilds the audio element, which
           drops it back to 0:00. Resuming naively would then play the top of the file
           while the timestamp on screen still reads correctly. Put the playhead back on
           the line first unless we are genuinely paused inside it. */
        var l1 = lesson(state.lessonId);
        var s2 = segsOf()[li] || (l1 && offsetForLine(l1, li));
        var stop = l1 ? endForLine(l1, li) : 1e9;
        if (s2 && (au.currentTime < s2.t - 0.25 || au.currentTime >= stop - 0.05)) seekTo(au, s2.t);
        /* re-arm: a finished segment clears segPlay, so without this the resumed line
           ran on past its end instead of stopping */
        state.segPlay = { line: li, start: s2.t, end: stop, loop: state.segLoop };
        ensureLoop();
        au.play().catch(function () {});
      } else au.pause();
      syncLineBtns();
      return;
    }
    playLine(li);
  }
  function noTimeYet(li, why) {
    /* Never start a recording from the top to stand in for a missing time: the file
       holds several items, so you would hear the wrong one and think the times had
       been shuffled. Say what is wrong instead. */
    state.playingLine = -1;
    syncLineBtns();
    var r = state.lineRows[li];
    if (r) {
      r.classList.add("ln-flash");
      setTimeout(function () { r.classList.remove("ln-flash"); }, 1900);
      var old = r.querySelector(".ln-note"); if (old) old.remove();
      var n = document.createElement("span");
      n.className = "ln-note"; n.textContent = why;
      var ctl = r.querySelector(".ln-ctl");
      if (ctl) ctl.appendChild(n); else r.appendChild(n);
      setTimeout(function () { if (n.parentNode) n.remove(); }, 4200);
    }
    mkMsg(why);
  }
  function videoLine(li) {                   // play this line on the video that is on screen
    var vd = state.video; if (!vd) return false;
    var s2 = segsOf()[li], e2 = lineEnds();
    var t = (s2 && typeof s2.t === "number") ? s2.t : 0;
    try { vd.currentTime = t; } catch (e) {}
    state.segPlay = { line: li, start: t, end: (e2[li] != null ? e2[li] : 1e9), loop: state.segLoop };
    vd.play().catch(function () {});
    highlightLine(li);
    syncLineBtns();
    return true;
  }
  function playLine(li) {
    var l = lesson(state.lessonId); if (!l) return;
    /* A line timed on another recording is followed there first, whatever this page happens
       to be showing. The bandish page opens on its video, and a video cannot be timed line by
       line - but स्थाई and अंतरा are timed on the audio, so their buttons must reach it. */
    var elsewhere = markInOtherFile(l, li);
    if (elsewhere) {
      state.playingLine = li;
      switchMedia(l, elsewhere.track, function () { state.playingLine = li; startSeg(li); });
      return;
    }
    if ((l.media[state.mediaIdx] || {}).kind === "video") {
      if (state.video) { videoLine(li); return; }        // a video we can drive
      noTimeYet(li, "this recording plays in the player above \u2014 use its own play button");
      return;
    }
    var s = segsOf()[li];
    if (!s) {                              // nothing was ever timed for this line
      noTimeYet(li, "no time set for this line \u2014 set it in edit mode");
      return;
    }
    state.playingLine = li;
    startSeg(li);                          // 0:00 is a real time, not a missing one
  }
  /* The end of a line, read from the recording that line is timed on - the SAME answer the
     row displays. Playback used lineEnds(), which reads only the recording currently loaded,
     so a line timed on another recording stopped early on screen but played on. */
  function endForLine(l, li) {
    var o = offsetForLine(l, li);
    if (o && o.end != null) return o.end;
    var e = lineEnds()[li];
    return (e != null) ? e : 1e9;
  }
  function startSeg(li) {
    var l = lesson(state.lessonId);
    var au = state.audio, s = segsOf()[li];
    var off = l ? offsetForLine(l, li) : null;
    if (!s && off) s = { t: off.t };
    if (!au || !s) return;
    var stop = l ? endForLine(l, li) : 1e9;
    seekTo(au, s.t);
    state.segPlay = { line: li, start: s.t, end: stop, loop: state.segLoop };
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
      if (r && r.ok) { try { localStorage.setItem("sk_marks_pushed", String(Date.now())); } catch (e) {} noteSavedAt(Date.now()); if (cb) cb("ok"); }
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
      noteSavedAt(newestAt(j));
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
  function closeSettings() {
    settingsOK = false;                    // closing forgets the PIN as well
    var m = $("#skSettings"); if (m) m.classList.remove("on");
  }
  /* ---------- the settings PIN ----------
     Settings holds the switch that allows editing, so it is locked. The PIN is fixed, as asked,
     and the door stays open for the rest of the session once it has been entered. */
  var SETTINGS_PIN = "1981";
  var settingsOK = false;

  function openSettings() {
    var box = $("#skSettingsBox"); if (!box) return;
    /* asked every single time, even if the PIN was entered a moment ago */
    settingsOK = false;
    showPinGate(box);
  }

  function showPinGate(box) {
    box.innerHTML =
      '<div class="set-h">Settings</div>' +
      '<div class="set-lab">Enter the PIN to open settings.</div>' +
      '<input id="setPin" class="set-input" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN">' +
      '<div class="set-actions">' +
        '<button class="sk-btn" id="setPinGo">Open</button>' +
        '<button class="sk-btn" id="setPinClose">Close</button>' +
      '</div>' +
      '<div class="set-msg" id="setPinMsg"></div>' +
      '<p class="set-note dim">Build ' + APP_VER + '</p>';
    var m = $("#skSettings"); if (m) m.classList.add("on");
    var f = $("#setPin");
    function go() {
      if ((f.value || "").trim() === SETTINGS_PIN) {
        settingsOK = true;
        buildSettings();
        return;
      }
      $("#setPinMsg").textContent = "That is not the right PIN.";
      f.value = "";
      try { f.focus(); } catch (e) {}
    }
    $("#setPinGo").onclick = go;
    f.onkeydown = function (e) { if (e.key === "Enter") go(); };
    $("#setPinClose").onclick = closeSettings;
    setTimeout(function () { try { f.focus(); } catch (e) {} }, 60);
  }

  function buildSettings() {
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
    /* the editing switch — the only way to reveal the notation editors */
    (function () {
      var d = document.createElement("div"); d.className = "set-editrow";
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.className = "set-editcb"; cb.id = "setCanEdit"; cb.checked = !!state.canEdit;
      var lab = document.createElement("label");
      lab.className = "set-editlab"; lab.htmlFor = "setCanEdit";
      lab.textContent = "Allow editing \u2014 show the \u270e Edit notation button on each page. " +
        "Leave this off and nothing on a page can be changed by accident.";
      cb.onchange = function () {
        state.canEdit = cb.checked;
        if (!state.canEdit) state.editOpen = {};      // pens away, every editor closed
        try { localStorage.setItem("sk_can_edit", state.canEdit ? "1" : "0"); } catch (e) {}
        var l = state.lessonId && lesson(state.lessonId);
        if (l) renderStage(l);
      };
      d.appendChild(cb); d.appendChild(lab);
      box.appendChild(d);
    })();
    appendHistoryPanel(box);
    appendProjectPrompt(box);
    updateMarksMsg();
  }

  /* ---------- the project prompt ----------
     A full description of the app, kept in assets/prompt.js, so that if anything breaks or
     work moves to a new chat it can simply be copied and pasted to pick up where we left off. */
  /* The revert history, in Settings. Newest first, each line naming what it was. */
  function appendHistoryPanel(box) {
    var d = document.createElement("details");
    d.className = "set-prompt";
    var sm = document.createElement("summary");
    sm.className = "set-prompt-s";
    sm.textContent = "History \u2014 put back anything, up to 100 steps";
    d.appendChild(sm);
    var b = document.createElement("div");
    b.className = "set-prompt-b";
    var note = document.createElement("div");
    note.className = "set-lab";
    note.textContent = "Every delete and edit is listed here, newest first. Press Revert to put one back \u2014 " +
      "anything after it is undone too, and the app tells you what it restored.";
    b.appendChild(note);
    var list = document.createElement("div");
    list.id = "histList"; list.className = "hist-list";
    b.appendChild(list);
    d.appendChild(b);
    box.appendChild(d);
    renderHistoryList();
  }
  function appendProjectPrompt(box) {
    var txt = window.RIYAZ_PROMPT || "";
    if (!txt) return;
    var d = document.createElement("details"); d.className = "set-prompt";
    var s = document.createElement("summary"); s.className = "set-prompt-s";
    s.textContent = "Project prompt \u2014 copy this to start a new chat";
    d.appendChild(s);
    var body = document.createElement("div"); body.className = "set-prompt-b";
    var p = document.createElement("div"); p.className = "set-lab";
    p.textContent = "If something breaks, or you want to carry on in a fresh chat, copy this and paste it " +
      "as your first message. It describes the whole app \u2014 the files, the data, the notation, and how it is deployed.";
    body.appendChild(p);
    var ta = document.createElement("textarea");
    ta.className = "set-prompt-ta"; ta.readOnly = true; ta.spellcheck = false;
    ta.value = txt;
    body.appendChild(ta);
    var cp = document.createElement("button");
    cp.className = "sk-btn"; cp.type = "button"; cp.textContent = "Copy prompt";
    cp.onclick = function () {
      var done = function () { cp.textContent = "Copied"; setTimeout(function () { cp.textContent = "Copy prompt"; }, 2500); };
      try {
        ta.select(); ta.setSelectionRange(0, txt.length);
        if (document.execCommand("copy")) { done(); return; }
      } catch (e) {}
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { cp.textContent = "Select the text and copy"; });
      } else { cp.textContent = "Select the text and copy"; }
    };
    body.appendChild(cp);
    d.appendChild(body);
    box.appendChild(d);
  }

  /* Setting currentTime on an <audio> that has not loaded yet is silently dropped,
     and the file then plays from 0:00 — which looks exactly like "the wrong line
     played". Remember the seek and apply it the moment the media is ready. */
  function seekTo(au, t) {
    if (!au) return;
    t = +t || 0;
    if (au.readyState >= 1) { try { au.currentTime = t; } catch (e) {} au._pendingSeek = null; return; }
    au._pendingSeek = t;
  }
  function ensureLoop() { if (!state.raf) loop(); }
  function loop() {
    state.raf = requestAnimationFrame(loop);
    var au = state.video || state.audio; if (!au) return;
    var t = au.currentTime;
    // per-line segment: loop it, or stop at its end
    if (state.segPlay) {
      var sp = state.segPlay;
      if (au.readyState >= 1 && sp.start > 0.5 && t < sp.start - 0.75 && !sp._fixed) {
        sp._fixed = true;                  // a dropped seek left us at the top; go back
        try { au.currentTime = sp.start; } catch (e) {}
        return;
      }
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
  manchLoad();
  try { tidyMarks(); } catch (e) {}
  favLoad();
  loadAllLocal();
  loadSharedCache();
  loadEdits();
  mergeUserRaags();
  applyAdds();
  renderSyncNote();
  renderTabs();
  pullMarks();
  favPull(); manchPull();;
  pullEdits();
  setInterval(autoSaveTick, 60000);    // background save + push every minute
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { saveAllLocal(); saveEdits(); flushPush(); flushEdits(); favPush(); }
    else { pullMarks(); favPull(); pullEdits(); }
  });
  window.addEventListener("pagehide", function () { saveAllLocal(); saveEdits(); flushPush(); flushEdits(); });
  window.addEventListener("online", function () { flushPush(); });
  var railBtn = $("#btnRail"); if (railBtn) railBtn.onclick = toggleRail;
  try { editWatchStart(); } catch (e) {}
  try { guardCheck(); } catch (e) {}
  /* On a phone the rail is a drawer over the page, so it starts CLOSED - otherwise it would
     cover the notation on the very first load. On a tablet or laptop it starts open, as before.
     Only a first impression: the pull tab opens it, and the choice is not overridden later. */
  try { if (window.matchMedia("(max-width: 640px)").matches) setRail(true); } catch (e) {}
  var gear = $("#btnSettings"); if (gear) gear.onclick = function () {
    var hp = $("#skHelp"); if (hp) hp.classList.remove("on"); var hpb = $("#btnHelp"); if (hpb) hpb.classList.remove("on");
    var b = $("#skSettings");
    if (b && b.classList.contains("on")) closeSettings(); else openSettings();
  };
  if (location.hash === "#settings") openSettings();
  /* Vadya panel — mounted once; hiding it never stops the instruments */
  var vbox = $("#skVadyaBox");
  if (vbox && window.RIYAZ && window.RIYAZ.vadya) window.RIYAZ.vadya.mount(vbox);
  var sbox = $("#skShrutiBox");
  if (sbox) mountShruti(sbox);
  var sb2 = $("#btnShruti");
  if (sb2) sb2.onclick = function () {
    var p = $("#skShruti"); if (!p) return;
    var on = p.classList.toggle("on");
    sb2.classList.toggle("on", on);
    if (on) { var o1 = $("#skVadya"); if (o1) o1.classList.remove("on"); var v1 = $("#btnVadya"); if (v1) v1.classList.remove("on"); }
    var swp0 = $("#skSwar"); if (on && swp0 && swp0.classList.contains("on")) { swp0.classList.remove("on"); var swb0 = $("#btnSwar"); if (swb0) swb0.classList.remove("on"); var sbox0 = $("#skSwarBox"); if (sbox0 && sbox0._swarStop) sbox0._swarStop(); }
  };
  /* Swar — listens on the microphone and names the note being sung */
  var swbox = $("#skSwarBox");
  if (swbox && window.RIYAZ && window.RIYAZ.swar) window.RIYAZ.swar.mount(swbox);
  var swb = $("#btnSwar");
  function stopSwar() {
    var p = $("#skSwar"); if (p) p.classList.remove("on");
    var b = $("#btnSwar"); if (b) b.classList.remove("on");
    var x = $("#skSwarBox"); if (x && x._swarStop) x._swarStop();
  }
  if (swb) swb.onclick = function () {
    var p = $("#skSwar"); if (!p) return;
    var on = p.classList.toggle("on");
    swb.classList.toggle("on", on);
    if (on) {
      var o3 = $("#skVadya"); if (o3) o3.classList.remove("on"); var v3 = $("#btnVadya"); if (v3) v3.classList.remove("on");
      var o4 = $("#skShruti"); if (o4) o4.classList.remove("on"); var s4 = $("#btnShruti"); if (s4) s4.classList.remove("on");
      var cl = $("#skSettings"); if (cl) cl.classList.remove("on");
    } else stopSwar();
  };
  /* ---------- the mark labels ----------
     Hover a mark and its name appears in a small box just above the pointer. */
  function markTip() {
    var tip = document.createElement("div");
    tip.className = "mk-tip";
    document.body.appendChild(tip);
    function hit(e) {
      var n = e.target;
      while (n && n !== document.body) {
        if (n.getAttribute && n.getAttribute("data-mark")) return n;
        n = n.parentNode;
      }
      return null;
    }
    function place(e) {
      var w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.min(Math.max(6, e.clientX - w / 2), window.innerWidth - w - 6) + "px";
      tip.style.top = Math.max(6, e.clientY - h - 13) + "px";
    }
    document.addEventListener("mouseover", function (e) {
      var el = hit(e); if (!el) return;
      tip.textContent = el.getAttribute("data-mark");
      tip.classList.add("on"); place(e);
    }, true);
    document.addEventListener("mousemove", function (e) {
      if (tip.classList.contains("on")) place(e);
    }, true);
    document.addEventListener("mouseout", function (e) {
      if (hit(e)) tip.classList.remove("on");
    }, true);
    window.addEventListener("scroll", function () { tip.classList.remove("on"); }, true);
  }
  markTip();

  /* Help — the marks table and how the app works */
  var hbox = $("#skHelpBox");
  if (hbox) renderHelp();
  var hb = $("#btnHelp");
  if (hb) hb.onclick = function () {
    var p = $("#skHelp"); if (!p) return;
    var on = p.classList.toggle("on");
    hb.classList.toggle("on", on);
    if (on) {
      [["skVadya","btnVadya"],["skShruti","btnShruti"],["skSwar","btnSwar"],["skSettings","btnSettings"]].forEach(function (x) {
        var b1 = $("#" + x[0]); if (b1) b1.classList.remove("on");
        var b2 = $("#" + x[1]); if (b2) b2.classList.remove("on");
      });
      var sx = $("#skSwarBox"); if (sx && sx._swarStop) sx._swarStop();
      renderHelp();
    }
  };
  var vb = $("#btnVadya");
  function toggleVadya() {
    var p = $("#skVadya"); if (!p) return;
    var on = p.classList.toggle("on");
    if (vb) vb.classList.toggle("on", on);
    if (on) { var close = $("#skSettings"); if (close) close.classList.remove("on"); }
    var o2 = $("#skShruti"); if (on && o2) o2.classList.remove("on");
    var s2b = $("#btnShruti"); if (on && s2b) s2b.classList.remove("on");
    if (on) { var swp = $("#skSwar"); if (swp && swp.classList.contains("on")) { swp.classList.remove("on"); var swb2 = $("#btnSwar"); if (swb2) swb2.classList.remove("on"); var sbox2 = $("#skSwarBox"); if (sbox2 && sbox2._swarStop) sbox2._swarStop(); } }
  }
  if (vb) vb.onclick = toggleVadya;
  if (/[?&]vadya=1/.test(location.search)) toggleVadya();
  if (GROUPS.indexOf(state.group) < 0) { state.group = GROUPS[0]; }
  showSavedAt();
  showVersion();
  renderList();
  if (state.group === "मंच") { renderList(); renderManchStage(); }
  if (state.group === "Favourites") { renderList(); renderFavStage(); }
  else {
    var start = state.lessonId && lesson(state.lessonId) ? state.lessonId : (lessonsOf(state.group)[0] || {}).id;
    var lastSect = null;
    try { lastSect = localStorage.getItem("sk_sect") || null; } catch (e) {}
    if (start) open(start, null, lastSect);   // open() drops it if this raag has no such part
  }
})();
