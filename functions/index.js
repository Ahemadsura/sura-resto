const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Import backup functionality
const backup = require('./backup');

// Input validation utilities
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true };
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }
  
  return { isValid: true };
};

const validateDisplayName = (displayName) => {
  if (!displayName || typeof displayName !== 'string') {
    return { isValid: false, error: 'Display name is required' };
  }
  
  const trimmedName = displayName.trim();
  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters long' };
  }
  
  if (trimmedName.length > 50) {
    return { isValid: false, error: 'Display name is too long' };
  }
  
  // Check for valid characters (letters, numbers, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmedName)) {
    return { isValid: false, error: 'Display name contains invalid characters' };
  }
  
  return { isValid: true, sanitizedValue: trimmedName };
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove potential XSS patterns
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

/**
 * Cloud Function to create a new manager user
 * This function will be called when an owner adds a manager
 */
exports.createManagerUser = functions.https.onCall(async (data, context) => {
  // Check if the request is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify the calling user is an owner
  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore()
    .collection('users')
    .doc(callerUid)
    .get();

  if (!callerDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Caller user not found');
  }

  const callerData = callerDoc.data();
  const restaurantId = callerData.restaurantId;

  // Verify caller is owner of the restaurant
  const callerProfileDoc = await admin.firestore()
    .collection('restaurantProfile')
    .doc(restaurantId)
    .collection('users')
    .doc(callerUid)
    .get();

  if (!callerProfileDoc.exists || callerProfileDoc.data().role !== 'owner') {
    throw new functions.https.HttpsError('permission-denied', 'Only restaurant owners can add managers');
  }

  const { email, password, displayName } = data;

  // Validate and sanitize input data
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', emailValidation.error);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', passwordValidation.error);
  }

  const displayNameValidation = validateDisplayName(displayName);
  if (!displayNameValidation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', displayNameValidation.error);
  }

  // Use sanitized values
  const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
  const sanitizedDisplayName = displayNameValidation.sanitizedValue;

  // Check current manager count limit (maximum 2 managers)
  const existingManagersQuery = await admin.firestore()
    .collection('restaurantProfile')
    .doc(restaurantId)
    .collection('users')
    .where('role', '==', 'manager')
    .where('isActive', '==', true)
    .get();

  if (existingManagersQuery.size >= 2) {
    throw new functions.https.HttpsError('resource-exhausted', 'Maximum limit of 2 managers reached. Please remove an existing manager before adding a new one.');
  }

  try {
    // 1. Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: sanitizedEmail,
      password: password, // Password is validated but not sanitized to preserve intended characters
      displayName: sanitizedDisplayName,
      emailVerified: false,
    });

    // 2. Create user document in root users collection
    await admin.firestore()
      .collection('users')
      .doc(userRecord.uid)
      .set({
        restaurantId: restaurantId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: callerUid
      });

    // 3. Create user profile in restaurant users subcollection
    await admin.firestore()
      .collection('restaurantProfile')
      .doc(restaurantId)
      .collection('users')
      .doc(userRecord.uid)
      .set({
        email: sanitizedEmail,
        displayName: sanitizedDisplayName,
        role: 'manager',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        createdBy: callerUid,
        uid: userRecord.uid
      });

    // 4. Log security event
    console.log('Manager user created successfully', {
      newUserId: userRecord.uid,
      email: sanitizedEmail,
      createdBy: callerUid,
      restaurantId: restaurantId,
      timestamp: new Date().toISOString()
    });

    // 5. Send welcome email (optional - you can enable this later)
    // await sendWelcomeEmail(sanitizedEmail, sanitizedDisplayName, password);

    return {
      success: true,
      userId: userRecord.uid,
      message: `Manager ${sanitizedDisplayName} created successfully`
    };

  } catch (error) {
    console.error('Error creating manager user:', error);
    
    // If Firebase Auth user was created but Firestore failed, clean up
    if (error.code && error.code.includes('firestore')) {
      try {
        await admin.auth().deleteUser(userRecord?.uid);
      } catch (cleanupError) {
        console.error('Error cleaning up Auth user:', cleanupError);
      }
    }
    
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'A user with this email already exists');
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to create manager user');
  }
});

/**
 * Cloud Function to deactivate/reactivate a manager user
 */
exports.toggleManagerStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = context.auth.uid;
  const { userId, isActive } = data;

  // Verify caller is owner
  const callerDoc = await admin.firestore()
    .collection('users')
    .doc(callerUid)
    .get();

  if (!callerDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Caller user not found');
  }

  const restaurantId = callerDoc.data().restaurantId;

  // If activating a manager, check the limit (maximum 2 active managers)
  if (isActive) {
    const existingActiveManagersQuery = await admin.firestore()
      .collection('restaurantProfile')
      .doc(restaurantId)
      .collection('users')
      .where('role', '==', 'manager')
      .where('isActive', '==', true)
      .get();

    if (existingActiveManagersQuery.size >= 2) {
      throw new functions.https.HttpsError('resource-exhausted', 'Maximum limit of 2 active managers reached. Please deactivate an existing manager before activating this one.');
    }
  }

  try {
    // Update Firebase Auth user status
    await admin.auth().updateUser(userId, {
      disabled: !isActive
    });

    // Update Firestore user profile
    await admin.firestore()
      .collection('restaurantProfile')
      .doc(restaurantId)
      .collection('users')
      .doc(userId)
      .update({
        isActive: isActive,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: callerUid
      });

    return {
      success: true,
      message: `Manager ${isActive ? 'activated' : 'deactivated'} successfully`
    };

  } catch (error) {
    console.error('Error toggling manager status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update manager status');
  }
});

/**
 * Cloud Function to remove a manager user
 */
exports.removeManagerUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = context.auth.uid;
  const { userId } = data;

  // Verify caller is owner
  const callerDoc = await admin.firestore()
    .collection('users')
    .doc(callerUid)
    .get();

  if (!callerDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Caller user not found');
  }

  const restaurantId = callerDoc.data().restaurantId;

  try {
    // 1. Delete Firebase Auth user
    await admin.auth().deleteUser(userId);

    // 2. Delete user from root users collection
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .delete();

    // 3. Delete user profile from restaurant users subcollection
    await admin.firestore()
      .collection('restaurantProfile')
      .doc(restaurantId)
      .collection('users')
      .doc(userId)
      .delete();

    return {
      success: true,
      message: 'Manager removed successfully'
    };

  } catch (error) {
    console.error('Error removing manager user:', error);
    throw new functions.https.HttpsError('internal', 'Failed to remove manager user');
  }
});

// Optional: Send welcome email function
async function sendWelcomeEmail(email, displayName, password) {
  // You can integrate with SendGrid, NodeMailer, or any email service
  // This is just a placeholder
  console.log(`Welcome email would be sent to ${email} for ${displayName}`);
}

// Export backup functions
exports.monthlyBackup = backup.monthlyBackup;
exports.triggerBackup = backup.triggerBackup; 