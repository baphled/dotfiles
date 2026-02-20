---
name: service-layer
description: Service layer patterns for business logic orchestration
category: Domain Architecture
---

# Skill: service-layer

## What I do

I provide expertise in designing application services that orchestrate business logic. I help coordinate domain operations, manage transaction boundaries, and implement use cases while maintaining a clean separation between application concerns and pure domain logic.

## When to use me

- Implementing use cases that span multiple aggregates or repositories.
- Managing transaction boundaries (Unit of Work) for complex operations.
- Coordinating interactions between the domain and external systems (emails, APIs).
- Translating between internal domain models and external DTOs/API responses.
- Decoupling high-level orchestration from low-level business rule enforcement.

## Core principles

1. **Single Responsibility** - Each service method should implement one clear use case.
2. **Thin Services, Rich Domain** - Services orchestrate; domain objects enforce business rules.
3. **Transaction Management** - Service methods define the atomic boundary for operations.
4. **Dependency Injection** - Depend on repository and gateway interfaces, not concrete implementations.
5. **statelessness** - Application services should not hold conversational state.

## Patterns & examples

**Pattern: Application Service Orchestration**
```go
func (s *OrderService) PlaceOrder(ctx context.Context, req Request) error {
    customer, _ := s.customerRepo.Find(req.CustomerID)
    order := domain.NewOrder(customer.ID())
    
    if err := order.AddItems(req.Items); err != nil {
        return err
    }
    
    if err := s.orderRepo.Save(ctx, order); err != nil {
        return err
    }
    s.events.Publish(OrderPlaced{order.ID()})
    return nil
}
```

**Pattern: Transactional Unit of Work**
```go
func (s *Service) Execute(ctx context.Context, cmd Command) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        repo := s.repo.WithTx(tx)
        return repo.Save(ctx, data)
    })
}
```

**Pattern: Validation at Boundary**
```go
func (s *Service) Handle(ctx context.Context, cmd Command) error {
    if err := cmd.Validate(); err != nil {
        return fmt.Errorf("invalid command: %w", err)
    }
    // ... proceed to domain
}
```

**Pattern: Saga (Compensating Transactions)**
```go
func (s *OrderSaga) Execute(ctx context.Context, cmd Command) error {
    id, err := s.orders.Create(ctx, cmd)
    if err != nil { return err }
    
    if err := s.inventory.Reserve(ctx, cmd); err != nil {
        s.orders.Cancel(ctx, id) // Compensate
        return err
    }
    return nil
}
```

**Pattern: DTO Mapping**
```go
func (s *Service) Get(id ID) (*DTO, error) {
    model, err := s.repo.Find(id)
    return toDTO(model), err // Don't leak domain models to the API
}
```

## Anti-patterns

- ❌ **Fat Services** - Embedding business rules in services that belong in domain entities.
- ❌ **Anaemic Services** - Service methods that just call a repository without any orchestration.
- ❌ **Leaking Domain Objects** - Returning internal domain entities directly to controllers/API.
- ❌ **Service Layer Bypass** - Controllers calling repositories or third-party APIs directly.
- ❌ **God Services** - A single service class handling unrelated business domains.

## Related skills

- `domain-modeling` - The rich models that services orchestrate.
- `api-design` - The consumer layer that calls the services.
- `gorm-repository` - Persistence implementation for services.
- `error-handling` - Consistent propagation from domain to service to API.

