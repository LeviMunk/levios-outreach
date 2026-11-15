/* LeviOS encrypted cloud synchronization; safe offline-first fallback. */
(() => {
  "use strict";
  const CFG="levios.outreach.cloud.config.v1", LINK="levios.outreach.cloud.link.v1", VAULT="levios.outreach.encrypted.v1";
  const OWNER="levivanstap@gmail.com";
  let client=null, user=null, remote=null, revision=0, linked=false, saving=false, pending=false, timer=0, message="";
  const $=id=>document.getElementById(id);
  const vault=()=>{try{return JSON.parse(localStorage.getItem(VAULT)||"null")}catch{return null}};
  const valid=v=>!!(v&&v.version===1&&v.salt&&v.iv&&v.ciphertext);
  const config=()=>{try{return JSON.parse(localStorage.getItem(CFG)||"null")}catch{return null}};
  function makeClient(c){
    if(!window.supabase?.createClient)throw Error("Supabase script unavailable. Try reloading.");
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.url||""))throw Error("Invalid Supabase URL");
    if(!/^(sb_publishable_|eyJ)[A-Za-z0-9._-]{30,}$/.test(c.key||""))throw Error("Use a public publishable/anon key, never a secret key");
    client=window.supabase.createClient(c.url.replace(/\/$/,""),c.key,{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  }
  function status(text){message=text;const e=$("cloud-status");if(e){e.textContent=text;e.style.color=/^Error|^Conflict/.test(text)?"#ff9f9f":"#c8ff90"}}
  function refreshUI(){
    if(!$("cloud-modal"))return;
    $("cloud-setup").hidden=!!client;
    $("cloud-signin-pane").hidden=!client||!!user;
    $("cloud-signed-pane").hidden=!user;
    $("cloud-user").textContent=user?.email||"";
    $("cloud-remote").textContent=remote?"Cloud revision "+remote.revision:"No cloud vault stored";
    $("cloud-local").textContent=valid(vault())?"Encrypted browser vault present":"No encrypted browser vault";
    $("cloud-link").textContent=linked?"Sync active on this device":"Not syncing on this device";
    $("cloud-upload").disabled=!user||!valid(vault());
    $("cloud-restore").disabled=!user||!remote;
    $("cloud-upload").textContent=remote?"Replace cloud with THIS browser vault":"Upload browser vault and enable sync";
    status(message);
  }
  function initUI(){
    document.querySelector(".sidebar-bottom")?.insertAdjacentHTML("afterbegin",'<button type="button" id="cloud-open" class="sidebar-lock">☁ &nbsp; Cloud & Gmail</button>');
    document.querySelector(".security-note")?.insertAdjacentHTML("afterend",'<button type="button" id="cloud-before-unlock" class="button button-secondary" style="margin-top:12px">☁ Restore from cloud on another device</button>');
    document.body.insertAdjacentHTML("beforeend", [
      '<dialog id="cloud-modal" class="modal" style="max-width:680px;width:calc(100% - 24px);max-height:90vh;overflow:auto;padding:24px">',
      '<div class="modal-head"><div><div class="eyebrow">LEVIOS / INTEGRATIONS</div><h2>Cloud & Gmail</h2></div><button type="button" class="close-modal" id="cloud-close">×</button></div>',
      '<p class="small subtle">Only encrypted vault snapshots go to cloud storage. Gmail requires separate Google authorization.</p>',
      '<div id="cloud-setup"><label class="field">Supabase project URL<input id="cloud-url" type="url" placeholder="https://project.supabase.co"></label>',
      '<label class="field">Public publishable key<input id="cloud-key" autocomplete="off" placeholder="sb_publishable_..."></label>',
      '<p class="small subtle">Public key only. Never enter a service-role or secret key.</p><button class="button button-primary" id="cloud-configure">Save cloud configuration</button></div>',
      '<div id="cloud-signin-pane" hidden><p class="small">Sign in as levivanstap@gmail.com to connect this private vault.</p>',
      '<button class="button button-primary" id="cloud-login">Email sign-in link</button></div>',
      '<div id="cloud-signed-pane" hidden><p class="small">Signed in: <strong id="cloud-user"></strong></p>',
      '<p class="small subtle" id="cloud-remote"></p><p class="small subtle" id="cloud-local"></p><p class="small" id="cloud-link"></p>',
      '<div class="actions" style="display:flex;flex-wrap:wrap;gap:8px"><button class="button button-primary" id="cloud-upload">Upload browser vault</button>',
      '<button class="button button-secondary" id="cloud-restore">Restore cloud to browser</button>',
      '<button class="button button-secondary" id="cloud-refresh">Refresh status</button>',
      '<button class="button button-secondary" id="cloud-logout">Sign out</button></div>',
      '<p class="small subtle">Conflicting edits never overwrite automatically. Export an encrypted backup before replacing a vault. Use one device at a time until merge support is available.</p>',
      '<hr style="opacity:.25;margin:20px 0"><h3>Gmail</h3>',
      '<p class="small subtle">Requires a deployed Gmail bridge and Google OAuth setup. Never sends messages automatically.</p>',
      '<div class="actions" style="display:flex;flex-wrap:wrap;gap:8px">',
      '<button class="button button-secondary" id="gmail-status">Check connection</button>',
      '<button class="button button-primary" id="gmail-authorize">Connect Gmail</button>',
      '<button class="button button-secondary" id="gmail-activity">Inspect tracked email activity</button></div>',
      '<pre id="gmail-results" class="small" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></div>',
      '<p id="cloud-status" role="status" aria-live="polite" class="small"></p>',
      '</dialog>'
    ].join(""));
  }
  async function readRemote(){
    const {data,error}=await client.from("outreach_vaults").select("revision,payload,updated_at").eq("user_id",user.id).maybeSingle();
    if(error)throw Error(error.message+"; verify migration and RLS");
    remote=data;revision=Number(data?.revision||0);
    let saved;try{saved=JSON.parse(localStorage.getItem(LINK)||"null")}catch{}
    linked=!!(saved?.userId===user.id&&remote&&saved.revision===revision);
    if(saved&&!linked){localStorage.removeItem(LINK);status("Conflict: cloud and browser versions differ. Choose which snapshot to use.");}
    refreshUI();
  }
  async function start(){
    const c=config();if(!c){refreshUI();return}
    try{
      makeClient(c);
      const {data,error}=await client.auth.getUser();
      if(error&&error.code!=="session_not_found")throw error;
      user=data?.user||null;
      if(user&&user.email?.toLowerCase()!==OWNER){await client.auth.signOut();user=null;throw Error("Owner email required")}
      if(user)await readRemote();
      refreshUI();
    }catch(e){status("Error: "+e.message);refreshUI();}
  }
  async function upload(force=false){
    if(!client||!user)throw Error("Sign in first");
    if(!valid(vault()))throw Error("Create or restore a vault on this browser first");
    if(!force&&!linked)return;
    if(saving){pending=true;return}
    saving=true;
    try{
      const expected=force?Number(remote?.revision||0):revision;
      const {data,error}=await client.rpc("outreach_save_vault",{p_expected_revision:expected,p_payload:vault()});
      if(error)throw Error(error.message);
      revision=Number(data);remote={revision,payload:vault()};linked=true;
      localStorage.setItem(LINK,JSON.stringify({userId:user.id,revision}));
      status("Encrypted sync saved, revision "+revision);
    }catch(e){
      linked=false;localStorage.removeItem(LINK);
      status("Conflict / sync stopped: "+e.message+"; local data unchanged");
      throw e;
    }finally{saving=false;refreshUI();if(pending&&linked){pending=false;schedule();}}
  }
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>upload().catch(()=>{}),1200)};
  async function restore(){
    if(!valid(remote?.payload))throw Error("No valid remote vault");
    if(!confirm("Replace this browser's encrypted vault with cloud data? Download a backup first."))return;
    if(!confirm("Confirm replacement. You'll need the passphrase of the CLOUD vault."))return;
    localStorage.setItem(VAULT,JSON.stringify(remote.payload));
    localStorage.setItem(LINK,JSON.stringify({userId:user.id,revision:remote.revision}));
    location.reload();
  }
  async function gmail(action, extra={}){
    if(!client||!user)throw Error("Connect cloud first");
    const {data,error}=await client.functions.invoke("gmail-bridge",{body:{action,...extra}});
    if(error)throw Error(error.message);
    if(data?.error)throw Error(data.error);
    return data;
  }
  async function createDraft(rec){
    if(!rec?.email||!rec?.draft||rec.channel!=="Email")throw Error("Save the email recipient and message first");
    const d=await gmail("draft",{recordId:rec.id,to:rec.email,subject:rec.subject||"Hello",body:rec.draft});
    status("Gmail draft created. No message was sent.");
    return d;
  }
  async function click(e){
    const button=e.target.closest("button");const id=button?.id;
    if(!["cloud-open","cloud-before-unlock","cloud-close","cloud-configure","cloud-login","cloud-upload","cloud-restore","cloud-refresh","cloud-logout","gmail-status","gmail-authorize","gmail-activity"].includes(id))return;
    if(id==="cloud-open"||id==="cloud-before-unlock"){$("cloud-modal").showModal();refreshUI();return}
    if(id==="cloud-close"){$("cloud-modal").close();return}
    if(button.disabled)return;
    button.disabled=true;
    try{
      if(id==="cloud-configure"){
        const c={url:$("cloud-url").value.trim(),key:$("cloud-key").value.trim()};makeClient(c);localStorage.setItem(CFG,JSON.stringify(c));await start();status("Configuration saved. Sign in using your email.");
      }else if(id==="cloud-login"){
        const {error}=await client.auth.signInWithOtp({email:OWNER,options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:false}});
        if(error)throw Error(error.message);
        status("Sign-in link requested. Check "+OWNER);
      }else if(id==="cloud-upload"){
        if(remote&&!confirm("Replace existing cloud snapshot with this device? Confirm your encrypted backup is saved."))return;
        if(remote&&!confirm("This may overwrite another device's data. Continue?"))return;
        await upload(true);
      }else if(id==="cloud-restore")await restore();
      else if(id==="cloud-refresh"){await readRemote();status("Cloud status refreshed.");}
      else if(id==="cloud-logout"){await client.auth.signOut();user=null;remote=null;linked=false;localStorage.removeItem(LINK);status("Signed out. Local vault unchanged.")}
      else if(id==="gmail-status"){$("gmail-results").textContent=JSON.stringify(await gmail("status"),null,2);}
      else if(id==="gmail-authorize"){const r=await gmail("authorize");if(!r.authorizeUrl)throw Error("Google authorization unavailable");location.assign(r.authorizeUrl);}
      else if(id==="gmail-activity"){
        const emails=(window.LeviOutreachTrackedEmails?.()||[]).slice(0,10);
        if(!emails.length)throw Error("No email prospects in unlocked vault");
        $("gmail-results").textContent=JSON.stringify(await gmail("activity",{emails}),null,2);
        status("Gmail metadata inspected. No sent/reply statuses changed.");
      }
    }catch(e){status("Error: "+e.message)}finally{button.disabled=false;refreshUI();}
  }
  document.addEventListener("click",e=>{click(e).catch(err=>status("Error: "+err.message))});
  initUI();
  window.LeviCloud={
    onLocalWrite(){if(linked&&user)schedule()},
    onVaultOpen(){refreshUI()},onLock(){refreshUI()},
    async createDraft(rec){return createDraft(rec)},
    isConnected(){return !!(linked&&user)}
  };
  start().catch(e=>status("Error: "+e.message));
})();
