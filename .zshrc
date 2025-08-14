ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
[ ! -d $ZINIT_HOME ] && mkdir -p "$(dirname $ZINIT_HOME)"
[ ! -d $ZINIT_HOME/.git ] && git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
source "${ZINIT_HOME}/zinit.zsh"

zinit ice wait"0" lucid
zi snippet OMZ::plugins/git/git.plugin.zsh

zinit ice wait"0" lucid
zi snippet OMZ::plugins/bundler/bundler.plugin.zsh

# (optional) only auto-load in dirs with an .nvmrc:
zstyle ':omz:plugins:nvm' autoload yes
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

# renaming multiple files at once
autoload -U zmv

# History
HISTFILE=~/.zsh_history
HISTSIZE=1000000000
SAVEHIST=$HISTSIZE
HISTDUP=erase

## Options
setopt correct_all
setopt extendedglob
setopt nocaseglob
setopt rcexpandparam
setopt nocheckjobs
setopt numericglobsort
setopt nobeep
setopt appendhistory
setopt histignorealldups
setopt autocd
setopt auto_pushd
setopt pushd_ignore_dups
setopt pushdminus
setopt share_history
setopt hist_ignore_space
setopt hist_ignore_all_dups
setopt hist_save_no_dups
setopt hist_ignore_dups
setopt hist_find_no_dups

autoload -Uz compinit
compinit

# automatically load bash completion functions
autoload -U +X bashcompinit && bashcompinit

zi cdreplay -q
zi cdlist -q &>/dev/null

eval "$(zoxide init zsh)"

# Bindings.
bindkey -v
bindkey '^n' history-search-forward
bindkey '^p' history-search-backward
bindkey '^k' autosuggest-accept

if [ -n "$TMUX" ]; then
  : # NO-OP
else
  ~/bin/fastfetch_autoscale
fi

## Path section
[[ -d "$HOME/.local/bin" ]] && export PATH="$HOME/.local/bin:$PATH"
[[ -d "$HOME/.rvm/bin" ]] && export PATH="$HOME/.rvm/bin:$PATH"
[[ -s "$HOME/.config/aliasrc" ]] && source "$HOME/.config/aliasrc"
[[ -s $HOME/.tmuxinator/scripts/tmuxinator  ]] && source $HOME/.tmuxinator/scripts/tmuxinator
[[ -d "$HOME/go/bin" ]] && export PATH="$PATH:$HOME/go/bin"
[[ -d "$HOME/.rvm/bin" ]] && export PATH="$PATH:$HOME/.rvm/bin"
export PATH=/bin:~/bin:$PATH

# Arch Linux command-not-found support
[[ -e /usr/share/doc/pkgfile/command-not-found.zsh ]] && source /usr/share/doc/pkgfile/command-not-found.zsh
# Advanced command-not-found hook
[[ -e /usr/share/doc/find-the-command/ftc.zsh ]] && source /usr/share/doc/find-the-command/ftc.zsh

[[ -s "$HOME/.fzf.zsh" ]] && source "$HOME/.fzf.zsh"
[[ -s "$HOME/.config/zsh/op-init.zsh" ]] && source "$HOME/.config/zsh/op-init.zsh"
[[ -s "$HOME/.rvm/scripts/rvm" ]] && source "$HOME/.rvm/scripts/rvm"

# qlty
export QLTY_INSTALL="$HOME/.qlty"
export PATH="$QLTY_INSTALL/bin:$PATH"
source /home/baphled/.config/op/plugins.sh
