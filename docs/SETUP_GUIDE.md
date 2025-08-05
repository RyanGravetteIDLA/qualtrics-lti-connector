# Complete Setup Guide for Qualtrics LTI Connector

This guide will walk you through setting up the Qualtrics LTI Connector from start to finish.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [Qualtrics Configuration](#qualtrics-configuration)
4. [Agilix Buzz Configuration](#agilix-buzz-configuration)
5. [Deployment](#deployment)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts
- **Firebase Account** (Google account required)
- **Qualtrics Account** with API access
- **Agilix Buzz** administrator access
- **GitHub Account** (for code management)

### Software Requirements
- **Node.js** 18.x or higher (20.x recommended)
- **Firebase CLI**: `npm install -g firebase-tools`
- **Git**: For version control
- **Java**: Required for Firebase emulators (testing only)

### API Access Requirements
- **Qualtrics API Token** (from Account Settings > Qualtrics IDs)
- **Agilix Buzz API Credentials** (username/password with API access)

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Project name: `qualtrics-lti-connector` (or your preference)
4. Enable Google Analytics (optional)
5. Wait for project creation to complete

### 2. Enable Required Services

In Firebase Console, enable:

1. **Firestore Database**
   - Click "Firestore Database" in left menu
   - Click "Create database"
   - Start in **production mode**
   - Select location closest to your users (e.g., `nam5` for US Central)

2. **Functions**
   - Click "Functions" in left menu
   - Click "Get started"
   - **Important**: Upgrade to Blaze (pay-as-you-go) plan
   - No charges for small usage (free tier generous)

3. **Hosting** (optional for UI)
   - Click "Hosting" in left menu
   - Click "Get started"

### 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Note your **Project ID** (you'll need this)
3. In "General" tab, scroll to "Your apps"
4. Click "</>" to add a web app
5. Register app with nickname "LTI Connector"
6. Copy the configuration (you'll need this later)

## Qualtrics Configuration

### 1. Get API Credentials

1. Log into Qualtrics
2. Go to **Account Settings** → **Qualtrics IDs**
3. Copy:
   - **API Token**
   - **Data Center ID** (e.g., `iad1`, `eu`, etc.)
   - **User ID** (optional)

### 2. Create API Token (if needed)

1. Go to **Account Settings** → **Qualtrics IDs**
2. Under "API", click "Generate Token"
3. Copy and save securely (shown only once!)

### 3. Note Survey Requirements

For each survey you want to use:
- Survey must be **active**
- Note the **Survey ID** (found in survey URL or settings)
- Ensure survey has appropriate **embedded data fields**:
  - `ltiUserId`
  - `ltiContextId`
  - `ltiLaunchId`
  - `courseName`

## Agilix Buzz Configuration

### 1. Get API Access

1. Log into Agilix Buzz as administrator
2. Navigate to **Domain Settings** → **API Configuration**
3. Note:
   - **API URL** (e.g., `https://api.agilixbuzz.com`)
   - **Domain ID**
   - Create or get API user credentials

### 2. Register LTI Tool

1. Go to **Domain Settings** → **LTI Tools**
2. Click "Add LTI 1.3 Tool"
3. Fill in:

```
Tool Name: Qualtrics Survey Connector
Description: Connect Qualtrics surveys for assignments and grades

Client ID: [generate unique ID, e.g., qualtrics-lti-12345]
Deployment ID: 1

Platform Issuer: https://[your-buzz-domain].agilixbuzz.com
Authorization URL: https://[your-buzz-domain].agilixbuzz.com/auth
Token URL: https://[your-buzz-domain].agilixbuzz.com/token
JWKS URL: https://[your-buzz-domain].agilixbuzz.com/jwks

Tool URLs:
- Target Link URI: https://[project-id].cloudfunctions.net/api/lti/launch
- OpenID Connect Initiation URL: https://[project-id].cloudfunctions.net/api/lti/login
- Redirect URIs: 
  - https://[project-id].cloudfunctions.net/api/lti/callback
  - https://[project-id].web.app/

Tool JWKS URL: https://[project-id].cloudfunctions.net/api/lti/keys
```

4. Configure scopes/claims:
   - ✅ OpenID
   - ✅ Profile
   - ✅ Email
   - ✅ Institutional role
   - ✅ Context membership
   - ✅ Assignment and Grade Services
   - ✅ Result.readonly
   - ✅ Score

5. Save and note the generated credentials

## Deployment

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/RyanGravetteIDLA/qualtrics-lti-connector.git
cd qualtrics-lti-connector

# Install dependencies
npm install
cd functions && npm install
cd ..
```

### 2. Configure Environment Variables

```bash
# Copy example environment file
cp functions/.env.example functions/.env

# Edit with your credentials
nano functions/.env
```

Update `.env` with your actual values:

```env
# Qualtrics API Configuration
QUALTRICS_API_TOKEN=your_actual_token_here
QUALTRICS_DATACENTER=iad1  # Your datacenter
QUALTRICS_BASE_URL=https://iad1.qualtrics.com

# Agilix Buzz API Configuration  
AGILIX_DOMAIN=your-domain-id
AGILIX_BASE_URL=https://api.agilixbuzz.com
AGILIX_USERNAME=api_user@domain.com
AGILIX_PASSWORD=secure_password_here

# LTI Configuration
LTI_ISSUER=https://your-buzz-domain.agilixbuzz.com
LTI_CLIENT_ID=qualtrics-lti-12345  # From Buzz LTI registration
LTI_DEPLOYMENT_ID=1
LTI_KEY_ID=key_001

# Security Configuration
JWT_SECRET=generate_32_char_random_string_here
ENCRYPTION_KEY=another_32_char_random_string_here
SESSION_SECRET=yet_another_32_char_random_string

# Development/Production
NODE_ENV=production
LOG_LEVEL=info
```

### 3. Deploy to Firebase

```bash
# Login to Firebase
firebase login

# Select your project
firebase use your-project-id

# Deploy everything
firebase deploy

# Or deploy separately
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only hosting
```

### 4. Note Deployment URLs

After deployment, note these URLs:
- Functions: `https://[region]-[project-id].cloudfunctions.net/api`
- Hosting: `https://[project-id].web.app`

## Testing

### 1. Test LTI Connection

1. In Agilix Buzz, create a test course
2. Add an assignment with LTI tool
3. Select "Qualtrics Survey Connector"
4. Launch as instructor - should see configuration page
5. Launch as student - should redirect to survey

### 2. Test with Firebase Emulators

```bash
# Start emulators
firebase emulators:start

# In another terminal, run functions locally
cd functions
npm run build:watch
```

### 3. Verify Logging

```bash
# View production logs
firebase functions:log

# Filter by function
firebase functions:log --only api
```

## Configuration in Course

### For Instructors

1. **Add LTI Assignment in Buzz**
   - Create new assignment
   - Type: External Tool
   - Select: Qualtrics Survey Connector
   - Save

2. **First Launch - Configuration**
   - Click the assignment link
   - You'll see configuration page
   - Enter:
     - Qualtrics Survey ID
     - Point value (0-1000)
     - Extra credit? (checkbox)
     - Scoring type:
       - Completion (full points for submitting)
       - Percentage (use Qualtrics scoring)
       - Manual (instructor grades manually)
   - Click "Save Configuration"

3. **Subsequent Launches**
   - See dashboard with:
     - Number of submissions
     - Average score
     - List of student submissions
     - Manual grade override options

### For Students

1. Click assignment link
2. Automatically redirected to Qualtrics survey
3. Complete survey
4. See confirmation page
5. Grade automatically posted to Buzz gradebook

## Monitoring

### Check Function Health

```bash
# View all functions
firebase functions:list

# Check specific function logs
firebase functions:log --only pollQualtricsResponses
```

### Database Monitoring

1. Go to Firebase Console → Firestore
2. Check collections:
   - `survey_configs` - All configured surveys
   - `user_sessions` - Active sessions
   - `grade_passbacks` - Grade records
   - `lti_launches` - Launch history

### Scheduled Jobs

The system runs these automatically:
- **Poll Responses**: Every 5 minutes
- **Cleanup Sessions**: Daily at midnight
- **Process Grades**: On database trigger

## Troubleshooting

### Common Issues

#### "Session not found" Error
- Clear browser cookies
- Relaunch from Buzz
- Check session expiration (1 hour default)

#### Grades Not Posting
1. Check Functions logs: `firebase functions:log --only processGradePassback`
2. Verify in Firestore: `grade_passbacks` collection
3. Check Agilix API credentials
4. Ensure assignment accepts grades in Buzz

#### Survey Not Loading
1. Verify Survey ID is correct
2. Check survey is active in Qualtrics
3. Verify Qualtrics API token is valid
4. Check browser console for errors

#### Configuration Not Saving
1. Check instructor role in launch
2. Verify Firestore rules allow write
3. Check browser console for API errors

### Debug Mode

Enable debug logging:
1. Set `LOG_LEVEL=debug` in `.env`
2. Redeploy functions
3. Check detailed logs

### Support Contacts

- **Firebase Issues**: [Firebase Support](https://firebase.google.com/support)
- **Qualtrics API**: [Qualtrics Support](https://www.qualtrics.com/support/)
- **Agilix Buzz**: Your Buzz administrator
- **This Tool**: GitHub Issues

## Security Considerations

⚠️ **Before Production Use**:
1. Review `SECURITY_AUDIT.md`
2. Implement all critical fixes
3. Use HTTPS only
4. Rotate API keys regularly
5. Monitor for suspicious activity
6. Keep dependencies updated

## Next Steps

1. Test with sample course
2. Train instructors on configuration
3. Create student documentation
4. Set up monitoring alerts
5. Plan for scaling