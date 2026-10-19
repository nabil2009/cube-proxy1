export default async function handler(req, res) {
  const upstream = "https://cube.freesrv.com";
  const targetUrl = upstream + req.url;

  // انسخ البودي
  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    body = Buffer.concat(chunks);
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        "Accept": req.headers["accept"] || "*/*",
        "Accept-Language": req.headers["accept-language"] || "en",
        "Cookie": req.headers["cookie"] || "",
        "Referer": upstream + "/",
        "X-Forwarded-Host": "cubegarde.sytes.net",
        "X-Forwarded-Proto": "https",
        "Host": "cube.freesrv.com"
      },
      body,
      redirect: "manual"
    });

    // تحويل Location
    const loc = upstreamRes.headers.get("location");
    if (loc) {
      let newLoc = loc;
      newLoc = newLoc.replaceAll("https://cube.freesrv.com", "https://cubegarde.sytes.net");
      newLoc = newLoc.replaceAll("http://cube.freesrv.com", "https://cubegarde.sytes.net");
      // خلي discord.com كما هو
      res.setHeader("Location", newLoc);
      return res.status(upstreamRes.status).end();
    }

    // انسخ الستاتس
    res.status(upstreamRes.status);

    // انسخ الهيدر وعدل الكوكيز
    const setCookies = upstreamRes.headers.getSetCookie ? upstreamRes.headers.getSetCookie() : [];
    if (setCookies.length) {
      const fixed = setCookies.map(c => 
        c.replace(/Domain=[^;]+;?/gi, "").replace(/;;/g, ";").trim()
      );
      res.setHeader("Set-Cookie", fixed);
    }

    for (const [k,v] of upstreamRes.headers.entries()) {
      const lk = k.toLowerCase();
      if (["content-encoding","content-length","set-cookie","location","x-frame-options"].includes(lk)) continue;
      try { res.setHeader(k,v); } catch {}
    }

    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    return res.send(buf);

  } catch (e) {
    return res.status(502).send("Proxy error: " + e.message);
  }
}
export const config = { api: { bodyParser: false } };
