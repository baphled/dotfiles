---
name: graphql
description: GraphQL API design and implementation patterns
category: Database Persistence
---

# Skill: graphql

## What I do

I provide GraphQL API expertise: schema design, type system, resolvers, query/mutation patterns, error handling, pagination, and N+1 prevention with dataloaders.

## When to use me

- Designing GraphQL schemas and type hierarchies
- Writing queries, mutations, and subscriptions
- Implementing resolvers with proper error handling
- Optimising with dataloaders to prevent N+1 queries
- Pagination patterns (cursor-based, offset)

## Core principles

1. **Schema-first design** - Define your schema before writing resolvers
2. **Types model the domain** - Types are domain concepts, not database tables
3. **Nullable by default** - Fields are nullable unless explicitly `!` (non-null)
4. **Dataloaders for N+1** - Batch and cache field resolution across queries
5. **Errors are typed** - Use union types or error extensions, not just strings

## Patterns & examples

**Schema design:**
```graphql
type User {
  id: ID!
  name: String!
  email: String!
  orders(first: Int, after: String): OrderConnection!
}

type Order {
  id: ID!
  total: Float!
  status: OrderStatus!
  items: [OrderItem!]!
  createdAt: DateTime!
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
}

type Query {
  user(id: ID!): User
  users(first: Int!, after: String): UserConnection!
}

type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
}
```

**Input types and payloads:**
```graphql
# ✅ Correct: dedicated input type and result payload
input CreateOrderInput {
  userId: ID!
  items: [OrderItemInput!]!
}

input OrderItemInput {
  productId: ID!
  quantity: Int!
}

type CreateOrderPayload {
  order: Order
  errors: [UserError!]!
}

type UserError {
  field: String!
  message: String!
}

# ❌ Wrong: bare scalar arguments
# createOrder(userId: ID!, productId: ID!, qty: Int!): Order
```

**Cursor-based pagination (Relay spec):**
```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Query: users(first: 10, after: "cursor123")
```

**Resolver with dataloader (Go, gqlgen):**
```go
// ✅ Correct: dataloader batches user lookups
func (r *orderResolver) User(ctx context.Context, obj *Order) (*User, error) {
  return r.userLoader.Load(ctx, obj.UserID)
}

// Dataloader setup — batches calls within same request
func NewUserLoader(repo UserRepository) *dataloader.Loader[uint, *User] {
  return dataloader.NewBatchedLoader(func(ctx context.Context, ids []uint) []*dataloader.Result[*User] {
    users, _ := repo.FindByIDs(ids)
    // map results back to input order
    userMap := make(map[uint]*User)
    for _, u := range users { userMap[u.ID] = u }
    results := make([]*dataloader.Result[*User], len(ids))
    for i, id := range ids {
      results[i] = &dataloader.Result[*User]{Data: userMap[id]}
    }
    return results
  })
}

// ❌ Wrong: N+1 — one DB query per order
func (r *orderResolver) User(ctx context.Context, obj *Order) (*User, error) {
  return r.repo.FindByID(obj.UserID)  // called once per order in list
}
```

## Anti-patterns to avoid

- ❌ Exposing database schema as GraphQL schema (model the domain, not tables)
- ❌ No dataloaders on list resolvers (causes N+1 queries)
- ❌ Returning generic error strings (use typed errors with field/message)
- ❌ Offset pagination for large datasets (use cursor-based)
- ❌ Deeply nested queries without depth limiting (DoS risk)

## Related skills

- `api-design` - General API design principles
- `golang` - Go resolver implementations (gqlgen)
- `javascript` - JS resolver implementations (Apollo)
- `security` - Query depth limiting and rate limiting
