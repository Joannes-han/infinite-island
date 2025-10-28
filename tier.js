// --- 티어/코스트 변환 함수 ---
function getTierFromCost(cost) {
    cost = parseInt(cost);
    switch (cost) {
        case 8: return 'SSS'; case 7: return 'SS'; case 6: return 'S';
        case 5: return 'A';   case 4: return 'B';  case 3: return 'C';
        case 2: return 'D';   case 1: return 'F';  default: return 'N/A';
    }
}
function getCostFromTier(tier) {
    switch (tier) {
        case 'SSS': return 8; case 'SS': return 7; case 'S': return 6;
        case 'A': return 5; case 'B': return 4; case 'C': return 3;
        case 'D': return 2; case 'F': return 1; default: return 0;
    }
}
// -----------------------------

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 요소 가져오기 ---
    const playerPoolContainer = document.getElementById('player-pool').querySelector('.player-bubbles');
    const tierRows = document.querySelectorAll('.tier-rows .tier-row');
    const saveButton = document.getElementById('save-tier-button');
    const newPlayerNameInput = document.getElementById('new-player-name-tier');
    const addPlayerButton = document.getElementById('add-player-button-tier');

    let players = []; // 선수 데이터 배열
    let teams = [];   // 팀 데이터 배열

    // 1. localStorage에서 선수 및 팀 데이터 불러오기
    function loadData() {
        try {
            const savedPlayersJSON = localStorage.getItem('savedPlayers');
            players = savedPlayersJSON ? JSON.parse(savedPlayersJSON) : [];
            players.sort((a, b) => a.name.localeCompare(b.name));

            const savedTeamsJSON = localStorage.getItem('savedTeams');
            teams = savedTeamsJSON ? JSON.parse(savedTeamsJSON) : [];

            return true;
        } catch (e) {
            console.error("데이터 로드 실패:", e);
            playerPoolContainer.textContent = `데이터 로드 오류: ${e.message}`;
            return false;
        }
    }

    // 2. 선수 버블 생성 및 배치
    function renderPlayers() {
        playerPoolContainer.innerHTML = '';
        tierRows.forEach(row => row.querySelector('.player-bubbles').innerHTML = '');

        players.forEach((player, index) => {
            const playerBubble = createPlayerBubble(player, index);
            const tier = player.tier || getTierFromCost(player.cost);
            const targetRow = (tier && tier !== 'N/A')
                ? document.querySelector(`.tier-row[data-tier="${tier}"]`)
                : null;

            if (targetRow) {
                targetRow.querySelector('.player-bubbles').appendChild(playerBubble);
            } else {
                playerPoolContainer.appendChild(playerBubble);
            }
        });
        addDropZoneListeners();
    }

    // 선수 버블 DOM 요소 생성 함수
    function createPlayerBubble(player, index) {
        const bubble = document.createElement('div');
        bubble.className = 'player-bubble';
        bubble.draggable = true;
        bubble.dataset.index = index;
        bubble.dataset.playerName = player.name;
        bubble.textContent = player.name;

        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-bubble-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = '선수 삭제';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            deletePlayer(index);
        });
        bubble.appendChild(deleteBtn);

        bubble.addEventListener('dragstart', handleDragStart);
        bubble.addEventListener('dragend', handleDragEnd);
        return bubble;
    }

    // 3. 선수 삭제 함수 [수정: confirm, alert 제거]
    function deletePlayer(indexToDelete) {
        const player = players[indexToDelete];
        if (player) { // 확인 없이 바로 진행
            const playerName = player.name;
            players.splice(indexToDelete, 1);
            teams.forEach(team => {
                const memberIndex = team.members.findIndex(m => m.name === playerName);
                if (memberIndex > -1) {
                    team.members.splice(memberIndex, 1);
                    team.cost = team.members.reduce((sum, m) => sum + m.cost, 0);
                }
            });
            renderPlayers();
            console.log(`'${playerName}' 선수가 삭제되었습니다.`); // 콘솔 로그로 대체
            // alert(`'${playerName}' 선수가 삭제되었습니다. 변경사항을 저장해주세요.`); // 제거됨
        }
    }

    // --- 선수 추가 로직 [수정: 성공 alert 제거] ---
    function addNewPlayer() {
        const name = newPlayerNameInput.value.trim();

        if (name === "") { alert('선수 이름을 입력하세요.'); return; } // 오류 alert 유지
        if (players.some(p => p.name === name)) { alert('이미 존재하는 선수 이름입니다.'); return; } // 오류 alert 유지

        const newPlayer = { name, cost: 0, tier: 'N/A' };
        players.push(newPlayer);
        players.sort((a, b) => a.name.localeCompare(b.name));

        renderPlayers();

        newPlayerNameInput.value = '';
        console.log(`'${name}' 선수가 추가되었습니다.`); // 콘솔 로그로 대체
        // alert(`'${name}' 선수가 추가되었습니다. 티어를 지정하고 변경사항을 저장해주세요.`); // 제거됨
    }

    // --- 드래그 앤 드롭 로직 ---
    let draggedBubble = null;

    function handleDragStart(event) {
        draggedBubble = event.target.closest('.player-bubble');
        if (!draggedBubble) return;
        event.dataTransfer.setData('text/plain', draggedBubble.dataset.index);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => draggedBubble.classList.add('dragging'), 0);
    }

    function handleDragEnd(event) {
        if (draggedBubble) { draggedBubble.classList.remove('dragging'); }
        draggedBubble = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const targetRow = event.target.closest('.tier-row');
        if (targetRow) {
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            targetRow.classList.add('drag-over');
        }
    }

    function handleDragLeave(event) {
        const targetRow = event.target.closest('.tier-row');
        if (targetRow) { targetRow.classList.remove('drag-over'); }
    }

    function handleDrop(event) {
        event.preventDefault();
        const targetRow = event.target.closest('.tier-row');
        if (targetRow && draggedBubble) {
            targetRow.classList.remove('drag-over');
            const playerIndex = parseInt(event.dataTransfer.getData('text/plain'));
            const player = players[playerIndex];

            if (player) {
                const isTargetPool = targetRow.id === 'player-pool';
                const newTier = isTargetPool ? 'N/A' : targetRow.dataset.tier;
                const newCost = isTargetPool ? 0 : parseInt(targetRow.dataset.cost);

                player.tier = newTier;
                player.cost = newCost;

                teams.forEach(team => {
                    const member = team.members.find(m => m.name === player.name);
                    if (member) {
                        member.cost = newCost;
                        team.cost = team.members.reduce((sum, m) => sum + m.cost, 0);
                    }
                });

                targetRow.querySelector('.player-bubbles').appendChild(draggedBubble);
                console.log(`Moved ${player.name} to ${newTier || 'Pool'}`);
            }
        }
        if (draggedBubble) { draggedBubble.classList.remove('dragging'); }
        draggedBubble = null;
    }

    // 드롭존 리스너 설정 함수
    function addDropZoneListeners() {
        document.querySelectorAll('.tier-row').forEach(row => {
            row.removeEventListener('dragover', handleDragOver);
            row.removeEventListener('dragleave', handleDragLeave);
            row.removeEventListener('drop', handleDrop);
            row.addEventListener('dragover', handleDragOver);
            row.addEventListener('dragleave', handleDragLeave);
            row.addEventListener('drop', handleDrop);
        });
    }


    // 4. 변경사항 저장 함수 [수정: 오류 alert 유지]
    function saveChanges() {
        try {
            players.sort((a, b) => a.name.localeCompare(b.name));

            localStorage.setItem('savedPlayers', JSON.stringify(players));
            localStorage.setItem('savedTeams', JSON.stringify(teams));

            saveButton.textContent = '✅ 저장 완료!';
            saveButton.classList.add('saved');
            setTimeout(() => {
                saveButton.textContent = '💾 변경사항 저장';
                saveButton.classList.remove('saved');
            }, 1500);

            renderPlayers();

        } catch (e) {
            console.error("변경사항 저장 실패:", e);
            alert(`저장 중 오류 발생: ${e.message}`); // 오류 alert 유지
        }
    }


    // --- 페이지 로드 시 실행 ---
    if (loadData()) {
        renderPlayers();
        addDropZoneListeners();
        saveButton.addEventListener('click', saveChanges);
        addPlayerButton.addEventListener('click', addNewPlayer);
    }
});