import { supabase } from './supabase.js';

let allPlayers = [];
let currentTeamCount = 6; // 기본 6팀
const MAX_PLAYERS_PER_TEAM = 3; // 최대 3명 제한

document.addEventListener('DOMContentLoaded', () => {
    setupInitialLayout();
    loadDraftData();
    setupEvents();
});

// 1. 초기 레이아웃 설정
function setupInitialLayout() {
    const container = document.getElementById('teams-container');
    container.innerHTML = '';
    for (let i = 1; i <= currentTeamCount; i++) {
        createTeamSlot(i);
    }
    // 대기실의 모든 티어 박스에 드롭존 설정
    document.querySelectorAll('.tier-body-pool').forEach(setupDropZone);
}

// 팀 슬롯 생성 함수
function createTeamSlot(teamNum) {
    const container = document.getElementById('teams-container');
    const teamDiv = document.createElement('div');
    teamDiv.className = 'team-card';
    teamDiv.id = `team-card-${teamNum}`;
    teamDiv.innerHTML = `
        <div class="team-header">
            <span class="team-name">Team ${teamNum}</span>
            <div class="team-info-group">
                <span class="team-count" id="count-team-${teamNum}">[0/${MAX_PLAYERS_PER_TEAM}]</span>
                <span class="team-cost" id="cost-team-${teamNum}">Total: <b>0</b></span>
            </div>
        </div>
        <div class="team-slots" id="team-${teamNum}" data-team-id="${teamNum}"></div>
    `;
    container.appendChild(teamDiv);
    setupDropZone(teamDiv.querySelector('.team-slots'));
}

// 2. 데이터 불러오기
async function loadDraftData() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('status', 'present')
        .order('cost', { ascending: false }) 
        .order('name', { ascending: true });

    if (error) { console.error(error); return; }
    allPlayers = data;
    renderPlayers();
}

// 3. 선수 배치
function renderPlayers() {
    // 구역 비우기
    document.querySelectorAll('.tier-body-pool').forEach(el => el.innerHTML = '');
    for (let i = 1; i <= currentTeamCount; i++) {
        const slot = document.getElementById(`team-${i}`);
        if(slot) slot.innerHTML = '';
    }

    allPlayers.forEach(player => {
        const chip = createPlayerChip(player);
        
        if (player.team_id && player.team_id >= 1 && player.team_id <= currentTeamCount) {
            document.getElementById(`team-${player.team_id}`).appendChild(chip);
        } else {
            const tierKey = (player.tier || 'Unranked').toLowerCase();
            const targetPool = document.getElementById(`pool-${tierKey}`);
            if (targetPool) targetPool.appendChild(chip);
        }
    });

    updateAllTeamInfo();
    updatePoolCount();
}

// ★ 핵심 수정: 선수 칩 생성 (카드형 디자인 + 클릭 이벤트)
function createPlayerChip(player) {
    const div = document.createElement('div');
    div.className = 'player-chip';
    div.draggable = true;
    div.dataset.id = player.id;
    div.dataset.cost = player.cost || 0;
    div.dataset.name = player.name;

    // 이미지 처리
    const imgContent = player.image_url 
        ? `<img src="${player.image_url}" style="width:100%; height:100%; object-fit:cover;">` 
        : `<i class="fa-solid fa-user"></i>`;

    div.innerHTML = `
        <div class="chip-img-box">
            ${imgContent}
        </div>
        <div class="chip-info">
            <span class="chip-name">${player.name}</span>
            <div class="chip-meta">
                <span class="chip-tier" style="color:var(--accent-gold)">${player.tier || '-'}</span>
                <span class="chip-cost" style="color:#aaa; margin-left:4px;">(${player.cost})</span>
            </div>
        </div>
    `;

    // === 드래그 이벤트 ===
    div.addEventListener('dragstart', (e) => {
        div.classList.add('dragging');
        e.dataTransfer.setData('text/plain', player.id); // 드래그된 ID 저장
        e.dataTransfer.effectAllowed = "move";
    });

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
        // 모든 스왑 타겟 효과 제거
        document.querySelectorAll('.swap-target').forEach(el => el.classList.remove('swap-target'));
    });

    // === ★ 스왑(Swap) 관련 이벤트 추가 ★ ===
    
    // 1. 누군가 내 위로 올라왔을 때 (Swap 가능 표시)
    div.addEventListener('dragover', (e) => {
        e.preventDefault(); // 이걸 해야 drop이 됨
        e.stopPropagation(); // 부모(팀 박스)의 dragover 막기
        
        const draggingCard = document.querySelector('.dragging');
        // 자기 자신 위에는 표시 안 함
        if (draggingCard && draggingCard !== div) {
            div.classList.add('swap-target');
        }
    });

    // 2. 나갔을 때 (표시 제거)
    div.addEventListener('dragleave', (e) => {
        div.classList.remove('swap-target');
    });

    // 3. 내 위에 떨어졌을 때 (Swap 실행!)
    div.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation(); // 부모(팀 박스)의 drop 이벤트가 발동하지 않게 막음 (중요!)
        div.classList.remove('swap-target');

        const draggedId = document.querySelector('.dragging').dataset.id;
        const targetId = div.dataset.id; // 내 아이디

        if (draggedId && targetId && draggedId !== targetId) {
            await swapPlayers(draggedId, targetId);
        }
    });

    // 기존 클릭 이벤트 (대기실 복귀)
    div.addEventListener('click', async (e) => {
        // ... (기존 클릭 로직 그대로 유지, 생략하지 말고 그대로 두세요) ...
        // 혹시 필요하시면 아까 드린 코드의 click 이벤트 부분 복사해서 넣으세요.
        const parent = div.parentElement;
        if (parent && parent.classList.contains('team-slots')) {
            //if (!confirm(`'${player.name}' 선수를 대기실로 보내시겠습니까?`)) return;
            const p = allPlayers.find(x => x.id == player.id);
            if (p) p.team_id = null;
            const tierKey = (player.tier || 'Unranked').toLowerCase();
            const targetPool = document.getElementById(`pool-${tierKey}`);
            if (targetPool) targetPool.appendChild(div);
            await supabase.from('players').update({ team_id: null }).eq('id', player.id);
            updateAllTeamInfo();
            updatePoolCount();
        }
    });

    return div;
}

// 드래그 앤 드롭 로직
function setupDropZone(container) {
    container.addEventListener('dragover', e => {
        e.preventDefault();
        if (container.classList.contains('team-slots')) {
            if (container.childElementCount >= MAX_PLAYERS_PER_TEAM) {
                container.classList.add('full');
                e.dataTransfer.dropEffect = 'none';
                return;
            }
        }
        container.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    });

    container.addEventListener('dragleave', () => {
        container.classList.remove('drag-over', 'full');
    });

    container.addEventListener('drop', async e => {
        e.preventDefault();
        container.classList.remove('drag-over', 'full');
        
        const draggingCard = document.querySelector('.dragging');
        if (!draggingCard) return;

        if (container.classList.contains('team-slots')) {
            if (container.childElementCount >= MAX_PLAYERS_PER_TEAM) {
                alert(`한 팀에 최대 ${MAX_PLAYERS_PER_TEAM}명까지만 배정할 수 있습니다.`);
                return;
            }
        }

        container.appendChild(draggingCard);
        const playerId = draggingCard.dataset.id;
        const newTeamId = container.dataset.teamId ? parseInt(container.dataset.teamId) : null;

        await updatePlayerTeam(playerId, newTeamId);
        updateAllTeamInfo();
        updatePoolCount();
    });
}

async function updatePlayerTeam(playerId, teamId) {
    const p = allPlayers.find(x => x.id == playerId);
    if (p) p.team_id = teamId;
    
    const { error } = await supabase.from('players').update({ team_id: teamId }).eq('id', playerId);
    if(error) console.error("DB 업데이트 실패", error);
}

function updateAllTeamInfo() {
    for (let i = 1; i <= currentTeamCount; i++) {
        const teamSlot = document.getElementById(`team-${i}`);
        if (!teamSlot) continue;

        const chips = teamSlot.querySelectorAll('.player-chip');
        let totalCost = 0;
        chips.forEach(chip => totalCost += parseInt(chip.dataset.cost || 0));
        const count = chips.length;

        document.getElementById(`cost-team-${i}`).innerHTML = `Total: <b>${totalCost}</b>`;
        const countEl = document.getElementById(`count-team-${i}`);
        countEl.textContent = `[${count}/${MAX_PLAYERS_PER_TEAM}]`;
        
        if (count === MAX_PLAYERS_PER_TEAM) countEl.style.color = '#e74c3c';
        else if (count > 0) countEl.style.color = '#2ed573';
        else countEl.style.color = '#aaa';
    }
}

function updatePoolCount() {
    let total = 0;
    document.querySelectorAll('.tier-body-pool').forEach(pool => total += pool.childElementCount);
    document.getElementById('poolCount').textContent = total;
}

function setupEvents() {
    document.getElementById('resetTeamsBtn').addEventListener('click', async () => {
        if(!confirm("모든 팀 구성을 초기화하시겠습니까?")) return;
        allPlayers.forEach(p => p.team_id = null);
        renderPlayers();
        await supabase.from('players').update({ team_id: null }).neq('id', 0);
    });

    document.getElementById('addTeamBtn').addEventListener('click', () => {
        currentTeamCount++; createTeamSlot(currentTeamCount);
    });
    
    document.getElementById('removeTeamBtn').addEventListener('click', async () => {
        if (currentTeamCount <= 1) return;
        const lastTeamId = currentTeamCount;
        const lastTeamSlot = document.getElementById(`team-${lastTeamId}`);
        if (lastTeamSlot.childElementCount > 0) {
            if(!confirm(`Team ${lastTeamId}을 해체하시겠습니까?`)) return;
            const chips = Array.from(lastTeamSlot.children);
            for (const chip of chips) await updatePlayerTeam(chip.dataset.id, null);
            renderPlayers();
        }
        document.getElementById(`team-card-${lastTeamId}`).remove();
        currentTeamCount--;
    });

    document.getElementById('copyTextBtn').addEventListener('click', () => {
        let copyString = " [팀 구성 현황]\n\n";
        for (let i = 1; i <= currentTeamCount; i++) {
            const teamSlot = document.getElementById(`team-${i}`);
            if (teamSlot && teamSlot.childElementCount > 0) {
                const cost = document.getElementById(`cost-team-${i}`).innerText;
                const names = Array.from(teamSlot.children).map(c => c.dataset.name).join(', ');
                copyString += ` Team ${i} ${names}\n`;
            }
        }
        navigator.clipboard.writeText(copyString).then(() => alert("복사 완료!"));
    });

    // ★ 자동 배정 버튼 이벤트
    document.getElementById('autoDraftBtn').addEventListener('click', runAutoDraft);
}

// ★ 핵심: 자동 배정 알고리즘 실행 함수
// ★ 핵심: 자동 배정 알고리즘 (랜덤 요소 추가)
async function runAutoDraft() {
    // 1. 안전 장치
    if (!allPlayers || allPlayers.length === 0) return alert("배정할 선수가 없습니다.");
    if (!confirm(`현재 대기 중인 ${allPlayers.length}명의 선수를\n밸런스에 맞춰 자동으로 배정하시겠습니까?\n(결과는 매번 달라집니다)`)) return;

    // 2. 팀 개수 자동 계산 (3명씩 1팀)
    const totalPlayers = allPlayers.length;
    const optimalTeamCount = Math.floor(totalPlayers / 3);
    
    if (optimalTeamCount < 1) return alert("최소 3명의 선수가 필요합니다.");

    // 3. 화면 및 데이터 초기화
    const container = document.getElementById('teams-container');
    container.innerHTML = '';
    currentTeamCount = optimalTeamCount;
    for (let i = 1; i <= currentTeamCount; i++) {
        createTeamSlot(i);
    }

    // 메모리 초기화
    allPlayers.forEach(p => p.team_id = null);

    // 4. [랜덤 요소 1] 선수 정렬 로직 변경
    // 먼저 전체를 무작위로 섞습니다. (같은 코스트일 때 순서를 섞기 위함)
    let sortedPlayers = shuffleArray([...allPlayers]);
    
    // 그 다음 코스트 높은 순으로 정렬합니다.
    // 결과: 8코스트가 먼저 오지만, 8코스트인 A와 B의 순서는 매번 바뀝니다.
    sortedPlayers.sort((a, b) => b.cost - a.cost);

    // 5. 배정 로직 (Greedy + Random Pick)
    const teamStatus = [];
    for (let i = 1; i <= currentTeamCount; i++) {
        teamStatus.push({ id: i, currentCost: 0, membersCount: 0 });
    }

    for (const player of sortedPlayers) {
        // 자리가 남은 팀들만 필터링
        const availableTeams = teamStatus.filter(t => t.membersCount < MAX_PLAYERS_PER_TEAM);

        if (availableTeams.length === 0) break;

        // 현재 코스트가 가장 낮은 팀'들'을 찾습니다.
        // 1. 오름차순 정렬
        availableTeams.sort((a, b) => a.currentCost - b.currentCost);
        
        // 2. 가장 낮은 점수(최소값) 확인
        const minCost = availableTeams[0].currentCost;
        
        // 3. 최소 점수를 가진 팀들을 모두 모음 (후보군)
        const candidates = availableTeams.filter(t => t.currentCost === minCost);

        // 4. [랜덤 요소 2] 후보군 중에서 무작위로 하나 선택
        const targetTeam = candidates[Math.floor(Math.random() * candidates.length)];

        // 배정 확정
        player.team_id = targetTeam.id;
        
        // 상태 업데이트
        targetTeam.currentCost += (player.cost || 0);
        targetTeam.membersCount += 1;
    }

    // 6. 결과 반영
    renderPlayers(); 

    // DB 일괄 업데이트
    for (const p of allPlayers) {
        await supabase.from('players').update({ team_id: p.team_id }).eq('id', p.id);
    }

}

// [유틸리티] 배열 무작위 섞기 함수 (Fisher-Yates Shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;

}

async function swapPlayers(playerA_Id, playerB_Id) {
    const playerA = allPlayers.find(p => p.id == playerA_Id);
    const playerB = allPlayers.find(p => p.id == playerB_Id);

    if (!playerA || !playerB) return;

    // 1. 메모리 상에서 팀 ID 맞교환
    const tempTeamId = playerA.team_id;
    playerA.team_id = playerB.team_id;
    playerB.team_id = tempTeamId;

    // 2. 화면 다시 그리기 (즉시 반영)
    renderPlayers(); 

    // 3. DB 업데이트 (비동기 병렬 처리)
    await Promise.all([
        supabase.from('players').update({ team_id: playerA.team_id }).eq('id', playerA.id),
        supabase.from('players').update({ team_id: playerB.team_id }).eq('id', playerB.id)
    ]);
    
    // 완료 로그 (선택 사항)
    console.log(`Swapped: ${playerA.name} <-> ${playerB.name}`);
}