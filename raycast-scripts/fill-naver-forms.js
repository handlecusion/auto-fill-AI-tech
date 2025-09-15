#!/usr/bin/env node

// Required parameters:
// @raycast.schemaVersion 1
// @raycast.title Fill Naver Forms
// @raycast.mode compact
// @raycast.packageName NaverAutoFill

// Optional parameters:
// @raycast.icon 🚀
// @raycast.description Auto-fill Naver identity verification forms

const { execSync } = require('child_process');
const path = require('path');

async function main() {
  try {
    console.log('🚀 Triggering auto-fill process...');
    
    // Simple trigger - just inject a trigger signal
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
          
          console.log("Raycast: Trigger sent successfully");
        } catch (e) {
          console.error("Raycast injection error:", e);
        }
      })();
    `;
    
    // Create temp JS file for injection
    const tempJsFile = path.join(__dirname, '.temp_trigger.js');
    require('fs').writeFileSync(tempJsFile, injectionJs, 'utf8');
    
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
      // Write AppleScript to temp file
      const tempScriptFile = path.join(__dirname, '.temp_script.applescript');
      require('fs').writeFileSync(tempScriptFile, appleScript, 'utf8');
      
      const result = execSync(`osascript "${tempScriptFile}"`, { 
        encoding: 'utf8',
        timeout: 10000 
      }).trim();
      
      // Clean up temp files
      require('fs').unlinkSync(tempScriptFile);
      require('fs').unlinkSync(tempJsFile);
      
      if (result === 'not_found') {
        console.log('❌ No nid.naver.com tab found. Please open nid.naver.com in Chrome first');
      } else if (result === 'success') {
        console.log('✅ Auto-fill trigger sent successfully');
        console.log('💡 Profile data will be loaded from the Chrome extension');
      } else {
        console.log('⚠️ Unexpected result:', result);
      }
    } catch (error) {
      console.log('❌ Failed to communicate with Chrome. Make sure Chrome is open and you have a nid.naver.com tab');
      console.log('Error details:', error.message);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
