# SECURITY_CONTRACT.md

Contract 7 — Security & Trust Boundary Contract

Version 1.1.0

---

0. Contract Status

Status: Architecture Review / Candidate Freeze
Contract: C7
Authority: Security semantics, security controls, trust boundaries, and security enforcement
Depends on: C1 v1.1.0, C2 v1.1.0, C3 v1.1.0, C4 v1.1.0, C5 v1.1.0, C6 v1.1.0

This contract defines the platform security model.

It MUST NOT redefine domain, database, API, exam-engine, or client rules owned by C1–C6.

Where another contract is normative for a behavior, this contract defines only its security requirements and references that contract.

---

1. Normative Ownership

C7 is the sole normative owner of:

- authentication security
- authorization security
- RBAC security semantics
- account security
- token/session security
- API security controls
- abuse prevention
- rate-limit enforcement
- secret management
- data protection requirements
- storage/media security
- security logging and security audit requirements
- client-side security requirements
- Web/Mobile security boundaries
- security requirements for external providers
- payment security boundary
- security testing requirements

Other contracts remain authoritative for their own domains.

Examples:

- C3 owns database structure and persistence.
- C4 owns API endpoint contracts and response formats.
- C5 owns exam lifecycle and grading semantics.
- C6 owns client/platform architecture.
- C7 owns the security constraints applied to all of them.

---

2. Core Security Principles

The platform MUST follow:

1. Server authority.
2. Least privilege.
3. Deny by default.
4. Explicit authorization.
5. Defense in depth.
6. Secure-by-default configuration.
7. Minimal data collection.
8. Minimal secret exposure.
9. No client-controlled security decisions.
10. No trust based solely on opaque identifiers.
11. No sensitive information leakage through errors or logs.
12. Historical exam data MUST remain protected and immutable according to C3/C5.
13. Security controls MUST apply equally to Web and Android unless a platform-specific difference is explicitly required by C6.

---

3. Trust Boundaries

The following boundaries are mandatory:

3.1 Client → API

The client is untrusted.

The server MUST NOT trust client-supplied:

- user identity
- role
- permissions
- marks
- correctness
- grading status
- attempt ownership
- attempt state
- expiration state
- subscription/payment state
- security decisions

Client-provided values MUST be validated and authorized server-side.

---

3.2 API → Database

Database access MUST occur through controlled server-side data-access code.

Security requirements include:

- parameterized SQL
- no SQL constructed from raw user input
- least-privilege database credentials
- no database credentials in client code
- no database credentials in logs
- no direct database exposure to clients

C3 remains authoritative for database structure and persistence.

---

3.3 Server → External Providers

External providers are untrusted boundaries.

The server MUST verify:

- authentication-provider responses
- OAuth identity assertions
- payment-provider callbacks/webhooks
- externally supplied signatures
- externally supplied identifiers

Client claims about external-provider state MUST NOT be accepted as authoritative.

---

3.4 Storage

Storage MUST be treated as a separate trust boundary.

Storage credentials and privileged service keys MUST remain server-side.

Client applications MUST never receive privileged storage credentials.

---

4. Authentication

4.1 Authentication Authority

Authentication establishes who the user is.

Authorization determines what that authenticated user may do.

They MUST remain separate.

The server MUST establish the authenticated identity before executing protected operations.

---

4.2 Server-Side Identity

For protected API operations:

- authenticated identity MUST come from validated server-side authentication credentials;
- client-supplied "userId" MUST NOT override the authenticated identity;
- request parameters containing user IDs MUST be treated as resource identifiers, not identity assertions.

C4 remains authoritative for endpoint behavior.

---

4.3 Password Authentication

Passwords MUST:

- never be stored in plaintext;
- never be logged;
- never be returned by an API;
- never be included in client-visible errors;
- be processed using an adaptive password-hashing algorithm.

Argon2id is the required preferred password-hashing algorithm.

Password verification MUST use constant-time-safe library primitives.

Password-reset and password-change flows MUST invalidate previously compromised authentication credentials where the implementation supports credential revocation.

---

4.4 Password Requirements

The implementation MUST enforce reasonable password strength and MUST NOT rely solely on arbitrary complexity rules.

Passwords MUST NOT be silently truncated.

The system MUST reject obviously invalid credentials without revealing whether an account exists when such disclosure would enable account enumeration.

---

5. JWT / Token Security

The authentication system may use JWT as defined by the application architecture.

Tokens MUST:

- have explicit expiration;
- use approved signing algorithms;
- use sufficiently strong signing secrets/keys;
- contain only required claims;
- never contain passwords, secrets, or sensitive exam data;
- never be logged;
- never be exposed through error messages.

The authenticated subject ("sub") MUST be derived from the validated token and MUST NOT be replaced by request-body identity fields.

Role claims, if present, MUST NOT be treated as an independent authorization authority when current server-side account state is available.

Authorization MUST remain server-controlled.

---

6. Token Lifetime and Storage

Access credentials MUST be short-lived.

The default architectural target is:

- access token: approximately 15 minutes;
- refresh credential: longer-lived and protected separately.

Refresh credentials MUST be protected against unauthorized access and MUST NOT be stored in plaintext server logs.

Web

Sensitive long-lived authentication material SHOULD use an HttpOnly, Secure mechanism where cookie-based refresh is implemented.

If browser-accessible storage is used for any authentication material, the implementation MUST explicitly justify the security tradeoff.

Android

Long-lived authentication material MUST use platform-secure storage available through the Capacitor/native boundary.

It MUST NOT be stored in ordinary plaintext application storage.

C6 owns the platform implementation boundary.

---

7. Logout, Refresh, and Credential Revocation

The authentication system MUST provide controlled:

- login
- refresh
- logout
- credential-change
- credential-recovery

flows.

Refresh credentials MUST expire.

Credential revocation MUST occur when required by security-sensitive account events, including account disabling and password-reset/security-recovery events.

Logout MUST remove active client credentials.

Where server-side revocation state exists, logout/revocation MUST invalidate the corresponding refresh capability.

The implementation MUST NOT expose a mechanism allowing a client to extend an expired access token indefinitely.

---

8. Google OAuth / External Authentication

Google authentication MUST be treated as an external identity provider.

The server MUST:

- validate the provider-issued identity;
- verify the intended client/application context;
- validate redirect/callback state where applicable;
- prevent token substitution;
- map the verified provider identity to the local account;
- never trust arbitrary client-supplied Google profile data as proof of identity.

The platform MUST NOT accept an unverified Google user ID as authentication.

---

9. Account Status Security

C3 stores account status.

C7 owns its security interpretation.

At minimum:

"active"

The account may authenticate and perform authorized operations.

"suspended"

Authentication or protected operations MUST be restricted according to the security policy.

"disabled"

The account MUST NOT be permitted to authenticate normally.

Status changes affecting authentication MUST be security-audited.

---

10. Authorization

Authorization MUST be:

- server-side;
- explicit;
- deny-by-default;
- evaluated for every protected operation;
- based on authenticated identity and current server-side authorization state.

A valid token does NOT imply permission to access every resource.

---

11. Object-Level Authorization

Every protected resource MUST be checked against the authenticated user and the requested operation.

Examples include:

- exam attempts
- exam results
- exam answers
- user account data
- uploaded media
- content-management resources
- administrative resources

Knowing an attempt ID, question ID, UUID, or other identifier MUST NOT grant access.

UUIDs are identifiers, not authorization.

---

12. RBAC

C3 defines the stored role values.

C7 owns the security semantics of role-based authorization.

The currently defined roles are:

- "student"
- "content_partner"
- "admin"

Authorization MUST NOT depend on client-side role values.

The exact Admin permission matrix is intentionally reserved and MUST NOT be invented or expanded in this contract.

Any abnormal or unsafe Admin authorization behavior discovered during implementation or audit MUST be reported for explicit architectural decision.

---

13. Authorization Consistency

The same security-sensitive action MUST have one canonical authorization rule.

Authorization MUST NOT be duplicated independently in:

- React components;
- Android UI;
- route-specific ad-hoc checks;
- database assumptions;
- hidden client flags.

Client-side permission checks may improve UX but MUST NOT provide security.

---

14. API Security

C4 owns endpoint contracts.

C7 owns the security requirements applied to those endpoints.

Protected endpoints MUST enforce:

1. authentication;
2. authorization;
3. input validation;
4. resource ownership/access checks;
5. rate limiting where applicable;
6. safe error handling;
7. security logging where required.

API endpoints MUST NOT expose:

- SQL errors;
- stack traces;
- internal filesystem paths;
- secrets;
- credentials;
- token values;
- private infrastructure information.

C4 owns the canonical API error envelope.

---

15. Input Validation

All external input MUST be treated as untrusted.

Validation MUST cover:

- type;
- structure;
- allowed values;
- length;
- range;
- required fields;
- nested structures;
- identifiers;
- uploaded files;
- request size.

Validation MUST occur server-side even when equivalent client-side validation exists.

C2 owns question schemas.

C4 owns API request DTOs.

C5 owns exam-answer/grading validation semantics.

C7 owns the security requirement that all of them MUST be validated before trusted processing.

---

16. SQL Injection Protection

All SQL MUST use parameterized queries.

Raw user input MUST NOT be concatenated into SQL.

Database credentials MUST be server-side only.

C3 remains the normative owner of database access architecture.

---

17. Rate Limiting and Abuse Prevention

C4 defines the endpoint rate-limit policy and thresholds.

C7 owns security enforcement and abuse-prevention semantics.

Rate limiting MUST protect at minimum:

- login;
- registration;
- password recovery;
- exam start;
- exam finish;
- other security-sensitive endpoints.

Controls SHOULD consider both:

- source/network identity;
- account identity;

where technically appropriate.

Rate-limit responses MUST NOT disclose sensitive account information.

---

18. Brute Force Protection

Authentication systems MUST defend against:

- password brute force;
- credential stuffing;
- repeated invalid authentication;
- automated account enumeration;
- password-reset abuse.

The system SHOULD use progressive throttling or equivalent controls where appropriate.

Security controls MUST avoid unnecessarily creating an easy denial-of-service mechanism against legitimate users.

---

19. Account Enumeration Protection

Registration, login, password recovery, and similar flows MUST avoid unnecessarily revealing:

- whether an email exists;
- whether a phone exists;
- whether an account has a specific status;
- internal account identifiers.

Public-facing responses MUST use safe, consistent messaging where enumeration risk exists.

---

20. Password Recovery

Password-reset credentials MUST:

- be unpredictable;
- expire;
- be single-use;
- never be logged;
- never be stored in plaintext when persistence is required;
- be invalidated after successful use.

The recovery flow MUST NOT disclose whether an account exists through distinguishable responses where enumeration risk exists.

---

21. CORS

CORS MUST use an explicit allowlist of trusted application origins.

The production configuration MUST NOT use unrestricted wildcard origins for authenticated application traffic.

Credentialed cross-origin requests MUST only be permitted for explicitly trusted origins.

---

22. CSRF

If authentication uses browser cookies, CSRF protection MUST be implemented for state-changing requests.

If a state-changing API is authenticated exclusively through non-browser-managed bearer credentials, CSRF exposure is reduced, but other API authorization controls remain mandatory.

The implementation MUST use one coherent authentication/CSRF model rather than mixing insecure assumptions.

---

23. XSS Protection

The Web application MUST treat all externally supplied content as untrusted.

The client MUST:

- avoid unsafe HTML injection;
- sanitize/render rich content according to an explicit safe policy;
- avoid dynamic script execution from user content;
- avoid exposing secrets to browser JavaScript unnecessarily.

Security headers and a restrictive Content Security Policy SHOULD be deployed in production where compatible with the application.

---

24. Security Headers

Production Web responses SHOULD include appropriate security headers, including where applicable:

- Content-Security-Policy;
- X-Content-Type-Options;
- Referrer-Policy;
- frame-embedding protection;
- HTTPS enforcement.

Exact header configuration belongs to implementation and deployment, but disabling these protections without justification is prohibited.

---

25. Secrets Management

Secrets MUST NEVER be committed to source control.

This includes:

- database passwords;
- JWT signing secrets;
- OAuth secrets;
- Supabase/service-role credentials;
- payment secrets;
- API keys;
- private signing keys;
- refresh secrets;
- encryption keys.

Secrets MUST be supplied through secure environment/configuration mechanisms.

Secrets MUST NOT appear in:

- source code;
- client bundles;
- APK assets;
- Git history;
- logs;
- screenshots;
- API responses;
- error messages.

---

26. Client-Side Secret Boundary

Anything shipped to Web or Android MUST be considered public.

Therefore:

- API keys embedded in the client are not secrets;
- privileged service keys MUST never be shipped;
- database credentials MUST never be shipped;
- JWT signing secrets MUST never be shipped;
- payment private keys MUST never be shipped.

C6 owns client architecture; C7 defines the security boundary.

---

27. Exam Security

C5 owns exam lifecycle and grading authority.

Security requirements:

- the server remains authoritative;
- client answers are untrusted;
- client-calculated marks are untrusted;
- client-calculated correctness is untrusted;
- client-calculated expiration is untrusted;
- exam ownership MUST be verified;
- submitted question IDs MUST be checked against the attempt snapshot;
- grading MUST occur server-side.

The zero-request exam rule defined by C5/C6 MUST NOT be bypassed by hidden polling, answer synchronization, or heartbeat traffic.

---

28. Exam Snapshot Protection

Exam snapshots contain authoritative historical exam material.

Access MUST be restricted to authorized users and server-side operations.

Simulator responses MUST NOT expose grading keys.

This security requirement reinforces C2/C4/C5 and does not redefine their payload contracts.

---

29. Historical Data Security

Exam attempts, snapshots, answers, and results are historical records.

Security controls MUST prevent unauthorized:

- modification;
- deletion;
- reassignment;
- cross-user access.

C3 owns persistence constraints.

C5 owns historical exam semantics.

C7 owns unauthorized-access prevention.

---

30. Media and File Upload Security

Uploaded media MUST be treated as untrusted input.

The server MUST validate:

- file size;
- declared MIME type;
- actual file characteristics where applicable;
- permitted file types;
- storage destination.

The system MUST prevent:

- path traversal;
- arbitrary executable uploads;
- unsafe file serving;
- storage-key manipulation;
- unauthorized access.

Storage keys SHOULD be generated by the system rather than directly trusting client-provided paths.

C3 owns "media_assets" persistence.

C4 owns media API behavior.

C7 owns media security.

---

31. Storage Access

Privileged storage credentials MUST remain server-side.

Private assets MUST NOT become publicly accessible merely because a client knows the storage key.

When temporary access is required, the system SHOULD use controlled, time-limited access mechanisms.

Public assets may be served publicly only when their content is intentionally public.

---

32. Payment Security Boundary

Payment/subscription functionality is outside the Phase 1 exam dependency as defined by C1/C4.

When implemented:

- payment status MUST be server-authoritative;
- client claims of successful payment MUST NOT grant access;
- payment-provider webhooks MUST be verified;
- webhook signatures MUST be validated;
- duplicate webhook delivery MUST be handled safely;
- payment secrets MUST remain server-side;
- sensitive payment-card data MUST NOT be stored unless a separately approved architecture explicitly requires it.

---

33. Audit Logging

C3 provides the "audit_logs" persistence structure.

C7 owns which security events require auditing.

Security-sensitive events SHOULD include:

- successful/failed authentication where operationally appropriate;
- password/security recovery events;
- account status changes;
- role/security-state changes;
- authorization-sensitive administrative actions;
- security configuration changes;
- payment-security events;
- suspicious or blocked security events.

Logs MUST NOT contain:

- passwords;
- raw authentication tokens;
- refresh credentials;
- private keys;
- database credentials;
- unnecessary sensitive personal data.

Audit metadata MUST remain bounded and safe for storage.

---

34. Audit Integrity

Security audit records MUST be generated server-side.

Clients MUST NOT be allowed to create authoritative security audit records.

Security logs MUST be protected against unauthorized modification or deletion.

---

35. Logging Security

Application logs MUST avoid sensitive information.

Never log:

- passwords;
- access tokens;
- refresh tokens;
- authorization headers;
- API keys;
- database credentials;
- secret environment variables.

Sensitive request bodies MUST be excluded or redacted where required.

---

36. Error Security

Errors MUST fail safely.

The system MUST NOT expose internal implementation details to clients.

Examples of prohibited leakage:

- SQL statements;
- stack traces;
- filesystem paths;
- environment variables;
- database hostnames where unnecessary;
- secret names/values;
- internal service credentials.

C4 owns the external error format.

---

37. Web Security

The Web application MUST:

- operate over HTTPS in production;
- avoid exposing privileged secrets;
- protect authentication credentials;
- use secure browser security controls;
- enforce server-side authorization;
- treat all rendered external/content data as untrusted;
- avoid unsafe dynamic code execution.

Browser UI visibility MUST NOT be considered authorization.

---

38. Android Security

The Android application MUST:

- use HTTPS for production API communication;
- protect stored authentication credentials using platform-secure storage;
- never embed server secrets;
- never embed database credentials;
- never embed privileged Supabase/service-role credentials;
- avoid storing unnecessary sensitive exam data permanently;
- respect the C6 local exam architecture.

Android lifecycle behavior MUST NOT be treated as an authorization mechanism.

---

39. Camera Security Boundary

The Simulator camera feature is UX simulation only.

The security architecture MUST NOT treat the camera as:

- a proctoring system;
- a cheating detector;
- an evidence recorder;
- a behavioral-analysis system.

No camera recording, upload, or server-side storage is permitted unless a future contract explicitly changes this architecture.

---

40. Connectivity and Offline Security

During an active exam:

- local operation follows C5/C6;
- the client remains untrusted;
- loss of connectivity MUST NOT make client state authoritative;
- answer synchronization MUST NOT be introduced;
- FINISH remains server-authoritative.

A client MUST NOT mark an exam as permanently submitted without server confirmation.

---

41. Data Minimization

The platform MUST collect and retain only data required for:

- authentication;
- authorization;
- exam operation;
- educational functionality;
- security;
- operational requirements;
- explicitly approved future features.

Unnecessary personal data MUST NOT be collected merely because it is technically available.

---

42. Data Protection

Sensitive application data MUST be protected:

- in transit using HTTPS/TLS;
- at rest using managed infrastructure protections where available;
- through least-privilege access;
- through restricted database/storage credentials.

The application MUST NOT implement custom cryptography where standard, reviewed cryptographic primitives are available.

Passwords MUST be hashed, not reversibly encrypted.

---

43. Database Security

C3 remains authoritative for database architecture.

Security requirements include:

- least-privilege credentials;
- parameterized SQL;
- restricted production access;
- no client database access;
- controlled migrations;
- protected backups;
- secure connection configuration.

Database administration credentials MUST NOT be exposed to application clients.

---

44. Dependency Security

Production dependencies MUST be:

- intentionally selected;
- tracked through the project lockfile;
- periodically checked for known security vulnerabilities;
- updated when security fixes are required.

Adding a dependency solely to bypass an existing security control is prohibited without architectural review.

---

45. External Request Security

The backend MUST NOT blindly fetch arbitrary client-supplied URLs.

Any future server-side URL fetching MUST use explicit validation and restrictions to prevent SSRF and internal-network access.

This requirement applies to media imports, integrations, callbacks, and similar functionality.

---

46. Security of Question Content

Question content may contain educational material and answer-related metadata according to C2.

Security MUST ensure:

- grading keys are not exposed to Simulator clients;
- privileged content-management operations are server-authorized;
- question status changes are protected;
- archived/ineligible content cannot be injected into an exam through client manipulation.

C2 owns question semantics.

C5 owns question selection.

C7 owns unauthorized access prevention.

---

47. Content Partner Security Boundary

Content-partner capabilities MUST be server-authorized.

A content partner MUST NOT gain access to resources or operations merely by manipulating:

- URLs;
- IDs;
- role values;
- request bodies;
- client state.

The exact scope of content-partner capabilities MUST follow the authorized application role model.

---

48. Admin Security Boundary

Admin access is highly privileged.

Admin authentication and authorization MUST receive stronger protection than ordinary user flows where appropriate.

Admin operations MUST be:

- server-authorized;
- auditable;
- deny-by-default;
- protected from client-side role spoofing.

Exact Admin permissions and the Admin Authorization Matrix are intentionally RESERVED.

This contract MUST NOT define individual Admin capabilities.

Any implementation that grants Admin privileges without an explicit authorization rule MUST be treated as a security finding.

---

49. Security of Status and Role Changes

Changes to security-sensitive account properties MUST be performed server-side.

This includes:

- role;
- account status;
- authentication credentials;
- recovery credentials.

Clients MUST NOT be able to self-promote or self-enable accounts.

Security-sensitive changes MUST be audited.

---

50. Authorization on Mutations

Every state-changing protected operation MUST verify authorization before mutation.

The system MUST NOT rely on:

- UI hiding;
- route obscurity;
- UUID secrecy;
- client flags;
- disabled buttons;
- local storage values.

---

51. Race Conditions and Security

Security-sensitive operations MUST be safe against concurrent requests where duplicate execution could cause:

- privilege escalation;
- duplicate state transitions;
- duplicate payment effects;
- duplicate exam submission;
- inconsistent account state.

Transactional protection MUST be used where required.

C3/C5 own transactional domain behavior; C7 owns the security requirement.

---

52. Exam Finish Abuse Protection

The FINISH operation is security-sensitive.

The server MUST verify:

- authenticated identity;
- attempt ownership;
- attempt state;
- attempt membership;
- answer structure;
- timing constraints;
- server-side grading authority.

Repeated or malicious FINISH requests MUST NOT create duplicate authoritative results.

C4/C5 remain authoritative for the endpoint and exam-engine semantics.

---

53. Security and Historical Integrity

Security controls MUST never allow a client to rewrite:

- a submitted attempt;
- its snapshot;
- historical answers;
- final grading;
- final result;
- question history.

Any correction workflow requiring privileged human intervention MUST use server-authorized operations and appropriate audit records.

---

54. Security Testing Requirements

Before production release, security testing MUST cover at minimum:

- authentication;
- authorization;
- object-level access control;
- role spoofing;
- account enumeration;
- brute-force controls;
- token handling;
- password recovery;
- API validation;
- SQL injection;
- XSS;
- CSRF where applicable;
- CORS;
- file upload security;
- storage access;
- exam ownership;
- exam finish abuse;
- secret exposure;
- sensitive logging;
- privilege escalation.

Security tests MUST include both positive and negative authorization cases.

---

55. Security Regression

Any security-sensitive fix MUST include a regression test where practical.

Security behavior MUST NOT be considered complete merely because the UI behaves correctly.

The server/API boundary is the security authority.

---

56. Production Security

Production deployments MUST:

- use HTTPS;
- use production secrets separate from development secrets;
- avoid debug stack traces;
- avoid development credentials;
- restrict privileged infrastructure access;
- protect environment configuration;
- disable unnecessary debug functionality.

---

57. Development Security

Development environments MUST NOT normalize insecure patterns that can accidentally reach production.

Examples:

- hardcoded secrets;
- mock authentication used in production paths;
- unrestricted CORS;
- disabled authorization;
- fake user identity;
- client-controlled roles;
- development-only security bypasses.

Mock authentication MUST never be accepted as production authentication.

---

58. No Security Bypass

No implementation may introduce a bypass merely to make:

- development easier;
- testing easier;
- an endpoint easier to call;
- a UI feature easier to implement;
- an external integration easier.

Temporary bypasses MUST be isolated from production execution paths and explicitly documented.

---

59. Security Ownership Across Contracts

Security concern| Normative owner
Product security boundary| C1
Question security/schema| C2
DB security constraints/persistence| C3
API transport security| C4
Exam authority/security semantics| C5
Client security/platform boundary| C6
Authentication| C7
Authorization| C7
RBAC security semantics| C7
Secrets| C7
Rate-limit enforcement| C7
Security audit events| C7
Storage security| C7
Payment security boundary| C7
Implementation mechanics| C8
Gemini execution/security compliance| C9

This table does not transfer ownership of another contract's domain.

---

60. Cross-Contract Non-Duplication Rule

C7 MUST NOT redefine:

- API response envelopes owned by C4;
- question schemas owned by C2;
- database schema owned by C3;
- exam selection owned by C5;
- grading formulas owned by C5;
- client architecture owned by C6.

Instead, C7 defines the security constraint applied to those systems.

---

61. Security Change Control

Any change affecting:

- authentication;
- authorization;
- token lifecycle;
- role semantics;
- secret handling;
- exam authority;
- storage access;
- payment security;
- security logging;
- trust boundaries

MUST trigger a security contract review before implementation.

---

62. Security Acceptance Criteria

C7 is considered satisfied only when:

- authentication is server-authoritative;
- authorization is server-side;
- object-level authorization exists;
- roles cannot be spoofed by clients;
- secrets are absent from client code;
- passwords are securely hashed;
- tokens are protected;
- protected endpoints are rate-limited according to C4;
- sensitive errors do not leak internals;
- database access is parameterized;
- storage access is controlled;
- uploads are validated;
- security-sensitive events are audited;
- Web and Android follow the security boundary;
- exam authority remains server-side;
- simulator grading keys are protected;
- no hidden exam polling/synchronization is introduced;
- payment security does not trust the client;
- Admin permissions remain explicitly governed rather than inferred.

---

63. Final Security Rule

The platform MUST operate under the following invariant:

«The client is untrusted, the server is authoritative, access is explicitly authorized, secrets remain server-side, and every security-sensitive operation is validated and auditable.»

---

64. Contract Freeze Statement

After approval, C7 v1.1.0 becomes the normative security contract.

Any conflict discovered between C7 and C1–C6 MUST be resolved explicitly.

No implementation may silently reinterpret this contract.

The architecture review chain is:

C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8 → C9

C7 completes the security architecture layer while preserving the ownership boundaries established by C1–C6.
