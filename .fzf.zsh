#!/usr/bin/env zsh

# FZF configuration

# CTRL-/ to toggle small preview window to see the full command
# CTRL-Y to copy the command into clipboard using pbcopy
export FZF_CTRL_R_OPTS="
  --color=bg+:#313244,bg:#1e1e2e,spinner:#f5e0dc,hl:#f38ba8
  --color=fg:#cdd6f4,header:#f38ba8,info:#cba6f7,pointer:#f5e0dc
  --color=marker:#f5e0dc,fg+:#cdd6f4,prompt:#cba6f7,hl+:#f38ba8
  --bind 'ctrl-y:execute-silent(echo -n {2..} | pbcopy)+abort'
  --header 'Press CTRL-Y to copy command into clipboard'"

export FZF_DEFAULT_OPTS='
  --color=bg+:#313244,bg:#1e1e2e,spinner:#f5e0dc,hl:#f38ba8
  --color=fg:#cdd6f4,header:#f38ba8,info:#cba6f7,pointer:#f5e0dc
  --color=marker:#f5e0dc,fg+:#cdd6f4,prompt:#cba6f7,hl+:#f38ba8
  --border="rounded" --border-label="" --preview-window="border-rounded" --prompt="> "
  --marker=">" --pointer="◆" --separator="─" --scrollbar="│"'

export FZF_CTRL_T_OPTS="
  --preview 'fzf-preview.sh {}' --preview-window up,60%,border-bottom,+{2}+3/3,~3
  --bind 'ctrl-/:toggle-preview'"


# Print tree structure in the preview window
export FZF_ALT_C_OPTS="--preview 'exa -long --all'"
export FZF_DEFAULT_COMMAND='rg --files --no-ignore-vcs --hidden'

export FZF_COMPLETION_DIR_COMMANDS="cd pushd rmdir exa cat"
export FZF_TMUX=1
export FZF_TMUX_OPTS="-d 50% -- --height 50%"

zstyle ':fzf-tab:*' fzf-command ftb-tmux-popup
# disable sort when completing `git checkout`
zstyle ':completion:*:git-checkout:*' sort false
# set descriptions format to enable group support
# NOTE: don't use escape sequences here, fzf-tab will ignore them
zstyle ':completion:*:descriptions' format '[%d]'
# set list-colors to enable filename colorizing
# force zsh not to show completion menu, which allows fzf-tab to capture the unambiguous prefix
zstyle ':completion:*' menu no
# preview directory's content with eza when completing cd
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'fzf-preview.sh {}' # remember to use single quote here!!!
# switch group using `<` and `>`
zstyle ':fzf-tab:*' switch-group '<' '>'
zstyle ':fzf-tab:*' popup-min-size 80 30
