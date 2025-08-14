#!/usr/bin/env zsh
# Loader for modular fzf config

# Source Catppuccin theme first (if present)
[[ -r "$HOME/.config/fzf/catppuccin-mocha.sh" ]] && source "$HOME/.config/fzf/catppuccin-mocha.sh"

# Load split configs in order
for f in $HOME/.config/fzf.d/*.zsh(.N); do
  source "$f"
done

# If fzf-tab is already loaded, re-enable so our latest styles apply
if typeset -f enable-fzf-tab &>/dev/null; then
  disable-fzf-tab 2>/dev/null
  enable-fzf-tab
fi
