const p=new URLSearchParams(location.search), environment=p.get('environment'), deploymentId=p.get('deploymentId'), scriptHost=p.get('bootstrapHost');
const runtimeStartedAt=performance.now();
let participantData=[];try{const raw=JSON.parse(p.get('participantData')||'[]');if(Array.isArray(raw))participantData=raw.filter(x=>x&&typeof x.key==='string'&&typeof x.value==='string'&&x.key.trim()).map(x=>({key:x.key.trim(),value:x.value}))}catch{}
function applyParticipantData(){if(!participantData.length)return;const customAttributes=Object.fromEntries(participantData.map(x=>[x.key,x.value]));cmd('command','Database.set',{messaging:{customAttributes}});diag({event:'participant-data-applied',count:participantData.length})}
const log=document.querySelector('#log');
function notify(event,message,extra={}){try{if(window.parent!==window)window.parent.postMessage({source:'cx-toolkit-messenger-web-host',type:'status',event,message,...extra},'*')}catch{}}
function diag(x){log.textContent+=JSON.stringify({time:new Date().toISOString(),...x})+'\n'}
notify('runtime-start','CX Toolkit runtime started',{elapsedMs:Math.round(performance.now()-runtimeStartedAt)});
window.addEventListener('error',e=>diag({event:'window.error',message:e.message,filename:e.filename,lineno:e.lineno,colno:e.colno}));
function cmd(name,...args){try{window.Genesys(name,...args)}catch(e){diag({event:'command-error',command:name,message:e.message})}}
function messengerBounds(){
 const candidates=[...document.querySelectorAll('iframe, #genesys-messenger, #genesys-thirdparty, [id^="genesys-"]')].filter(el=>el.id!=='genesys-messenger-bootstrap');
 const rects=candidates.map(el=>el.getBoundingClientRect()).filter(r=>r.width>1&&r.height>1&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth);
 if(!rects.length)return null;
 return {top:Math.min(...rects.map(r=>r.top)),left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),bottom:Math.max(...rects.map(r=>r.bottom)),width:0,height:0};
}
function reportBounds(){const b=messengerBounds();if(b){b.width=b.right-b.left;b.height=b.bottom-b.top}notify('bounds',null,{bounds:b})}
let timer=null;function startBounds(){clearInterval(timer);timer=setInterval(reportBounds,250);reportBounds()}
window.addEventListener('message',e=>{if(e.data?.source==='cx-toolkit-parent'&&e.data?.type==='request-bounds')reportBounds()});
if(!environment||!deploymentId){notify('error','Missing environment or deployment ID.')}else{
 const genesys=function(...args){genesys.q=genesys.q||[];genesys.q.push(args)};genesys.q=[];genesys.t=Date.now();genesys.c={environment,deploymentId};window.Genesys=genesys;
 cmd('subscribe','Messenger.ready',()=>{diag({event:'Messenger.ready'});notify('ready','Messenger.ready',{elapsedMs:Math.round(performance.now()-runtimeStartedAt)});startBounds();cmd('subscribe','MessagingService.started',applyParticipantData)});
 cmd('subscribe','Messenger.opened',()=>{applyParticipantData();diag({event:'Messenger.opened'});notify('opened','Messenger opened');setTimeout(reportBounds,50);setTimeout(reportBounds,300)});
 cmd('subscribe','Messenger.closed',()=>{diag({event:'Messenger.closed'});notify('closed','Messenger closed');setTimeout(reportBounds,50);setTimeout(reportBounds,300)});
 const s=document.createElement('script');s.id='genesys-messenger-bootstrap';s.src=`https://${scriptHost}/genesys-bootstrap/genesys.min.js`;s.async=true;s.charset='utf-8';s.onload=()=>notify('bootstrap','Genesys bootstrap loaded',{elapsedMs:Math.round(performance.now()-runtimeStartedAt)});s.onerror=()=>notify('error','Genesys bootstrap failed to load');document.head.appendChild(s);
}

// CX Toolkit runtime v4: clear the active conversation and wait for Genesys to confirm it.
let toolkitClearInFlight=false;
function clearToolkitMessengerSession(){
  if(toolkitClearInFlight)return;
  toolkitClearInFlight=true;
  let finished=false;
  const done=(mode)=>{if(finished)return;finished=true;toolkitClearInFlight=false;diag({event:'toolkit-session-cleared',mode});notify('cleared','Messenger test conversation cleared',{mode})};
  const fallback=setTimeout(()=>done('timeout'),4000);
  try{cmd('subscribe','MessagingService.conversationCleared',()=>{clearTimeout(fallback);done('conversationCleared')})}catch{}
  try{
    cmd('command','MessagingService.clearConversation',{},()=>{diag({event:'clearConversation-command-complete'})},e=>{diag({event:'clearConversation-command-error',message:String(e||'')});clearTimeout(fallback);done('command-error')});
  }catch(e){diag({event:'clearConversation-exception',message:e.message});clearTimeout(fallback);done('exception')}
}
window.addEventListener('message',e=>{if(e.data?.source==='cx-toolkit-parent'&&e.data?.type==='clear-session')clearToolkitMessengerSession()});
