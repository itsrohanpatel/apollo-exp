# Scripts Lifecycle & Tooling Discipline Rule

All code and scripts created in the `scripts/` directory must adhere to the following lifecycle rules:

## 1. Explicit Purpose Declaration
- Any script created in `scripts/` must begin with a descriptive header comment explaining:
  - **Purpose**: What problem or hypothesis it investigates.
  - **Lifecycle**: Whether it is **PERMANENT** (a long-term operational tool) or **TEMPORARY** (a one-off verification script).
  - **Usage**: Exact CLI invocation command.

## 2. Temporary / Scratch Scripts Cleanup
- If a script is created to test a quick hypothesis, debug a single API response, or run a one-time verification:
  - It must be deleted immediately once the test has finished and results are recorded.
  - Alternatively, one-off scratch scripts should be placed in temporary scratch locations rather than cluttering `scripts/`.

## 3. Permanent Long-Term Tooling Registry
- If a tool is intended for recurring or long-term use (e.g., live CDP probes, CSV auditors, extension reloaders, benchmark suites):
  - It must be registered and documented in `scripts/README.md`.
  - The entry must state its exact purpose, when to use it, and CLI usage instructions.
  - All unit test assertions must reside in `tests/`, not as loose script files in `scripts/`.
