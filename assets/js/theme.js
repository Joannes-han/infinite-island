// assets/js/theme.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. 저장된 테마 불러오기
    const savedTheme = localStorage.getItem('infinite_theme') || 'dark';
    applyTheme(savedTheme);

    // 2. 테마 버튼 이벤트 연결
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
        updateButtonIcon(savedTheme);
    }
});

function applyTheme(themeName) {
    // 기존 클래스 제거
    document.body.classList.remove('light-mode', 'beige-mode');

    // 새 테마 적용
    if (themeName !== 'dark') {
        document.body.classList.add(`${themeName}-mode`);
    }
    
    // 저장
    localStorage.setItem('infinite_theme', themeName);
    updateButtonIcon(themeName);
}

function toggleTheme() {
    // 순서: Dark -> Light -> Beige -> Dark ...
    const current = localStorage.getItem('infinite_theme') || 'dark';
    let next = 'dark';

    if (current === 'dark') next = 'light';
    else if (current === 'light') next = 'beige';
    else next = 'dark';

    applyTheme(next);
}

function updateButtonIcon(themeName) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    // 아이콘과 텍스트 변경
    if (themeName === 'dark') {
        btn.innerHTML = '<i class="fa-solid fa-moon"></i> 다크 모드';
        btn.style.color = '#a0a0a0';
    } else if (themeName === 'light') {
        btn.innerHTML = '<i class="fa-solid fa-sun"></i> 화이트 모드';
        btn.style.color = '#f39c12'; // 해 색깔
    } else {
        btn.innerHTML = '<i class="fa-solid fa-mug-hot"></i> 베이지 모드';
        btn.style.color = '#8d6e63'; // 커피 색깔
    }
}