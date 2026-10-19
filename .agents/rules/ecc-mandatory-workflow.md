# Mandatory ECC Workflow & Skill Discovery Protocol

Whenever a user presents a new task, feature request, refactor, or bug fix, the assistant MUST strictly execute through the ECC (Everything Claude Code) skill and agent workflow before and during implementation.

## Phase 1: ECC Capability & Skill Discovery (Pre-Flight)
Before writing or modifying any code or taking unilateral action:
1. **Skill Discovery**: Query the available ECC skill catalog (e.g., `tdd-workflow`, `search-first`, `code-review`, `verification-loop`, `error-handling`, `data-scraper-agent`, `api-connector-builder`, `frontend-patterns`, `backend-patterns`, `security-review`).
2. **Match Domain Tools**: Identify which ECC skills, agents, and best practices directly match the problem domain.
3. **Adopt Established Patterns**: If a matching ECC skill or pattern exists, read its `SKILL.md` or apply its guidelines immediately rather than inventing custom or ad-hoc patterns.

## Phase 2: Plan & Architect
- For any multi-step, architectural, or non-trivial change, apply the **planner** and **architect** principles:
  - Formulate requirements and acceptance criteria.
  - Break tasks into decoupled, immutable vertical slices.
  - Present the plan before massive changes.

## Phase 3: Test-Driven Development (TDD)
- Strictly enforce the ECC **tdd-guide** workflow:
  - **Red**: Write failing tests reproducing bug or validating new capability first.
  - **Green**: Implement the minimal, clean code required to pass tests.
  - **Refactor**: Optimize while maintaining 80%+ test coverage.

## Phase 4: Verification & Code Review Gate
- Before claiming any task is done or completed:
  - Run the full test suite (`npm test` / project test runner).
  - Apply the ECC **code-reviewer** & **security-reviewer** checklist:
    - Zero exposed secrets.
    - Full input validation & error boundaries.
    - Immutability preserved.
  - Validate real behavior against requirements with measurable evidence.
