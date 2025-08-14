# Load per-command fzf customizations
for f in $HOME/.config/fzf/commands/*.zsh; do
  [[ -r "$f" ]] && source "$f"
done
