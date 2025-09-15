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
    ├── fill-naver-forms.js      # 완전 자동화 스크립트 (개인정보 + OTP)
    └── fill-naver-setting.json  # 설정 파일
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
   - raycast 디스크 전체 접근 허용 (**시스템 환경설정** > **개인정보 보호 및 보안** > **전체 디스크 접근 권한**)

4. 사용방법:
   - nid.naver.com 페이지 열기 (팝업, 백그라운드 탭 모두 가능)
   - Raycast에서 **"Fill Naver Forms & OTP"** 실행하면 개인정보 입력부터 OTP 인증까지 완전 자동 처리

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
- **Messages DB 모니터링**: 새로운 OTP 메시지 자동 감지
- **클립보드 OTP 입력**: 클립보드의 OTP 코드 자동 입력
- **Messages OTP 복사**: Messages에서 최신 OTP 클립보드 복사
- **자동 다음 버튼 클릭**: OTP 입력 후 자동으로 다음 단계 진행

## Raycast Scripts 사용법

### 🎯 완전 자동화 (One-Click 솔루션)

#### fill-naver-forms.js - 개인정보 입력부터 OTP 인증까지 완전 자동화
**한 번의 실행으로 네이버 본인인증 전체 과정 완료**

```bash
# Raycast에서 "Fill Naver Forms & OTP" 검색 후 실행
# ✅ 개인정보 자동 입력
# ✅ Messages DB 모니터링 (10분간)  
# ✅ 새로운 OTP 감지 시 자동 입력
# ✅ 다음 버튼 자동 클릭
# ✅ 인증 완료!
```

**사용 순서:**
1. 네이버 본인인증 페이지 열기
2. Raycast에서 **"Fill Naver Forms & OTP"** 실행 (alias 설정 추천합니다)
3. 완료

Raycast를 사용하지 않고 chrome extension만 사용하는 경우
1. 네이버 본인인증 페이지 열기
2. floating button 열기
3. 인증번호 수동 입력
4. 완료


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
   - **시스템 환경설정** > **개인정보 보호 및 보안** > **전체 디스크 접근 권한**
   - **Terminal** 및 **Raycast** 앱 추가 후 재시작
2. Messages DB 경로 확인: `~/Library/Messages/chat.db`
3. OTP 입력 필드가 페이지에 표시되어 있는지 확인
4. 6자리 숫자 형태의 OTP인지 확인

💡 **권한 설정이 어려운 경우**: 스크립트가 자동으로 fallback 모드로 전환되어 클립보드 방식으로 처리됩니다.

## 보안 주의사항

- 개인정보는 로컬에서만 저장됩니다
- Messages DB 접근은 읽기 전용입니다
- OTP 코드는 일회성으로 전달되고 삭제됩니다
- 모든 스크립트는 로컬에서 실행되며 외부 서버로 데이터를 전송하지 않습니다
