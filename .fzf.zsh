#!/usr/bin/env zsh

# FZF configuration

# CTRL-/ to toggle small preview window to see the full command
# CTRL-Y to copy the command into clipboard using pbcopy
export FZF_CTRL_R_OPTS="
  --bind 'ctrl-y:execute-silent(echo -n {2..} | pbcopy)+abort'
  --height 80%
  --tmux 80%
  --header 'Press CTRL-Y to copy command into clipboard'"

export FZF_DEFAULT_OPTS='
  --style full
  --border="rounded"
  --border-label=""
  --preview-window="border-rounded"
  --prompt="> "
  --marker=">"
  --pointer="◆"
  --separator="─"
  --scrollbar="│"'

source "$HOME/.config/fzf/catppuccin-mocha.sh"

export FZF_CTRL_T_OPTS="
  --preview 'fzf-preview.sh {}'
  --height 80%
  --tmux 80%
  --bind 'ctrl-/:toggle-preview'"

# Print tree structure in the preview window
export FZF_ALT_C_OPTS="
  --walker-skip .git,node_modules,target
  --height 80%
  --tmux 80%
  --preview 'eza --all --tree --color=always {}'"

zvm_after_init_command+=(
  "bindkey '^p' history-search-backward"
  "bindkey '^n' history-search-forward"
)

export FZF_DEFAULT_COMMAND='rg --files --no-ignore-vcs --hidden'

export FZF_COMPLETION_DIR_COMMANDS="cd pushd rmdir exa cat"

zstyle ':completion:*:descriptions' format

zstyle ':fzf-tab:*' popup-min-size 100 100
zstyle ':fzf-tab:*' show-group full
zstyle ':fzf-tab:*' popup-pad 30 0
zstyle ':fzf-tab:*' fzf-command ftb-tmux-popup

# disable sort when completing `git checkout`
zstyle ':completion:*:git-checkout:*' sort false
# set descriptions format to enable group support
# NOTE: don't use escape sequences (like '%F{red}%d%f') here, fzf-tab will ignore them
zstyle ':completion:*:descriptions' format '[%d]'
# force zsh not to show completion menu, which allows fzf-tab to capture the unambiguous prefix
zstyle ':completion:*' menu no

# preview directory's content with eza when completing cd
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'eza -1a --color=always $realpath'

# custom fzf flags
# NOTE: fzf-tab does not follow FZF_DEFAULT_OPTS by default
zstyle ':fzf-tab:*' fzf-flags --color=fg:1,fg+:2 --bind=tab:accept --height 70% --tmux
# To make fzf-tab follow FZF_DEFAULT_OPTS.
# NOTE: This may lead to unexpected behavior since some flags break this plugin. See Aloxaf/fzf-tab#455.
zstyle ':fzf-tab:*' use-fzf-default-opts yes
# switch group using `<` and `>`
zstyle ':fzf-tab:*' switch-group '<' '>'

zstyle ':fzf-tab:complete:whereis:*' fzf-preview 'man $word | bat -plman --color=always'

# give a preview of commandline arguments when completing `kill`
zstyle ':completion:*:*:*:*:processes' command "ps -u $USER -o pid,user,comm -w -w"
zstyle ':fzf-tab:complete:(kill|ps):argument-rest' fzf-preview \
  '[[ $group == "[process ID]" ]] && ps --pid=$word -o cmd --no-headers -w -w'
zstyle ':fzf-tab:complete:(kill|ps):argument-rest' fzf-flags --preview-window=down:3:wrap

# give a preview of commandline arguments when completing `systemctl`
zstyle ':fzf-tab:complete:systemctl-*:*' fzf-preview 'SYSTEMD_COLORS=1 systemctl status $word'

# it is an example. you can change it
zstyle ':fzf-tab:complete:git-(add|diff|restore):*' fzf-preview \
	'git diff $word | delta'
zstyle ':fzf-tab:complete:git-log:*' fzf-preview \
	'git log --color=always $word'
zstyle ':fzf-tab:complete:git-help:*' fzf-preview \
	'git help $word | bat -plman --color=always'
zstyle ':fzf-tab:complete:git-show:*' fzf-preview \
	'case "$group" in
	"commit tag") git show --color=always $word ;;
	*) git show --color=always $word | delta ;;
	esac'
zstyle ':fzf-tab:complete:git-checkout:*' fzf-preview \
	'case "$group" in
	"modified file") git diff $word | delta ;;
	"recent commit object name") git show --color=always $word | delta ;;
	*) git log --color=always $word ;;
	esac'
