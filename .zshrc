# Path to your oh-my-zsh configuration.
ZSH=$HOME/.oh-my-zsh

ZSH_CUSTOM=~/.themes

# Set name of the theme to load.
# Look in ~/.oh-my-zsh/themes/
# Optionally, if you set this to "random", it'll load a random theme each
# time that oh-my-zsh is loaded.
ZSH_THEME="boodah"
# Set to this to use case-sensitive completion
# CASE_SENSITIVE="true"

# Comment this out to disable weekly auto-update checks
DISABLE_AUTO_UPDATE="false"

# Uncomment following line if you want to disable colors in ls
# DISABLE_LS_COLORS="true"

# Uncomment following line if you want to disable autosetting terminal title.
DISABLE_AUTO_TITLE="true"

# Uncomment following line if you want disable red dots displayed while waiting for completion
# DISABLE_COMPLETION_WAITING_DOTS="true"

# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Example format: plugins=(rails git textmate ruby lighthouse)
plugins=(git vi-mode bundler history-substring-search themes fzf fzf-tab)

# Customize to your needs...
PATH="/usr/local/opt/coreutils/libexec/gnubin:$PATH"
export PATH=/usr/local/sbin:/usr/local/bin:/usr/bin:/bin:/usr/games:/opt/bin:/opt/local/bin:~/bin:/usr/local/rvm/bin:$PATH

export MANPATH="/usr/local/opt/coreutils/libexec/gnuman:$MANPATH"

export EDITOR=nvim

export XML_CATALOG_FILES="/usr/local/etc/xml/catalog"

export PATH="$HOME/bin/:$PATH:$HOME/.rvm/bin" # Make sure local bin files around found before system ones

# Add RVM to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:$HOME/.rvm/bin"

# Add python to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:$HOME/.local/bin"

## Add snap bin to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:/snap/bin"

## Add flutter bin to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH":"$HOME/.pub-cache/bin"

export PATH="$PATH":"$HOME/go/bin"

export NVM_DIR=~/.nvm

if [ -n "$TMUX" ]; then
  export TERM=tmux-256color
else
  export TERM=xterm-kitty
fi

eval `dircolors ~/colors/dircolors-solarized/dircolors.ansi-dark`

eval "$(zoxide init zsh)"

# We want vi-mode
set -o vi

source $ZSH/oh-my-zsh.sh

if [ -f ~/.fzf.zsh ]; then
  source ~/.fzf.zsh
fi

source ~/.nvm/nvm.sh

[ -s "$HOME/.rvm/scripts/rvm" ] && source "$HOME/.rvm/scripts/rvm" ]]

source $HOME/.zsh/zsh-syntax-highting.zsh
source $HOME/.config/aliasrc

[[ -s $HOME/.tmuxinator/scripts/tmuxinator  ]] && source $HOME/.tmuxinator/scripts/tmuxinator

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

PROMPT+=`$([ -n "$TMUX"  ] && tmux setenv TMUXPWD_$(tmux display -p "#D" | tr -d %) "$PWD")`

## Path section
# Set $PATH if ~/.local/bin exist
if [ -d "$HOME/.local/bin" ]; then
    export PATH=$HOME/.local/bin:$PATH
fi

eval "$(starship init zsh)"
function set_win_title(){
    echo -ne "\033]0; $USER@$HOST:${PWD/$HOME/~} \007"
}
precmd_functions+=(set_win_title)


## Plugins section: Enable fish style features
# Use syntax highlighting
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

# Use autosuggestion
source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh

# Use history substring search
source /usr/share/zsh/plugins/zsh-history-substring-search/zsh-history-substring-search.zsh

# Use fzf
source /usr/share/fzf/key-bindings.zsh

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
