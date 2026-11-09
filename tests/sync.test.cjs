const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../weights.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const firebaseConfig={apiKey:'public-test-key',authDomain:'test.firebaseapp.com',projectId:'weights-test',appId:'test-app'};
const workout=[{type:'biceps',sets:[{reps:12,weight:30}]}];
const result=value=>JSON.parse(JSON.stringify(value));
function fakeFirebase(cloud=new Map(),restoredUser=null){
 let callback,user=restoredUser;
 const service={cloud,popupCount:0,persistence:null,reads:0,writes:0,failRead:false,failSignOut:false};
 const auth={
  async setPersistence(value){service.persistence=value},
  onAuthStateChanged(fn){callback=fn;service.restoration=Promise.resolve().then(()=>fn(user));},
  async signInWithPopup(){service.popupCount++;user={uid:'alice',email:'alice@example.com'};await callback(user)},
  async signOut(){if(service.failSignOut)throw Error('Logout failed');user=null;await callback(null)}
 };
 function collection(uid){return {
  limit(){return this},
  async get(options){assert.equal(options.source,'server');service.reads++;if(service.beforeRead)await service.beforeRead(uid);if(service.failRead)throw Error('Network unavailable');const rows=[...(cloud.get(uid)||new Map()).entries()];return {size:rows.length,forEach(fn){rows.forEach(([id,data])=>fn({id,data:()=>result(data)}))}}},
  doc(id){return {async set(data){service.writes++;if(!cloud.has(uid))cloud.set(uid,new Map());const existing=cloud.get(uid).get(id);if(existing&&JSON.stringify(existing)!==JSON.stringify(data))throw Error('permission-denied');cloud.get(uid).set(id,result(data));}}}
 }};
 const db={collection(name){
  assert.equal(name,'users');
  return {doc(uid){return {collection(name){assert.equal(name,'weightsRevisions');return collection(uid)}}}};
 }};
 const authFactory=()=>auth;authFactory.Auth={Persistence:{LOCAL:'local'}};authFactory.GoogleAuthProvider=class {};
 const sdk={apps:[],auth:authFactory,firestore:()=>db,initializeApp(options,name){const app={name,options,auth:()=>auth,firestore:()=>db};sdk.apps.push(app);return app}};
 service.sdk=sdk;service.changeUser=async next=>{user=next;await callback(next)};return service;
}
function app(initial={},firebaseService=null){
 const storage=new Map(Object.entries(initial)),elements=new Map(),timers=[],windowEvents={};
 function element(){return {textContent:'',innerHTML:'',value:'',checked:false,disabled:false,open:false,dataset:{},children:[],classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn},querySelectorAll(){return []},contains(){return false},replaceChildren(){this.children=[]},appendChild(el){this.children.push(el)},showModal(){this.open=true},close(){this.open=false}};}
 const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll(){return []},createElement:element,head:element(),addEventListener(){},activeElement:null};
 const window={isSecureContext:true,navigator:{onLine:true},addEventListener(name,fn){windowEvents[name]=fn}};
 if(firebaseService)window.firebase=firebaseService.sdk;
 const ctx=vm.createContext({document,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)},crypto:webcrypto,Intl,Date,Uint8Array,Map,Set,console,location:{protocol:'https:'},setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length},clearTimeout(){},window});
 // Isolate tests from the deployed project; mock Firebase setup is explicit.
 vm.runInContext(source.replace(/const FIREBASE_CONFIG = [\s\S]*?;/, 'const FIREBASE_CONFIG = null;'),ctx);return {ctx,storage,elements,timers,windowEvents,run:code=>vm.runInContext(code,ctx)};
}
async function signedIn(initial={},service=fakeFirebase()){
 const a=app(initial,service);await a.run('config='+JSON.stringify(firebaseConfig)+';startFirebase()');await service.restoration;
 await service.changeUser({uid:'alice',email:'alice@example.com'});return {a,service};
}
test('migrates local workouts without losing defaults, icons or legacy storage',()=>{
 const legacy=JSON.stringify({'2026-11-09':workout});const a=app({weights_logs_v1:legacy});
 assert.equal(a.run('syncReady'),true);assert.equal(a.run('syncState.records.length'),1);
 assert.equal(a.run("total(logs['2026-11-09'])"),360);assert.equal(a.run("exerciseIcon('calves')===exerciseIcon('quads')"),true);
 assert.equal(a.run('defaultSet("biceps").reps'),12);assert.equal(a.storage.get('weights_logs_v1'),legacy);
 assert.equal(JSON.parse(a.storage.get('weights_firebase_guest_v1')).version,2);
});
test('restores local history and preserves corrupt stored data',()=>{
 const a=app({weights_logs_v1:JSON.stringify({'2026-11-09':workout})});
 const b=app(Object.fromEntries(a.storage));assert.equal(b.run('syncState.records.length'),1);
 const bad='{"version":2,"account":null,"records":[{}]}';
 const c=app({weights_firebase_guest_v1:bad});assert.equal(c.run('logs'),null);assert.equal(c.storage.get('weights_firebase_guest_v1'),bad);
});
test('merges independent days, preserves deletions and explicit conflict resolution',()=>{
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
 a.run("history.push(newRevision('2026-11-09',[],heads(history,'2026-11-09')))");
 assert.equal(a.run("heads(history,'2026-11-09').length"),1);assert.equal(a.run("projected(history)['2026-11-09']"),undefined);
 assert.throws(()=>a.run('validateRecords([deleted])'),/Incomplete/);
});
test('explicit LOCAL persistence restores a Firebase session at startup without a popup',async()=>{
 const service=fakeFirebase(new Map(),{uid:'alice',email:'alice@example.com'});
 const a=app({weights_firebase_config_v1:JSON.stringify(firebaseConfig)},service);
 await new Promise(resolve=>setImmediate(resolve));await service.restoration;
 assert.equal(service.persistence,'local');assert.equal(service.popupCount,0);assert.equal(a.run('currentUser.uid'),'alice');
 assert.equal(service.reads,1);assert.equal(a.run("$('authGate').open"),false);
});
test('manual Sync reuses Firebase session and never opens another login popup',async()=>{
 const {a,service}=await signedIn();const reads=service.reads;
 await a.run('handleSyncClick()');await a.run('handleSyncClick()');
 assert.equal(service.reads,reads+2);assert.equal(service.popupCount,0);
 assert.equal(a.run("$('syncDialog').open"),false);assert.equal(a.run("$('openSync').textContent"),'☁ Sync now');
});
test('two devices sync revisions, deduplicate retries and propagate deletion',async()=>{
 const cloud=new Map(),first=await signedIn({},fakeFirebase(cloud));
 first.a.run("selected='2026-11-09';logs[selected]="+JSON.stringify(workout)+';persist()');await first.a.run('syncNow()');
 const second=await signedIn({},fakeFirebase(cloud));assert.equal(second.a.run("total(logs['2026-11-09'])"),360);
 assert.equal(first.service.writes,1);await first.a.run('syncNow()');assert.equal(first.service.writes,1);
 first.a.run("delete logs[selected];persist()");await first.a.run('syncNow()');await second.a.run('syncNow()');
 assert.deepEqual(result(second.a.run('logs')),{});
});
test('offline import requires an explicit action and is not offered to a different account later',async()=>{
 const {a,service}=await signedIn({weights_logs_v1:JSON.stringify({'2026-11-09':workout})});
 assert.deepEqual(result(a.run('logs')),{});assert.equal(service.writes,0);
 a.run('importOfflineWorkouts()');assert.equal(a.run("total(logs['2026-11-09'])"),360);await a.run('syncNow()');assert.equal(service.writes,1);
 assert.equal(JSON.parse(a.storage.get('weights_firebase_guest_v1')).records.length,0);
 assert.ok(a.storage.get('weights_legacy_imported_v1'));
 await a.run('signOut()');await service.changeUser({uid:'bob',email:'bob@example.com'});assert.deepEqual(result(a.run('logs')),{});
 assert.equal(a.run('offlineRecords().length'),0);assert.equal(service.cloud.has('bob'),false);
});
test('logout hides account data, retains unsynced cache and restores it only for the same UID',async()=>{
 const {a,service}=await signedIn();a.run("selected='2026-11-09';logs[selected]="+JSON.stringify(workout)+';persist()');
 await a.run('signOut()');assert.equal(a.run('currentUser'),null);assert.deepEqual(result(a.run('logs')),{});assert.equal(a.run("$('authGate').open"),true);
 await service.changeUser({uid:'bob'});assert.deepEqual(result(a.run('logs')),{});
 await service.changeUser({uid:'alice'});assert.equal(a.run("total(logs['2026-11-09'])"),360);
});
test('logout failure keeps the current account and workouts',async()=>{
 const {a,service}=await signedIn();service.failSignOut=true;await a.run('signOut()');
 assert.equal(a.run('currentUser.uid'),'alice');assert.match(a.run("$('syncStatus').textContent"),/Logout failed/);
});
test('network errors and offline use retain pending local workouts',async()=>{
 const {a,service}=await signedIn();a.run("logs[selected]="+JSON.stringify(workout)+';persist()');service.failRead=true;
 assert.equal(await a.run('syncNow()'),false);assert.equal(a.run('total(day())'),360);assert.equal(service.writes,0);
 a.run('window.navigator.onLine=false');assert.equal(await a.run('syncNow()'),false);assert.equal(a.run('syncBusy'),false);
});
test('invalid cloud revision cannot overwrite local data or upload pending changes',async()=>{
 const {a,service}=await signedIn();a.run("logs[selected]="+JSON.stringify(workout)+';persist()');
 service.cloud.set('alice',new Map([['bad',{version:1,p:'{}'}]]));
 assert.equal(await a.run('syncNow()'),false);assert.equal(service.writes,0);assert.equal(a.run('total(day())'),360);
});
test('automatic sync is scheduled only after real edits, never merely focusing a field',async()=>{
 const {a,service}=await signedIn();const baseline=a.timers.filter(t=>t.delay===1800).length,reads=service.reads;
 a.run('persist()');a.elements.get('machines').listeners.focusout();assert.equal(a.timers.filter(t=>t.delay===1800).length,baseline);
 a.run("logs[selected]=[{type:'bike',minutes:10}];persist()");
 const scheduled=a.timers.filter(t=>t.delay===1800);assert.equal(scheduled.length,baseline+1);assert.equal(service.reads,reads);
 await scheduled.at(-1).fn();assert.equal(service.reads,reads+1);assert.equal(a.run('autoSyncPending'),false);
 const count=a.timers.filter(t=>t.delay===1800).length;a.run('persist()');a.elements.get('machines').listeners.focusout();assert.equal(a.timers.filter(t=>t.delay===1800).length,count);
 assert.equal(a.windowEvents.online,undefined);
});
test('copies the latest earlier nonempty workout without altering its source',()=>{
 const history={'2026-11-05':workout,'2026-11-07':[{type:'bike',minutes:8.5},{type:'biceps',sets:[{reps:9,weight:35},{reps:7,weight:40}]}],'2026-11-08':[],'2026-11-12':[{type:'bike',minutes:30}]};
 const a=app({weights_logs_v1:JSON.stringify(history)});a.run("selected='2026-11-09';copyLastWorkout()");
 assert.deepEqual(result(a.run('logs[selected]')),history['2026-11-07']);assert.equal(a.run('total(day())'),595);
 a.run("logs[selected][1].sets[0].weight=50;logs[selected][0].minutes=12");
 assert.equal(a.run("logs['2026-11-07'][1].sets[0].weight"),35);assert.equal(a.run("logs['2026-11-07'][0].minutes"),8.5);
 const restored=app(Object.fromEntries(a.storage));assert.deepEqual(result(restored.run("logs['2026-11-09']")),history['2026-11-07']);
});
test('copy never overwrites entries, uses future days, or runs during sync',()=>{
 const a=app({weights_logs_v1:JSON.stringify({'2026-11-09':workout})});
 a.run("selected='2026-11-08';copyLastWorkout()");assert.equal(a.run('logs[selected]'),undefined);
 a.run("selected='2026-11-09';copyLastWorkout()");assert.equal(a.run('syncState.records.length'),1);
 a.run("selected='2026-11-10';syncBusy=true;copyLastWorkout()");assert.equal(a.run('logs[selected]'),undefined);
});
test('legacy Drive history is preserved and staged offline without a Drive request',()=>{
 const revision={id:webcrypto.randomUUID(),date:'2026-11-09',machines:workout,parents:[],time:Date.now()};
 const legacy=JSON.stringify({version:2,account:'old-drive-user',records:[revision]});const a=app({weights_sync_v2:legacy});
 assert.equal(a.run("total(logs['2026-11-09'])"),360);assert.equal(a.run('syncState.account'),null);assert.equal(a.storage.get('weights_sync_v2'),legacy);
});
test('account cache keys isolate projects as well as user IDs',()=>{
 const a=app();a.run("configuredProject='first'");const first=a.run("accountStore('alice')");
 a.run("configuredProject='second'");assert.notEqual(first,a.run("accountStore('alice')"));
});

test('an old account sync cannot mutate the next account after an auth change',async()=>{
 const {a,service}=await signedIn();let release;
 service.beforeRead=uid=>uid==='alice'?new Promise(resolve=>{release=resolve}):Promise.resolve();
 const pending=a.run('syncNow()');await service.changeUser({uid:'bob'});
 release();await pending;
 assert.equal(a.run('currentUser.uid'),'bob');assert.equal(a.run('syncState.account'),'bob');
 assert.equal(a.run('activeStore'),a.run("accountStore('bob')"));assert.equal(a.run('syncBusy'),false);
});
