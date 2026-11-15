// Gmail OAuth and draft/metadata bridge. Deploy as Supabase Edge Function.
// Public callback is authenticated by signed short-lived OAuth state; all POST actions verify Supabase user JWT.
// Do not deploy until migration, Google OAuth client and secrets are configured.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const OWNER = "levivanstap@gmail.com";
const env = name => Deno.env.get(name) || "";
const appUrl = env("LEVIOS_APP_URL") || "https://levimunk.com/levios-outreach/";
const sbUrl = env("SUPABASE_URL");
const roleKey = env("SUPABASE_SERVICE_ROLE_KEY") || JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}").default;
const admin = () => {
  if (!sbUrl || !roleKey) throw Error("Supabase service credential unavailable");
  return createClient(sbUrl, roleKey, {auth:{persistSession:false,autoRefreshToken:false}});
};
const allowedOrigin = new URL(appUrl).origin;
const cors = {"Access-Control-Allow-Origin":allowedOrigin,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors,"Cache-Control":"no-store"}});
const encoder = new TextEncoder();
const toB64 = bytes => {let value="";for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value)};
const fromB64 = value => Uint8Array.from(atob(value),x=>x.charCodeAt(0));
const b64url = bytes => toB64(bytes).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unurl = text => fromB64(text.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(text.length/4)*4,"="));
const hex = bytes => [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
const tokenKey = async () => {
  const key=env("GMAIL_TOKEN_ENCRYPTION_KEY");
  if(!key)throw Error("Gmail encryption key not configured");
  const raw=fromB64(key);
  if(raw.length!==32)throw Error("Gmail encryption key must contain exactly 32 random bytes");
  return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"]);
};
async function seal(plain){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt({name:"AES-GCM",iv},await tokenKey(),encoder.encode(plain));
  return b64url(iv)+"."+b64url(new Uint8Array(data));
}
async function unseal(value){
  const parts=value.split(".");
  if(parts.length!==2)throw Error("Invalid encrypted token");
  const data=await crypto.subtle.decrypt({name:"AES-GCM",iv:unurl(parts[0])},await tokenKey(),unurl(parts[1]));
  return new TextDecoder().decode(data);
}
async function signState(payload){
  const secret=env("GMAIL_OAUTH_STATE_SECRET");
  if(secret.length<32)throw Error("Gmail OAuth state secret not configured");
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const body=b64url(encoder.encode(JSON.stringify(payload)));
  const signature=await crypto.subtle.sign("HMAC",key,encoder.encode(body));
  return body+"."+b64url(new Uint8Array(signature));
}
async function verifyState(state){
  const parts=String(state||"").split(".");
  if(parts.length!==2)throw Error("Invalid OAuth state");
  const secret=env("GMAIL_OAUTH_STATE_SECRET");
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  const ok=await crypto.subtle.verify("HMAC",key,unurl(parts[1]),encoder.encode(parts[0]));
  if(!ok)throw Error("Invalid OAuth state signature");
  const payload=JSON.parse(new TextDecoder().decode(unurl(parts[0])));
  if(!payload.uid||!Number.isFinite(payload.exp)||payload.exp<Date.now()||payload.exp>Date.now()+600000)throw Error("OAuth state expired");
  return payload;
}
function redirectUri(){
  if(!sbUrl)throw Error("Supabase project URL missing");
  return sbUrl.replace(/\/$/,"")+"/functions/v1/gmail-bridge";
}
function googleClient(){
  const id=env("GMAIL_CLIENT_ID"), secret=env("GMAIL_CLIENT_SECRET");
  if(!id||!secret)throw Error("Google OAuth client is not configured");
  return {id,secret};
}
async function tokenRequest(params){
  const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(params)});
  const data=await res.json();
  if(!res.ok)throw Error("Google token exchange failed: "+(data.error||res.status));
  return data;
}
async function accessToken(userId){
  const api=admin();
  const {data,error}=await api.from("outreach_gmail_connections").select("gmail_address,refresh_token_sealed").eq("user_id",userId).maybeSingle();
  if(error)throw Error(error.message);
  if(!data)throw Error("Gmail not connected");
  const g=googleClient();
  const refresh=await unseal(data.refresh_token_sealed);
  const token=await tokenRequest({client_id:g.id,client_secret:g.secret,refresh_token:refresh,grant_type:"refresh_token"});
  return token.access_token;
}
async function gmailGet(token,path){
  const res=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/"+path,{headers:{"Authorization":"Bearer "+token}});
  const data=await res.json();
  if(!res.ok)throw Error("Gmail read failed: "+(data.error?.message||res.status));
  return data;
}
async function gmailPost(token,path,body){
  const res=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/"+path,{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!res.ok)throw Error("Gmail write failed: "+(data.error?.message||res.status));
  return data;
}
async function authenticatedUser(req){
  const jwt=req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!jwt)throw Error("Sign in required");
  const {data,error}=await admin().auth.getUser(jwt);
  if(error||!data?.user||data.user.email?.toLowerCase()!==OWNER)throw Error("Unauthorized account");
  return data.user;
}
function validEmail(value){return typeof value==="string"&&value.length<=254&&/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(value)}
async function authorize(user){
  const g=googleClient();
  await tokenKey();
  const state=await signState({uid:user.id,exp:Date.now()+600000,nonce:crypto.randomUUID()});
  const params=new URLSearchParams({
    client_id:g.id,redirect_uri:redirectUri(),response_type:"code",
    access_type:"offline",prompt:"consent",scope:"https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.readonly",
    state
  });
  return {authorizeUrl:"https://accounts.google.com/o/oauth2/v2/auth?"+params};
}
async function callback(url){
  const code=url.searchParams.get("code");
  const state=await verifyState(url.searchParams.get("state"));
  if(!code)throw Error("OAuth code missing");
  const g=googleClient();
  const t=await tokenRequest({code,client_id:g.id,client_secret:g.secret,redirect_uri:redirectUri(),grant_type:"authorization_code"});
  const profile=await gmailGet(t.access_token,"profile");
  if(profile.emailAddress?.toLowerCase()!==OWNER)throw Error("Incorrect Gmail account. Use "+OWNER);
  const api=admin();
  const existing=await api.from("outreach_gmail_connections").select("refresh_token_sealed").eq("user_id",state.uid).maybeSingle();
  if(existing.error)throw Error(existing.error.message);
  const sealed=t.refresh_token?await seal(t.refresh_token):existing.data?.refresh_token_sealed;
  if(!sealed)throw Error("Google did not issue an offline refresh token");
  const saved=await api.from("outreach_gmail_connections").upsert({user_id:state.uid,gmail_address:OWNER,refresh_token_sealed:sealed,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(saved.error)throw Error(saved.error.message);
  const target=new URL(appUrl);target.searchParams.set("gmail","connected");
  return Response.redirect(target,303);
}
async function createDraft(user,body){
  const to=String(body.to||"").trim(),subject=String(body.subject||"").replace(/[\r\n]/g," ").trim(),text=String(body.body||"");
  if(!validEmail(to)||subject.length>200||!text.trim()||text.length>9000||!body.recordId||String(body.recordId).length>100)throw Error("Invalid draft request");
  const digest=await crypto.subtle.digest("SHA-256",encoder.encode(user.id+"|"+body.recordId+"|"+to+"|"+subject+"|"+text));
  const key=hex(new Uint8Array(digest));
  const api=admin();
  const prev=await api.from("outreach_gmail_drafts").select("gmail_draft_id,gmail_message_id").eq("user_id",user.id).eq("idempotency_key",key).maybeSingle();
  if(prev.error)throw Error(prev.error.message);
  if(prev.data)return {draftId:prev.data.gmail_draft_id,messageId:prev.data.gmail_message_id,existing:true,sent:false};
  const token=await accessToken(user.id);
  // Encode Unicode Subject as RFC 2047; message body is UTF-8 and entire MIME payload is base64url-encoded for Gmail.
  const mime=["To: "+to,"Subject: =?UTF-8?B?"+toB64(encoder.encode(subject))+"?=","MIME-Version: 1.0","Content-Type: text/plain; charset=UTF-8","Content-Transfer-Encoding: 8bit","",text].join("\r\n");
  const created=await gmailPost(token,"drafts",{message:{raw:b64url(encoder.encode(mime))}});
  const saved=await api.from("outreach_gmail_drafts").insert({user_id:user.id,idempotency_key:key,gmail_draft_id:created.id,gmail_message_id:created.message?.id||null});
  if(saved.error)throw Error("Draft exists in Gmail but tracking insert failed: "+saved.error.message);
  return {draftId:created.id,messageId:created.message?.id||null,existing:false,sent:false};
}
async function activity(user,body){
  const emails=Array.isArray(body.emails)?body.emails:[];
  if(emails.length>10||emails.some(e=>!validEmail(e)))throw Error("Supply up to 10 verified email addresses");
  const token=await accessToken(user.id);
  const result=[];
  for(const address of [...new Set(emails)]){
    const q=encodeURIComponent("from:"+address+" OR to:"+address);
    const list=await gmailGet(token,"messages?q="+q+"&maxResults=5");
    const items=[];
    for(const message of list.messages||[]){
      const meta=await gmailGet(token,"messages/"+encodeURIComponent(message.id)+"?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date");
      const headers=Object.fromEntries((meta.payload?.headers||[]).map(h=>[h.name.toLowerCase(),h.value]));
      items.push({id:meta.id,threadId:meta.threadId,from:headers.from||"",to:headers.to||"",subject:headers.subject||"",date:headers.date||"",sent:(meta.labelIds||[]).includes("SENT"),received:(meta.labelIds||[]).includes("INBOX")});
    }
    result.push({address,messages:items});
  }
  return {inspected:result,autoUpdated:false};
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method==="GET"){
    try{return await callback(new URL(req.url));}
    catch(e){const dest=new URL(appUrl);dest.searchParams.set("gmail","error");return Response.redirect(dest,303);}
  }
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  if(req.headers.get("origin")!==allowedOrigin)return json({error:"Origin not allowed"},403);
  try{
    const user=await authenticatedUser(req);
    const body=await req.json();
    if(!body||typeof body!=="object")throw Error("Invalid request");
    if(body.action==="status"){
      const {data,error}=await admin().from("outreach_gmail_connections").select("gmail_address,connected_at").eq("user_id",user.id).maybeSingle();
      if(error)throw Error(error.message);
      const required=["GMAIL_CLIENT_ID","GMAIL_CLIENT_SECRET","GMAIL_TOKEN_ENCRYPTION_KEY","GMAIL_OAUTH_STATE_SECRET"];
      const missingSecrets=required.filter(name=>!env(name).trim());
      const invalidSecrets=[];
      if(env("GMAIL_CLIENT_ID")&&!env("GMAIL_CLIENT_ID").trim().endsWith(".apps.googleusercontent.com"))invalidSecrets.push("GMAIL_CLIENT_ID");
      if(env("GMAIL_OAUTH_STATE_SECRET")&&env("GMAIL_OAUTH_STATE_SECRET").length<32)invalidSecrets.push("GMAIL_OAUTH_STATE_SECRET");
      if(env("GMAIL_TOKEN_ENCRYPTION_KEY")){
        try{if(fromB64(env("GMAIL_TOKEN_ENCRYPTION_KEY").trim()).length!==32)invalidSecrets.push("GMAIL_TOKEN_ENCRYPTION_KEY");}
        catch{invalidSecrets.push("GMAIL_TOKEN_ENCRYPTION_KEY");}
      }
      const authorizationReady=missingSecrets.length===0&&invalidSecrets.length===0;
      return json({connected:!!data,address:data?.gmail_address||null,connectedAt:data?.connected_at||null,authorizationReady,setupRequired:!authorizationReady,missingSecrets,invalidSecrets});
    }
    if(body.action==="authorize")return json(await authorize(user));
    if(body.action==="draft")return json(await createDraft(user,body));
    if(body.action==="activity")return json(await activity(user,body));
    if(body.action==="disconnect"){
      const {error}=await admin().from("outreach_gmail_connections").delete().eq("user_id",user.id);
      if(error)throw Error(error.message);
      return json({connected:false});
    }
    return json({error:"Unknown action"},400);
  }catch(e){return json({error:String(e.message||e)},400);}
});
