import axios from 'axios';

async function testGitHubStatus() {
  console.log('🔍 Testing GitHub Status API...\n');
  
  try {
    // Test the status endpoint
    const statusResponse = await axios.get('https://www.githubstatus.com/api/v2/status.json');
    console.log('✅ Status API Response:');
    console.log(JSON.stringify(statusResponse.data, null, 2));
    console.log('\n');
    
    // Test the incidents endpoint
    const incidentsResponse = await axios.get('https://www.githubstatus.com/api/v2/incidents.json');
    console.log('✅ Incidents API Response:');
    console.log('Total incidents:', incidentsResponse.data.incidents.length);
    
    if (incidentsResponse.data.incidents.length > 0) {
      console.log('\nMost recent incident:');
      console.log(JSON.stringify(incidentsResponse.data.incidents[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testGitHubStatus();