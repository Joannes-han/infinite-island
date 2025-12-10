import { supabase } from './supabase.js';

const TIER_ORDER = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F'];
let allPlayers = []; // ★ 데이터를 저장해둘 공간 (글로벌 변수)

document.addEventListener('DOMContentLoaded', () => {
    loadPlayersFromServer();
});

// 1. 서버에서 데이터 가져오기 (최초 1회)
async function loadPlayersFromServer() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    // 가져온 데이터를 메모리에 저장하고 화면 그리기
    allPlayers = data;
    renderAll();
}

// 2. 화면 그리기 (메모리에 있는 allPlayers 기반으로)
function renderAll() {
    const presentList = document.getElementById('present-list');
    const absentList = document.getElementById('absent-list');
    
    // 초기화
    presentList.innerHTML = '';
    absentList.innerHTML = '';

    // 분류
    const presentPlayers = allPlayers.filter(p => p.status === 'present');
    const absentPlayers = allPlayers.filter(p => p.status !== 'present');

    // 그리기
    renderColumn(presentList, presentPlayers, 'present');
    renderColumn(absentList, absentPlayers, 'absent');

    // 숫자 업데이트
    document.getElementById('totalCount').textContent = allPlayers.length;
    document.getElementById('presentCount').textContent = presentPlayers.length;
    document.getElementById('absentCount').textContent = absentPlayers.length;
}

// 3. 컬럼 렌더링 함수
function renderColumn(container, players, type) {
    const grouped = {};
    TIER_ORDER.forEach(t => grouped[t] = []);
    grouped['Unranked'] = [];

    players.forEach(p => {
        const t = p.tier ? p.tier.toUpperCase() : 'Unranked';
        if (grouped[t]) grouped[t].push(p);
        else grouped['Unranked'].push(p);
    });

    [...TIER_ORDER, 'Unranked'].forEach(tier => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'tier-group-small';

        const tierColor = getComputedStyle(document.documentElement).getPropertyValue(`--tier-${tier.toLowerCase()}`) || '#777';
        const count = grouped[tier].length;
        const countColor = count > 0 ? '#fff' : '#444';

        groupDiv.innerHTML = `
            <div class="tier-label" style="border-left-color: ${tierColor}; color: ${tierColor};">
                ${tier} <span style="font-size: 12px; color: ${countColor}; margin-left: 5px;">(${count})</span>
            </div>
            <div class="player-chips-area"></div>
        `;

        const chipsArea = groupDiv.querySelector('.player-chips-area');

        if (count > 0) {
            grouped[tier].forEach(player => {
                const chip = document.createElement('div');
                chip.className = 'player-chip';
                
                // 디자인 (색깔 점 + 이름 + 티어)
                chip.innerHTML = `
                    <span class="status-dot"></span>
                    <span class="player-name">${player.name}</span>
                    <span class="tier-suffix">(${tier})</span>
                `;

                // 클릭 이벤트
                chip.onclick = () => movePlayerOptimistic(player, type);
                chipsArea.appendChild(chip);
            });
        } else {
            chipsArea.innerHTML = '<span class="empty-msg" style="color:#333; font-size:12px; padding:5px;">-</span>';
        }

        container.appendChild(groupDiv);
    });
}

// ★ 핵심: 딜레이 없는 이동 함수 (Optimistic Update)
async function movePlayerOptimistic(targetPlayer, currentType) {
    const newStatus = (currentType === 'present') ? 'absent' : 'present';

    // 1. [즉시 반영] 메모리 상의 데이터 수정
    const playerIndex = allPlayers.findIndex(p => p.id === targetPlayer.id);
    if (playerIndex !== -1) {
        allPlayers[playerIndex].status = newStatus;
    }

    // 2. [즉시 반영] 화면 다시 그리기 (Local이라서 순식간에 됨)
    renderAll();

    // 3. [뒷단 처리] 실제 DB 업데이트는 나중에 천천히 함 (Background)
    const { error } = await supabase
        .from('players')
        .update({ status: newStatus })
        .eq('id', targetPlayer.id);

    // 만약 저장하다 에러가 나면? (롤백)
    if (error) {
        console.error("저장 실패, 원상복구 합니다.");
        alert("서버 저장 실패! 인터넷을 확인하세요.");
        
        // 실패했으니 다시 원래대로 돌려놓고 화면 갱신
        allPlayers[playerIndex].status = currentType; 
        renderAll();
    }
}