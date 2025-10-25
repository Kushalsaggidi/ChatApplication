// Simple test script to verify search functionality
const axios = require('axios');

const testSearch = async () => {
  try {
    // First, let's test if the server is running
    console.log('Testing search functionality...');
    
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    console.log('API URL:', API_URL);
    
    // Test without authentication (should fail)
    try {
      const response = await axios.get(`${API_URL}/api/user?search=test`);
      console.log('❌ Search worked without auth (this should not happen)');
    } catch (error) {
      console.log('✅ Search correctly requires authentication:', error.response?.status);
    }
    
    console.log('Test completed. Make sure to test with proper authentication in the app.');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

testSearch();
