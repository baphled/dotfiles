# Introduction

Comprises of my current console setup and commonly used tools

For the most part, I've been using the same configuration setup for over a
decade. Since moving back to Linux, I've updated my knowledge of productivity
tools within the ecosystem.

In addition to all of this we've replaced vim with `neovim`. This is one of the
biggest changes to our [dotfiles](https://github.com/baphled/dotfiles), as it
meant rebuilding our text editor from the group up. Even though this is the
case, we've managed to greatly improve our editor to the extent that it is a
large improvement from what we had previously.

Although we are still huge fans of `tmux`, we have also added configuration
settings for kitty. As time progress we may well replace `tmux` with kitty but this
is something that needs to be reviewed over time. There are some benefits to
using kitty over `tmux`, but we still find `tmux` more comfortable to use so we feel
it's premature to make the jump yet.

The final change is swapping out `solarized` for `catppuccin`. This has been
replaced with vim, KDE and `zsh`. We have left `solarized` as an option but as it
stand, perhaps we've just been using `solarized` for so long, we're really liking
the `catppuccin` theme.

## Install

```sh
  git init &&
  git remote add origin git://github.com/baphled/dotfiles.git &&
  git pull &&
  git submodule init &&
  git submodule update --init --recursive &&
  git submodule status
```

## Dependencies

We won't go into the first 3 tools, as they are _so_ common, that there's plenty
of resources touching on them already.

### Git

### Tmux

### RVM

### Sesh

[Sesh](https://github.com/joshmedeski/sesh)

We've introduced this tool to help us manage our tmux sessions. We've been using
`tmux` for a long time now, and we've always found it a bit of a pain to manage
sessions. We've been using tmuxinator for a while now, but we've found that it
can lead to having a large number of sessions open at once. This is where `sesh`
comes in. It allows us to manage our sessions in a more efficient way. So we
want to explore this tool further and see if it can help us to manage our
sessions in a more efficient way.

### Zoxide

[Zoxide](https://github.com/ajeetdsouza/zoxide)

We've tried to use autojump in the past, but we've found that it's not as
efficient as we'd like it to be. We've heard good things about `zoxide` and we
want to give it a try. Zoxide is a faster way to navigate your filesystem. It
remembers the directories you use most frequently and allows you to jump to
them quickly in a more efficient way. We're hoping that this will help us to
navigate our filesystem in a more efficient way.

We've also integrated it with sesh, tmux and fzf to make it easier to navigate
our filesystem.

### btop

![btop](https://github.com/baphled/dotfiles/assets/37376/9041565a-e5a2-44cd-815c-ed105c321f7f)

`htop` has served us well but `btop` is it's natural successor. Not only is it
more aesthetically pleasing but it provides us with a wealth of information
relating to the state of the machine we're working on.

It supports a large number of systems, so we can have it running on pretty much
anything and it's real-time information have proven invaluable to us in our day
to day work.

https://clementtsang.github.io/bottom/nightly/usage/general-usage/

### Neovim

![neovim](https://github.com/baphled/dotfiles/assets/37376/3d111efb-7440-4dcf-8977-ad739a797a5a)

We've been using `vim` for decades now, and using anything else seemed like a
complete was of time. That is until we recently spent time exploring `neovim`.
When we checked it out a number of years ago, we didn't see the point in
migrating yet, but since then there has been a large number of changes to the
ecosystem that made it impossible not to make the jump.

We've totally overhauled our vim setup, to work exclusively with `neovim` and we
don't think we'll be looking back. Vim proved to make a massive impact on our
day to day work, but `neovim` makes these improvements seem trivial.

We've extended it to the point of have an extremely advanced Personal
Development Environment (PDE) as well as improving the look and feel of our
editor as a whole.

This has not only greatly improved our workflow but it's also made it a lot more
visually stimulating to work within.

### fzf

![fzf](https://github.com/baphled/dotfiles/assets/37376/44727029-1f1a-4659-a453-5fc2da98506f)

We've also adopted `fzf` for fuzzy finding and integrated it into both `zsh`,
`tmux` and `neovim`. This way we're able to quickly find things without our system
in a uniform way.

### exa

![exa](https://github.com/baphled/dotfiles/assets/37376/635eee61-72fa-4848-be28-2b43c5c76e62)

We use this as a replacement for `ls`. Mostly, this is used for previews within
`fzf` but we also use it to display colourised information for files within our
system.

### ripgrep

`find` is classically fine for find files within a system but `ripgrep` is quite
a bit quicker, which is important when we're working with directories that have
a large amount of contents. It's also important to be able to generate fuzzy
finder results as quickly as possible, and this is were `ripgrep` truly shines.


### fastfetch

![fastfetch](https://github.com/baphled/dotfiles/assets/37376/ce6b936c-ff9d-4c73-84ab-c1b7425c0649)

I've always want to enhance how my terminal looks. For this we've introduced
`fastfetch` to display information about the machine we're working on. We've
further enhanced this by providing a script that picks a random image and
renders it dependant on the terminal/emulator we're using. This keeps our
terminal as consistent as possible whilst providing our own look and feel to it.

What's included
===============

* Custom aliases to help me to get into projects
* Colourised git output
* Customised commands (see bin directory for more information)
* Customised Vim settings (my own concoction)
