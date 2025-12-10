// supabase.js에서 supabase 도구 가져오기
import { supabase } from './supabase.js';

// 테스트 함수: 선수 명단 불러오기
async function testConnection() {
    console.log("📡 DB에서 선수 명단 불러오는 중...");
    
    // 'players' 테이블의 모든(*) 데이터를 가져와라
    const { data, error } = await supabase
        .from('players')
        .select('*');

    if (error) {
        console.error("❌ 에러 발생:", error);
    } else {
        console.log("✅ 데이터 수신 성공!", data);
        alert(`DB 연결 성공! 등록된 선수: ${data.length}명\n첫 번째 선수: ${data[0].name}`);
    }
}

// 페이지 로드 시 테스트 실행 (테스트 끝나면 지울 예정)
window.onload = testConnection;