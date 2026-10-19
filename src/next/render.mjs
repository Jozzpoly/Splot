// Swappable render backend. The scene owns triangles and world coordinates.
// Neither backend may decide support, collision, pick targets or game state.
import {projectPoint} from './spatial-core.mjs';
const palette={wood:[154,123,82],stone:[113,121,112],steel:[115,149,162],soil:[58,77,68],leaf:[73,111,88],player:[92,182,154],boar:[181,119,97],crate:[190,146,96],skin:[213,173,136],shadow:[35,51,49],mark:[243,197,118]};
const normalized=v=>{const k=Math.hypot(...v)||1;return v.map(a=>a/k)};
const LIGHT=normalized([-.4,-.7,1.1]);
export function colorFor(triangle){
 const raw=palette[triangle.material||'stone']||palette.stone;
 const n=triangle.normal||[0,0,1];const light=.48+.52*Math.max(0,n[0]*LIGHT[0]+n[1]*LIGHT[1]+n[2]*LIGHT[2]);
 const z=triangle.a?.[2]||0;
 const warm=1+Math.min(.13,Math.max(0,z)*.035);
 return raw.map((c,i)=>Math.max(0,Math.min(255,Math.round(c*light*(i===0?warm:1)))));
}
export class SoftwareDepthRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.mode='software-depth';this.ratio=.65;this.lastCost=0;}
 render(tris,camera){const now=performance.now(),canvas=this.canvas,ctx=this.ctx;
  const w=canvas.width,h=canvas.height;
  const image=ctx.createImageData(w,h),px=image.data,depth=new Float32Array(w*h);depth.fill(Infinity);
  // Sky and horizon behind geometry, never a fake world surface.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,t=y/h;
   px[i]=Math.round(19+11*t);px[i+1]=Math.round(38+13*t);px[i+2]=Math.round(43+13*t);px[i+3]=255;
  }
  for(const tri of tris){
   const aa=projectPoint(camera,tri.a),bb=projectPoint(camera,tri.b),cc=projectPoint(camera,tri.c);
   const ax=aa.x,ay=aa.y,bx=bb.x,by=bb.y,cx=cc.x,cy=cc.y;
   const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<.001)continue;
   const inv=1/area;
   const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx)));
   const y0=Math.max(0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));
   if(x0>x1||y0>y1)continue;
   const col=colorFor(tri);
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const ix=x+.5,iy=y+.5;
    const u=((bx-ix)*(cy-iy)-(by-iy)*(cx-ix))*inv;
    const v=((cx-ix)*(ay-iy)-(cy-iy)*(ax-ix))*inv;
    const k=1-u-v;
    if(u<-.00001||v<-.00001||k<-.00001)continue;
    const z=u*aa.depth+v*bb.depth+k*cc.depth;
    const id=y*w+x;
    if(z>=depth[id])continue;depth[id]=z;
    const i=id*4;px[i]=col[0];px[i+1]=col[1];px[i+2]=col[2];
   }
  }
  ctx.putImageData(image,0,0);
  this.lastCost=performance.now()-now;
 }
}
const vert=`#version 300 es
precision highp float;
in vec3 position;in vec3 tint;
uniform vec3 target,rightVec,upVec,forwardVec;
uniform vec2 halfExtent;
out vec3 passColor;
void main(){vec3 p=position-target;
 float sx=dot(p,rightVec)/halfExtent.x;
 float sy=dot(p,upVec)/halfExtent.y;
 float z=dot(p,forwardVec)/130.0;
 gl_Position=vec4(sx,sy,z,1.0);passColor=tint/255.0;
}`;
const frag=`#version 300 es
precision mediump float;in vec3 passColor;out vec4 outColor;
void main(){outColor=vec4(passColor,1.0);}`;
export class WebGLDepthRenderer{
 constructor(canvas){
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,preserveDrawingBuffer:false});
  if(!gl)throw Error('webgl2-unavailable');
  this.canvas=canvas;this.gl=gl;this.mode='webgl-depth';this.lastCost=0;
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader:'+gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link:'+gl.getProgramInfoLog(program));gl.useProgram(program);
  this.program=program;this.buffer=gl.createBuffer();this.uniforms=Object.fromEntries(['target','rightVec','upVec','forwardVec','halfExtent'].map(n=>[n,gl.getUniformLocation(program,n)]));
  this.aPosition=gl.getAttribLocation(program,'position');this.aColor=gl.getAttribLocation(program,'tint');
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.aPosition);gl.vertexAttribPointer(this.aPosition,3,gl.FLOAT,false,24,0);
  gl.enableVertexAttribArray(this.aColor);gl.vertexAttribPointer(this.aColor,3,gl.FLOAT,false,24,12);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);
 }
 render(tris,cam){const start=performance.now(),gl=this.gl;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.08,.15,.17,1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const payload=new Float32Array(tris.length*3*6);let k=0;
  for(const tri of tris){const color=colorFor(tri);for(const p of [tri.a,tri.b,tri.c]){
   payload[k++]=p[0];payload[k++]=p[1];payload[k++]=p[2];payload[k++]=color[0];payload[k++]=color[1];payload[k++]=color[2];
  }}
  gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,payload,gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(this.aPosition,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.aColor,3,gl.FLOAT,false,24,12);
  const uniforms=this.uniforms;
  gl.uniform3fv(uniforms.target,cam.target);gl.uniform3fv(uniforms.rightVec,cam.right);gl.uniform3fv(uniforms.upVec,cam.up);gl.uniform3fv(uniforms.forwardVec,cam.forward);
  gl.uniform2f(uniforms.halfExtent,cam.width/cam.pixelsPerMeter/2,cam.height/cam.pixelsPerMeter/2);
  gl.drawArrays(gl.TRIANGLES,0,tris.length*3);this.lastCost=performance.now()-start;
 }
}
export function createRenderer(canvas){try{return new WebGLDepthRenderer(canvas);}catch(e){return new SoftwareDepthRenderer(canvas)}}
