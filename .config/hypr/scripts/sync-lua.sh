#!/usr/bin/env bash
# Sync .conf (source of truth, git-tracked) -> .lua (what Hyprland 0.56 loads).
# Run this after editing any .conf file, then `hyprctl reload`.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[1/4] Regenerating .lua from .conf..."
hyprlang2lua --dir . --in-place

echo "[2/4] Applying manual fixes..."
# hyprlang $vars are global across sourced files; Lua locals are chunk-scoped.
sed -i 's/^local //' variables.lua
# Interpolate declared $vars (shell vars like $SLURP_ARGS are untouched: pattern is exact quoted var).
sed -i 's/exec_cmd("\$\([a-zA-Z_]*\)")/exec_cmd(\1)/g' autostart.lua binding.lua
sed -i 's/"Shift+\$mainMod + R"/"SHIFT+" .. mainMod .. " + R"/' binding.lua
sed -i 's/"\$mainMod+Alt + U"/mainMod .. "+ALT + U"/' binding.lua
sed -i 's/output = "\$\(output_[a-z]*\)"/output = \1/g' monitor.lua
sed -i 's/workspace = "\$\(workspace_[a-z_]*\)"/workspace = \1/g' appearance/workspaces.lua
sed -i 's/group = "set \$\([a-zA-Z_]*\)"/group = "set " .. \1/' rules.lua
# Flagged layer rules -> typed fields per HL.LayerRuleSpec; strip redundant match prefix.
sed -i 's/-- TODO: manual review — unmapped layer rule: "xray 1"/xray = true,/; s/-- TODO: manual review — unmapped layer rule: "blur on"/blur = true,/; s/namespace = "match:namespace \(.*\)"/namespace = "\1"/g' rules.lua
# Keysym parser requires uppercase modifiers.
sed -i -e 's/\bShift\b/SHIFT/g' -e 's/\bCtrl\b/CTRL/g' -e 's/\bControl\b/CONTROL/g' -e 's/\bSuper\b/SUPER/g' -e 's/\bAlt\b/ALT/g' binding.lua
# hyprlang's quirky truthy value has no Lua equivalent.
sed -i 's/enabled = "yes, please :)"/enabled = true/' appearance/animations.lua

echo "[3/4] Syntax check..."
for f in *.lua appearance/*.lua; do luac -p "$f"; done

echo "[4/4] Hyprland verify..."
Hyprland --verify-config

echo "OK. Now run: hyprctl reload"
