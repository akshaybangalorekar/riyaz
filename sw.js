  /* The app's own files: try the NETWORK first, so a new version arrives the moment there is
     a connection - no waiting an extra open for it. When there is no connection the request
     fails at once and the stored copy is used instead, which is what makes offline work. */
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match("index.html");
      });
    })
  );
/* Offline practice.
 *
 * The app itself is four small files - about 350 KB in all - and the swars live inside
 * data.js, so nothing about the notation needs the internet. This stores those files on the
 * device the first time the app is opened, and serves them from there afterwards. Open the
 * app on a train with no signal and the swars are all still there.
 *
 * What this deliberately does NOT store: the recordings and videos, which come from Google
 * Drive and are far too large to keep, and the Google font, which is only a typeface - if it
 * is missing the page simply uses the device's own font.
 *
 * Anything belonging to another site is left completely alone, so the recordings and videos
 * still stream normally whenever there is a connection.
 */

var CACHE = "riyaz-shell-v2";

var FILES = [
  "./",
  "index.html",
  "manifest.json",
  "icon.png",
  "apple-touch-icon.png",
  "assets/app.js",
  "assets/data.js",
  "assets/style.css",
  "assets/prompt.js",
  "assets/tools.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* addAll fails as a whole if any one file is missing, so add them one by one */
      return Promise.all(FILES.map(function (f) {
        return c.add(new Request(f, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* another site: Google Drive for the recordings, Google Fonts for the typeface.
     Leave them to the network - never serve a stale copy of a recording. */
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      /* serve what we have straight away, and quietly refresh it for next time */
      var fromNet = fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        /* no connection: fall back to the stored copy, or to the app itself */
        return hit || caches.match("index.html");
      });
      return hit || fromNet;
    })
  );
});
