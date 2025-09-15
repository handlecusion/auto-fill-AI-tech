// Popup script for Naver ID Auto Fill Extension

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('profileForm');
  const fillBtn = document.getElementById('fillBtn');
  const statusDiv = document.getElementById('status');
  
  // Load saved profile data
  loadProfile();
  
  // Save profile data
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    saveProfile();
  });
  
  // Fill forms on current page
  fillBtn.addEventListener('click', function() {
    fillCurrentPage();
  });
  
  function loadProfile() {
    chrome.runtime.sendMessage({
      action: 'get_profile'
    }, function(response) {
      if (response.profile) {
        const profile = response.profile;
        document.getElementById('name').value = profile.name || '';
        document.getElementById('birthdate').value = profile.birthdate || '';
        document.getElementById('carrier').value = profile.carrier || '';
        document.getElementById('phone').value = profile.phone || '';
        
        if (profile.gender) {
          const genderRadio = document.querySelector(`input[name="gender"][value="${profile.gender}"]`);
          if (genderRadio) genderRadio.checked = true;
        }
        
        if (profile.nationality) {
          const nationalityRadio = document.querySelector(`input[name="nationality"][value="${profile.nationality}"]`);
          if (nationalityRadio) nationalityRadio.checked = true;
        }
      }
    });
  }
  
  function saveProfile() {
    const formData = new FormData(form);
    const profile = {
      name: formData.get('name'),
      birthdate: formData.get('birthdate'),
      gender: formData.get('gender'),
      carrier: formData.get('carrier'),
      nationality: formData.get('nationality'),
      phone: formData.get('phone')
    };
    
    // Validate required fields
    if (!profile.name || !profile.birthdate || !profile.gender || 
        !profile.carrier || !profile.nationality || !profile.phone) {
      showStatus('모든 필드를 입력해주세요.', 'error');
      return;
    }
    
    // Validate birthdate format
    if (!/^\d{8}$/.test(profile.birthdate)) {
      showStatus('생년월일은 8자리 숫자로 입력해주세요.', 'error');
      return;
    }
    
    // Validate phone number format
    if (!/^\d{10,11}$/.test(profile.phone.replace(/-/g, ''))) {
      showStatus('올바른 전화번호를 입력해주세요.', 'error');
      return;
    }
    
    chrome.runtime.sendMessage({
      action: 'save_profile',
      profile: profile
    }, function(response) {
      if (response.success) {
        showStatus('프로필이 저장되었습니다.', 'success');
      } else {
        showStatus('저장 중 오류가 발생했습니다.', 'error');
      }
    });
  }
  
  function fillCurrentPage() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      
      if (!currentTab.url.includes('nid.naver.com')) {
        showStatus('네이버 로그인 페이지에서만 사용할 수 있습니다.', 'error');
        return;
      }
      
      chrome.runtime.sendMessage({
        action: 'get_profile'
      }, function(response) {
        if (!response.profile) {
          showStatus('저장된 프로필이 없습니다. 먼저 정보를 저장해주세요.', 'error');
          return;
        }
        
        chrome.tabs.sendMessage(currentTab.id, {
          action: 'fill_forms',
          data: response.profile
        }, function(response) {
          if (chrome.runtime.lastError) {
            showStatus('페이지와 통신할 수 없습니다. 페이지를 새로고침 해주세요.', 'error');
          } else if (response && response.success) {
            showStatus('자동완성이 완료되었습니다.', 'success');
            window.close();
          } else {
            showStatus('자동완성 중 오류가 발생했습니다.', 'error');
          }
        });
      });
    });
  }
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});
