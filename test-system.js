const axios = require('axios');

let token = '';
let userId = '';

// 测试登录功能
async function testLogin() {
  console.log('=== 测试登录功能 ===');
  
  try {
    const response = await axios.post('http://localhost:5173/api/auth/login', {
      phone: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success) {
      console.log('✅ 登录成功');
      console.log('Token:', response.data.token);
      console.log('User:', response.data.user);
      
      token = response.data.token;
      userId = response.data.user.id;
      
      return true;
    } else {
      console.log('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试获取当前用户信息
async function testGetCurrentUser() {
  console.log('\n=== 测试获取当前用户信息 ===');
  
  try {
    const response = await axios.get('http://localhost:5173/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 获取用户信息成功');
      console.log('User:', response.data.user);
      return true;
    } else {
      console.log('❌ 获取用户信息失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 获取用户信息测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试获取门店列表
async function testGetStores() {
  console.log('\n=== 测试获取门店列表 ===');
  
  try {
    const response = await axios.get('http://localhost:5173/api/stores', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 获取门店列表成功');
      console.log('Stores:', response.data.stores);
      return true;
    } else {
      console.log('❌ 获取门店列表失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 获取门店列表测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试创建门店
async function testCreateStore() {
  console.log('\n=== 测试创建门店 ===');
  
  try {
    const response = await axios.post('http://localhost:5173/api/stores', {
      name: '测试门店',
      address: '测试地址',
      businessHours: [
        { dayOfWeek: 0, openTime: '09:00', closeTime: '18:00', isClosed: false },
        { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00', isClosed: false },
        { dayOfWeek: 2, openTime: '09:00', closeTime: '18:00', isClosed: false },
        { dayOfWeek: 3, openTime: '09:00', closeTime: '18:00', isClosed: false },
        { dayOfWeek: 4, openTime: '09:00', closeTime: '18:00', isClosed: false },
        { dayOfWeek: 5, openTime: '10:00', closeTime: '16:00', isClosed: false },
        { dayOfWeek: 6, openTime: '10:00', closeTime: '16:00', isClosed: false }
      ],
      timeSlotRequirements: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', minEmployees: 2, maxEmployees: 4 },
        { dayOfWeek: 1, startTime: '12:00', endTime: '18:00', minEmployees: 3, maxEmployees: 5 }
      ],
      isActive: true
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 创建门店成功');
      console.log('Store:', response.data.store);
      return response.data.store;
    } else {
      console.log('❌ 创建门店失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 创建门店测试失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试获取员工列表
async function testGetEmployees() {
  console.log('\n=== 测试获取员工列表 ===');
  
  try {
    const response = await axios.get('http://localhost:5173/api/users/employees', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 获取员工列表成功');
      console.log('Employees:', response.data.employees);
      return true;
    } else {
      console.log('❌ 获取员工列表失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 获取员工列表测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试自动排班
async function testAutomaticScheduling(storeId) {
  console.log('\n=== 测试自动排班 ===');
  
  try {
    const today = new Date();
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - today.getDay() + 1); // 本周一
    const weekStartStr = weekStartDate.toISOString().split('T')[0];
    
    const response = await axios.post(`http://localhost:5173/api/shifts/store/${storeId}/week/${weekStartStr}/automatic`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 自动排班成功');
      console.log('Created shifts:', response.data.createdShifts?.length || 0);
      return true;
    } else {
      console.log('❌ 自动排班失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 自动排班测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🔍 开始测试智能排班调度系统\n');
  
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，测试终止');
    return;
  }
  
  await testGetCurrentUser();
  await testGetStores();
  
  const store = await testCreateStore();
  if (store) {
    await testGetEmployees();
    await testAutomaticScheduling(store._id);
  }
  
  console.log('\n=== 测试完成 ===');
  console.log('🎉 所有测试已执行完毕');
}

// 运行测试
runAllTests();
