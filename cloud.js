/* Private, per-user cloud backup for the existing Build Vault interface.
   Reads the normal local Vault's build data and syncs through Supabase RLS.
   No service-role key is used or required. */
(() => {
  'use strict';
  const cfg = window.VAULT_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co\/?$/.test(cfg.supabaseUrl || '') &&
    !!(cfg.supabaseAnonKey || '').trim() && !/YOUR_|PLACEHOLDER/i.test(cfg.supabaseAnonKey);
  const sb = configured && window.supabase?.createClient
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
      }) : null;
  let user = null, revision = 0, dirty = false, saving = false, conflict = false;
  let timer = null, loading = false, status = 'local';
  const root = document.createElement('div');
  root.id = 'cloud-root'; document.body.appendChild(root);
  const safe = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button = (label, action, extra='') => `<button class="btn ${extra}" type="button" data-cloud="${action}">${label}</button>`;
  const current = () => JSON.parse(JSON.stringify(builds));
  const notifyCloud = msg => typeof notify === 'function' ? notify(msg) : console.info(msg);
  const refresh = () => { if (typeof render === 'function') render(); };
  const errorText = e => e?.message || String(e || 'Unknown error');
  const onConflict = e => /SYNC_CONFLICT|duplicate key/i.test(errorText(e));
  const isDefault = () => JSON.stringify(builds) === JSON.stringify(INITIAL);
  const statusLabel = () => !sb ? '☁ Setup cloud' : !user ? '☁ Sign in' : conflict ? '⚠ Sync conflict' : saving || dirty ? '↻ Saving…' : status === 'saved' ? '✓ Cloud synced' : status === 'error' ? '⚠ Sync error' : '☁ Connected';

  function replaceBuilds(newBuilds) {
    if (!Array.isArray(newBuilds) || !newBuilds.every(b => b && typeof b.name === 'string' && b.stats && typeof b.stats === 'object')) {
      throw new Error('The cloud record is not a valid build list.');
    }
    builds = JSON.parse(JSON.stringify(newBuilds));
    try { localStorage.setItem(KEY, JSON.stringify(builds)); } catch (_) {}
    currentId = null;
    if (typeof tab !== 'undefined') tab = 'all';
    refresh();
  }
  async function getRemote() {
    if (!sb || !user) return null;
    const { data, error } = await sb.from('build_vaults')
      .select('builds, revision, updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function initialSync() {
    if (!sb || !user || loading) return;
    loading = true;
    try {
      const cloud = await getRemote();
      if (cloud) {
        revision = Number(cloud.revision);
        if (JSON.stringify(cloud.builds) !== JSON.stringify(builds)) {
          if (!isDefault()) {
            // Don't silently replace a user's edits on this device.
            const useRemote = confirm('Cloud contains a different Vault. Press OK to use your cloud copy (recommended). Press Cancel to keep this device’s copy without uploading it yet. Export a JSON backup first if you want to preserve both.');
            if (!useRemote) { conflict = true; status = 'conflict'; return; }
          }
          replaceBuilds(cloud.builds);
        }
        dirty = false; conflict = false; status = 'saved';
      } else {
        revision = 0; dirty = true; conflict = false;
        await push(); // Seed the cloud with the current 11 builds or local edits.
      }
    } catch (e) {
      status = 'error'; console.error('Cloud load failed:', e);
      notifyCloud('Cloud connection failed: ' + errorText(e));
    } finally { loading = false; refresh(); }
  }
  async function push() {
    if (!sb || !user || !dirty || saving || conflict || loading && revision !== 0) return;
    saving = true; status = 'saving'; refresh();
    const snapshot = current();
    try {
      const {data, error} = await sb.rpc('save_build_vault', {
        p_expected_revision: revision, p_builds: snapshot
      });
      if (error) throw error;
      revision = Number(data);
      dirty = JSON.stringify(builds) !== JSON.stringify(snapshot);
      status = dirty ? 'saving' : 'saved';
    } catch (e) {
      if (onConflict(e)) { conflict = true; status = 'conflict'; notifyCloud('Cloud changed on another device — resolve sync conflict'); }
      else { status = 'error'; notifyCloud('Cloud save failed; your edits remain locally saved'); }
      console.error('Cloud save failed:', e);
    } finally {
      saving = false; refresh();
      if (dirty && !conflict && status !== 'error') queueSave();
    }
  }
  function queueSave() {
    dirty = true;
    if (!user || !sb || conflict) { refresh(); return; }
    clearTimeout(timer); timer = setTimeout(push, 850);
    refresh();
  }
  async function checkUpdates() {
    if (!sb || !user || saving || loading || conflict || dirty) return;
    try {
      const cloud = await getRemote();
      if (cloud && Number(cloud.revision) > revision) {
        revision = Number(cloud.revision);
        replaceBuilds(cloud.builds);
        status = 'saved'; notifyCloud('Updated with your latest cloud changes ✓');
      }
    } catch (e) { console.warn('Cloud refresh failed', e); }
  }
  function closePanel() { root.innerHTML=''; }
  function openPanel() {
    const msg = !configured ? `Cloud is not configured yet. Open config.js and enter your Supabase project URL and publishable/anon key, then deploy the folder. See README.md.`
      : !sb ? 'The Supabase browser SDK did not load. Check your internet connection.'
      : user ? `Signed in as ${safe(user.email)}. ${conflict?'A sync conflict needs a choice.':'Changes save automatically after each edit.'}`
      : 'Sign in by email to save and sync your builds across devices. An email sign-in link will be sent to you.';
    root.innerHTML=`<div class="modal-wrap" id="cloud-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="Cloud sync" style="max-width:570px"><div class="modal-head"><h2>☁ Cloud Sync</h2>${button('✕ Close','close','ghost')}</div><div class="modal-body" style="display:grid;gap:14px"><p class="helper" style="font-size:14px">${msg}</p>
    ${sb && !user ? `<form id="cloud-login-form" style="display:grid;gap:10px"><div class="field"><label for="cloud-email">Your email</label><input id="cloud-email" type="email" required placeholder="you@gmail.com" autocomplete="email" style="padding:12px;background:#182338;color:white;border:1px solid #45516f;border-radius:10px"></div><button class="btn primary" type="submit">Send sign-in link</button></form>` : ''}
    ${sb && user && conflict ? `<div class="editor-group"><strong>Sync conflict: choose which copy to keep</strong><p class="helper">Export a JSON backup before resolving if either device has changes you want to preserve.</p><div class="top-actions">${button('Use cloud copy','use-cloud')}${button('Upload this device’s copy','use-local','primary')}</div></div>` : ''}
    ${sb && user && !conflict ? `<div class="top-actions">${button('Sync now','sync','primary')}${button('Sign out','signout','ghost')}</div>` : ''}
    <p class="helper">Privacy: each account has its own build list, protected by database row-level security. Keep JSON backups for recovery.</p>
    </div></section></div>`;
  }
  async function resolveCloud() {
    if (!user || !sb) return;
    if (!confirm('Replace this device’s builds with the cloud version? Export a JSON backup first if needed.')) return;
    try { const row = await getRemote(); if (!row) throw Error('No cloud copy found');
      revision=Number(row.revision); dirty=false; conflict=false; replaceBuilds(row.builds); status='saved'; closePanel(); notifyCloud('Cloud copy restored ✓');
    } catch(e) { notifyCloud('Could not restore cloud copy: '+errorText(e)); }
  }
  async function resolveLocal() {
    if (!user || !sb) return;
    if (!confirm('Overwrite your cloud builds with this device’s copy? Other devices will adopt these changes.')) return;
    try { const row=await getRemote(); revision=Number(row?.revision||0); dirty=true; conflict=false; closePanel(); await push(); }
    catch(e){conflict=true;notifyCloud('Could not resolve conflict: '+errorText(e));}
  }
  root.addEventListener('click', async e => {
    const a=e.target.closest('[data-cloud]')?.dataset.cloud;
    if(!a)return;
    if(a==='close') closePanel();
    if(a==='sync') { dirty=true; await push(); closePanel(); }
    if(a==='use-cloud') await resolveCloud();
    if(a==='use-local') await resolveLocal();
    if(a==='signout') {
      if (dirty && !confirm('You have unsynced edits. Sign out anyway?')) return;
      await sb.auth.signOut(); user=null; revision=0; dirty=false; status='local'; closePanel();refresh();
    }
  });
  root.addEventListener('submit', async e => {
    if(e.target.id!=='cloud-login-form')return;
    e.preventDefault();
    const email=root.querySelector('#cloud-email')?.value.trim();
    if(!email)return;
    const { error }=await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    notifyCloud(error ? 'Sign-in failed: '+errorText(error) : 'Check your email for a sign-in link');
    if(!error) closePanel();
  });
  document.addEventListener('vault:changed', queueSave);
  if (sb) {
    sb.auth.onAuthStateChange((event, session) => {
      // Defer DB activity until the SDK finishes handling the auth transition.
      setTimeout(() => {
        const next = session?.user || null;
        if (!next) { user=null; revision=0; status='local'; refresh(); return; }
        if (user?.id!==next.id) {
          user=next; revision=0; dirty=false; status='loading'; refresh();
          initialSync();
        }
      }, 0);
    });
    sb.auth.getSession().then(({data}) => {
      if(data?.session?.user && !user) {user=data.session.user;initialSync();}
    }).catch(e=>console.warn('Could not restore cloud login',e));
    setInterval(checkUpdates, 20000);
    window.addEventListener('focus', checkUpdates);
    document.addEventListener('visibilitychange', () => {if (!document.hidden) checkUpdates();});
  }
  window.cloudVault = { statusLabel, openPanel, checkUpdates };
  refresh();
})();