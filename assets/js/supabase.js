// assets/js/supabase.js

// 1. Supabase 라이브러리 로드 확인
if (!window.supabase) {
    alert("❌ HTML 헤더에 Supabase 스크립트가 없습니다!");
    throw new Error("Supabase library not found");
}
const { createClient } = window.supabase;

// ============================================================
// ★ 핵심: 현재 실행 중인 환경을 자동으로 감지합니다.
// localhost 또는 127.0.0.1이면 개발 모드(true)로 인식
// ============================================================
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ▼ 여기에 두 가지 키를 모두 적어두세요 (이제 헷갈릴 필요 없음!)
const CONFIG = {
    // 🚧 개발용 (V2 테스트용 - 내 컴퓨터에서만 작동)
    development: {
        url: 'https://etaijndzjiouxuoetwrw.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YWlqbmR6amlvdXh1b2V0d3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Njk2ODEsImV4cCI6MjA4MDM0NTY4MX0.4AfJBKixFFM934PSewUynkCUDZTLfLIR9VDT6oy-Mcc'
    },
    // ✅ 배포용 (V1 실제 운영용 - 깃허브에서만 작동)
    production: {
        url: 'https://cduroqwecrhfkhtgxwru.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdXJvcXdlY3JoZmtodGd4d3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTA4MTQsImV4cCI6MjA3OTMyNjgxNH0.BnobgRf_0A6wUVNv4pu9aTamPJt2GzLZtk80zHkxYw4'
    }
};

// 환경에 따라 알맞은 키 선택
const selected = isDev ? CONFIG.development : CONFIG.production;

// 클라이언트 생성
export const supabase = createClient(selected.url, selected.key);

// 콘솔에 현재 상태 출력 (확인용)
console.log(`🚀 무한섬 Manager 실행 중... [모드: ${isDev ? '🚧 개발(Dev)' : '✅ 배포(Prod)'}]`);
console.log(`🔗 연결된 DB: ${selected.url}`);