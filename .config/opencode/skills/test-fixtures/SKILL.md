---
name: test-fixtures
description: Test data factory patterns
category: Testing BDD
---

# Skill: test-fixtures

## What I do

I provide expertise in consistent, realistic test data through factory patterns. I replace manual construction of complex test objects with factories that provide sensible defaults while allowing precise overrides for specific test scenarios.

## When to use me

- Defining test data once and reusing it across entire test suites (DRY).
- Need valid, realistic objects without cluttering tests with irrelevant setup details.
- Isolating tests from changes in object internal structures (e.g. new mandatory fields).
- Managing complex object graphs and relationships in tests.

## Core principles

1. **DRY Test Data** — Define test objects once, reuse everywhere.
2. **Realistic Defaults** — Use faker libraries for realistic, but random, data out of the box.
3. **Explicit Customisation** — Override only what matters for the specific test case.
4. **Independence** — Ensure each test gets fresh, non-shared objects to avoid leaks.
5. **Type Safety** — Factories should return correctly typed objects or valid database records.

## Patterns & examples

### Factory Functions (Universal Pattern)
```typescript
// JavaScript/TypeScript example
import { faker } from '@faker-js/faker';

export function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    role: 'user',
    createdAt: new Date(),
    ...overrides,
  };
}

// Usage in tests
const admin = createUser({ role: 'admin' });
```

### Traits and States (Ruby/FactoryBot)
```ruby
FactoryBot.define do
  factory :user do
    email { Faker::Internet.email }
    trait :admin do
      role { 'admin' }
    end
    trait :with_posts do
      after(:create) { |u| create_list(:post, 3, author: u) }
    end
  end
end

# Usage
author = create(:user, :with_posts)
```

## Anti-patterns to avoid

- ❌ **Hardcoded Constants** — e.g. "test@test.com"; use random/realistic data to avoid accidental collisions.
- ❌ **Manual Over-setup** — Setting 10 fields in a test that only cares about one; use factory defaults.
- ❌ **Shared Mutable Fixtures** — Sharing the same object instance between tests; leads to flaky tests.
- ❌ **Business Logic in Factories** — Factories should only create data, not perform complex operations.

## Related skills

- `test-fixtures-go` - Go-specific factory-go/gofakeit implementation.
- `bdd-workflow` - Using fixtures effectively in the Red-Green-Refactor cycle.
- `clean-code` - Applying DRY and Single Responsibility to test data.

