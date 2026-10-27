# Security Policy

Trafiora treats database credentials, query telemetry, and workload safety with the highest priority.

---

## 1. Reporting Security Vulnerabilities
If you discover a security vulnerability in Trafiora, please report it privately:
- **Email:** `vonamala.pranay@gmail.com`
- **Subject:** `[SECURITY] Trafiora Vulnerability Report`

Please include:
1. Description of the vulnerability and attack vector.
2. Step-by-step reproduction instructions or proof-of-concept.
3. Affected versions and component boundaries.

We will acknowledge receipt within 48 hours and provide a timeline for triage and patch release. Please do not open public GitHub issues for undisclosed security vulnerabilities.

---

## 2. Core Security Controls
- **Zero Raw Query Storage:** Raw incoming SQL strings are discarded from memory immediately after AST normalization.
- **Literal Stripping:** Query parameters and literals are stripped to prevent PII and secret exposure.
- **Key-Separated Credential Vaulting:** Database credentials are encrypted using AES-256-GCM. The encryption key is kept external to the database.
- **Role Isolation & Session Verification:** Benchmark connections run under dedicated roles and tag every session with `application_name = 'trafiora_bench_<uuid>'`. The monitoring role (`trafiora_monitor`) is strictly read-only and possesses zero termination privileges.
- **Three-Tier Operational Risk Separation:** Production monitoring targets never execute benchmark traffic or schema mutations.
