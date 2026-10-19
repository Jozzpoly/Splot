// Splot R&D: OPTIONAL compliant contact between two controller-owned actors.
// This is a symmetric finite impulse on two mover velocities, not a Box3D
// rigid-body collision, a hard no-overlap constraint, or a finished NPC AI.
// It preserves the existing ghost/pass-through mode as the default.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function compliantActorImpulse(a,b,velocityA,velocityB,dt,{
 shell=.14,recoveryRate=3.5,maxForce=1250,
}={}){
 const none=(gap=null)=>({active:false,impulse:0,ax:0,ay:0,bx:0,by:0,gap,normal:null});
 if(!a||!b||!(dt>0&&dt<=.05))return none();
 if(!(a.r>0&&b.r>0&&a.mass>0&&b.mass>0))return none();
 if(a.z>=b.z+b.h-.001||b.z>=a.z+a.h-.001)return none();
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
 const clearance=a.r+b.r;
 const gap=d-clearance;
 if(gap>=shell)return none(gap);
 // Coincident centers need a deterministic normal. Relative motion takes
 // priority over an arbitrary global direction.
 const vx=velocityA[0]-velocityB[0],vy=velocityA[1]-velocityB[1];
 const rel=Math.hypot(vx,vy);
 const nx=d>1e-8?dx/d:rel>1e-8?vx/rel:1;
 const ny=d>1e-8?dy/d:rel>1e-8?vy/rel:0;
 // World-space velocities, not (X,Y,Z)-engine-dependent vectors.
 const separationSpeed=(velocityB[0]-velocityA[0])*nx+
                       (velocityB[1]-velocityA[1])*ny;
 const penetration=Math.max(0,-gap);
 const desiredSeparation=penetration*recoveryRate;
 const effectiveMass=a.mass*b.mass/(a.mass+b.mass);
 const preContactGain=gap>0?clamp((shell-gap)/shell,0,1):1;
 const requested=Math.max(0,desiredSeparation-separationSpeed)*effectiveMass*preContactGain;
 const J=Math.min(maxForce*dt,requested);
 if(!(J>1e-8))return none(gap);
 return {active:true,impulse:J,gap,normal:[nx,ny],
  ax:-J*nx/a.mass,ay:-J*ny/a.mass,bx:J*nx/b.mass,by:J*ny/b.mass};
}
