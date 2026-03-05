---
name: platformio
description: PlatformIO build system for embedded development with Arduino compatibility
category: General Cross Cutting
---

# Skill: platformio

## What I do

I help you develop embedded applications using the PlatformIO build system. I focus on managing board configurations, library dependencies, and the compilation and upload process. I ensure that your development environment is portable and reproducible.

## When to use me

- When you're starting a new project for an ESP32, Arduino, or other microcontroller.
- When you're adding third-party libraries to your project.
- When you're configuring multi-environment builds (e.g., dev and prod).
- When you're debugging code on hardware.

## Core principles

1. **Declarative configuration**, keep all project settings in the `platformio.ini` file.
2. **Dependency management**, explicitly list library dependencies to ensure builds are reproducible.
3. **Environment isolation**, use different environments for different boards or build configurations.
4. **Command-line first**, master the CLI for faster compilation, upload, and monitoring.

## Patterns & examples

### platformio.ini configuration
A standard configuration for an ESP32 project.
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps =
    bblanchon/ArduinoJson @ ^6.19.4
    knolleary/PubSubClient @ ^2.8
monitor_speed = 115200
```

### Common CLI commands
- `pio run`, Compile the project.
- `pio upload`, Upload the compiled binary to the board.
- `pio device monitor`, Open the serial monitor.
- `pio run -t clean`, Clean the build folder.

### Unit testing with Unity
Create tests in the `test/` directory.
```cpp
#include <unity.h>

void test_calculator_add(void) {
    TEST_ASSERT_EQUAL(4, 2 + 2);
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_calculator_add);
    UNITY_END();
}
```

## Anti-patterns to avoid

- ❌ **Manual library installation**, downloading libraries into your project folder manually makes it hard to manage versions. Use `lib_deps`.
- ❌ **Hardcoding board settings**, avoid putting board-specific macros in your code. Use `platformio.ini` to define environment-specific flags.
- ❌ **Ignoring the monitor speed**, forgetting to set `monitor_speed` in `platformio.ini` often leads to garbage output in the serial monitor.
- ❌ **Bloated global libraries**, don't install libraries globally. Keep them project-specific for better portability.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/General-Cross-Cutting/Platformio.md`

## Related skills

- `cpp`, for the core programming language.
- `embedded-testing`, for testing on hardware.
- `automation`, for CI/CD pipelines.
- `linux-expert`, for serial port management.
