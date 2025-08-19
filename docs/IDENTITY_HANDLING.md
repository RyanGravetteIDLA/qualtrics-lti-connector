# Identity Handling in Qualtrics LTI Connector

## Overview

The Qualtrics LTI Connector uses **email addresses** as the primary identifier for matching users between Agilix Buzz LMS and Qualtrics. This approach ensures consistent identity tracking across systems while maintaining compatibility with both platforms.

## Identity Flow

### 1. LTI Launch from Agilix Buzz

When a user launches the LTI tool from Agilix Buzz:

1. **JWT Token Contains**:
   - `sub` - Original LMS user ID (stored as `lmsUserId`)
   - `email` - User's email address (used as primary identifier)
   - `name`, `given_name`, `family_name` - Additional user info

2. **Identity Extraction** (ltiHandlers.ts:144-163):
   ```typescript
   // Validate email is present
   if (!claims.email) {
     throw new Error("Email address is required for user identification");
   }

   const launch: LTILaunch = {
     userId: claims.email,      // Email as primary identifier
     lmsUserId: claims.sub,     // Store original LMS ID for reference
     userInfo: {
       email: claims.email,
       name: claims.name,
       // ... other fields
     }
   };
   ```

### 2. Session Creation

User sessions use email as the primary identifier:

```typescript
const session: UserSession = {
  userId: launch.userId,        // Email address
  userEmail: launch.userInfo.email,  // Explicit email field
  // ... other session data
};
```

### 3. Qualtrics Survey Launch

When students are redirected to Qualtrics, the system passes:

```typescript
const embeddedData = new URLSearchParams({
  userEmail: launch.userId,     // Email as primary identifier
  ltiUserId: launch.lmsUserId,  // Original LMS ID for reference
  userName: launch.userInfo.name,
  // ... other context data
});
```

### 4. Response Processing

When polling Qualtrics for responses:

1. Extract email from response embedded data:
   ```typescript
   const userEmail = response.values.userEmail || response.values.QID_email;
   ```

2. Create grade passback record with email:
   ```typescript
   const gradePassback: GradePassback = {
     userId: userEmail,         // Email address
     userEmail: userEmail,      // Explicit field
     lmsUserId: lmsUserId,      // Original LMS ID if needed
     // ... grade data
   };
   ```

### 5. Grade Passback to Agilix

For grade passback to Agilix Buzz:
- The system attempts to use the original `lmsUserId` if available
- Falls back to email if needed
- Passes both for reference:

```typescript
await agilixService.passbackGrade({
  userId: grade.lmsUserId || grade.userId,  // Prefer LMS ID for Agilix
  userEmail: grade.userEmail,                // Email for reference
  // ... grade data
});
```

## Database Schema

### Key Collections

**lti_launches**
- `userId`: Email address (primary identifier)
- `lmsUserId`: Original LMS subject ID
- `userInfo.email`: Email address

**user_sessions**
- `userId`: Email address
- `userEmail`: Explicit email field

**grade_passbacks**
- `userId`: Email address
- `userEmail`: Explicit email field
- `lmsUserId`: Original LMS ID (optional)

## Benefits of Email-Based Identity

1. **Cross-System Consistency**: Email addresses are consistent across both Agilix and Qualtrics
2. **User-Friendly**: Easier to debug and track issues with human-readable identifiers
3. **Account Portability**: Users maintain identity even if LMS IDs change
4. **Data Matching**: Simplifies matching responses from Qualtrics surveys

## Security Considerations

1. **Email Validation**: System requires email to be present in LTI claims
2. **Privacy**: Email addresses are only used internally for matching
3. **No External Exposure**: Emails are not exposed in public URLs or logs
4. **Secure Storage**: All user data is stored in secure Firestore collections

## Troubleshooting

### Common Issues

1. **Missing Email Error**
   - **Cause**: LTI launch doesn't include email claim
   - **Solution**: Configure Agilix to include email in LTI claims

2. **Grade Passback Failures**
   - **Cause**: Agilix expects original user ID, not email
   - **Solution**: System stores and uses `lmsUserId` for passback

3. **Response Matching Issues**
   - **Cause**: Email not properly embedded in Qualtrics survey
   - **Solution**: Verify embedded data parameters in survey URL

## Configuration Requirements

### Agilix Buzz
- Must be configured to include email addresses in LTI 1.3 claims
- Email claim must be included in JWT token

### Qualtrics
- Surveys must be configured to capture embedded data fields:
  - `userEmail`
  - `ltiUserId` (optional)
  - `userName` (optional)

### Firebase
- No special configuration needed
- Email-based queries are automatically indexed

## Migration Notes

If migrating from a sub-based system to email-based:

1. Existing data will need migration scripts
2. Both identifiers are stored for backwards compatibility
3. Grade passback uses original LMS ID when available