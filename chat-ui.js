/* Floating Build Vault AI interface. The API key never appears in this file. */
(() => {
 'use strict';
 const style=document.createElement('style');
 style.textContent=`
 #vault-ai-toggle{position:fixed;right:20px;bottom:24px;z-index:45;display:flex;align-items:center;gap:9px;border:1px solid #7b83ff;border-radius:99px;background:linear-gradient(120deg,#6e6de8,#5056bd);color:white;font-weight:800;padding:13px 17px;box-shadow:0 12px 35px #060919aa;cursor:pointer}
 #vault-ai-toggle:hover{filter:brightness(1.12)}
 #vault-ai-toggle .va-bubble{font-size:21px;line-height:1}
 #vault-ai-panel{position:fixed;right:19px;bottom:88px;z-index:46;width:min(398px,calc(100vw - 28px));height:min(640px,calc(100dvh - 112px));border:1px solid #546185;border-radius:18px;background:#101a2c;box-shadow:0 25px 75px #000b;display:flex;flex-direction:column;overflow:hidden;color:#f1f5ff;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
 #vault-ai-panel[hidden]{display:none!important}
 .va-header{background:linear-gradient(110deg,#272d59,#15253b);padding:14px 15px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #354260;gap:8px}
 .va-title{display:flex;align-items:center;gap:10px}.va-logo{width:39px;height:39px;border-radius:12px;background:#343e78;display:grid;place-items:center;color:#81f0d7;font-size:23px}
 .va-title strong{display:block;font-size:15px}.va-title small{display:block;color:#a7bfd6;font-size:11px}
 .va-header-actions{display:flex;gap:5px}.va-header-actions button{background:transparent;color:#ccd7ee;border:0;border-radius:8px;padding:7px;font-size:18px;cursor:pointer}
 .va-header-actions button:hover{background:#ffffff1e}
 .va-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:11px;overscroll-behavior:contain}
 .va-msg{padding:11px 12px;border-radius:13px;max-width:92%;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}
 .va-msg.assistant{align-self:flex-start;background:#222f45;border:1px solid #34455f;border-top-left-radius:4px}
 .va-msg.user{align-self:flex-end;background:#393e83;border:1px solid #5257aa;border-top-right-radius:4px}
 .va-msg.system{align-self:center;background:#352e29;border:1px solid #70503f;color:#ffdbb8;font-size:12px}
 .va-suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:3px 13px 12px}
 .va-suggestions button{background:#1f2f47;border:1px solid #506088;border-radius:99px;color:#cfdbfa;font-size:11px;padding:7px 10px;cursor:pointer}
 .va-suggestions button:hover{background:#2e3d61}
 .va-footer{border-top:1px solid #34415b;padding:11px 12px 12px;background:#121d30}
 .va-form{display:flex;gap:8px;align-items:end}.va-form textarea{resize:none;flex:1;min-height:44px;max-height:115px;border-radius:12px;border:1px solid #465a76;background:#0c1525;color:white;font:13px system-ui;padding:12px;outline:none}
 .va-form textarea:focus{border-color:#868aff}.va-form button{height:44px;min-width:43px;border:0;border-radius:12px;background:#7577ed;color:white;font-size:22px;font-weight:800;cursor:pointer}
 .va-form button:disabled{opacity:.48;cursor:wait}.va-note{font-size:10px;color:#94a8c3;margin-top:7px;line-height:1.35}
 body.va-chat-open #vault-ai-toggle{display:none}
 @media(max-width:700px){#vault-ai-toggle{bottom:calc(78px + env(safe-area-inset-bottom));right:12px;padding:12px 14px;font-size:12px}#vault-ai-panel{right:8px;bottom:calc(76px + env(safe-area-inset-bottom));width:calc(100vw - 16px);height:min(680px,calc(100dvh - 95px - env(safe-area-inset-bottom)));border-radius:15px}}
 `;
 document.head.appendChild(style);
 const launch=document.createElement('button');launch.id='vault-ai-toggle';launch.type='button';launch.setAttribute('aria-controls','vault-ai-panel');launch.setAttribute('aria-expanded','false');launch.innerHTML='<span class="va-bubble" aria-hidden="true">✦</span><span>Build Vault AI</span>';
 const panel=document.createElement('section');panel.id='vault-ai-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Build Vault AI chat');panel.innerHTML=`
 <header class="va-header"><div class="va-title"><div class="va-logo">✦</div><div><strong>Build Vault AI</strong><small>NBA 2K27 · REC specialist</small></div></div><div class="va-header-actions"><button type="button" data-va="clear" aria-label="Clear chat" title="Clear chat">↺</button><button type="button" data-va="close" aria-label="Close chat" title="Close chat">✕</button></div></header>
 <div class="va-messages" aria-live="polite"></div>
 <div class="va-suggestions"><button type="button" data-va-prompt="Which of my builds is best for REC?">Best REC build</button><button type="button" data-va-prompt="Where should I use my remaining cap breakers?">Cap-breaker advice</button><button type="button" data-va-prompt="Compare my top three defensive builds.">Compare defense</button></div>
 <div class="va-footer"><form class="va-form"><textarea aria-label="Ask Build Vault AI" maxlength="1800" rows="1" placeholder="Ask about your builds…"></textarea><button type="submit" aria-label="Send message">↑</button></form><div class="va-note">Requires Vault cloud sign-in · Uses OpenAI API · AI may make mistakes</div></div>`;
 document.body.append(launch,panel);
 const messagesEl=panel.querySelector('.va-messages'),field=panel.querySelector('textarea'),submit=panel.querySelector('.va-form button');
 const storeKey='vault-ai-chat-session-v1';
 let messages=[],busy=false;
 try{const v=JSON.parse(sessionStorage.getItem(storeKey));if(Array.isArray(v))messages=v.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-12)}catch{}
 const welcome='Hi! I can use your saved Build Vault ratings to compare builds, explain individual cap breakers, and plan your REC lineup. What would you like to know?';
 function bubble(text,role){const el=document.createElement('div');el.className='va-msg '+role;el.textContent=text;messagesEl.appendChild(el);messagesEl.scrollTop=messagesEl.scrollHeight;return el}
 function draw(){messagesEl.replaceChildren();if(!messages.length)bubble(welcome,'assistant');else for(const m of messages)bubble(m.content,m.role)}
 function persist(){try{sessionStorage.setItem(storeKey,JSON.stringify(messages.slice(-12)))}catch{}}
 function toggle(show){panel.hidden=!show;document.body.classList.toggle('va-chat-open',show);launch.setAttribute('aria-expanded',String(show));if(show){draw();field.focus()}}
 launch.addEventListener('click',()=>toggle(true));
 panel.addEventListener('click',e=>{const action=e.target.closest('[data-va]')?.dataset.va;if(action==='close')toggle(false);if(action==='clear'){if(busy)return;messages=[];persist();draw()}const prompt=e.target.closest('[data-va-prompt]')?.dataset.vaPrompt;if(prompt){field.value=prompt;field.focus()}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false)});
 field.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(!busy)panel.querySelector('form').requestSubmit()}});
 panel.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const question=field.value.trim();if(!question)return;
  field.value='';messages.push({role:'user',content:question});messages=messages.slice(-12);persist();draw();
  busy=true;submit.disabled=true;const wait=bubble('Thinking about your builds…','assistant');
  try{
   const token=await window.cloudVault?.getAccessToken?.();
   if(!token){wait.remove();bubble('Please use ☁ Sign in at the top of the Vault first, then return to chat. This keeps your build data and API access protected.','system');return}
   const snapshot=(typeof builds!=='undefined'&&Array.isArray(builds))?builds:[];
   const response=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({messages:messages.slice(-12),builds:snapshot}),cache:'no-store'});
   const data=await response.json().catch(()=>null);
   wait.remove();
   if(!response.ok||!data?.reply){
    const advice=response.status===404?'Build Vault AI backend was not found at /api/chat. Deploy the latest GitHub code as a Cloudflare Pages project with Functions enabled, or as a Cloudflare Worker.':response.status===405?'The chat endpoint rejected this request; confirm the live site is running the latest backend.':response.status===401?'Your Vault login may have expired. Sign in again using Cloud Sync.':response.status===403?'Your Vault email is not authorized for AI. Check VAULT_AI_ALLOWED_EMAIL in Cloudflare secrets.':response.status===503?'AI setup is incomplete. Set OPENAI_API_KEY and VAULT_AI_ALLOWED_EMAIL in your Cloudflare project secrets, then deploy.':response.status===429?'The AI service is rate limited or out of quota. Check API billing and retry.':'Unable to answer. Check that the chat backend is deployed and your API access is configured.';
    bubble(data?.error||advice,'system');return;
   }
   messages.push({role:'assistant',content:data.reply});messages=messages.slice(-12);persist();bubble(data.reply,'assistant');
  }catch(err){wait.remove();bubble('Unable to reach Build Vault AI right now. Please check the Cloudflare deployment.','system')}
  finally{busy=false;submit.disabled=false;field.focus()}
 });
 draw();
})();
