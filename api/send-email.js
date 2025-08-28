// api/send-email.js  (Node 18+/22 on Vercel)
import sgMail from '@sendgrid/mail';

function json(res, status, obj) {
  res.status(status).setHeader('Content-Type','application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res){
  if (req.method === 'OPTIONS') return json(res, 200, { ok:true });
  if (req.method !== 'POST')   return json(res, 404, { ok:false, error:'Method Not Allowed' });

  try{
    // 讀環境變數
    const {
      SENDGRID_API_KEY,
      SEND_FROM,
      TEMPLATE_WELCOME_ID,
      TEMPLATE_CAPSULE_ID
    } = process.env;

    if (!SENDGRID_API_KEY) return json(res, 500, { ok:false, error:'Missing SENDGRID_API_KEY' });
    if (!SEND_FROM)        return json(res, 500, { ok:false, error:'Missing SEND_FROM' });
    if (!TEMPLATE_WELCOME_ID) return json(res, 500, { ok:false, error:'Missing TEMPLATE_WELCOME_ID' });
    if (!TEMPLATE_CAPSULE_ID) return json(res, 500, { ok:false, error:'Missing TEMPLATE_CAPSULE_ID' });

    sgMail.setApiKey(SENDGRID_API_KEY);

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      type='welcome', to, email, name='Friend',
      ctaUrl,
      playUrl, recDateISO, sendAtEpoch,
      theme, card, lifePath
    } = body;

    const toEmail = to || email;
    if (!toEmail) return json(res, 400, { ok:false, error:'Missing "to" (or "email")' });

    const templateId = type === 'welcome' ? TEMPLATE_WELCOME_ID : TEMPLATE_CAPSULE_ID;

    const dynamic_template_data =
      type === 'welcome'
        ? { name, ctaUrl: ctaUrl || 'https://momento.app' }
        : {
            name,
            PLAY_URL: playUrl || '',
            REC_DATE: recDateISO || new Date().toISOString(),
            THEME: theme || '',
            CARD: card || '',
            LIFE: lifePath || ''
          };

    const msg = {
      to: toEmail,
      from: SEND_FROM,
      templateId,
      dynamic_template_data
    };

    // 延遲寄送（可選）
    if (type === 'capsule' && Number.isFinite(sendAtEpoch)) {
      msg.sendAt = sendAtEpoch; // 單位：秒，必須是未來時間
    }

    const [resp] = await sgMail.send(msg);
    return json(res, 200, { ok:true, status: resp?.statusCode || 202 });
  }catch(err){
    const reason = err?.response?.body || err.message || err;
    console.error('SendGrid error:', reason);
    return json(res, 500, { ok:false, error: reason });
  }
}
