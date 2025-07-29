# JavaScript Guidelines

## JavaScript

* **Language:** JavaScript (dynamic, prototype-based scripting language).

* **Description:**
  JavaScript code prioritizes modularity, readability, and adherence to modern ECMAScript (ES6+) standards. Community best practices are followed to keep the codebase consistent and maintainable.

## Frameworks

### Vue.js

* **Description:** Vue.js is the core front-end framework for building the user interface. It allows a modular design by dividing the app into reusable components, managing state centrally, and updating the DOM reactively.
* **Example:**

  ```html
  <!-- A simple Vue component -->
  <template>
    <div>Hello, {{ name }}!</div>
  </template>

  <script>
  export default {
    props: ['name']
  }
  </script>
  ```

## Framework Details

* **Component-based Architecture:** The application is divided into components, each with its own template, script, and style. This separation of concerns makes the UI more maintainable and encourages reuse. Styles can be scoped to avoid conflicts between components.
* **State Management:** A centralized store (using [Vuex](https://vuex.vuejs.org/) in Vue 2 or Vuex/Pinia in Vue 3) holds global state. Components derive data from the store, and updates are done via defined mutations/actions, ensuring a single source of truth for application state.
* **Routing:** [Vue Router](https://router.vuejs.org/) is used for client-side routing between views. It supports dynamic routes and navigation guards (for authentication or pre-loading data), and enables lazy-loading of route components for performance.
* **Component Communication:** Parent-child communication uses props (for passing data down) and custom events (for notifying parent components of changes). For sibling or distant components, an event bus or the global store (actions/state) is used to share information.

## LSP

The development environment uses the TypeScript language server (`tsserver`) for JavaScript and Vue files, enhanced with a Vue-specific plugin. This provides intelligent code completion, type checking, and refactoring support even in `.vue` single-file components. ESLint is integrated into the editor to lint and auto-fix code on save. Additional editor plugins (like **nvim-cmp** for autocompletion in Neovim) further enhance productivity with inline documentation and suggestions.

## Project Management Practices

1. **Dependencies:** Manage frontend dependencies with `package.json` and npm (or Yarn). Lock versions via a lockfile (`package-lock.json` or `yarn.lock`) to ensure consistency across environments.
2. **Task Automation:** Use the Vue CLI service (`vue-cli-service`) for common tasks like serving the app in development, building optimized production bundles, and running tests or linters.
3. **Configuration:** Use environment files (e.g., `.env.development`, `.env.production`) to store configuration such as API endpoints or feature flags for different environments. The build system automatically picks the appropriate config based on environment.
4. **Version Control:** Use Git for source control. Adopt a consistent branching strategy (feature branches, PR reviews before merge). Commit messages follow the Conventional Commits format (e.g., *feat: add new login component*). Tools like Husky are used to run linters/tests on commits, preventing bad code from being committed.
5. **Containerisation:** Docker (or Nix) is sometimes employed to standardize the development environment and CI builds. (The team often prefers Nix for its lightweight reproducible dev environments.)
6. **Continuous Integration:** Set up CI pipelines (e.g., GitHub Actions or GitLab CI) to run automated tests (unit and end-to-end) and perform builds on each push/merge. Deployment to staging/production is also automated (using services like Netlify or Vercel for front-end hosting).

* **Conventions:** **(Expanded)**

  1. Embrace modern JavaScript features (ES6+). Use `import/export` modules, arrow functions, `const`/`let` instead of `var`, template literals, and other ES2015+ syntax to write cleaner and more robust code.
  2. Build small, **reusable components** rather than large monolithic ones. Each component should ideally handle one piece of UI or state. This modular approach aligns with Vue’s philosophy and improves maintainability and testability.
  3. Follow naming conventions from the official Vue style guide. Use **multi-word names** for components to avoid conflicts with native HTML elements (e.g., `UserCard` instead of `Card`). Component files are typically named in **kebab-case** (e.g., `user-card.vue`), and component definitions use **PascalCase** (`UserCard`). Consistent naming makes the project easier to navigate.
  4. Use Promises and async/await for asynchronous operations (e.g., API calls) instead of older callback patterns. This results in more readable, linear code for handling asynchronous logic and errors.

* **Code Structure:**
  The project has a well-defined structure:

  * **`src/`:** Application source code (components, views, utilities, etc.). In larger applications, subdirectories like `store/` (for Vuex state management) and `router/` (for route definitions) are included to organize state and navigation.
  * **`tests/`:** Contains test suites (unit tests, integration tests, and end-to-end tests). For example, you might have `unit/` and `e2e/` subfolders using Jest and Cypress respectively.
  * **`public/`:** Static assets such as images and the base HTML file (`index.html`). These are served directly.
  * **Root Directory:** Contains configuration and metadata files like `package.json` (dependencies and scripts), ESLint config (e.g., `.eslintrc.js`), Prettier config, README, etc.

* **Toolchain:**

  1. **Editor:** Neovim (with extensions for Vue syntax highlighting and ESLint integration).
  2. **Build/Serve:** Vue CLI (via `vue-cli-service`) for development server, production builds, and project configuration.
  3. **Version Control:** Git (with Husky for Git hooks to run checks on commits, like linting or tests).
  4. **Testing:** **Jest** for unit tests, **Cypress** for end-to-end/browser tests, and **Storybook** for isolated UI component testing and documentation.
  5. **Linting/Formatting:** **ESLint** (JavaScript/Vue linting) and **Prettier** (code formatting) to enforce code style consistently.
  6. **Documentation:** **Storybook** serves as a living style guide, allowing developers to document and visually test components in isolation.

* **Dependencies:**

  * **Production Dependencies:**

    * **Vue.js:** The core framework for building the UI.
    * **Vuex:** State management library for centralizing application state.
    * **Vue Router:** Official routing library for navigation.
    * **Axios:** Promise-based HTTP client for making API requests.
    * **Lodash:** Utility library (e.g., using functions like `lodash.groupby` for data manipulation).
  * **Development Dependencies:**

    * **@babel/core** (and related presets/plugins) for transpiling modern JS if needed.
    * **ESLint:** Pluggable linter to enforce code style.
    * **Prettier:** Code formatter to auto-format code on save or commit.
    * **Jest:** Testing framework for unit tests.
    * **Cypress:** End-to-end testing framework.
    * **Storybook:** Tool for developing and testing UI components in isolation.
    * **Husky:** Git hooks management tool (used to run linters/tests before commits).

## Testing Tools

The project employs multiple testing tools to ensure code quality at different levels:

### Jest

* **Description:** Jest is a JavaScript testing framework used for unit tests. It provides a simple API for assertions and mocking, and it runs tests quickly in a Node environment.
* **Example:**

  ```javascript
  // sum.js - a simple function to test
  function sum(a, b) {
    return a + b;
  }

  // sum.test.js - Jest unit test for the sum function
  test('adds numbers correctly', () => {
    expect(sum(1, 2)).toBe(3);
  });
  ```

### Cypress

* **Description:** Cypress is used for end-to-end testing in the browser. It simulates user interactions and verifies that the entire application works as expected (from loading pages to clicking buttons and checking results). Tests run in a real browser environment.
* **Example:**

  ```javascript
  // example.e2e.js - Cypress end-to-end test
  describe('Login Flow', () => {
    it('allows a user to log in', () => {
      cy.visit('/login');
      cy.get('input[name="username"]').type('testuser');
      cy.get('input[name="password"]').type('secret123');
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/dashboard');
      cy.contains('Welcome, testuser');
    });
  });
  ```

### Storybook

* **Description:** Storybook isn’t a testing tool in the traditional sense, but it is used for **visual testing** and documentation of components. Developers create stories (isolated examples) for each component, allowing visual review of components in various states and helping catch UI issues. Storybook serves as living documentation for UI components, where team members can interact with components without running the full app. (Visual regression testing can be added with Storybook plugins if needed.)

## Code Style

1. **ESLint** is configured to enforce a consistent style, often extending a widely-used guide like [Airbnb’s JavaScript Style Guide](https://github.com/airbnb/javascript). Project-specific rules or exceptions are captured in the ESLint config. Developers should fix lint errors and warnings as part of the development process.
2. **Prettier** is used for automatic code formatting. Code is formatted on each save or commit, ensuring a uniform style (quotes, spacing, semicolons, etc.) across the codebase without manual effort.
3. **Commit Messages:** Follow the Conventional Commits convention for commit messages (e.g., “feat: add user profile component”). A tool like Commitlint is used in combination with Husky to validate commit message format automatically.

## Code Comments

Use JSDoc-style comments for functions, classes, and modules. Begin comment blocks with `/**` and include `@param`, `@returns`, and other relevant tags to describe the function’s behavior and API. These comments help tools and other developers understand the code’s intent and can be used to generate documentation. Strive to write self-documenting code, using comments to clarify complex logic or intent rather than to restate what the code does.


