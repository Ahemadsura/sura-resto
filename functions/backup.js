const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

// Initialize services
const storage = new Storage();
const BACKUP_BUCKET = 'sura-resto-backups'; // You'll need to create this bucket

/**
 * Monthly automated backup function
 * Runs on the 1st of every month at 2:00 AM
 */
exports.monthlyBackup = functions.pubsub
  .schedule('0 2 1 * *') // Cron: 2 AM on 1st of every month
  .timeZone('Asia/Kolkata') // Adjust to your timezone
  .onRun(async (context) => {
    console.log('🔄 Starting monthly backup process...');
    
    try {
      // Get all restaurants
      const restaurantsSnapshot = await admin.firestore()
        .collection('restaurantProfile')
        .get();

      const backupResults = [];

      for (const restaurantDoc of restaurantsSnapshot.docs) {
        const restaurantId = restaurantDoc.id;
        const restaurantData = restaurantDoc.data();
        
        console.log(`📦 Creating backup for restaurant: ${restaurantId}`);
        
        try {
          // Create backup for this restaurant
          const backupResult = await createRestaurantBackup(restaurantId, restaurantData);
          backupResults.push(backupResult);
          
          // Send backup notification email to owner
          await sendBackupNotificationEmail(restaurantId, restaurantData, backupResult);
          
        } catch (error) {
          console.error(`❌ Backup failed for restaurant ${restaurantId}:`, error);
          backupResults.push({
            restaurantId,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log('✅ Monthly backup process completed');
      console.log('📊 Backup summary:', backupResults);
      
      return { success: true, results: backupResults };
      
    } catch (error) {
      console.error('💥 Monthly backup process failed:', error);
      throw error;
    }
  });

/**
 * Create backup for a specific restaurant
 */
async function createRestaurantBackup(restaurantId, restaurantData) {
  const timestamp = new Date();
  const monthYear = timestamp.toISOString().substr(0, 7); // YYYY-MM format
  const backupDate = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  console.log(`📋 Collecting data for restaurant ${restaurantId}...`);
  
  // Collect all restaurant data
  const backupData = {
    restaurantInfo: {
      id: restaurantId,
      ...restaurantData,
      backupDate: timestamp.toISOString(),
      backupType: 'monthly_automated'
    },
    collections: {}
  };

  // Define collections to backup
  const collectionsToBackup = ['bills', 'menuItems', 'users', 'staff', 'expenses'];
  
  for (const collectionName of collectionsToBackup) {
    try {
      const collectionSnapshot = await admin.firestore()
        .collection('restaurantProfile')
        .doc(restaurantId)
        .collection(collectionName)
        .get();
      
      backupData.collections[collectionName] = collectionSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`  ✅ Backed up ${collectionName}: ${collectionSnapshot.size} documents`);
      
    } catch (error) {
      console.error(`  ❌ Failed to backup ${collectionName}:`, error);
      backupData.collections[collectionName] = { error: error.message };
    }
  }

  // Generate backup statistics
  const stats = generateBackupStats(backupData);
  backupData.backupStats = stats;

  // Save backup to Cloud Storage
  const fileName = `${restaurantId}/${monthYear}/backup_${backupDate}.json`;
  const file = storage.bucket(BACKUP_BUCKET).file(fileName);
  
  await file.save(JSON.stringify(backupData, null, 2), {
    metadata: {
      contentType: 'application/json',
      metadata: {
        restaurantId: restaurantId,
        backupDate: backupDate,
        backupType: 'monthly_automated'
      }
    }
  });

  console.log(`💾 Backup saved to: gs://${BACKUP_BUCKET}/${fileName}`);

  return {
    restaurantId,
    success: true,
    fileName,
    stats,
    timestamp: timestamp.toISOString()
  };
}

/**
 * Generate backup statistics
 */
function generateBackupStats(backupData) {
  const stats = {
    totalCollections: Object.keys(backupData.collections).length,
    documentCounts: {},
    totalDocuments: 0,
    backupSize: JSON.stringify(backupData).length,
    monthlyData: {}
  };

  // Count documents per collection
  for (const [collectionName, documents] of Object.entries(backupData.collections)) {
    if (Array.isArray(documents)) {
      stats.documentCounts[collectionName] = documents.length;
      stats.totalDocuments += documents.length;
      
      // Calculate monthly statistics for bills
      if (collectionName === 'bills') {
        stats.monthlyData = calculateMonthlyBillStats(documents);
      }
    }
  }

  return stats;
}

/**
 * Calculate monthly bill statistics
 */
function calculateMonthlyBillStats(bills) {
  const currentMonth = new Date().toISOString().substr(0, 7);
  const monthlyBills = bills.filter(bill => {
    if (bill.createdAt && bill.createdAt.seconds) {
      const billDate = new Date(bill.createdAt.seconds * 1000).toISOString().substr(0, 7);
      return billDate === currentMonth;
    }
    return false;
  });

  const totalRevenue = monthlyBills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
  
  return {
    totalBills: monthlyBills.length,
    totalRevenue: totalRevenue,
    averageBillValue: monthlyBills.length > 0 ? totalRevenue / monthlyBills.length : 0,
    period: currentMonth
  };
}

/**
 * Send backup notification email to restaurant owner
 */
async function sendBackupNotificationEmail(restaurantId, restaurantData, backupResult) {
  try {
    // Get owner email from users collection
    const usersSnapshot = await admin.firestore()
      .collection('restaurantProfile')
      .doc(restaurantId)
      .collection('users')
      .where('role', '==', 'owner')
      .get();

    if (usersSnapshot.empty) {
      console.warn(`⚠️ No owner found for restaurant ${restaurantId}`);
      return;
    }

    const ownerData = usersSnapshot.docs[0].data();
    const ownerEmail = ownerData.email;

    if (!ownerEmail) {
      console.warn(`⚠️ No email found for owner of restaurant ${restaurantId}`);
      return;
    }

    // Create email content
    const emailContent = createBackupEmailContent(restaurantData, backupResult);
    
    // Send email using your preferred email service
    // For now, we'll log it (you can integrate with SendGrid, Nodemailer, etc.)
    console.log(`📧 Backup email prepared for ${ownerEmail}:`);
    console.log('Subject:', emailContent.subject);
    console.log('Content preview:', emailContent.text.substring(0, 200) + '...');

    // TODO: Integrate with actual email service
    // await sendEmail(ownerEmail, emailContent.subject, emailContent.html);

  } catch (error) {
    console.error(`❌ Failed to send backup email for restaurant ${restaurantId}:`, error);
  }
}

/**
 * Create email content for backup notification
 */
function createBackupEmailContent(restaurantData, backupResult) {
  const restaurantName = restaurantData.name || 'Your Restaurant';
  const backupDate = new Date(backupResult.timestamp).toLocaleDateString('en-IN');
  const stats = backupResult.stats;

  const subject = `📦 Monthly Backup Complete - ${restaurantName} (${backupDate})`;
  
  const text = `
Dear Restaurant Owner,

Your monthly data backup has been completed successfully!

Restaurant: ${restaurantName}
Backup Date: ${backupDate}
Backup File: ${backupResult.fileName}

📊 Backup Summary:
- Total Documents: ${stats.totalDocuments}
- Bills: ${stats.documentCounts.bills || 0}
- Menu Items: ${stats.documentCounts.menuItems || 0}
- Staff Records: ${stats.documentCounts.staff || 0}
- Users: ${stats.documentCounts.users || 0}
- Expenses: ${stats.documentCounts.expenses || 0}

${stats.monthlyData ? `
💰 This Month's Performance:
- Total Bills: ${stats.monthlyData.totalBills}
- Total Revenue: ₹${stats.monthlyData.totalRevenue.toLocaleString('en-IN')}
- Average Bill Value: ₹${stats.monthlyData.averageBillValue.toFixed(2)}
` : ''}

Your data is safely stored and can be restored if needed. This backup includes all your:
✅ Sales records and bills
✅ Menu items and pricing
✅ Staff information
✅ User accounts
✅ Expense records

If you need access to your backup data or have any questions, please contact our support team.

Best regards,
SURA Restaurant Management Team

---
This is an automated message. Your data security is our priority.
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">📦 Monthly Backup Complete</h1>
        <p style="color: white; opacity: 0.9; margin: 5px 0 0 0;">${restaurantName}</p>
      </div>
      
      <div style="padding: 30px; background: white;">
        <p>Dear Restaurant Owner,</p>
        <p>Your monthly data backup has been completed successfully!</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📊 Backup Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td><strong>Restaurant:</strong></td><td>${restaurantName}</td></tr>
            <tr><td><strong>Backup Date:</strong></td><td>${backupDate}</td></tr>
            <tr><td><strong>Total Documents:</strong></td><td>${stats.totalDocuments}</td></tr>
          </table>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📋 Data Breakdown</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Bills: ${stats.documentCounts.bills || 0}</li>
            <li>Menu Items: ${stats.documentCounts.menuItems || 0}</li>
            <li>Staff Records: ${stats.documentCounts.staff || 0}</li>
            <li>User Accounts: ${stats.documentCounts.users || 0}</li>
            <li>Expense Records: ${stats.documentCounts.expenses || 0}</li>
          </ul>
        </div>
        
        ${stats.monthlyData ? `
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">💰 This Month's Performance</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td><strong>Total Bills:</strong></td><td>${stats.monthlyData.totalBills}</td></tr>
            <tr><td><strong>Total Revenue:</strong></td><td>₹${stats.monthlyData.totalRevenue.toLocaleString('en-IN')}</td></tr>
            <tr><td><strong>Average Bill:</strong></td><td>₹${stats.monthlyData.averageBillValue.toFixed(2)}</td></tr>
          </table>
        </div>
        ` : ''}
        
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #155724;">✅ Your Data is Safe</h3>
          <p style="margin: 0; color: #155724;">This backup includes all your important business data and can be restored if needed. Your data security is our priority.</p>
        </div>
        
        <p>If you need access to your backup data or have any questions, please contact our support team.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>SURA Restaurant Management Team</strong>
          </p>
          <p style="color: #999; font-size: 12px;">This is an automated message.</p>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Manual backup trigger (for testing or on-demand backups)
 */
exports.triggerBackup = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated and is an owner
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = context.auth.uid;
  const { restaurantId } = data;

  if (!restaurantId) {
    throw new functions.https.HttpsError('invalid-argument', 'Restaurant ID is required');
  }

  try {
    // Verify caller is owner of this restaurant
    const callerDoc = await admin.firestore()
      .collection('restaurantProfile')
      .doc(restaurantId)
      .collection('users')
      .doc(callerUid)
      .get();

    if (!callerDoc.exists || callerDoc.data().role !== 'owner') {
      throw new functions.https.HttpsError('permission-denied', 'Only restaurant owners can trigger backups');
    }

    // Get restaurant data
    const restaurantDoc = await admin.firestore()
      .collection('restaurantProfile')
      .doc(restaurantId)
      .get();

    if (!restaurantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Restaurant not found');
    }

    // Create backup
    const backupResult = await createRestaurantBackup(restaurantId, restaurantDoc.data());
    
    // Send notification email
    await sendBackupNotificationEmail(restaurantId, restaurantDoc.data(), backupResult);

    return {
      success: true,
      message: 'Manual backup completed successfully',
      backupResult
    };

  } catch (error) {
    console.error('Manual backup failed:', error);
    throw new functions.https.HttpsError('internal', 'Backup failed: ' + error.message);
  }
}); 