const respond = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/contact') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' });

    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return respond(403, { error: 'Invalid origin' });
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
      return respond(415, { error: 'Expected JSON' });
    }
    if (Number(request.headers.get('Content-Length') || 0) > 8192) {
      return respond(413, { error: 'Message too large' });
    }

    let data;
    try {
      const raw = await request.text();
      if (raw.length > 8192) return respond(413, { error: 'Message too large' });
      data = JSON.parse(raw);
    } catch {
      return respond(400, { error: 'Invalid request' });
    }

    if (data.website) return respond(200, { ok: true });
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim();
    const message = String(data.message || '').trim();
    if (!name || name.length > 120 || /[\r\n]/.test(name) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        message.length < 20 || message.length > 5000) {
      return respond(400, { error: 'Please check your details' });
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const { success } = await env.CONTACT_RATE_LIMIT.limit({ key: ip });
    if (!success) return respond(429, { error: 'Please wait before sending another message' });

    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      return respond(503, { error: 'Contact service unavailable' });
    }
    const endpoint = new URL('/rest/v1/contact_enquiries', env.SUPABASE_URL);
    try {
      const saved = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SECRET_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ name, email, message })
      });
      if (!saved.ok) return respond(502, { error: 'Contact service unavailable' });
      return respond(201, { ok: true });
    } catch {
      return respond(502, { error: 'Contact service unavailable' });
    }
  }
};
