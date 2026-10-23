// assets/js/supabase.js

// 1. Supabase 라이브러리 로드 확인
if (!window.supabase) {
    alert("❌ HTML 헤더에 Supabase 스크립트가 없습니다!");
    throw new Error("Supabase library not found");
}
const { createClient } = window.supabase;

// V1은 Live Server와 배포 사이트에서 같은 운영 프로젝트를 사용한다.
// 이 키는 공개 anon 키이며, 서비스 역할 키를 브라우저에 넣으면 안 된다.
const CONFIG = {
    url: 'https://cduroqwecrhfkhtgxwru.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdXJvcXdlY3JoZmtodGd4d3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTA4MTQsImV4cCI6MjA3OTMyNjgxNH0.BnobgRf_0A6wUVNv4pu9aTamPJt2GzLZtk80zHkxYw4'
};

// 클라이언트 생성
export const supabase = createClient(CONFIG.url, CONFIG.key);

console.log(`🔗 무한섬 V1 운영 DB: ${CONFIG.url}`);
