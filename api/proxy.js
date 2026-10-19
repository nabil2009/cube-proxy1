export default async function handler(req, res) {
  const target = `https://cube.xbluestudio2009.workers.dev${req.url}`;
  try {
    const r = await fetch(target, {
      method: req.method,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': req.headers.get('cookie') || '' },
      redirect: 'manual'
    });
    const loc = r.headers.get('location');
    if (loc && r.status >= 300 && r.status < 400) {
      res.setHeader('Location', loc);
      return res.status(r.status).end();
    }
    res.status(r.status);
    for (const [k,v] of r.headers.entries()) {
      if (['content-encoding','content-length'].includes(k.toLowerCase())) continue;
      if (k.toLowerCase() === 'location') continue;
      res.setHeader(k, v);
    }
    const buf = await r.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch(e) { res.status(500).send(e.message); }
}
export const config = { api: { bodyParser: false } };
