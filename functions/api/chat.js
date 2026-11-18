// Cloudflare Pages Functions route for Build Vault AI.
// Reuse the same authenticated chat backend as the Cloudflare Worker deployment.
import worker from '../../worker.js';

export function onRequest(context) {
  return worker.fetch(context.request, context.env);
}
