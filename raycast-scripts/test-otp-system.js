#!/usr/bin/env node

// Test script to check Messages DB access and OTP detection

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const MESSAGES_DB = path.join(os.homedir(), 'Library/Messages/chat.db');

async function testMessagesAccess() {
  console.log('🔍 Testing Messages DB access...');
  
  if (!fs.existsSync(MESSAGES_DB)) {
    console.log('❌ Messages DB not found at:', MESSAGES_DB);
    return false;
  }
  
  console.log('✅ Messages DB found');
  
  try {
    // 간단한 쿼리로 접근 테스트
    const result = execSync(`sqlite3 "${MESSAGES_DB}" "SELECT COUNT(*) FROM message LIMIT 1;"`, { 
      encoding: 'utf8',
      timeout: 5000
    });
    
    console.log('✅ Messages DB access successful');
    console.log(`📊 Total messages count: ${result.trim()}`);
    return true;
  } catch (error) {
    console.log('❌ Messages DB access failed:', error.message);
    console.log('💡 You may need to grant Full Disk Access to Terminal/Raycast');
    return false;
  }
}

async function testOTPDetection() {
  console.log('\n🔍 Testing OTP detection...');
  
  try {
    // 최근 10개 메시지 가져오기
    const query = `SELECT text FROM message WHERE text IS NOT NULL ORDER BY date DESC LIMIT 10;`;
    const result = execSync(`sqlite3 "${MESSAGES_DB}" "${query}"`, { encoding: 'utf8' });
    
    const lines = result.split('\n').filter(line => line.trim());
    console.log(`📱 Recent ${lines.length} messages:`);
    
    lines.forEach((line, index) => {
      const truncated = line.length > 50 ? line.substring(0, 50) + '...' : line;
      console.log(`  ${index + 1}: ${truncated}`);
      
      // OTP 패턴 찾기
      const otpMatch = line.match(/\b[0-9]{6}\b/);
      if (otpMatch) {
        console.log(`    🔐 Found OTP: ${otpMatch[0]}`);
      }
    });
    
    return true;
  } catch (error) {
    console.log('❌ OTP detection test failed:', error.message);
    return false;
  }
}

async function testClipboard() {
  console.log('\n🔍 Testing clipboard access...');
  
  try {
    // 현재 클립보드 내용 확인
    const clipboardContent = execSync('pbpaste', { encoding: 'utf8' });
    console.log('✅ Clipboard access successful');
    console.log(`📋 Current clipboard: "${clipboardContent.substring(0, 50)}${clipboardContent.length > 50 ? '...' : ''}"`);
    
    // OTP 패턴 확인
    const otpMatch = clipboardContent.match(/\b[0-9]{6}\b/);
    if (otpMatch) {
      console.log(`🔐 Found OTP in clipboard: ${otpMatch[0]}`);
    } else {
      console.log('ℹ️  No OTP pattern found in clipboard');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Clipboard access failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 OTP System Test\n');
  
  const messagesOk = await testMessagesAccess();
  const otpOk = messagesOk ? await testOTPDetection() : false;
  const clipboardOk = await testClipboard();
  
  console.log('\n📊 Test Results:');
  console.log(`  Messages DB Access: ${messagesOk ? '✅' : '❌'}`);
  console.log(`  OTP Detection: ${otpOk ? '✅' : '❌'}`);
  console.log(`  Clipboard Access: ${clipboardOk ? '✅' : '❌'}`);
  
  if (messagesOk && clipboardOk) {
    console.log('\n🎉 All tests passed! OTP auto-fill should work correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the error messages above.');
    if (!messagesOk) {
      console.log('💡 For Messages DB access issues:');
      console.log('   1. Go to System Preferences > Privacy & Security > Full Disk Access');
      console.log('   2. Add Terminal and/or Raycast to the list');
      console.log('   3. Restart Terminal/Raycast');
    }
  }
}

main();
