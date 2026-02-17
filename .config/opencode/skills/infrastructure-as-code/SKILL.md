---
name: infrastructure-as-code
description: Declarative infrastructure management, version-controlled environments, and immutable infrastructure
category: DevOps Operations
---

# Skill: infrastructure-as-code

## What I do

I treat infrastructure as software. I use declarative files to provision, configure, and manage cloud resources and system environments, ensuring reproducibility, auditability, and consistency through automation.

## When to use me

- Provisioning cloud resources (VMs, databases, networks)
- Managing multi-environment deployments (dev, staging, prod)
- Ensuring environment parity across teams and regions
- Auditing infrastructure changes via version control
- Disaster recovery — rebuilding entire stacks from declarations

## Core principles

1. **Declarative Over Imperative** — Describe WHAT you want, not HOW to get there
2. **Version Control** — All infrastructure definitions must live in git
3. **Immutability** — Replace resources rather than modifying them in place
4. **Idempotency** — Re-applying the same configuration produces the same result
5. **Modularity** — Build reusable modules to encapsulate common patterns

## Patterns & examples

**Declarative Resource (Terraform/HCL):**
```hcl
resource "aws_s3_bucket" "artifacts" {
  bucket = "project-artifacts"
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

**Environment Parity (Variables):**
```hcl
# environments/production.tfvars
instance_type = "m5.xlarge"
min_instances = 3

# environments/staging.tfvars
instance_type = "t3.medium"
min_instances = 1
```

**Remote State Management:**
```hcl
terraform {
  backend "s3" {
    bucket         = "tf-state-storage"
    key            = "global/s3/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "tf-state-locking"
    encrypt        = true
  }
}
```

**Secrets Reference (Never Hardcode):**
```hcl
data "aws_secretsmanager_secret_version" "creds" {
  secret_id = "db-password"
}

resource "aws_db_instance" "main" {
  # ...
  password = data.aws_secretsmanager_secret_version.creds.secret_string
}
```

## Anti-patterns to avoid

- ❌ **Manual Changes** — "Click-ops" causes drift; all changes must go through code
- ❌ **Secrets in Git** — Never store passwords or keys in IaC files; use secret managers
- ❌ **Monolithic Config** — Break infrastructure into smaller, manageable modules
- ❌ **Hardcoded Values** — Use variables and data sources for cross-environment flexibility
- ❌ **State in Git** — State files contain sensitive data and cause merge conflicts

## Related skills

- `nix` - Declarative package management and system configuration
- `docker` - Container-based infrastructure patterns
- `aws` - Cloud service provisioning and management
- `devops` - Broader operational and deployment context
