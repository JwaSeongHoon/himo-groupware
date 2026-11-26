# HIMO 그룹웨어 웹 앱 — 프런트엔드 (PRD v1.0, F1~F4)

백엔드 없이 브라우저 안의 mock 서버(MSW)로 동작하는 클릭 가능한 프로토타입입니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입 검사 + 빌드
```

로그인 화면에서 가상 사용자를 골라 들어갑니다. 상단 바의 **개발용** 영역에서 사용자 전환, 응답 지연·오류 모드, 데이터 초기화를 할 수 있습니다.

## 실제 API로 전환 (MK-08)

`.env`에서 다음 값을 바꿉니다. 화면 코드는 고치지 않습니다.

```
VITE_USE_MOCK=false
VITE_API_BASE=https://api.example.com
```

`VITE_USE_MOCK=false`로 빌드하면 mock 코드는 번들에 포함되지 않습니다.

## 구조

```
src/
  api/          데이터 접근 계층 — 화면은 이것만 사용
    types.ts      API 계약(PRD 6장). F5에서 API 명세로 승격
    client.ts     fetch 래퍼 (mock/실서버 구분 없음)
    services.ts   서비스 함수 + TanStack Query 훅
  mocks/        mock 서버 (MSW) — 화면 코드에서 참조하지 않음
    seed/         조직(팀 37·지점 70), 가상 사용자 12명, 양식 정의, 표본 게시글·결재 문서
    handlers/     권한 검사(403), 채번, 결재 상태 전이
    db.ts         localStorage 저장·초기화
  components/   레이아웃, 공통 UI, 첨부, 개발용 도구
  pages/        board/ (S-01~04), approval/ (S-10~23), LoginPage (S-00)
  lib/          날짜, 양식(제목 템플릿·검증 스키마)
```

## 시나리오 확인용 사용자

| 사용자 | 소속 | 용도 |
|---|---|---|
| 김하늘 사원 | 전산팀 | 본사 팀원 (지점게시판 없음) |
| 박준호 팀장 | 전산팀 | 결재자 (미결 1건) |
| 최민준 사원 | 영업1팀 서초점 | 지점 직원, 기안자 |
| 정다은 지점장 | 영업1팀 서초점 | 결재자 (미결 2건) |
| 한지우 계장 | 영업1팀 잠실점 | 다른 지점 직원 |
| 윤성민 팀장 | 영업1팀 | 2차 결재자 |
| 강태현 관리이사 | 기획실 | 최종 결재자 (미결 2건) |

## 양식 추가 (AP-02a)

`src/mocks/seed/forms.ts`에 `enabled: true`와 `fields`(및 필요하면 `titleTemplate`)를 추가하면 작성 화면이 자동으로 생깁니다. B 단계에서는 같은 정의를 서버가 `GET /api/approval/forms/:id`로 내려줍니다.
