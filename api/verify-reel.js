// Función serverless de Vercel: comprueba la contraseña del reel SIN que la contraseña
// ni el ID del vídeo de YouTube aparezcan nunca en el código que llega al navegador.
//
// CÓMO CONFIGURARLA (una sola vez):
// 1. En el panel de Vercel → tu proyecto → Settings → Environment Variables, añade:
//      REEL_PASSWORD  = la contraseña que quieras usar (la que compartes con reclutadores/estudios)
//      REEL_VIDEO_ID  = el vídeo de YouTube: vale tanto el ID solo (dJw-I4L-00Y) como el enlace
//                       completo (https://youtu.be/dJw-I4L-00Y o .../watch?v=dJw-I4L-00Y) —
//                       esta función extrae el ID automáticamente de cualquiera de las dos formas.
// 2. Vuelve a desplegar (Deployments → los tres puntos del último deploy → "Redeploy"),
//    porque las variables de entorno solo se leen al arrancar, no en caliente.
//
// Para cambiar la contraseña o el vídeo más adelante: cambia el valor de la variable en
// Vercel y vuelve a desplegar. Nunca hace falta tocar el HTML ni este archivo.

// Acepta un ID plano o un enlace de YouTube en cualquiera de sus formas habituales
// (youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID, youtube.com/shorts/ID)
// y siempre devuelve solo el ID.
function extractVideoId(raw) {
  if (!raw) return null;
  const value = raw.trim();
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.split('/').filter(Boolean)[0] || null;
    }
    if (url.hostname.includes('youtube.com')) {
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const parts = url.pathname.split('/').filter(Boolean); // ["embed","ID"] o ["shorts","ID"]
      return parts[parts.length - 1] || null;
    }
  } catch (e) {
    // No era una URL (probablemente ya es un ID suelto) — seguimos abajo.
  }
  return value;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const correctPassword = process.env.REEL_PASSWORD;
  const videoId = extractVideoId(process.env.REEL_VIDEO_ID);

  if (!correctPassword || !videoId) {
    // Las variables de entorno no están configuradas todavía en este deploy de Vercel.
    return res.status(500).json({ ok: false, error: 'server_not_configured' });
  }

  let password = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    password = body.password || '';
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'bad_request' });
  }

  // Pequeño retraso fijo: no evita del todo la fuerza bruta, pero la hace muy lenta y cara
  // sin necesidad de contratar nada de pago.
  await new Promise((r) => setTimeout(r, 400));

  if (password !== correctPassword) {
    return res.status(401).json({ ok: false });
  }

  return res.status(200).json({ ok: true, videoId });
}
