ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
[ ! -d $ZINIT_HOME ] && mkdir -p "$(dirname $ZINIT_HOME)"
[ ! -d $ZINIT_HOME/.git ] && git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
source "${ZINIT_HOME}/zinit.zsh"

zinit ice wait"0" lucid
zi snippet OMZ::plugins/git/git.plugin.zsh

zinit ice wait"0" lucid
zi snippet OMZ::plugins/bundler/bundler.plugin.zsh

zinit ice wait"0" lucid
zi snippet OMZ::plugins/nvm/nvm.plugin.zsh

zinit ice wait"0" lucid
zi snippet OMZ::plugins/history-substring-search/history-substring-search.zsh

zinit ice wait"0" lucid
zi snippet OMZ::plugins/fzf/fzf.plugin.zsh

zinit ice wait"0" lucid
zi snippet OMZ::plugins/zoxide/zoxide.plugin.zsh

zinit ice wait"0" lucid
zi snippet OMZ::lib/history.zsh

zinit ice wait"0" lucid
zinit light Aloxaf/fzf-tab

zinit ice wait"0" lucid
zinit light Freed-Wu/fzf-tab-source

zinit ice wait'0a' lucid atload"_zsh_autosuggest_start"
zinit light zsh-users/zsh-autosuggestions

zinit ice wait'0b' lucid blockf atpull'zinit creinstall -q .'
zinit light zsh-users/zsh-completions

zinit ice wait"0" lucid
zinit light junegunn/fzf-git.sh

zinit ice wait"0" lucid
zinit ice as"command" from"gh-r" \
  atclone"./starship init zsh > init.zsh; ./starship completions zsh > _starship" \
  atpull"%atclone" src"init.zsh"

zinit light starship/starship

# Customize to your needs...
export EDITOR=nvim
export VISUAL=nvim
export NVM_DIR=~/.config/nvm

[[ -n "$TMUX" ]] && export TERM=tmux-256color || export TERM=xterm-kitty
export COLORTERM=truecolor

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
[[ -d "$HOME/.rvm/bin" ]] && export PATH="$HOME/.rvm/bin:$PATH"
[[ -s "$HOME/.config/aliasrc" ]] && source "$HOME/.config/aliasrc"
[[ -s $HOME/.tmuxinator/scripts/tmuxinator  ]] && source $HOME/.tmuxinator/scripts/tmuxinator
[[ -d "$HOME/go/bin" ]] && export PATH="$PATH:$HOME/go/bin"
[[ -d "$HOME/.rvm/bin" ]] && export PATH="$PATH:$HOME/.rvm/bin"
export PATH=/bin:~/bin:$PATH

[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"  # This loads nvm
[[ -s "$NVM_DIR/bash_completion" ]] && \. "$NVM_DIR/bash_completion"

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
setopt correct_all                                              # Auto correct mistakes
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

zi cdreplay -q
zi cdlist -q &>/dev/null

# Load fzf
#
# The completion scripts are only loaded in interactive shells
#
# We need to load it here, after our plug-ins are loaded, so that our custom
# LS_COLORS are used.
#
[[ -s "$HOME/.fzf.zsh" ]] && source "$HOME/.fzf.zsh"  # This loads fzf

eval "$(zoxide init zsh)"

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
