# Structural members — non-promoted donor

This is **NOT** an approved Splot gameplay release, canonical building model, structural solver or finished rendering fix.

It is an isolated and reproducible research patch against Splot research PR #2 after commit `e3e9d157`:

```bash
# Apply to a separate scratch clone, NOT the working main branch.
patch -p1 --dry-run < donors/structural-members/platform_members.patch
patch -p1 < donors/structural-members/platform_members.patch
node --test donors/structural-members/structure_members.test.mjs
```

Derived vertical posts are real AABB solids from `made-platform-*` definitions; static world collision and rays discover them, they are checked on placement and disappear with their parent. They *do not* simulate load paths, stress, torque, failure, independent editing, realistic material variation, or a usable depth renderer. Current Canvas makes their spatial contribution barely legible; screenshots showed little change. Never merge automatically because five donor tests pass. See the structural postmortem and Owner FAIL.

A future replacement must be compared with the **whole playable K2 world**, especially mobile and the true partial-occlusion counterexample. Code is intentionally left as a patch rather than silently grafted into product source.