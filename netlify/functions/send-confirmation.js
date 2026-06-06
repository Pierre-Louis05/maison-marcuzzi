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
  const googleCalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=RDV+Maison+Marcuzzi&dates=${dateStart}/${dateEnd}&location=Top+Carrelage,+Bailleul`;

  const univers_line = univers ? `<p style="margin: 8px 0;"><strong>🏠 Univers :</strong> ${univers}</p>` : '';

  async function sendEmail(to, title, intro, signature) {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: 'service_ip0tojk',
        template_id: 'template_3d7gjqi',
        user_id: 'ZMblo6RSOOYjbAh81',
        template_params: {
          to_email: to,
          title: title,
          intro: intro,
          date: date,
          heure: heure,
          univers_line: univers_line,
          google_cal_link: googleCalLink,
          signature: signature
        }
      })
    });
    return res.text();
  }

  // Email au client
  await sendEmail(
    clientEmail,
    'Votre RDV est confirmé !',
    `Bonjour ${clientPrenom} ${clientNom}, votre rendez-vous Maison Marcuzzi est confirmé. Retrouvez ci-dessous les détails.`,
    'À très bientôt,\nL\'équipe Maison Marcuzzi'
  );

  // Email à la boutique
  await sendEmail(
    'topcarrelagebailleul@yahoo.com',
    `Nouveau RDV — ${clientPrenom} ${clientNom}`,
    `RDV confirmé par ${confirmedBy}. Client : ${clientPrenom} ${clientNom} | Email : ${clientEmail} | Tél : ${clientTel || 'Non renseigné'}`,
    'Maison Marcuzzi — Espace équipe'
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
