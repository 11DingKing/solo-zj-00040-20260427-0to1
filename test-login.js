const axios = require('axios');

// 测试登录功能
async function testLogin() {
  console.log('=== 测试登录功能 ===');
  
  try {
    const response = await axios.post('http://localhost:5173/api/auth/login', {
      phone: 'admin',
      password: 'admin123'
    });
    
    console.log('登录成功:', response.data);
    console.log('Token:', response.data.token);
    console.log('User:', response.data.user);
    
    // 测试获取当前用户信息
    const token = response.data.token;
    const userResponse = await axios.get('http://localhost:5173/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('\n=== 测试获取当前用户信息 ===');
    console.log('用户信息:', userResponse.data);
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 测试其他API端点
async function testOtherEndpoints() {
  console.log('\n=== 测试其他API端点 ===');
  
  try {
    // 首先登录获取token
    const loginResponse = await axios.post('http://localhost:5173/api/auth/login', {
      phone: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    // 测试获取门店列表
    const storesResponse = await axios.get('http://localhost:5173/api/stores', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('门店列表:', storesResponse.data);
    
  } catch (error) {
    console.error('测试其他端点失败:', error.response?.data || error.message);
  }
}

// 运行测试
testLogin()
  .then(() => testOtherEndpoints())
  .then(() => console.log('\n=== 测试完成 ==='))
  .catch(error => console.error('测试过程中发生错误:', error));
