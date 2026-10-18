from pathlib import Path
import re, hashlib
root=Path(__file__).parent
html=(root/'src/index.html').read_text()
world=(root/'src/world.mjs').read_text()
app=(root/'src/app.js').read_text()
assert app.startswith('import {')
app=app[app.index('\n')+1:]
world=re.sub(r'\bexport\s+(?=(?:const|function|class|async|let)\b)','',world)
assert '<script type="module" src="./app.js"></script>' in html
out=html.replace('<script type="module" src="./app.js"></script>',"<script>\n'use strict';\n"+world+'\n'+app+'\n</script>')
p=root/'Splot_Ciaglosc_GRAJ.html';p.write_text(out);(root/'index.html').write_text(out)
print('BUILD',p,len(out),'SHA256',hashlib.sha256(p.read_bytes()).hexdigest())
