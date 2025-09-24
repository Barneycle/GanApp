// Storage Debug Utility Functions
// Copy and paste these functions into your browser console to debug storage issues

export const debugStorage = async () => {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (session) {
      // Decode JWT token
      try {
        const tokenPayload = JSON.parse(atob(session.access_token.split('.')[1]));
      } catch (jwtError) {
        // JWT decode error
      }
    }
    
    // Check storage buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    // Test upload permissions for each bucket
    const testBuckets = ['event-banners', 'event-kits', 'sponsor-logos', 'speaker-photos', 'event-programmes', 'certificate-templates'];
    
    for (const bucketName of testBuckets) {
      // Create test file
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      
      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(`debug-test-${Date.now()}.txt`, testFile);
        
        if (!error && data) {
          // Try to delete the test file
          const { error: deleteError } = await supabase.storage
            .from(bucketName)
            .remove([data.path]);
        }
      } catch (uploadError) {
        // Upload exception
      }
    }
    
  } catch (error) {
    // Debug error
  }
};

export const checkUserRole = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return;
    }
    
    // Check if user has required role for uploads
    const hasUploadPermission = user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'organizer';
    return hasUploadPermission;
    
  } catch (error) {
    return false;
  }
};

export const testPolicyEvaluation = async () => {
  try {
    // Test the exact policy condition
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return false;
    }
    
    // Decode JWT to check the exact values
    const tokenPayload = JSON.parse(atob(session.access_token.split('.')[1]));
    const userRole = tokenPayload.user_metadata?.role;
    
    return userRole === 'admin' || userRole === 'organizer';
    
  } catch (error) {
    return false;
  }
};

// Usage instructions
// These functions can be used for debugging storage and authentication issues
// 1. debugStorage() - Comprehensive storage test
// 2. checkUserRole() - Check current user role and permissions  
// 3. testPolicyEvaluation() - Test policy evaluation logic
