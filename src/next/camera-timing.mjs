// Experimental time-domain camera follow. The default game still uses
// legacy per-rendered-frame gain until explicit Owner A/B approval.
export function followGainForSeconds(alphaAt60Hz,dtSeconds){
 if(!Number.isFinite(dtSeconds)||dtSeconds<=0)return 0;
 if(!(alphaAt60Hz>0&&alphaAt60Hz<1))throw Error('invalid-alpha');
 const dt=Math.min(.08,dtSeconds);
 return 1-Math.pow(1-alphaAt60Hz,60*dt);
}
export function advanceCameraTarget(current,desired,dtSeconds){
 if(!Array.isArray(current)||!Array.isArray(desired)||current.length!==3||desired.length!==3||
  !current.every(Number.isFinite)||!desired.every(Number.isFinite))throw Error('invalid-target');
 const xy=followGainForSeconds(.16,dtSeconds),z=followGainForSeconds(.10,dtSeconds);
 return [current[0]+(desired[0]-current[0])*xy,
  current[1]+(desired[1]-current[1])*xy,
  current[2]+(desired[2]-current[2])*z];
}
