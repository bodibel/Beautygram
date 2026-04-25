import { registerUser } from '../lib/actions/auth';

async function testRegistration() {
    const testEmail = `test_${Date.now()}@glowyspot.com`;
    console.log(`Testing registration with: ${testEmail}`);

    try {
        const result = await registerUser({
            email: testEmail,
            name: 'Test Deployment User',
            password: 'TestPassword123!'
        });
        if (result.success && result.user) {
            console.log('✅ Registration successful:', result.user.id);
        } else {
             console.error('❌ Registration failing with error:', result.error);
        }
    } catch (error) {
        console.error('❌ Registration failed:', error);
        process.exit(1);
    }
}

testRegistration();
