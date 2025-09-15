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
├── profile.example.json   # 프로필 예시
├── icons/                 # 아이콘들
└── raycast-scripts/       # Raycast 스크립트들
    ├── fill-naver-forms.js      # Raycast 스크립트
    ├── fill-naver-setting.json  # 설정 파일
    └── profile.json             # 사용자 프로필
```

## Chrome Extension 설치

1. Chrome에서 `chrome://extensions/` 으로 이동
2. 우상단의 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `extension` 폴더 선택

## 사용 방법

### 1. Chrome Extension만 사용하는 경우

1. 확장프로그램 설치 후, 확장프로그램 아이콘 클릭
2. 팝업에서 개인정보 입력 및 저장
3. nid.naver.com 페이지에서:
   - 확장프로그램 팝업의 "자동완성" 버튼 클릭, 또는
   - 페이지 내 "🚀 자동완성" 버튼 클릭

### 2. Raycast Script와 함께 사용하는 경우

1. Chrome Extension 설치 완료
2. `raycast-scripts/profile.json` 파일에 개인정보 입력:

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
   - Raycast에서 "Fill Naver Forms" 실행

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

- ✅ nid.naver.com 페이지 자동 감지
- ✅ 폼 필드 자동 매핑 및 완성
- ✅ Chrome Extension 팝업 인터페이스
- ✅ 페이지 내 자동완성 버튼
- ✅ Raycast 스크립트 통합
- ✅ 데이터 로컬 저장 (Chrome Storage API)

## 문제 해결

### Chrome Extension이 작동하지 않는 경우
1. 개발자 모드가 활성화되어 있는지 확인
2. 확장프로그램이 활성화되어 있는지 확인
3. nid.naver.com 페이지에서만 작동함을 확인

### Raycast Script가 작동하지 않는 경우
1. Chrome이 실행 중인지 확인
2. nid.naver.com 페이지가 열려 있는지 확인
3. `profile.json` 파일이 올바른 형식인지 확인
4. Node.js가 설치되어 있는지 확인

## 보안 주의사항

- 개인정보는 로컬에서만 저장됩니다
- 외부 서버로 데이터가 전송되지 않습니다
- Chrome Storage API를 사용하여 안전하게 저장됩니다

## 라이선스

MIT License
