import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePerfFrames} from '../../src/next/perf-metrics.mjs';
test('240Hz rAF with 60Hz physics is not reported as zero physical CPU',()=>{
 const frames=Array.from({length:240},(_,i)=>({
  rafMs:1000/240,physicsSteps:i%4===0?1:0,
  simulationCpuMs:i%4===0?1.5:0,geometryCpuMs:.2,
  drawSubmissionCpuMs:.15,triangles:3300
 }));
 const p=summarizePerfFrames(frames);
 assert.equal(p.simulationCpuMs.median,0,'legacy median is indeed misleading');
 assert.equal(p.physics.steps,60);
 assert.equal(p.physics.framesWithSteps,60);
 assert.equal(p.physics.cpuMsPerStep,1.5);
 assert.ok(Math.abs(p.physics.cpuMsPerWallSecond-90)<1e-8);
 assert.ok(Math.abs(p.physics.fixedStepRatePerWallSecond-60)<1e-8);
 assert.equal(p.physics.medianActiveFrameCpuMs,1.5);
});
test('paused or purely rendered scene reports no step-cost instead of fake zero',()=>{
 const frames=Array.from({length:50},()=>({
  rafMs:16.667,physicsSteps:0,simulationCpuMs:0,
  geometryCpuMs:.1,drawSubmissionCpuMs:.15,triangles:100
 }));
 const p=summarizePerfFrames(frames);
 assert.equal(p.physics.steps,0);
 assert.equal(p.physics.cpuMsPerStep,null);
 assert.equal(p.physics.framesWithSteps,0);
});
test('catch-up physics counts cost per step rather than per frame',()=>{
 const frames=[{rafMs:60,physicsSteps:3,simulationCpuMs:9,
 geometryCpuMs:2,drawSubmissionCpuMs:1,triangles:2000}];
 const p=summarizePerfFrames(frames);
 assert.equal(p.physics.cpuMsPerStep,3);
 assert.equal(p.physics.cpuMsPerWallSecond,150);
 assert.equal(p.physics.framesWithSteps,1);
});
