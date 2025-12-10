import { supabase } from './supabase.js';

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    loadPlayers();
    setupDragAndDrop();
    setupEventListeners();
    setupDeleteZone();
});

// 1. DB에서 선수 목록 불러오기
async function loadPlayers() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true }); // 이름순 정렬

    if (error) {
        alert("데이터 불러오기 실패!");
        console.error(error);
        return;
    }

    // 화면 초기화
    document.querySelectorAll('.tier-body').forEach(el => el.innerHTML = '');

    // 선수 배치
    data.forEach(player => {
        createPlayerCard(player);
    });
}

// 2. 선수 카드 생성 및 배치 함수
function createPlayerCard(player) {
    const card = document.createElement('div');
    card.classList.add('player-card');
    card.draggable = true; // 드래그 가능하게 설정
    card.textContent = player.name;
    card.dataset.id = player.id; // 카드에 선수 ID 숨겨두기
    
    // DB에 저장된 티어 위치로 보내기
    let targetTierId = 'tier-unassigned'; // 기본값
    if (player.tier) {
        const tierId = `tier-${player.tier.toLowerCase()}`;
        if (document.getElementById(tierId)) {
            targetTierId = tierId;
        }
    }
    
    document.getElementById(targetTierId).appendChild(card);

    // 드래그 이벤트 다시 연결 (새로 생긴 카드니까)
    addDragEvents(card);
}

// 3. 드래그 앤 드롭 로직
function setupDragAndDrop() {
    const containers = document.querySelectorAll('.tier-body');

    containers.forEach(container => {
        container.addEventListener('dragover', e => {
            e.preventDefault(); // 이걸 해야 드롭 가능
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });

        container.addEventListener('drop', e => {
            e.preventDefault();
            container.classList.remove('drag-over');
            
            // 현재 드래그 중인 카드 가져오기
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard) {
                container.appendChild(draggingCard);
            }
        });
    });
}

function addDragEvents(card) {
    card.addEventListener('dragstart', () => {
        card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });
}

// 4. 저장 및 추가 버튼 이벤트
function setupEventListeners() {
    // 1. 저장 버튼 클릭
    document.getElementById('saveBtn').addEventListener('click', saveAllChanges);

    // 2. 선수 추가 버튼 클릭
    document.getElementById('addBtn').addEventListener('click', addNewPlayer);

    // 3. ★ 추가된 기능: 입력창에서 엔터키(Enter) 입력 시 추가 실행
    document.getElementById('newPlayerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewPlayer();
        }
    });
}

// ★ 변경사항 일괄 저장 (핵심 기능)
async function saveAllChanges() {
    const updates = [];
    const saveBtn = document.getElementById('saveBtn');
    
    // 버튼 상태 변경 (저장 중...)
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';

    // 1. 티어 박스에 있는 선수들 수집
    document.querySelectorAll('.tier-row').forEach(row => {
        const tierName = row.dataset.tier;
        const tierCost = parseInt(row.dataset.cost);
        
        const cards = row.querySelectorAll('.player-card');
        cards.forEach(card => {
            const playerId = card.dataset.id;
            // ★ 중요 수정: ID를 숫자로 변환하고, 이름(name)도 같이 보냄!
            updates.push({
                id: parseInt(playerId),     // 문자를 숫자로 변환 ('1' -> 1)
                name: card.textContent,     // 이름이 없으면 에러나므로 꼭 포함
                tier: tierName,
                cost: tierCost
            });
        });
    });

    // 2. 미배정 구역에 있는 선수들 수집
    const unassignedCards = document.querySelectorAll('#tier-unassigned .player-card');
    unassignedCards.forEach(card => {
        const playerId = card.dataset.id;
        updates.push({
            id: parseInt(playerId),         // 숫자로 변환
            name: card.textContent,         // 이름 포함
            tier: null,
            cost: 0
        });
    });

    console.log("보내는 데이터:", updates); // 콘솔에서 확인용

    // 3. Supabase에 업데이트
    const { error } = await supabase
        .from('players')
        .upsert(updates);

    if (error) {
        alert("저장 실패 ㅠㅠ (콘솔 확인)");
        console.error("Supabase Error:", error);
    } else {
        alert("저장 완료! ✅");
        // 저장 후 목록 다시 불러오기 (확실한 동기화)
        loadPlayers(); 
    }

    saveBtn.innerHTML = originalText;
}

// ★ 새 선수 추가
async function addNewPlayer() {
    const input = document.getElementById('newPlayerName');
    const name = input.value.trim();

    if (!name) return alert("이름을 입력하세요!");

    // DB에 추가
    const { data, error } = await supabase
        .from('players')
        .insert([{ name: name, tier: null, cost: 0, status: 'waiting' }])
        .select();

    if (error) {
        alert("추가 실패!");
        console.error(error);
    } else {
        // 화면에도 바로 추가 (새로고침 안 해도 되게)
        createPlayerCard(data[0]);
        input.value = ''; // 입력창 비우기
    }
}

// ★ 선수 삭제 (쓰레기통) 기능
function setupDeleteZone() {
    const deleteZone = document.getElementById('delete-zone');

    // 드래그 진입 시 스타일 변경
    deleteZone.addEventListener('dragover', e => {
        e.preventDefault();
        deleteZone.classList.add('drag-over');
    });

    deleteZone.addEventListener('dragleave', () => {
        deleteZone.classList.remove('drag-over');
    });

    // 드롭 시 삭제 실행
    deleteZone.addEventListener('drop', async e => {
        e.preventDefault();
        deleteZone.classList.remove('drag-over');

        const draggingCard = document.querySelector('.dragging');
        if (!draggingCard) return;

        const playerId = draggingCard.dataset.id;
        const playerName = draggingCard.textContent;

        // 확인 창 띄우기
        if (confirm(`'${playerName}' 선수를 정말 삭제하시겠습니까?`)) {
            // 1. 화면에서 즉시 삭제
            draggingCard.remove();

            // 2. DB에서 영구 삭제
            const { error } = await supabase
                .from('players')
                .delete()
                .eq('id', playerId);

            if (error) {
                alert("삭제 실패! (콘솔 확인)");
                console.error(error);
                loadPlayers(); // 실패하면 다시 불러와서 복구
            } else {
                // 성공 시 별도 알림 없이 깔끔하게 처리 (또는 alert("삭제됨") 추가 가능)
            }
        }
    });
}