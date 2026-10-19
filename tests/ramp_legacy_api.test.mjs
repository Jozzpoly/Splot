import test from 'node:test';
import assert from 'node:assert/strict';
import {rampHeight} from '../src/world.mjs';
test('historical one-argument rampHeight remains clamped outside the ramp',()=>{
 assert.equal(rampHeight(33),0);assert.equal(rampHeight(39),2.6);
 assert.equal(rampHeight(34),0);assert.equal(rampHeight(37),2.6);
});
