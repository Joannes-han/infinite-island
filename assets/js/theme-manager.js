// assets/js/theme-manager.js

// 1. 초기화 함수 (페이지 로드 시 실행)
export function initTheme() {
    const body = document.body;
    
    // 로컬 스토리지에서 기존 키값('infinite_theme') 확인
    const savedTheme = localStorage.getItem('infinite_theme'); 

    // 기존 클래스 싹 지우기 (초기화)
    body.classList.remove('light-mode', 'beige-mode', 'dark-mode');

    // 저장된 값이 있으면 클래스 추가 (예: 'light' -> 'light-mode')
    if (savedTheme) {
        body.classList.add(savedTheme + '-mode');
    }
    
    // 버튼 텍스트 업데이트
    updateThemeButtonText(savedTheme);
}

// 2. 버튼 이벤트 연결 (여기가 핵심!)
export function setupThemeToggle() {
    // ★ [수정] ID가 'themeToggle'이든 'themeToggleBtn'이든 하나라도 걸리면 가져옴
    const themeToggleBtn = document.getElementById('themeToggle') || document.getElementById('themeToggleBtn');
    
    // 버튼이 없으면 중단 (에러 방지)
    if (!themeToggleBtn) {
        console.warn("테마 변경 버튼을 찾을 수 없습니다."); 
        return;
    }

    themeToggleBtn.onclick = (e) => {
        // a 태그일 경우 페이지 이동 방지
        if(e.target.tagName === 'A' || e.currentTarget.tagName === 'A') {
            e.preventDefault();
        }

        const body = document.body;
        let newTheme = ''; // 저장할 값 (light, beige, dark)

        // 순서: Dark -> Light -> Beige -> Dark
        if (body.classList.contains('light-mode')) {
            // Light -> Beige
            body.classList.remove('light-mode');
            body.classList.add('beige-mode');
            newTheme = 'beige';
        } else if (body.classList.contains('beige-mode')) {
            // Beige -> Dark
            body.classList.remove('beige-mode');
            newTheme = 'dark';
        } else {
            // Dark -> Light
            body.classList.add('light-mode');
            newTheme = 'light';
        }

        // 로컬 스토리지에 저장 (다른 페이지와 공유됨)
        localStorage.setItem('infinite_theme', newTheme);

        updateThemeButtonText(newTheme);
    };
}

// 3. 버튼 텍스트 업데이트
function updateThemeButtonText(mode) {
    // 여기도 두 가지 ID를 모두 찾음
    const btn = document.getElementById('themeToggle') || document.getElementById('themeToggleBtn');
    if (!btn) return;

    // mode값에 'light'가 포함되어 있으면 (light 또는 light-mode)
    if (mode && mode.includes('light')) {
        btn.innerHTML = '<i class="fa-solid fa-sun"></i> 화이트 모드';
    } else if (mode && mode.includes('beige')) {
        btn.innerHTML = '<i class="fa-solid fa-mug-hot"></i> 베이지 모드';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-moon"></i> 다크 모드';
    }
}