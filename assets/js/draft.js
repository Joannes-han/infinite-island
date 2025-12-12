import { supabase } from './supabase.js';

let allPlayers = [];
let currentTeamCount = 6; 
const MAX_PLAYERS_PER_TEAM = 3; 

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

// 2. 데이터 불러오기 (명예 기능 제거됨)
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
    document.querySelectorAll('.tier-body-pool').forEach(el => el.innerHTML = '');
    for (let i = 1; i <= currentTeamCount; i++) {
        const slot = document.getElementById(`team-${i}`);
        if(slot) slot.innerHTML = '';
    }

    allPlayers.forEach(player => {
        const chip = createPlayerChip(player);
        
        // 메모리(allPlayers) 상태에 따라 배치
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

// ★ 선수 칩 생성 (DB 통신 제거 - 메모리만 변경)
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
        <div class="chip-img-box">${imgContent}</div>
        <div class="chip-info">
            <span class="chip-name">${player.name}</span>
            <div class="chip-meta">
                <span class="chip-tier" style="color:var(--accent-gold)">${player.tier || '-'}</span>
                <span class="chip-cost" style="color:#aaa; margin-left:4px;">(${player.cost})</span>
            </div>
        </div>
    `;

    // 드래그 시작
    div.addEventListener('dragstart', (e) => {
        div.classList.add('dragging');
        e.dataTransfer.setData('text/plain', player.id);
        e.dataTransfer.effectAllowed = "move";
    });

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
        document.querySelectorAll('.swap-target').forEach(el => el.classList.remove('swap-target'));
    });

    // 스왑 이벤트
    div.addEventListener('dragover', (e) => {
        e.preventDefault(); e.stopPropagation();
        const draggingCard = document.querySelector('.dragging');
        if (draggingCard && draggingCard !== div) {
            div.classList.add('swap-target');
        }
    });

    div.addEventListener('dragleave', (e) => div.classList.remove('swap-target'));

    // ★ Drop 이벤트 (스왑 - 메모리만 변경)
    div.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation();
        div.classList.remove('swap-target');

        const draggedId = document.querySelector('.dragging').dataset.id;
        const targetId = div.dataset.id; 

        if (draggedId && targetId && draggedId !== targetId) {
            // DB 업데이트 없이 화면만 변경
            swapPlayersInMemory(draggedId, targetId);
        }
    });

    // ★ 클릭 이벤트 (대기실 복귀 - 메모리만 변경)
    div.addEventListener('click', () => {
        const parent = div.parentElement;
        if (parent && parent.classList.contains('team-slots')) {
            const p = allPlayers.find(x => x.id == player.id);
            if (p) p.team_id = null; // 메모리 수정
            
            const tierKey = (player.tier || 'Unranked').toLowerCase();
            const targetPool = document.getElementById(`pool-${tierKey}`);
            if (targetPool) targetPool.appendChild(div); // 화면 이동
            
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

    // ★ Drop 이벤트 (메모리만 변경)
    container.addEventListener('drop', e => {
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

        // DB 업데이트 없이 로컬 변수만 변경
        const p = allPlayers.find(x => x.id == playerId);
        if (p) p.team_id = newTeamId;

        updateAllTeamInfo();
        updatePoolCount();
    });
}

// ★ [신규] 메모리 상에서만 스왑 (저장 전까지 DB 안 건드림)
function swapPlayersInMemory(playerA_Id, playerB_Id) {
    const pA = allPlayers.find(p => p.id == playerA_Id);
    const pB = allPlayers.find(p => p.id == playerB_Id);

    if (!pA || !pB) return;

    // 메모리 값 교환
    const tempTeamId = pA.team_id;
    pA.team_id = pB.team_id;
    pB.team_id = tempTeamId;

    // 화면 다시 그리기
    renderPlayers(); 
}

// ★★★ [가장 중요] 팀 확정 저장 함수 (DB 전체 갱신) ★★★
async function saveTeamsToDB() {
    const btn = document.getElementById('saveTeamsBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';
    btn.disabled = true;

    try {
        // 1. 유령 데이터 방지를 위해 일단 모든 선수의 팀 정보를 초기화(NULL)
        await supabase.from('players').update({ team_id: null }).neq('id', 0);

        // 2. 현재 화면(메모리)에 배치된 선수들의 정보만 모음
        const updates = [];
        allPlayers.forEach(p => {
            // 팀에 소속된 선수만 업데이트 대상
            if (p.team_id !== null && p.team_id >= 1 && p.team_id <= currentTeamCount) {
                updates.push(
                    supabase.from('players').update({ team_id: p.team_id }).eq('id', p.id)
                );
            }
        });

        // 3. 실제 DB 업데이트 실행 (병렬 처리)
        if (updates.length > 0) {
            await Promise.all(updates);
        }

        //alert("✅ 팀 배치가 저장되었습니다! 점수판에서 확인하세요.");

    } catch (err) {
        console.error(err);
        alert("저장 중 오류가 발생했습니다.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 자동 배정 (메모리만 변경)
function runAutoDraft() {
    if (!allPlayers || allPlayers.length === 0) return alert("배정할 선수가 없습니다.");
    if (!confirm(`현재 대기 중인 ${allPlayers.length}명의 선수를\n자동으로 배정하시겠습니까?`)) return;

    // 1. 팀 슬롯 준비
    const totalPlayers = allPlayers.length;
    const optimalTeamCount = Math.floor(totalPlayers / 3) || 1;
    
    const container = document.getElementById('teams-container');
    container.innerHTML = '';
    currentTeamCount = optimalTeamCount;
    for (let i = 1; i <= currentTeamCount; i++) {
        createTeamSlot(i);
    }

    // 2. 초기화 (메모리상)
    allPlayers.forEach(p => p.team_id = null);

    // 3. 알고리즘 실행
    let sortedPlayers = shuffleArray([...allPlayers]);
    sortedPlayers.sort((a, b) => b.cost - a.cost);

    const teamStatus = [];
    for (let i = 1; i <= currentTeamCount; i++) {
        teamStatus.push({ id: i, currentCost: 0, membersCount: 0 });
    }

    for (const player of sortedPlayers) {
        const availableTeams = teamStatus.filter(t => t.membersCount < MAX_PLAYERS_PER_TEAM);
        if (availableTeams.length === 0) break;

        availableTeams.sort((a, b) => a.currentCost - b.currentCost);
        const minCost = availableTeams[0].currentCost;
        const candidates = availableTeams.filter(t => t.currentCost === minCost);
        const targetTeam = candidates[Math.floor(Math.random() * candidates.length)];

        player.team_id = targetTeam.id;
        targetTeam.currentCost += (player.cost || 0);
        targetTeam.membersCount += 1;
    }

    // 4. 화면 반영
    renderPlayers(); 
    
}

// 유틸리티
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function setupEvents() {
    document.getElementById('resetTeamsBtn').addEventListener('click', async () => {
        if(!confirm("화면을 초기화하시겠습니까?")) return;
        allPlayers.forEach(p => p.team_id = null);
        renderPlayers();
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
            // 팀 해체 시 메모리만 업데이트
            const chips = Array.from(lastTeamSlot.children);
            chips.forEach(chip => {
                const p = allPlayers.find(x => x.id == chip.dataset.id);
                if(p) p.team_id = null;
            });
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
                const names = Array.from(teamSlot.children).map(c => c.dataset.name).join(', ');
                copyString += ` Team ${i} ${names}\n`;
            }
        }
        navigator.clipboard.writeText(copyString).then(() => alert("복사 완료!"));
    });

    // 자동 배정 버튼 (로컬 실행)
    document.getElementById('autoDraftBtn').addEventListener('click', runAutoDraft);

    // ★ 저장 버튼 이벤트 연결 (이게 있어야 작동함)
    const saveBtn = document.getElementById('saveTeamsBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveTeamsToDB);
}
