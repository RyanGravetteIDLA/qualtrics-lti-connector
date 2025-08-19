const axios = require('axios');

// Configuration from our test results
const QUALTRICS_API_TOKEN = 'k9nrFat0w5a7KjjUgXvV8BwwItmyve4QYbfl33pa';
const QUALTRICS_DATACENTER = 'iad1';
const QUALTRICS_BRAND_ID = 'idla2';
const QUALTRICS_BASE_URL = `https://${QUALTRICS_DATACENTER}.qualtrics.com/API/v3`;

const api = axios.create({
    baseURL: QUALTRICS_BASE_URL,
    headers: {
        'X-API-TOKEN': QUALTRICS_API_TOKEN,
        'Content-Type': 'application/json'
    },
    timeout: 30000
});

async function createTestSurvey() {
    console.log('🚀 Creating Test Survey in Qualtrics\n');
    console.log('=' .repeat(50));

    try {
        // Step 1: Create a new survey
        console.log('\n1. Creating survey...');
        const surveyData = {
            SurveyName: 'LTI Connector Test Survey',
            Language: 'EN',
            ProjectCategory: 'CORE'
        };

        const createResponse = await api.post('/survey-definitions', surveyData);
        const surveyId = createResponse.data.result.SurveyID;
        console.log(`✅ Survey created with ID: ${surveyId}`);

        // Step 2: Add questions to the survey
        console.log('\n2. Adding questions to survey...');
        
        // Add a text entry question
        const textQuestion = {
            QuestionText: 'What is your name?',
            DataExportTag: 'Q1',
            QuestionType: 'TE',
            Selector: 'SL',
            Configuration: {
                QuestionDescriptionOption: 'UseText'
            },
            QuestionDescription: 'Please enter your full name',
            Validation: {
                Settings: {
                    ForceResponse: 'OFF',
                    ForceResponseType: 'OFF',
                    Type: 'None'
                }
            }
        };

        await api.post(`/survey-definitions/${surveyId}/questions`, textQuestion);
        console.log('   ✅ Added text entry question');

        // Add a multiple choice question
        const mcQuestion = {
            QuestionText: 'How satisfied are you with this course?',
            DataExportTag: 'Q2',
            QuestionType: 'MC',
            Selector: 'SAVR',
            SubSelector: 'TX',
            Configuration: {
                QuestionDescriptionOption: 'UseText'
            },
            QuestionDescription: 'Please rate your satisfaction',
            Choices: {
                '1': { Display: 'Very Satisfied' },
                '2': { Display: 'Satisfied' },
                '3': { Display: 'Neutral' },
                '4': { Display: 'Dissatisfied' },
                '5': { Display: 'Very Dissatisfied' }
            },
            ChoiceOrder: ['1', '2', '3', '4', '5'],
            Validation: {
                Settings: {
                    ForceResponse: 'OFF',
                    ForceResponseType: 'OFF',
                    Type: 'None'
                }
            }
        };

        await api.post(`/survey-definitions/${surveyId}/questions`, mcQuestion);
        console.log('   ✅ Added multiple choice question');

        // Add a text area question
        const textAreaQuestion = {
            QuestionText: 'Please provide any additional feedback',
            DataExportTag: 'Q3',
            QuestionType: 'TE',
            Selector: 'ML',
            Configuration: {
                QuestionDescriptionOption: 'UseText'
            },
            QuestionDescription: 'Your feedback helps us improve',
            Validation: {
                Settings: {
                    ForceResponse: 'OFF',
                    ForceResponseType: 'OFF',
                    Type: 'None'
                }
            }
        };

        await api.post(`/survey-definitions/${surveyId}/questions`, textAreaQuestion);
        console.log('   ✅ Added text area question');

        // Step 3: Add embedded data fields for LTI
        console.log('\n3. Adding LTI embedded data fields...');
        
        const embeddedDataFlow = {
            Type: 'EmbeddedData',
            FlowID: 'FL_1',
            EmbeddedData: [
                { Description: 'userEmail', Type: 'Recipient', Field: 'userEmail', VariableType: 'String' },
                { Description: 'ltiUserId', Type: 'Recipient', Field: 'ltiUserId', VariableType: 'String' },
                { Description: 'ltiContextId', Type: 'Recipient', Field: 'ltiContextId', VariableType: 'String' },
                { Description: 'ltiResourceId', Type: 'Recipient', Field: 'ltiResourceId', VariableType: 'String' },
                { Description: 'ltiLaunchId', Type: 'Recipient', Field: 'ltiLaunchId', VariableType: 'String' },
                { Description: 'courseName', Type: 'Recipient', Field: 'courseName', VariableType: 'String' },
                { Description: 'userName', Type: 'Recipient', Field: 'userName', VariableType: 'String' }
            ]
        };

        // Note: Survey flow API might be limited, so we'll document manual steps
        console.log('   ℹ️  Embedded data fields configuration:');
        console.log('      Please manually add these embedded data fields in Survey Flow:');
        console.log('      - userEmail');
        console.log('      - ltiUserId');
        console.log('      - ltiContextId');
        console.log('      - ltiResourceId');
        console.log('      - ltiLaunchId');
        console.log('      - courseName');
        console.log('      - userName');

        // Step 4: Activate the survey
        console.log('\n4. Activating survey...');
        await api.put(`/survey-definitions/${surveyId}/options`, {
            Active: true
        });
        console.log('   ✅ Survey activated');

        // Step 5: Get the survey link
        console.log('\n5. Getting survey details...');
        const surveyDetails = await api.get(`/survey-definitions/${surveyId}`);
        
        console.log('\n' + '=' .repeat(50));
        console.log('✅ TEST SURVEY CREATED SUCCESSFULLY!\n');
        console.log('Survey Details:');
        console.log(`  Name: ${surveyDetails.data.result.SurveyName}`);
        console.log(`  ID: ${surveyId}`);
        console.log(`  Status: Active`);
        console.log(`  Direct Link: https://${QUALTRICS_DATACENTER}.qualtrics.com/jfe/form/${surveyId}`);
        
        console.log('\n📝 Next Steps:');
        console.log('1. Log into Qualtrics and navigate to your survey');
        console.log('2. Go to "Survey Flow" and add the embedded data fields listed above');
        console.log('3. Configure End of Survey redirect URL for grade passback');
        console.log('4. Test the survey with the LTI connector');
        
        console.log('\n📋 Use this Survey ID in your LTI configuration:');
        console.log(`   ${surveyId}`);
        
        return surveyId;

    } catch (error) {
        console.error('❌ Error creating survey:', error.response?.data || error.message);
        if (error.response?.data?.meta?.error) {
            console.error('   Error details:', error.response.data.meta.error);
        }
        throw error;
    }
}

// Main execution
async function main() {
    try {
        const surveyId = await createTestSurvey();
        
        // Test taking a response
        console.log('\n\n🧪 Testing Survey Response Submission...');
        console.log('=' .repeat(50));
        
        // Create a test response
        console.log('\n1. Submitting test response...');
        
        const testResponse = {
            values: {
                userEmail: 'test.student@example.com',
                ltiUserId: 'test_123',
                ltiContextId: 'course_456',
                userName: 'Test Student',
                courseName: 'Test Course 101',
                QID1: 'Test Student Name',
                QID2: '1',
                QID3: 'This is a test response from the API'
            }
        };

        // Note: Direct response submission via API requires special permissions
        console.log('   ℹ️  Note: Direct response submission requires survey to be taken via web interface');
        console.log('   Test the survey by visiting:');
        console.log(`   https://${QUALTRICS_DATACENTER}.qualtrics.com/jfe/form/${surveyId}`);
        
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
main();