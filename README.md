# Naver ID Auto Fill Extension

네이버 본인인증 페이지에서 자동완성을 지원하는 Chrome 확장프로그램과 Raycast 스크립트입니다.

## 구조

```
extension/                 # Chrome Extension
├── manifest.json          # 확장프로그램 설정
├── background.js          # 백그라운드 서비스 워커
├── content.js             # 콘텐츠 스크립트 (자동완성 로직)
├── popup.html             # 팝업 UI
├── popup.js               # 팝업 스크립트
├── profile.json           # 사용자 프로필 (extension 내부)
├── profile.example.json   # 프로필 예시
├── icons/                 # 아이콘들
└── raycast-scripts/       # Raycast 스크립트들
    ├── fill-naver-forms.js      # Raycast 트리거 스크립트
    ├── auto-fill-otp.js         # OTP 자동 모니터링 및 입력
    ├── fill-otp-clipboard.js    # 클립보드 OTP 자동 입력
    ├── copy-otp-messages.js     # Messages에서 OTP 복사
    ├── fill-naver-setting.json  # 설정 파일
    └── profile.json             # 사용자 프로필 (raycast용, 더 이상 사용 안함)
```

## Chrome Extension 설치

1. Chrome에서 `chrome://extensions/` 으로 이동
2. 우상단의 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `extension` 폴더 선택

## 사용 방법

### 1. Chrome Extension만 사용하는 경우

1. 확장프로그램 설치 후, 확장프로그램 아이콘 클릭
2. 팝업에서 개인정보 입력 및 저장, 또는 `extension/profile.json` 파일에 직접 입력
3. nid.naver.com 페이지에서:
   - 확장프로그램 팝업의 "자동완성" 버튼 클릭, 또는
   - 페이지 내 "🚀 자동완성" 버튼 클릭, 또는
   - 우상단 floating button (🚀) 클릭

### 2. Raycast Script와 함께 사용하는 경우

1. Chrome Extension 설치 완료
2. `extension/profile.json` 파일에 개인정보 입력:

```json
{
  "name": "홍길동",
  "birthdate": "19900101",
  "gender": "male",
  "carrier": "SKT",
  "nationality": "domestic",
  "phone": "01012345678"
}
```

3. Raycast에서 스크립트 추가:
   - Raycast 열기 → Create Script Command
   - `raycast-scripts/fill-naver-forms.js` 파일 선택

4. 사용방법:
   - nid.naver.com 페이지 열기 (팝업, 백그라운드 탭 모두 가능)
   - Raycast에서 "Fill Naver Forms" 실행 (트리거 역할만 수행)

## 프로필 데이터 형식

### 필수 필드

- `name`: 이름 (문자열)
- `birthdate`: 생년월일 8자리 (YYYYMMDD)
- `gender`: 성별 ("male" 또는 "female")
- `carrier`: 통신사 ("SKT", "KT", "LG U+", "SKT알뜰폰", "KT알뜰폰", "LG U+알뜰폰")
- `nationality`: 국적 ("domestic" 또는 "foreign")
- `phone`: 전화번호 (숫자만, 01012345678)

### 예시

```json
{
  "name": "홍길동",
  "birthdate": "19900101",
  "gender": "male",
  "carrier": "SKT",
  "nationality": "domestic",
  "phone": "01012345678"
}
```

## 주요 기능

### 기본 자동완성 기능
- ✅ nid.naver.com 페이지 자동 감지
- ✅ 폼 필드 자동 매핑 및 완성
- ✅ Chrome Extension 팝업 인터페이스
- ✅ 페이지 내 자동완성 버튼
- ✅ 우상단 floating button (🚀) - 클릭으로 즉시 자동완성
- ✅ Raycast 스크립트 통합 (트리거 역할)
- ✅ Extension 내부에서 프로필 관리
- ✅ 데이터 로컬 저장 (Chrome Storage API)

### OTP 자동 입력 기능
- ✅ **Messages DB 모니터링**: 새로운 OTP 메시지 자동 감지
- ✅ **클립보드 OTP 입력**: 클립보드의 OTP 코드 자동 입력
- ✅ **Messages OTP 복사**: Messages에서 최신 OTP 클립보드 복사
- ✅ **자동 다음 버튼 클릭**: OTP 입력 후 자동으로 다음 단계 진행

## Raycast Scripts 사용법

### 🎯 통합 자동완성 (권장)

#### fill-naver-forms.js - 완전 자동화
**개인정보 입력부터 OTP 입력까지 한 번에 처리**
```bash
# Raycast에서 "Fill Naver Forms & OTP" 검색 후 실행
# 1. 개인정보 자동 입력
# 2. Messages DB 모니터링 (10분간)  
# 3. 새로운 OTP 감지 시 자동 입력
# 4. 다음 버튼 자동 클릭
```

**사용 순서:**
1. 네이버 본인인증 페이지 열기
2. Raycast에서 "Fill Naver Forms & OTP" 실행
3. 개인정보 자동 입력 완료 후 휴대폰 인증 요청
4. OTP 수신 시 자동으로 입력 및 다음 단계 진행

### 🔧 개별 기능 스크립트

#### 1. auto-fill-otp.js
OTP만 별도로 모니터링하여 입력합니다.
```bash
# Raycast에서 "Auto Fill OTP from Messages" 검색 후 실행
# 5분간 Messages DB 모니터링
# 새로운 6자리 OTP 감지 시 자동 입력 및 다음 버튼 클릭
```

#### 2. fill-otp-clipboard.js
현재 클립보드에 있는 OTP 코드를 바로 입력합니다.
```bash
# 1. OTP 코드를 클립보드에 복사
# 2. Raycast에서 "Fill OTP from Clipboard" 검색 후 실행
```

#### 3. copy-otp-messages.js
Messages에서 최신 OTP 코드를 찾아 클립보드에 복사합니다.
```bash
# Raycast에서 "Copy Latest OTP from Messages" 검색 후 실행
# 기본: 6자리, 인자로 4-8자리 지정 가능
```

## OTP 워크플로우 예시

### 🎯 방법 1: 완전 자동화 (가장 권장)
**한 번의 실행으로 모든 과정 완료**
1. 네이버 본인인증 페이지 열기
2. Raycast에서 **"Fill Naver Forms & OTP"** 실행
3. 개인정보 자동 입력 → 휴대폰 인증 선택 → OTP 요청
4. OTP 메시지 수신 시 자동으로 입력 및 완료

### 🔧 방법 2: 자동 모니터링 (OTP만 별도)
1. 네이버 본인인증 페이지에서 휴대폰 인증 선택
2. Raycast에서 "Auto Fill OTP from Messages" 실행
3. 휴대폰으로 OTP 요청
4. OTP 메시지 수신 시 자동으로 입력 및 다음 단계 진행

### 📋 방법 3: 수동 복사 후 입력
1. OTP 메시지 수신
2. Raycast에서 "Copy Latest OTP from Messages" 실행 (클립보드에 복사)
3. Raycast에서 "Fill OTP from Clipboard" 실행 (자동 입력)

### ✋ 방법 4: 직접 복사 후 입력
1. OTP 메시지에서 코드 직접 복사
2. Raycast에서 "Fill OTP from Clipboard" 실행

## 구조 변경사항

이전 버전에서는 Raycast 스크립트가 프로필 데이터를 읽어서 Extension에 전달했지만, 현재 버전에서는:

- **Extension 내부에서 프로필 관리**: `extension/profile.json`에서 사용자 정보 관리
- **Raycast는 트리거 역할만**: 단순히 자동완성 시작 신호만 전송
- **Floating Button 추가**: 페이지 우상단에 항상 표시되는 자동완성 버튼

## 문제 해결

### Chrome Extension이 작동하지 않는 경우
1. 개발자 모드가 활성화되어 있는지 확인
2. 확장프로그램이 활성화되어 있는지 확인
3. nid.naver.com 페이지에서만 작동함을 확인

### Raycast Script가 작동하지 않는 경우
1. Chrome이 실행 중인지 확인
2. nid.naver.com 페이지가 열려 있는지 확인
3. `extension/profile.json` 파일이 올바른 형식인지 확인
4. Node.js가 설치되어 있는지 확인
5. Chrome Extension이 설치되어 있는지 확인

### OTP 기능이 작동하지 않는 경우
1. macOS Messages 앱에 대한 접근 권한 확인
2. Messages DB 경로 확인: `~/Library/Messages/chat.db`
3. OTP 입력 필드가 페이지에 표시되어 있는지 확인
4. 6자리 숫자 형태의 OTP인지 확인
5. Raycast에서 스크립트 실행 권한 확인

## 보안 주의사항

- 개인정보는 로컬에서만 저장됩니다
- Messages DB 접근은 읽기 전용입니다
- OTP 코드는 클립보드를 통해서만 전달됩니다
- 모든 스크립트는 로컬에서 실행되며 외부 서버로 데이터를 전송하지 않습니다
- 외부 서버로 데이터가 전송되지 않습니다
- Chrome Storage API를 사용하여 안전하게 저장됩니다
