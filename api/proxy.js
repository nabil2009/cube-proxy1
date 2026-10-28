export default async function handler(req, res) {
  const targetBase = "https://cube.xbluestudio2009.workers.dev";
  const url = targetBase + req.url;

  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const key = k.toLowerCase();
    if (["host", "connection", "content-length", "accept-encoding"].includes(key)) continue;
    headers[k] = v;
  }
  headers["host"] = "cube.freesrv.com";
  headers["x-forwarded-host"] = "cubegarde.sytes.net";
  headers["x-forwarded-proto"] = "https";
  headers["x-real-ip"] = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
  if (req.headers.cookie) headers["cookie"] = req.headers.cookie;

  let body = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
    if (body.length === 0) body = undefined;
  }

  try {
    const r = await fetch(url, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    // نسخ الستاتوس
    res.statusCode = r.status;

    // نسخ الهيدرز - مهم جدا للكوكيز
    for (const [k, v] of r.headers.entries()) {
      if (k.toLowerCase() === "set-cookie") continue;
      if (k.toLowerCase() === "content-encoding") continue;
      if (k.toLowerCase() === "content-length") continue;
      res.setHeader(k, v);
    }

    // نسخ Set-Cookie بشكل صحيح
    let cookies = [];
    if (r.headers.getSetCookie) {
      cookies = r.headers.getSetCookie();
    } else {
      const sc = r.headers.get("set-cookie");
      if (sc) cookies = [sc];
    }

    if (cookies.length > 0) {
      const fixed = cookies.map(c => 
        c.replace(/Domain=[^;]+;?/gi, "").replace(/;\s*;/g, ";").trim()
      );
      res.setHeader("Set-Cookie", fixed);
      console.log("Forwarded cookies:", fixed);
    }

    // معالجة الريدايركت
    const loc = r.headers.get("location");
    if (loc && r.status >= 300 && r.status < 400) {
      let newLoc = loc;
      if (newLoc.includes("cube.freesrv.com")) {
        newLoc = newLoc.replace(/https?:\/\/cube\.freesrv\.com(?::9069)?/g, "https://cubegarde.sytes.net");
      }
      if (newLoc.includes("cube.xbluestudio2009.workers.dev")) {
        newLoc = newLoc.replace(/https?:\/\/cube\.xbluestudio2009\.workers\.dev/g, "https://cubegarde.sytes.net");
      }
      res.setHeader("Location", newLoc);
    }

    if (r.body) {
      const buf = Buffer.from(await r.arrayBuffer());
      res.send(buf);
    } else {
      res.end();
    }
  } catch (e) {
    console.error("proxy error", e);
    res.status(500).send("Proxy error: " + e.message);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
