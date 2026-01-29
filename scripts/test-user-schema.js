// Test script to verify the new user schema is working
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUserSchema() {
  try {
    console.log('Testing new user schema...');
    
    // Test creating a user with new schema
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
        role: 'user'
      }
    });
    
    console.log('✅ User created successfully:', testUser);
    
    // Test retrieving users
    const users = await prisma.user.findMany();
    console.log('✅ Users retrieved:', users.length, 'users found');
    
    // Test getting users by role
    const userRoleUsers = await prisma.user.findMany({
      where: { role: 'user' }
    });
    console.log('✅ Users by role retrieved:', userRoleUsers.length, 'users with role "user"');
    
    // Clean up test data
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('✅ Test user cleaned up');
    
    console.log('🎉 All tests passed! New user schema is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserSchema();
