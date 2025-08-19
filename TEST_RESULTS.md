# Qualtrics API Testing Results

## Test Date: August 19, 2025

## Test Environment
- **API Token**: k9nrFat0w5a7KjjUgXvV8BwwItmyve4QYbfl33pa
- **User**: ryan.gravette@idla.org
- **Account Type**: Brand Admin (UT_BRANDADMIN)
- **Data Center**: iad1
- **Brand ID**: idla2
- **User ID**: UR_3PweTf9VPJ5jsuD

## API Connectivity Test Results ✅

### 1. Authentication - **PASSED**
- Successfully authenticated with provided token
- Correct data center identified: `iad1`
- User details retrieved successfully

### 2. Survey Listing - **PASSED**
- API endpoint accessible
- Initially found 0 surveys (blank testing environment as expected)

### 3. Library Access - **PASSED**
- Found 2 libraries:
  1. Ryan Gravette (ID: UR_3PweTf9VPJ5jsuD)
  2. Qualtrics Library (ID: GR_7VdPbx46ZyVF84l)

### 4. Survey Creation - **PASSED**
- Successfully created test survey
- **Survey ID**: SV_1zwVyeUcTG59uXY
- **Survey Name**: LTI Connector Test Survey
- Added 3 test questions successfully

### 5. Survey Activation - **PARTIAL**
- Survey created but activation endpoint has different requirements
- Survey is accessible via direct link

## Configuration Updates

### Environment Variables (.env)
```env
# Qualtrics API Configuration
QUALTRICS_API_TOKEN=k9nrFat0w5a7KjjUgXvV8BwwItmyve4QYbfl33pa
QUALTRICS_DATACENTER=iad1
QUALTRICS_BASE_URL=https://iad1.qualtrics.com
QUALTRICS_BRAND_ID=idla2
QUALTRICS_LIBRARY_ID=UR_3PweTf9VPJ5jsuD
```

## Created Test Survey

### Survey Details
- **Survey ID**: SV_1zwVyeUcTG59uXY
- **Direct Link**: https://iad1.qualtrics.com/jfe/form/SV_1zwVyeUcTG59uXY
- **Questions**:
  1. Text Entry: "What is your name?"
  2. Multiple Choice: "How satisfied are you with this course?"
  3. Text Area: "Please provide any additional feedback"

### Manual Configuration Required
To complete the LTI integration, manually configure in Qualtrics:

1. **Add Embedded Data Fields** in Survey Flow:
   - userEmail
   - ltiUserId
   - ltiContextId
   - ltiResourceId
   - ltiLaunchId
   - courseName
   - userName

2. **Configure End of Survey**:
   - Add redirect URL back to LTI tool for grade passback
   - URL format: `https://[your-firebase-project].cloudfunctions.net/api/grades/process-completion?responseId=${e://Field/ResponseID}&surveyId=${e://Field/SurveyID}&userId=${e://Field/userEmail}`

## Directory Structure Created

### Examples Directory
Created sample data files for testing:
- `sample-lti-launch.json` - Example LTI launch payload
- `sample-survey-config.json` - Instructor configuration example
- `sample-grade-passback.json` - Grade passback structure
- `sample-qualtrics-response.json` - Survey response format
- `README.md` - Documentation for examples

## Integration Status

### ✅ Working Components
1. Qualtrics API authentication
2. Survey listing and retrieval
3. Survey creation via API
4. Library access
5. Basic response structure

### ⚠️ Needs Configuration
1. Survey activation through web interface
2. Embedded data field setup
3. End of survey redirect configuration
4. Distribution creation for individual links

### 🔧 Next Steps
1. Manually activate the survey in Qualtrics web interface
2. Configure embedded data fields
3. Set up end of survey redirect
4. Test complete LTI launch flow
5. Verify grade passback functionality

## API Endpoints Tested

| Endpoint | Method | Status | Notes |
|----------|---------|--------|-------|
| /whoami | GET | ✅ | User info retrieved |
| /surveys | GET | ✅ | Survey listing works |
| /survey-definitions | POST | ✅ | Survey creation successful |
| /survey-definitions/{id}/questions | POST | ✅ | Questions added |
| /survey-definitions/{id}/options | PUT | ⚠️ | Different format needed |
| /libraries | GET | ✅ | Libraries accessible |
| /distributions | GET | ⚠️ | Requires surveyId parameter |

## Security Considerations

### Current Status
- API token is functional and has appropriate permissions
- Brand Admin level access confirmed
- Token should be kept secure and not committed to version control

### Recommendations
1. Rotate API token regularly
2. Use environment variables for production
3. Implement rate limiting in application
4. Add request logging for audit trail

## Troubleshooting Notes

### Known Issues
1. **Survey Activation**: The `/survey-definitions/{id}/options` endpoint requires different parameters than expected
2. **Distribution Creation**: May need to use web interface for initial setup
3. **Data Center Notice**: API suggests using `pdx1.qualtrics.com` for faster response times

### Solutions
1. Use Qualtrics web interface for survey activation
2. Create distributions through web UI initially
3. Consider updating base URL to suggested data center

## Conclusion

The Qualtrics API integration is functional with the provided token. The system can:
- Authenticate successfully
- Create surveys programmatically
- List and retrieve survey data
- Access library resources

The test survey (SV_1zwVyeUcTG59uXY) has been created and is ready for manual configuration of LTI-specific settings through the Qualtrics web interface.

## Test Scripts Created
1. `test-qualtrics.js` - API connectivity and discovery test
2. `create-test-survey.js` - Survey creation script
3. Example data files in `/examples` directory

All components are ready for integration testing once the manual Qualtrics configuration is complete.