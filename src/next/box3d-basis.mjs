// Pure, testable RH coordinate conversion. Splot XY ground / Z up,
// Box3D XZ ground / Y up. This is a proper -90° rotation about X,
// NOT a single-axis mirror (which would reverse angular momentum).
export const splotToBox3D=([x,y,z])=>[x,z,-y];
export const box3DToSplot=([x,y,z])=>[x,-z,y];
const C=[-Math.SQRT1_2,0,0,Math.SQRT1_2];
const invC=[Math.SQRT1_2,0,0,Math.SQRT1_2];
export const qmul=(a,b)=>[
 a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
 a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
 a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
 a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
export function panelQuaternionInBox3D(e){
 const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],dz=e.b[2]-e.a[2];
 const yaw=Math.atan2(dy,dx),pitch=-Math.atan2(dz,Math.hypot(dx,dy));
 const sy=Math.sin(yaw/2),cy=Math.cos(yaw/2),sp=Math.sin(pitch/2),cp=Math.cos(pitch/2);
 return qmul(qmul(C,[-sy*sp,cy*sp,sy*cp,cy*cp]),invC);
}
