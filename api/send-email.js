// api/send-email.js
import sgMail from '@sendgrid/mail';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    // ===== 必要 env 檢查 =====
    const {
      SENDGRID_API_KEY,
      SEND_FROM,
      TEMPLATE_WELCOME_ID,
      TEMPLATE_CAPSULE_ID,
      API_TOKEN, // 若你有設保護才會用到
    } = process.env;

    const missing = [];
    if (!SENDGRID_API_KEY) missing.push('SENDGRID_API_KEY');
    if (!SEND_FROM) missing.push('SEND_FROM');
    if (!TEMPLATE_WELCOME_ID) missing.push('TEMPLATE_WELCOME_ID');
    if (!TEMPLATE_CAPSULE_ID) missing.push('TEMPLATE_CAPSULE_ID');
    if (missing.length) {
      return res.status(500).json({ ok: false, error: 'Missing env', missing });
    }

    // ===== 可選：API Token 保護 =====
    if (API_TOKEN) {
      const token = req.headers['x-api-token'];
      if (token !== API_TOKEN) {
        return res.status(401).json({ ok: false, error: 'Unauthorized (bad API_TOKEN)' });
      }
    }

    const body = req.body || {};
    const { type, to, name, ctaUrl, playUrl, recDateISO, sendAtEpoch, theme, card, lifePath } = body;

    if (!type || !to || !name) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: type/to/name' });
    }

    // ===== SendGrid 設定 =====
    sgMail.setApiKey(SENDGRID_API_KEY);

    const isWelcome = type === 'welcome';
    const templateId = isWelcome ? TEMPLATE_WELCOME_ID : TEMPLATE_CAPSULE_ID;

    const dynamicData = isWelcome
      ? {
          NAME: name,
          CTA_URL: ctaUrl || '',
        }
      : {
          NAME: name,
          PLAY_URL: playUrl || '',
          REC_DATE: recDateISO || '',
          THEME: theme || '',
          CARD: card || '',
          LIFE: String(lifePath || ''),
        };

    const msg = {
      to,
      from: SEND_FROM,
      templateId,
      dynamic_template_data: dynamicData,
    };

    const [resp] = await sgMail.send(msg);

    return res.status(200).json({
      ok: true,
      status: resp?.statusCode || 200,
      message: 'Mail sent',
    });
  } catch (err) {
    // 把 SendGrid 的詳細錯誤透出去，方便你看到原因
    const sgErr = err?.response?.body || err?.message || String(err);
    console.error('SENDGRID_ERROR', sgErr);
    return res.status(500).json({
      ok: false,
      error: sgErr,
      trace: err?.stack?.slice(0, 500),
    });
  }
}
