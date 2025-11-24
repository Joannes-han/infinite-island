// === Supabase 설정 ===

// 1. Supabase 라이브러리 로드 (CDN 방식)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 2. 내 프로젝트 키 설정 (Settings > API에서 확인)
// 주의: 이 키는 브라우저에 노출되므로 'anon' 키만 사용해야 합니다. (service_role 키 절대 금지)
const SUPABASE_URL = 'https://cduroqwecrhfkhtgxwru.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdXJvcXdlY3JoZmtodGd4d3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTA4MTQsImV4cCI6MjA3OTMyNjgxNH0.BnobgRf_0A6wUVNv4pu9aTamPJt2GzLZtk80zHkxYw4';

// 3. 클라이언트 생성 및 내보내기
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 4. 연결 테스트 로그
console.log("✅ Supabase 연결 모듈 로드됨");