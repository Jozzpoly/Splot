// A crate has one visible top surface, not two coincident tops.
// The Box3D contact shape is independent of this purely visual skin.
import {trianglesFor} from './spatial-core.mjs';
export function crateTriangles(b){
 const lid=.07;
 const base=trianglesFor({kind:'box',id:b.id,
  min:[b.x-b.r,b.y-b.r,b.z],
  max:[b.x+b.r,b.y+b.r,b.z+b.h-lid]});
 const cap=trianglesFor({kind:'box',id:b.id,
  min:[b.x-b.r-.018,b.y-b.r-.018,b.z+b.h-lid],
  max:[b.x+b.r+.018,b.y+b.r+.018,b.z+b.h]});
 // Both internal faces are sealed and must not be sent to depth rendering.
 return [...base.filter(t=>t.face!=='top').map(t=>({...t,material:'crate'})),
         ...cap.filter(t=>t.face!=='bottom').map(t=>({...t,material:'wood'}))];
}
