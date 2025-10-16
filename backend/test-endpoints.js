const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testEndpoints() {
  try {
    console.log('🧪 Testing TaxWise API endpoints...\n');

    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);

    // Test 2: Demo Login
    console.log('\n2. Testing Demo Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/demo-login`);
    console.log('✅ Demo Login:', loginResponse.data.message);
    const token = loginResponse.data.data.token;

    // Test 3: Dashboard Summary
    console.log('\n3. Testing Dashboard Summary...');
    const dashboardResponse = await axios.get(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Dashboard Summary:', dashboardResponse.data.status);

    // Test 4: Tax Simulation
    console.log('\n4. Testing Tax Simulation...');
    const taxResponse = await axios.get(`${BASE_URL}/tax/simulate`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Tax Simulation:', taxResponse.data.status);

    // Test 5: Credit Health
    console.log('\n5. Testing Credit Health...');
    const creditResponse = await axios.get(`${BASE_URL}/credit/health`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Credit Health:', creditResponse.data.status);

    console.log('\n🎉 All endpoints are working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testEndpoints();
}

module.exports = testEndpoints;