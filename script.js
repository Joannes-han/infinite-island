// [수정] 사용자님이 주신 새 JavaScript 코드로 교체 (4팀 / 15코스트)
        const defaultPlayers = [
            { name: '피닉스박', cost: 8, tier: 'SSR' },
            { name: '민식박', cost: 7, tier: 'SR' }, { name: '갱맘', cost: 7, tier: 'SR' },
            { name: '이로', cost: 7, tier: 'SR' }, { name: '검멋', cost: 7, tier: 'SR' },
            { name: '행수', cost: 7, tier: 'SR' }, { name: '이비스', cost: 6, tier: 'S' },
            { name: '자연', cost: 6, tier: 'S' }, { name: '황블린', cost: 6, tier: 'S' },
            { name: '모카형', cost: 6, tier: 'S' }, { name: '피아노캣', cost: 6, tier: 'S' },
            { name: '후참', cost: 5, tier: 'A' }, { name: '방찌', cost: 5, tier: 'A' },
            { name: '유세라', cost: 5, tier: 'A' }, { name: '앰비션', cost: 5, tier: 'A' },
            { name: '김뿡', cost: 5, tier: 'A' }, { name: '후니', cost: 5, tier: 'A' },
            { name: '농루트', cost: 4, tier: 'B' }, { name: '잭잭', cost: 4, tier: 'B' },
            { name: '감규리', cost: 4, tier: 'B' }, { name: '유토링', cost: 4, tier: 'B' },
            { name: '천시아', cost: 4, tier: 'B' }, { name: '찬우정', cost: 4, tier: 'B' },
            { name: '왈도쿤', cost: 3, tier: 'C' }, { name: '방캐', cost: 3, tier: 'C' },
            { name: '쾅준', cost: 3, tier: 'C' }, { name: '헤징', cost: 3, tier: 'C' },
            { name: '삐부', cost: 3, tier: 'C' }, { name: '고차비', cost: 3, tier: 'C' },
            { name: '캡틴잭', cost: 3, tier: 'C' }, { name: '다비', cost: 3, tier: 'C' },
            { name: '이선', cost: 3, tier: 'C' }, { name: '순당무', cost: 3, tier: 'C' },
            { name: '비행돼지', cost: 2, tier: 'D' }, { name: '멋사', cost: 2, tier: 'D' },
            { name: '모잉', cost: 2, tier: 'D' }, { name: '오뉴', cost: 2, tier: 'D' },
            { name: '두뭉', cost: 1, tier: 'E' }, { name: '푸린', cost: 1, tier: 'E' },
            { name: '치카', cost: 1, tier: 'E' }, { name: '냐미', cost: 1, tier: 'E' },
            { name: '샘웨', cost: 1, tier: 'E' }, { name: '나리땽', cost: 1, tier: 'E' }
        ];

        const defaultTeams = [ 
            { id: 1, name: 'Team 1', members: [], cost: 0 },
            { id: 2, name: 'Team 2', members: [], cost: 0 },
            { id: 3, name: 'Team 3', members: [], cost: 0 },
            { id: 4, name: 'Team 4', members: [], cost: 0 }
        ];
        let players; 
        let allTeams; 
        let activeTeamId = null;
        const MAX_COST = 15; // 코스트 상한 15로 변경

        function savePlayers() {
            try { localStorage.setItem('savedPlayers', JSON.stringify(players)); } catch (e) { console.error("Error saving players:", e); }
        }
        function saveTeams() {
             try { localStorage.setItem('savedTeams', JSON.stringify(allTeams)); } catch (e) { console.error("Error saving teams:", e); }
        }
        function loadData() {
            try {
                const savedPlayers = localStorage.getItem('savedPlayers');
                players = savedPlayers ? JSON.parse(savedPlayers) : JSON.parse(JSON.stringify(defaultPlayers));
            } catch (e) {
                console.error("Error loading players, using default:", e);
                players = JSON.parse(JSON.stringify(defaultPlayers));
            }

            try {
                const savedTeams = localStorage.getItem('savedTeams');
                allTeams = savedTeams ? JSON.parse(savedTeams) : JSON.parse(JSON.stringify(defaultTeams));
                 // 로컬 스토리지에 저장된 팀 수가 기본 팀 수(4)보다 적을 경우, 기본값으로 리셋
                if (allTeams.length < defaultTeams.length) {
                    allTeams = JSON.parse(JSON.stringify(defaultTeams));
                }
            } catch (e) {
                 console.error("Error loading teams, using default:", e);
                 allTeams = JSON.parse(JSON.stringify(defaultTeams));
            }
            
            activeTeamId = 1; 
        }

        function getTierFromCost(cost) {
            cost = parseInt(cost);
            switch (cost) {
                case 8: return 'SSR'; case 7: return 'SR'; case 6: return 'S';
                case 5: return 'A';   case 4: return 'B';  case 3: return 'C';
                case 2: return 'D';   case 1: return 'E';  default: return 'N/A';
            }
        }
        function updateTeamCostForPlayer(playerName, newCost, oldCost) {
            allTeams.forEach(team => {
                const member = team.members.find(m => m.name === playerName);
                if (member) {
                    member.cost = newCost;
                    team.cost = team.cost - oldCost + newCost;
                    return; 
                }
            });
        }

        document.addEventListener('DOMContentLoaded', () => {
            const playerListDiv = document.getElementById('player-list');
            const allTeamsContainer = document.getElementById('all-teams-container');
            const addTeamButton = document.getElementById('add-team-button');
            const resetAllButton = document.getElementById('reset-all-button');
            const newPlayerNameInput = document.getElementById('new-player-name');
            const newPlayerCostSelect = document.getElementById('new-player-cost');
            const addPlayerButton = document.getElementById('add-player-button');
            
            loadData();
            
            addTeamButton.addEventListener('click', () => {
                const teamId = Date.now(); 
                const newTeam = { id: teamId, name: `Team ${allTeams.length + 1}`, members: [], cost: 0 };
                allTeams.push(newTeam);
                activeTeamId = teamId; 
                saveTeams(); 
                renderAll(); 
            });

            resetAllButton.addEventListener('click', () => {
                if (confirm('모든 팀 구성을 초기화하시겠습니까? (선수 목록은 유지됩니다)')) {
                    allTeams = JSON.parse(JSON.stringify(defaultTeams)); 
                    activeTeamId = 1; 
                    saveTeams(); 
                    renderAll(); 
                }
            });

            addPlayerButton.addEventListener('click', () => {
                const name = newPlayerNameInput.value.trim();
                const cost = parseInt(newPlayerCostSelect.value);
                const tier = getTierFromCost(cost);

                if (name === "") { alert('선수 이름을 입력하세요.'); return; }
                if (players.some(p => p.name === name)) { alert('이미 존재하는 선수 이름입니다.'); return; }

                const newPlayer = { name, cost, tier };
                players.push(newPlayer);
                players.sort((a, b) => a.name.localeCompare(b.name));
                
                savePlayers(); 
                renderAll(); 
                newPlayerNameInput.value = '';
            });

            playerListDiv.addEventListener('click', (event) => {
                if (!event.target.classList.contains('player-button')) return;
                if (!activeTeamId) { alert('먼저 선수를 추가할 팀을 선택해주세요.'); return; }
                const button = event.target;
                const name = button.dataset.name;
                const cost = parseInt(button.dataset.cost);
                const activeTeam = allTeams.find(team => team.id === activeTeamId);
                if (!activeTeam) return; 
                const isPlayerTaken = allTeams.some(team => 
                    team.members.some(member => member.name === name)
                );
                if (isPlayerTaken) { alert('이미 다른 팀에 소속된 선수입니다.'); return; }
                if (activeTeam.cost + cost > MAX_COST) { alert(`예산을 초과합니다! (최대: ${MAX_COST})`); return; }

                activeTeam.members.push({ name, cost });
                activeTeam.cost += cost;

                saveTeams(); 
                renderAll(); 
            });

            allTeamsContainer.addEventListener('click', (event) => {
                const clickedMember = event.target.closest('.team-member');
                if (clickedMember) {
                    const teamBox = event.target.closest('.team-box');
                    const teamId = parseInt(teamBox.dataset.teamId);
                    const team = allTeams.find(t => t.id === teamId);
                    if (!team) return;
                    const memberName = clickedMember.textContent.split(' (')[0];
                    const memberToRemove = team.members.find(m => m.name === memberName);

                    if (memberToRemove) {
                        clickedMember.classList.add('removing');
                        team.cost -= memberToRemove.cost; 
                        setTimeout(() => {
                            team.members = team.members.filter(m => m.name !== memberName);
                            saveTeams(); 
                            renderAll(); 
                        }, 300); 
                    }
                    return; 
                }

                const clearButton = event.target.closest('.clear-team-button');
                if (clearButton) {
                    const teamBox = event.target.closest('.team-box');
                    const teamId = parseInt(teamBox.dataset.teamId);
                    const teamName = teamBox.dataset.teamName;

                    if (confirm(`${teamName} 팀을 비우시겠습니까?`)) {
                        const teamToClear = allTeams.find(t => t.id === teamId);
                        teamToClear.members = [];
                        teamToClear.cost = 0;
                        if (activeTeamId === teamId) { activeTeamId = 1; }
                        saveTeams(); 
                        renderAll();
                    }
                    return; 
                }

                const removeButton = event.target.closest('.remove-team-button');
                if (removeButton) {
                    const teamBox = event.target.closest('.team-box');
                    const teamId = parseInt(teamBox.dataset.teamId);
                    const teamName = teamBox.dataset.teamName;
                    
                    if (confirm(`'${teamName}' 팀을 완전히 삭제하시겠습니까?`)) {
                        allTeams = allTeams.filter(t => t.id !== teamId);
                        if (activeTeamId === teamId) {
                            activeTeamId = allTeams.length > 0 ? allTeams[0].id : null;
                        }
                        saveTeams();
                        renderAll();
                    }
                    return; 
                }

                const teamBox = event.target.closest('.team-box');
                if (teamBox) {
                    const clickedTeamId = parseInt(teamBox.dataset.teamId);
                    activeTeamId = clickedTeamId;
                    renderAll(); 
                }
            });

            function setupDropZones() {
                const dropGroups = document.querySelectorAll('.player-button-group');
                dropGroups.forEach(group => {
                    group.addEventListener('dragover', (event) => {
                        event.preventDefault(); group.classList.add('drag-over');
                    });
                    group.addEventListener('dragleave', () => {
                        group.classList.remove('drag-over');
                    });
                    group.addEventListener('drop', (event) => {
                        event.preventDefault(); group.classList.remove('drag-over');
                        const playerName = event.dataTransfer.getData('text/plain');
                        const newCost = parseInt(group.dataset.cost);
                        const newTier = group.dataset.tier;
                        const player = players.find(p => p.name === playerName);

                        if (player && player.cost !== newCost) {
                            const oldCost = player.cost;
                            player.cost = newCost; player.tier = newTier;
                            updateTeamCostForPlayer(playerName, newCost, oldCost);
                            savePlayers(); saveTeams(); renderAll();
                        }
                    });
                });
            }
            
            function renderAll() {
                renderTeamBoxes();
                renderPlayerList(); 
            }

            function renderTeamBoxes() {
                allTeamsContainer.innerHTML = ''; 
                allTeams.forEach(team => {
                    const teamBox = document.createElement('div');
                    teamBox.className = 'team-box';
                    teamBox.dataset.teamId = team.id; teamBox.dataset.teamName = team.name;
                    if (team.id === activeTeamId) { teamBox.classList.add('active'); }
                    
                    const membersHTML = team.members
                        .map(member => 
                            `<span class="team-member" title="클릭하여 ${member.name} 선수 제외">${member.name} (${member.cost || 'N/A'})</span>`
                        ).join(''); 
                    
                    teamBox.innerHTML = `
                        <h3>${team.name} (총: ${team.cost} / ${MAX_COST})</h3>
                        <div class="team-member-list">${membersHTML}</div>
                        <div class="team-box-buttons"> 
                            <button class="clear-team-button">팀 비우기</button>
                            <button class="remove-team-button">팀 삭제</button> 
                        </div>
                    `;
                    allTeamsContainer.appendChild(teamBox);
                });
            }

            function renderPlayerList() {
                const groups = document.querySelectorAll('.player-button-group');
                groups.forEach(group => group.innerHTML = '');

                players.forEach(player => {
                    const button = document.createElement('button');
                    button.className = `player-button tier-${player.tier}`;
                    button.appendChild(document.createTextNode(`${player.name} (${player.cost})`));
                    button.dataset.name = player.name; button.dataset.cost = player.cost;
                    button.draggable = true; 

                    button.addEventListener('dragstart', (event) => {
                        event.target.classList.add('dragging');
                        event.dataTransfer.setData('text/plain', player.name);
                    });
                    button.addEventListener('dragend', (event) => {
                        event.target.classList.remove('dragging');
                    });

                    const deleteBtn = document.createElement('span');
                    deleteBtn.className = 'delete-player-btn'; deleteBtn.textContent = '×';
                    deleteBtn.title = `${player.name} 선수 목록에서 삭제`;
                    deleteBtn.addEventListener('click', (event) => {
                        event.stopPropagation(); 
                        const playerName = player.name;
                        const isPlayerTaken = allTeams.some(team => 
                            team.members.some(member => member.name === playerName)
                        );
                        if (isPlayerTaken) {
                            alert('팀에 소속된 선수는 삭제할 수 없습니다.\n팀에서 먼저 제외한 후 시도해주세요.');
                            return;
                        }
                        if (confirm(`'${playerName}' 선수를 목록에서 영구히 삭제하시겠습니까?`)) {
                            players = players.filter(p => p.name !== playerName);
                            savePlayers(); renderAll();
                        }
                    });
                    button.appendChild(deleteBtn); 

                    let targetDivId;
                    switch (player.tier) {
                        case 'SSR': targetDivId = 'list-SSR'; break; case 'SR': targetDivId = 'list-SR'; break;
                        case 'S':   targetDivId = 'list-S';   break; case 'A': targetDivId = 'list-A';   break;
                        case 'B':   targetDivId = 'list-B';   break; case 'C': targetDivId = 'list-C';   break;
                        case 'D':   targetDivId = 'list-D';   break; case 'E': targetDivId = 'list-E';   break;
                        default:    targetDivId = null;
                    }
                    if (targetDivId) { document.getElementById(targetDivId).appendChild(button); }
                });
                updatePlayerButtonStates();
            }

            function updatePlayerButtonStates() {
                const takenPlayers = new Set();
                allTeams.forEach(team => { team.members.forEach(member => takenPlayers.add(member.name)); });
                const activeTeam = allTeams.find(team => team.id === activeTeamId);

                document.querySelectorAll('.player-button').forEach(button => {
                    const name = button.dataset.name; const cost = parseInt(button.dataset.cost);
                    if (takenPlayers.has(name)) {
                        button.classList.add('selected'); button.classList.remove('disabled'); button.disabled = true;
                    } else if (!activeTeam) {
                        button.classList.add('disabled'); button.classList.remove('selected'); button.disabled = true;
                    } else if (activeTeam.cost + cost > MAX_COST) {
                        button.classList.add('disabled'); button.classList.remove('selected'); button.disabled = true;
                    } else {
                        button.classList.remove('selected', 'disabled'); button.disabled = false;
                    }
                });
            }

            setupDropZones(); 
            renderAll(); 
        });