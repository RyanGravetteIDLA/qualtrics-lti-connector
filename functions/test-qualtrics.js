const axios = require('axios');

// Configuration
const QUALTRICS_API_TOKEN = 'k9nrFat0w5a7KjjUgXvV8BwwItmyve4QYbfl33pa';
const QUALTRICS_USER = 'ryan.gravette@idla.org';

// Try common Qualtrics data centers
const DATA_CENTERS = [
    'iad1',
    'sjc1', 
    'eu',
    'ca1',
    'gov1',
    'au1',
    'fra1',
    'sin1'
];

async function findDataCenter() {
    console.log('🔍 Finding correct Qualtrics data center...\n');
    
    for (const dc of DATA_CENTERS) {
        const baseUrl = `https://${dc}.qualtrics.com/API/v3`;
        try {
            console.log(`Testing ${dc}...`);
            const response = await axios.get(`${baseUrl}/whoami`, {
                headers: {
                    'X-API-TOKEN': QUALTRICS_API_TOKEN
                },
                timeout: 5000
            });
            
            if (response.status === 200) {
                console.log(`✅ SUCCESS! Found data center: ${dc}`);
                console.log('User Info:', JSON.stringify(response.data.result, null, 2));
                return { dc, data: response.data.result };
            }
        } catch (error) {
            if (error.response?.status === 401) {
                console.log(`❌ ${dc} - Authentication failed (wrong data center)`);
            } else {
                console.log(`❌ ${dc} - Connection failed`);
            }
        }
    }
    return null;
}

async function testQualtricsAPI(datacenter) {
    const baseUrl = `https://${datacenter}.qualtrics.com/API/v3`;
    const api = axios.create({
        baseURL: baseUrl,
        headers: {
            'X-API-TOKEN': QUALTRICS_API_TOKEN,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });

    console.log('\n📊 Testing Qualtrics API Functions\n');
    console.log('=' .repeat(50));

    // Test 1: Who Am I
    try {
        console.log('\n1. Testing /whoami endpoint...');
        const whoamiResponse = await api.get('/whoami');
        console.log('✅ Who Am I successful');
        console.log('   User ID:', whoamiResponse.data.result.userId);
        console.log('   Username:', whoamiResponse.data.result.username);
        console.log('   Account Type:', whoamiResponse.data.result.accountType);
        console.log('   Brand ID:', whoamiResponse.data.result.brandId);
    } catch (error) {
        console.log('❌ Who Am I failed:', error.response?.data || error.message);
    }

    // Test 2: List Surveys
    try {
        console.log('\n2. Testing survey listing...');
        const surveysResponse = await api.get('/surveys');
        const surveys = surveysResponse.data.result.elements || [];
        console.log(`✅ Found ${surveys.length} survey(s)`);
        
        if (surveys.length > 0) {
            console.log('\n   Available Surveys:');
            surveys.forEach((survey, index) => {
                console.log(`   ${index + 1}. ${survey.name} (ID: ${survey.id})`);
                console.log(`      Status: ${survey.isActive ? 'Active' : 'Inactive'}`);
                console.log(`      Created: ${survey.creationDate}`);
                console.log(`      Modified: ${survey.lastModified}`);
            });
            
            // Test getting details of first survey
            const firstSurvey = surveys[0];
            console.log(`\n3. Getting details for survey: ${firstSurvey.name}`);
            
            try {
                const surveyDetailResponse = await api.get(`/surveys/${firstSurvey.id}`);
                const surveyDetail = surveyDetailResponse.data.result;
                console.log('✅ Survey details retrieved');
                console.log('   Questions:', surveyDetail.questions ? Object.keys(surveyDetail.questions).length : 0);
                console.log('   Response Count:', surveyDetail.responseCount || 0);
            } catch (error) {
                console.log('❌ Failed to get survey details:', error.response?.data || error.message);
            }

            // Test getting responses
            console.log(`\n4. Checking for responses in survey: ${firstSurvey.name}`);
            try {
                const responsesResponse = await api.get(`/surveys/${firstSurvey.id}/export-responses`, {
                    params: {
                        format: 'json',
                        limit: 10
                    }
                });
                console.log('✅ Response export initiated');
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log('ℹ️  No responses found for this survey');
                } else {
                    console.log('❌ Failed to get responses:', error.response?.data || error.message);
                }
            }
        } else {
            console.log('\nℹ️  No surveys found in your account');
            console.log('   You may want to create a test survey in Qualtrics first');
        }
    } catch (error) {
        console.log('❌ Survey listing failed:', error.response?.data || error.message);
    }

    // Test 3: Check Libraries
    try {
        console.log('\n5. Testing library access...');
        const librariesResponse = await api.get('/libraries');
        const libraries = librariesResponse.data.result.elements || [];
        console.log(`✅ Found ${libraries.length} library(ies)`);
        
        if (libraries.length > 0) {
            console.log('   Available Libraries:');
            libraries.forEach((lib, index) => {
                console.log(`   ${index + 1}. ${lib.libraryName} (ID: ${lib.libraryId})`);
            });
        }
    } catch (error) {
        console.log('❌ Library listing failed:', error.response?.data || error.message);
    }

    // Test 4: Check Distributions capability
    try {
        console.log('\n6. Testing distributions endpoint...');
        const distResponse = await api.get('/distributions');
        console.log('✅ Distributions endpoint accessible');
        const distributions = distResponse.data.result?.elements || [];
        console.log(`   Found ${distributions.length} distribution(s)`);
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('ℹ️  Distributions endpoint not available (may need different permissions)');
        } else {
            console.log('❌ Distributions test failed:', error.response?.data || error.message);
        }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✅ API Testing Complete!\n');
    
    return {
        datacenter,
        baseUrl,
        userInfo: whoamiResponse?.data?.result
    };
}

async function generateEnvConfig(datacenter, userInfo) {
    console.log('\n📝 Recommended .env Configuration:\n');
    console.log('```');
    console.log(`# Qualtrics API Configuration`);
    console.log(`QUALTRICS_API_TOKEN=${QUALTRICS_API_TOKEN}`);
    console.log(`QUALTRICS_DATACENTER=${datacenter}`);
    console.log(`QUALTRICS_BASE_URL=https://${datacenter}.qualtrics.com`);
    if (userInfo?.brandId) {
        console.log(`QUALTRICS_BRAND_ID=${userInfo.brandId}`);
    }
    console.log('```\n');
}

// Main execution
async function main() {
    console.log('🚀 Qualtrics API Test Script');
    console.log('=' .repeat(50));
    console.log(`Token: ${QUALTRICS_API_TOKEN.substring(0, 10)}...`);
    console.log(`User: ${QUALTRICS_USER}`);
    console.log('=' .repeat(50) + '\n');

    // Step 1: Find the correct data center
    const dcResult = await findDataCenter();
    
    if (!dcResult) {
        console.log('\n❌ Could not find valid data center. Please check your API token.');
        return;
    }

    // Step 2: Run comprehensive API tests
    const testResult = await testQualtricsAPI(dcResult.dc);

    // Step 3: Generate configuration
    await generateEnvConfig(dcResult.dc, dcResult.data);

    console.log('✨ Testing complete! Use the configuration above in your .env file.');
}

// Run the tests
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});