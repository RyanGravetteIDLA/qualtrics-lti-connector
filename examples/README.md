# Examples Directory

This directory contains sample data and configuration files for testing and understanding the Qualtrics LTI Connector integration.

## Files

### 1. sample-lti-launch.json
Sample LTI 1.3 launch payload that would be sent from Agilix Buzz to the connector. This shows the structure of claims and data available during an LTI launch.

Key fields:
- `sub`: User ID from LMS
- `email`: User's email (primary identifier)
- `context`: Course information
- `resource_link`: Assignment details
- `roles`: User's role (Instructor/Learner)
- `endpoint`: Grade passback URLs

### 2. sample-survey-config.json
Configuration created when an instructor sets up a Qualtrics survey through the LTI tool.

Key fields:
- `surveyId`: Qualtrics survey identifier
- `scoringType`: How grades are calculated (completion/percentage/manual)
- `embeddedDataMapping`: Maps LTI data to Qualtrics embedded fields

### 3. sample-grade-passback.json
Example of grade data sent back to Agilix Buzz after a student completes a survey.

Contains:
- Internal grade passback record
- Formatted payload for Agilix API

### 4. sample-qualtrics-response.json
Sample response from Qualtrics API when retrieving survey submissions.

Shows:
- Response metadata (timing, completion status)
- Embedded LTI data
- Question responses
- System fields (IP, location, etc.)

## Testing Workflow

1. **LTI Launch** → System receives `sample-lti-launch.json` payload
2. **Survey Config** → Instructor creates configuration like `sample-survey-config.json`
3. **Student Takes Survey** → Qualtrics records response like `sample-qualtrics-response.json`
4. **Grade Passback** → System sends grade like `sample-grade-passback.json` to LMS

## Using These Examples

### For Development
```javascript
// Load sample data for testing
const sampleLaunch = require('./sample-lti-launch.json');
const sampleConfig = require('./sample-survey-config.json');

// Test your handlers
const result = await ltiHandler.processLaunch(sampleLaunch);
```

### For Manual Testing
You can use these JSON files with tools like:
- Postman (import as request body)
- curl (use with -d @filename.json)
- Firebase emulator (seed data)

### For Documentation
These examples serve as API documentation showing expected request/response formats.

## Notes

- All IDs and tokens in these files are fictional
- Email addresses use example.com domain
- Timestamps are in ISO 8601 format (UTC)
- Survey IDs follow Qualtrics format (SV_xxx)

## Environment Configuration

When using these examples, ensure your `.env` file contains:
```
QUALTRICS_API_TOKEN=k9nrFat0w5a7KjjUgXvV8BwwItmyve4QYbfl33pa
QUALTRICS_DATACENTER=iad1
QUALTRICS_BASE_URL=https://iad1.qualtrics.com
QUALTRICS_BRAND_ID=idla2
```