---
name: gorm-repository
description: GORM ORM, SQLite, and repository patterns
category: Database Persistence
---

# Skill: gorm-repository

## What I do

I provide GORM repository expertise: model definitions, CRUD operations through the repository pattern, migrations, associations, query scopes, and SQLite-specific patterns for Go applications.

## When to use me

- Defining GORM models with tags and associations
- Implementing the repository pattern over GORM
- Writing queries with scopes, preloading, and joins
- Running migrations and seeding data
- Configuring SQLite for development and testing

## Core principles

1. **Repository pattern** - Abstract GORM behind an interface for testability
2. **Models define schema** - Use struct tags for column types, constraints, indexes
3. **Scopes for reuse** - Extract common query conditions into chainable scopes
4. **Preload associations** - Avoid N+1 with `Preload` and `Joins`
5. **Transactions for consistency** - Wrap multi-step operations in `db.Transaction`

## Patterns & examples

**Repository interface pattern:**
```go
// ✅ Correct: interface for testability
type UserRepository interface {
  FindByID(id uint) (*User, error)
  FindByEmail(email string) (*User, error)
  Create(user *User) error
  Update(user *User) error
  Delete(id uint) error
}

type gormUserRepo struct {
  db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
  return &gormUserRepo{db: db}
}

func (r *gormUserRepo) FindByID(id uint) (*User, error) {
  var user User
  err := r.db.First(&user, id).Error
  if errors.Is(err, gorm.ErrRecordNotFound) {
    return nil, ErrUserNotFound
  }
  return &user, err
}

func (r *gormUserRepo) Create(user *User) error {
  return r.db.Create(user).Error
}
```

**Model with associations:**
```go
type User struct {
  gorm.Model
  Name   string  `gorm:"not null;size:255"`
  Email  string  `gorm:"uniqueIndex;not null"`
  Orders []Order `gorm:"foreignKey:UserID"`
}

type Order struct {
  gorm.Model
  UserID uint    `gorm:"not null;index"`
  Total  float64 `gorm:"not null;default:0"`
  Items  []Item  `gorm:"foreignKey:OrderID"`
}
```

**Query scopes (reusable conditions):**
```go
// ✅ Correct: scopes are composable
func Active(db *gorm.DB) *gorm.DB {
  return db.Where("active = ?", true)
}

func CreatedAfter(t time.Time) func(*gorm.DB) *gorm.DB {
  return func(db *gorm.DB) *gorm.DB {
    return db.Where("created_at > ?", t)
  }
}

// Usage: composable query
var users []User
db.Scopes(Active, CreatedAfter(lastWeek)).Find(&users)
```

**Preloading associations:**
```go
// ✅ Correct: eager load to avoid N+1
var user User
db.Preload("Orders.Items").First(&user, id)

// ❌ Wrong: N+1 query problem
db.First(&user, id)
for _, order := range user.Orders {  // separate query per order
  db.Model(&order).Association("Items").Find(&order.Items)
}
```

**Transaction pattern:**
```go
err := db.Transaction(func(tx *gorm.DB) error {
  if err := tx.Create(&order).Error; err != nil {
    return err  // rollback
  }
  if err := tx.Model(&user).Update("balance", gorm.Expr("balance - ?", order.Total)).Error; err != nil {
    return err  // rollback
  }
  return nil  // commit
})
```

## Anti-patterns to avoid

- ❌ Using `*gorm.DB` directly in services (use repository interface)
- ❌ Ignoring `ErrRecordNotFound` (check with `errors.Is`)
- ❌ Raw SQL for simple queries (use GORM's query builder)
- ❌ Missing indexes on foreign keys (add `gorm:"index"` tag)
- ❌ AutoMigrate in production (use versioned migrations)

## Related skills

- `db-operations` - Database operations and transaction patterns
- `golang` - Core Go idioms for repository implementations
- `architecture` - Layer separation with repository pattern
- `clean-code` - SOLID principles in data access code
