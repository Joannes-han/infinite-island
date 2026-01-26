import { supabase } from './supabase.js';
import { initTheme, setupThemeToggle } from './theme-manager.js';

// 티어 정렬 순서
const TIER_ORDER = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F', '닭', '나뭇가지'];
let allPlayers = []; 

document.addEventListener('DOMContentLoaded', () => {
    // 테마 설정
    if (typeof initTheme === 'function') initTheme();
    if (typeof setupThemeToggle === 'function') setupThemeToggle();

    loadPlayersFromServer();
});

// 1. 서버에서 데이터 가져오기
async function loadPlayersFromServer() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("데이터 로딩 실패:", error);
        return;
    }

    allPlayers = data;
    renderAll();
}

// 2. 화면 그리기
function renderAll() {
    const presentList = document.getElementById('present-list');
    const absentList = document.getElementById('absent-list');

    presentList.innerHTML = '';
    absentList.innerHTML = '';

    presentList.className = 'tier-stack-container';
    absentList.className = 'tier-stack-container';

    const presentPlayers = allPlayers.filter(p => p.status === 'present');
    const absentPlayers = allPlayers.filter(p => p.status !== 'present');

    renderColumn(presentList, presentPlayers, 'present');
    renderColumn(absentList, absentPlayers, 'absent');

    const totalEl = document.getElementById('totalCount');
    const presentEl = document.getElementById('presentCount');
    const absentEl = document.getElementById('absentCount');

    if(totalEl) totalEl.textContent = allPlayers.length;
    if(presentEl) presentEl.textContent = presentPlayers.length;
    if(absentEl) absentEl.textContent = absentPlayers.length;
}

// 3. 컬럼 렌더링 함수 (★ 빈 티어도 표시하도록 수정됨)
function renderColumn(container, players, type) {
    // [1] 그룹핑 준비
    const grouped = {};
    TIER_ORDER.forEach(t => grouped[t] = []);
    grouped['Unranked'] = [];

    // [2] 선수 분류
    players.forEach(p => {
        let t = p.tier ? p.tier.trim() : 'Unranked';
        
        if (t === 'Chicken') t = '닭';
        if (t === 'Stick') t = '나뭇가지';

        if (grouped[t]) grouped[t].push(p);
        else grouped['Unranked'].push(p);
    });

    // [3] 화면 그리기
    [...TIER_ORDER, 'Unranked'].forEach(tier => {
        const groupPlayers = grouped[tier];
        const count = groupPlayers.length;

        // ★ [수정 포인트] 예전에는 여기서 count === 0 이면 return 했지만,
        // 이제는 return 하지 않고 계속 진행해서 '빈 박스'라도 그립니다.
        
        // 이름순 정렬
        groupPlayers.sort((a, b) => a.name.localeCompare(b.name));

        // --- (A) 그룹 래퍼 ---
        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'tier-group-wrapper';

        // --- (B) 티어 헤더 ---
        let displayTierName = tier;
        if (tier === 'Chicken') displayTierName = '닭';
        if (tier === 'Stick') displayTierName = '나뭇가지';
        if (tier === 'Unranked') displayTierName = '미배정';

        const header = document.createElement('div');
        header.className = 'tier-group-header';
        
        // 인원이 0명일 때는 숫자 색을 흐릿하게 처리 (선택사항)
        const countColor = count === 0 ? 'var(--text-muted)' : 'var(--text-main)';
        
        header.innerHTML = `
            <span class="tier-name">${displayTierName}</span>
            <span class="tier-count" style="color:${countColor}">${count}</span>
        `;
        groupWrapper.appendChild(header);

        // --- (C) 그리드 생성 ---
        const grid = document.createElement('div');
        grid.className = 'attendance-grid'; 

        // ★ [수정 포인트] 인원이 있으면 카드 생성, 없으면 '빈 상태' 표시
        if (count > 0) {
            groupPlayers.forEach(player => {
                const card = document.createElement('div');
                card.className = 'att-card';
                if (type === 'present') card.classList.add('status-in');
                else card.classList.add('status-out');

                card.onclick = () => movePlayerOptimistic(player, type);

                const imgHtml = player.image_url 
                    ? `<img src="${player.image_url}" class="att-card-img" alt="${player.name}">` 
                    : `<div class="att-card-img-placeholder"><i class="fa-solid fa-user"></i></div>`;

                const badgeText = player.tier || '-';
                const tierClass = player.tier ? `badge-${player.tier.toLowerCase()}` : 'badge-unranked';

                card.innerHTML = `
                    <div class="att-card-left">
                        ${imgHtml}
                        <div class="att-info">
                            <span class="att-name">${player.name}</span>
                            <span class="att-tier ${tierClass}">${badgeText}</span>
                        </div>
                    </div>
                    <div class="att-card-right">
                        <div class="status-led"></div>
                        <span class="status-text">${type === 'present' ? '출근' : '퇴근'}</span>
                    </div>
                `;
                grid.appendChild(card);
            });
        } else {
            // ★ 인원이 0명일 때 보여줄 빈 박스
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-tier-msg';
            emptyMsg.textContent = ''; // 여기에 "인원 없음" 이라고 적어도 됩니다.
            grid.appendChild(emptyMsg);
        }

        groupWrapper.appendChild(grid);
        container.appendChild(groupWrapper);
    });
}

// 4. 이동 함수 (기존 유지)
async function movePlayerOptimistic(targetPlayer, currentType) {
    const newStatus = (currentType === 'present') ? 'absent' : 'present';

    const playerIndex = allPlayers.findIndex(p => p.id === targetPlayer.id);
    if (playerIndex !== -1) {
        allPlayers[playerIndex].status = newStatus;
    }

    renderAll();

    const { error } = await supabase
        .from('players')
        .update({ status: newStatus })
        .eq('id', targetPlayer.id);

    if (error) {
        console.error("저장 실패");
        alert("서버 저장 실패!");
        if (playerIndex !== -1) {
            allPlayers[playerIndex].status = currentType;
        }
        renderAll();
    }
}