// Bordure des formulaires du site (Cloudflare Pages Functions).
//
// Chaque formulaire public passe ici avant d'atteindre n8n :
//   1. corps JSON borné ;
//   2. compteur par adresse IP, au mieux (cache du point de présence) ; la limite
//      dure est la règle de débit de la zone Cloudflare, qui bloque avant cette fonction ;
//   3. vérification Turnstile côté serveur (siteverify), un jeton par soumission ;
//   4. relais vers le webhook n8n avec le secret que seule cette bordure connaît.
// Un robot arrêté ici ne coûte aucune exécution n8n.
//
// Variables (Pages > Settings > Variables and Secrets) :
//   TURNSTILE_SECRET     secret du widget Turnstile
//   SECRET_BORDURE_N8N   valeur de l'en-tête x-site-secret attendu par les webhooks
//   N8N_BASE             optionnel, base des webhooks (défaut : l'instance de production)
// Sans les deux secrets, la bordure refuse tout (503) : elle ne relaie jamais à nu.

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const N8N_DEFAUT = 'https://frogeais.app.n8n.cloud/webhook/';
const LIMITE = { parMinute: 5, parJour: 20 };
const TAILLE_MAX = 16384;

// Compteur par IP dans le cache du point de présence : pas de garantie globale, mais
// aucune limite d'écriture, et une rafale depuis une même adresse arrive au même endroit.
async function compter(request, ip) {
  let cache;
  try { cache = caches.default; } catch (e) { return { refus: false, mode: 'absent' }; }
  if (!cache || !ip) return { refus: false, mode: 'absent' };
  const hote = new URL(request.url).origin;
  const t = Date.now();
  const cles = [
    ['minute', hote + '/__bordure/' + encodeURIComponent(ip) + '/m/' + Math.floor(t / 60000), 120, LIMITE.parMinute],
    ['jour', hote + '/__bordure/' + encodeURIComponent(ip) + '/j/' + new Date(t).toISOString().slice(0, 10), 90000, LIMITE.parJour],
  ];
  let refus = null;
  for (const [nom, cle, ttl, max] of cles) {
    const req = new Request(cle, { method: 'GET' });
    let n = 0;
    try { const r = await cache.match(req); if (r) n = Number(await r.text()) || 0; } catch (e) { n = 0; }
    n += 1;
    try { await cache.put(req, new Response(String(n), { headers: { 'cache-control': 'max-age=' + ttl, 'content-type': 'text/plain' } })); } catch (e) { /* compteur au mieux */ }
    if (n > max && !refus) refus = nom;
  }
  return refus ? { refus: true, motif: refus, mode: 'cache' } : { refus: false, mode: 'cache' };
}

// Une route appelée depuis un autre site (le formulaire solaire) reçoit ses réponses avec
// l'origine autorisée ; toute autre origine n'obtient pas l'en-tête et le navigateur bloque.
function cors(origines, request) {
  const origine = request.headers.get('origin') || '';
  return origines && origines.includes(origine) ? { 'access-control-allow-origin': origine, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'origin' } : {};
}

export function prevol(context, origines) {
  const e = cors(origines, context.request);
  return new Response(null, { status: e['access-control-allow-origin'] ? 204 : 403, headers: e });
}

export async function bordure(context, cheminN8n, origines) {
  const { request, env } = context;
  const e = cors(origines, request);
  const reponse = (statut, corps, entetes) => new Response(JSON.stringify(corps), {
    status: statut,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, e, entetes || {}),
  });
  if (origines && !e['access-control-allow-origin']) return reponse(403, { ok: false, erreur: 'origine_refusee' });
  if (!env.TURNSTILE_SECRET || !env.SECRET_BORDURE_N8N) return reponse(503, { ok: false, erreur: 'bordure_non_configuree' });
  const ip = request.headers.get('cf-connecting-ip') || '';

  if (!/application\/json/i.test(request.headers.get('content-type') || '')) return reponse(415, { ok: false, erreur: 'json_attendu' });
  const brut = await request.text();
  if (brut.length > TAILLE_MAX) return reponse(413, { ok: false, erreur: 'corps_trop_grand' });
  let corps;
  try { corps = JSON.parse(brut); } catch (e) { return reponse(400, { ok: false, erreur: 'json_invalide' }); }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return reponse(400, { ok: false, erreur: 'json_invalide' });

  const debit = await compter(request, ip);
  if (debit.refus) return reponse(429, { ok: false, erreur: 'trop_de_demandes' }, { 'retry-after': debit.motif === 'minute' ? '60' : '3600', 'x-bordure-limite': debit.mode });

  const jeton = String(corps['cf-turnstile-response'] || '');
  delete corps['cf-turnstile-response'];
  if (!jeton) return reponse(403, { ok: false, erreur: 'verification_absente' }, { 'x-bordure-limite': debit.mode });
  let verif = { success: false };
  try {
    const r = await fetch(SITEVERIFY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: jeton, remoteip: ip }) });
    verif = await r.json();
  } catch (e) { verif = { success: false }; }
  if (!verif.success) return reponse(403, { ok: false, erreur: 'verification_refusee' }, { 'x-bordure-limite': debit.mode });

  corps.ip = ip;
  corps.pays = request.headers.get('cf-ipcountry') || '';
  const base = (env.N8N_BASE || N8N_DEFAUT).replace(/\/+$/, '') + '/';
  let aval = null;
  try {
    aval = await fetch(base + cheminN8n, { method: 'POST', headers: { 'content-type': 'application/json', 'x-site-secret': env.SECRET_BORDURE_N8N }, body: JSON.stringify(corps) });
  } catch (e) { aval = null; }
  if (!aval || aval.status >= 500 || aval.status === 403 || aval.status === 404) return reponse(502, { ok: false, erreur: 'aval_indisponible' }, { 'x-bordure-limite': debit.mode });
  let corpsAval = null;
  try { corpsAval = await aval.json(); } catch (e) { corpsAval = null; }
  const detail = corpsAval && typeof corpsAval === 'object' && !Array.isArray(corpsAval) ? { erreur: corpsAval.erreur, message: corpsAval.message } : undefined;
  return reponse(aval.ok ? 200 : aval.status, Object.assign({ ok: aval.ok }, detail || {}), { 'x-bordure-limite': debit.mode });
}
