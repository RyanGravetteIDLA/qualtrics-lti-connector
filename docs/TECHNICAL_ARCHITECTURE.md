# Technical Architecture

## System Overview

The Qualtrics LTI Connector is a serverless application that bridges Agilix Buzz LMS with Qualtrics surveys using the LTI 1.3 standard.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Agilix Buzz   │────▶│  LTI Connector  │────▶│    Qualtrics    │
│      (LMS)      │◀────│   (Firebase)    │◀────│    (Surveys)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        │
        │ LTI 1.3 Launch        │ HTTPS APIs            │
        │ Grade Passback        │ Firestore             │
        └───────────────────────┴────────────────────────┘
```

## Component Architecture

### 1. Firebase Functions (Backend)

```
functions/
├── src/
│   ├── index.ts              # Main entry, Express app
│   ├── handlers/
│   │   ├── ltiHandlers.ts    # LTI launch/auth logic
│   │   ├── surveyHandlers.ts # Survey CRUD operations
│   │   └── gradeHandlers.ts  # Grade management
│   ├── services/
│   │   ├── qualtricsService.ts # Qualtrics API wrapper
│   │   └── agilixService.ts    # Agilix API wrapper
│   ├── config/
│   │   └── environment.ts    # Config validation
│   └── types/
│       └── index.ts          # TypeScript definitions
└── package.json
```

### 2. Data Model (Firestore)

```typescript
// Collection: lti_platforms
{
  id: string,
  name: string,
  issuer: string,
  authUrl: string,
  tokenUrl: string,
  jwksUrl: string,
  clientId: string,
  deploymentId: string
}

// Collection: survey_configs
{
  id: string,
  instructorId: string,
  contextId: string,
  resourceLinkId: string,
  qualtricsDetails: {
    surveyId: string,
    distributionId?: string
  },
  settings: {
    surveyName: string,
    maxGrade: number,
    isExtraCredit: boolean,
    scoringType: 'completion' | 'percentage' | 'manual',
    dueDate?: Timestamp
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastPollTime?: Timestamp
}

// Collection: user_sessions
{
  id: string,
  userId: string, // Email address as primary identifier
  userEmail: string, // Explicit email field
  ltiLaunchId: string,
  platformId: string,
  contextId: string,
  resourceLinkId: string,
  roles: string[],
  isActive: boolean,
  createdAt: Timestamp,
  expiresAt: Timestamp
}

// Collection: grade_passbacks
{
  id: string,
  userId: string, // Email address as primary identifier
  userEmail: string, // Explicit email field
  lmsUserId?: string, // Original LMS ID for grade passback
  surveyConfigId: string,
  qualtricsResponseId: string,
  grade: number,
  maxGrade: number,
  timestamp: Timestamp,
  processed: boolean,
  processedAt?: Timestamp,
  error?: string
}
```

### 3. API Endpoints

#### LTI Endpoints
- `GET /api/lti/login` - Initiate LTI login
- `POST /api/lti/launch` - Handle LTI launch
- `GET /api/lti/keys` - JWKS public keys

#### Survey Management
- `GET /api/surveys` - List surveys for context
- `POST /api/surveys` - Create survey config
- `PUT /api/surveys/:id` - Update survey config
- `DELETE /api/surveys/:id` - Soft delete survey

#### Grade Management  
- `GET /api/grades/survey/:surveyId` - Get grades for survey
- `GET /api/grades/user/:userId` - Get user's grades
- `POST /api/grades/webhook` - Qualtrics webhook endpoint
- `GET /api/grades/submission-status/:surveyId` - Check if submitted

### 4. Authentication Flow

```
1. LTI Launch Request
   Agilix → GET /lti/login?iss=...&login_hint=...

2. Authentication Request  
   Connector → Redirect to Agilix auth endpoint

3. ID Token Response
   Agilix → POST /lti/launch with JWT

4. Validate & Create Session
   - Verify JWT signature
   - Check nonce/timestamp
   - Create user session
   - Store in Firestore

5. Route by Role
   - Instructor → Configuration UI
   - Student → Qualtrics redirect
```

### 5. Data Flow

#### Survey Configuration (Instructor)
```
Instructor          Connector           Firestore         Qualtrics
    │                   │                  │                 │
    ├──Launch LTI───────▶                 │                 │
    │                   ├──Verify Role────▶                 │
    │◀──Config Page─────┤                  │                 │
    │                   │                  │                 │
    ├──Save Config──────▶                 │                 │
    │                   ├──Store──────────▶                 │
    │                   ├──Create Dist────────────────────▶ │
    │                   │◀────────────────Distribution ID───┤
    │◀──Success─────────┤                  │                 │
```

#### Student Survey Flow
```
Student           Connector          Firestore        Qualtrics
    │                 │                  │                │
    ├──Launch LTI─────▶                 │                │
    │                 ├──Get Config─────▶                │
    │                 ├──Create Session─▶                │
    │◀──Redirect──────┤                  │                │
    │                 │                  │                │
    ├──────────────────Take Survey───────────────────────▶
    │◀────────────────Completion────────────────────────┤
```

#### Grade Passback Flow
```
Scheduler         Functions         Qualtrics        Firestore        Agilix
    │                │                 │                 │               │
    ├──Every 5min────▶                │                 │               │
    │                ├──Get Responses─▶                 │               │
    │                │◀───Responses────┤                 │               │
    │                ├──Calculate──────┐                │               │
    │                │◀────────────────┘                │               │
    │                ├──Store Grade─────────────────────▶               │
    │                │                                   │               │
    │                ├──Trigger────────▶                │               │
    │                │  processGrade    │                │               │
    │                ├──Get Launch──────────────────────▶               │
    │                ├──Submit Grade────────────────────────────────────▶
    │                │◀──────────────────────────────────Success────────┤
    │                ├──Mark Processed──────────────────▶               │
```

### 6. Security Architecture

#### Authentication Layers
1. **LTI 1.3 OAuth2** - Platform authentication
2. **JWT Validation** - Token signature verification  
3. **Session Management** - Firestore-backed sessions
4. **Role-Based Access** - Instructor vs Student

#### Data Protection
- HTTPS only communication
- Firestore security rules
- Environment variable encryption
- No PII in logs

### 7. Scalability Design

#### Auto-Scaling Components
- **Firebase Functions**: Scale to 1000 concurrent
- **Firestore**: No practical limits
- **Cloud Scheduler**: Reliable cron jobs

#### Performance Optimizations
- Connection pooling for APIs
- Batch processing for grades
- Efficient Firestore queries
- CDN for static assets

### 8. Error Handling

```typescript
// Retry Logic
async function withRetry<T>(
  fn: () => Promise<T>, 
  retries = 3
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await sleep(1000 * (4 - retries));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});
```

### 9. Monitoring & Logging

#### Structured Logging
```typescript
functions.logger.info('Grade passback processed', {
  userId,
  surveyId,
  grade,
  duration: Date.now() - startTime
});
```

#### Metrics Tracked
- Function execution time
- API response times
- Error rates by type
- User session duration
- Grade processing lag

### 10. Development Workflow

#### Local Development
```bash
# Terminal 1: Emulators
firebase emulators:start

# Terminal 2: TypeScript watch
cd functions && npm run build:watch

# Terminal 3: Testing
npm test -- --watch
```

#### CI/CD Pipeline
1. Push to GitHub
2. GitHub Actions runs:
   - Linting
   - Type checking
   - Unit tests
   - Security scan
3. Manual deploy to staging
4. Automated tests
5. Production deploy

### 11. Future Architecture Considerations

#### Planned Improvements
1. **Caching Layer**: Redis for session cache
2. **Message Queue**: Pub/Sub for grade processing
3. **Multi-Region**: Deploy to multiple regions
4. **GraphQL API**: Replace REST with GraphQL
5. **Webhooks**: Real-time updates to Buzz

#### Scaling Preparations
- Database sharding strategy
- Read replicas for analytics
- CDN for global distribution
- Rate limiting per institution