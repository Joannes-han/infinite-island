// [수정] SSS, SS, F 티어 적용
const defaultPlayers = [
    { name: '피닉스박', cost: 8, tier: 'SSS' }, { name: '민식박', cost: 7, tier: 'SS' }, { name: '갱맘', cost: 7, tier: 'SS' },
    { name: '이로', cost: 7, tier: 'SS' }, { name: '검멋', cost: 7, tier: 'SS' }, { name: '행수', cost: 7, tier: 'SS' }, 
    { name: '이비스', cost: 6, tier: 'S' }, { name: '자연', cost: 6, tier: 'S' }, { name: '황블린', cost: 6, tier: 'S' },
    { name: '모카형', cost: 6, tier: 'S' }, { name: '피아노캣', cost: 6, tier: 'S' }, { name: '후참', cost: 5, tier: 'A' },
    { name: '방찌', cost: 5, tier: 'A' }, { name: '유세라', cost: 5, tier: 'A' }, { name: '앰비션', cost: 5, tier: 'A' },
    { name: '김뿡', cost: 5, tier: 'A' }, { name: '후니', cost: 5, tier: 'A' }, { name: '농루트', cost: 4, tier: 'B' },
    { name: '잭잭', cost: 4, tier: 'B' }, { name: '감규리', cost: 4, tier: 'B' }, { name: '유토링', cost: 4, tier: 'B' },
    { name: '천시아', cost: 4, tier: 'B' }, { name: '찬우정', cost: 4, tier: 'B' }, { name: '왈도쿤', cost: 3, tier: 'C' },
    { name: '방캐', cost: 3, tier: 'C' }, { name: '쾅준', cost: 3, tier: 'C' }, { name: '헤징', cost: 3, tier: 'C' },
    { name: '삐부', cost: 3, tier: 'C' }, { name: '고차비', cost: 3, tier: 'C' }, { name: '캡틴잭', cost: 3, tier: 'C' },
    { name: '다비', cost: 3, tier: 'C' }, { name: '이선', cost: 3, tier: 'C' }, { name: '순당무', cost: 3, tier: 'C' },
    { name: '비행돼지', cost: 2, tier: 'D' }, { name: '멋사', cost: 2, tier: 'D' }, { name: '모잉', cost: 2, tier: 'D' },
    { name: '오뉴', cost: 2, tier: 'D' }, { name: '두뭉', cost: 1, tier: 'F' }, { name: '푸린', cost: 1, tier: 'F' },
    { name: '치카', cost: 1, tier: 'F' }, { name: '냐미', cost: 1, tier: 'F' }, { name: '샘웨', cost: 1, tier: 'F' },
    { name: '나리땽', cost: 1, tier: 'F' } ,{ name: '꽃핀', cost:1, tier:'F'}
];
const defaultTeams = [ { id: 1, name: 'Team 1', members: [], cost: 0 }, { id: 2, name: 'Team 2', members: [], cost: 0 }, { id: 3, name: 'Team 3', members: [], cost: 0 }, { id: 4, name: 'Team 4', members: [], cost: 0 }, { id: 5, name: 'Team 5', members: [], cost: 0 }, { id: 6, name: 'Team 6', members: [], cost: 0 } ];
let players;
let allTeams;
let activeTeamId = null;
let attendingPlayers = new Set();
const MAX_MEMBERS_PER_TEAM = 3;

function saveData() { try { localStorage.setItem('savedPlayers', JSON.stringify(players)); localStorage.setItem('savedTeams', JSON.stringify(allTeams)); localStorage.setItem('savedAttendees', JSON.stringify(Array.from(attendingPlayers))); } catch (e) { console.error("Error saving data:", e); } }
function loadData() { try { const saved = localStorage.getItem('savedPlayers'); players = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultPlayers)); } catch (e) { console.error("P Load Error", e); players = JSON.parse(JSON.stringify(defaultPlayers)); } try { const saved = localStorage.getItem('savedTeams'); allTeams = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultTeams)); } catch (e) { console.error("T Load Error", e); allTeams = JSON.parse(JSON.stringify(defaultTeams)); } try { const saved = localStorage.getItem('savedAttendees'); attendingPlayers = saved ? new Set(JSON.parse(saved)) : new Set(); } catch (e) { console.error("A Load Error", e); attendingPlayers = new Set(); } activeTeamId = allTeams.length > 0 ? allTeams[0].id : null; }

// [수정] 티어 이름 변경
function getCostFromTier(tier) { 
    switch (tier) { 
        case 'SSS': return 8; case 'SS': return 7; case 'S': return 6; 
        case 'A': return 5; case 'B': return 4; case 'C': return 3; 
        case 'D': return 2; case 'F': return 1; default: return 0; 
    } 
}
// [수정] 티어 이름 변경
function getTierFromCost(cost) { 
    cost = parseInt(cost); 
    switch (cost) { 
        case 8: return 'SSS'; case 7: return 'SS'; case 6: return 'S'; 
        case 5: return 'A';   case 4: return 'B';  case 3: return 'C'; 
        case 2: return 'D';   case 1: return 'F';  default: return 'N/A'; 
    } 
}
function updateTeamCostForPlayer(playerName, newCost, oldCost) { allTeams.forEach(team => { const member = team.members.find(m => m.name === playerName); if (member) { member.cost = newCost; team.cost = team.members.reduce((sum, m) => sum + m.cost, 0); return; } }); }

document.addEventListener('DOMContentLoaded', () => {
    const playerListDiv = document.getElementById('player-list');
    const allTeamsContainer = document.getElementById('all-teams-container');
    const addTeamButton = document.getElementById('add-team-button');
    const resetAllButton = document.getElementById('reset-all-button');
    const newPlayerNameInput = document.getElementById('new-player-name');
    const newPlayerCostSelect = document.getElementById('new-player-cost');
    const addPlayerButton = document.getElementById('add-player-button');
    const saveImageButton = document.getElementById('save-image-button');
    const copyTeamsButton = document.getElementById('copy-teams-button');
    const autoAssignButton = document.getElementById('auto-assign-button');
    const attendeeCountSpan = document.getElementById('attendee-count');

    loadData();

    addTeamButton.addEventListener('click', () => { const teamId = Date.now(); const newTeam = { id: teamId, name: `Team ${allTeams.length + 1}`, members: [], cost: 0 }; allTeams.push(newTeam); activeTeamId = teamId; saveData(); renderAll(); });
    resetAllButton.addEventListener('click', () => { if (confirm('모든 팀 구성을 초기화하시겠습니까? (선수 목록은 유지됩니다)')) { allTeams.forEach(team => { team.members = []; team.cost = 0; }); activeTeamId = allTeams.length > 0 ? allTeams[0].id : null; saveData(); renderAll(); } });
    addPlayerButton.addEventListener('click', () => { const name = newPlayerNameInput.value.trim(); const cost = parseInt(newPlayerCostSelect.value); const tier = getTierFromCost(cost); if (name === "") { alert('선수 이름을 입력하세요.'); return; } if (players.some(p => p.name === name)) { alert('이미 존재하는 선수 이름입니다.'); return; } const newPlayer = { name, cost, tier }; players.push(newPlayer); players.sort((a, b) => a.name.localeCompare(b.name)); saveData(); renderAll(); newPlayerNameInput.value = ''; });
    autoAssignButton.addEventListener('click', () => { if (!confirm('현재 팀 구성을 유지한 채, 참석자 중 팀 없는 선수들을 빈 자리에 자동으로 배정하시겠습니까?')) { return; } const assignedPlayerNames = new Set(); allTeams.forEach(team => { team.members.forEach(member => assignedPlayerNames.add(member.name)); }); let unassignedAttendees = players.filter(p => attendingPlayers.has(p.name) && !assignedPlayerNames.has(p.name)).sort((a, b) => b.cost - a.cost); let assignedCount = 0; const totalTeams = allTeams.length; if (totalTeams === 0) { alert('자동 배정할 팀이 없습니다. 먼저 팀을 추가해주세요.'); return; } unassignedAttendees.forEach(player => { let bestTeam = null; let minCost = Infinity; allTeams.forEach(team => { if (team.members.length < MAX_MEMBERS_PER_TEAM) { if (team.cost < minCost) { minCost = team.cost; bestTeam = team; } } }); if (bestTeam) { bestTeam.members.push({ name: player.name, cost: player.cost }); bestTeam.cost += player.cost; assignedCount++; } }); console.log(`총 ${assignedCount}명의 선수가 자동으로 배정되었습니다.`); saveData(); renderAll(); });
    saveImageButton.addEventListener('click', () => { const targetElement = document.getElementById('all-teams-container'); if (!targetElement) { alert('이미지를 저장할 팀 현황 영역을 찾을 수 없습니다.'); return; } const options = { backgroundColor: '#1e1e1e', useCORS: true }; html2canvas(targetElement, options).then(canvas => { const imageURL = canvas.toDataURL('image/png'); const downloadLink = document.createElement('a'); downloadLink.href = imageURL; downloadLink.download = '팀_구성.png'; document.body.appendChild(downloadLink); downloadLink.click(); document.body.removeChild(downloadLink); }).catch(error => { console.error('이미지 저장 중 오류 발생:', error); alert('이미지 저장에 실패했습니다. 콘솔을 확인해주세요.'); }); });
    copyTeamsButton.addEventListener('click', () => { let teamsText = ''; allTeams.forEach(team => { teamsText += `${team.name} (총: ${team.cost}) [${team.members.length}/${MAX_MEMBERS_PER_TEAM}명]:\n`; if (team.members.length > 0) { teamsText += team.members.map(m => `  - ${m.name} (${m.cost})`).join('\n'); } else { teamsText += '  (선수 없음)'; } teamsText += '\n\n'; }); navigator.clipboard.writeText(teamsText.trim()).then(() => { const originalText = copyTeamsButton.textContent; copyTeamsButton.textContent = '✅ 복사 완료!'; copyTeamsButton.classList.add('copied'); setTimeout(() => { copyTeamsButton.textContent = originalText; copyTeamsButton.classList.remove('copied'); }, 1500); }).catch(err => { console.error('클립보드 복사 실패:', err); alert('텍스트 복사에 실패했습니다.'); }); });

    playerListDiv.addEventListener('click', (event) => { const playerButton = event.target.closest('.player-button'); if (playerButton) { const playerName = playerButton.dataset.name; if (!attendingPlayers.has(playerName)) { alert('참석자로 선택된 선수만 팀에 배정할 수 있습니다.'); return; } if (!activeTeamId) { alert('먼저 선수를 추가할 팀을 선택해주세요.'); return; } const cost = parseInt(playerButton.dataset.cost); const activeTeam = allTeams.find(team => team.id === activeTeamId); if (!activeTeam) return; if (activeTeam.members.length >= MAX_MEMBERS_PER_TEAM) { alert(`팀 인원은 최대 ${MAX_MEMBERS_PER_TEAM}명까지 가능합니다.`); return; } const isPlayerTaken = allTeams.some(team => team.members.some(member => member.name === playerName) ); if (isPlayerTaken) { alert('이미 다른 팀에 소속된 선수입니다.'); return; } activeTeam.members.push({ name: playerName, cost: cost }); activeTeam.cost += cost; saveData(); renderAll(); } });
    allTeamsContainer.addEventListener('click', (event) => { const clickedMember = event.target.closest('.team-member'); if (clickedMember) { const teamBox = event.target.closest('.team-box'); const teamId = parseInt(teamBox.dataset.teamId); const team = allTeams.find(t => t.id === teamId); if (!team) return; const memberName = clickedMember.textContent.split(' (')[0]; const memberToRemove = team.members.find(m => m.name === memberName); if (memberToRemove) { team.cost -= memberToRemove.cost; team.members = team.members.filter(m => m.name !== memberName); saveData(); renderAll(); } return; } const clearButton = event.target.closest('.clear-team-button'); if (clearButton) { const teamBox = event.target.closest('.team-box'); const teamId = parseInt(teamBox.dataset.teamId); const teamName = teamBox.dataset.teamName; if (confirm(`${teamName} 팀을 비우시겠습니까?`)) { const teamToClear = allTeams.find(t => t.id === teamId); teamToClear.members = []; teamToClear.cost = 0; if (activeTeamId === teamId) { activeTeamId = 1; } saveData(); renderAll(); } return; } const removeButton = event.target.closest('.remove-team-button'); if (removeButton) { const teamBox = event.target.closest('.team-box'); const teamId = parseInt(teamBox.dataset.teamId); const teamName = teamBox.dataset.teamName; if (confirm(`'${teamName}' 팀을 완전히 삭제하시겠습니까?`)) { allTeams = allTeams.filter(t => t.id !== teamId); if (activeTeamId === teamId) { activeTeamId = allTeams.length > 0 ? allTeams[0].id : null; } saveData(); renderAll(); } return; } const teamBox = event.target.closest('.team-box'); if (teamBox) { const clickedTeamId = parseInt(teamBox.dataset.teamId); activeTeamId = clickedTeamId; renderAll(); } });
    
    function setupDropZones() { const dropGroups = document.querySelectorAll('.player-button-group'); dropGroups.forEach(group => { group.addEventListener('dragover', (event) => { event.preventDefault(); group.classList.add('drag-over'); }); group.addEventListener('dragleave', () => { group.classList.remove('drag-over'); }); group.addEventListener('drop', (event) => { event.preventDefault(); group.classList.remove('drag-over'); const playerName = event.dataTransfer.getData('text/plain'); const newCost = parseInt(group.dataset.cost); const newTier = group.dataset.tier; const player = players.find(p => p.name === playerName); if (player && player.tier !== newTier) { const oldCost = player.cost; player.cost = newCost; player.tier = newTier; updateTeamCostForPlayer(playerName, newCost, oldCost); saveData(); renderAll(); } }); }); }
    function renderAll() { renderTeamBoxes(); renderPlayerList(); }
    function renderTeamBoxes() { allTeamsContainer.innerHTML = ''; allTeams.forEach(team => { const teamBox = document.createElement('div'); teamBox.className = 'team-box'; teamBox.dataset.teamId = team.id; teamBox.dataset.teamName = team.name; if (team.id === activeTeamId) { teamBox.classList.add('active'); } const membersHTML = team.members.map(member => `<span class="team-member" title="클릭하여 ${member.name} 선수 제외">${member.name} (${member.cost || 'N/A'})</span>`).join(''); teamBox.innerHTML = `<h3>${team.name} (총: ${team.cost}) [${team.members.length}/${MAX_MEMBERS_PER_TEAM}]</h3> <div class="team-member-list">${membersHTML}</div> <div class="team-box-buttons"> <button class="clear-team-button">팀 비우기</button> <button class="remove-team-button">팀 삭제</button> </div>`; allTeamsContainer.appendChild(teamBox); }); }

    function renderPlayerList() {
        const groups = document.querySelectorAll('.player-button-group');
        groups.forEach(group => group.innerHTML = '');
        attendeeCountSpan.textContent = attendingPlayers.size;

        const sortedPlayers = [...players].sort((a, b) => {
            const aAttending = attendingPlayers.has(a.name);
            const bAttending = attendingPlayers.has(b.name);
            if (aAttending && !bAttending) return -1; 
            if (!aAttending && bAttending) return 1;  
            return a.name.localeCompare(b.name); 
        });

        sortedPlayers.forEach(player => { 
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            if (attendingPlayers.has(player.name)) { playerItem.classList.add('attending'); }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.className = 'attend-checkbox';
            checkbox.checked = attendingPlayers.has(player.name);
            checkbox.dataset.playerName = player.name; 
            checkbox.addEventListener('change', (event) => { const name = event.target.dataset.playerName; if (event.target.checked) { attendingPlayers.add(name); } else { attendingPlayers.delete(name); } saveData(); renderAll(); });

            const button = document.createElement('button');
            button.className = `player-button tier-${player.tier}`;
            button.appendChild(document.createTextNode(`${player.name} (${player.cost})`)); 
            button.dataset.name = player.name; button.dataset.cost = player.cost; 
            button.draggable = true; 
            button.addEventListener('dragstart', (event) => { event.target.classList.add('dragging'); event.dataTransfer.setData('text/plain', player.name); });
            button.addEventListener('dragend', (event) => { event.target.classList.remove('dragging'); });

            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-player-btn'; deleteBtn.textContent = '×';
            deleteBtn.title = `${player.name} 선수 목록에서 삭제`;
            deleteBtn.addEventListener('click', (event) => { event.stopPropagation(); const playerName = player.name; const isPlayerTaken = allTeams.some(team => team.members.some(member => member.name === playerName) ); if (isPlayerTaken) { alert('팀에 소속된 선수는 삭제할 수 없습니다.\n팀에서 먼저 제외한 후 시도해주세요.'); return; } if (confirm(`'${playerName}' 선수를 목록에서 영구히 삭제하시겠습니까?`)) { players = players.filter(p => p.name !== playerName); attendingPlayers.delete(playerName); saveData(); renderAll(); } });
            button.appendChild(deleteBtn); 
            
            playerItem.appendChild(checkbox);
            playerItem.appendChild(button);

            // [수정] 티어 이름에 맞게 ID 매핑
            let targetDivId;
            switch (player.tier) {
                case 'SSS': targetDivId = 'list-SSS'; break; 
                case 'SS':  targetDivId = 'list-SS';  break;
                case 'S':   targetDivId = 'list-S';   break;
                case 'A':   targetDivId = 'list-A';   break;
                case 'B':   targetDivId = 'list-B';   break;
                case 'C':   targetDivId = 'list-C';   break;
                case 'D':   targetDivId = 'list-D';   break;
                case 'F':   targetDivId = 'list-F';   break;
                default:    targetDivId = null;
            }
            if (targetDivId) { document.getElementById(targetDivId).appendChild(playerItem); }
        });
        updatePlayerButtonStates();
    }

    function updatePlayerButtonStates() {
        const takenPlayers = new Set();
        allTeams.forEach(team => { team.members.forEach(member => takenPlayers.add(member.name)); });
        const activeTeam = allTeams.find(team => team.id === activeTeamId);

        document.querySelectorAll('.player-item').forEach(item => {
            const button = item.querySelector('.player-button');
            const checkbox = item.querySelector('.attend-checkbox');
            const name = button.dataset.name; 
            const activeTeamIsFull = activeTeam && activeTeam.members.length >= MAX_MEMBERS_PER_TEAM;

            if (checkbox.checked) { item.classList.add('attending'); } 
            else { item.classList.remove('attending'); }

            if (takenPlayers.has(name)) { 
                button.classList.add('selected'); button.classList.remove('disabled'); button.disabled = true;
                checkbox.disabled = true; 
            } else if (!checkbox.checked) { 
                 button.classList.add('disabled'); button.classList.remove('selected'); button.disabled = true;
                 checkbox.disabled = false;
            } else if (!activeTeam || activeTeamIsFull) { 
                button.classList.add('disabled'); button.classList.remove('selected'); button.disabled = true;
                 checkbox.disabled = false; 
            } else { 
                button.classList.remove('selected', 'disabled'); button.disabled = false;
                checkbox.disabled = false;
            }
        });
    }

    setupDropZones(); 
    renderAll(); 
});

