---
name: devops
description: CI/CD, infrastructure as code, containerisation, and operational excellence
---

# Skill: devops

## What I do

I teach DevOps practices for building reliable deployment pipelines, infrastructure as code, containerisation, and operational excellence. This makes deployments repeatable, auditable, and safe.

## When to use me

- Setting up CI/CD pipelines (GitHub Actions, GitLab CI)
- Writing Dockerfiles and container orchestration
- Infrastructure as Code (Terraform, CloudFormation, Nix)
- Deployment automation and strategies (blue/green, canary, rolling)
- Building reproducible environments
- Implementing monitoring and observability
- Zero-downtime deployments

## Core principles

1. **Automate Everything** - Manual processes are error-prone and slow
2. **Infrastructure as Code** - Treat infrastructure like application code
3. **Fail Fast** - Detect problems early in the pipeline
4. **Small Batches** - Deploy frequently with small changes
5. **Version Everything** - Infrastructure, config, and code in git
6. **Monitor Everything** - Observability is not optional

## Patterns & examples

**GitHub Actions workflow (CI/CD):**
```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: make test
      - name: Check coverage
        run: make coverage
      
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: make deploy
```

**Dockerfile (multi-stage build):**
```dockerfile
# Build stage
FROM golang:1.21 AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server

# Production stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/server /server
ENTRYPOINT ["/server"]
```

**Infrastructure as Code (Terraform):**
```hcl
resource "aws_instance" "app_server" {
  ami           = var.app_ami
  instance_type = "t3.micro"
  
  tags = {
    Name        = "app-server"
    Environment = var.environment
  }
}

output "instance_ip" {
  value = aws_instance.app_server.public_ip
}
```

**Deployment strategies:**
- **Blue/Green**: Run two identical environments, switch traffic atomically
- **Canary**: Deploy to subset of servers, monitor, then roll out
- **Rolling**: Update servers incrementally with health checks
- **Feature Flags**: Deploy code disabled, enable gradually

**Health checks pattern:**
```go
// Health endpoint for container orchestration
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    if !db.Ping() {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}
```

## Anti-patterns to avoid

- ❌ Manual deployments (use automation)
- ❌ Secrets in code/containers (use secret management)
- ❌ No rollback plan (always have escape hatch)
- ❌ Snowflake servers (infrastructure not reproducible)
- ❌ Deploying untested code (CI must pass before CD)
- ❌ No monitoring/alerts (you can't fix what you can't see)
- ❌ Mutable infrastructure (treat servers as cattle, not pets)

## Related skills

- `github-expert` - GitHub Actions workflows and CI/CD
- `automation` - Build self-maintaining systems
- `scripter` - Bash/Python for deployment scripts
- `configuration-management` - Environment variables, secrets, feature flags
- `monitoring` - Post-deployment health checks and observability
- `docker` - Container best practices
- `security` - Secure deployment pipelines and secret management
