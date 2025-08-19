# Qualtrics Survey Configuration Guide

## Overview

This guide explains how to configure Qualtrics surveys to work with the LTI Connector, including the critical survey return flow that enables automatic grade recording.

## Prerequisites

- Qualtrics account with API access
- Survey created in Qualtrics
- LTI tool configured in your LMS

## Step 1: Survey Setup

### 1.1 Create Embedded Data Fields

In your Qualtrics survey, you must configure embedded data fields to capture LTI information:

1. Go to **Survey Flow** in your survey
2. Add a new **Embedded Data** element at the beginning
3. Add these fields:
   - `userEmail` - User's email address (primary identifier)
   - `ltiUserId` - Original LMS user ID
   - `ltiContextId` - Course/context ID
   - `ltiResourceId` - Resource link ID
   - `ltiLaunchId` - Unique launch session ID
   - `courseName` - Course name for reference
   - `userName` - User's display name

### 1.2 Survey Flow Configuration

```
Survey Flow:
1. Embedded Data (captures LTI parameters)
2. Survey Blocks (your questions)
3. End of Survey (with redirect)
```

## Step 2: Configure Survey Return (Critical)

For automatic grade recording, you MUST configure the survey to redirect back to the LTI tool:

### 2.1 Add End of Survey Element

1. In **Survey Flow**, add an **End of Survey** element
2. Select **Redirect to a URL**
3. Configure the redirect URL with embedded data:

```
https://your-firebase-project.cloudfunctions.net/api/grades/process-completion?responseId=${e://Field/ResponseID}&surveyId=${e://Field/SurveyID}&userId=${e://Field/userEmail}&contextId=${e://Field/ltiContextId}&resourceLinkId=${e://Field/ltiResourceId}
```

### 2.2 Alternative: JavaScript Redirect

If you need more control, use JavaScript in the survey:

```javascript
Qualtrics.SurveyEngine.addOnPageSubmit(function() {
    // On final page submission
    var responseId = "${e://Field/ResponseID}";
    var userEmail = "${e://Field/userEmail}";
    var surveyId = "${e://Field/SurveyID}";
    
    // Construct return URL
    var returnUrl = "https://your-project.cloudfunctions.net/api/grades/process-completion";
    returnUrl += "?responseId=" + responseId;
    returnUrl += "&surveyId=" + surveyId;
    returnUrl += "&userId=" + encodeURIComponent(userEmail);
    
    // Store for redirect after submission
    Qualtrics.SurveyEngine.setEmbeddedData("returnUrl", returnUrl);
});
```

## Step 3: API Configuration

### 3.1 Get Survey ID

1. In Qualtrics, go to your survey
2. Look at the URL: `https://your-brand.qualtrics.com/survey-builder/SV_xxxxxxxxxxxxx/`
3. The Survey ID is the part starting with `SV_`

### 3.2 Enable API Access

1. Go to **Account Settings** → **Qualtrics IDs**
2. Note your:
   - Data Center ID (e.g., `iad1`)
   - Organization ID
   - API Token (generate if needed)

## Step 4: Testing the Integration

### 4.1 Test Data Flow

1. Launch the LTI tool from your LMS as a student
2. Check browser console for embedded data:
   ```javascript
   // The URL should contain parameters like:
   // ?userEmail=student@example.com&ltiUserId=123&...
   ```

3. Complete the survey
4. Verify redirect back to LTI tool
5. Check grade recording in LMS

### 4.2 Troubleshooting

Common issues and solutions:

#### No Grade Recorded
- **Cause**: Survey not redirecting back
- **Solution**: Verify End of Survey redirect URL is configured

#### Missing User Data
- **Cause**: Embedded data fields not captured
- **Solution**: Check field names match exactly (case-sensitive)

#### Redirect Fails
- **Cause**: Incorrect URL or parameters
- **Solution**: Test URL manually with sample parameters

## Step 5: Advanced Configuration

### 5.1 Scoring Configuration

Configure how responses are scored:

1. **Completion-based**: Full points for finishing
   - No additional Qualtrics configuration needed
   
2. **Percentage-based**: Score from Qualtrics
   - Add a **Scoring** category in Qualtrics
   - Set up scoring for each question
   - Add `score` to embedded data fields

3. **Manual**: Instructor grades manually
   - No automatic scoring needed

### 5.2 Conditional Logic

Use Qualtrics Survey Flow for advanced scenarios:

```
If: Embedded Data - scoringType = "percentage"
Then: Calculate and store score
Else: Set score = 100 (completion)
```

### 5.3 Multiple Attempts

To allow multiple attempts:

1. In Survey Options, enable **Allow Multiple Submissions**
2. Configure LTI tool settings for multiple attempts
3. Consider using **Response ID** for tracking

## Step 6: Security Considerations

### 6.1 Data Protection

- Never expose sensitive data in URLs
- Use HTTPS for all communications
- Validate all incoming parameters

### 6.2 Authentication

The LTI tool handles authentication, but ensure:
- Survey is not publicly accessible
- Use anonymous links generated per session
- Implement time-based expiration

## Example Complete Configuration

### Qualtrics Survey Flow:
```
1. Embedded Data
   - userEmail = (will be set by URL parameter)
   - ltiUserId = (will be set by URL parameter)
   - ltiContextId = (will be set by URL parameter)
   - ltiResourceId = (will be set by URL parameter)
   - ltiLaunchId = (will be set by URL parameter)
   - courseName = (will be set by URL parameter)
   - userName = (will be set by URL parameter)

2. Block: Survey Questions
   - Q1: Your questions here
   - Q2: More questions
   
3. End of Survey
   - Redirect to URL:
     https://your-project.cloudfunctions.net/api/grades/process-completion?responseId=${e://Field/ResponseID}&surveyId=${e://Field/SurveyID}&userId=${e://Field/userEmail}&contextId=${e://Field/ltiContextId}&resourceLinkId=${e://Field/ltiResourceId}
```

### LMS Configuration:
```
Tool URL: https://your-project.cloudfunctions.net/api/lti/launch
Login URL: https://your-project.cloudfunctions.net/api/lti/login
Public Key URL: https://your-project.cloudfunctions.net/api/lti/keys
```

## Conclusion

Proper Qualtrics survey configuration is essential for the LTI integration to work correctly. The most critical step is configuring the survey return flow - without this, grades cannot be automatically recorded. Always test the complete flow from LMS launch through survey completion to grade recording.