// POST /api/estimation → webhook n8n estim-form (01_INGEST_FORM_ESTIM), derrière la bordure.
import { bordure } from '../_bordure.js';

export const onRequestPost = (context) => bordure(context, 'estim-form');
export const onRequest = (context) => (context.request.method === 'POST' ? bordure(context, 'estim-form') : new Response(null, { status: 405, headers: { allow: 'POST' } }));
