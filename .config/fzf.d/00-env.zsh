# Base FZF env and shortcuts (matches your working config)

export FZF_CTRL_R_OPTS="
  --bind 'ctrl-y:execute-silent(echo -n {2..} | pbcopy)+abort'
  --height 80%
  --tmux 80%
  --header 'Press CTRL-Y to copy command into clipboard'"

export FZF_DEFAULT_OPTS='
  --style=full
  --border=rounded
  --border-label=" 󰮯 FZF "
  --preview-window=border-rounded
  --bind=ctrl-u:preview-page-up,ctrl-d:preview-page-down
  --prompt "⚡ "
  --marker="◉"
  --pointer=""
  --separator="━"
  --scrollbar="┃"
'

export FZF_CTRL_T_OPTS="
  --preview 'fzf-preview.sh {}'
  --height 80%
  --tmux 80%
  --bind 'ctrl-/:toggle-preview'"

export FZF_ALT_C_OPTS="
  --walker-skip .git,node_modules,target
  --height 80%
  --tmux 80%
  --preview 'eza --all --tree --color=always {}'"

 export FZF_PREVIEW_BINDINGS="--bind ctrl-u:preview-page-up,ctrl-d:preview-page-down"

zvm_after_init_command+=(
  "bindkey '^p' history-search-backward"
  "bindkey '^n' history-search-forward"
)

export FZF_DEFAULT_COMMAND='rg --files --no-ignore-vcs --hidden'
export FZF_COMPLETION_DIR_COMMANDS="cd pushd rmdir exa cat"
