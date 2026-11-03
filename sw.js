const CACHE = "english-seekho-v1";
const PAGE = new URL("./", self.location).href;
const CORE = [PAGE, "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);

  if(url.origin === location.origin){
    e.respondWith(networkFirst(e));
  }else if(url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){
    e.respondWith(cacheFirst(req));
  }
});

async function networkFirst(e){
  const req = e.request;
  const isPage = req.mode === "navigate";
  const key = isPage ? PAGE : req;
  const cache = await caches.open(CACHE);
  try{
    const res = isPage ? await fetch(req.url, {cache: "no-cache"}) : await fetch(req);
    if(res.ok) e.waitUntil(cache.put(key, res.clone()));
    return res;
  }catch(err){
    const saved = await cache.match(key);
    if(saved) return saved;
    throw err;
  }
}

async function cacheFirst(req){
  const cache = await caches.open(CACHE);
  const saved = await cache.match(req);
  if(saved) return saved;
  const res = await fetch(req);
  if(res.ok || res.type === "opaque") await cache.put(req, res.clone());
  return res;
}
