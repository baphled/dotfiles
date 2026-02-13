---
name: javascript
description: JavaScript/TypeScript, Vue.js, Node.js, async patterns, and modern ES6+ practices
category: Languages
---

# Skill: javascript

## What I do

I provide JavaScript and TypeScript expertise: modern ES6+ idioms, async/await patterns, functional programming, Vue.js conventions, and best practices for clean, maintainable JavaScript code.

## When to use me

- Writing JavaScript or TypeScript code (frontend or backend)
- Working with Vue.js, Next.js, or Node.js
- Designing async workflows or promise chains
- Understanding TypeScript types and interfaces
- Optimising JavaScript for performance

## Core principles

1. **ES6+ is standard** - Use const/let (never var), arrow functions, template literals
2. **Async/await over callbacks** - Clearer control flow, easier error handling
3. **TypeScript for safety** - Type annotations catch errors before runtime
4. **Functional patterns** - map, filter, reduce over imperative loops
5. **Immutability by default** - Use const, spread operator, avoid mutations

## Patterns & examples

**Modern variable declaration:**
```javascript
// ✅ Correct: const by default, let only when reassignment needed
const config = { timeout: 5000 };
let retries = 0;

// ❌ Wrong: var is function-scoped, confusing
var oldStyle = true;
```

**Async/await idiom:**
```javascript
// ✅ Correct: async/await, clear error handling
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

// ❌ Wrong: promise chains, harder to follow
fetch(url)
  .then(r => r.json())
  .then(data => process(data))
  .catch(err => console.error(err));
```

**TypeScript interface design:**
```typescript
// ✅ Correct: explicit interfaces, optional fields clear
interface User {
  id: number;
  name: string;
  email?: string;  // optional
  role: 'admin' | 'user';  // union types
}

// ❌ Wrong: any defeats purpose of TypeScript
function getUser(id: any): any {
  return users[id];
}
```

**Functional patterns:**
```javascript
// ✅ Correct: use map, filter, reduce
const doubled = numbers.map(n => n * 2);
const adults = people.filter(p => p.age >= 18);
const total = prices.reduce((sum, p) => sum + p, 0);

// ❌ Wrong: C-style for loops
for (let i = 0; i < numbers.length; i++) {
  result.push(numbers[i] * 2);
}
```

## Anti-patterns to avoid

- ❌ Callback hell (use async/await or promises)
- ❌ Mutable state in closures (risk of bugs, hard to test)
- ❌ Type `any` (defeats TypeScript's purpose)
- ❌ Synchronous operations blocking event loop (use async)
- ❌ Silent failures (always handle promise rejections)

## Related skills

- `clean-code` - SOLID principles in JavaScript
- `bdd-workflow` - Test-driven development workflow
- `jest` - Jest testing framework for JavaScript
- `design-patterns` - Common patterns in JavaScript
