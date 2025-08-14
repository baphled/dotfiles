# Ensure consistent inner-fzf height everywhere *after* all other per-command flags.
# Inside tmux popup: fill the popup (100% of 75% container). Outside: 70%.

if [[ -n $TMUX ]]; then
  zstyle ':fzf-tab:complete:*' fzf-flags --height=100% --min-height=15 --preview-window=+0
else
  zstyle ':fzf-tab:complete:*' fzf-flags --height=75%  --min-height=15 --preview-window=+0
fi

# For kill/ps, keep the special preview layout but still inherit popup fill
if [[ -n $TMUX ]]; then
  zstyle ':fzf-tab:complete:(kill|ps):argument-rest' fzf-flags --height=100% --min-height=15 --preview-window=down:3:wrap
else
  zstyle ':fzf-tab:complete:(kill|ps):argument-rest' fzf-flags --height=70%  --min-height=15 --preview-window=down:3:wrap
fi
