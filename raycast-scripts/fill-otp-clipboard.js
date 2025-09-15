#!/usr/bin/env node

// Required parameters:
// @raycast.schemaVersion 1
// @raycast.title Fill OTP from Clipboard
// @raycast.mode compact
// @raycast.packageName NaverAutoFill

// Optional parameters:
// @raycast.icon 📋
// @raycast.description Auto-fill OTP code from clipboard to Naver forms

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function getClipboardOTP() {
  try {
    const clipboardContent = execSync('pbpaste', { encoding: 'utf8' }).trim();
    
    // 6자리 숫자 패턴 찾기
    const regex = /\b[0-9]{6}\b/;
    const match = clipboardContent.match(regex);
    
    if (match) {
      return match[0];
    }
    
    // 하이픈/공백 포함 패턴도 시도
    const spaceHyphenRegex = /\b[0-9][0-9 -]{4,}[0-9]\b/;
    const spaceMatch = clipboardContent.match(spaceHyphenRegex);
    if (spaceMatch) {
      const normalized = spaceMatch[0].replace(/[ -]/g, '');
      if (/^[0-9]{6}$/.test(normalized)) {
        return normalized;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting clipboard content:', error.message);
    return null;
  }
}

async function injectOTPToPage(otpCode) {
  const injectionJs = `
    (function() {
      try {
        console.log("Auto-filling OTP from clipboard:", "${otpCode}");
        
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
          // 기존 값 클리어
          otpField.value = '';
          
          // 포커스 설정
          otpField.focus();
          
          // OTP 코드 입력
          otpField.value = "${otpCode}";
          
          // 입력 이벤트 발생시키기
          otpField.dispatchEvent(new Event('input', { bubbles: true }));
          otpField.dispatchEvent(new Event('change', { bubbles: true }));
          otpField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
          
          // 잠시 후 다음 버튼 찾아서 클릭
          setTimeout(() => {
            const nextButtonSelectors = [
              'button[type="submit"]',
              'input[type="submit"]',
              'button[class*="next"]',
              'button[class*="submit"]',
              'button[id*="next"]',
              'button[id*="submit"]'
            ];
            
            // 텍스트로 버튼 찾기
            const buttonTexts = ['다음', '확인', '인증', '완료', '제출', 'Next', 'Submit', 'Confirm'];
            const allButtons = document.querySelectorAll('button, input[type="submit"], a[role="button"]');
            
            let nextButton = null;
            
            // 일반 선택자로 찾기
            for (const selector of nextButtonSelectors) {
              const btn = document.querySelector(selector);
              if (btn && btn.offsetParent !== null && !btn.disabled) {
                nextButton = btn;
                break;
              }
            }
            
            // 텍스트로 찾기
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
              // 엔터키 시도
              otpField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
              otpField.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
              console.log("Next button not found, tried Enter key");
            }
          }, 300);
          
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
  const tempJsFile = path.join(__dirname, '.temp_clipboard_otp.js');
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
    const tempScriptFile = path.join(__dirname, '.temp_clipboard_script.applescript');
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

async function main() {
  try {
    console.log('📋 Checking clipboard for OTP code...');
    
    const otpCode = await getClipboardOTP();
    
    if (!otpCode) {
      console.log('❌ No valid 6-digit OTP code found in clipboard');
      console.log('💡 Copy an OTP code to clipboard first, then run this command');
      return;
    }
    
    console.log(`🔐 Found OTP code: ${otpCode}`);
    console.log('🚀 Auto-filling to nid.naver.com...');
    
    const result = await injectOTPToPage(otpCode);
    
    if (result === 'success') {
      console.log('✅ OTP auto-filled successfully!');
    } else if (result === 'not_found') {
      console.log('❌ No nid.naver.com tab found. Please open the page first');
    } else if (result === 'field_not_found') {
      console.log('⚠️ OTP input field not found on the page');
      console.log('💡 Make sure you are on the OTP input page');
    } else {
      console.log('❌ Failed to inject OTP');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
