---
name: db-operations
description: Database operations following repository patterns with GORM and SQLite
category: Database Persistence
---

# Skill: db-operations

## What I do

I provide database operations expertise: transaction management, batch operations, query optimisation, migration strategies, connection pooling, and SQLite-specific patterns for Go applications using GORM.

## When to use me

- Managing database transactions and error recovery
- Optimising queries (indexes, batch inserts, pagination)
- Writing and running database migrations
- Configuring connection pools and SQLite pragmas
- Handling concurrent database access safely

## Core principles

1. **Transactions for atomicity** - Multi-step writes in transactions, always
2. **Batch operations** - Insert/update in batches, not row-by-row
3. **Indexes for reads** - Index columns used in WHERE, JOIN, ORDER BY
4. **Migrations are versioned** - Never alter production schemas ad-hoc
5. **SQLite pragmas matter** - WAL mode, foreign keys, busy timeout

## Patterns & examples

**SQLite configuration:**
```go
func OpenDatabase(path string) (*gorm.DB, error) {
  db, err := gorm.Open(sqlite.Open(path), &gorm.Config{
    Logger: logger.Default.LogMode(logger.Warn),
  })
  if err != nil { return nil, err }

  sqlDB, _ := db.DB()
  sqlDB.SetMaxOpenConns(1)  // SQLite: single writer

  // Essential SQLite pragmas
  db.Exec("PRAGMA journal_mode=WAL")       // concurrent reads
  db.Exec("PRAGMA foreign_keys=ON")         // enforce FK constraints
  db.Exec("PRAGMA busy_timeout=5000")       // wait 5s on lock
  db.Exec("PRAGMA synchronous=NORMAL")      // balance safety/speed

  return db, nil
}
```

**Batch insert:**
```go
// ✅ Correct: batch insert for performance
users := make([]User, 1000)
// ... populate users ...

db.CreateInBatches(users, 100)  // 100 per batch

// ❌ Wrong: one insert per row (1000 separate transactions)
for _, u := range users {
  db.Create(&u)
}
```

**Pagination pattern:**
```go
type PaginationParams struct {
  Page     int
  PageSize int
}

func (r *repo) FindPaginated(params PaginationParams) ([]User, int64, error) {
  var users []User
  var total int64

  db := r.db.Model(&User{})
  db.Count(&total)

  offset := (params.Page - 1) * params.PageSize
  err := db.Offset(offset).Limit(params.PageSize).
    Order("created_at DESC").Find(&users).Error

  return users, total, err
}
```

**Safe migration pattern:**
```go
func Migrate(db *gorm.DB) error {
  // AutoMigrate for development/testing
  return db.AutoMigrate(
    &User{},
    &Order{},
    &Item{},
  )
}

// For production: use versioned migrations
// with golang-migrate or goose
// Each migration is a numbered SQL file:
// 001_create_users.up.sql
// 001_create_users.down.sql
```

**Upsert (create or update):**
```go
// ✅ Correct: atomic upsert
db.Clauses(clause.OnConflict{
  Columns:   []clause.Column{{Name: "email"}},
  DoUpdates: clause.AssignmentColumns([]string{"name", "updated_at"}),
}).Create(&user)

// ❌ Wrong: find-then-create race condition
existing, _ := repo.FindByEmail(email)
if existing == nil {
  repo.Create(&user)  // another goroutine might create between check and insert
} else {
  repo.Update(existing)
}
```

## Anti-patterns to avoid

- ❌ Row-by-row inserts in loops (use `CreateInBatches`)
- ❌ Missing SQLite pragmas (WAL, foreign_keys, busy_timeout)
- ❌ `SELECT *` when only needing few columns (use `Select("id", "name")`)
- ❌ Ad-hoc schema changes in production (use versioned migrations)
- ❌ Ignoring transaction rollback on error (use `db.Transaction` callback)

## Related skills

- `gorm-repository` - Repository pattern over GORM
- `migration-strategies` - Safe database migration workflows
- `golang` - Core Go patterns for database code
- `security` - SQL injection prevention (parameterised queries)
