// --- 기본 데이터 및 설정 ---
const defaultPlayers = [
    { name: '피닉스박', cost: 8, tier: 'SSS' }, { name: '민식박', cost: 7, tier: 'SS' }, { name: '갱맘', cost: 7, tier: 'SS' }, { name: '이로', cost: 7, tier: 'SS' }, { name: '검멋', cost: 7, tier: 'SS' }, { name: '행수', cost: 7, tier: 'SS' },
    { name: '이비스', cost: 6, tier: 'S' }, { name: '자연', cost: 6, tier: 'S' }, { name: '황블린', cost: 6, tier: 'S' }, { name: '모카형', cost: 6, tier: 'S' }, { name: '피아노캣', cost: 6, tier: 'S' },
    { name: '후참', cost: 5, tier: 'A' }, { name: '방찌', cost: 5, tier: 'A' }, { name: '유세라', cost: 5, tier: 'A' }, { name: '앰비션', cost: 5, tier: 'A' }, { name: '김뿡', cost: 5, tier: 'A' }, { name: '후니', cost: 5, tier: 'A' },
    { name: '농루트', cost: 4, tier: 'B' }, { name: '잭잭', cost: 4, tier: 'B' }, { name: '감규리', cost: 4, tier: 'B' }, { name: '유토링', cost: 4, tier: 'B' }, { name: '천시아', cost: 4, tier: 'B' }, { name: '찬우정', cost: 4, tier: 'B' },
    { name: '왈도쿤', cost: 3, tier: 'C' }, { name: '방캐', cost: 3, tier: 'C' }, { name: '쾅준', cost: 3, tier: 'C' }, { name: '헤징', cost: 3, tier: 'C' }, { name: '삐부', cost: 3, tier: 'C' }, { name: '고차비', cost: 3, tier: 'C' }, { name: '캡틴잭', cost: 3, tier: 'C' }, { name: '다비', cost: 3, tier: 'C' }, { name: '이선', cost: 3, tier: 'C' }, { name: '순당무', cost: 3, tier: 'C' },
    { name: '비행돼지', cost: 2, tier: 'D' }, { name: '멋사', cost: 2, tier: 'D' }, { name: '모잉', cost: 2, tier: 'D' }, { name: '오뉴', cost: 2, tier: 'D' },
    { name: '두뭉', cost: 1, tier: 'F' }, { name: '푸린', cost: 1, tier: 'F' }, { name: '치카', cost: 1, tier: 'F' }, { name: '냐미', cost: 1, tier: 'F' }, { name: '샘웨', cost: 1, tier: 'F' }, { name: '나리땽', cost: 1, tier: 'F' } ,{ name: '꽃핀', cost:1, tier:'F'}
];
const defaultTeams = [ // 기본 8팀
    { id: 1, name: 'Team 1', members: [], cost: 0 }, { id: 2, name: 'Team 2', members: [], cost: 0 },
    { id: 3, name: 'Team 3', members: [], cost: 0 }, { id: 4, name: 'Team 4', members: [], cost: 0 },
    { id: 5, name: 'Team 5', members: [], cost: 0 }, { id: 6, name: 'Team 6', members: [], cost: 0 },
    { id: 7, name: 'Team 7', members: [], cost: 0 }, { id: 8, name: 'Team 8', members: [], cost: 0 }
];
const CURRENT_DATA_VERSION = 2; // 데이터 구조 변경 시 이 숫자 증가
let players = [];
let allTeams = [];
let activeTeamId = null;
let attendanceStatus = {};
const MAX_MEMBERS_PER_TEAM = 3;
const attendanceStorageKey = 'attendanceStatus';

// --- 데이터 저장/로드 함수 ---

/** localStorage에 현재 선수, 팀, 데이터 버전 저장 */
function saveData() {
    try {
        localStorage.setItem('savedPlayers', JSON.stringify(players));
        localStorage.setItem('savedTeams', JSON.stringify(allTeams));
        localStorage.setItem('savedDataVersion', CURRENT_DATA_VERSION);
    } catch (e) { console.error("Save Error:", e); }
}

/** localStorage에서 데이터 로드, 버전 체크 및 초기화 */
function loadData() {
    console.log("loadData 시작");
    let needsDefaultPlayers = false;
    let needsDefaultTeams = false;
    let versionMismatch = false;

    // 버전 체크
    try {
        const savedVersion = parseInt(localStorage.getItem('savedDataVersion'));
        console.log(`Ver: ${savedVersion} (saved), ${CURRENT_DATA_VERSION} (current)`);
        if (isNaN(savedVersion) || savedVersion !== CURRENT_DATA_VERSION) {
            console.warn(`버전 불일치/없음.`); versionMismatch = true; needsDefaultPlayers = true; needsDefaultTeams = true;
        }
    } catch (e) { console.error("Ver Check Error.", e); needsDefaultPlayers = true; needsDefaultTeams = true; }

    // 선수 로드
    try {
        const savedPlayersJSON = localStorage.getItem('savedPlayers');
        if (savedPlayersJSON && !needsDefaultPlayers) { players = JSON.parse(savedPlayersJSON); console.log("선수 로드 (저장됨)"); }
        else { players = JSON.parse(JSON.stringify(defaultPlayers)); console.log("선수 로드 (기본값)"); }
    } catch (e) { console.error("P Load Error", e); players = JSON.parse(JSON.stringify(defaultPlayers)); }

    // 팀 로드
    try {
        const savedTeamsJSON = localStorage.getItem('savedTeams');
        if (savedTeamsJSON && !needsDefaultTeams && JSON.parse(savedTeamsJSON).length > 0) { allTeams = JSON.parse(savedTeamsJSON); console.log("팀 로드 (저장됨)"); }
        else { allTeams = JSON.parse(JSON.stringify(defaultTeams)); console.log("팀 로드 (기본 8팀)"); }
    } catch (e) { console.error("T Load Error", e); allTeams = JSON.parse(JSON.stringify(defaultTeams)); }

    // 출석 상태 로드
    if (versionMismatch) {
        console.warn("출석 초기화 (버전 불일치)"); attendanceStatus = {}; localStorage.removeItem(attendanceStorageKey);
    } else {
         try {
            const savedAttendanceJSON = localStorage.getItem(attendanceStorageKey);
            if (savedAttendanceJSON) { attendanceStatus = JSON.parse(savedAttendanceJSON); console.log("출석 로드 (저장됨)"); }
            else { console.log("출석 로드 (없음)"); attendanceStatus = {}; }
        } catch (e) { console.error("A Load Error", e); attendanceStatus = {}; }
    }

    // 선수 목록 기준으로 출석 상태 객체 보정
    if (players && Array.isArray(players)) { players.forEach(p => { if (p && p.name && !(p.name in attendanceStatus)) { attendanceStatus[p.name] = false; } }); }
    else { console.error("players 배열 유효 X"); players = []; }
    console.log("최종 출석:", JSON.parse(JSON.stringify(attendanceStatus)));

    // activeTeamId 설정
    if (allTeams && Array.isArray(allTeams) && allTeams.length > 0) {
        const existingActiveTeam = allTeams.find(team => team.id === activeTeamId);
        if (!existingActiveTeam) { activeTeamId = allTeams[0].id; console.log("활성 팀 ID 재설정:", activeTeamId); }
        else { console.log("활성 팀 ID 유지:", activeTeamId); }
    } else {
         console.warn("allTeams 유효 X. 기본 팀 재설정."); allTeams = JSON.parse(JSON.stringify(defaultTeams));
         activeTeamId = allTeams.length > 0 ? allTeams[0].id : null;
    }
    console.log("loadData 완료, 최종 활성 팀 ID:", activeTeamId);
}


// --- 유틸리티 함수 ---

/** 티어 문자열로부터 코스트 숫자 반환 */
function getCostFromTier(tier) {
    switch (tier) {
        case 'SSS': return 8; case 'SS': return 7; case 'S': return 6;
        case 'A': return 5; case 'B': return 4; case 'C': return 3;
        case 'D': return 2; case 'F': return 1; default: return 0;
    }
}

/** 코스트 숫자로부터 티어 문자열 반환 */
function getTierFromCost(cost) {
    cost = parseInt(cost);
    switch (cost) {
        case 8: return 'SSS'; case 7: return 'SS'; case 6: return 'S';
        case 5: return 'A';   case 4: return 'B';  case 3: return 'C';
        case 2: return 'D';   case 1: return 'F';  default: return 'N/A';
    }
}

/** 특정 선수가 팀에 속해 있을 경우 해당 선수의 코스트 업데이트 및 팀 코스트 재계산 */
function updateTeamCostForPlayer(playerName, newCost, oldCost) {
    if (!allTeams || !Array.isArray(allTeams)) return;
    allTeams.forEach(team => {
        const member = team.members.find(m => m.name === playerName);
        if (member) {
            member.cost = newCost;
            team.cost = team.members.reduce((sum, m) => sum + (m.cost || 0), 0);
            return; // 찾았으면 더 이상 반복 불필요
        }
    });
}

/** 배열 요소 순서를 무작위로 섞음 (Fisher-Yates Shuffle) */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


// --- 렌더링 함수 ---

/** 왼쪽 컬럼의 팀 현황 박스들을 그림 */
function renderTeamBoxes() {
    console.log("renderTeamBoxes 시작, 팀 개수:", allTeams ? allTeams.length : 'undefined');
    const allTeamsContainer = document.getElementById('all-teams-container');
    if (!allTeamsContainer) { console.error("renderTeamBoxes: allTeamsContainer 못 찾음!"); return; }
    allTeamsContainer.innerHTML = ''; // 기존 내용 삭제
    if (!allTeams || allTeams.length === 0) { console.warn("표시할 팀 없음"); return; }

    allTeams.forEach(team => {
        const teamBox = document.createElement('div');
        teamBox.className = 'team-box';
        teamBox.dataset.teamId = team.id;
        teamBox.dataset.teamName = team.name;
        if (team.id === activeTeamId) { teamBox.classList.add('active'); } // 활성 팀 표시

        // 팀 멤버 span 생성
        const membersHTML = team.members.map(member =>
            `<span class="team-member" draggable="true"
                   data-player-name="${member.name}" data-player-cost="${member.cost}" data-team-id="${team.id}"
                   title="클릭: ${member.name} 제외 | 드래그: 팀 이동">
                ${member.name} (${member.cost || 'N/A'})
            </span>`
        ).join('');

        // 팀 박스 내용 구성
        teamBox.innerHTML = `
            <h3>${team.name} (총: ${team.cost}) [${team.members.length}/${MAX_MEMBERS_PER_TEAM}]</h3>
            <div class="team-member-list">${membersHTML}</div>
            <div class="team-box-buttons">
                <button class="clear-team-button">팀 비우기</button>
                <button class="remove-team-button">팀 삭제</button>
            </div>
        `;

        // 팀 박스 드롭존 이벤트 리스너 추가 (선수 추가/이동용)
        teamBox.addEventListener('dragover', handleTeamBoxDragOver);
        teamBox.addEventListener('dragleave', handleTeamBoxDragLeave);
        teamBox.addEventListener('drop', handleTeamBoxDrop);

        allTeamsContainer.appendChild(teamBox);
    });
    console.log("renderTeamBoxes 완료");
}

/** 오른쪽 컬럼의 선수 목록을 그림 (출근한 선수만) */
function renderPlayerList() {
    console.log("renderPlayerList 시작");
    const playerListDiv = document.getElementById('player-list');
    const attendeeCountSpan = document.getElementById('attendee-count');
    if (!playerListDiv || !attendeeCountSpan) { console.error("renderPlayerList: 필수 요소 못 찾음!"); return; }

    // 모든 티어 그룹 초기화
    const groups = playerListDiv.querySelectorAll('.player-button-group');
    groups.forEach(group => group.innerHTML = '');

    if (!players || !Array.isArray(players)) { console.error("players 배열 유효 X"); attendeeCountSpan.textContent = 0; return; }

    // 출근한 선수만 필터링
    const attendingPlayersNow = players.filter(p => p && p.name && attendanceStatus[p.name] === true);
    attendeeCountSpan.textContent = attendingPlayersNow.length; // 출근자 수 업데이트
    console.log(`출근 선수 ${attendingPlayersNow.length}명 필터링:`, attendingPlayersNow.map(p => p.name));

    // 출근한 선수들을 화면에 그림
    attendingPlayersNow.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';

        const button = document.createElement('button');
        const currentTier = player.tier || getTierFromCost(player.cost); // 티어 없으면 코스트로 추정
        const currentCost = player.cost || 0;
        button.className = `player-button tier-${currentTier}`;
        button.appendChild(document.createTextNode(`${player.name} (${currentCost})`));
        button.dataset.name = player.name;
        button.dataset.cost = currentCost;
        button.draggable = true;

        // 선수 버튼 드래그 시작 이벤트
        button.addEventListener('dragstart', (event) => {
            event.target.classList.add('dragging');
            const playerData = { name: player.name, cost: currentCost, source: 'playerList' }; // source 추가
            event.dataTransfer.setData('application/json', JSON.stringify(playerData));
            event.dataTransfer.setData('text/plain', player.name); // 티어 변경용
        });
        button.addEventListener('dragend', (event) => { event.target.classList.remove('dragging'); });

        // 선수 삭제 버튼
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-player-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = `${player.name} 삭제`;
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // 버튼 클릭 이벤트 버블링 방지
            handleDeletePlayerFromList(player.name); // 삭제 함수 호출
        });
        button.appendChild(deleteBtn);
        playerItem.appendChild(button);

        // 티어 그룹 찾아서 추가
        let targetDivId;
        switch (currentTier) {
            case 'SSS': targetDivId = 'list-SSS'; break; case 'SS': targetDivId = 'list-SS'; break;
            case 'S':   targetDivId = 'list-S';   break; case 'A': targetDivId = 'list-A';   break;
            case 'B':   targetDivId = 'list-B';   break; case 'C': targetDivId = 'list-C';   break;
            case 'D':   targetDivId = 'list-D';   break; case 'F': targetDivId = 'list-F';   break;
            default: targetDivId = null;
        }
        if (targetDivId) {
            const targetDiv = document.getElementById(targetDivId);
            if (targetDiv) { targetDiv.appendChild(playerItem); }
            else { console.error(`ID ${targetDivId} 못 찾음!`); }
        } else if (currentTier !== 'N/A') {
             console.warn(`${player.name} (${currentTier}) div 못 찾음`);
        }
    });

    console.log("renderPlayerList 완료");
    // 상태 업데이트는 renderAll 마지막에 호출됨
}

/** 선수 목록의 버튼 상태 업데이트 (Selected/Disabled) */
function updatePlayerButtonStates() {
     console.log("--- updatePlayerButtonStates 시작 ---");
     if (!allTeams || !Array.isArray(allTeams)) { console.error("오류: allTeams 유효 X!"); return; }

     const takenPlayers = new Set();
     allTeams.forEach(team => { if (team && Array.isArray(team.members)) { team.members.forEach(m => { if (m && m.name) { takenPlayers.add(m.name); } }); } });
     const activeTeam = allTeams.find(team => team.id === activeTeamId);
     const isActiveTeamValid = activeTeam !== undefined && activeTeam !== null;
     const activeTeamIsFull = isActiveTeamValid && activeTeam.members.length >= MAX_MEMBERS_PER_TEAM;

     console.log(` - 활성 팀: ${activeTeam ? activeTeam.name : '없음'} | 꽉참: ${activeTeamIsFull}`);
     console.log(` - 팀 소속 선수: ${[...takenPlayers].join(', ') || '없음'}`);

     document.querySelectorAll('#player-list .player-item .player-button').forEach(button => {
         const name = button.dataset.name; if (!name) { console.warn("버튼 data-name 없음:", button); return; }
         const isTaken = takenPlayers.has(name);
         if (isTaken) { // 팀 소속 O
             button.classList.add('selected'); button.classList.remove('disabled'); button.disabled = true;
         } else { // 팀 소속 X
             button.classList.remove('selected');
             // 활성 팀 없거나 꽉 찼으면 비활성화, 아니면 활성화
             button.disabled = !isActiveTeamValid || activeTeamIsFull;
             button.classList.toggle('disabled', button.disabled);
         }
     });
     console.log("--- updatePlayerButtonStates 완료 ---");
}

/** 전체 화면 다시 그리기 */
function renderAll() {
    console.log("renderAll 시작");
    renderTeamBoxes();
    renderPlayerList();
    updatePlayerButtonStates(); // 상태 업데이트는 렌더링 후 마지막에
    console.log("renderAll 완료");
}

// --- 드래그 앤 드롭 함수 ---

/** 선수 목록 내 티어 그룹 드롭존 설정 (티어 변경용) */
function setupDropZones() {
    const groups = document.querySelectorAll('#player-list .player-button-group');
    if (!groups || groups.length === 0) { console.error("setupDropZones: 그룹 못 찾음!"); return;}
    groups.forEach(g => {
        g.addEventListener('dragover', handleTierGroupDragOver);
        g.addEventListener('dragleave', handleTierGroupDragLeave);
        g.addEventListener('drop', handleTierGroupDrop);
    });
}
function handleTierGroupDragOver(event) { event.preventDefault(); event.currentTarget.classList.add('drag-over'); }
function handleTierGroupDragLeave(event) { event.currentTarget.classList.remove('drag-over'); }
function handleTierGroupDrop(event) {
    event.preventDefault(); event.currentTarget.classList.remove('drag-over'); let name;
    try { const d = JSON.parse(event.dataTransfer.getData('application/json')); name = d.name; }
    catch (err) { name = event.dataTransfer.getData('text/plain'); } // 예외 시 기존 방식
    const cost = parseInt(event.currentTarget.dataset.cost); const tier = event.currentTarget.dataset.tier;
    if (isNaN(cost) || !tier) { console.error("Drop target 데이터 오류"); return; }
    const p = players.find(x => x.name === name);
    if (p && p.tier !== tier) { const old = p.cost; p.cost = cost; p.tier = tier; updateTeamCostForPlayer(name, cost, old); saveData(); renderAll(); }
    else if (p && p.tier === tier) { console.log("같은 티어 드롭 무시."); }
    else { console.error("티어 변경 선수 못 찾음:", name); }
}

/** 팀 박스 드롭존 이벤트 핸들러 */
function handleTeamBoxDragOver(event) {
    event.preventDefault();
    const teamBox = event.currentTarget;
    const teamId = parseInt(teamBox.dataset.teamId);
    const targetTeam = allTeams.find(t => t.id === teamId);
    if (targetTeam && targetTeam.members.length < MAX_MEMBERS_PER_TEAM) {
        teamBox.classList.add('drag-over-team'); event.dataTransfer.dropEffect='move';
    } else { event.dataTransfer.dropEffect='none'; }
}
function handleTeamBoxDragLeave(event) { event.currentTarget.classList.remove('drag-over-team'); }
function handleTeamBoxDrop(event) {
     event.preventDefault(); event.currentTarget.classList.remove('drag-over-team');
     const targetTeamId = parseInt(event.currentTarget.dataset.teamId);
     const targetTeam = allTeams.find(t => t.id === targetTeamId);
     if (!targetTeam || targetTeam.members.length >= MAX_MEMBERS_PER_TEAM) { return; }
     let playerData; try { playerData = JSON.parse(event.dataTransfer.getData('application/json')); } catch (e) { console.error("Drop Error:", e); return; }
     const player = { name: playerData.name, cost: playerData.cost };
     if (playerData.source === 'playerList') { // 선수 목록에서 온 경우
         if (attendanceStatus[player.name] !== true) { alert('출근 선수만.'); return; }
         const taken = allTeams.some(t => t.members.some(m => m.name === player.name));
         if (taken) { alert('이미 소속됨.'); return; }
         targetTeam.members.push(player); targetTeam.cost = targetTeam.members.reduce((s, m) => s + (m.cost || 0), 0);
     } else if (playerData.source === 'teamBox') { // 다른 팀에서 온 경우
         const sourceTeamId = playerData.sourceTeamId; if (sourceTeamId === targetTeamId) return;
         const sourceTeam = allTeams.find(t => t.id === sourceTeamId); if (!sourceTeam) return;
         sourceTeam.members = sourceTeam.members.filter(m => m.name !== player.name); sourceTeam.cost = sourceTeam.members.reduce((s, m) => s + (m.cost || 0), 0);
         targetTeam.members.push(player); targetTeam.cost = targetTeam.members.reduce((s, m) => s + (m.cost || 0), 0);
     } else { return; }
     saveData(); renderAll();
}

// --- 기타 함수 ---

/** 선수 목록에서 선수 삭제 처리 */
function handleDeletePlayerFromList(playerName) {
     const isPlayerTaken = allTeams.some(team => team.members.some(member => member.name === playerName));
     if (isPlayerTaken) { alert('팀 소속 선수는 삭제 불가.'); return; }
     if (confirm(`'${playerName}' 삭제?`)) {
         players = players.filter(p => p.name !== playerName);
         delete attendanceStatus[playerName]; // 출석 상태에서도 제거
         localStorage.setItem(attendanceStorageKey, JSON.stringify(attendanceStatus)); // 출석 변경 저장
         saveData(); // players 저장
         renderAll();
     }
}


// ---  메인 실행 로직 (DOMContentLoaded)  ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded 시작");

    // --- DOM 요소 선언 ---
    const splashScreen = document.getElementById('splash-screen');
    const mainContainer = document.querySelector('.main-container');
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

    

    // --- 페이지 초기화 로직 ---
    function initializePage() {
        console.log("페이지 초기화 시작");
        try {
            loadData(); // 데이터 로드
            attachEventListeners(); // 이벤트 연결
            // 필수 DOM 요소 확인은 이미 함수 내부에 있음
            if (document.getElementById('player-list') && document.getElementById('all-teams-container') && document.getElementById('attendee-count')) {
                setupDropZones();
                renderAll(); // 최종 렌더링
                console.log("초기화 완료");
            } else {
                console.error("초기화 실패: 필수 DOM 요소를 찾을 수 없습니다.");
            }
        } catch (error) {
             console.error("초기화 중 오류:", error);
        }
    }
    
    initializePage(); 

    // --- 이벤트 리스너 연결 함수 ---
    function attachEventListeners() {
        console.log("이벤트 리스너 연결 시작");

        // 새 팀 추가
        if (addTeamButton) { addTeamButton.addEventListener('click', () => {
            console.log("새 팀 추가 클릭됨!");
            if (!allTeams) allTeams = []; // allTeams가 null일 경우 초기화
            const teamId=Date.now();
            const newTeam={id:teamId,name:`Team ${allTeams.length+1}`,members:[],cost:0};
            allTeams.push(newTeam);
            activeTeamId=teamId;
            saveData();
            renderAll();
        }); } else { console.error("addTeamButton 못 찾음"); }

        // 모든 팀 초기화
        if (resetAllButton) { resetAllButton.addEventListener('click', () => {
            console.log("팀 초기화 클릭됨!");
            if(confirm('모든 팀 구성을 초기화 하시겠습니까?')){
                if(allTeams&&Array.isArray(allTeams)){
                    allTeams.forEach(t=>{t.members=[];t.cost=0});
                    activeTeamId=allTeams.length>0?allTeams[0].id:null;
                    saveData();
                    renderAll();
                }
            }
        }); } else { console.error("resetAllButton 못 찾음"); }

        

        // [★☆★ 로직 수정 ★☆★] 자동 배정 (밸런스 우선 + 랜덤 선수)
        if (autoAssignButton) {
            autoAssignButton.addEventListener('click', () => {
                console.log("자동 배정 버튼 클릭 감지! (밸런스 우선 + 랜덤 선수)");

                if (!confirm('현재 팀 구성을 유지한 채, 참석자 중 팀 없는 선수들을 빈 자리에 자동으로 배정하시겠습니까?\n(최종 밸런스 로직 적용)')) {
                    return;
                }
                
                if (!players || !Array.isArray(players) || !allTeams || !Array.isArray(allTeams)) {
                    console.error("자동 배정 실패: 데이터 유효 X"); return;
                }

                // 1. 이미 배정된 선수들 파악
                const assignedPlayerNames = new Set();
                allTeams.forEach(team => { team.members.forEach(member => assignedPlayerNames.add(member.name)); });

                // 2. 배정할 선수 목록 (참석 O, 배정 X)
                let unassignedAttendees = players
                    .filter(p => attendanceStatus[p.name] === true && !assignedPlayerNames.has(p.name));
                    
                let assignedCount = 0;
                let playersLeftToAssign = unassignedAttendees.length;

                // 3. [밸런스] 선수들을 코스트(티어)별로 "버킷(bucket)"에 그룹핑
                const buckets = {};
                unassignedAttendees.forEach(player => {
                    const cost = player.cost || 0;
                    if (!buckets[cost]) { buckets[cost] = []; }
                    buckets[cost].push(player);
                });
                
                // 4. [밸런스] 코스트가 높은 순서대로 버킷을 정렬
                const sortedCosts = Object.keys(buckets).map(Number).sort((a, b) => b - a);

                // 5. [랜덤 선수] 버킷에서 가장 코스트가 높은 선수를 1명 *랜덤*으로 꺼내는 함수
                function getNextAvailablePlayer() {
                    for (const cost of sortedCosts) {
                        if (buckets[cost] && buckets[cost].length > 0) {
                            const bucket = buckets[cost];
                            const randomIndex = Math.floor(Math.random() * bucket.length);
                            const player = bucket.splice(randomIndex, 1)[0];
                            return player;
                        }
                    }
                    return null;
                }

                // 6. 모든 선수가 배정될 때까지
                while (playersLeftToAssign > 0) {
                    
                    // 7. [랜덤 선수] 배정할 선수를 1명 뽑음
                    const playerToAssign = getNextAvailablePlayer();
                    if (!playerToAssign) {
                        break; // 배정할 선수가 더 이상 없음
                    }

                    // 8. [★밸런스 배정★] 선수를 받을 수 있는 "최적의" 팀을 찾음
                    let bestTeam = null;
                    let minMembers = MAX_MEMBERS_PER_TEAM; // 가장 적은 팀원 수
                    let minCostAtMinMembers = Infinity;    // 최소 팀원 팀 중 가장 낮은 코스트

                    allTeams.forEach(team => {
                        if (team.members.length < MAX_MEMBERS_PER_TEAM) { // 자리가 있는 팀 중에서
                            if (team.members.length < minMembers) {
                                // 1순위: 팀원 수가 가장 적은 팀
                                minMembers = team.members.length;
                                minCostAtMinMembers = team.cost;
                                bestTeam = team;
                            } else if (team.members.length === minMembers) {
                                // 2순위: 팀원 수가 같다면, 코스트가 가장 낮은 팀
                                if (team.cost < minCostAtMinMembers) {
                                    minCostAtMinMembers = team.cost;
                                    bestTeam = team;
                                }
                            }
                        }
                    });

                    // 9. 찾은 "최적의 팀"에 선수 배정
                    if (bestTeam) {
                        bestTeam.members.push({ name: playerToAssign.name, cost: playerToAssign.cost });
                        bestTeam.cost = bestTeam.members.reduce((sum, m) => sum + (m.cost || 0), 0); // 코스트 업데이트
                        assignedCount++;
                        playersLeftToAssign--;
                        console.log(` -> ${playerToAssign.name}(${playerToAssign.cost}) 배정됨 -> ${bestTeam.name} (현재 ${bestTeam.members.length}명, ${bestTeam.cost}코스트)`);
                    } else {
                        console.warn(`${playerToAssign.name} 선수를 배정할 팀이 없습니다. (모든 팀 꽉 참)`);
                        break; // 모든 팀이 꽉 참
                    }
                }
                
                console.log(`총 ${assignedCount}명 자동 배정 완료.`);
                saveData();
                renderAll();
            });
        } else { console.error("autoAssignButton 못 찾음"); }

        // 이미지 저장
        if (saveImageButton) { saveImageButton.addEventListener('click', () => {
            console.log("이미지 저장 클릭됨!");
            const target=document.getElementById('all-teams-container');if(!target){alert('캡처 영역 없음.');return;}
            const options={backgroundColor:'#1e1e1e',useCORS:true};
            html2canvas(target,options).then(c=>{const i=c.toDataURL('image/png');const d=document.createElement('a');d.href=i;d.download='팀_구성.png';document.body.appendChild(d);d.click();document.body.removeChild(d);}).catch(e=>{console.error('이미지 저장 오류:',e);alert('이미지 저장 실패.');});
        }); } else { console.error("saveImageButton 못 찾음"); }

        // 텍스트 복사
        if (copyTeamsButton) { copyTeamsButton.addEventListener('click', () => {
            console.log("텍스트 복사 클릭됨!");
            if(!allTeams||!Array.isArray(allTeams)){console.error("텍스트 복사 실패: 팀 데이터 유효 X");alert("팀 데이터 오류.");return;}
            let txt='';allTeams.forEach(t=>{txt+=`${t.name}(총:${t.cost})[${t.members.length}/${MAX_MEMBERS_PER_TEAM}명]:\n`;if(t.members.length>0){txt+=t.members.map(m=>`  -${m.name}(${m.cost||'?'})`).join('\n');}else{txt+=' (선수 없음)';}txt+='\n\n';}); // cost 없을 경우 대비
            navigator.clipboard.writeText(txt.trim()).then(()=>{const o=copyTeamsButton.textContent;copyTeamsButton.textContent='✅ 복사 완료!';copyTeamsButton.classList.add('copied');setTimeout(()=>{copyTeamsButton.textContent=o;copyTeamsButton.classList.remove('copied');},1500);}).catch(e=>{console.error('클립보드 복사 실패:',e);alert('복사 실패.');});
        }); } else { console.error("copyTeamsButton 못 찾음"); }

        // 선수 목록 클릭 (팀 배정)
        if (playerListDiv) { playerListDiv.addEventListener('click', (event) => {
            console.log("선수 목록 영역 클릭!");
            const btn = event.target.closest('.player-button');
            if(btn){
                console.log("선수 버튼 클릭됨:", btn.dataset.name);
                const name = btn.dataset.name; const cost = parseInt(btn.dataset.cost);
                const activeTeam = allTeams.find(t=>t.id===activeTeamId);
                const isActiveTeamValid = activeTeam !== undefined && activeTeam !== null;
                const activeTeamIsFull = isActiveTeamValid && activeTeam.members.length >= MAX_MEMBERS_PER_TEAM;

                if(attendanceStatus[name]!==true){alert('출근 선수만.');return;}
                if(!isActiveTeamValid){alert('팀 선택 필요.');return;}
                if(activeTeamIsFull){alert(`팀(${activeTeam.name}) 꽉 참.`);return;}
                const taken = allTeams.some(t=>t.id!==activeTeamId&&t.members.some(m=>m.name===name));
                if(taken){alert('이미 다른 팀 소속.');return;}
                if (!activeTeam.members.some(m => m.name === name)) {
                    activeTeam.members.push({name, cost});
                    activeTeam.cost = activeTeam.members.reduce((s, m) => s + (m.cost || 0), 0);
                    saveData(); renderAll();
                }
            }
        }); } else { console.error("playerListDiv 못 찾음"); }

        if (allTeamsContainer) {
         allTeamsContainer.addEventListener('click', (event) => {
             console.log("팀 현황 영역 클릭!");
             const member = event.target.closest('.team-member');
             const clearBtn = event.target.closest('.clear-team-button');
             const removeBtn = event.target.closest('.remove-team-button');
             const box = event.target.closest('.team-box'); // 클릭된 team-box 요소

             if (!box) return; // 팀 박스 외부 클릭 무시

             const teamId = parseInt(box.dataset.teamId); // 클릭된 팀의 ID

             if(member){ // 1. 선수 제거
                 console.log("팀 멤버 클릭됨:", member.dataset.playerName);
                 const team = allTeams.find(t=>t.id===teamId);
                 if(!team) return;
                 const name = member.textContent.split(' (')[0].trim();
                 const toRemove = team.members.find(m=>m.name===name);
                 if(toRemove){
                     team.cost -= toRemove.cost;
                     team.members = team.members.filter(m=>m.name!==name);
                     activeTeamId = teamId; //  제거한 팀 활성화
                     saveData();
                     renderAll();
                 }
             } else if(clearBtn){ // 2. 팀 비우기
                  console.log("팀 비우기 클릭됨");
                  const team = allTeams.find(t=>t.id===teamId);
                  if(team){
                      team.members=[];
                      team.cost=0;
                      activeTeamId = teamId; // ★★★ 비운 팀을 활성 팀으로 설정 ★★★
                      saveData();
                      renderAll();
                  }
             } else if(removeBtn){ // 3. 팀 삭제
                  console.log("팀 삭제 클릭됨");
                  allTeams=allTeams.filter(t=>t.id!==teamId);
                  allTeams.forEach((t, i)=>{t.name=`Team ${i+1}`;}); // 이름 재정렬
                  if(activeTeamId===teamId){ // 삭제한 팀이 활성 팀이었으면
                      activeTeamId=allTeams.length>0?allTeams[0].id:null; // 첫 팀 또는 null로 변경
                  }
                  saveData();
                  renderAll();
             } else if(box){ // 4. 팀 활성화 (다른 버튼 클릭이 아닐 때)
                  console.log("팀 박스 클릭됨 (활성화)");
                  activeTeamId = teamId;
                  renderAll(); // 활성화 상태만 변경 시에도 화면 갱신
             }
         });
        // --- 드래그 리스너들 ---
        allTeamsContainer.addEventListener('dragstart', (event) => { /* ... */ });
        allTeamsContainer.addEventListener('dragend', (event) => { /* ... */ });
    } else { console.error("allTeamsContainer 못 찾음"); }
        console.log("이벤트 리스너 연결 완료");
    }

    // --- 스플래시 로직 실행 ---
    handleSplashScreen(); // 완료 후 initializePage 호출

}); // DOMContentLoaded 끝