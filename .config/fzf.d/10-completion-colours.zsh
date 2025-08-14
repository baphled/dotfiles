# Completion formatting & colors (guard against empty LS_COLORS)

# Single, fzf-tab-friendly description format
zstyle ':completion:*:descriptions' format '[%d]'

# Keep zsh’s menu off so fzf-tab can capture the line
zstyle ':completion:*' menu no

# Case-insensitive matching etc. (from your config)
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'
zstyle ':completion:*' rehash true
zstyle ':completion:*' completer _expand _complete _ignored _approximate

# Speed up completions cache
zstyle ':completion:*' accept-exact '*(N)'
zstyle ':completion:*' use-cache on
zstyle ':completion:*' cache-path ~/.cache/zcache

# Disable sort on checkout (your rule)
zstyle ':completion:*:git-checkout:*' sort false
