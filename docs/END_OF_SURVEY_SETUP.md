# End of Survey Redirect Configuration

## What It Does
The End of Survey redirect sends students back to the LTI connector after completing the survey, which:
1. Records survey completion
2. Triggers grade passback to Agilix Buzz
3. Shows confirmation to the student

## Manual Setup in Qualtrics

### Step 1: Access Survey Flow
1. Log into Qualtrics
2. Open survey: **LTI Connector Test Survey** (SV_1zwVyeUcTG59uXY)
3. Click **Survey Flow** in the left menu

### Step 2: Add End of Survey Element
1. Scroll to the bottom of the Survey Flow
2. Click **Add a New Element Here**
3. Select **End of Survey**

### Step 3: Configure Redirect
1. In the End of Survey element, select **Redirect to a URL**
2. Enter this EXACT URL (replace `your-project-id` with your Firebase project ID):

```
https://your-project-id.cloudfunctions.net/api/grades/process-completion
```

3. Click **Add Embedded Data to URL** and add these parameters:
   - `responseId` = `${e://Field/ResponseID}`
   - `surveyId` = `${e://Field/SurveyID}`
   - `userId` = `${e://Field/userEmail}`
   - `contextId` = `${e://Field/ltiContextId}`
   - `resourceLinkId` = `${e://Field/ltiResourceId}`

### Step 4: Complete URL Format
The final redirect URL should look like this:

```
https://your-project-id.cloudfunctions.net/api/grades/process-completion?responseId=${e://Field/ResponseID}&surveyId=${e://Field/SurveyID}&userId=${e://Field/userEmail}&contextId=${e://Field/ltiContextId}&resourceLinkId=${e://Field/ltiResourceId}
```

## Alternative: Custom End of Survey Message with JavaScript

If redirect isn't working, use a custom end message with JavaScript:

### Custom End of Survey Message
1. In End of Survey element, select **Custom end of survey message**
2. Click **HTML View** button
3. Paste this code:

```html
<div style="text-align: center; padding: 20px;">
    <h2>Thank you for completing this survey!</h2>
    <p>Your response has been recorded and your grade will be posted shortly.</p>
    <p>You will be redirected in a moment...</p>
</div>

<script>
    // Capture response data
    var responseId = "${e://Field/ResponseID}";
    var surveyId = "${e://Field/SurveyID}";
    var userEmail = "${e://Field/userEmail}";
    var contextId = "${e://Field/ltiContextId}";
    var resourceLinkId = "${e://Field/ltiResourceId}";
    
    // Build redirect URL
    var baseUrl = "https://your-project-id.cloudfunctions.net/api/grades/process-completion";
    var params = "?responseId=" + responseId + 
                 "&surveyId=" + surveyId + 
                 "&userId=" + encodeURIComponent(userEmail) +
                 "&contextId=" + contextId +
                 "&resourceLinkId=" + resourceLinkId;
    
    // Log for debugging (remove in production)
    console.log("Redirecting to:", baseUrl + params);
    
    // Redirect after 2 seconds
    setTimeout(function() {
        window.location.href = baseUrl + params;
    }, 2000);
</script>
```

## For Local Development/Testing

If you're using Firebase emulators locally, use this URL instead:

```
http://localhost:5001/your-project-id/us-central1/api/grades/process-completion?responseId=${e://Field/ResponseID}&surveyId=${e://Field/SurveyID}&userId=${e://Field/userEmail}&contextId=${e://Field/ltiContextId}&resourceLinkId=${e://Field/ltiResourceId}
```

## What Happens After Redirect

When the student is redirected back to your LTI connector:

1. **Process Completion Endpoint** (`/api/grades/process-completion`) receives:
   - Response ID from Qualtrics
   - Survey ID
   - User email (primary identifier)
   - Course context
   - Resource link

2. **System Actions**:
   ```javascript
   // The endpoint will:
   1. Verify the response in Qualtrics
   2. Calculate the grade based on scoring type
   3. Create grade passback record
   4. Trigger async grade submission to Agilix
   5. Show confirmation page to student
   ```

3. **Student Sees**:
   - Success confirmation
   - Their score (if applicable)
   - Link back to course

## Testing the Complete Flow

### Test Without LMS
```bash
# Test the redirect URL directly
curl "https://your-project-id.cloudfunctions.net/api/grades/process-completion?responseId=R_test123&surveyId=SV_1zwVyeUcTG59uXY&userId=test@example.com&contextId=course123&resourceLinkId=resource456"
```

### Test With Sample Data
1. Take the survey: https://iad1.qualtrics.com/jfe/form/SV_1zwVyeUcTG59uXY?userEmail=test@example.com
2. Complete all questions
3. Submit survey
4. Verify redirect happens
5. Check Firestore for grade_passback record

## Troubleshooting

### Redirect Not Working?
1. **Check URL encoding**: Ensure special characters in email are encoded
2. **Verify Firebase project ID**: Must match your deployment
3. **Check CORS settings**: Firebase function must allow Qualtrics domain
4. **Test endpoint directly**: Use curl to verify endpoint is accessible

### Grade Not Recording?
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify embedded data is captured in Qualtrics response
3. Check Firestore for grade_passbacks collection
4. Ensure survey config exists in survey_configs collection

## Required Firebase Function

Ensure your `/api/grades/process-completion` endpoint exists:

```typescript
// gradeHandlers.ts
export async function processCompletion(req: Request, res: Response) {
  const { responseId, surveyId, userId, contextId, resourceLinkId } = req.query;
  
  try {
    // 1. Fetch response from Qualtrics
    const qualtricsService = new QualtricsService();
    const response = await qualtricsService.getSurveyResponse(surveyId, responseId);
    
    // 2. Calculate grade
    const surveyConfig = await getSurveyConfig(contextId, resourceLinkId);
    const grade = calculateGrade(response, surveyConfig);
    
    // 3. Create passback record
    await createGradePassback({
      userId,
      surveyId,
      responseId,
      grade,
      contextId,
      resourceLinkId
    });
    
    // 4. Return success page
    res.send(`
      <html>
        <body>
          <h1>Survey Completed!</h1>
          <p>Your response has been recorded.</p>
          <p>Grade: ${grade}%</p>
          <a href="javascript:window.close()">Close Window</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error processing completion:', error);
    res.status(500).send('Error processing survey completion');
  }
}
```

## Summary

The End of Survey redirect is critical for:
- Recording survey completion
- Triggering automatic grade passback
- Providing feedback to students

Without this redirect, grades must be manually processed through polling, which is less efficient and has a 5-minute delay.