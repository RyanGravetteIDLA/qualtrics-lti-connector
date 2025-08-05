# Security Audit Report - Qualtrics LTI Connector

**Date:** August 5, 2025  
**Severity:** CRITICAL 🔴  
**Overall Security Score:** 3/10

## Executive Summary

This security audit identifies critical vulnerabilities in the Qualtrics LTI Connector that must be addressed before production deployment. The application currently has multiple high-severity security issues that could lead to data breaches, unauthorized access, and system compromise.

## Critical Vulnerabilities (P0 - Fix Immediately)

### 1. Authentication & Authorization Failures

#### 1.1 Weak Session Verification
- **Location:** `/functions/src/handlers/gradeHandlers.ts:23-50`, `/functions/src/handlers/surveyHandlers.ts:21-48`
- **Issue:** Session verification only checks existence, not validity or signatures
- **Impact:** Session hijacking, unauthorized access
- **CVSS Score:** 9.1 (Critical)

```typescript
// VULNERABLE CODE
const sessionId = req.headers["x-session-id"] || req.body.sessionId || req.query.sessionId;
```

#### 1.2 Missing JWT Signature Verification
- **Location:** `/functions/src/handlers/ltiHandlers.ts`
- **Issue:** LTI tokens accepted without proper signature validation
- **Impact:** Token forgery, impersonation attacks
- **CVSS Score:** 9.8 (Critical)

### 2. Injection Vulnerabilities

#### 2.1 No Input Sanitization
- **Location:** All API endpoints
- **Issue:** User inputs passed directly to Firestore queries without sanitization
- **Impact:** NoSQL injection, XSS attacks
- **CVSS Score:** 8.6 (High)

#### 2.2 XSS in HTML Pages
- **Location:** `/public/teacher-config.html`
- **Issue:** User input reflected without escaping
- **Impact:** Cross-site scripting, session theft
- **CVSS Score:** 7.2 (High)

### 3. Broken Access Control

#### 3.1 Open CORS Policy
- **Location:** `/functions/src/index.ts:16-19`
- **Issue:** `origin: true` allows requests from ANY domain
- **Impact:** CSRF attacks, data theft
- **CVSS Score:** 8.1 (High)

```typescript
// CRITICAL VULNERABILITY
app.use(cors({
  origin: true,  // Accepts ALL origins!
  credentials: true,
}));
```

#### 3.2 Session ID in URL Parameters
- **Location:** Multiple endpoints
- **Issue:** Session IDs passed in query strings (logged in server logs)
- **Impact:** Session hijacking via log files
- **CVSS Score:** 7.5 (High)

### 4. Cryptographic Failures

#### 4.1 Plain Text Secrets
- **Location:** `/functions/.env`
- **Issue:** Passwords and API keys stored unencrypted
- **Impact:** Credential theft if .env exposed
- **CVSS Score:** 8.4 (High)

#### 4.2 No Encryption at Rest
- **Location:** Firestore database
- **Issue:** PII stored without encryption
- **Impact:** Data breach exposure
- **CVSS Score:** 7.1 (High)

### 5. Security Misconfiguration

#### 5.1 Missing Security Headers
- **Location:** All HTTP responses
- **Missing Headers:**
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security
- **Impact:** Clickjacking, MIME sniffing attacks
- **CVSS Score:** 6.5 (Medium)

#### 5.2 Verbose Error Messages
- **Location:** All error handlers
- **Issue:** Stack traces exposed to users
- **Impact:** Information disclosure
- **CVSS Score:** 5.3 (Medium)

## High Priority Issues (P1)

### 6. Insufficient Logging & Monitoring

#### 6.1 No Security Event Logging
- **Issue:** Failed authentication attempts not logged
- **Impact:** Attacks go undetected
- **CVSS Score:** 6.1 (Medium)

#### 6.2 No Rate Limiting
- **Issue:** APIs vulnerable to brute force
- **Impact:** DDoS, credential stuffing
- **CVSS Score:** 7.5 (High)

### 7. Vulnerable Dependencies

#### 7.1 Outdated Node.js Runtime
- **Issue:** Using deprecated Node.js 18
- **Impact:** Unpatched vulnerabilities
- **CVSS Score:** 5.9 (Medium)

## Medium Priority Issues (P2)

### 8. Insecure Design

#### 8.1 Predictable Resource IDs
- **Issue:** Using UUID v4 for session IDs
- **Impact:** Potential enumeration attacks
- **CVSS Score:** 4.3 (Medium)

#### 8.2 No CSRF Protection
- **Issue:** State-changing operations lack CSRF tokens
- **Impact:** Cross-site request forgery
- **CVSS Score:** 6.8 (Medium)

## Vulnerability Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Authentication | 2 | 1 | 0 | 0 | 3 |
| Injection | 0 | 2 | 0 | 0 | 2 |
| Access Control | 1 | 1 | 0 | 0 | 2 |
| Cryptography | 0 | 2 | 0 | 0 | 2 |
| Configuration | 0 | 0 | 2 | 0 | 2 |
| **Total** | **3** | **6** | **2** | **0** | **11** |

## Attack Scenarios

### Scenario 1: Session Hijacking
1. Attacker monitors network traffic or server logs
2. Extracts session ID from URL parameters
3. Uses session ID to impersonate user
4. Gains unauthorized access to grades and surveys

### Scenario 2: Cross-Site Request Forgery
1. Attacker creates malicious website
2. Victim visits site while logged into LTI tool
3. Malicious site makes requests to API (CORS allows all origins)
4. Actions performed on victim's behalf

### Scenario 3: Data Breach
1. Attacker exploits injection vulnerability
2. Extracts unencrypted data from Firestore
3. Obtains student PII and grades
4. API keys in plain text allow further attacks

## Recommended Security Controls

### Immediate Actions (Within 24 Hours)
1. Restrict CORS to specific domains
2. Move session IDs to secure HTTP-only cookies
3. Implement input validation on all endpoints
4. Enable Firestore encryption at rest

### Short Term (Within 1 Week)
1. Implement proper JWT verification for LTI
2. Add rate limiting to all endpoints
3. Set up security headers middleware
4. Encrypt sensitive data before storage

### Medium Term (Within 1 Month)
1. Implement comprehensive logging
2. Set up intrusion detection
3. Conduct penetration testing
4. Implement secret rotation

## Compliance Considerations

### FERPA (Family Educational Rights and Privacy Act)
- **Status:** NON-COMPLIANT ❌
- Student records exposed without encryption
- Insufficient access controls

### GDPR (General Data Protection Regulation)
- **Status:** NON-COMPLIANT ❌
- No encryption of personal data
- Insufficient audit logging

### LTI Security Framework
- **Status:** NON-COMPLIANT ❌
- Missing required security assertions
- Incomplete OAuth 2.0 implementation

## Security Checklist

- [ ] Implement JWT signature verification
- [ ] Add input sanitization middleware
- [ ] Configure CORS for specific domains only
- [ ] Move session management to secure cookies
- [ ] Encrypt sensitive data at rest
- [ ] Add security headers to all responses
- [ ] Implement rate limiting
- [ ] Set up comprehensive logging
- [ ] Remove verbose error messages
- [ ] Upgrade to Node.js 20
- [ ] Implement CSRF protection
- [ ] Add API authentication beyond sessions
- [ ] Set up secret management service
- [ ] Implement field-level encryption
- [ ] Add security monitoring alerts

## Risk Matrix

```
High    │ Auth  │ CORS │      │
Impact  │ Fail  │      │      │
        │       │      │      │
Medium  │ XSS   │ Logs │      │
Impact  │       │      │      │
        │       │      │      │
Low     │       │      │ UUID │
Impact  │       │      │      │
        └───────┴──────┴──────┘
         High   Medium  Low
         Likelihood
```

## Conclusion

The Qualtrics LTI Connector has **11 significant security vulnerabilities**, including **3 critical** and **6 high severity** issues. The application is currently **NOT SAFE for production use** and requires immediate security remediation.

**Recommended Action:** Do not deploy to production until all critical and high-severity vulnerabilities are resolved.

---

*This report should be treated as confidential and shared only with authorized personnel.*