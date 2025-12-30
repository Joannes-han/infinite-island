import { supabase } from './supabase.js';

let allPlayers = [];
// ★ [수정 1] 저장된 팀 개수가 있으면 그걸 쓰고, 없으면 기본 6개
let currentTeamCount = parseInt(localStorage.getItem('draftTeamCount')) || 6;
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
    // 저장된 개수(currentTeamCount)만큼 박스를 생성함
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
    // 1. 구역 비우기
    document.querySelectorAll('.tier-body-pool').forEach(el => el.innerHTML = '');
    for (let i = 1; i <= currentTeamCount; i++) {
        const slot = document.getElementById(`team-${i}`);
        if (slot) slot.innerHTML = '';
    }

    // 2. 선수 배치 시작
    allPlayers.forEach(player => {
        const chip = createPlayerChip(player);

        // A. 팀에 소속된 경우
        if (player.team_id && player.team_id >= 1 && player.team_id <= currentTeamCount) {
            const teamSlot = document.getElementById(`team-${player.team_id}`);
            if (teamSlot) {
                teamSlot.appendChild(chip);
                return; // 팀 배정 완료되면 다음 선수로
            }
        }

        // B. 대기실(Pool)에 있는 경우
        let tierRaw = player.tier || 'Unranked';
        let tierKey = tierRaw.toLowerCase().trim();
        let targetPool = document.getElementById(`pool-${tierKey}`);

        if (!targetPool) {
            // console.warn(`박스 없음: ${tierKey}`); // 디버깅용
            targetPool = document.getElementById('pool-unranked');
        }

        if (targetPool) {
            targetPool.appendChild(chip);
        }
    });

    updateAllTeamInfo();
    updatePoolCount();
}

// 칩 생성 함수
function createPlayerChip(player) {
    const div = document.createElement('div');
    div.className = 'player-chip';
    div.draggable = true;
    div.dataset.id = player.id;
    div.dataset.cost = player.cost || 0;
    div.dataset.name = player.name;

    let displayTier = player.tier || '-';
    if (displayTier === 'Chicken') displayTier = '닭';
    if (displayTier === 'Stick') displayTier = '나뭇가지';

    const imgContent = player.image_url
        ? `<img src="${player.image_url}" style="width:100%; height:100%; object-fit:cover;">`
        : `<i class="fa-solid fa-user"></i>`;

    div.innerHTML = `
        <div class="chip-img-box">${imgContent}</div>
        <div class="chip-info">
            <span class="chip-name">${player.name}</span>
            <div class="chip-meta">
                <span class="chip-tier" style="color:var(--accent-gold)">${displayTier}</span>
                <span class="chip-cost" style="color:#aaa; margin-left:4px;">(${player.cost})</span>
            </div>
        </div>
    `;

    // 드래그 이벤트
    div.addEventListener('dragstart', (e) => {
        div.classList.add('dragging');
        e.dataTransfer.setData('text/plain', player.id);
    });

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
        document.querySelectorAll('.swap-target').forEach(el => el.classList.remove('swap-target'));
    });

    div.addEventListener('dragover', (e) => {
        e.preventDefault(); e.stopPropagation();
        const draggingCard = document.querySelector('.dragging');
        if (draggingCard && draggingCard !== div) div.classList.add('swap-target');
    });

    div.addEventListener('dragleave', (e) => div.classList.remove('swap-target'));

    div.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation();
        div.classList.remove('swap-target');
        const draggedId = document.querySelector('.dragging').dataset.id;
        const targetId = div.dataset.id;

        if (draggedId && targetId && draggedId !== targetId) {
            swapPlayersInMemory(draggedId, targetId);
        }
    });

    div.addEventListener('click', () => {
        const parent = div.parentElement;
        if (parent && parent.classList.contains('team-slots')) {
            const p = allPlayers.find(x => x.id == player.id);
            if (p) p.team_id = null;

            const tierKey = (player.tier || 'Unranked').toLowerCase().trim();
            const targetPool = document.getElementById(`pool-${tierKey}`);
            if (targetPool) targetPool.appendChild(div);
            else document.getElementById('pool-unranked').appendChild(div);

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

        const p = allPlayers.find(x => x.id == playerId);
        if (p) p.team_id = newTeamId;

        updateAllTeamInfo();
        updatePoolCount();
    });
}

function swapPlayersInMemory(playerA_Id, playerB_Id) {
    const pA = allPlayers.find(p => p.id == playerA_Id);
    const pB = allPlayers.find(p => p.id == playerB_Id);
    if (!pA || !pB) return;

    const tempTeamId = pA.team_id;
    pA.team_id = pB.team_id;
    pB.team_id = tempTeamId;

    renderPlayers();
}

async function saveTeamsToDB() {
    const btn = document.getElementById('saveTeamsBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';
    btn.disabled = true;

    try {
        await supabase.from('players').update({ team_id: null }).neq('id', 0);

        const updates = [];
        allPlayers.forEach(p => {
            if (p.team_id !== null && p.team_id >= 1 && p.team_id <= currentTeamCount) {
                updates.push(
                    supabase.from('players').update({ team_id: p.team_id }).eq('id', p.id)
                );
            }
        });

        if (updates.length > 0) {
            await Promise.all(updates);
        }
        alert("✅ 팀 배치가 저장되었습니다!");
    } catch (err) {
        console.error(err);
        alert("저장 중 오류가 발생했습니다.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function runAutoDraft() {
    if (!allPlayers || allPlayers.length === 0) return alert("배정할 선수가 없습니다.");
    if (!confirm(`현재 대기 중인 ${allPlayers.length}명의 선수를\n자동으로 배정하시겠습니까?`)) return;

    const totalPlayers = allPlayers.length;
    const optimalTeamCount = Math.floor(totalPlayers / 3) || 1;

    const container = document.getElementById('teams-container');
    container.innerHTML = '';
    
    // ★ [수정 2] 자동 배정 시 팀 개수 변경 및 저장
    currentTeamCount = optimalTeamCount;
    localStorage.setItem('draftTeamCount', currentTeamCount);

    for (let i = 1; i <= currentTeamCount; i++) {
        createTeamSlot(i);
    }

    allPlayers.forEach(p => p.team_id = null);

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
        if (!confirm("화면을 초기화하시겠습니까?")) return;
        allPlayers.forEach(p => p.team_id = null);
        renderPlayers();
    });

    document.getElementById('addTeamBtn').addEventListener('click', () => {
        currentTeamCount++; 
        // ★ [수정 3] 팀 추가 시 개수 저장
        localStorage.setItem('draftTeamCount', currentTeamCount);
        createTeamSlot(currentTeamCount);
    });

    document.getElementById('removeTeamBtn').addEventListener('click', async () => {
        if (currentTeamCount <= 1) return;
        const lastTeamId = currentTeamCount;
        const lastTeamSlot = document.getElementById(`team-${lastTeamId}`);

        if (lastTeamSlot.childElementCount > 0) {
            if (!confirm(`Team ${lastTeamId}을 해체하시겠습니까?`)) return;
            const chips = Array.from(lastTeamSlot.children);
            chips.forEach(chip => {
                const p = allPlayers.find(x => x.id == chip.dataset.id);
                if (p) p.team_id = null;
            });
            renderPlayers();
        }
        document.getElementById(`team-card-${lastTeamId}`).remove();
        currentTeamCount--;
        // ★ [수정 4] 팀 삭제 시 개수 저장
        localStorage.setItem('draftTeamCount', currentTeamCount);
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

    document.getElementById('autoDraftBtn').addEventListener('click', runAutoDraft);

    const saveBtn = document.getElementById('saveTeamsBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveTeamsToDB);
}
