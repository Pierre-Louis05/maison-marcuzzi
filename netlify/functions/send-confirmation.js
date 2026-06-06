exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const {
    clientEmail, clientPrenom, clientNom, clientTel,
    date, heure, confirmedBy, univers
  } = JSON.parse(event.body);

  const dateStart = date.replace(/-/g, '') + 'T' + heure.replace(':', '') + '00';
  const heureFinInt = parseInt(heure.split(':')[0]) + 1;
  const heureFin = String(heureFinInt).padStart(2, '0') + ':' + heure.split(':')[1];
  const dateEnd = date.replace(/-/g, '') + 'T' + heureFin.replace(':', '') + '00';

  const googleCalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=RDV+Maison+Marcuzzi&dates=${dateStart}/${dateEnd}&location=Top+Carrelage,+Bailleul&details=Rendez-vous+avec+l%27%C3%A9quipe+Maison+Marcuzzi`;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  async function sendEmail(to, subject, html) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Maison Marcuzzi <onboarding@resend.dev>',
        reply_to: 'topcarrelagebailleul@yahoo.com',
        to: [to],
        subject,
        html
      })
    });
    return res.json();
  }

  // Email au client
  await sendEmail(
    clientEmail,
    'Votre RDV Maison Marcuzzi est confirmé !',
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8B7355;">Bonjour ${clientPrenom} ${clientNom},</h2>
      <p>Votre rendez-vous <strong>Maison Marcuzzi</strong> est confirmé !</p>
      <div style="background: #f9f6f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>📅 Date :</strong> ${date}</p>
        <p><strong>🕐 Heure :</strong> ${heure}</p>
        <p><strong>📍 Lieu :</strong> Top Carrelage, Bailleul</p>
        ${univers ? `<p><strong>🏠 Univers :</strong> ${univers}</p>` : ''}
      </div>
      <a href="${googleCalLink}" style="display: inline-block; background: #8B7355; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 10px 0;">
        📆 Ajouter à Google Agenda
      </a>
      <p style="margin-top: 20px;">À très bientôt,<br><strong>L'équipe Maison Marcuzzi</strong></p>
    </div>
    `
  );

  // Email à l'équipe
  await sendEmail(
    'topcarrelagebailleul@yahoo.com',
    `Nouveau RDV confirmé — ${clientPrenom} ${clientNom}`,
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8B7355;">RDV confirmé par ${confirmedBy}</h2>
      <div style="background: #f9f6f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Client :</strong> ${clientPrenom} ${clientNom}</p>
        <p><strong>Email :</strong> ${clientEmail}</p>
        <p><strong>Téléphone :</strong> ${clientTel || 'Non renseigné'}</p>
        <p><strong>Date :</strong> ${date}</p>
        <p><strong>Heure :</strong> ${heure}</p>
        ${univers ? `<p><strong>Univers :</strong> ${univers}</p>` : ''}
      </div>
      <a href="${googleCalLink}" style="display: inline-block; background: #8B7355; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
        📆 Ajouter à Google Agenda
      </a>
    </div>
    `
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
