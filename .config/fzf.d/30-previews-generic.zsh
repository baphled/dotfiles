# whereis: render man page via bat
zstyle ':fzf-tab:complete:whereis:*' fzf-preview 'MANWIDTH=$FZF_PREVIEW_COLUMNS man $word | col -bx | bat -plman --color=always'

zstyle ':fzf-tab:complete:cat:*' fzf-preview \
  'if [[ -n $realpath && -f $realpath ]]; then command fzf-preview.sh -- "$realpath"; else print -r -- "$desc"; fi'

zstyle ':fzf-tab:complete:z:*' fzf-preview 'eza --all --tree --color=always $realpath'

# systemd units: colored status
zstyle ':fzf-tab:complete:systemctl-*:*' fzf-preview 'SYSTEMD_COLORS=1 systemctl status $word'

# whereis: render man page via bat
zstyle ':fzf-tab:complete:whereis:*' fzf-preview 'MANWIDTH=$FZF_PREVIEW_COLUMNS man $word | col -bx | bat -plman --color=always'

# systemd units: colored status
zstyle ':fzf-tab:complete:systemctl-*:*' fzf-preview 'SYSTEMD_COLORS=1 systemctl status $word'
