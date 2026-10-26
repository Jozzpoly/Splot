// CPU diagnostics, not GPU timing. Summarize an already bounded ring window.
// At high refresh, many render frames have no fixed simulation step: reporting
// median CPU per render frame alone as "physics cost" is misleading.
export function summarizePerfFrames(frames){
 const valid=frames.filter(f=>f&&Number.isFinite(f.rafMs)&&f.rafMs>0);
 const values=k=>valid.map(x=>x[k]).filter(Number.isFinite).sort((a,b)=>a-b);
 const percentile=(v,q)=>v.length?v[Math.min(v.length-1,Math.floor((v.length-1)*q))]:null;
 const out={frames:valid.length};
 for(const k of ['rafMs','simulationCpuMs','geometryCpuMs','drawSubmissionCpuMs','triangles']){
  const v=values(k);out[k]={median:percentile(v,.5),p95:percentile(v,.95)};
 }
 const sum=k=>valid.reduce((t,x)=>t+(Number.isFinite(x[k])?x[k]:0),0);
 const steps=sum('physicsSteps'),wallMs=sum('rafMs'),simMs=sum('simulationCpuMs');
 const stepping=valid.filter(f=>f.physicsSteps>0&&Number.isFinite(f.simulationCpuMs));
 const active=stepping.map(f=>f.simulationCpuMs).sort((a,b)=>a-b);
 out.physics={
  steps,
  framesWithSteps:stepping.length,
  medianActiveFrameCpuMs:percentile(active,.5),
  p95ActiveFrameCpuMs:percentile(active,.95),
  cpuMsPerStep:steps?simMs/steps:null,
  cpuMsPerWallSecond:wallMs>0?simMs*1000/wallMs:null,
  windowWallMs:wallMs,
  // This is per *render interval*, including fixed-step catch-up; not CPU %.
  fixedStepRatePerWallSecond:wallMs>0?steps*1000/wallMs:null
 };
 return out;
}
