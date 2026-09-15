// POST /api/criteres-acheteur → webhook n8n criteres-acheteur (01_INGEST_FORM_CRITERES_ACHETEUR), derrière la bordure.
import { bordure } from '../_bordure.js';

export const onRequest = (context) => (context.request.method === 'POST' ? bordure(context, 'criteres-acheteur') : new Response(null, { status: 405, headers: { allow: 'POST' } }));
