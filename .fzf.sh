#!/usr/bin/env bash

# FZF configuration

# CTRL-/ to toggle small preview window to see the full command
# CTRL-Y to copy the command into clipboard using pbcopy
export FZF_CTRL_R_OPTS="
  --preview 'echo {}' --preview-window up:3:hidden:wrap
  --bind 'ctrl-/:toggle-preview'
  --bind 'ctrl-y:execute-silent(echo -n {2..} | pbcopy)+abort'
  --color header:italic
  --header 'Press CTRL-Y to copy command into clipboard'"

# Print tree structure in the preview window
export FZF_ALT_C_OPTS="--preview 'tree -C {}'"

export FZF_CTRL_R_OPTS="--reverse"
export FZF_COMPLETION_DIR_COMMANDS="cd pushd rmdir tree"
export FZF_TMUX=1
export FZF_TMUX_OPTS="-d 50% -- --height 50%"
