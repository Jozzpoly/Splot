import test from 'node:test';
import assert from 'node:assert/strict';
import {compliantActorImpulse} from '../../src/next/actor-contact.mjs';

// Deliberately weaker than a full Box3D/Donor test. Shows why a correct,
// bounded impulse is not proof of a good actor-contact experience.
function run(mode,vaTarget=4.1,vbTarget=-2.6){
 const a={x:0,y:0,z:0,r:.32,h:1.6,mass:76},b={x:3,y:0,z:0,r:.43,h:.75,mass:82};
 let va=0,vb=0,minGap=999,penetrating=0;
 const dt=1/60;
 for(let k=0;k<180;k++){
  const max=31*dt;
  va+=Math.max(-max,Math.min(max,vaTarget-va));
  vb+=Math.max(-max,Math.min(max,vbTarget-vb));
  if(mode==='compliant'){
   const q=compliantActorImpulse(a,b,[va,0],[vb,0],dt);
   va+=q.ax;vb+=q.bx;
  }
  a.x+=va*dt;b.x+=vb*dt;
  const gap=Math.abs(b.x-a.x)-a.r-b.r;
  minGap=Math.min(minGap,gap);
  if(gap<0)penetrating++;
 }
 return {minGap,penetrating};
}
test('known RED research boundary: current bounded impulse does not prevent head-on passage',()=>{
 const ghost=run('ghost'),soft=run('compliant');
 assert.ok(soft.minGap<-.55,
  'if this fails, the hypothesis may have improved; rerun actual engine and gameplay QA');
 assert.ok(ghost.minGap<-.55);
 // The pressure experiment is evidence about limitations, not a green
 // acceptance gate for actor contact. A meaningful improvement requires
 // solver-level contact and/or independent actor-intent policy.
});
test.todo('acceptance: no violent jitter, credible mass exchange, natural bypass in live Box3D world');
test.todo('acceptance: moving support, tight doorway, real Owner feel and no focus interruptions');
