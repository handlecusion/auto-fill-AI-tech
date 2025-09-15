#!/usr/bin/env node

// Required parameters:
// @raycast.schemaVersion 1
// @raycast.title Copy Latest OTP from Messages
// @raycast.mode compact
// @raycast.packageName NaverAutoFill

// Optional parameters:
// @raycast.icon ✉️
// @raycast.description Find the most recent OTP code in Messages and copy to clipboard

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Messages DB 경로
const MESSAGES_DB = path.join(os.homedir(), 'Library/Messages/chat.db');

async function getLatestOTP(digitLength = 6) {
  try {
    if (!fs.existsSync(MESSAGES_DB)) {
      throw new Error('Messages DB not found');
    }

    // 최근 메시지 200개에서 OTP 코드 찾기 (더 많은 메시지 검색)
    const query = `SELECT text FROM message WHERE text IS NOT NULL AND length(text) > 0 ORDER BY date DESC LIMIT 200;`;
    const result = execSync(`sqlite3 "${MESSAGES_DB}" "${query}"`, { encoding: 'utf8' });
    
    const lines = result.split('\n').filter(line => line.trim());
    
    // 지정된 자릿수의 숫자 패턴 찾기
    const digitPattern = new RegExp(`\\\\b[0-9]{${digitLength}}\\\\b`);
    
    for (const line of lines) {
      const match = line.match(digitPattern);
      if (match) {
        return match[0];
      }
    }
    
    // 하이픈/공백 포함 패턴도 시도
    const spaceHyphenPattern = new RegExp(`\\\\b[0-9][0-9 -]{${digitLength-2},}[0-9]\\\\b`);
    for (const line of lines) {
      const match = line.match(spaceHyphenPattern);
      if (match) {
        const normalized = match[0].replace(/[ -]/g, '');
        if (new RegExp(`^[0-9]{${digitLength}}$`).test(normalized)) {
          return normalized;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting OTP:', error.message);
    return null;
  }
}

async function main() {
  try {
    // 명령줄 인자에서 자릿수 가져오기 (기본값: 6)
    const args = process.argv.slice(2);
    let digitLength = 6;
    
    if (args.length > 0) {
      const parsed = parseInt(args[0]);
      if (!isNaN(parsed) && parsed >= 4 && parsed <= 8) {
        digitLength = parsed;
      }
    }
    
    console.log(`🔍 Searching for ${digitLength}-digit OTP in Messages...`);
    
    const otpCode = await getLatestOTP(digitLength);
    
    if (otpCode) {
      // 클립보드에 복사
      execSync(`echo -n "${otpCode}" | pbcopy`);
      console.log(`✅ Copied OTP: ${otpCode}`);
      console.log('📋 OTP code has been copied to clipboard');
    } else {
      console.log(`❌ No ${digitLength}-digit OTP code found in recent messages`);
      console.log('💡 Make sure you have received an OTP via Messages');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
