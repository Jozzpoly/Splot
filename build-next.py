"""Reproducible Splot Next standalone build. No network, no code generation guesswork.

python3 build-next.py           # write tracked standalone
python3 build-next.py --check   # fail when tracked standalone differs from source

--check never alters the filesystem. Keep browser-based and Owner physical
acceptance separate from this deterministic source/build guard.
"""
from pathlib import Path
import re
import sys

root = Path(__file__).parent / "src" / "next"
modules = [
 ("SpatialCore","spatial-core.mjs",["WORLD_FORMAT","createSpatialWorld","insertElement","replaceElement","removeElement","exportWorld","importWorld","trianglesFor","sceneTriangles","castRay","supportCandidates","clearanceAt","makeCamera","projectPoint","rayFromPixel","pickPixel","occlusionToPoint"]),
 ("SpatialSim","spatial-sim.mjs",["createLiveWorld","getBody","moveBody","toggleGrip","stepLive","addCrate"]),
 ("BoxMath","box3d-donor/math.js",["clamp","dot3","cross3","length3","lengthXZ","normalize3","add3","sub3","scale3","mulMat3Vec3","yawFromForwardXZ","quatFromAxisAngle","rotateVecByQuat","inverseRotateVecByQuat","transformPoint","inverseTransformPoint"]),
 ("BoxProfile","box3d-donor/donor/profile.js",["DONOR_PROFILE_V0","DONOR_QUALIFIED_ENVELOPE_V0","DONOR_PROFILE_V1","DONOR_QUALIFIED_ENVELOPE_V1"]),
 ("BoxContactMemory","box3d-donor/donor/contact-memory.js",["installVelocityOnlyDynamicContactMemory"]),
 ("BoxConstraints","box3d-donor/constraint-velocity.js",["maxAbsVectorDelta","recoverSolvedPlanePushes","applyIntentCappedRelativeConstraintVelocity"]),
 ("BoxCharacter","box3d-donor/character.js",["ControllerOwnedCharacter"]),
 ("BoxConstraintCharacter","box3d-donor/constraint-velocity-character.js",["E23D_BEHAVIOR","ConstraintVelocityCharacter","createConstraintVelocityCharacter"]),
 ("BoxBasis","box3d-basis.mjs",["splotToBox3D","box3DToSplot","qmul","panelQuaternionInBox3D"]),
 ("ActorContact","actor-contact.mjs",["compliantActorImpulse"]),
 ("BoarIntent","boar-intent.mjs",["createBoarIntent"]),
 ("PartLifecycle","part-lifecycle.mjs",["partMotionMode","setBoxMotion","boxCenter","translateBoxToCenter","boxVolume"]),
 ("CrateVisual","crate-visual.mjs",["crateTriangles"]),
 ("PerfMetrics","perf-metrics.mjs",["summarizePerfFrames"]),
 ("AuthoringEditor","authoring-editor.mjs",["createEditHistory","translatedElement","screenOnHeightPlane"]),
 ("CameraTiming","camera-timing.mjs",["followGainForSeconds","advanceCameraTarget"]),
 ("SceneVisualCache","scene-visual-cache.mjs",["createSceneVisualCache"]),
 ("SceneRestore","scene-restore.mjs",["restoreResearchWorld","nextAuthoringSequence"]),
 ("Box3DBridge","box3d-live.mjs",["createBox3DBridge"]),
 ("PlaytestJournal","playtest-journal.mjs",["createPlaytestJournal"]),
 ("RapierBridge","rapier-live.mjs",["createRapierBridge"]),
 ("RenderAdapters","render.mjs",["SoftwareDepthRenderer","WebGLDepthRenderer","createRenderer","colorFor"])
]

def strip_imports(src):
    # Only top-level imports with mandatory terminating semicolons.
    # Verify the emitted script syntax as a separate Node gate.
    return re.sub(r"(?ms)^import\s+.*?;\s*", "", src)

def source_scope(name, filename, exports):
    src = strip_imports((root / filename).read_text(encoding="utf-8"))
    src = re.sub(r"\bexport\s+(?=const\b|function\b|class\b|let\b)", "", src)
    names = ",".join(exports)
    return f"const {name}=(()=>{{\n{src}\nreturn {{{names}}};\n}})();\nconst {{{names}}}={name};\n"

def render():
    chunks = [source_scope(name, filename, exports) for name, filename, exports in modules]
    app = strip_imports((root / "app.mjs").read_text(encoding="utf-8"))
    chunks.append(app)
    html = (root / "index.html").read_text(encoding="utf-8")
    marker = '<script type="module" src="./app.mjs"></script>'
    if html.count(marker) != 1:
        raise ValueError("Unexpected Splot Next HTML entrypoint")
    return html.replace(marker, "<script>\n'use strict';\n" + "\n".join(chunks) + "\n</script>")

def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        raise SystemExit("Usage: python3 build-next.py [--check]")
    expected = render()
    output = root / "Splot_Next_GRAJ.html"
    if args == ["--check"]:
        if not output.exists() or output.read_text(encoding="utf-8") != expected:
            print("FAIL: standalone Splot Next is stale. Run python3 build-next.py")
            raise SystemExit(1)
        print("PASS: reproducible standalone Splot Next", len(expected), "chars")
        return
    output.write_text(expected, encoding="utf-8")
    print("BUILT", output, len(expected), "chars")

if __name__ == "__main__":
    main()
