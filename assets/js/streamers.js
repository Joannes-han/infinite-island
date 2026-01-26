import { supabase } from './supabase.js';

// 전역 변수로 데이터 저장
let allPlayers = [];
// ★ 수정 1: 기본 정렬 모드를 'tier'로 변경
let currentSortMode = 'tier'; 

document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme(); 
    
    // 버튼 초기 상태 설정 (티어순이 Active 되도록)
    updateSortButtonState();

    loadStreamers();   
    setupSearch();     
    setupThemeToggle(); 
    setupLogout();     

    // 정렬 버튼 이벤트 연결
    document.getElementById('btnSortName').addEventListener('click', () => setSortMode('name'));
    document.getElementById('btnSortTier').addEventListener('click', () => setSortMode('tier'));
});

// 정렬 모드 변경 함수
function setSortMode(mode) {
    currentSortMode = mode;
    updateSortButtonState();
    renderStreamers(allPlayers);
}

// 버튼 스타일 업데이트 함수
function updateSortButtonState() {
    const btnName = document.getElementById('btnSortName');
    const btnTier = document.getElementById('btnSortTier');
    
    if (currentSortMode === 'name') {
        btnName.classList.add('active');
        btnTier.classList.remove('active');
    } else {
        btnName.classList.remove('active');
        btnTier.classList.add('active');
    }
}

// 데이터 불러오기
async function loadStreamers() {
    const grid = document.getElementById('streamerGrid');
    if (!grid) return;

    const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("로딩 실패:", error);
        grid.innerHTML = '<p class="error-msg">데이터를 불러오지 못했습니다.</p>';
        return;
    }

    allPlayers = players;
    renderStreamers(allPlayers);
}

// ★ 화면 그리기 함수
function renderStreamers(players) {
    const grid = document.getElementById('streamerGrid');
    grid.innerHTML = ''; 

    if (players.length === 0) {
        grid.innerHTML = '<p class="no-data">표시할 스트리머가 없습니다.</p>';
        return;
    }

    // A. 이름순 정렬 모드
    if (currentSortMode === 'name') {
        const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));
        sorted.forEach(player => {
            const card = createCard(player);
            grid.appendChild(card);
        });
    } 
    // B. 티어순 정렬 모드
    else {
        // ★ 수정 2: '나뭇가지', '닭' 추가 (높은 티어 -> 낮은 티어 순서)
        const tierOrder = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F', '나뭇가지', '닭'];
        
        tierOrder.forEach(tier => {
            // 해당 티어인 선수들만 필터링
            const group = players.filter(p => p.tier === tier);
            
            if (group.length > 0) {
                // (1) 구분선 추가
                const divider = document.createElement('div');
                divider.className = 'tier-divider';
                
                // 나뭇가지/닭 일때는 아이콘을 조금 다르게 (선택사항)
                let icon = '<i class="fa-solid fa-ranking-star"></i>';
                if(tier === '닭') icon = '<i class="fa-solid fa-drumstick-bite"></i>';
                if(tier === '나뭇가지') icon = '<i class="fa-solid fa-tree"></i>';

                divider.innerHTML = `${icon} ${tier} Tier`;
                grid.appendChild(divider);

                // (2) 카드 추가 (내부에서 이름순 정렬)
                group.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
                    const card = createCard(p);
                    grid.appendChild(card);
                });
            }
        });

        // ★ 수정 2: '언랭크(미배정)'는 아예 렌더링하지 않음 (코드 삭제됨)
    }
}

// 카드 생성 함수
function createCard(player) {
    const card = document.createElement('div');
    card.className = 'streamer-card';
    
    card.addEventListener('click', () => {
        let targetUrl = player.site_url;
        if (!targetUrl) {
            const searchName = player.ingame_name || player.name;
            targetUrl = `https://dak.gg/er/players/${encodeURIComponent(searchName)}`;
        }
        window.open(targetUrl, '_blank');
    });

    const imgHtml = player.image_url 
        ? `<img src="${player.image_url}" alt="${player.name}" class="st-img">`
        : `<div class="st-img-placeholder"><i class="fa-solid fa-user"></i></div>`;

    const tierBadge = player.tier 
        ? `<span class="st-tier badge-${player.tier.toLowerCase()}">${player.tier}</span>` 
        : '';

    card.innerHTML = `
        ${imgHtml}
        ${tierBadge}
        <div class="st-info">
            <div class="st-name">${player.name}</div>
            <div class="st-ingame">
                <i class="fa-solid fa-gamepad"></i> 
                ${player.ingame_name || '-'}
            </div>
        </div>
        <div class="st-action">
            <span>전적 검색</span>
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </div>
    `;
    return card;
}

// 검색 기능
function setupSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;

    input.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase().trim();
        
        if (keyword === '') {
            renderStreamers(allPlayers); 
            return;
        }

        const filtered = allPlayers.filter(p => {
            const name = p.name.toLowerCase();
            const ingame = (p.ingame_name || '').toLowerCase();
            return name.includes(keyword) || ingame.includes(keyword);
        });

        const grid = document.getElementById('streamerGrid');
        grid.innerHTML = '';
        if(filtered.length === 0) {
            grid.innerHTML = '<p class="no-data">검색 결과가 없습니다.</p>';
        } else {
            filtered.forEach(p => grid.appendChild(createCard(p)));
        }
    });
}

// ===================== (기존 테마/로그아웃 유지) =====================

function applySavedTheme() {
    const savedTheme = localStorage.getItem('infinite_theme');
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    updateThemeIcon();
}

function setupThemeToggle() {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (!themeBtn) return;
    themeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('infinite_theme', isDarkMode ? 'dark' : 'light');
        updateThemeIcon();
    });
}

function updateThemeIcon() {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (!themeBtn) return;
    const icon = themeBtn.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        if(icon) icon.className = 'fa-solid fa-sun';
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i> 라이트 모드';
    } else {
        if(icon) icon.className = 'fa-solid fa-moon';
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i> 다크 모드';
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm("정말 로그아웃 하시겠습니까?")) {
            const { error } = await supabase.auth.signOut();
            window.location.href = 'login.html'; 
        }
    });
}