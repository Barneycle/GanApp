// Storage Debug Utility Functions
// Copy and paste these functions into your browser console to debug storage issues

export const debugStorage = async () => {
  console.log('🔍 Starting storage debug...');
  
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📋 Session:', session ? 'Found' : 'None', sessionError);
    
    if (session) {
      console.log('👤 User ID:', session.user.id);
      console.log('📧 Email:', session.user.email);
      console.log('🔑 Access Token:', session.access_token ? 'Present' : 'Missing');
      
      // Decode JWT token
      try {
        const tokenPayload = JSON.parse(atob(session.access_token.split('.')[1]));
        console.log('🎫 JWT Payload:', tokenPayload);
        console.log('👑 User Role:', tokenPayload.user_metadata?.role);
        console.log('👤 User Type:', tokenPayload.user_metadata?.user_type);
      } catch (jwtError) {
        console.error('❌ JWT decode error:', jwtError);
      }
    }
    
    // Check storage buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    console.log('🪣 Storage Buckets:', buckets?.map(b => b.name) || [], bucketError);
    
    // Test upload permissions for each bucket
    const testBuckets = ['event-banners', 'event-kits', 'sponsor-logos', 'speaker-photos', 'event-programmes', 'certificate-templates'];
    
    for (const bucketName of testBuckets) {
      console.log(`\n🔍 Testing ${bucketName}...`);
      
      // Create test file
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      
      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(`debug-test-${Date.now()}.txt`, testFile);
        
        if (error) {
          console.error(`❌ ${bucketName} upload failed:`, error.message);
          console.error(`🔍 Error details:`, error);
        } else {
          console.log(`✅ ${bucketName} upload succeeded:`, data);
          
          // Try to delete the test file
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([data.path]);
          
          if (deleteError) {
            console.warn(`⚠️ ${bucketName} delete failed:`, deleteError.message);
          } else {
            console.log(`🗑️ ${bucketName} test file deleted`);
          }
        }
      } catch (uploadError) {
        console.error(`❌ ${bucketName} upload exception:`, uploadError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
  
  console.log('✅ Storage debug completed');
};

export const checkUserRole = async () => {
  console.log('🔍 Checking user role...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Get user error:', error);
      return;
    }
    
    if (!user) {
      console.log('❌ No user found');
      return;
    }
    
    console.log('👤 User:', {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
      role: user.user_metadata?.role,
      userType: user.user_metadata?.user_type
    });
    
    // Check if user has required role for uploads
    const hasUploadPermission = user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'organizer';
    console.log('🔐 Upload Permission:', hasUploadPermission ? '✅ ALLOWED' : '❌ DENIED');
    
  } catch (error) {
    console.error('❌ Role check error:', error);
  }
};

export const testPolicyEvaluation = async () => {
  console.log('🔍 Testing policy evaluation...');
  
  try {
    // Test the exact policy condition
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ No session found');
      return;
    }
    
    // Decode JWT to check the exact values
    const tokenPayload = JSON.parse(atob(session.access_token.split('.')[1]));
    const userRole = tokenPayload.user_metadata?.role;
    const userType = tokenPayload.user_metadata?.user_type;
    
    console.log('🎫 Policy Evaluation:', {
      authRole: 'authenticated', // This should be true if we have a session
      userRole: userRole,
      userType: userType,
      isAdmin: userRole === 'admin',
      isOrganizer: userRole === 'organizer',
      hasPermission: userRole === 'admin' || userRole === 'organizer'
    });
    
    // Test the exact policy condition
    const policyCondition = `auth.role() = 'authenticated' AND ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin' OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'organizer')`;
    console.log('📋 Policy Condition:', policyCondition);
    console.log('🔍 Condition Evaluation:', {
      authRole: 'authenticated',
      jwtRole: userRole,
      conditionResult: userRole === 'admin' || userRole === 'organizer'
    });
    
  } catch (error) {
    console.error('❌ Policy test error:', error);
  }
};

// Usage instructions
console.log(`
🔧 Storage Debug Functions Available:

1. debugStorage() - Comprehensive storage test
2. checkUserRole() - Check current user role and permissions  
3. testPolicyEvaluation() - Test policy evaluation logic

Usage:
- Copy and paste these functions into your browser console
- Run them while logged in to test storage policies
- Check the console output for detailed diagnostics

Example:
  debugStorage();
  checkUserRole();
  testPolicyEvaluation();
`);
