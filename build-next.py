from pathlib import Path
import re
root=Path(__file__).parent/'src'/'next'
modules=[
 ('SpatialCore','spatial-core.mjs',['WORLD_FORMAT','createSpatialWorld','insertElement','replaceElement','removeElement','exportWorld','importWorld','trianglesFor','sceneTriangles','castRay','supportCandidates','clearanceAt','makeCamera','projectPoint','rayFromPixel','pickPixel','occlusionToPoint']),
 ('SpatialSim','spatial-sim.mjs',['createLiveWorld','getBody','moveBody','toggleGrip','stepLive','addCrate']),
 ('RenderAdapters','render.mjs',['SoftwareDepthRenderer','WebGLDepthRenderer','createRenderer','colorFor'])
]
chunks=[]
for name,filename,exports in modules:
 src=(root/filename).read_text()
 src=re.sub(r'^import .*?;\s*$','',src,flags=re.M)
 src=re.sub(r'\bexport\s+(?=const\b|function\b|class\b|let\b)','',src)
 chunks.append(f'const {name}=(()=>{{\n'+src+'\nreturn {'+','.join(exports)+'};\n})();\n')
 chunks.append('const {'+','.join(exports)+'}='+name+';\n')
app=(root/'app.mjs').read_text();app=re.sub(r'^import .*?;\s*$','',app,flags=re.M)
chunks.append(app)
html=(root/'index.html').read_text()
marker='<script type="module" src="./app.mjs"></script>'
assert html.count(marker)==1
out=html.replace(marker,"<script>\n'use strict';\n"+'\n'.join(chunks)+'\n</script>')
path=root/'Splot_Next_GRAJ.html';path.write_text(out)
print('BUILT',path,len(out))
