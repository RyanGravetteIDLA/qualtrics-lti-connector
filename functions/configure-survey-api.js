const axios = require('axios');

// Configuration
const QUALTRICS_API_TOKEN = 'k9nrFat0w5a7KjjUgXvV8BwwItmyve4QYbfl33pa';
const QUALTRICS_DATACENTER = 'iad1';
const SURVEY_ID = 'SV_1zwVyeUcTG59uXY'; // Our test survey

const api = axios.create({
    baseURL: `https://${QUALTRICS_DATACENTER}.qualtrics.com/API/v3`,
    headers: {
        'X-API-TOKEN': QUALTRICS_API_TOKEN,
        'Content-Type': 'application/json'
    },
    timeout: 30000
});

async function configureSurveyViaAPI() {
    console.log('🔧 Attempting to configure survey via API\n');
    console.log('=' .repeat(50));

    // Step 1: Try to activate the survey via different endpoints
    console.log('\n1. ACTIVATING SURVEY');
    console.log('-'.repeat(30));
    
    // Method 1: Update survey metadata
    try {
        console.log('   Trying: PUT /surveys/{id} with isActive...');
        const activateResponse = await api.put(`/surveys/${SURVEY_ID}`, {
            isActive: true
        });
        console.log('   ✅ Survey activated via /surveys endpoint');
    } catch (error) {
        console.log('   ❌ Failed:', error.response?.data?.meta?.error?.errorMessage || 'Not available');
        
        // Method 2: Try survey-definitions endpoint
        try {
            console.log('   Trying: PUT /survey-definitions/{id} with active flag...');
            const activateResponse2 = await api.put(`/survey-definitions/${SURVEY_ID}`, {
                SurveyStatus: 'Active',
                SurveyName: 'LTI Connector Test Survey',
                SurveyDescription: 'Test survey for LTI integration'
            });
            console.log('   ✅ Survey activated via /survey-definitions endpoint');
        } catch (error2) {
            console.log('   ❌ Failed:', error2.response?.data?.meta?.error?.errorMessage || 'Not available');
        }
    }

    // Step 2: Configure Survey Flow with Embedded Data
    console.log('\n2. CONFIGURING EMBEDDED DATA FIELDS');
    console.log('-'.repeat(30));
    
    try {
        console.log('   Getting current survey flow...');
        const flowResponse = await api.get(`/survey-definitions/${SURVEY_ID}/flow`);
        const currentFlow = flowResponse.data.result;
        console.log('   ✅ Current flow retrieved');
        
        // Try to update flow with embedded data
        const updatedFlow = {
            ...currentFlow,
            Flow: [
                {
                    Type: 'EmbeddedData',
                    FlowID: 'FL_1',
                    EmbeddedData: [
                        { Description: 'userEmail', Type: 'Recipient', Field: 'userEmail', VariableType: 'String', Value: '' },
                        { Description: 'ltiUserId', Type: 'Recipient', Field: 'ltiUserId', VariableType: 'String', Value: '' },
                        { Description: 'ltiContextId', Type: 'Recipient', Field: 'ltiContextId', VariableType: 'String', Value: '' },
                        { Description: 'ltiResourceId', Type: 'Recipient', Field: 'ltiResourceId', VariableType: 'String', Value: '' },
                        { Description: 'ltiLaunchId', Type: 'Recipient', Field: 'ltiLaunchId', VariableType: 'String', Value: '' },
                        { Description: 'courseName', Type: 'Recipient', Field: 'courseName', VariableType: 'String', Value: '' },
                        { Description: 'userName', Type: 'Recipient', Field: 'userName', VariableType: 'String', Value: '' }
                    ]
                },
                ...(currentFlow.Flow || [])
            ]
        };

        console.log('   Updating survey flow with embedded data...');
        await api.put(`/survey-definitions/${SURVEY_ID}/flow`, updatedFlow);
        console.log('   ✅ Embedded data fields added to survey flow');
    } catch (error) {
        console.log('   ❌ Failed to update flow:', error.response?.data?.meta?.error?.errorMessage || 'Flow API may not be available');
    }

    // Step 3: Configure End of Survey Options
    console.log('\n3. CONFIGURING END OF SURVEY');
    console.log('-'.repeat(30));
    
    try {
        console.log('   Getting survey options...');
        const optionsResponse = await api.get(`/survey-definitions/${SURVEY_ID}/options`);
        const currentOptions = optionsResponse.data.result;
        console.log('   ✅ Current options retrieved');
        
        // Try to update with end of survey redirect
        const redirectUrl = 'https://your-firebase-project.cloudfunctions.net/api/grades/process-completion';
        const updatedOptions = {
            ...currentOptions,
            SurveyTermination: 'Redirect',
            SurveyTerminationURL: `${redirectUrl}?responseId=\${e://Field/ResponseID}&surveyId=\${e://Field/SurveyID}&userId=\${e://Field/userEmail}`,
            EOSMessage: 'EN',
            EOSRedirectURL: `${redirectUrl}?responseId=\${e://Field/ResponseID}&surveyId=\${e://Field/SurveyID}&userId=\${e://Field/userEmail}`
        };

        console.log('   Updating end of survey options...');
        await api.put(`/survey-definitions/${SURVEY_ID}/options`, updatedOptions);
        console.log('   ✅ End of survey redirect configured');
    } catch (error) {
        console.log('   ❌ Failed to update options:', error.response?.data?.meta?.error?.errorMessage || 'Not available');
    }

    // Step 4: Try alternative survey options endpoint
    console.log('\n4. TRYING SURVEY SETTINGS');
    console.log('-'.repeat(30));
    
    try {
        console.log('   Updating survey settings...');
        const settingsUpdate = {
            SurveyOptions: {
                BackButton: true,
                SaveAndContinue: true,
                SurveyProtection: 'PublicSurvey',
                BallotBoxStuffingPrevention: false,
                NoIndex: 'Yes',
                RecaptchaV3: false,
                SurveyExpiration: null,
                SurveyTermination: 'Redirect',
                Header: '',
                Footer: '',
                ProgressBarDisplay: 'None',
                PartialData: '+1 week',
                ValidationMessage: '',
                PreviousButton: ' ← ',
                NextButton: ' → ',
                SkinLibrary: '$$libraries$$',
                SkinType: 'MQ',
                Skin: 'spark_2024',
                NewScoring: 1,
                EOSMessage: '',
                ShowExportTags: false,
                CollectGeoLocation: false,
                SurveyTitle: 'LTI Connector Test Survey',
                SurveyDescription: 'Test survey for LTI integration'
            }
        };

        await api.post(`/survey-definitions/${SURVEY_ID}/options`, settingsUpdate);
        console.log('   ✅ Survey settings updated');
    } catch (error) {
        console.log('   ❌ Failed:', error.response?.data?.meta?.error?.errorMessage || 'Not available');
    }

    // Step 5: Create a distribution for link generation
    console.log('\n5. CREATING DISTRIBUTION');
    console.log('-'.repeat(30));
    
    try {
        console.log('   Creating anonymous distribution...');
        const distributionData = {
            surveyId: SURVEY_ID,
            linkType: 'Anonymous',
            description: 'LTI Connector Distribution',
            action: 'CreateDistribution'
        };

        const distResponse = await api.post('/distributions', distributionData);
        
        if (distResponse.data.result && distResponse.data.result.id) {
            const distributionId = distResponse.data.result.id;
            console.log(`   ✅ Distribution created: ${distributionId}`);
            
            // Try to get the survey link
            console.log('   Getting distribution link...');
            const linkResponse = await api.get(`/distributions/${distributionId}/links`);
            if (linkResponse.data.result) {
                console.log('   ✅ Distribution link available');
            }
        }
    } catch (error) {
        console.log('   ❌ Failed:', error.response?.data?.meta?.error?.errorMessage || 'Not available');
    }

    // Step 6: Check what embedded data the survey can accept
    console.log('\n6. CHECKING SURVEY METADATA');
    console.log('-'.repeat(30));
    
    try {
        console.log('   Getting survey metadata...');
        const metadataResponse = await api.get(`/surveys/${SURVEY_ID}`);
        const metadata = metadataResponse.data.result;
        console.log('   ✅ Survey metadata retrieved');
        console.log(`   Survey Name: ${metadata.name}`);
        console.log(`   Status: ${metadata.isActive ? 'Active' : 'Inactive'}`);
        console.log(`   Modified: ${metadata.lastModified}`);
        
        // Check if we can see embedded data fields
        if (metadata.embeddedData) {
            console.log('   Embedded Data Fields:', Object.keys(metadata.embeddedData));
        }
    } catch (error) {
        console.log('   ❌ Failed:', error.response?.data?.meta?.error?.errorMessage || 'Not available');
    }

    // Step 7: Try to publish/activate through different method
    console.log('\n7. PUBLISHING SURVEY');
    console.log('-'.repeat(30));
    
    try {
        console.log('   Publishing survey...');
        await api.post(`/survey-definitions/${SURVEY_ID}/versions`, {
            Description: 'Published via API',
            Published: true
        });
        console.log('   ✅ Survey published');
    } catch (error) {
        console.log('   ❌ Failed:', error.response?.data?.meta?.error?.errorMessage || 'Publishing may require web interface');
    }

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 CONFIGURATION ATTEMPT SUMMARY\n');
    
    console.log('Direct Survey Link:');
    console.log(`https://${QUALTRICS_DATACENTER}.qualtrics.com/jfe/form/${SURVEY_ID}`);
    
    console.log('\nWith Embedded Data (append to URL):');
    console.log(`?userEmail=test@example.com&ltiUserId=123&courseName=TestCourse`);
    
    console.log('\n📝 Manual Steps Still Required:');
    console.log('1. Log into Qualtrics web interface');
    console.log('2. Navigate to Survey Flow');
    console.log('3. Add Embedded Data element at the beginning');
    console.log('4. Add the 7 LTI fields (userEmail, ltiUserId, etc.)');
    console.log('5. Configure End of Survey element with redirect URL');
    console.log('6. Publish/Activate the survey');
    
    console.log('\n💡 Note: Most configuration requires web interface access');
    console.log('   The Qualtrics API has limited support for flow/options changes');
}

// Run the configuration
configureSurveyViaAPI().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});