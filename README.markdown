# Introduction

Comprises of my current console setup and commonly used tools

For the most part, I've been using the same configuration setup for over a
decade. Since moving back to Linux, I've updated my knowledge of productivity
tools within the ecosystem. As a bonus,

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

### btm

![Screenshot_20230903_174243](https://github.com/baphled/dotfiles/assets/37376/ef13970f-0bfb-4caa-b68f-5cdd62f747f7)

`htop` has served us well but `btm` is it's natural successor. Not only is it
more aesthetically pleasing but it provides us with a wealth of information
relating to the state of the machine we're working on.

It supports a large number of systems, so we can have it running on pretty much
anything and it's real-time information have proven invaluable to us in our day
to day work.

https://clementtsang.github.io/bottom/nightly/usage/general-usage/

### Neovim

![Screenshot 2023-08-03 18:54:37](https://github.com/baphled/dotfiles/assets/37376/10eed5f4-f8a9-4842-8b7f-ae4141d926b4)

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

![Screenshot_20230903_234925](https://github.com/baphled/dotfiles/assets/37376/c007ac17-1bd0-4681-855c-410a53b6c9fe)

We've also adopted `fzf` for fuzzy finding and integrated it into both `zsh`,
`tmux` and `neovim`. This way we're able to quickly find things without our system
in a uniform way.

### exa

We use this as a replacement for `ls`. Mostly, this is used for previews within
`fzf` but we also use it to display colourised information for files within our
system.

### ripgrep

`find` is classically fine for find files within a system but `ripgrep` is quite
a bit quicker, which is important when we're working with directories that have
a large amount of contents. It's also important to be able to generate fuzzy
finder results as quickly as possible, and this is were `ripgrep` truly shines.


### fastfetch

![Screenshot_20230903_174548](https://github.com/baphled/dotfiles/assets/37376/48e3cfd2-7468-47e3-bd88-cc75d2f5090a)

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
