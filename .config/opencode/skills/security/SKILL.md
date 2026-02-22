---
name: security
description: Secure coding practices including input validation, SQL injection prevention
category: Security
---

# Skill: security

## What I do

I provide the foundational expertise for writing secure code. I focus on preventing common vulnerabilities like SQL injection, cross-site scripting (XSS), and improper authentication, ensuring that applications are built on a solid foundation of secure coding practices.

## When to use me

- When writing database queries or interacting with persistent storage
- When handling user-provided data in any part of the application
- When implementing authentication, session management, or password storage
- During code reviews to identify potential security flaws
- When configuring security headers or cross-origin policies

## Core principles

1. **All input is malicious** — Never trust data from a client or external service. Always validate, sanitise, and encode.
2. **Parameterised Queries** — Use prepared statements and parameterised queries for all database interactions to prevent SQL injection.
3. **Output Encoding** — Encode data before rendering it in the UI to prevent XSS attacks.
4. **Secure Defaults** — Use libraries and frameworks that have secure default configurations.

## Patterns & examples

**SQL Injection Prevention Pattern:**
```typescript
// ✅ Correct: Use parameterised queries
const query = "SELECT * FROM users WHERE email = ?";
const results = await db.execute(query, [userEmail]);

// ❌ Wrong: Using string interpolation or concatenation
// const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
```

**Secure Password Storage Pattern:**
- Use a strong, salted hashing algorithm like **bcrypt** or **argon2**.
- Never store passwords in plain text or using weak algorithms like MD5 or SHA1.
- Use a high work factor (cost) to slow down brute-force attacks.

**Security Code Review Checklist:**
- Is user input validated against a strict allowlist?
- Are database queries parameterised?
- Is sensitive data (PII) encrypted at rest and in transit?
- Are authentication tokens handled securely (e.g., HttpOnly, Secure flags)?
- Are security headers (CSP, HSTS, X-Frame-Options) configured correctly?

## Anti-patterns to avoid

- ❌ **Client-side only validation** — Bypassing client-side checks is easy. Always validate on the server.
- ❌ **Improper error handling** — Leaking sensitive system information (e.g., stack traces, DB schemas) in error messages.
- ❌ **Rolling your own security** — Use well-vetted, industry-standard libraries for authentication and cryptography.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Security/Security.md`

## Related skills

- `cyber-security` — Advanced vulnerability assessment and threat modelling
- `check-compliance` — Automated security scanning and linting
- `static-analysis` — Identifying logic flaws and vulnerabilities
- `dependency-management` — Managing third-party library risks
- `clean-code` — Writing maintainable and secure logic
