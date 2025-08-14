# Outer popup geometry for fzf-tab, inner fzf fills it.
# We use a wrapper function name (callable) to avoid "command not found" issues.

# Tell fzf-tab to use our wrapper
zstyle -d ':fzf-tab:*' fzf-command
zstyle ':fzf-tab:*' fzf-command "$HOME/bin/fzf-tab-launcher"

# Tmux popup “frame” preferences (keep yours)
zstyle ':fzf-tab:*' popup-min-size 100 100
zstyle ':fzf-tab:*' show-group full
zstyle ':fzf-tab:*' popup-pad 30 0

# Keep default opts; don’t force colors here (avoid clobbering your theme)
zstyle ':fzf-tab:*' use-fzf-default-opts yes
zstyle ':fzf-tab:*' switch-group '<' '>'
