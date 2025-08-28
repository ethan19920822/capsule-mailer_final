// api/send-email.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const {
      to,          // 使用者 email
      name,        // 使用者名稱
      type,        // 'welcome' | 'capsule'
      playUrl,     // 第二封要帶的播放頁連結
      recDateISO,  // ISO錄製時間字串（可選）
      sendAtEpoch, // 可選：UNIX 秒，用來排程（例如隔天 22:00）
      theme, card, lifePath // 可選：要帶進模板的欄位
    } = req.body;

    const templateId = (type === 'welcome')
      ? process.env.TEMPLATE_WELCOME_ID
      : process.env.TEMPLATE_CAPSULE_ID;

    const msg = {
      to,
      from: process.env.SEND_FROM, // 你在 SendGrid 驗證過的寄件人
      templateId,
      dynamicTemplateData: {
        name,
        PLAY_URL: playUrl || '',
        CTA_URL: playUrl || '',
        REC_DATE: recDateISO || '',
        THEME: theme || '',
        CARD: card || '',
        LIFE: lifePath || ''
      }
    };

    // 若有帶 sendAtEpoch（UNIX 秒），就延後寄送
    if (sendAtEpoch) msg.sendAt = sendAtEpoch;

    await sgMail.send(msg);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
}
