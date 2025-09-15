// Content script for Naver ID Auto Fill Extension
// Runs on nid.naver.com pages

class NaverAutoFill {
  constructor() {
    this.init();
  }

  init() {
    // Add CSS animations
    this.addCustomStyles();
    
    // Listen for messages from background script or popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'fill_forms') {
        if (request.data) {
          this.fillForms(request.data);
        } else {
          // If no data provided, load from extension's profile
          this.loadProfileAndFill();
        }
        sendResponse({ success: true });
      }
    });

    // Listen for Raycast triggers - now just trigger without data
    window.addEventListener('naverAutoFillTrigger', (event) => {
      console.log('Raycast trigger received');
      this.loadProfileAndFill();
    });

    // Check for Raycast injected data - now just triggers loading from extension
    const checkForRaycastTrigger = () => {
      if (window.naverAutoFillTrigger) {
        console.log('Raycast trigger found');
        this.loadProfileAndFill();
        // Clear the trigger after use
        delete window.naverAutoFillTrigger;
        return true;
      }
      return false;
    };

    // Check immediately and periodically
    if (!checkForRaycastTrigger()) {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (checkForRaycastTrigger() || attempts >= 10) {
          clearInterval(checkInterval);
        }
      }, 200);
    }

    // Add visual indicator when extension is active
    this.addExtensionIndicator();
    
    // Auto-detect form fields and add helper buttons
    this.addAutoFillButtons();
  }

  addCustomStyles() {
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% {
          transform: scale(1);
          box-shadow: 0 3px 15px rgba(3, 199, 90, 0.3);
        }
        50% {
          transform: scale(1.05);
          box-shadow: 0 4px 18px rgba(3, 199, 90, 0.5);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 3px 15px rgba(3, 199, 90, 0.3);
        }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0, -5px, 0);
        }
        70% {
          transform: translate3d(0, -3px, 0);
        }
        90% {
          transform: translate3d(0, -1px, 0);
        }
      }
      
      #naver-autofill-floating-btn:hover {
        animation: bounce 1s ease-in-out;
      }
      
      .naver-autofill-success-ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(40, 167, 69, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      }
      
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  async loadProfileAndFill() {
    try {
      // Load profile from extension's profile.json
      const response = await fetch(chrome.runtime.getURL('profile.json'));
      const profile = await response.json();
      console.log('Loaded profile from extension:', profile);
      this.fillForms(profile);
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to load profile from extension:', error);
      
      // Fallback: try to get profile from storage (set via popup)
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'get_profile'
        }, (response) => {
          if (response && response.profile) {
            console.log('Using profile from storage:', response.profile);
            this.fillForms(response.profile);
            resolve();
          } else {
            console.error('No profile found in storage either');
            this.showNotification('프로필을 찾을 수 없습니다. 확장프로그램에서 정보를 저장해주세요.', 'error');
            reject(new Error('No profile found'));
          }
        });
      });
    }
  }

  fillForms(profile) {
    console.log('Filling forms with profile:', profile);
    
    try {
      // Common selectors for Naver identity verification forms
      const fieldMappings = {
        // Name fields
        name: [
          'input[name*="name"]',
          'input[id*="name"]',
          'input[placeholder*="이름"]',
          'input[placeholder*="성명"]'
        ],
        
        // Birthdate fields (8 digits)
        birthdate: [
          'input[name*="birth"]',
          'input[name*="birthday"]',
          'input[id*="birth"]',
          'input[placeholder*="생년월일"]',
          'input[placeholder*="생일"]'
        ],
        
        // Gender fields
        gender: [
          'input[name*="gender"]',
          'input[name*="sex"]',
          'select[name*="gender"]',
          'select[name*="sex"]'
        ],
        
        // Phone number fields
        phone: [
          'input[name*="phone"]',
          'input[name*="mobile"]',
          'input[name*="tel"]',
          'input[id*="phone"]',
          'input[id*="mobile"]',
          'input[placeholder*="전화번호"]',
          'input[placeholder*="휴대폰"]'
        ],
        
        // Carrier/Telecom fields
        carrier: [
          'select[name*="telecom"]',
          'select[name*="carrier"]',
          'select[name*="mobile"]',
          'select[id*="telecom"]',
          'select[id*="carrier"]'
        ],
        
        // Nationality fields
        nationality: [
          'input[name*="nation"]',
          'select[name*="nation"]',
          'input[name*="foreigner"]',
          'select[name*="foreigner"]'
        ]
      };

      let filledCount = 0;

      // Fill name
      if (profile.name) {
        const nameField = this.findField(fieldMappings.name);
        if (nameField) {
          this.fillInput(nameField, profile.name);
          filledCount++;
        }
      }

      // Fill birthdate
      if (profile.birthdate) {
        const birthdateField = this.findField(fieldMappings.birthdate);
        if (birthdateField) {
          this.fillInput(birthdateField, profile.birthdate);
          filledCount++;
        }
      }

      // Fill phone number
      if (profile.phone) {
        const phoneField = this.findField(fieldMappings.phone);
        if (phoneField) {
          this.fillInput(phoneField, profile.phone);
          filledCount++;
        }
      }

      // Fill gender
      if (profile.gender) {
        this.fillGender(profile.gender);
        filledCount++;
      }

      // Fill carrier
      if (profile.carrier) {
        this.fillCarrier(profile.carrier);
        filledCount++;
      }

      // Fill nationality
      if (profile.nationality) {
        this.fillNationality(profile.nationality);
        filledCount++;
      }

      // Check agreement checkboxes
      this.checkAgreements();
      filledCount++;

      console.log(`Filled ${filledCount} fields`);
      this.showNotification(`${filledCount}개 필드가 자동완성되었습니다.`);

    } catch (error) {
      console.error('Error filling forms:', error);
      this.showNotification('자동완성 중 오류가 발생했습니다.', 'error');
    }
  }

  checkAgreements() {
    console.log('Checking for agreement checkboxes (Vimium-style)...');
    
    // 약관 전체동의 체크박스 선택자 (우선순위 순)
    const allAgreementSelectors = [
      '.all_check_box[role="checkbox"]',
      '[role="checkbox"][onclick*="allagree"]',
      'div.all_check_box',
      '.agreeAll',
      '#agreeAllCheckbox',
      'input#termsAgreeAllCheckbox',
      'input[id*="all"][id*="agree"]',
      'input[name*="all"][name*="agree"]',
      'div[class*="all"][class*="agree"]'
    ];
    
    // 각 선택자에 대해 요소를 찾고 클릭 시도
    for (const selector of allAgreementSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        console.log(`Found ${elements.length} elements matching ${selector}`);
        
        // 약관 전체동의 체크박스 찾기
        let targetElement = null;
        for (const el of elements) {
          const text = el.textContent || '';
          if (text.includes('약관') || text.includes('동의') || text.includes('모두') || 
              text.includes('전체') || text.includes('일괄') || text.includes('필수')) {
            targetElement = el;
            console.log(`Found agreement element with text: ${text.substring(0, 30)}...`);
            break;
          }
        }
        
        // 텍스트로 필터링된 요소가 없으면 첫 번째 요소 사용
        if (!targetElement && elements.length > 0) {
          targetElement = elements[0];
        }
        
        if (targetElement) {
          console.log('Clicking all-agreement checkbox using Vimium-style click');
          
          // Vimium 스타일의 클릭 시뮬레이션
          this.vimiumClick(targetElement);
          
          // 약관 동의 후 다음 버튼 자동 클릭 시도
          setTimeout(() => {
            this.tryClickNextButton();
          }, 500);
          
          return; // 첫 번째 발견된 전체동의 체크박스만 클릭
        }
      }
    }
    
    console.log('No all-agreement checkbox found');
  }
  
  // Vimium 스타일의 클릭 함수
  vimiumClick(element) {
    console.log('Performing Vimium-style click on:', element);
    
    // 1. 요소가 보이는지 확인하고 보이도록 설정
    const originalDisplay = element.style.display;
    const originalVisibility = element.style.visibility;
    
    element.style.display = '';
    element.style.visibility = 'visible';
    
    // 2. 요소의 경계 상자 가져오기
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // 3. 다양한 이벤트 시뮬레이션
    const eventOptions = {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: 0,
      buttons: 1,
      relatedTarget: null,
      region: null,
      detail: 1
    };
    
    // 체크박스 유형에 따른 처리
    if (element.tagName === 'INPUT' && element.type === 'checkbox') {
      // 일반 체크박스
      element.checked = true;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.getAttribute('role') === 'checkbox') {
      // ARIA 체크박스
      element.setAttribute('aria-checked', 'true');
      element.classList.add('checked', 'selected', 'on');
    }
    
    // 마우스 이벤트 시퀀스
    element.dispatchEvent(new MouseEvent('mouseover', eventOptions));
    element.dispatchEvent(new MouseEvent('mouseenter', eventOptions));
    element.dispatchEvent(new MouseEvent('mousemove', eventOptions));
    element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    
    // focus 이벤트
    element.focus();
    element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    
    // 클릭 이벤트
    element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
    element.dispatchEvent(new MouseEvent('click', eventOptions));
    
    // PointerEvent 지원 브라우저를 위한 추가 이벤트
    if (window.PointerEvent) {
      element.dispatchEvent(new PointerEvent('pointerdown', eventOptions));
      element.dispatchEvent(new PointerEvent('pointerup', eventOptions));
      element.dispatchEvent(new PointerEvent('click', eventOptions));
    }
    
    // Touch 이벤트 (모바일 웹 호환성)
    if (window.TouchEvent) {
      try {
        const touch = new Touch({
          identifier: Date.now(),
          target: element,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          pageX: x,
          pageY: y,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 1
        });
        
        element.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch]
        }));
        
        element.dispatchEvent(new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch]
        }));
      } catch (e) {
        // Touch 이벤트 생성 실패 시 무시
      }
    }
    
    // 체크박스 상태 변경 이벤트
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    // onclick 핸들러 직접 호출
    if (element.onclick && typeof element.onclick === 'function') {
      try {
        element.onclick.call(element, new MouseEvent('click', eventOptions));
            } catch (e) {
        console.log('onclick handler error:', e);
      }
    }
    
    // nclk 함수 호출
    this.tryCallNclk(element);
    
    // 원래 스타일 복원
    element.style.display = originalDisplay;
    element.style.visibility = originalVisibility;
    
    console.log('Vimium-style click completed');
  }
  
  
  // 약관 동의 후 다음 버튼 클릭 시도
  tryClickNextButton() {
    // 다음 버튼 선택자
    const nextButtonSelectors = [
      'button.btn_next', 
      'button.btn_confirm',
      'button.confirm',
      'button.next',
      'a.btn_next',
      'a.btn_confirm',
      'button',
      'input[type="submit"]'
    ];
    
    // 선택자로 버튼 찾기
    for (const selector of nextButtonSelectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          const text = button.textContent || '';
          if (text.includes('다음') || text.includes('확인')) {
            console.log('Found next/confirm button:', text);
            button.click();
            return true;
          }
        }
      } catch (e) {
        console.log(`Error finding button with selector ${selector}:`, e);
      }
    }
    
    // 텍스트로 버튼 찾기
    const allButtons = document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn');
    for (const button of allButtons) {
      const text = button.textContent || button.value || '';
      if (text.includes('다음') || text.includes('확인') || text.includes('진행')) {
        console.log('Found next/confirm button by text:', text);
        button.click();
        return true;
      }
    }
    
    return false;
  }
  
  // nclk 함수 호출 도우미
  tryCallNclk(element) {
          if (typeof window.nclk === 'function') {
            try {
        const onclickAttr = element.getAttribute('onclick');
              if (onclickAttr && onclickAttr.includes('nclk')) {
                const match = onclickAttr.match(/nclk\(this,\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*(\d+)\)/);
                if (match) {
            window.nclk(element, match[1], match[2], match[3], parseInt(match[4]));
          }
        }
      } catch (e) {
        console.log('nclk call failed:', e);
      }
    }
  }

  findField(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    return null;
  }

  fillInput(element, value) {
    if (!element) return;
    
    // Clear existing value
    element.value = '';
    element.focus();
    
    // Use a reliable method for all text input
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeInputValueSetter.call(element, value);
    
    // Trigger events to ensure the form recognizes the change
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('keyup', { bubbles: true }));
    element.blur();
  }

  fillGender(gender) {
    // Try radio buttons first
    const maleRadio = document.querySelector('input[type="radio"][value*="male"], input[type="radio"][value="1"], input[type="radio"][value="M"]');
    const femaleRadio = document.querySelector('input[type="radio"][value*="female"], input[type="radio"][value="2"], input[type="radio"][value="F"]');
    
    if (gender === 'male' && maleRadio) {
      maleRadio.checked = true;
      maleRadio.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (gender === 'female' && femaleRadio) {
      femaleRadio.checked = true;
      femaleRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Try select dropdown
    const genderSelect = document.querySelector('select[name*="gender"], select[name*="sex"]');
    if (genderSelect) {
      const genderValue = gender === 'male' ? '남자' : '여자';
      const option = Array.from(genderSelect.options).find(opt => 
        opt.text.includes(genderValue) || opt.value.includes(genderValue)
      );
      if (option) {
        genderSelect.value = option.value;
        genderSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  fillCarrier(carrier) {
    console.log(`Filling carrier using exact sequence: ${carrier}`);
    
    // 통신사 매핑 테이블 (깨진 인코딩도 처리)
    const carrierMappings = {
      'KT': 'KT',
      'SKT': 'SKT', 
      'LG': 'LG',
      'LGU+': 'LG',
      'KT알뜰폰': 'KT알뜰폰',
      'SKT알뜰폰': 'SKT알뜰폰',
      'LG알뜰폰': 'LG알뜰폰',
      'KT��고�': 'KT알뜰폰',
      'SKT��고�': 'SKT알뜰폰',
      'LG��고�': 'LG알뜰폰',
      'KTìë°í°': 'KT알뜰폰',
      'SKTìë°í°': 'SKT알뜰폰',
      'LGìë°í°': 'LG알뜰폰'
    };
    
    // 매핑된 통신사명 사용
    const normalizedCarrier = carrierMappings[carrier] || carrier;
    console.log(`Normalized carrier: ${normalizedCarrier}`);
    
    // 통신사 데이터 코드 매핑
    const carrierDataTelMap = {
      'KT': 'KT',
      'SKT': 'SKT',
      'LG': 'LGT',
      'LGU+': 'LGT',
      'KT알뜰폰': 'KTR',
      'SKT알뜰폰': 'SKTR',
      'LG알뜰폰': 'LGTR'
    };
    
    // 통신사 데이터 코드
    const dataTel = carrierDataTelMap[normalizedCarrier] || '';
    
    // 1. 먼저 드롭다운 선택 시도
    const carrierSelect = document.querySelector('select[name*="telecom"], select[name*="carrier"], select[name*="mobile"]');
    if (carrierSelect) {
      const option = Array.from(carrierSelect.options).find(opt => 
        opt.text.includes(normalizedCarrier) || opt.value.includes(normalizedCarrier)
      );
      if (option) {
        console.log('Found carrier in select dropdown:', option.text);
        carrierSelect.value = option.value;
        carrierSelect.dispatchEvent(new Event('change', { bubbles: true }));
        carrierSelect.dispatchEvent(new Event('click', { bubbles: true }));
        return;
      }
    }
    
    // 2. span.agency 통신사 선택 버튼 찾기
    const agencySpan = document.querySelector('span.agency');
    if (agencySpan && agencySpan.textContent.includes('통신사')) {
      console.log('Found span.agency for carrier selection:', agencySpan.textContent);
      
      // 통신사 선택 버튼 클릭
      this.vimiumClick(agencySpan);
      
      // 잠시 기다린 후 통신사 선택
      setTimeout(() => {
        // 정확한 통신사 링크 찾기 (data-tel 속성 사용)
        let telecomLink = null;
        
        if (dataTel) {
          telecomLink = document.querySelector(`a.telecom[data-tel="${dataTel}"]`);
          if (telecomLink) {
            console.log(`Found exact telecom link with data-tel=${dataTel}`);
          }
        }
        
        // data-tel로 찾지 못한 경우 data-name 속성으로 시도
        if (!telecomLink) {
          telecomLink = document.querySelector(`a.telecom[data-name="${normalizedCarrier}"]`);
          if (telecomLink) {
            console.log(`Found telecom link with data-name=${normalizedCarrier}`);
          }
        }
        
        // 여전히 찾지 못한 경우 텍스트 내용으로 찾기
        if (!telecomLink) {
          const allTelecomLinks = document.querySelectorAll('a.telecom');
          for (const link of allTelecomLinks) {
            const textSpan = link.querySelector('span.text');
            if (textSpan && textSpan.textContent.trim() === normalizedCarrier) {
              telecomLink = link;
              console.log(`Found telecom link with text: ${textSpan.textContent.trim()}`);
              break;
            }
          }
        }
        
        // 알뜰폰인 경우 부분 매칭 시도
        if (!telecomLink && normalizedCarrier.includes('알뜰폰')) {
          const allTelecomLinks = document.querySelectorAll('a.telecom');
          for (const link of allTelecomLinks) {
            const textSpan = link.querySelector('span.text');
            if (textSpan && textSpan.textContent.includes('알뜰폰')) {
              telecomLink = link;
              console.log(`Found telecom link with partial text match: ${textSpan.textContent}`);
              break;
            }
          }
        }
        
        // 찾은 통신사 링크 클릭
        if (telecomLink) {
          // 다른 통신사 링크의 선택 상태 제거
          document.querySelectorAll('a.telecom').forEach(link => {
            link.classList.remove('select');
            link.setAttribute('aria-selected', 'false');
          });
          
          // 선택된 통신사 링크 표시
          telecomLink.classList.add('select');
          telecomLink.setAttribute('aria-selected', 'true');
          
          // Vimium 스타일의 클릭 시뮬레이션
          this.vimiumClick(telecomLink);
        } else {
          console.log(`Could not find telecom link for: ${normalizedCarrier}`);
          this.tryAlternativeCarrierSelection(normalizedCarrier);
        }
      }, 300);
      
      return;
    }
    
    // 3. 다른 통신사 선택 UI 패턴 시도
    this.tryAlternativeCarrierSelection(normalizedCarrier);
  }
  
  // 대체 통신사 선택 방법
  tryAlternativeCarrierSelection(normalizedCarrier) {
    console.log('Trying alternative carrier selection methods for:', normalizedCarrier);
    
    // 1. 통신사 선택 버튼 찾기
    const carrierButtonSelectors = [
      'button.carrier_select',
      'button.select_telecom',
      'button[aria-haspopup="listbox"]',
      'button.telecom_select',
      '.telecom_select',
      'button:contains("통신사")',
      'button:contains("통신사 선택")',
      'a:contains("통신사")',
      'a:contains("통신사 선택")',
      'div:contains("통신사 선택")',
      '.select_box'
    ];
    
    // 통신사 선택 버튼 찾기
    let carrierButton = null;
    
    for (const selector of carrierButtonSelectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          const text = button.textContent || '';
          if (text.includes('통신사') || text.includes('이동통신사') || text.includes('선택')) {
            carrierButton = button;
            console.log('Found carrier selection button:', text);
            break;
          }
        }
        
        if (carrierButton) break;
      } catch (e) {
        console.log(`Error finding button with selector ${selector}:`, e);
      }
    }
    
    // 통신사 선택 버튼이 없으면 직접 통신사 링크 찾기
    if (!carrierButton) {
      this.findAndClickCarrierDirectly(normalizedCarrier);
      return;
    }
    
    // 통신사 선택 버튼 클릭
    console.log('Clicking carrier selection button');
    this.vimiumClick(carrierButton);
    
    // 잠시 기다린 후 통신사 목록에서 선택
    setTimeout(() => {
      this.selectCarrierFromPopup(normalizedCarrier);
    }, 300);
  }
  
  // 통신사 선택 팝업에서 통신사 선택
  selectCarrierFromPopup(normalizedCarrier) {
    console.log('Looking for carrier in popup:', normalizedCarrier);
    
    // 통신사 목록 컨테이너 선택자
    const popupSelectors = [
      '.layer_telecom',
      '.telecom_layer',
      '.telecom_list',
      '.carrier_list',
      '.telecom_select_layer',
      '.layer_box',
      '.select_list',
      'ul.select_options',
      'div[role="listbox"]',
      'div.layer_wrap'
    ];
    
    // 통신사 목록 컨테이너 찾기
    let popupContainer = null;
    for (const selector of popupSelectors) {
      const container = document.querySelector(selector);
      if (container && container.offsetParent !== null) { // 보이는 요소인지 확인
        popupContainer = container;
        console.log('Found carrier popup container:', selector);
        break;
      }
    }
    
    if (!popupContainer) {
      console.log('Could not find carrier popup container');
      return;
    }
    
    // 통신사 항목 선택자
    const carrierItemSelectors = [
      'a.telecom',
      'li.item',
      'li.option',
      'div.item',
      'button.option',
      'a[data-tel]',
      'a[data-name]',
      'a[data-code]',
      'li',
      'a'
    ];
    
    // 통신사 항목 찾기
    let targetCarrier = null;
    
    // 각 선택자로 통신사 항목 찾기
    for (const selector of carrierItemSelectors) {
      const items = popupContainer.querySelectorAll(selector);
      
      if (items && items.length > 0) {
        console.log(`Found ${items.length} carrier items with selector ${selector}`);
        
        // 정확한 통신사명 매칭
        for (const item of items) {
          const text = item.textContent || '';
          const dataName = item.getAttribute('data-name') || '';
          const dataTel = item.getAttribute('data-tel') || '';
          const span = item.querySelector('span.text, span.option_text');
          const spanText = span ? span.textContent.trim() : '';
          
          if (text.includes(normalizedCarrier) || 
              dataName.includes(normalizedCarrier) || 
              dataTel.includes(normalizedCarrier) ||
              spanText.includes(normalizedCarrier)) {
            targetCarrier = item;
            console.log(`Found matching carrier item: ${text}`);
            break;
          }
        }
        
        if (targetCarrier) break;
      }
    }
    
    // 매칭되는 통신사를 찾지 못했으면 첫 번째 알뜰폰 항목 선택
    if (!targetCarrier && normalizedCarrier.includes('알뜰폰')) {
      for (const selector of carrierItemSelectors) {
        const items = popupContainer.querySelectorAll(selector);
        
        for (const item of items) {
          const text = item.textContent || '';
          if (text.includes('알뜰폰')) {
            targetCarrier = item;
            console.log(`Found MVNO carrier item: ${text}`);
            break;
          }
        }
        
        if (targetCarrier) break;
      }
    }
    
    // 통신사 항목 클릭
    if (targetCarrier) {
      console.log('Clicking carrier item');
      
      // 다른 통신사 링크의 선택 상태 제거
      popupContainer.querySelectorAll('a.telecom, li.item, li.option').forEach(link => {
        link.classList.remove('select', 'selected', 'on', 'active');
        link.setAttribute('aria-selected', 'false');
      });
      
      // 선택된 통신사 링크 표시
      targetCarrier.classList.add('select', 'selected', 'on');
      targetCarrier.setAttribute('aria-selected', 'true');
      
      // Vimium 스타일의 클릭 시뮬레이션
      this.vimiumClick(targetCarrier);
    } else {
      console.log(`Could not find carrier item: ${normalizedCarrier}`);
    }
  }
  
  // 기존 방식으로 통신사 링크 직접 찾기
  findAndClickCarrierDirectly(normalizedCarrier) {
    console.log('Trying to find carrier link directly:', normalizedCarrier);
    
    // 통신사 링크 선택자 목록
    const carrierSelectors = [
      `a.telecom[data-tel="${normalizedCarrier}"]`,
      `a.telecom[data-name="${normalizedCarrier}"]`,
      `a.telecom[data-code="${normalizedCarrier}"]`,
      'a.telecom'
    ];
    
    // 각 선택자로 통신사 링크 찾기
    for (const selector of carrierSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        console.log(`Found ${elements.length} carrier elements matching ${selector}`);
        
        // 통신사 링크 찾기
        let targetElement = null;
        
        // 정확한 통신사명 매칭
        for (const el of elements) {
          const text = el.textContent || '';
          const dataName = el.getAttribute('data-name') || '';
          const dataTel = el.getAttribute('data-tel') || '';
          const span = el.querySelector('span.text');
          const spanText = span ? span.textContent.trim() : '';
          
          if (text.includes(normalizedCarrier) || 
              dataName.includes(normalizedCarrier) || 
              dataTel.includes(normalizedCarrier) ||
              spanText.includes(normalizedCarrier)) {
            targetElement = el;
            console.log(`Found carrier element with text: ${text}`);
            break;
          }
        }
        
        // 텍스트로 필터링된 요소가 없으면 첫 번째 요소 사용
        if (!targetElement && elements.length > 0) {
          targetElement = elements[0];
        }
        
        if (targetElement) {
          console.log('Clicking carrier using Vimium-style click');
          
          // 다른 통신사 링크의 선택 상태 제거
          document.querySelectorAll('a.telecom').forEach(link => {
            link.classList.remove('select');
            link.setAttribute('aria-selected', 'false');
          });
          
          // 선택된 통신사 링크 표시
          targetElement.classList.add('select');
          targetElement.setAttribute('aria-selected', 'true');
          
          // Vimium 스타일의 클릭 시뮬레이션
          this.vimiumClick(targetElement);
        return;
        }
      }
    }
    
    console.log(`Could not find carrier: ${normalizedCarrier}`);
  }

  fillNationality(nationality) {
    const isNative = nationality === 'domestic';
    const targetValue = isNative ? 'N' : 'Y';
    const targetId = isNative ? 'nationality01' : 'nationality02';
    
    console.log(`Looking for nationality: ${nationality}, target value: ${targetValue}, target ID: ${targetId}`);
    
    // 국적 라디오 버튼 선택자 목록
    const nationalitySelectors = [
      `#${targetId}`,
      `input[name="nationality"][value="${targetValue}"]`,
      'input[name="nationality"]'
    ];
    
    // 각 선택자로 국적 라디오 버튼 찾기
    for (const selector of nationalitySelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        console.log(`Found ${elements.length} nationality elements matching ${selector}`);
        
        // 국적 라디오 버튼 찾기
        let targetElement = null;
        
        if (selector === `#${targetId}` || selector === `input[name="nationality"][value="${targetValue}"]`) {
          // ID나 value로 직접 찾은 경우 첫 번째 요소 사용
          targetElement = elements[0];
        } else {
          // 라디오 버튼 그룹에서 라벨 텍스트로 찾기
          for (const radio of elements) {
      const label = document.querySelector(`label[for="${radio.id}"]`);
      if (label) {
        const labelText = label.textContent.trim();
        console.log('Checking label text:', labelText);
        
        if ((isNative && labelText.includes('내국인')) || 
            (!isNative && labelText.includes('외국인'))) {
                targetElement = radio;
          console.log('Found matching radio by label text:', radio);
                break;
              }
            }
          }
        }
        
        if (targetElement) {
          console.log('Clicking nationality radio using Vimium-style click');
          
          // 라디오 버튼 체크 상태 설정
          targetElement.checked = true;
          
          // Vimium 스타일의 클릭 시뮬레이션
          this.vimiumClick(targetElement);
          return;
        }
      }
    }
    
    console.log(`Could not find nationality option for: ${nationality}`);
  }

  addExtensionIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'naver-autofill-indicator';
    indicator.style.cssText = `
      position: fixed !important;
      bottom: 30px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: #03c75a !important;
      color: white !important;
      padding: 8px 16px !important;
      border-radius: 20px !important;
      font-size: 12px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      z-index: 10000 !important;
      box-shadow: 0 4px 12px rgba(3, 199, 90, 0.3) !important;
      opacity: 0 !important;
      transition: all 0.3s ease !important;
    `;
    indicator.textContent = '네이버 자동완성 활성';
    document.body.appendChild(indicator);
    
    // Fade in animation
    setTimeout(() => {
      indicator.style.setProperty('opacity', '1', 'important');
      indicator.style.setProperty('transform', 'translateX(-50%) translateY(-10px)', 'important');
    }, 100);
    
    // Remove indicator after 3 seconds
    setTimeout(() => {
      indicator.style.setProperty('opacity', '0', 'important');
      indicator.style.setProperty('transform', 'translateX(-50%) translateY(10px)', 'important');
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, 3000);
  }

  addAutoFillButtons() {
    // Check if this page has identity forms before adding floating button
    const hasIdentityForms = this.hasIdentityFormsOnPage();
    
    if (hasIdentityForms) {
      // Add floating action button
      this.addFloatingButton();
    }
    
    // Wait for forms to load and add form-specific buttons
    setTimeout(() => {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        if (this.isIdentityForm(form)) {
          this.addAutoFillButton(form);
        }
      });
      
      // If we didn't find forms initially but they're loaded now, add floating button
      if (!hasIdentityForms && this.hasIdentityFormsOnPage()) {
        this.addFloatingButton();
      }
    }, 1000);
  }

  hasIdentityFormsOnPage() {
    // Check for identity-related inputs
    const identitySelectors = [
      'input[name*="name"]',
      'input[name*="birth"]', 
      'input[name*="phone"]',
      'input[name*="mobile"]',
      'input[name*="tel"]',
      'input[placeholder*="이름"]',
      'input[placeholder*="성명"]',
      'input[placeholder*="생년월일"]',
      'input[placeholder*="전화번호"]',
      'input[placeholder*="휴대폰"]',
      'select[name*="telecom"]',
      'select[name*="carrier"]'
    ];
    
    for (const selector of identitySelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    // Check for identity-related text content
    const pageText = document.body.textContent || '';
    const identityKeywords = [
      '본인인증', '실명인증', '신원확인', '휴대폰 인증', 
      '생년월일', '통신사', '이동통신사', '휴대폰번호'
    ];
    
    return identityKeywords.some(keyword => pageText.includes(keyword));
  }

  addFloatingButton() {
    // Remove existing floating button if any
    const existingButton = document.getElementById('naver-autofill-floating-btn');
    if (existingButton) {
      existingButton.remove();
    }

    // Remove existing tooltip if any
    const existingTooltip = document.getElementById('naver-autofill-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const floatingBtn = document.createElement('button');
    floatingBtn.id = 'naver-autofill-floating-btn';
    floatingBtn.innerHTML = '🚀';
    floatingBtn.title = '네이버 자동완성';
    
    floatingBtn.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      width: 45px !important;
      height: 45px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, #03c75a 0%, #02b350 100%) !important;
      color: white !important;
      border: none !important;
      font-size: 18px !important;
      cursor: pointer !important;
      z-index: 10000 !important;
      box-shadow: 0 3px 15px rgba(3, 199, 90, 0.3) !important;
      transition: all 0.3s ease !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      user-select: none !important;
      opacity: 0.9 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
      transform: none !important;
    `;

    // Hover effects
    floatingBtn.addEventListener('mouseenter', () => {
      floatingBtn.style.setProperty('transform', 'scale(1.1)', 'important');
      floatingBtn.style.setProperty('box-shadow', '0 4px 18px rgba(3, 199, 90, 0.4)', 'important');
      floatingBtn.style.setProperty('opacity', '1', 'important');
      floatingBtn.style.setProperty('top', '20px', 'important');
      floatingBtn.style.setProperty('right', '20px', 'important');
    });

    floatingBtn.addEventListener('mouseleave', () => {
      floatingBtn.style.setProperty('transform', 'scale(1)', 'important');
      floatingBtn.style.setProperty('box-shadow', '0 3px 15px rgba(3, 199, 90, 0.3)', 'important');
      floatingBtn.style.setProperty('opacity', '0.9', 'important');
      floatingBtn.style.setProperty('top', '20px', 'important');
      floatingBtn.style.setProperty('right', '20px', 'important');
    });

    // Click animation
    floatingBtn.addEventListener('mousedown', () => {
      floatingBtn.style.setProperty('transform', 'scale(0.95)', 'important');
      floatingBtn.style.setProperty('top', '20px', 'important');
      floatingBtn.style.setProperty('right', '20px', 'important');
    });

    floatingBtn.addEventListener('mouseup', () => {
      floatingBtn.style.setProperty('transform', 'scale(1.1)', 'important');
      floatingBtn.style.setProperty('top', '20px', 'important');
      floatingBtn.style.setProperty('right', '20px', 'important');
    });

    // Click handler
    floatingBtn.addEventListener('click', () => {
      this.handleFloatingButtonClick();
    });

    // Auto-hide on scroll (optional)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      floatingBtn.style.setProperty('opacity', '0.6', 'important');
      floatingBtn.style.setProperty('top', '20px', 'important');
      floatingBtn.style.setProperty('right', '20px', 'important');
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        floatingBtn.style.setProperty('opacity', '0.9', 'important');
        floatingBtn.style.setProperty('top', '20px', 'important');
        floatingBtn.style.setProperty('right', '20px', 'important');
      }, 1000);
    });

    document.body.appendChild(floatingBtn);

    // Add floating tooltip
    this.addFloatingTooltip(floatingBtn);

    // Auto-hide after page loads (show again on form interaction)
    setTimeout(() => {
      this.setupFloatingButtonAutoShow(floatingBtn);
    }, 5000);
  }

  setupFloatingButtonAutoShow(button) {
    // Show button when user interacts with forms
    const formInputs = document.querySelectorAll('input, select, textarea');
    
    formInputs.forEach(input => {
      input.addEventListener('focus', () => {
        if (this.isIdentityFormInput(input)) {
          button.style.setProperty('transform', 'scale(1.05)', 'important');
          button.style.setProperty('opacity', '1', 'important');
          button.style.setProperty('top', '20px', 'important');
          button.style.setProperty('right', '20px', 'important');
          
          // Pulse animation to draw attention
          button.style.animation = 'pulse 2s infinite';
          
          setTimeout(() => {
            button.style.animation = 'none';
            this.ensureButtonPosition(button);
          }, 4000);
        }
      });
    });
  }

  isIdentityFormInput(input) {
    const name = input.name?.toLowerCase() || '';
    const id = input.id?.toLowerCase() || '';
    const placeholder = input.placeholder?.toLowerCase() || '';
    
    const identityKeywords = [
      'name', 'birth', 'phone', 'mobile', 'tel', 'gender', 'sex', 'carrier', 'telecom',
      '이름', '성명', '생년월일', '전화번호', '휴대폰', '통신사'
    ];
    
    return identityKeywords.some(keyword => 
      name.includes(keyword) || id.includes(keyword) || placeholder.includes(keyword)
    );
  }

  addFloatingTooltip(button) {
    const tooltip = document.createElement('div');
    tooltip.id = 'naver-autofill-tooltip';
    tooltip.textContent = '자동완성 실행';
    tooltip.style.cssText = `
      position: fixed !important;
      top: 75px !important;
      right: 35px !important;
      background: rgba(0, 0, 0, 0.8) !important;
      color: white !important;
      padding: 6px 10px !important;
      border-radius: 4px !important;
      font-size: 11px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      z-index: 10001 !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.3s ease !important;
      white-space: nowrap !important;
    `;

    document.body.appendChild(tooltip);

    // Show tooltip on hover
    button.addEventListener('mouseenter', () => {
      tooltip.style.opacity = '1';
    });

    button.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
  }

  handleFloatingButtonClick() {
    const button = document.getElementById('naver-autofill-floating-btn');
    
    // Ensure position stays fixed
    this.ensureButtonPosition(button);
    
    // Add ripple effect
    this.createRippleEffect(button);
    
    // Visual feedback
    button.innerHTML = '⏳';
    button.style.setProperty('background', 'linear-gradient(135deg, #ffa500 0%, #ff8c00 100%)', 'important');
    
    this.loadProfileAndFill().then(() => {
      // Success feedback
      button.innerHTML = '✅';
      button.style.setProperty('background', 'linear-gradient(135deg, #28a745 0%, #20a33a 100%)', 'important');
      this.ensureButtonPosition(button);
      
      // Show success message
      this.showFloatingMessage('자동완성 완료!', 'success');
      
      setTimeout(() => {
        button.innerHTML = '🚀';
        button.style.setProperty('background', 'linear-gradient(135deg, #03c75a 0%, #02b350 100%)', 'important');
        this.ensureButtonPosition(button);
      }, 2000);
    }).catch(() => {
      // Error feedback
      button.innerHTML = '❌';
      button.style.setProperty('background', 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', 'important');
      this.ensureButtonPosition(button);
      
      // Show error message
      this.showFloatingMessage('자동완성 실패', 'error');
      
      setTimeout(() => {
        button.innerHTML = '🚀';
        button.style.setProperty('background', 'linear-gradient(135deg, #03c75a 0%, #02b350 100%)', 'important');
        this.ensureButtonPosition(button);
      }, 2000);
    });
  }

  ensureButtonPosition(button) {
    if (button) {
      button.style.setProperty('position', 'fixed', 'important');
      button.style.setProperty('top', '20px', 'important');
      button.style.setProperty('right', '20px', 'important');
      button.style.setProperty('z-index', '10000', 'important');
    }
  }

  createRippleEffect(button) {
    const ripple = document.createElement('span');
    ripple.className = 'naver-autofill-success-ripple';
    
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${-radius}px`;
    ripple.style.top = `${-radius}px`;
    
    button.style.position = 'relative';
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  showFloatingMessage(message, type = 'info') {
    const floatingMessage = document.createElement('div');
    floatingMessage.className = 'naver-autofill-floating-message';
    floatingMessage.textContent = message;
    
    const colors = {
      success: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
      error: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
      info: { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' }
    };
    
    const colorScheme = colors[type] || colors.info;
    
    floatingMessage.style.cssText = `
      position: fixed !important;
      top: 80px !important;
      right: 20px !important;
      background: ${colorScheme.bg} !important;
      color: ${colorScheme.color} !important;
      border: 1px solid ${colorScheme.border} !important;
      padding: 8px 12px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      z-index: 10002 !important;
      box-shadow: 0 3px 10px rgba(0,0,0,0.1) !important;
      transform: translateX(100%) !important;
      transition: transform 0.3s ease !important;
      max-width: 180px !important;
      word-wrap: break-word !important;
    `;
    
    document.body.appendChild(floatingMessage);
    
    // Slide in
    setTimeout(() => {
      floatingMessage.style.transform = 'translateX(0)';
    }, 100);
    
    // Slide out and remove
    setTimeout(() => {
      floatingMessage.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (floatingMessage.parentNode) {
          floatingMessage.parentNode.removeChild(floatingMessage);
        }
      }, 300);
    }, 3000);
  }

  isIdentityForm(form) {
    const formText = form.innerHTML.toLowerCase();
    return formText.includes('이름') || formText.includes('생년월일') || 
           formText.includes('전화번호') || formText.includes('본인인증');
  }

  addAutoFillButton(form) {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.cssText = `
      background: #03c75a;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      margin: 10px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    button.textContent = '🚀 자동완성';
    
    button.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'get_profile' }, (response) => {
        if (response && response.profile) {
          this.fillForms(response.profile);
        } else {
          this.showNotification('저장된 프로필이 없습니다. 확장프로그램에서 정보를 저장해주세요.', 'error');
        }
      });
    });
    
    form.insertBefore(button, form.firstChild);
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed !important;
      bottom: 80px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: ${type === 'success' ? '#d4edda' : '#f8d7da'} !important;
      color: ${type === 'success' ? '#155724' : '#721c24'} !important;
      border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'} !important;
      padding: 12px 16px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      z-index: 10001 !important;
      max-width: 350px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      text-align: center !important;
      opacity: 0 !important;
      transition: all 0.3s ease !important;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Slide in animation
    setTimeout(() => {
      notification.style.setProperty('opacity', '1', 'important');
      notification.style.setProperty('transform', 'translateX(-50%) translateY(-10px)', 'important');
    }, 100);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
      notification.style.setProperty('opacity', '0', 'important');
      notification.style.setProperty('transform', 'translateX(-50%) translateY(10px)', 'important');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }
}

// Initialize the extension
let naverAutoFillInstance;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    naverAutoFillInstance = new NaverAutoFill();
    // Expose to window for Raycast access
    window.NaverAutoFill = NaverAutoFill;
    window.naverAutoFillInstance = naverAutoFillInstance;
  });
} else {
  naverAutoFillInstance = new NaverAutoFill();
  // Expose to window for Raycast access
  window.NaverAutoFill = NaverAutoFill;
  window.naverAutoFillInstance = naverAutoFillInstance;
}
