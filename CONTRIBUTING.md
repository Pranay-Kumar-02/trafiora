# Contributing to Trafiora

Thank you for your interest in contributing to Trafiora! We welcome contributions that align with our core mission: **Diagnose. Prove. Protect.**

---

## 1. Code of Conduct
Trafiora is dedicated to providing an inclusive, harassment-free environment for all participants. Be respectful, constructive, and collaborative.

---

## 2. Development Principles & Safety Standards
1. **Zero-Trust Safety Defaults:** All queries against user databases must default to read-only observation.
2. **Never Execute Arbitrary Observed Queries:** `EXPLAIN ANALYZE` must never be run on production monitoring connections, even in a transaction rollback.
3. **Evidence-Based Evaluation:** We never assume an index or query rewrite improves performance. Changes must be benchmarked across $K \ge 5$ independent repetitions with statistical significance tests.
4. **Clean Code & Strict Typing:**
   - Backend: Python code must be typed (`mypy --strict`) and clean (`ruff check .`).
   - Frontend: TypeScript code must have zero implicit `any` and pass `tsc --noEmit`.

---

## 3. Pull Request & Commit Guidelines
- Use **Conventional Commits**:
  - `feat(...)`: A new user-facing feature
  - `fix(...)`: A bug fix
  - `test(...)`: Adding or updating test suites
  - `chore(...)`: Maintenance, dependencies, tooling
  - `docs(...)`: Documentation updates
- Include comprehensive unit and integration tests for every new feature or bug fix.
- Ensure all quality gates pass before opening a pull request.
