const {test,before,after}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,deleteDoc}=require('firebase/firestore');
let env;
const id='00000000-0000-4000-8000-000000000001';
const payload={version:1,p:JSON.stringify({id,date:'2026-11-09',machines:[],parents:[],time:0})};
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-weights',firestore:{rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}})});
after(async()=>{await env?.cleanup()});
test('owner creates/reads/lists own revisions; identical retries succeed',async()=>{
 const db=env.authenticatedContext('alice').firestore(),ref=doc(db,'users/alice/weightsRevisions/'+id);
 await assertSucceeds(setDoc(ref,payload));await assertSucceeds(setDoc(ref,payload));await assertSucceeds(getDoc(ref));
 await assertSucceeds(getDocs(collection(db,'users/alice/weightsRevisions')));
});
test('another account cannot read, list or write the owner diary',async()=>{
 const db=env.authenticatedContext('bob').firestore(),ref=doc(db,'users/alice/weightsRevisions/'+id);
 await assertFails(getDoc(ref));await assertFails(getDocs(collection(db,'users/alice/weightsRevisions')));await assertFails(setDoc(ref,payload));
});
test('anonymous clients cannot read or write any diary',async()=>{
 const db=env.unauthenticatedContext().firestore(),ref=doc(db,'users/alice/weightsRevisions/'+id);
 await assertFails(getDoc(ref));await assertFails(setDoc(ref,payload));
});
test('owner cannot change or delete an existing immutable revision',async()=>{
 const db=env.authenticatedContext('alice').firestore(),ref=doc(db,'users/alice/weightsRevisions/'+id);
 await assertFails(setDoc(ref,{...payload,p:'changed'}));await assertFails(deleteDoc(ref));
});
test('unrelated collections and invalid envelope or size are rejected',async()=>{
 const db=env.authenticatedContext('alice').firestore();
 await assertFails(setDoc(doc(db,'users/alice/items/other'),payload));
 await assertFails(setDoc(doc(db,'users/alice/weightsRevisions/not-a-uuid'),payload));
 const ref=doc(db,'users/alice/weightsRevisions/00000000-0000-4000-8000-000000000002');
 await assertFails(setDoc(ref,{version:2,p:'{}'}));await assertFails(setDoc(ref,{...payload,extra:true}));
 await assertFails(setDoc(ref,{version:1,p:'x'.repeat(200001)}));
});
