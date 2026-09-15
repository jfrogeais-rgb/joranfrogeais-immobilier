// POST /api/solar-lead → webhook n8n solar-lead-ingest (09_SOLAR_LEAD_INGEST), derrière la bordure.
// Appelé depuis le site solaire (autre origine) : réponses avec l'origine autorisée, pré-vol OPTIONS.
import { bordure, prevol } from '../_bordure.js';

const ORIGINES = ['https://solar-leadgen.pages.dev'];

export const onRequest = (context) => {
  const m = context.request.method;
  if (m === 'OPTIONS') return prevol(context, ORIGINES);
  if (m === 'POST') return bordure(context, 'solar-lead-ingest', ORIGINES);
  return new Response(null, { status: 405, headers: { allow: 'POST, OPTIONS' } });
};
