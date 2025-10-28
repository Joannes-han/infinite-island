// --- 티어/코스트 변환 함수 (index.html에서 가져옴) ---
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

// [전역 변수]
const playerStorageKey = 'savedPlayers';
const attendanceStorageKey = 'attendanceStatus';
const tiers = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F'];

let players = [];
let attendanceStatus = {};

// --- 데이터 및 상태 관리 함수 ---
function savePlayersData() {
    try { localStorage.setItem(playerStorageKey, JSON.stringify(players)); }
    catch (e) { console.error("선수 목록 저장 실패:", e); }
}
function saveAttendance() {
    try { localStorage.setItem(attendanceStorageKey, JSON.stringify(attendanceStatus)); }
    catch (e) { console.error("출석 상태 저장 실패:", e); }
}
function updatePlayerCost(playerName, newCost) {
    const playerIndex = players.findIndex(p => p.name === playerName);
    if (playerIndex > -1) {
        players[playerIndex].cost = newCost;
        players[playerIndex].tier = getTierFromCost(newCost);
        savePlayersData(); //  티어 변경 시 선수 목록 저장
    }
}


// ---  메인 실행 로직 (DOMContentLoaded)  ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM 요소 ---
    const attendingView = document.getElementById('attending-view');
    const notAttendingView = document.getElementById('not-attending-view');
    const totalCountSpan = document.getElementById('total-count');
    const attendingCountSpan = document.getElementById('attending-count');
    const notAttendingCountSpan = document.getElementById('not-attending-count');
    const viewAllButton = document.getElementById('view-all-button');
    const viewTierButton = document.getElementById('view-tier-button');
    const newPlayerNameInputAttend = document.getElementById('new-player-name-attend');
    const newPlayerCostSelectAttend = document.getElementById('new-player-cost-attend');
    const addPlayerButtonAttend = document.getElementById('add-player-button-attend');
    
    if (!attendingView || !notAttendingView) { console.error("필수 DOM 요소 없음"); return; }

    // --- 상태 변수 ---
    let viewMode = 'tier'; // 기본값 '티어별 보기'로 설정
    let draggedPlayerName = null; // 드래그 중인 선수 이름

    // --- 유틸리티 ---
    function updateCounts(classified) {
        if (attendingCountSpan) attendingCountSpan.textContent = classified.attending.all.length;
        if (notAttendingCountSpan) notAttendingCountSpan.textContent = classified.notAttending.all.length;
        if (totalCountSpan) totalCountSpan.textContent = players.length;
    }

    // 1. 데이터 로드
    function loadData() {
        try {
            const savedPlayersJSON = localStorage.getItem(playerStorageKey);
            players = savedPlayersJSON ? JSON.parse(savedPlayersJSON) : [];
            if (players.length === 0) {
                attendingView.innerHTML = '<p style="color:#f39c12; font-weight:bold;">선수 목록이 비어있습니다. 티어 관리 페이지에서 선수를 추가해주세요.</p>';
                notAttendingView.innerHTML = ''; return false;
            }
            players.sort((a, b) => a.name.localeCompare(b.name));
            const savedAttendanceJSON = localStorage.getItem(attendanceStorageKey);
            attendanceStatus = savedAttendanceJSON ? JSON.parse(savedAttendanceJSON) : {};
            players.forEach(player => {
                if (!(player.name in attendanceStatus)) { attendanceStatus[player.name] = false; }
                if (typeof player.cost !== 'number') { player.cost = parseInt(player.cost) || 1; }
            });
            return true;
        } catch (e) {
            console.error("데이터 로드 실패:", e);
            attendingView.innerHTML = `<p style="color:red; font-weight:bold;">🚨 데이터 로드 오류: ${e.message}</p>`;
            return false;
        }
    }
    
    // 3. 선수 리스트 아이템 생성 함수
    function createPlayerListItem(player) {
        const li = document.createElement('div');
        li.className = 'player-item';
        li.dataset.playerName = player.name;
        li.dataset.playerCost = player.cost;
        const playerName = player.name;
        const isAttending = attendanceStatus[playerName] === true;
        li.classList.add(isAttending ? 'attending' : 'not-attending');
        const tier = getTierFromCost(player.cost);
        li.innerHTML = `<span class="status-point"></span><span>${playerName} (${tier})</span>`;
        
        li.addEventListener('click', toggleAttendance); // 원클릭 기능
        
        li.setAttribute('draggable', true); // 드래그 기능
        li.addEventListener('dragstart', handleDragStart);
        
        return li;
    }

    // 4. 출석 상태 변경 함수 (클릭 이벤트)
    function toggleAttendance(event) {
        const li = event.currentTarget;
        const playerName = li.dataset.playerName;
        const newState = !attendanceStatus[playerName];
        attendanceStatus[playerName] = newState;
        saveAttendance();
        renderViews(); 
    }

    // 5. 뷰 렌더링 함수
    function classifyPlayers() {
        const classified = { attending: { all: [], tiers: {} }, notAttending: { all: [], tiers: {} } };
        players.forEach(player => {
            const isAttending = attendanceStatus[player.name] === true;
            const tier = getTierFromCost(player.cost) || 'N/A';
            const target = isAttending ? classified.attending : classified.notAttending;
            target.all.push(player);
            if (!target.tiers[tier]) { target.tiers[tier] = []; }
            target.tiers[tier].push(player);
        });
        return classified;
    }
    
    function renderListView(targetElement, playerList) {
        targetElement.innerHTML = '';
        const div = document.createElement('div'); 
        div.className = 'player-list-view';
        
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragleave', handleDragLeave);
        
        playerList.sort((a, b) => a.name.localeCompare(b.name)).forEach(player => {
            div.appendChild(createPlayerListItem(player));
        });
        targetElement.appendChild(div);
    }
    
    // 5c. 티어뷰 렌더링 (빈 티어 섹션도 표시하도록 수정)
    function renderTierView(targetElement, tierGroups) {
        targetElement.innerHTML = '';
        
        const tierViewContainer = document.createElement('div');
        tierViewContainer.className = 'tier-view-container';

        // [★수정★] tiers 배열을 기준으로 순회하여 모든 티어 섹션 생성
        tiers.forEach(tier => { 
            const tierPlayers = tierGroups[tier]; // 해당 티어 선수 목록 (없으면 undefined)
            
            const section = document.createElement('div');
            section.className = 'tier-section';
            
            const cost = getCostFromTier(tier);
            const costDisplay = cost > 0 ? ` (${cost} 코스트)` : '';
            section.innerHTML = `<h3>${tier}${costDisplay}</h3>`;
            
            const list = document.createElement('div');
            list.className = 'player-list-view tier-section-list';
            list.dataset.targetCost = cost; // 드롭 시 코스트 확인용
            
            // 드롭존 설정 (비어있어도 드롭 가능해야 함)
            list.addEventListener('dragover', handleDragOver);
            list.addEventListener('dragleave', handleDragLeave);
            list.addEventListener('drop', handleDrop);

            // 선수가 있을 때만 선수 버블 추가
            if (tierPlayers && tierPlayers.length > 0) {
                tierPlayers.sort((a, b) => a.name.localeCompare(b.name)).forEach(player => {
                    list.appendChild(createPlayerListItem(player));
                });
            }
            
            section.appendChild(list);
            tierViewContainer.appendChild(section);
        });
        
        // [★추가★] 'N/A' (미지정) 티어 선수들은 별도로 맨 아래에 표시
        const naPlayers = tierGroups['N/A'];
        if (naPlayers && naPlayers.length > 0) {
             const section = document.createElement('div');
             section.className = 'tier-section';
             section.innerHTML = `<h3>N/A (미지정)</h3>`;
             
             const list = document.createElement('div');
             list.className = 'player-list-view tier-section-list';
             list.dataset.targetCost = 0; // N/A는 코스트 0
             
             // 드롭존 설정
             list.addEventListener('dragover', handleDragOver);
             list.addEventListener('dragleave', handleDragLeave);
             list.addEventListener('drop', handleDrop);
             
             naPlayers.sort((a, b) => a.name.localeCompare(b.name)).forEach(player => {
                 list.appendChild(createPlayerListItem(player));
             });
             section.appendChild(list);
             tierViewContainer.appendChild(section);
        }
        
        targetElement.appendChild(tierViewContainer);
    }

    // 7. 뷰 전체 갱신 (상태 변경 시)
    function renderViews() {
        const classified = classifyPlayers();
        updateCounts(classified);
        
        // [★수정★] viewMode 변수 사용
        if (viewMode === 'tier') {
            renderTierView(attendingView, classified.attending.tiers);
            renderTierView(notAttendingView, classified.notAttending.tiers);
        } else {
            renderListView(attendingView, classified.attending.all);
            renderListView(notAttendingView, classified.notAttending.all);
        }
    }
    
    // 8. 뷰 컨트롤 이벤트
    function attachViewControls() {
        if (viewAllButton) viewAllButton.addEventListener('click', () => switchView(false));
        if (viewTierButton) viewTierButton.addEventListener('click', () => switchView(true));
    }

    // 9. 뷰 전환 및 갱신 로직
    function switchView(isTierView) {
        viewMode = isTierView ? 'tier' : 'all'; //  viewMode 변수 업데이트
        
        if (viewAllButton && viewTierButton) {
            if (isTierView) {
                viewAllButton.classList.remove('active');
                viewTierButton.classList.add('active');
            } else {
                viewAllButton.classList.add('active');
                viewTierButton.classList.remove('active');
            }
        }
        renderViews();
    }
    
    // 10. 선수 추가 로직 (이벤트 연결)
    if (addPlayerButtonAttend) {
        addPlayerButtonAttend.addEventListener('click', () => {
            const name = newPlayerNameInputAttend.value.trim();
            const cost = parseInt(newPlayerCostSelectAttend.value);
            const tier = getTierFromCost(cost);
            if (name === "") { alert('선수 이름을 입력하세요.'); return; }
            if (players.some(p => p.name === name)) { alert('이미 존재하는 선수 이름입니다.'); return; }

            const newPlayer = { name, cost, tier };
            players.push(newPlayer);
            attendanceStatus[name] = true; // 기본: 출근 상태로 추가
            players.sort((a, b) => a.name.localeCompare(b.name));
            saveAttendance(); 
            savePlayersData(); 
            renderViews();
            newPlayerNameInputAttend.value = '';
            alert(`'${name}' 선수가 목록에 추가되었습니다. (기본 티어: ${tier})`);
        });
    }

    
    // ---  드래그 앤 드롭 핸들러 (DOMContentLoaded 내부) ---
    
    function handleDragStart(e) {
        const playerName = e.target.dataset.playerName;
        const playerCost = e.target.dataset.playerCost;
        const isAttending = attendanceStatus[playerName];

        e.dataTransfer.setData('text/plain', JSON.stringify({
            name: playerName,
            oldAttending: isAttending,
            oldCost: parseInt(playerCost, 10)
        }));
        e.dataTransfer.effectAllowed = 'move';
        
        draggedPlayerName = playerName; // 전역(DOMContentLoaded) 변수에 저장
        setTimeout(() => e.target.classList.add('dragging'), 0);
    }
    
    // 드래그 종료 시 (dragging 클래스 제거)
    document.addEventListener('dragend', (e) => {
        if (draggedPlayerName) {
            const bubble = document.querySelector(`.player-item[data-player-name="${draggedPlayerName}"]`);
            if (bubble) bubble.classList.remove('dragging');
        }
        draggedPlayerName = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    function handleDragOver(e) {
        e.preventDefault();
        const dropZone = e.currentTarget;
        if (dropZone.classList.contains('player-list-view') || dropZone.classList.contains('tier-section-list')) {
            dropZone.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'move';
        }
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        const dropZone = e.currentTarget;
        dropZone.classList.remove('drag-over');
        
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const { name, oldAttending, oldCost } = data;
        
        if (!name) return;

        let needsRender = false;

        // --- 1. 출퇴근 상태 변경 (드롭된 열 기준) ---
        const isTargetAttendingZone = dropZone.closest('.attending-zone') !== null;
        if (oldAttending !== isTargetAttendingZone) {
            attendanceStatus[name] = isTargetAttendingZone;
            saveAttendance(); // ★ 저장
            needsRender = true;
        }
        
        // --- 2. 티어 변경 (티어별 보기에서만) ---
        if (viewMode === 'tier' && dropZone.dataset.targetCost) { //  viewMode 변수 사용
            const targetCost = parseInt(dropZone.dataset.targetCost, 10);
            
            if (oldCost !== targetCost) {
                updatePlayerCost(name, targetCost); //  저장 (함수 내부에서)
                needsRender = true;
            }
        }

        if (needsRender) {
            renderViews(); // 상태/티어 변경 시 화면 새로고침
        }
    }

    // --- 페이지 로드 시 실행 ---
    if (loadData()) {
        attachViewControls();
        switchView(true); // 기본은 '티어별 보기 (true)'로 설정
    } 
});
