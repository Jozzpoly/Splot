from pathlib import Path
import re
root=Path(__file__).parent/'src'/'next'
modules=[
 ('SpatialCore','spatial-core.mjs',['WORLD_FORMAT','createSpatialWorld','insertElement','replaceElement','removeElement','exportWorld','importWorld','trianglesFor','sceneTriangles','castRay','supportCandidates','clearanceAt','makeCamera','projectPoint','rayFromPixel','pickPixel','occlusionToPoint']),
 ('SpatialSim','spatial-sim.mjs',['createLiveWorld','getBody','moveBody','toggleGrip','stepLive','addCrate']),
 ('BoxMath','box3d-donor/math.js',['clamp','dot3','cross3','length3','lengthXZ','normalize3','add3','sub3','scale3','mulMat3Vec3','yawFromForwardXZ','quatFromAxisAngle','rotateVecByQuat','inverseRotateVecByQuat','transformPoint','inverseTransformPoint']),
 ('BoxProfile','box3d-donor/donor/profile.js',['DONOR_PROFILE_V0','DONOR_QUALIFIED_ENVELOPE_V0','DONOR_PROFILE_V1','DONOR_QUALIFIED_ENVELOPE_V1']),
 ('BoxContactMemory','box3d-donor/donor/contact-memory.js',['installVelocityOnlyDynamicContactMemory']),
 ('BoxConstraints','box3d-donor/constraint-velocity.js',['maxAbsVectorDelta','recoverSolvedPlanePushes','applyIntentCappedRelativeConstraintVelocity']),
 ('BoxCharacter','box3d-donor/character.js',['ControllerOwnedCharacter']),
 ('BoxConstraintCharacter','box3d-donor/constraint-velocity-character.js',['E23D_BEHAVIOR','ConstraintVelocityCharacter','createConstraintVelocityCharacter']),
 ('BoxBasis','box3d-basis.mjs',['splotToBox3D','box3DToSplot','qmul','panelQuaternionInBox3D']),
 ('Box3DBridge','box3d-live.mjs',['createBox3DBridge']),
 ('RapierBridge','rapier-live.mjs',['createRapierBridge']),
 ('RenderAdapters','render.mjs',['SoftwareDepthRenderer','WebGLDepthRenderer','createRenderer','colorFor'])
]
chunks=[]
for name,filename,exports in modules:
 src=(root/filename).read_text()
 src=re.sub(r'(?ms)^import\s+.*?;\s*','',src,flags=re.M)
 src=re.sub(r'\bexport\s+(?=const\b|function\b|class\b|let\b)','',src)
 chunks.append(f'const {name}=(()=>{{\n'+src+'\nreturn {'+','.join(exports)+'};\n})();\n')
 chunks.append('const {'+','.join(exports)+'}='+name+';\n')
app=(root/'app.mjs').read_text();app=re.sub(r'(?ms)^import\s+.*?;\s*','',app,flags=re.M)
chunks.append(app)
html=(root/'index.html').read_text()
marker='<script type="module" src="./app.mjs"></script>'
assert html.count(marker)==1
out=html.replace(marker,"<script>\n'use strict';\n"+'\n'.join(chunks)+'\n</script>')
path=root/'Splot_Next_GRAJ.html';path.write_text(out)
print('BUILT',path,len(out))
