import 'dotenv/config'; // Load env vars
import { FCMService } from './src/services/fcmService.js';

const testUserId = process.argv[2];

if (!testUserId) {
  console.log("❌ Please provide a user ID to test.");
  console.log("Usage: node test_fcm.js <uuid>");
  process.exit(1);
}

const runTest = async () => {
  try {
    console.log(`Sending test push notification to user: ${testUserId}`);
    
    await FCMService.sendToUsers(
      [testUserId], 
      "🚀 Test Notification", 
      "If you are seeing this, FCM is perfectly configured!",
      { 
        testMode: "true",
        timeSent: new Date().toISOString() 
      }
    );
    
    console.log("✅ Push notification fired successfully. Check your device/browser!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error sending push:", err);
    process.exit(1);
  }
};

runTest();
