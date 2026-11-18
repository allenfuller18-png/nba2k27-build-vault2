// Static Build Vault hosting only. The AI assistant and its API have been removed.
export default {
  async fetch(request, env) {
    if (!env.ASSETS) {
      return new Response('Static assets binding is not configured.', { status: 500 });
    }
    return env.ASSETS.fetch(request);
  }
};
