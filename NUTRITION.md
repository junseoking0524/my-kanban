# diet_obokpapa — summary sync update

This section supersedes the earlier local-only notes below.

- Input page: `/nutrition.html`. Kanban summary: `/?view=nutrition`.
- Existing Google Sheets service-account configuration is reused. The server creates only a new tab: `diet_obokpapa_preview` for preview and `diet_obokpapa` for production. Existing work/personal/mandala tabs are untouched.
- Set server-only `DIET_ACCESS_PASSWORD` (a unique randomly generated password of at least 24 characters) before enabling sync. This is an app password, never a GitHub/Google/Vercel account password. Store as Secret. Do not put it in source code or any VITE variable.
- The password also protects AES-256-GCM data encryption. Do not replace it after records exist without decrypt/re-encrypt migration; an arbitrary change makes earlier records unreadable. Keep it in a password manager.
- The API is fail-closed until configured. Login uses an HttpOnly Secure SameSite cookie, valid for 30 days. POSTs must be same-origin JSON. There is no wildcard CORS.
- Only daily macro totals, missing-nutrient counts, weights, water, sleep, exercise summary, completed-set count/volume, supplement taken labels and goals are uploaded. No food names, meal items, menus, photos, supplement doses/ingredients or exercise-set details are sent.
- One input browser is bound on the first accepted save. Other browsers can log in to read the summary. This release does NOT support switching the input device or merging edits across multiple input devices. Keep JSON backups of the input browser; server aggregates cannot restore meal details.
- In the input page, click Connect once (or Existing login after reopening). While open, changes are sent every 5 seconds; the dashboard reads every 30 seconds after connecting. The app does not run in the background after Safari is closed.
- A persistent pending operation ID supports retry after a lost network response. Sheets append order and base revisions reject conflicting snapshots and prevent stale overwrite; conflicts stop automatic upload. Local input stays intact.
- Preview and production tabs are separate. Testing a preview never writes the production diet tab. First production connection must be made on the husband's chosen input browser (Safari or its home-screen app).
- Current release gate: TypeScript build, Vite build and 16 tests pass. Live Sheets read/write verification remains pending until the app-specific password is configured and the preview is redeployed. No claim of live sync completion is made before that check.
- Fleek API import is not connected. Screenshot/JSON/manual workout entry remains available. Image recognition still requires its separate provider configuration.

---

# 식단·운동 탭

남편의 근육 증가와 체중 감량을 함께 기록하는 모바일 우선 화면입니다. 기존 칸반/만다라트/플래닝 데이터 및 API는 수정하지 않습니다.

## 화면 분리

- 칸반의 식단·운동 탭: 요약 표시만 하는 `src/NutritionDashboard.tsx`
- 별도 입력·관리 페이지: `nutrition.html` → `src/nutrition-main.tsx` → `src/NutritionView.tsx`
- 같은 사이트/브라우저 저장공간을 공유합니다. 대시보드는 저장 변경 및 화면 복귀 시 갱신합니다. 서버/기기간 자동 동기화는 아닙니다.
- Vite 다중 HTML 진입점으로 두 화면을 별도로 빌드합니다. 입력 페이지의 홈 화면 시작 주소는 `/nutrition.html`입니다.

## 사용

- 기존 대시보드의 `식단·운동` 탭 또는 `/?view=nutrition`에서 요약을 봅니다. `입력·관리 열기`를 누르면 `/nutrition.html`이 새 탭으로 열립니다.
- 설정에서 실제 갈갈이 재료량 및 개인 목표를 입력합니다. 목표는 기본적으로 비어 있습니다.
- 날짜별 체중·음식 분량·운동·물·취침·보충제 체크가 브라우저 localStorage의 별도 키 `austin-nutrition-v1`에 저장됩니다.
- 전날 취침 전 체중은 실제 전날 레코드에 저장됩니다. 공복 평균은 미기록일을 제외합니다.
- CSV는 분석용, JSON은 전체 복원용입니다. JSON 복원은 확인 후 현재 식단 데이터를 교체합니다.
- Google Drive 자동 동기화는 구현하지 않았습니다. CSV 또는 JSON을 내려받아 Drive에 보관하거나 Claude에 첨부할 수 있습니다.
- Safari 공유 메뉴에서 홈 화면에 추가합니다. 입력 페이지의 manifest는 별도 `/nutrition.html`로 시작합니다. 오프라인 캐시는 제공하지 않으며 최초 실행에는 네트워크가 필요합니다. 브라우저/홈 화면 간 저장공간이 다르면 JSON 백업으로 이동합니다.

## 사진은 저장하지 않음

사진은 브라우저에서 JPEG로 크기를 줄여 `/api/nutrition-image`에 전송하며, 서버는 Claude Messages API에 한 번 전달합니다. 앱 DB, localStorage, 파일 백업에는 이미지나 base64를 저장하지 않습니다. 외부 API 제공자의 데이터 처리/보존 정책은 별도로 적용됩니다. 인식 결과를 사용자가 확인한 뒤 날짜별 메뉴 데이터만 저장합니다.

다음 Vercel 환경 변수가 필요합니다. 실제 값은 GitHub나 채팅에 올리지 않습니다.

| 변수 | 용도 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API 키 (Claude 웹 구독과 별도) |
| `NUTRITION_CLAUDE_MODEL` | 해당 API 계정에서 사용 가능한 이미지 입력 지원 모델 ID |
| `NUTRITION_ACCESS_TOKEN` | 최소 24자의 무작위 접근 암호. 설정 화면에서 입력하며 메모리에서만 유지 |

설정하지 않으면 이미지 API는 503으로 닫히고, 화면의 Claude 요청문을 사용해 JSON 붙여넣기로 등록할 수 있습니다. 날짜가 불분명한 이미지, 비정상 출력은 저장하지 않습니다. 식단표에 영양값이 없다면 임의로 확정하지 않고 미확인으로 남기며, 사용자가 값을 입력할 수 있습니다.

접근 암호는 개인 사용용입니다. 다중 사용자 공개 서비스로 확장하려면 사용자 인증·계정별 데이터 저장·요청 제한을 추가해야 합니다. 건강 기록을 기존 공개 API로 전달하지 않습니다.

## 계산의 한계

기본 음식 및 갈갈이 수치는 일반 식품 참고 추정치이며 제품·조리법·기름·소스에 따라 달라집니다. 제품 라벨 기반 음식은 즐겨찾기로 별도 등록합니다. 미확인 영양소는 합계에 포함되지 않으며 UI/CSV에 표시됩니다. 운동 kcal는 워치 등에서 확인한 값만 기록하고 음식 열량에서 차감하지 않습니다. 보충제는 체크 기록이며 용량 처방을 하지 않습니다.

## 검증

```sh
npm ci
npm run build
npx tsc --noEmit -p tsconfig.app.json
node --test tests/nutrition.test.mjs
```

이미지 인식 실호출, Safari 실제 기기 검증은 API 환경 설정 및 기기에서 별도로 확인해야 합니다.


## 2026-10-18 추가 요구 반영

- 식단표는 이미지 붙여넣기 영역, 클립보드 읽기 버튼, 사진 선택 대체 경로를 지원합니다. 임시 미리보기 확인 후 서버 인식을 요청하며, 이미지는 저장하지 않습니다.
- 목표 체중은 시작 체중과 최근 7일 평균을 기준으로 0~100% 달성률을 표시합니다. 고정 마감일은 없습니다. 최근/이전 7일에 각각 3일 이상 기록되고 목표 방향으로 변화할 때만 최근 속도 기준 예상 남은 주수를 표시합니다. 예상치는 건강 권고나 보장된 일정이 아닙니다.
- 최근 30일 음식 추천은 메뉴명+기준 분량별 섭취 날짜 수로 정렬하고, 동률이면 최근 날짜를 우선합니다. 같은 날 여러 번 입력해도 빈도는 1일입니다. 내 메뉴 영양표에서 기준 분량·4대 수치·출처를 수정하거나 추천에서 숨길 수 있습니다. 변경은 미래 입력용이며 과거 식사 기록을 바꾸지 않습니다.
- 단백질을 주요 카드로 강조하고 탄수화물·지방을 함께 표시합니다. 예전 백업과 영양 미확인 항목을 지원하며, 미확인 수치를 실제 0g로 확정하지 않습니다. CSV에도 탄수화물/지방 및 미확인 항목을 표시합니다.
- 운동 상세: 종목·부위, 세트별 kg/반복수/완료, 총 볼륨, 최근 루틴 복사, 60/90/120초 휴식 타이머. Fleek 계정과 직접 연결하지 않습니다. Fleek 캡처를 이미지 인식하거나 Claude로 JSON 변환하여 미리보기 후 날짜별 기록을 가져옵니다. 같은 날짜는 확인 후 교체하므로 재가져오기 시 중복 누적하지 않습니다. 타이머는 앱 종료 후 알림을 제공하지 않습니다.
- 보충제는 제품명·종류·1회 섭취 분량·성분별 함량/단위·시점 메모로 등록합니다. 하루 체크는 등록한 1회 분량을 의미합니다. 등록은 복용 권고가 아니며, 용량을 자동 처방하지 않습니다.

### 실제 사용 전 필요한 정보

시작 체중/목표 체중, 자주 먹는 메뉴와 실제 분량/브랜드, Fleek 기록 캡처 또는 내보낸 표본, 보충제의 정확한 제품명과 성분표. 개인 데이터는 저장소에 커밋하지 않습니다.

### 기능 확인 출처

Fleek 공식 앱 설명: https://play.google.com/store/apps/details?id=com.primero.fleekfrontend&hl=ko
확인한 공식 공개 안내에서는 사용할 수 있는 계정 기록 API를 찾지 못했습니다. 이 앱이 Fleek 계정에서 자동으로 기록을 가져온다고 표현하지 않습니다.
