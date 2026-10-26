// Build contract only. Does not assert WebGL rendering or Box3D runtime physics.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const template=fs.readFileSync(new URL('../src/next/index.html',import.meta.url),'utf8');
const standalone=fs.readFileSync(new URL('../src/next/Splot_Next_GRAJ.html',import.meta.url),'utf8');
assert.match(template,/<script type="module" src="\.\/app\.mjs"><\/script>/);
const found=[...standalone.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.equal(found.length,1,'standalone must have exactly one inline game script');
assert.doesNotMatch(standalone,/<script\s+type="module"\s+src="\.\/app\.mjs"/);
new vm.Script(found[0][1],{filename:'Splot_Next_GRAJ.inline.js'});
assert.match(standalone,/id="world"/);
assert.match(standalone,/id="test-toggle"/);
assert.match(standalone,/id="actor-contact"/);
assert.match(standalone,/id="boar-behavior"/);
assert.match(standalone,/id="active-mode"/);
console.log('PASS: standalone inline JavaScript parses; expected tools exist');
