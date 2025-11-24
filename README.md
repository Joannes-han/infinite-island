📝 무한섬 Manager (Eternal Return Scrim Manager)이터널 리턴(Eternal Return) 스트리머 내전 및 대회를 위한 올인원 관리 시스템입니다.
선수 티어 관리부터 팀 드래프트, 실시간 점수 집계, 그리고 명예의 전당 기록까지 모든 과정을 효율적으로 관리할 수 있습니다.

✨ 주요 기능 (Key Features)
1. 📊 대시보드 (Dashboard)실시간 현황: 현재 출석 인원과 출석률을 시각적으로 확인.티어 분포도: 참여 선수들의 티어 분포를 막대그래프로 분석.
2. Live 랭킹: 경기 진행 중 실시간 1등 팀 표시.Hall of Fame MVP: 역대 최다 우승자(GOAT) 프로필 하이라이트.2.
3. 👥 선수 및 출석 관리 (Player & Attendance)티어 관리: 드래그 앤 드롭으로 선수의 티어(SSS~F)와 코스트 조정.출/퇴근 체크: 클릭 한 번으로 참가/불참 상태 전환.직관적 UI: 출석한 선수와 퇴근한 선수를 좌우로 분리하여 관리.
 3. 🎲 팀 드래프트 (Team Draft)카드형 디자인: 선수 사진과 정보를 직관적인 카드 형태로 표시.
 4. 자동 배정 알고리즘: 코스트 밸런스를 고려한 Snake + Greedy + Random 알고리즘 탑재.
 5. 유연한 조작: 드래그 앤 드롭으로 수동 배치 및 선수 간 스왑(Swap) 지원.편의 기능: 팀 구성 텍스트 복사(디스코드 공유용), 팀 추가/제거 기능.
4. 🏆 경기 점수판 (Scoreboard)실시간 집계: 라운드별 점수 입력 시 총점 및 순위 자동 계산.
5. 화면 분할: 좌측(순위표)과 우측(입력판)을 분리하여 운영 편의성 극대화.체크포인트 룰: 우승 조건 달성 시 불꽃 아이콘(🔥) 표시 토글 지원.
6. 자동 저장: 입력 데이터는 실시간으로 DB에 저장.
7. 👑 명예의 전당 & 전적 검색 (History & Profile)히스토리: 역대 우승 팀 기록을 날짜순으로 열람.
8. 상세 보기: 기록 클릭 시 해당 회차의 전체 순위표가 아코디언 형태로 펼쳐짐.전적 분석: 선수별 총 게임 수, 우승 횟수, 승률, 평균 순위 등 상세 데이터 제공.랭킹: 최다 우승자 Top 10 리스트 제공.
9. 🎨 시스템 & 보안 (System)테마 변경: 다크(Dark), 화이트(Light), 베이지(Beige) 3가지 모드 지원.보안: 관리자 로그인 시스템 (Authentication) 및 페이지 접근 제어.
10. 배포: Electron을 통한 데스크톱 앱(.exe) 빌드 및 웹 호스팅 지원.
🛠 기술 스택 (Tech Stack)Frontend: HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript (ES6+)Backend / DB: Supabase (PostgreSQL, Auth)App Wrapper: Electron (데스크톱 애플리케이션 변환)Icons: Font Awesome 



📂 폴더 구조 (Project Structure)eternal-return-manager/
├── assets/
│   ├── css/
│   │   ├── style.css       # 공통 스타일 (레이아웃, 애니메이션)
│   │   ├── theme.css       # 테마 변수 (Dark/Light/Beige)
│   │   ├── draft.css       # 드래프트 페이지 스타일
│   │   ├── score.css       # 점수판 스타일
│   │   ├── ...             # 기타 페이지별 CSS
│   └── js/
│       ├── supabase.js     # DB 연결 설정
│       ├── auth.js         # 로그인/보안 처리
│       ├── theme.js        # 테마 변경 로직
│       ├── draft.js        # 드래프트 로직 (알고리즘 포함)
│       ├── ...             # 기타 페이지별 JS
├── index.html              # 대시보드
├── draft.html              # 팀 드래프트
├── attendance.html         # 출석 관리
├── tiers.html              # 티어 관리
├── score.html              # 점수판
├── hall_of_fame.html       # 명예의 전당
├── profile.html            # 전적 검색
├── login.html              # 로그인 페이지
├── main.js                 # Electron 메인 프로세스
└── package.json            # 프로젝트 설정 및 의존성
💾 데이터베이스 스키마 (Supabase)이 프로젝트를 실행하려면 Supabase에 다음 3개의 테이블이 필요합니다.1. players (선수 정보)ColumnTypeDescriptionidint8Primary Keynametext선수 닉네임tiertext티어 (SSS, SS...)costint2코스트 비용statustext상태 ('present', 'waiting' 등)team_idint2현재 배정된 팀 번호image_urltext프로필 사진 URL2. scores (실시간 점수)ColumnTypeDescriptionidint8Primary Keyteam_idint2팀 번호roundint2라운드 번호 (1, 2...)scoreint2획득 점수3. hall_of_fame (명예의 전당)ColumnTypeDescriptionidint8Primary Keycreated_attimestamp대회 날짜team_nametext우승 팀 이름 (예: 10회차 우승팀)memberstext우승 멤버 문자열total_scorenumeric총점 (소수점 포함 가능)match_detailjsonb전체 순위 상세 데이터 (JSON)🚀 설치 및 실행 (Installation)1. 사전 준비Node.js 설치 (LTS 버전 권장)Supabase 프로젝트 생성 및 API Key 발급2. 프로젝트 설정assets/js/supabase.js 파일에 본인의 Supabase 키를 입력하세요.JavaScriptconst SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
3. 개발 모드 실행Bash# 의존성 설치
npm install

# Electron 앱 실행
npm start
4. 실행 파일 빌드 (.exe)윈도우용 설치 파일을 생성합니다.Bashnpm run build
빌드가 완료되면 dist 폴더 안에 설치 파일이 생성됩니다.📝 LicenseDesigned for Eternal Return Community.Developed by [체하윤].
