const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../weights.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function app(initial={},fetch=()=>{throw Error('Unexpected network request')}){
 const storage=new Map(Object.entries(initial)),elements=new Map(),timers=[];
 function element(){return {textContent:'',innerHTML:'',value:'',checked:false,disabled:false,open:false,dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn},querySelectorAll(){return []},contains(){return false},replaceChildren(){this.children=[]},appendChild(el){this.children.push(el)},showModal(){this.open=true},close(){this.open=false}};}
 const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll(){return []},createElement:element,head:element(),addEventListener(){},activeElement:null};
 const ctx=vm.createContext({document,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)},crypto:webcrypto,TextEncoder,TextDecoder,URLSearchParams,Intl,Date,Uint8Array,Map,Set,console,btoa,atob,fetch,location:{protocol:'https:'},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},window:{isSecureContext:true,addEventListener(){}}});
 vm.runInContext(source,ctx);return {ctx,storage,elements,timers,run:code=>vm.runInContext(code,ctx)};
}
const workout=[{type:'biceps',sets:[{reps:12,weight:30}]}];
function result(value){return JSON.parse(JSON.stringify(value));}
test('migrates local workouts, defaults and icons remain valid',()=>{
 const a=app({weights_logs_v1:JSON.stringify({'2026-11-09':workout})});
 assert.equal(a.run('syncReady'),true);assert.equal(a.run('syncState.records.length'),1);
 assert.equal(a.run("total(logs['2026-11-09'])"),360);
 assert.equal(a.run("exerciseIcon('calves')===exerciseIcon('quads')"),true);
 assert.equal(a.run('defaultSet("biceps").reps'),12);
 assert.equal(JSON.parse(a.storage.get('weights_sync_v2')).version,2);
});
test('restores authoritative revision state and preserves corrupt data',()=>{
 const a=app({weights_logs_v1:JSON.stringify({'2026-11-09':workout})});
 const b=app(Object.fromEntries(a.storage));assert.equal(b.run('syncState.records.length'),1);
 const bad='{"version":2,"account":null,"records":[{}]}';
 const c=app({weights_sync_v2:bad});assert.equal(c.run('logs'),null);assert.equal(c.storage.get('weights_sync_v2'),bad);
});
test('merges independent days, preserves deletions and same-day conflicts',()=>{
 const a=app();a.run(`
 const original=newRevision('2026-11-09',${JSON.stringify(workout)},[]);
 const deleted=newRevision('2026-11-09',[],[original]);
 const edited=newRevision('2026-11-09',[{type:'bike',minutes:15}],[original]);
 const otherDay=newRevision('2026-11-10',${JSON.stringify(workout)},[]);
 const history=[original,deleted,edited,otherDay];validateRecords(history);
 `);
 assert.equal(a.run("heads(history,'2026-11-09').length"),2);
 assert.equal(a.run("projected([original,deleted])['2026-11-09']"),undefined);
 assert.equal(a.run("total(projected(history)['2026-11-10'])"),360);
 a.run("const resolution=newRevision('2026-11-09',[],heads(history,'2026-11-09'));history.push(resolution)");
 assert.equal(a.run("heads(history,'2026-11-09').length"),1);
 assert.equal(a.run("projected(history)['2026-11-09']"),undefined);
 assert.throws(()=>a.run('validateRecords([deleted])'),/Incomplete/);
});
test('local edits record deletion and keep competing versions',()=>{
 const a=app({weights_logs_v1:JSON.stringify({'2026-11-09':workout})});
 a.run("selected='2026-11-09';logs={};persist()");
 assert.equal(a.run('syncState.records.length'),2);
 assert.equal(a.run("heads(syncState.records,selected)[0].machines.length"),0);
 const b=app(Object.fromEntries(a.storage));assert.deepEqual(result(b.run('logs')),{});
});
test('validates cloud format and revision identity before merging',()=>{
 const a=app();a.run("globalThis.r=newRevision('2026-11-09',[],[])");
 assert.equal(a.run('readRevision({version:3,record:r},r.id).id'),a.run('r.id'));
 assert.throws(()=>a.run("readRevision({version:3,record:r},'wrong-id')"),/Invalid/);
 assert.throws(()=>a.run('readRevision({version:2,record:r},r.id)'),/Invalid/);
});
test('Google-only Drive sync restores workouts and propagates deletions',async()=>{
 const files=[];let uploads=0;
 const fetch=async(url,options={})=>{
  assert.equal(options.headers.Authorization,'Bearer test-token');
  if(options.method==='POST'){
   uploads++;assert.ok(options.body.includes('biceps')||options.body.includes('machines'));assert.ok(!options.body.includes('PBKDF2'));
   const parts=options.body.split('\r\n\r\n');const meta=JSON.parse(parts[1].split('\r\n')[0]);const payload=JSON.parse(parts[2].split('\r\n')[0]);
   files.push({id:'file-'+uploads,name:meta.name,data:payload});return {ok:true,json:async()=>({id:'file-'+uploads})};
  }
  if(url.includes('alt=media')){const f=files.find(f=>url.includes('/'+f.id+'?'));return {ok:true,json:async()=>f.data};}
  return {ok:true,json:async()=>({files:files.map(({id,name})=>({id,name}))})};
 };
 const a=app({weights_logs_v1:JSON.stringify({'2026-11-09':workout})},fetch);
 const unlock="token='test-token';tokenUntil=Date.now()+3600000;activeAccount='account-A';";
 await a.run(unlock+'syncNow()');assert.equal(uploads,1);assert.equal(a.run('syncState.account'),'account-A');
 const b=app({},fetch);await b.run(unlock+'syncNow()');
 assert.equal(b.run("total(logs['2026-11-09'])"),360);assert.equal(uploads,1);
 a.run("selected='2026-11-09';delete logs[selected];persist()");await a.run('syncNow()');
 assert.equal(uploads,2);await b.run('syncNow()');assert.deepEqual(result(b.run('logs')),{});
 // Retries deduplicate already uploaded revisions.
 await a.run('syncNow()');assert.equal(uploads,2);
});
test('expired session never sends requests; disconnect clears access token',async()=>{
 const a=app();a.run("token='secret';tokenUntil=0;activeAccount='A'");
 await assert.rejects(a.run("driveRequest('drive/v3/files')"),/expired/);
 a.run('lockSync()');assert.equal(a.run('token'), '');assert.equal(a.run('activeAccount'),'');
});
test('OAuth callback rejects a different account before uploads',async()=>{
 let uploads=0;
 const a=app({},async(url,options)=>{if(options?.method==='POST')uploads++;return {ok:true,json:async()=>({user:{permissionId:'account-B',emailAddress:'b@example.com'}})}});
 a.run(`
 syncState.account='account-A';
 window.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:options=>{globalThis.oauthOptions=options;return {requestAccessToken(){}}}}}};
 globalThis.google=window.google;
 $('clientId').value='test.apps.googleusercontent.com';$('uploadConsent').checked=true;
 connectDrive();
 `);
 await a.run("oauthOptions.callback({access_token:'test-token',expires_in:3600})");
 assert.equal(uploads,0);assert.equal(a.run('syncState.account'),'account-A');assert.equal(a.run('token'),'');
 assert.match(a.elements.get('syncStatus').textContent,/another Google account/);
});
test('network failure preserves pending local data for retry',async()=>{
 const a=app({weights_logs_v1:JSON.stringify({'2026-11-09':workout})},async()=>{throw Error('Network unavailable')});
 await a.run("token='test';tokenUntil=Date.now()+3600000;activeAccount='A';syncNow()");
 assert.equal(a.run('syncState.records.length'),1);assert.equal(a.run('syncState.account'),null);
 assert.equal(a.run("total(logs['2026-11-09'])"),360);assert.match(a.elements.get('syncStatus').textContent,/Network/);
});

test('legacy encrypted data blocks uploads until all revisions are available locally',async()=>{
 const original=app({weights_logs_v1:JSON.stringify({'2026-11-09':workout})});
 const record=result(original.run('syncState.records[0]'));let uploads=0;
 const fetch=async(url,options={})=>{
  if(options.method==='POST'){uploads++;return {ok:true,json:async()=>({id:'new-file'})};}
  return {ok:true,json:async()=>({files:[{id:'old-file',name:'weights-revision-v2-'+record.id+'.json'}]})};
 };
 const fresh=app({},fetch);const connect="token='test';tokenUntil=Date.now()+3600000;activeAccount='A';syncNow()";
 await fresh.run(connect);assert.equal(uploads,0);assert.equal(fresh.run('syncState.account'),null);
 assert.match(fresh.elements.get('syncStatus').textContent,/migration/);
 const existing=app(Object.fromEntries(original.storage),fetch);await existing.run(connect);assert.equal(uploads,1);
});

test('main Sync button reuses a valid session without opening the connection menu',async()=>{
 let requests=0;const a=app({},async()=>{requests++;return {ok:true,json:async()=>({files:[]})}});
 await a.run("token='test';tokenUntil=Date.now()+3600000;activeAccount='A';handleSyncClick()");
 assert.equal(requests,1);assert.equal(a.run("$('syncDialog').open"),false);
 assert.equal(a.elements.get('openSync').textContent,'☁ Sync now');
});
test('main Sync button opens connection menu when the session expires',()=>{
 const a=app();a.run("window.google={accounts:{oauth2:{}}};token='expired';tokenUntil=0;handleSyncClick()");
 assert.equal(a.elements.get('syncDialog').open,true);assert.equal(a.run('token'),'');
 assert.equal(a.elements.get('openSync').textContent,'☁ Connect Google Drive');
});

test('automatic sync is scheduled only by actual edits, not unchanged fields',async()=>{
 let requests=0;const a=app({},async()=>{requests++;return {ok:true,json:async()=>({files:[]})}});
 a.run("token='test';tokenUntil=Date.now()+3600000;activeAccount='A';persist()");
 a.elements.get('machines').listeners.focusout();assert.equal(a.timers.length,0);assert.equal(requests,0);
 a.run("logs[selected]=[{type:'bike',minutes:10}];persist()");
 assert.equal(a.timers.length,1);assert.equal(requests,0);assert.equal(a.run('autoSyncPending'),true);
 await a.timers.at(-1)();assert.equal(requests,2);assert.equal(a.run('autoSyncPending'),false);
 const timerCount=a.timers.length;a.run('persist()');a.elements.get('machines').listeners.focusout();assert.equal(a.timers.length,timerCount);
});
