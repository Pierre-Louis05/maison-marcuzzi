// En-têtes renvoyés sur TOUTES les réponses, y compris les erreurs.
// Sans cela, une erreur arrive au navigateur sans en-tête CORS et s'affiche
// comme un problème de CORS, ce qui masque complètement la vraie cause.
const ENTETES = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

// La fiche Google du magasin s'intitule « Top Carrelage ». Le nom commercial
// évolue (Top Aménagement), donc on essaie plusieurs libellés, du plus précis
// au plus large, plutôt que de dépendre d'une seule formulation.
const REQUETES = [
  'Top Carrelage, 22 Avenue de l\'Europe, 59270 Bailleul',
  'Top Carrelage Bailleul',
  'Top Aménagement Bailleul',
  'magasin de carrelage 22 Avenue de l\'Europe 59270 Bailleul'
];

const reponse = (statusCode, corps) => ({
  statusCode,
  headers: ENTETES,
  body: JSON.stringify(corps)
});

exports.handler = async (event) => {
  // Diagnostic temporaire : ?diag=1 renvoie la reponse d'erreur complete de
  // Google. Gardé derriere un parametre pour ne pas exposer les details
  // internes du projet Google Cloud a tout visiteur. A retirer une fois la
  // cle retablie.
  const diag = event && event.queryStringParameters && event.queryStringParameters.diag === '1';
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!API_KEY) return reponse(500, { error: 'Clé API manquante' });

  try {
    let lieu = null;
    let erreurGoogle = null;

    for (const textQuery of REQUETES) {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.reviews'
        },
        body: JSON.stringify({ textQuery, maxResultCount: 1, languageCode: 'fr' })
      });

      const data = await res.json();

      if (data.error) {            // clé refusée ou API non activée : insister est inutile
        erreurGoogle = data.error;
        break;
      }
      if (data.places && data.places.length > 0) {
        lieu = data.places[0];
        break;
      }
    }

    if (erreurGoogle) {
      return reponse(502, {
        error: 'Google a refusé la requête',
        statutGoogle: erreurGoogle.status || null,
        detail: erreurGoogle.message || null,
        ...(diag ? { diagnostic: erreurGoogle } : {})
      });
    }
    if (!lieu) {
      return reponse(404, { error: 'Lieu non trouvé', requetesEssayees: REQUETES.length });
    }

    const reviews = (lieu.reviews || [])
      .filter(r => r.rating === 5 && r.text?.text && r.text.text.trim().length > 20)
      .map(r => ({
        nom: r.authorAttribution?.displayName || 'Anonyme',
        avatar: r.authorAttribution?.photoUri || null,
        note: r.rating || 5,
        texte: r.text?.text || '',
        date: r.relativePublishTimeDescription || ''
      }));

    return {
      statusCode: 200,
      headers: { ...ENTETES, 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify({
        note: lieu.rating || 0,
        totalAvis: lieu.userRatingCount || 0,
        reviews
      })
    };

  } catch (err) {
    return reponse(500, { error: 'Erreur interne', detail: err.message });
  }
};
