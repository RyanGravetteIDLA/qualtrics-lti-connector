# Comparison with longhornopen/qualtrics-lti

## Overview

The longhornopen/qualtrics-lti project is a PHP/Laravel-based LTI tool for Qualtrics survey integration. This document compares their approach with our Firebase-based implementation and identifies patterns we could adopt.

## Architecture Comparison

| Feature | longhornopen/qualtrics-lti | Our Implementation |
|---------|---------------------------|-------------------|
| **Language** | PHP | Node.js/TypeScript |
| **Framework** | Laravel 8.x | Express + Firebase Functions |
| **LTI Library** | Celtic LTI | ltijs |
| **Database** | MySQL/PostgreSQL | Firestore |
| **Deployment** | Apache/Docker | Serverless (Firebase) |
| **Authentication** | Database-stored keys | JWT + Firestore sessions |

## Key Differences

### 1. Deployment Model
- **Theirs**: Traditional server-based (Apache, Docker)
- **Ours**: Serverless, auto-scaling Firebase Functions

### 2. LTI Authentication
- **Theirs**: Uses `lti2_consumer` table with consumer keys
- **Ours**: Platform configurations in Firestore with JWT validation

### 3. Qualtrics Integration
- **Theirs**: Simple redirect to survey URL
- **Ours**: Rich embedded data with API integration

### 4. Grade Management
- **Theirs**: Basic completion tracking
- **Ours**: Comprehensive grade management with multiple scoring types

## Patterns to Consider Adopting

### 1. Pre-flight Check Endpoint
They provide `/lti/help` for testing LTI configuration. We should add:

```typescript
router.get("/lti/help", async (req, res) => {
  return res.json({
    status: "ready",
    endpoints: {
      launch: `${req.protocol}://${req.get("host")}/api/lti/launch`,
      login: `${req.protocol}://${req.get("host")}/api/lti/login`,
      jwks: `${req.protocol}://${req.get("host")}/api/lti/keys`,
    },
    ltiVersion: "1.3",
    features: ["grade_passback", "deep_linking", "names_roles"],
  });
});
```

### 2. Survey Return Flow
Their requirement of adding a "survey step" in Qualtrics for grade return is important. We should document:

1. In Qualtrics Survey Flow:
   - Add "End of Survey" element
   - Configure redirect URL back to our tool
   - Include embedded data in return URL

### 3. Simpler Configuration
Their `config/lti.php` approach is cleaner than scattered environment variables:

```typescript
// config/lti.ts
export const ltiConfig = {
  version: "1.3",
  features: {
    gradePassback: true,
    deepLinking: true,
    namesRoles: false,
  },
  session: {
    timeout: 3600, // 1 hour
    extendOnActivity: true,
  },
};
```

### 4. Database Migration System
While we use Firestore, we could benefit from a migration system for schema updates:

```typescript
// migrations/index.ts
export async function runMigrations() {
  const migrations = [
    "001_add_email_fields",
    "002_add_scoring_types",
    "003_add_lms_user_id",
  ];
  
  // Track which migrations have run
  const migrationDoc = await db.collection("_migrations").doc("status").get();
  const completed = migrationDoc.data()?.completed || [];
  
  for (const migration of migrations) {
    if (!completed.includes(migration)) {
      await import(`./migrations/${migration}`).then(m => m.up());
      completed.push(migration);
    }
  }
  
  await db.collection("_migrations").doc("status").set({ completed });
}
```

## Security Improvements from Their Approach

### 1. Consumer Key Validation
They validate consumer keys against database. We should enhance our platform validation:

```typescript
async function validatePlatform(iss: string, clientId: string, deploymentId: string) {
  const platform = await db.collection("lti_platforms")
    .where("issuer", "==", iss)
    .where("clientId", "==", clientId)
    .where("deploymentIds", "array-contains", deploymentId)
    .where("isActive", "==", true)
    .get();
    
  if (platform.empty) {
    throw new Error("Invalid platform configuration");
  }
  
  return platform.docs[0].data();
}
```

### 2. Environment-based Configuration
Their approach of using LOG_CHANNEL for Docker is smart. We should add:

```typescript
// config/environment.ts
export const config = {
  logging: {
    channel: process.env.LOG_CHANNEL || "default",
    level: process.env.LOG_LEVEL || "info",
  },
  deployment: {
    mode: process.env.DEPLOYMENT_MODE || "production",
    region: process.env.FUNCTION_REGION || "us-central1",
  },
};
```

## Features We Provide That They Don't

1. **Rich Analytics**: Comprehensive grade tracking and reporting
2. **Multiple Scoring Types**: Completion, percentage, and manual grading
3. **Extra Credit Support**: Built-in extra credit configuration
4. **Scheduled Polling**: Automatic response collection
5. **Session Management**: Secure, time-limited sessions
6. **Email-based Identity**: More flexible user identification

## Recommendations

1. **Add Pre-flight Check**: Implement `/lti/help` endpoint for easier debugging
2. **Document Qualtrics Setup**: Create guide for survey return configuration
3. **Centralize Config**: Move scattered configs to centralized files
4. **Add Migration System**: Track Firestore schema changes
5. **Enhance Platform Validation**: Strengthen LTI platform verification

## Conclusion

While the longhornopen/qualtrics-lti project takes a simpler approach, it provides valuable patterns for configuration management and deployment flexibility. Our implementation offers more features and scalability, but we can adopt their cleaner configuration patterns and testing endpoints to improve developer experience.