// assets/js/supabase.js

// 1. 안전장치: HTML에서 라이브러리가 잘 로드됐는지 확인
if (!window.supabase) {
    alert("❌ Supabase 라이브러리가 로드되지 않았습니다!\nHTML 파일 <head>에 스크립트 태그가 있는지 확인해주세요.");
    throw new Error("Supabase Library Not Found");
}

// 2. 전역 객체에서 createClient 꺼내오기 (인터넷 요청 X, 내장된 것 사용 O)
const { createClient } = window.supabase;

// ==========================================
// ★ 여기에 본인의 주소와 키를 입력해주세요! (따옴표 필수)
// ==========================================
const SUPABASE_URL = 'https://cduroqwecrhfkhtgxwru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdXJvcXdlY3JoZmtodGd4d3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTA4MTQsImV4cCI6MjA3OTMyNjgxNH0.BnobgRf_0A6wUVNv4pu9aTamPJt2GzLZtk80zHkxYw4';

// 3. 클라이언트 생성 및 내보내기
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Supabase 연결 성공 (Script Tag 방식)");