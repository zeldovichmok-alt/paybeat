const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {EventEmitter}=require('node:events');
const {compareVersions}=require('../桌面桌宠/version.cjs');
// Exercise the production module with a deterministic HTTPS transport; never
// contact GitHub or open a browser during update verification.
function fixture(scenario={}){
  const requests=[],dialogs=[],links=[];let destroyed=false;
  const sandbox={module:{exports:{}},Buffer,
    setTimeout:fn=>{if(scenario.timeout)queueMicrotask(fn);return 1;},clearTimeout:()=>{},
    require:name=>name==='./version.cjs'?{compareVersions}:name==='node:https'?{get:(url,options,callback)=>{
      requests.push({url,options});const request=new EventEmitter();request.destroy=()=>{destroyed=true;};
      queueMicrotask(()=>{
        if(scenario.timeout)return;
        if(scenario.error){request.emit('error',new Error('offline'));return;}
        const response=new EventEmitter();response.statusCode=scenario.status||200;
        response.setEncoding=()=>{};response.resume=()=>{};response.destroy=()=>{};callback(response);
        if(scenario.abort){response.emit('aborted');return;}
        if(scenario.streamError){response.emit('error',new Error('stream'));return;}
        response.emit('data',scenario.raw??JSON.stringify(scenario.release||{tag_name:'v2.3.1',body:'更新说明',html_url:'https://example.com/untrusted'}));response.emit('end');
      });return request;
    }}:require(name)
  };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../桌面桌宠/updates.cjs'),'utf8'),sandbox);
  const api=sandbox.module.exports;
  const check=api.createUpdateChecker({currentVersion:'2.2.0',showMessage:async options=>{dialogs.push(options);return {response:scenario.response??0};},openExternal:async url=>{if(scenario.openError)throw Error('browser unavailable');links.push(url);}});
  return {api,check,requests,dialogs,links,destroyed:()=>destroyed};
}
(async()=>{
  for(const [left,right,sign] of [['2.2.1','2.2.0',1],['2.10.0','2.9.9',1],['v2.2.0','2.2.0',0],['2.1.9','2.2.0',-1],['3.0.0','2.99.99',1]])assert.equal(Math.sign(compareVersions(left,right)),sign);
  const newer=fixture();await Promise.all([newer.check(),newer.check(),newer.check()]);
  assert.equal(newer.requests.length,1);assert.equal(newer.dialogs[0].title,'发现 PayBeat 新版本');
  assert.deepEqual(newer.links,['https://github.com/zeldovichmok-alt/paybeat/releases/tag/v2.3.1']);
  assert.equal(newer.requests[0].url,'https://api.github.com/repos/zeldovichmok-alt/paybeat/releases/latest');
  assert.deepEqual(JSON.parse(JSON.stringify(newer.requests[0].options)),{headers:{'User-Agent':'PayBeat-Desktop',Accept:'application/vnd.github+json'}});
  console.log('PASS version ordering, coalesced checks, public-only request and fixed download destination');
  for(const [tag,title] of [['v2.2.0','PayBeat 已是最新版本'],['v2.1.0','当前使用本地新版']]){
    const f=fixture({release:{tag_name:tag}});await f.check();assert.equal(f.dialogs[0].title,title);assert.equal(f.links.length,0);
  }
  const cancel=fixture({response:1});await cancel.check();assert.equal(cancel.links.length,0);
  console.log('PASS equal/older release and user cancellation never open a download');
  for(const scenario of [{status:403},{status:404},{status:503},{error:true},{timeout:true},{abort:true},{streamError:true},{raw:'not json'},{raw:'x'.repeat(512*1024+1)},{release:{tag_name:'v2.3.0-beta',prerelease:true}},{release:{tag_name:'v2.3.0',draft:true}},{release:{tag_name:'../../../other'}}]){
    const f=fixture(scenario);await f.check();assert.equal(f.dialogs[0].title,'检查更新失败',JSON.stringify(scenario).slice(0,120));assert.equal(f.links.length,0);
    if(scenario.timeout)assert.ok(f.destroyed());
    await f.check();assert.equal(f.requests.length,2,'failure releases the check lock for retry');
  }
  console.log('PASS offline, HTTP errors, timeout, interrupted/oversized/invalid responses and retry');
  const openFailure=fixture({openError:true});await openFailure.check();assert.equal(openFailure.dialogs[1].title,'下载页未能打开');
  console.log('PASS browser-open failure has a recoverable message');
  console.log('RESULT 4 update suites passed; no real network requests');
})().catch(error=>{console.error(error);process.exitCode=1;});
