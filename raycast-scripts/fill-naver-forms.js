#!/usr/bin/env node

// Required parameters:
// @raycast.schemaVersion 1
// @raycast.title Fill Naver Forms & OTP
// @raycast.mode compact
// @raycast.packageName NaverAutoFill

// Optional parameters:
// @raycast.icon 🚀
// @raycast.description Auto-fill Naver identity verification forms and OTP

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

async function triggerAutoFill() {
  console.log('🚀 Step 1: Triggering auto-fill process...');
  
  // Enhanced injection JS with OTP monitoring capabilities
  const injectionJs = `
    (function() {
      try {
        console.log("Raycast: Triggering auto-fill...");
        
        // Set trigger flag
        window.naverAutoFillTrigger = true;
        
        // Try different methods to trigger the extension
        if (window.naverAutoFillInstance) {
          window.naverAutoFillInstance.loadProfileAndFill();
        } else if (window.NaverAutoFill) {
          new window.NaverAutoFill().loadProfileAndFill();
        } else {
          window.dispatchEvent(new CustomEvent("naverAutoFillTrigger"));
        }
        
        // OTP 자동 입력을 위한 전역 함수 설정
        window.autoFillOTP = function(otpCode) {
          console.log("Auto-filling OTP:", otpCode);
          
          // OTP 입력 필드 찾기
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
            // 현재 포커스된 입력 필드 확인
            if (document.activeElement && 
                (document.activeElement.tagName === 'INPUT') &&
                ['text', 'tel', 'number'].includes(document.activeElement.type)) {
              otpField = document.activeElement;
            }
          }
          
          if (!otpField) {
            // 모든 텍스트 입력 필드 중에서 비어있는 것 찾기
            const allInputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="number"]');
            for (const input of allInputs) {
              if (input.offsetParent !== null && !input.disabled && !input.readOnly && input.value.trim() === '') {
                otpField = input;
                break;
              }
            }
          }
          
          if (otpField) {
            otpField.value = '';
            otpField.focus();
            
            // OTP 코드 입력 (한 글자씩)
            let index = 0;
            const typeChar = () => {
              if (index < otpCode.length) {
                otpField.value += otpCode[index];
                otpField.dispatchEvent(new Event('input', { bubbles: true }));
                otpField.dispatchEvent(new Event('change', { bubbles: true }));
                index++;
                setTimeout(typeChar, 100);
              } else {
                // 다음 버튼 클릭
                setTimeout(() => {
                  const nextButtonSelectors = [
                    'button[type="submit"]',
                    'input[type="submit"]',
                    'button[class*="next"]',
                    'button[class*="submit"]',
                    'button[id*="next"]',
                    'button[id*="submit"]'
                  ];
                  
                  const buttonTexts = ['다음', '확인', '인증', '완료', '제출'];
                  const allButtons = document.querySelectorAll('button, input[type="submit"], a[role="button"]');
                  
                  let nextButton = null;
                  
                  for (const selector of nextButtonSelectors) {
                    const btn = document.querySelector(selector);
                    if (btn && btn.offsetParent !== null && !btn.disabled) {
                      nextButton = btn;
                      break;
                    }
                  }
                  
                  if (!nextButton) {
                    for (const btn of allButtons) {
                      for (const text of buttonTexts) {
                        if (btn.textContent.includes(text) && 
                            btn.offsetParent !== null && 
                            !btn.disabled) {
                          nextButton = btn;
                          break;
                        }
                      }
                      if (nextButton) break;
                    }
                  }
                  
                  if (nextButton) {
                    console.log("Clicking next button:", nextButton);
                    nextButton.click();
                  } else {
                    otpField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                  }
                }, 500);
              }
            };
            
            typeChar();
            return "success";
          } else {
            console.log("OTP field not found");
            return "field_not_found";
          }
        };
        
        console.log("Raycast: Trigger sent successfully");
        return "success";
      } catch (e) {
        console.error("Raycast injection error:", e);
        return "error";
      }
    })();
  `;
  
  // Create temp JS file for injection
  const tempJsFile = path.join(__dirname, '.temp_trigger.js');
  fs.writeFileSync(tempJsFile, injectionJs, 'utf8');
  
  // Create AppleScript to inject the trigger
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
    const tempScriptFile = path.join(__dirname, '.temp_script.applescript');
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

async function injectOTPToPage(otpCode) {
  const injectionJs = `window.autoFillOTP("${otpCode}");`;
  
  const tempJsFile = path.join(__dirname, '.temp_otp_inject.js');
  fs.writeFileSync(tempJsFile, injectionJs, 'utf8');

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

    fs.unlinkSync(tempScriptFile);
    fs.unlinkSync(tempJsFile);

    return result;
  } catch (error) {
    console.error('OTP injection failed:', error.message);
    return 'error';
  }
}

async function monitorForOTP() {
  console.log('📱 Step 2: Monitoring for OTP messages...');
  console.log('💡 Please request OTP via SMS now');
  
  let lastOTP = await getLatestOTP();
  let attempts = 0;
  const maxAttempts = 120; // 10분간 모니터링 (5초 간격)
  
  return new Promise((resolve) => {
    const monitorInterval = setInterval(async () => {
      attempts++;
      const currentOTP = await getLatestOTP();
      
      if (currentOTP && currentOTP !== lastOTP) {
        console.log(`🔐 New OTP detected: ${currentOTP}`);
        clearInterval(monitorInterval);
        resolve(currentOTP);
        return;
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(monitorInterval);
        console.log('⏰ OTP monitoring timeout (10 minutes)');
        resolve(null);
        return;
      }
      
      // 진행 상황 표시
      if (attempts % 12 === 0) { // 매 1분마다
        const remaining = Math.ceil((maxAttempts - attempts) / 12);
        console.log(`⏳ Still monitoring... ${remaining} minutes remaining`);
      }
    }, 5000); // 5초마다 체크
  });
}

async function main() {
  try {
    console.log('🎯 Naver Auto-Fill Complete Process Starting...\n');
    
    // Step 1: 기본 개인정보 자동완성 트리거
    const fillResult = await triggerAutoFill();
    
    if (fillResult === 'not_found') {
      console.log('❌ No nid.naver.com tab found. Please open nid.naver.com in Chrome first');
      return;
    } else if (fillResult === 'success') {
      console.log('✅ Step 1 Complete: Personal info auto-fill triggered');
    } else {
      console.log('❌ Failed to trigger auto-fill. Please check Chrome connection');
      return;
    }
    
    // 잠시 대기 (폼 작성 완료 시간)
    console.log('⏳ Waiting for form completion...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Messages DB 접근 가능 여부 체크
    let canAccessMessages = false;
    try {
      if (fs.existsSync(MESSAGES_DB)) {
        execSync(`sqlite3 "${MESSAGES_DB}" "SELECT COUNT(*) FROM message LIMIT 1;"`, { 
          encoding: 'utf8', 
          timeout: 3000 
        });
        canAccessMessages = true;
      }
    } catch (error) {
      console.log('⚠️ Messages DB access not available - will use fallback method');
    }
    
    if (canAccessMessages) {
      // Step 2: OTP 모니터링 및 자동 입력
      const otpCode = await monitorForOTP();
      
      if (otpCode) {
        console.log('🚀 Step 3: Auto-filling OTP...');
        const otpResult = await injectOTPToPage(otpCode);
        
        if (otpResult === 'success') {
          console.log('✅ Step 3 Complete: OTP auto-filled successfully!');
          console.log('🎉 All steps completed! Naver verification should be done.');
        } else if (otpResult === 'not_found') {
          console.log('❌ nid.naver.com tab not found for OTP injection');
        } else {
          console.log('❌ Failed to inject OTP. You may need to enter it manually');
        }
      } else {
        console.log('⚠️ No OTP received within timeout period');
        console.log('💡 You can manually enter the OTP or run the OTP-specific script later');
      }
    } else {
      // Fallback: 클립보드 방식 안내
      console.log('\n📋 Fallback Mode: Using clipboard-based OTP');
      console.log('📱 Please follow these steps:');
      console.log('   1. Request OTP via SMS on the naver page');
      console.log('   2. When you receive the OTP message, copy the 6-digit code');
      console.log('   3. Run "Fill OTP from Clipboard" in Raycast');
      console.log('   Or alternatively:');
      console.log('   4. Run "Copy Latest OTP from Messages" first, then "Fill OTP from Clipboard"');
      console.log('\n💡 To enable automatic OTP monitoring:');
      console.log('   • Go to System Preferences > Privacy & Security > Full Disk Access');
      console.log('   • Add Terminal and Raycast to the list');
      console.log('   • Restart the applications');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    // OTP 관련 에러인 경우 대안 제시
    if (error.message.includes('Messages DB')) {
      console.log('\n💡 Messages DB access issue detected:');
      console.log('   1. Go to System Preferences > Privacy & Security > Full Disk Access');
      console.log('   2. Add Terminal and Raycast to the list');
      console.log('   3. Restart the applications');
      console.log('   4. Or use the clipboard-based OTP method instead');
    }
    
    process.exit(1);
  }
}

main();
