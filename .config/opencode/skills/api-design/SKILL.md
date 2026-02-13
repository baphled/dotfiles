---
name: api-design
description: Design clean, consistent APIs - RESTful conventions, versioning, backwards compatibility
category: Domain Architecture
---

# Skill: api-design

## What I do

I teach clean API design: RESTful resource modelling, consistent naming, proper HTTP status codes, versioning strategies, error response formats, and backwards compatibility. Focused on Go HTTP APIs.

## When to use me

- Designing new REST endpoints or Go HTTP handlers
- Choosing URL structure, HTTP methods, and status codes
- Defining error response formats for consistency
- Planning API versioning or deprecation strategies
- Reviewing APIs for consistency and discoverability

## Core principles

1. **Resources, not actions** — URLs are nouns (`/users/123`), HTTP methods are verbs (`GET`, `DELETE`)
2. **Consistent naming** — Plural nouns, kebab-case paths, camelCase JSON fields
3. **Proper status codes** — 201 for created, 204 for no content, 404 for not found, 409 for conflict
4. **Structured errors** — Every error returns machine-readable code + human message
5. **Backwards compatible by default** — Add fields, never remove; deprecate before breaking

## Patterns & examples

**RESTful resource design:**

| Action | Method | Path | Status |
|--------|--------|------|--------|
| List users | `GET` | `/api/v1/users` | 200 |
| Create user | `POST` | `/api/v1/users` | 201 |
| Get user | `GET` | `/api/v1/users/:id` | 200 |
| Update user | `PATCH` | `/api/v1/users/:id` | 200 |
| Delete user | `DELETE` | `/api/v1/users/:id` | 204 |

**Structured error response:**
```go
type APIError struct {
    Code    string `json:"code"`    // machine-readable: "user_not_found"
    Message string `json:"message"` // human-readable: "User not found"
    Details any    `json:"details,omitempty"`
}

// Usage in handler
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
    user, err := h.service.Find(id)
    if errors.Is(err, ErrNotFound) {
        writeJSON(w, http.StatusNotFound, APIError{
            Code:    "user_not_found",
            Message: "User with this ID does not exist",
        })
        return
    }
}
```

**Pagination pattern:**
```go
type PageResponse struct {
    Data       []User `json:"data"`
    Page       int    `json:"page"`
    PerPage    int    `json:"per_page"`
    TotalCount int    `json:"total_count"`
    HasMore    bool   `json:"has_more"`
}
// GET /api/v1/users?page=2&per_page=25
```

**Versioning strategies:**

| Strategy | Example | Trade-off |
|----------|---------|-----------|
| URL prefix | `/api/v1/users` | Simple, visible; duplicates routes |
| Header | `Accept: application/vnd.api.v2+json` | Clean URLs; harder to test |
| Query param | `/users?version=2` | Easy to test; pollutes params |

**Recommendation:** URL prefix for simplicity. Bump major version only for breaking changes.

**Go handler structure:**
```go
// Accept interfaces for testability
func NewRouter(svc UserService) http.Handler {
    mux := http.NewServeMux()
    h := &handler{svc: svc}
    mux.HandleFunc("GET /api/v1/users/{id}", h.GetUser)
    mux.HandleFunc("POST /api/v1/users", h.CreateUser)
    return mux
}
```

## Anti-patterns to avoid

- ❌ **Verbs in URLs** (`/getUser`, `/deleteUser`) — Use HTTP methods instead
- ❌ **200 for everything** — Clients can't distinguish success from error without parsing body
- ❌ **Unstructured errors** (`{"error": "something went wrong"}`) — Unactionable for clients
- ❌ **Breaking changes without versioning** — Renaming or removing fields breaks existing clients
- ❌ **Exposing internal IDs** — Database auto-increment IDs leak information; consider UUIDs

## Related skills

- `architecture` - Layer boundaries that APIs sit within
- `service-layer` - Business logic behind API handlers
- `documentation-writing` - API documentation for consumers
- `error-handling` - Consistent error propagation to API responses
