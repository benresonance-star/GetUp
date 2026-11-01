/* MOTION12 r86 - permission-based, night-before web push. The workout plan
   never leaves the device; the server only retains the push subscription. */
(function(){
  'use strict';
  const BASE='https://motion12-evening-push.vercel.app';
  const CODE_KEY='motion12.reminderAccessCode';
  const $=id=>document.getElementById(id);
  let busy=false;

  function status(message, kind=''){
    const node=$('flowReminderStatus');
    if(node){node.textContent=message;node.className='reminder-status '+kind;}
  }
  function supported(){
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
  }
  function installed(){
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }
  function code(){return ($('flowReminderCode')?.value||'').trim();}
  function saveCode(){
    try{localStorage.setItem(CODE_KEY,code());}catch(_){}
  }
  async function request(path, method='GET', data){
    const response=await fetch(BASE+path,{
      method,mode:'cors',cache:'no-store',
      headers:data?{'Content-Type':'application/json'}:{},
      body:data?JSON.stringify(data):undefined
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(body.error||`Notification server error ${response.status}`);
    return body;
  }
  function decodeKey(encoded){
    const base64=encoded.replace(/-/g,'+').replace(/_/g,'/');
    const binary=atob(base64+'='.repeat((4-base64.length%4)%4));
    return Uint8Array.from(binary,char=>char.charCodeAt(0));
  }
  async function activeSubscription(){
    const registration=await navigator.serviceWorker.getRegistration('./');
    return registration?.pushManager?.getSubscription()||null;
  }
  async function refresh(){
    const badge=$('flowReminderBadge');
    if(!badge)return;
    let active=false;
    try{active=!!(supported() && await activeSubscription());}catch(_){}
    badge.textContent=active?'ON':'OFF';
    badge.classList.toggle('active',active);
    $('flowReminderTest').disabled=!active;
    $('flowReminderDisable').disabled=!active;
    if(!supported())status('Push notifications are unavailable here. On iPhone, add this app to the Home Screen using Safari.');
    else if(!installed())status('Add MOTION12 to your iPhone Home Screen, then open it from its icon to enable lock-screen notifications.');
    else if(Notification.permission==='denied')status('Notifications are blocked. Allow MOTION12 notifications in iPhone Settings.','error');
    else status(active?'Reminder enabled for the 7–8 pm Melbourne hour. Tap Send test to check your lock screen.':'Reminder is off. Enter the access code and tap Enable reminder.',active?'success':'');
  }
  async function withBusy(action){
    if(busy)return;
    busy=true;
    const buttons=['flowReminderEnable','flowReminderTest','flowReminderDisable'].map($).filter(Boolean);
    buttons.forEach(node=>node.disabled=true);
    try{await action();}catch(error){status(error.message||'Notification setup failed. Try again.','error');}
    finally{busy=false;buttons.forEach(node=>node.disabled=false);}
  }
  async function enable(){
    if(!supported())throw Error('Install MOTION12 to your Home Screen on a supported iPhone to receive notifications.');
    if(!installed())throw Error('Open MOTION12 from its Home Screen icon, then enable the reminder.');
    if(!code())throw Error('Enter your reminder access code first.');
    // Ask directly in response to the tap; Safari requires an explicit gesture.
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw Error('Notifications were not allowed. Check iPhone Settings.');
    const config=await request('/api/config');
    if(!config.publicKey)throw Error('The notification service is not configured yet.');
    const registration=await navigator.serviceWorker.register('./service-worker.js',{scope:'./'});
    await navigator.serviceWorker.ready;
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)});
    try{await request('/api/subscription','POST',{code:code(),subscription:subscription.toJSON()});}
    catch(error){await subscription.unsubscribe().catch(()=>{});throw error;}
    saveCode();
    status('Reminder enabled. MOTION12 will prepare you for the next morning during the 7–8 pm Melbourne hour.','success');
    await refresh();
  }
  async function disable(){
    const subscription=await activeSubscription();
    if(!subscription){await refresh();return;}
    if(!code())throw Error('Enter your reminder access code to disable notifications.');
    await request('/api/subscription','DELETE',{code:code(),endpoint:subscription.endpoint});
    await subscription.unsubscribe();
    status('Evening reminder disabled.','success');
    await refresh();
  }
  async function test(){
    const subscription=await activeSubscription();
    if(!subscription)throw Error('Enable reminders before testing.');
    if(!code())throw Error('Enter your reminder access code to send a test.');
    await request('/api/test','POST',{code:code(),endpoint:subscription.endpoint});
    saveCode();
    status('Test notification accepted. Lock your phone and check for the MOTION12 alert.','success');
  }
  function openFlow(){
    if(window.Motion12Flow?.previewTomorrow){
      try{window.showPage?.('homePage');}catch(_){}
      window.Motion12Flow.previewTomorrow();
      if(new URL(location.href).searchParams.has('flow')){
        const url=new URL(location.href);url.searchParams.delete('flow');history.replaceState(null,'',url.pathname+url.search+url.hash);
      }
    }
  }
  const input=$('flowReminderCode');
  if(input){try{input.value=localStorage.getItem(CODE_KEY)||'';}catch(_){}}
  $('flowReminderEnable')?.addEventListener('click',()=>withBusy(enable));
  $('flowReminderDisable')?.addEventListener('click',()=>withBusy(disable));
  $('flowReminderTest')?.addEventListener('click',()=>withBusy(test));
  $('settingsBtn')?.addEventListener('click',()=>{refresh().catch(()=>{});});
  navigator.serviceWorker?.addEventListener('message',event=>{
    if(event.data?.type==='M12_OPEN_FLOW_PREVIEW')openFlow();
  });
  refresh().catch(()=>{});
  if(new URL(location.href).searchParams.get('flow')==='tomorrow')setTimeout(openFlow,160);
})();
