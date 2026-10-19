export default async function handler(req, res) {
  const target = `https://cube.freesrv.com${req.url}`;
  try {
    const r = await fetch(target, {
      method: req.method,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Cookie': req.headers['cookie'] || '',
        'Accept': req.headers['accept'] || '*/*',
        'Referer': 'https://cube.freesrv.com/',
        'Host': 'cube.freesrv.com'
      },
      redirect: 'manual'
    });
    const loc = r.headers.get('location');
    if (loc) {
      // اذا تحويل خارجي لـ discord خليه
      if (loc.includes('discord.com')) {
        res.setHeader('Location', loc);
        return res.status(r.status).end();
      }
      // اذا تحويل داخلي لـ cube.freesrv.com حوله لـ cubegarde
      let newLoc = loc.replace('https://cube.freesrv.com', 'https://cubegarde.sytes.net').replace('http://cube.freesrv.com', 'https://cubegarde.sytes.net');
      res.setHeader('Location', newLoc);
      return res.status(r.status).end();
    }
    res.status(r.status);
    for (const [k,v] of r.headers.entries()) {
      if (['content-encoding','content-length','x-frame-options'].includes(k.toLowerCase())) continue;
      if (k.toLowerCase()==='location') continue;
      res.setHeader(k,v);
    }
    const buf = await r.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch(e){ res.status(500).send('Error: '+e.message); }
}
export const config={api:{bodyParser:false}};
