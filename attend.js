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

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 요소 (안전한 참조 확인) ---
    const attendingView = document.getElementById('attending-view');
    const notAttendingView = document.getElementById('not-attending-view');
    const totalCountSpan = document.getElementById('total-count');
    const attendingCountSpan = document.getElementById('attending-count');
    const notAttendingCountSpan = document.getElementById('not-attending-count');
    const viewAllButton = document.getElementById('view-all-button');
    const viewTierButton = document.getElementById('view-tier-button');
    
    // [★확인★] 필수 DOM 요소가 없으면 JS 실행 중단 후 메시지 표시
    if (!attendingView || !notAttendingView) {
        console.error("필수 DOM 요소 (attending-view 또는 not-attending-view)를 찾을 수 없습니다.");
        return; 
    }

    const playerStorageKey = 'savedPlayers';
    const attendanceStorageKey = 'attendanceStatus';

    let players = [];
    let attendanceStatus = {};
    const tiers = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F'];

    // --- 유틸리티 함수 ---
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
            
            // [★중요 수정★] 선수 목록이 없으면 오류 메시지 출력
            if (players.length === 0) {
                attendingView.innerHTML = '<p style="color:#f39c12; font-weight:bold;">선수 목록이 비어있습니다. 티어 관리 페이지에서 선수를 추가해주세요.</p>';
                notAttendingView.innerHTML = '';
                return false;
            }

            players.sort((a, b) => a.name.localeCompare(b.name));

            const savedAttendanceJSON = localStorage.getItem(attendanceStorageKey);
            attendanceStatus = savedAttendanceJSON ? JSON.parse(savedAttendanceJSON) : {};

            players.forEach(player => {
                if (!(player.name in attendanceStatus)) {
                    attendanceStatus[player.name] = false; // 기본값 퇴근
                }
                if (typeof player.cost !== 'number') {
                     player.cost = parseInt(player.cost) || 1; // 코스트 안전 장치
                }
            });

            return true;

        } catch (e) {
            console.error("데이터 로드 실패:", e);
            attendingView.innerHTML = `<p style="color:red; font-weight:bold;">🚨 데이터 로드 중 심각한 오류가 발생했습니다: ${e.message}</p>`;
            notAttendingView.innerHTML = '';
            return false;
        }
    }

    // 2. 데이터 저장
    function saveAttendance() {
        try {
            localStorage.setItem(attendanceStorageKey, JSON.stringify(attendanceStatus));
        } catch (e) {
            console.error("출석 상태 저장 실패:", e);
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

        li.innerHTML = `
            <span class="status-point"></span>
            <span>${playerName} (${tier})</span>
        `;

        li.addEventListener('click', toggleAttendance);
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
        const classified = {
            attending: { all: [], tiers: {} },
            notAttending: { all: [], tiers: {} }
        };
        
        players.forEach(player => {
            const isAttending = attendanceStatus[player.name] === true;
            const tier = getTierFromCost(player.cost) || 'N/A';
            const target = isAttending ? classified.attending : classified.notAttending;
            
            target.all.push(player);
            if (!target.tiers[tier]) {
                target.tiers[tier] = [];
            }
            target.tiers[tier].push(player);
        });
        
        return classified;
    }
    
    function renderListView(targetElement, playerList) {
        targetElement.innerHTML = '';
        const div = document.createElement('div'); 
        div.className = 'player-list-view';
        
        playerList.sort((a, b) => a.name.localeCompare(b.name)).forEach(player => {
            div.appendChild(createPlayerListItem(player));
        });
        
        targetElement.appendChild(div);
    }
    
    function renderTierView(targetElement, tierGroups) {
        targetElement.innerHTML = '';
        
        const tierViewContainer = document.createElement('div');
        tierViewContainer.className = 'tier-view-container';

        tiers.concat(['N/A']).forEach(tier => { 
            const tierPlayers = tierGroups[tier];
            // [★수정★] N/A 티어 선수만 포함될 때도 섹션 표시
            if (tierPlayers && tierPlayers.length > 0) {
                const section = document.createElement('div');
                section.className = 'tier-section';
                
                const costDisplay = getCostFromTier(tier) > 0 ? ` (${getCostFromTier(tier)} 코스트)` : '';
                section.innerHTML = `<h3>${tier}${costDisplay}</h3>`;
                
                const list = document.createElement('div');
                list.className = 'player-list-view tier-section-list';
                
                tierPlayers.sort((a, b) => a.name.localeCompare(b.name)).forEach(player => {
                    list.appendChild(createPlayerListItem(player));
                });
                
                section.appendChild(list);
                tierViewContainer.appendChild(section);
            }
        });
        
        targetElement.appendChild(tierViewContainer);
    }

    // 6. 뷰 전환 및 갱신 로직
    function switchView(isTierView) {
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
    
    // 7. 뷰 전체 갱신 (상태 변경 시)
    function renderViews() {
        const classified = classifyPlayers();
        
        updateCounts(classified); // 카운트 업데이트

        // [★수정★] 버튼 상태를 기준으로 현재 뷰 모드 판단
        const isTierView = viewTierButton && viewTierButton.classList.contains('active');
        
        // 렌더링
        if (isTierView) {
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


    // --- 페이지 로드 시 실행 ---
    if (loadData()) {
        attachViewControls();
        switchView(true); // [★수정★] 기본은 '티어별 보기 (true)'로 설정
    } 
});