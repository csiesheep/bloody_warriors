// Cloudflare Worker: path-prefix router in front of the static assets.
// Single-player, so no WebSocket / Durable Objects yet.
//
// `run_worker_first: true` (wrangler.jsonc) sends every request here before
// asset matching, so we can strip the prefix and still serve from
// the bare *.workers.dev root (or `wrangler dev`) while testing.
//
// The public path segment is independent of the repo / Worker name — change
// PREFIX alone to move the site to a different path.
const PREFIX = "/bloody_warriors";
const CANONICAL = "https://games.csiesheep.com" + PREFIX + "/";
// M0: the one page is noindex, so the urlset stays empty until M5 ships.
const SITEMAP_XML = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  "</urlset>",
  "",
].join(String.fromCharCode(10));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === PREFIX) {
      url.pathname = PREFIX + "/";
      return Response.redirect(url.toString(), 301);
    }

    if (!url.pathname.startsWith(PREFIX + "/")) {
      return new Response("Not found", { status: 404 });
    }

    const sub = url.pathname.slice(PREFIX.length);
    if (sub === "/sitemap.xml") {
      return new Response(SITEMAP_XML, { headers: { "content-type": "application/xml; charset=utf-8" } });
    }

    url.pathname = sub;
    const response = await env.ASSETS.fetch(new Request(url, request));

    // The static-asset handler builds Location from the url we just stripped
    // the prefix off, so a same-origin redirect would escape this Worker and
    // 404 on the hub. Put the prefix back on.
    const location = response.headers.get("location");
    if (location) {
      const target = new URL(location, url);
      if (
        target.origin === url.origin &&
        target.pathname !== PREFIX &&
        !target.pathname.startsWith(PREFIX + "/")
      ) {
        target.pathname = PREFIX + target.pathname;
        const headers = new Headers(response.headers);
        headers.set("location", target.toString());
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
    }
    return response;
  },
};
