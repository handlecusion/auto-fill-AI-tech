#!/usr/bin/env node

// Required parameters:
// @raycast.schemaVersion 1
// @raycast.title Auto Fill OTP from Messages
// @raycast.mode silent
// @raycast.packageName NaverAutoFill

// Optional parameters:
// @raycast.icon 🔐
// @raycast.description Monitor Messages DB for new OTP and auto-fill to Naver forms

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Messages DB 경로
const MESSAGES_DB = path.join(os.homedir(), 'Library/Messages/chat.db');

async function getLatestOTP() {
  try {
    if (!fs.existsSync(MESSAGES_DB)) {
      throw new Error('Messages DB not found');
    }

    // 최근 메시지 150개에서 6자리 OTP 코드 찾기
    const query = `SELECT text FROM message WHERE text IS NOT NULL ORDER BY date DESC LIMIT 150;`;
    const result = execSync(`sqlite3 "${MESSAGES_DB}" "${query}"`, { encoding: 'utf8' });
    
    // 6자리 숫자 패턴 찾기
    const regex = /\b[0-9]{6}\b/;
    const lines = result.split('\n');
    
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        return match[0];
      }
    }
    
    // 하이픈/공백 포함 패턴도 시도
    const spaceHyphenRegex = /\b[0-9][0-9 -]{4,}[0-9]\b/;
    for (const line of lines) {
      const match = line.match(spaceHyphenRegex);
      if (match) {
        const normalized = match[0].replace(/[ -]/g, '');
        if (/^[0-9]{6}$/.test(normalized)) {
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

async function injectOTPToPage(otpCode) {
  const injectionJs = `
    (function() {
      try {
        console.log("Auto-filling OTP:", "${otpCode}");
        
        // OTP 입력 필드 찾기 (다양한 선택자 시도)
        const otpSelectors = [
          'input[type="text"][name*="auth"]',
          'input[type="text"][id*="auth"]',
          'input[type="text"][class*="auth"]',
          'input[type="text"][placeholder*="인증"]',
          'input[type="text"][placeholder*="코드"]',
          'input[type="tel"][name*="auth"]',
          'input[type="tel"][id*="auth"]',
          'input[type="number"][name*="auth"]',
          'input[type="number"][id*="auth"]',
          'input[maxlength="6"]',
          'input[data-testid*="auth"]',
          'input[data-cy*="auth"]'
        ];
        
        let otpField = null;
        
        for (const selector of otpSelectors) {
          const fields = document.querySelectorAll(selector);
          for (const field of fields) {
            if (field.offsetParent !== null && !field.disabled && !field.readOnly) {
              otpField = field;
              break;
            }
          }
          if (otpField) break;
        }
        
        if (!otpField) {
          // 모든 텍스트 입력 필드 중에서 현재 포커스된 것이나 비어있는 것 찾기
          const allInputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="number"]');
          for (const input of allInputs) {
            if (input.offsetParent !== null && !input.disabled && !input.readOnly) {
              if (document.activeElement === input || input.value.trim() === '') {
                otpField = input;
                break;
              }
            }
          }
        }
        
        if (otpField) {
          // 기존 값 클리어
          otpField.value = '';
          
          // 포커스 설정
          otpField.focus();
          
          // OTP 코드 입력 (한 글자씩 천천히)
          let index = 0;
          const typeChar = () => {
            if (index < "${otpCode}".length) {
              otpField.value += "${otpCode}"[index];
              
              // 입력 이벤트 발생시키기
              otpField.dispatchEvent(new Event('input', { bubbles: true }));
              otpField.dispatchEvent(new Event('change', { bubbles: true }));
              
              index++;
              setTimeout(typeChar, 100); // 100ms 간격으로 입력
            } else {
              // 모든 입력 완료 후 다음 버튼 찾아서 클릭
              setTimeout(() => {
                const nextButtonSelectors = [
                  'button[type="submit"]',
                  'input[type="submit"]',
                  'button:contains("다음")',
                  'button:contains("확인")',
                  'button:contains("인증")',
                  'button[class*="next"]',
                  'button[class*="submit"]',
                  'button[id*="next"]',
                  'button[id*="submit"]',
                  'a[role="button"]:contains("다음")',
                  '.btn:contains("다음")',
                  '.button:contains("다음")'
                ];
                
                let nextButton = null;
                
                for (const selector of nextButtonSelectors) {
                  if (selector.includes(':contains')) {
                    // jQuery 스타일 선택자를 일반 선택자로 변환
                    const baseSelector = selector.split(':contains')[0];
                    const text = selector.match(/\\(["'](.+?)["']\\)/)?.[1];
                    const buttons = document.querySelectorAll(baseSelector);
                    
                    for (const btn of buttons) {
                      if (btn.textContent.includes(text) && 
                          btn.offsetParent !== null && 
                          !btn.disabled) {
                        nextButton = btn;
                        break;
                      }
                    }
                  } else {
                    const btn = document.querySelector(selector);
                    if (btn && btn.offsetParent !== null && !btn.disabled) {
                      nextButton = btn;
                      break;
                    }
                  }
                  if (nextButton) break;
                }
                
                if (nextButton) {
                  console.log("Clicking next button:", nextButton);
                  nextButton.click();
                } else {
                  // 엔터키 시도
                  otpField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13 }));
                  console.log("Next button not found, tried Enter key");
                }
              }, 500);
            }
          };
          
          typeChar();
          console.log("OTP auto-fill completed");
          return "success";
        } else {
          console.log("OTP input field not found");
          return "field_not_found";
        }
      } catch (e) {
        console.error("OTP injection error:", e);
        return "error";
      }
    })();
  `;

  // Create temp JS file for injection
  const tempJsFile = path.join(__dirname, '.temp_otp_inject.js');
  fs.writeFileSync(tempJsFile, injectionJs, 'utf8');

  // Create AppleScript to inject OTP
  const appleScriptLines = [
    'tell application "Google Chrome"',
    '  activate',
    '  set found to false',
    '  set windowCount to count of windows',
    '  repeat with i from 1 to windowCount',
    '    set currentWindow to window i',
    '    set tabCount to count of tabs of currentWindow',
    '    repeat with j from 1 to tabCount',
    '      set currentTab to tab j of currentWindow',
    '      if URL of currentTab contains "nid.naver.com" then',
    '        set active tab index of currentWindow to j',
    '        set index of currentWindow to 1',
    '        set jsContent to read POSIX file "' + tempJsFile.replace(/\\/g, '/') + '"',
    '        tell currentTab',
    '          execute javascript jsContent',
    '        end tell',
    '        set found to true',
    '        exit repeat',
    '      end if',
    '    end repeat',
    '    if found then exit repeat',
    '  end repeat',
    '  if found then',
    '    return "success"',
    '  else',
    '    return "not_found"',
    '  end if',
    'end tell'
  ];

  const appleScript = appleScriptLines.join('\n');

  try {
    const tempScriptFile = path.join(__dirname, '.temp_otp_script.applescript');
    fs.writeFileSync(tempScriptFile, appleScript, 'utf8');

    const result = execSync(`osascript "${tempScriptFile}"`, { 
      encoding: 'utf8',
      timeout: 10000 
    }).trim();

    // Clean up temp files
    fs.unlinkSync(tempScriptFile);
    fs.unlinkSync(tempJsFile);

    return result;
  } catch (error) {
    console.error('AppleScript execution failed:', error.message);
    return 'error';
  }
}

async function monitorMessagesForOTP() {
  console.log('🔍 Monitoring Messages DB for new OTP codes...');
  console.log('📱 Please send or receive an OTP code via Messages');
  
  let lastOTP = await getLatestOTP();
  let attempts = 0;
  const maxAttempts = 60; // 5분간 모니터링 (5초 간격)
  
  const monitorInterval = setInterval(async () => {
    attempts++;
    const currentOTP = await getLatestOTP();
    
    if (currentOTP && currentOTP !== lastOTP) {
      console.log(`🔐 New OTP detected: ${currentOTP}`);
      clearInterval(monitorInterval);
      
      // OTP를 페이지에 주입
      const result = await injectOTPToPage(currentOTP);
      
      if (result === 'success') {
        console.log('✅ OTP auto-filled successfully!');
      } else if (result === 'not_found') {
        console.log('❌ No nid.naver.com tab found. Please open the page first');
      } else if (result === 'field_not_found') {
        console.log('⚠️ OTP input field not found on the page');
      } else {
        console.log('❌ Failed to inject OTP');
      }
      
      return;
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(monitorInterval);
      console.log('⏰ Monitoring timeout. No new OTP received in 5 minutes');
      return;
    }
    
    // 진행 상황 표시
    if (attempts % 12 === 0) { // 매 1분마다
      const remaining = Math.ceil((maxAttempts - attempts) / 12);
      console.log(`⏳ Still monitoring... ${remaining} minutes remaining`);
    }
  }, 5000); // 5초마다 체크
}

async function main() {
  try {
    // 즉시 최신 OTP 확인
    const immediateOTP = await getLatestOTP();
    if (immediateOTP) {
      console.log(`🔐 Found recent OTP: ${immediateOTP}`);
      console.log('🚀 Attempting to auto-fill...');
      
      const result = await injectOTPToPage(immediateOTP);
      
      if (result === 'success') {
        console.log('✅ OTP auto-filled successfully!');
        return;
      } else if (result === 'not_found') {
        console.log('❌ No nid.naver.com tab found');
      } else if (result === 'field_not_found') {
        console.log('⚠️ OTP input field not found');
      }
      
      console.log('');
    }
    
    // 새로운 OTP 모니터링 시작
    await monitorMessagesForOTP();
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
