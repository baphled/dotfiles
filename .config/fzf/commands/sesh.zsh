# ~/.config/fzf/commands/sesh.zsh
# sesh session picker (modularized)

function sesh-sessions() {
  {
    # Make sure fzf can talk to the TTY when called from a widget
    exec </dev/tty >/dev/tty

    local session
    # Build fzf args once so we can add --tmux only when inside tmux
    local -a fzf_args
    fzf_args=(
      --height 75%
      --reverse
      --border
      --border-label ' sesh '
      --prompt '⚡  '
    )
    [[ -n "$TMUX" ]] && fzf_args+=(--tmux 75%)

    session=$(sesh list -t -c | fzf "${fzf_args[@]}")
    zle reset-prompt > /dev/null 2>&1 || true
    [[ -z "$session" ]] && return
    sesh connect "$session"
  }
}

# Keybindings (emacs + vi)
zle -N sesh-sessions
bindkey -M emacs '\es' sesh-sessions
bindkey -M vicmd '\es' sesh-sessions
bindkey -M viins '\es' sesh-sessions
