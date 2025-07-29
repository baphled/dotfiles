# C++ Guidelines

## C++

* **Language:** C++ (compiled systems programming language known for performance and low-level control).

* **Description:**
  C++ code is used for performance-critical, system-level applications. It emphasizes strong typing and manual memory management. Developers adhere to community standards (e.g., [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) or LLVM’s guidelines) to maintain consistent formatting and best practices.

## Frameworks

### PlatformIO

* **Description:** PlatformIO is a cross-platform build system and library manager, commonly used for embedded C++ development (e.g., Arduino projects). It provides a unified workflow for compiling code, managing board-specific settings, and installing libraries.
* **Configuration Files:**

  * **`platformio.ini`:** The core project configuration file defining environments, board types, platform, frameworks, and build flags.
    *Example snippet:*

```
    [env:uno]
    platform = atmelavr
    board = uno
    framework = arduino
```


 (In this example, an environment for an Arduino Uno is configured.)
* **`library.json`:** Defines metadata for any custom libraries in the project (name, version, dependencies), helping PlatformIO manage those libraries.
* **Integration:** PlatformIO integrates with IDEs/editors (including Neovim) and can be invoked via CLI (`pio run`, `pio test`, etc.). It supports CI integration and works with Docker or Nix to ensure consistent build environments.

## Framework Details **(Added)**

C++ projects often use build frameworks or systems to organize code and dependencies. Tools like PlatformIO (for embedded development) or CMake (for general C++ projects) provide structure to the build process, manage third-party libraries, and ensure reproducible builds across different environments. These frameworks enforce a modular project layout and handle toolchain differences, allowing developers to focus on application logic rather than low-level build configuration.

## Project Management Practices

1. **Dependencies:** Use PlatformIO’s manifest files to manage libraries and packages. The `platformio.ini` and `library.json` files declare external dependencies and ensure they are fetched at specific versions.
2. **Task Automation:** Define common tasks (build, upload, test, clean) in PlatformIO (via the CLI or IDE). PlatformIO’s configuration replaces manual Makefiles by automating compiler flags, library linking, and upload procedures based on the target environment.
3. **Code Quality:** Integrate formatting and linting into the development workflow. For example, run **clang-format** and **cpplint** (or clang-tidy) as Git pre-commit hooks to automatically format code and catch style issues before changes are committed **(Added)**.
4. **Version Control:** Use Git for source control. Maintain a clear commit history; consider using a branching model and merge requests for code reviews. For important releases, tag versions and use signed commits for authenticity.
5. **Containerisation:** Use Docker or Nix to create consistent build environments, especially for CI. This ensures that all developers (and CI servers) use the same compiler version and library set, eliminating “works on my machine” issues.
6. **Continuous Integration:** Set up CI pipelines (e.g., GitHub Actions, GitLab CI) to automatically compile the code and run tests on each push or pull request. For embedded projects, consider using emulators or hardware-in-the-loop tests in CI to verify functionality.

* **Conventions:** **(Expanded)**

  1. Separate interface and implementation. Use header files (`.hpp`/`.h`) for declarations and source files (`.cpp`) for definitions. This modular approach improves compile times and enforces clear API boundaries.
  2. Follow consistent naming conventions as per the chosen style guide. For example, name classes and structs in **PascalCase**, functions and variables in **camelCase**, and constants or macros in **ALL\_CAPS**. Use meaningful names that make the code self-explanatory, reducing the need for extraneous comments.
  3. Prefer modern C++ features and idioms to manage resources safely. Utilize RAII (Resource Acquisition Is Initialization) — for instance, use smart pointers (`std::unique_ptr`, `std::shared_ptr`) instead of raw pointers, and standard containers (like `std::vector` or `std::array`) instead of manual dynamic arrays. This helps prevent memory leaks and undefined behavior.
  4. Use type-safe and `constexpr` features instead of preprocessor macros when possible. For example, use `constexpr` for compile-time constants and `enum class` for scoped enumerations instead of `#define` or unscoped `enum`. This provides better type checking and avoids macro-related pitfalls.
  5. Write self-documenting code. Favor clear logic and readable structure over “clever” or overly compact code. Avoid magic numbers (use named constants or `enum` values) and clarify non-obvious code with brief comments. When comments are used, ensure they explain the intent or rationale rather than restating the code.

* **Code Structure:**
  The project is organized into clear directories, each with a specific purpose:

  * **`src/`:** Source code (.cpp files). This may be further organized into subdirectories (e.g., `Adapters/`, `Devices/`, `Interfaces/`) to reflect different modules or layers of the software.
  * **`include/`:** Header files (.hpp/.h) that expose public interfaces and types. Code in `src` includes these headers as needed. (Often, this directory represents the library’s API when distributing code.)
  * **`test/`:** Test code (e.g., unit tests using Google Test or Catch2, along with any test doubles/mocks). The test directory structure may mirror `src` for one-to-one testing of components.
  * **Root Directory:** Contains project configuration and metadata files such as `platformio.ini` (build settings), `library.json` (library dependencies), `README.md` (project documentation), and CI config files or Dockerfiles if applicable.

* **Toolchain:**

  1. **Editor:** Neovim (configured with C++ LSP support and debugging plugins).
  2. **Build System:** PlatformIO (manages compilation, linking, and uploading for embedded targets; internally uses compilers like GCC/AVR-GCC). For non-embedded projects, CMake or Meson might be used instead to generate platform-specific build files.
  3. **Version Control:** Git (with optional hook scripts or tools like Husky/pre-commit to run formatters/linters automatically on commits).
  4. **Testing Frameworks:** Google Test and Catch2 for unit testing. Tests can be executed on the host machine or on embedded simulators/target hardware.
  5. **Documentation:** Doxygen for generating reference documentation from comments. This provides up-to-date developer docs directly from the source annotations.

* **Dependencies:**

  * **Production Dependencies:**

    * **C++ Standard Library (STL):** Use of standard containers (`<vector>`, `<string>`, etc.) and algorithms to leverage well-tested implementations.
    * **PlatformIO Core Libraries:** Board- or platform-specific frameworks for hardware abstraction (for example, the Arduino core library when targeting Arduino boards, as configured in `platformio.ini`).
    * **Boost:** (If used) Additional utility libraries providing functionality not in the C++ standard library (e.g., Boost.Asio for networking, Boost.Filesystem for file handling in C++11, etc.).
  * **Development Dependencies:**

    * **PlatformIO CLI:** Command-line interface for PlatformIO (compiling, uploading, and testing firmware outside of an IDE).
    * **Google Test / Catch2:** Unit testing frameworks (often included via PlatformIO or as git submodules for testing).
    * **clang-format & cpplint:** Tools to enforce coding style (run manually or via automation).
    * **Static Analysis Tools:** (Optional) Utilities like clang-tidy or Valgrind/ASAN for detecting bugs and memory issues during development.

## LSP

Neovim integrates with **clangd** (the C++ language server) to provide a rich editing experience:

* **Setup:** clangd is configured to index the entire project (often using a `compile_commands.json` generated by PlatformIO or CMake) to provide accurate suggestions. It’s launched with flags like `--background-index` to enable indexing of all project files.
* **Features:** With clangd, developers get auto-completion of code (including members and include files), real-time diagnostics for errors, and on-hover documentation for C++ symbols. Semantic highlighting provides visual context (e.g., distinguishing local variables, class members, and global symbols).
* **Navigation:** LSP features like “go to definition,” “find references,” and symbol renaming work across the codebase, making it easier to navigate a large project.
* **Extensions:** Additional Neovim plugins such as **nvim-cmp** enhance autocompletion, and **nvim-treesitter** can be used alongside clangd for improved syntax highlighting. These tools together create an IDE-like experience in the editor.

## Testing Tools

For C++ projects, two primary testing frameworks are commonly used:

### Google Test

* **Description:** Google Test (gTest) is a widely-used C++ unit testing framework. It provides a rich set of assertions and constructs for organizing tests (test cases, test suites) and works seamlessly with CMake and other build systems for integration.
* **Example:**

  ```cpp
  #include <gtest/gtest.h>

  // Production code function to be tested
  int Add(int a, int b) {
      return a + b;
  }

  // Test case using Google Test
  TEST(MathTest, AddsNumbersCorrectly) {
      EXPECT_EQ(Add(2, 3), 5);
      EXPECT_EQ(Add(-1, 1), 0);
  }
  ```

### Catch2

* **Description:** Catch2 is a header-only C++ testing framework that is easy to integrate. It supports BDD-style test cases with an expressive, natural-language syntax for test declarations.
* **Example:**

  ```cpp
  #define CATCH_CONFIG_MAIN  // Provide a main() for Catch2
  #include "catch.hpp"

  int Factorial(int n) {
      return n <= 1 ? 1 : n * Factorial(n - 1);
  }

  TEST_CASE("Factorials are computed", "[math]") {
      REQUIRE(Factorial(1) == 1);
      REQUIRE(Factorial(2) == 2);
      REQUIRE(Factorial(3) == 6);
  }
  ```

*Embedded Testing:* In addition to standard unit tests, embedded C++ projects may use simulation or hardware-in-the-loop tests. Mocks or fake implementations of hardware interfaces are created to run tests on a host machine. This allows testing of business logic without physical hardware and ensures compatibility when deploying to embedded systems.

*CI Integration:* Both Google Test and Catch2 test suites are integrated into the CI pipeline. When code is pushed to the repository, the CI system compiles and runs the tests (either on a native platform or via an emulator for embedded targets), automatically catching regressions or failures.

## Code Style

1. Use **clang-format** with a consistent style configuration to automatically format code. This enforces indentation, spacing, brace style, and other formatting rules uniformly across the codebase.
2. Optionally use **cpplint** (or clang-tidy’s style checks) to ensure the code conforms to the chosen style guide (e.g., Google’s C++ style). Address any issues it flags to keep the code aligned with industry standards.
3. Adhere to best practices for file structure and naming. Every header file should have an include guard or `#pragma once` to prevent duplicate inclusions. Order `#include` statements with standard library headers first, then third-party, then project headers. Follow the naming conventions outlined in Conventions (PascalCase types, camelCase functions, etc.) for consistency.

## Code Comments **(Added)**

Document interfaces and complex logic using comments, but avoid redundant or excessive commentary:

* For **API documentation**, use Doxygen-style comments. Begin functions, classes, or modules with `///` or `/** ... */` explaining their purpose, parameters (`@param`), return values (`@return`), and any important notes. These comments can be extracted to generate reference docs, ensuring documentation stays up-to-date with the code.
* Strive to make the code self-explanatory through clear naming and structure. Use inline comments sparingly, focusing on the “why” behind a decision or algorithm. Avoid restating what the code is doing in comments. Instead, clarify the intent or any non-obvious behavior. By combining self-documenting code with targeted comments, the codebase remains both clean and understandable.


