// api/send-email.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// helpers --------------------------
function next10pmAsiaTaipeiEpoch() {
  // Server 跑 UTC；22:00 GMT+8 = 14:00 UTC
  const now = new Date();
  const utc14Today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 14, 0, 0));
  let target = utc14Today;
  if (now >= utc14Today) {
    target = new Date(utc14Today.getTime() + 24 * 3600 * 1000);
  }
  return Math.floor(target.getTime() / 1000); // seconds
}

function requireEnv(k) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ENV ${k}`);
  return v;
}

// handler --------------------------
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // 簡單保護：可選的 API TOKEN
    const expect = process.env.API_TOKEN;
    if (expect && req.headers['x-api-token'] !== expect) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { kind, to, name, playUrl, ctaUrl, recDate, audioUrl } = req.body || {};
    if (!to || !kind) return res.status(400).json({ error: 'Missing "to" or "kind"' });

    const from = requireEnv('SEND_FROM'); // 你在 SendGrid 驗證過的寄件人
    const WELCOME_ID = requireEnv('TEMPLATE_WELCOME_ID'); // d-xxxx
    const CAPSULE_ID = requireEnv('TEMPLATE_CAPSULE_ID'); // d-xxxx

    let msg = null;

    if (kind === 'welcome') {
      msg = {
        to,
        from,
        templateId: WELCOME_ID,
        dynamicTemplateData: {
          name: name || '朋友',
          ctaUrl: ctaUrl || 'https://momento.capsule', // 可換
          playUrl: playUrl || '',
        },
      };
      await sgMail.send(msg);
      return res.json({ ok: true, sent: 'welcome' });
    }

    if (kind === 'capsule') {
      // 次日 22:00（台北）
      const sendAt = next10pmAsiaTaipeiEpoch();
      msg = {
        to,
        from,
        templateId: CAPSULE_ID,
        dynamicTemplateData: {
          name: name || '朋友',
          recDate: recDate || new Date().toISOString(),
          playUrl: playUrl || '',
          audioUrl: audioUrl || ''
        },
        sendAt
      };
      await sgMail.send(msg);
      return res.json({ ok: true, scheduled: 'capsule', sendAt });
    }

    return res.status(400).json({ error: 'Unknown kind' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
