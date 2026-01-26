import { supabase } from './supabase.js';
import { initTheme, setupThemeToggle } from './theme-manager.js';

// 전역 변수
let allPlayers = [];
let currentSortMode = 'tier'; // 기본 정렬: 티어순

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 테마 초기화
    if (typeof initTheme === 'function') initTheme();
    if (typeof setupThemeToggle === 'function') setupThemeToggle();

    // ============================================================
    // ★ [핵심] 로그인 여부에 따라 '메뉴'와 '버튼' 보여주기
    // ============================================================
    const { data: { session } } = await supabase.auth.getSession();
    
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // 숨겨진 메뉴들 가져오기
    const authItems = document.querySelectorAll('.auth-required');

    if (session) {
        // [로그인 O] 
        // 1. 로그아웃 버튼 켜기
        if (logoutBtn) logoutBtn.style.display = 'flex';
        setupLogout(); 

        // 2. 숨겨진 관리자 메뉴들 싹 다 보여주기
        authItems.forEach(item => item.style.display = 'block');

    } else {
        // [로그인 X] 
        // 1. 로그인 버튼 켜기
        if (loginBtn) loginBtn.style.display = 'flex';
        
        // 2. 관리자 메뉴는 이미 HTML에서 display: none 되어 있으므로 그대로 둠
    }

    // 2. 정렬 버튼 초기 상태 설정
    updateSortButtonState();

    // 3. 정렬 버튼 이벤트 연결
    const btnName = document.getElementById('btnSortName');
    const btnTier = document.getElementById('btnSortTier');
    if(btnName) btnName.addEventListener('click', () => setSortMode('name'));
    if(btnTier) btnTier.addEventListener('click', () => setSortMode('tier'));

    // 4. 데이터 불러오기
    loadStreamers();
    
    // 5. 검색 기능 연결
    setupSearch();
});

// ============================================================
// 정렬 모드 변경
// ============================================================
function setSortMode(mode) {
    currentSortMode = mode;
    updateSortButtonState();
    renderStreamers(allPlayers);
}

function updateSortButtonState() {
    const btnName = document.getElementById('btnSortName');
    const btnTier = document.getElementById('btnSortTier');
    
    if (!btnName || !btnTier) return;

    if (currentSortMode === 'name') {
        btnName.classList.add('active');
        btnTier.classList.remove('active');
    } else {
        btnName.classList.remove('active');
        btnTier.classList.add('active');
    }
}

// ============================================================
// 데이터 불러오기 (함수명: loadStreamers)
// ============================================================
async function loadStreamers() {
    const grid = document.getElementById('streamerGrid');
    if (!grid) return;

    // DB에서 가져오기
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

// ============================================================
// 화면 그리기 (티어순 / 이름순)
// ============================================================
function renderStreamers(players) {
    const grid = document.getElementById('streamerGrid');
    if (!grid) return;
    
    grid.innerHTML = ''; 

    if (players.length === 0) {
        grid.innerHTML = '<p class="no-data">표시할 스트리머가 없습니다.</p>';
        return;
    }

    // [A] 이름순 정렬 모드
    if (currentSortMode === 'name') {
        const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));
        sorted.forEach(player => {
            grid.appendChild(createCard(player));
        });
    } 
    // [B] 티어순 정렬 모드
    else {
        // 티어 순서 정의
        const tierOrder = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F', '닭', '나뭇가지'];
        
        tierOrder.forEach(tier => {
            // 해당 티어인 선수들만 필터링 (영어/한글 처리)
            const group = players.filter(p => {
                let pTier = p.tier ? p.tier.trim() : '';
                if (pTier === 'Chicken') pTier = '닭';
                if (pTier === 'Stick') pTier = '나뭇가지';
                return pTier === tier;
            });
            
            if (group.length > 0) {
                // (1) 구분선 추가
                const divider = document.createElement('div');
                divider.className = 'tier-divider';
                
                let icon = '<i class="fa-solid fa-ranking-star"></i>';
                if(tier === '닭') icon = '<i class="fa-solid fa-drumstick-bite"></i>';
                if(tier === '나뭇가지') icon = '<i class="fa-solid fa-tree"></i>';

                divider.innerHTML = `${icon} ${tier} Tier`;
                grid.appendChild(divider);

                // (2) 카드 추가 (내부 이름순)
                group.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
                    grid.appendChild(createCard(p));
                });
            }
        });
    }
}

// ============================================================
// 카드 HTML 생성 함수
// ============================================================
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

// ============================================================
// 검색 기능
// ============================================================
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

// ============================================================
// 로그아웃 기능
// ============================================================
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    // 이벤트 중복 방지를 위해 기존 리스너 제거 방식 대신, onclick 속성 사용 고려
    // 또는 단순하게 addEventListener 사용 (여기서는 단순화)
    logoutBtn.onclick = async (e) => {
        e.preventDefault();
        if (confirm("정말 로그아웃 하시겠습니까?")) {
            const { error } = await supabase.auth.signOut();
            if (!error) {
                // 로그아웃 후 새로고침 (그러면 로그인 버튼이 보이게 됨)
                window.location.reload();
            } else {
                alert("로그아웃 실패");
            }
        }
    };
}