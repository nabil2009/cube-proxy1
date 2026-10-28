export default async function handler(req, res) {
  const ORIGIN = "https://cube.freesrv.com";
  const targetUrl = ORIGIN + req.url;

  // Copy headers
  const headers = {};
  for (const [k,v] of Object.entries(req.headers)) {
    const lk = k.toLowerCase();
    if (["host","connection","content-length","accept-encoding"].includes(lk)) continue;
    headers[k] = v;
  }
  headers["host"] = "cube.freesrv.com";
  headers["x-forwarded-host"] = "cubegarde.sytes.net";
  headers["x-forwarded-proto"] = "https";
  if (req.headers.cookie) headers["cookie"] = req.headers.cookie;

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const ch of req) chunks.push(ch);
    body = Buffer.concat(chunks);
    if (body.length === 0) body = undefined;
  }

  try {
    const r = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    res.statusCode = r.status;

    // Copy headers except set-cookie
    for (const [k,v] of r.headers.entries()) {
      if (k.toLowerCase() === "set-cookie") continue;
      if (k.toLowerCase() === "content-encoding") continue;
      if (k.toLowerCase() === "content-length") continue;
      res.setHeader(k, v);
    }

    // Forward cookies correctly
    let cookies = [];
    if (r.headers.getSetCookie) cookies = r.headers.getSetCookie();
    else {
      const sc = r.headers.get("set-cookie");
      if (sc) cookies = sc.split(",").length > 1 ? [sc] : [sc];
    }
    if (cookies.length > 0) {
      const fixed = cookies.map(c => c.replace(/Domain=[^;]+;?/gi, "").replace(/;;/g, ";").trim());
      res.setHeader("Set-Cookie", fixed);
    }

    const loc = r.headers.get("location");
    if (loc) {
      let newLoc = loc;
      if (newLoc.includes("cube.freesrv.com")) {
        newLoc = newLoc.replace(/https?:\/\/cube\.freesrv\.com/g, "https://cubegarde.sytes.net");
      }
      res.setHeader("Location", newLoc);
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).send("Proxy error: " + e.message);
  }
}

export const config = { api: { bodyParser: false } };
