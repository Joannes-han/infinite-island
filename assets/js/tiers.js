import { supabase } from './supabase.js';
import { escapeHtml, safeHttpUrl } from './safe-render.js';

// ==========================================
// 1. 초기화 (페이지 로드 시 실행)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadPlayers();          // 데이터 불러오기
    setupDragEvents();      // 드래그 설정
    setupEventListeners();  // 버튼 이벤트 연결
    setupDeleteZone();      // 삭제 구역 설정
});

// ==========================================
// 2. 데이터 불러오기 및 배치 (핵심)
// ==========================================
async function loadPlayers() {
    // 1. 화면 초기화
    document.querySelectorAll('.tier-body').forEach(el => el.innerHTML = '');
    
    // 미배정 구역 찾기 (둘 중 하나라도 걸려라)
    const unassignedBox = document.getElementById('tier-unassigned') || document.getElementById('pool-unranked');
    if (unassignedBox) unassignedBox.innerHTML = '';

    // 2. DB 데이터 가져오기
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("데이터 로딩 실패:", error);
        return;
    }

    // 3. 배치 시작
    data.forEach(player => {
        const card = createPlayerCard(player);

        if (player.tier) {
            // DB값(Chicken) -> 소문자 변환(chicken) -> ID 조합(tier-chicken)
            const cleanTier = player.tier.trim(); // 공백 제거
            const targetId = `tier-${cleanTier.toLowerCase()}`;
            const container = document.getElementById(targetId);

            if (container) {
                // 방을 찾음 -> 입장
                container.appendChild(card);
            } else {
                // ★ 방을 못 찾음 -> 여기가 문제! 콘솔에 경고 출력
                console.warn(`🚨 [오류 발생] 선수는 "${cleanTier}" 티어인데, HTML에 id="${targetId}" 박스가 없습니다!`);
                console.log(`DB 저장된 값: ${player.tier}`);
                
                // 임시로 미배정에 넣음
                if (unassignedBox) unassignedBox.appendChild(card);
            }
        } else {
            // 티어가 없음(null) -> 미배정
            if (unassignedBox) unassignedBox.appendChild(card);
        }
    });
}

// ==========================================
// 3. 카드 생성 함수 (★ 이미지 추가 버전)
// ==========================================
function createPlayerCard(player) {
    const div = document.createElement('div');
    div.className = 'player-card'; // 기존 CSS 클래스 사용
    
    // 데이터셋 저장 (이동/저장용)
    div.dataset.id = player.id;
    div.dataset.name = player.name; 

    // ★ [수정됨] 텍스트만 넣던 것을 -> 이미지 HTML 포함으로 변경
    
    // 1. 이미지가 있으면 img 태그, 없으면 기본 아이콘
    const imageUrl = safeHttpUrl(player.image_url);
    const imgHtml = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" class="tier-player-img" alt="${escapeHtml(player.name)}" draggable="false">`
        : `<div class="tier-player-placeholder"><i class="fa-solid fa-user"></i></div>`;

    // 2. HTML 조립 (이미지 + 이름)
    div.innerHTML = `
        ${imgHtml}
        <span class="player-name">${escapeHtml(player.name)}</span>
    `;

    // 드래그 가능하게 설정
    div.draggable = true;
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);

    return div; // 만든 카드 반환
}

// ==========================================
// 4. 드래그 앤 드롭 로직
// ==========================================
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.classList.add('dragging'); }, 0);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function setupDragEvents() {
    // 모든 티어 박스와 미배정 구역에 드롭 허용
    const containers = document.querySelectorAll('.tier-body, #tier-unassigned, #pool-unranked');
    
    containers.forEach(container => {
        container.addEventListener('dragover', (e) => {
            e.preventDefault(); // 드롭 허용
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard) {
                container.appendChild(draggingCard);
            }
        });
    });
}

// ==========================================
// 5. 버튼 이벤트 (저장, 추가)
// ==========================================
function setupEventListeners() {
    const saveBtn = document.getElementById('saveBtn');
    if(saveBtn) saveBtn.addEventListener('click', saveAllChanges);

    const addBtn = document.getElementById('addBtn');
    if(addBtn) addBtn.addEventListener('click', addNewPlayer);

    const nameInput = document.getElementById('newPlayerName');
    if(nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addNewPlayer();
        });
    }
}

// ==========================================
// 6. 저장 기능 (Save)
// ==========================================
async function saveAllChanges() {
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';
    saveBtn.disabled = true;

    try {
        const updates = [];

        // 1. 티어 박스 스캔
        document.querySelectorAll('.tier-row').forEach(row => {
            const tierName = row.dataset.tier; 
            const tierCost = parseInt(row.dataset.cost || 0);
            
            row.querySelectorAll('.player-card').forEach(card => {
                updates.push({
                    id: parseInt(card.dataset.id),
                    name: card.dataset.name || card.textContent.trim(),
                    tier: tierName,
                    cost: tierCost
                });
            });
        });

        // 2. 미배정 구역 스캔
        const unassignedCards = document.querySelectorAll('#tier-unassigned .player-card, #pool-unranked .player-card');
        unassignedCards.forEach(card => {
            updates.push({
                id: parseInt(card.dataset.id),
                name: card.dataset.name || card.textContent.trim(),
                tier: null,
                cost: 0
            });
        });

        // 3. DB 업데이트
        const { error } = await supabase.from('players').upsert(updates);

        if (error) throw error;

        alert("✅ 저장되었습니다!");
        await loadPlayers(); // 화면 동기화

    } catch (err) {
        console.error("저장 실패:", err);
        alert("저장 중 오류가 발생했습니다.");
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ==========================================
// 7. 선수 추가 및 삭제
// ==========================================
async function addNewPlayer() {
    const input = document.getElementById('newPlayerName');
    const name = input.value.trim();

    if (!name) return alert("이름을 입력하세요!");

    const { data, error } = await supabase
        .from('players')
        .insert([{ name: name, tier: null, cost: 0 }])
        .select();

    if (!error) {
        // 추가 성공 시 DB에서 다시 불러오기 (가장 안전)
        await loadPlayers();
        input.value = '';
    } else {
        alert("추가 실패!");
    }
}

function setupDeleteZone() {
    const deleteZone = document.getElementById('delete-zone');
    if(!deleteZone) return;

    deleteZone.addEventListener('dragover', e => {
        e.preventDefault();
        deleteZone.classList.add('drag-over');
    });

    deleteZone.addEventListener('dragleave', () => {
        deleteZone.classList.remove('drag-over');
    });

    deleteZone.addEventListener('drop', async e => {
        e.preventDefault();
        deleteZone.classList.remove('drag-over');

        const draggingCard = document.querySelector('.dragging');
        if (!draggingCard) return;

        if (confirm(`'${draggingCard.textContent}' 선수를 삭제하시겠습니까?`)) {
            const playerId = draggingCard.dataset.id;
            draggingCard.remove(); 

            const { error } = await supabase
                .from('players')
                .delete()
                .eq('id', playerId);
                
            if (error) await loadPlayers(); // 실패 시 복구
        }
    });
}
