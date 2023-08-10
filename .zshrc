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
plugins=(rails ruby gem git github rake rvm vi-mode bundler brew heroku history-substring-search vagrant vi-mode themes autojump cp)

source $ZSH/oh-my-zsh.sh
source $HOME/.agile_ruby_workflow.zsh

# Customize to your needs...
PATH="/usr/local/opt/coreutils/libexec/gnubin:$PATH"
export PATH=/usr/local/sbin:/usr/local/bin:/usr/bin:/bin:/usr/games:/opt/bin:/opt/local/bin:~/bin:/usr/local/rvm/bin:$PATH

export MANPATH="/usr/local/opt/coreutils/libexec/gnuman:$MANPATH"

alias tmux="tmux -u2"
alias vino="vim -u NONE -N"

export EDITOR=vim
export TERM=xterm-256color

eval `dircolors ~/colors/dircolors-solarized/dircolors.ansi-dark`

# We want vi-mode
set -o vi

# Ignore all duplicate history entries
setopt hist_ignore_all_dups

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
alias mmv='noglob zmv -W'

PROMPT+=`$([ -n "$TMUX"  ] && tmux setenv TMUXPWD_$(tmux display -p "#D" | tr -d %) "$PWD")`

export XML_CATALOG_FILES="/usr/local/etc/xml/catalog"

bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

# Load RVM if it is installed,
#  first try to load  user install
#  then try to load root install, if user install is not there.
if [ -s "$HOME/.rvm/scripts/rvm" ] ; then
elif [ -s "/usr/local/rvm/scripts/rvm" ] ; then
fi

export PATH="$HOME/bin/:$PATH:$HOME/.rvm/bin" # Make sure local bin files around found before system ones

# Add RVM to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:$HOME/.rvm/bin"

# Add python to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:$HOME/.local/bin"

## Add snap bin to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH:/snap/bin"

## Add flutter bin to PATH for scripting. Make sure this is the last PATH variable change.
export PATH="$PATH":"$HOME/.pub-cache/bin"

export NVM_DIR=~/.nvm
source ~/.nvm/nvm.sh

# Work out whether we're in TMUX, kitty or something else
#
# If we are then we should use jp2a, otherwise we should use the default
if [ -n "$TMUX" ]; then
  # We're in TMUX
  # Use catimg
  neofetch --jp2a
elif [ -z "$KITTEN_PID" ]; then
  # We're in kitty
  # Use the default
  neofetch
else
  # We're in a normal terminal
  neofetch
fi
