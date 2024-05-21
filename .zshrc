ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
[ ! -d $ZINIT_HOME ] && mkdir -p "$(dirname $ZINIT_HOME)"
[ ! -d $ZINIT_HOME/.git ] && git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
source "${ZINIT_HOME}/zinit.zsh"

zinit ice lucid
zi snippet OMZ::plugins/git/git.plugin.zsh
zi snippet OMZ::plugins/vi-mode/vi-mode.plugin.zsh
zi snippet OMZ::plugins/bundler/bundler.plugin.zsh
zi snippet OMZ::plugins/nvm/nvm.plugin.zsh
zi snippet OMZ::plugins/history-substring-search/history-substring-search.zsh
zi snippet OMZ::plugins/fzf/fzf.plugin.zsh
zi snippet OMZ::plugins/zoxide/zoxide.plugin.zsh
zi snippet OMZ::lib/history.zsh
zinit light Aloxaf/fzf-tab

zi load zsh-users/zsh-autosuggestions
zi load zsh-users/zsh-syntax-highlighting

zinit ice as"command" from"gh-r" \
  atclone"./starship init zsh > init.zsh; ./starship completions zsh > _starship" \
  atpull"%atclone" src"init.zsh"

zinit light starship/starship

# Customize to your needs...
export EDITOR=nvim
export NVM_DIR=~/.nvm

[[ -n "$TMUX" ]] && export TERM=tmux-256color || export TERM=xterm-kitty

# We want vi-mode
set -o vi

# Display the vi-mode your currently in
function zle-line-init zle-keymap-select {
    RPS1="${${KEYMAP/vicmd/[NORMAL]}/(main|viins)/[INSERT]}"
    RPS2=$RPS1
    zle reset-prompt
}
zle -N zle-line-init
zle -N zle-keymap-select

# renaming multiple files at once
autoload -U zmv

## Path section
[[ -d "$HOME/.local/bin" ]] && export PATH="$HOME/.local/bin:$PATH"
[[ -s "$HOME/.config/aliasrc" ]] && source "$HOME/.config/aliasrc"
[[ -s $HOME/.tmuxinator/scripts/tmuxinator  ]] && source $HOME/.tmuxinator/scripts/tmuxinator
[[ -d "$HOME/go/bin" ]] && export PATH="$PATH:$HOME/go/bin"
export PATH=/bin:~/bin:$PATH

# Arch Linux command-not-found support, you must have package pkgfile installed
# https://wiki.archlinux.org/index.php/Pkgfile#.22Command_not_found.22_hook
[[ -e /usr/share/doc/pkgfile/command-not-found.zsh ]] && source /usr/share/doc/pkgfile/command-not-found.zsh

# Advanced command-not-found hook
[[ -e /usr/share/doc/find-the-command/ftc.zsh ]] && source /usr/share/doc/find-the-command/ftc.zsh

# History
HISTFILE=~/.zsh_history
HISTSIZE=1000000000
SAVEHIST=$HISTSIZE

HISTDUP=erase

## Options section
setopt correct                                                  # Auto correct mistakes
setopt extendedglob                                             # Extended globbing. Allows using regular expressions with *
setopt nocaseglob                                               # Case insensitive globbing
setopt rcexpandparam                                            # Array expension with parameters
setopt nocheckjobs                                              # Don't warn about running processes when exiting
setopt numericglobsort                                          # Sort filenames numerically when it makes sense
setopt nobeep                                                   # No beep
setopt appendhistory                                            # Immediately append history instead of overwriting
setopt histignorealldups                                        # If a new command is a duplicate, remove the older one
setopt autocd                                                   # if only directory path is entered, cd there.
setopt auto_pushd                                               # pushd when cd is used
setopt pushd_ignore_dups                                        # Do not store duplicates in the directory stack
setopt pushdminus                                               # pushd with the argument '-' goes to the previous directory
setopt append_history                                           # Append history instead of overwriting
setopt share_history                                            # Share history between all sessions
setopt hist_ignore_space                                        # Ignore commands that start with a space
setopt hist_ignore_all_dups                                     # Delete old recorded duplicates
setopt hist_save_no_dups                                        # Do not save duplicates in history
setopt hist_ignore_dups                                         # Do not save duplicates in history
setopt hist_find_no_dups                                        # Do not display duplicates when searching history

autoload -Uz compinit
compinit
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'       # Case insensitive tab completion
zstyle ':completion:*' rehash true                              # automatically find new executables in path
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"         # Colored completion (different colors for dirs/files/etc)
zstyle ':completion:*' completer _expand _complete _ignored _approximate
zstyle ':completion:*' menu no
zstyle ':completion:*' select-prompt '%SScrolling active: current selection at %p%s'
zstyle ':completion:*:descriptions' format '%U%F{cyan}%d%f%u'

# Speed up completions
zstyle ':completion:*' accept-exact '*(N)'
zstyle ':completion:*' use-cache on
zstyle ':completion:*' cache-path ~/.cache/zcache

# automatically load bash completion functions
autoload -U +X bashcompinit && bashcompinit

# Load Mcfly
export MCFLY_FUZZY=true
export MCFLY_RESULTS=20
export MCFLY_INTERFACE_VIEW=BOTTOM
export MCFLY_RESULTS_SORT=LAST_RUN
eval "$(mcfly init zsh)"

# Bindings.
bindkey -v
bindkey '^n' history-search-forward
bindkey '^p' history-search-backward
bindkey '^k' autosuggest-accept

if [ -n "$TMUX" ]; then
  # NO-OP
else
  ~/bin/fastfetch_autoscale
fi
