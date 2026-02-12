---
name: nix
description: Nix package manager for reproducible builds, flakes, nix-shell development environments, and declarative package management
---

# Skill: nix

## What I do

I provide reproducible, declarative package management using Nix. Every build is deterministic, isolated, and pinned to exact versions. Use me for development environments, dependency management, and cross-platform builds.

## When to use me

- Creating reproducible development environments
- Pinning exact dependency versions across team/CI
- Cross-platform builds (Linux, macOS, NixOS)
- NixOS system configuration (distro-level declarative config)
- Isolating project dependencies from system packages

## Core principles

1. **Reproducibility** - Same inputs always produce same outputs
2. **Purity** - Builds isolated from system state, no hidden dependencies
3. **Declarative** - Describe what you want, not how to get it
4. **Atomic** - Operations succeed completely or rollback
5. **Pinned dependencies** - Lock exact versions for consistency

## Patterns & examples

**Pattern: flake.nix for reproducible projects**

```nix
{
  description = "My Go project";
  
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.11";
    flake-utils.url = "github:numtide/flake-utils";
  };
  
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [ pkgs.go_1_21 pkgs.gopls pkgs.golangci-lint ];
        };
      });
}
```

**Pattern: Enter reproducible shell**

```bash
# Modern flakes approach
nix develop  # uses flake.nix devShell

# Legacy shell.nix approach
nix-shell    # uses shell.nix
```

**Pattern: Lock dependencies**

```bash
nix flake lock           # generate flake.lock with exact versions
nix flake update         # update locked versions
nix flake update nixpkgs # update specific input
```

## Anti-patterns to avoid

- ❌ `nix-env -i` (imperative, breaks reproducibility)
- ❌ Unlocked flakes without `flake.lock` (non-deterministic)
- ❌ Mixing imperative (`nix-env`) and declarative (flakes) approaches
- ❌ Hardcoding paths instead of using Nix expressions
- ❌ Not committing `flake.lock` to version control

## Related skills

- `dependency-management` - Version control and updates
- `configuration-management` - Environment configuration
- `devops` - Build and deployment pipelines
