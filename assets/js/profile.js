import { supabase } from './supabase.js';

let allPlayers = [];
let hallOfFameData = [];

// 정렬 상태 관리
let currentSort = { key: 'name', order: 'asc' };

// 티어 가중치 (정렬용) - Chicken, Stick 추가
const TIER_WEIGHT = {
    'SSS': 100, 'SS': 90, 'S': 80, 'A': 70, 
    'B': 60, 'C': 50, 'D': 40, 'F': 30, 
    'CHICKEN': 20, // 닭 (F 밑)
    'STICK': 10,   // 나뭇가지 (제일 아래)
    'UNRANKED': 0, '-': 0
};

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();

    // 모달 닫기 버튼 이벤트
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('profileModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('profileModal')) closeModal();
    });

    // 검색창 입력 이벤트
    document.getElementById('tableSearch').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filterTable(term);
    });

    // 정렬 헤더 클릭 이벤트
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.key;
            handleSort(key);
        });
    });
});

async function loadAllData() {
    const [playersRes, historyRes] = await Promise.all([
        supabase.from('players').select('*').order('name', { ascending: true }),
        supabase.from('hall_of_fame').select('*').order('created_at', { ascending: false })
    ]);

    if (playersRes.error || historyRes.error) return console.error("데이터 로딩 실패");

    hallOfFameData = historyRes.data;

    allPlayers = playersRes.data.map(player => {
        // ★ 여기서 정확한 통계 계산 수행
        const stats = calculateStats(player.name, hallOfFameData);
        return { ...player, ...stats };
    });

    renderTable(allPlayers);
}

function handleSort(key) {
    if (currentSort.key === key) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = key;
        if (['totalGames', 'totalWins', 'winRate'].includes(key)) {
            currentSort.order = 'desc';
        } else if (key === 'avgRank') {
            currentSort.order = 'asc';
        } else {
            currentSort.order = 'asc';
        }
    }
    updateSortIcons();
    sortAndRender();
}

function sortAndRender() {
    const { key, order } = currentSort;
    const multiplier = order === 'asc' ? 1 : -1;

    allPlayers.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (key === 'tier') {
            valA = TIER_WEIGHT[(valA || '-').toUpperCase()] || 0;
            valB = TIER_WEIGHT[(valB || '-').toUpperCase()] || 0;
        } 
        else if (key === 'avgRank') {
            valA = valA === '-' ? 999 : parseFloat(valA);
            valB = valB === '-' ? 999 : parseFloat(valB);
        }
        else if (typeof valA === 'string') {
            return valA.localeCompare(valB) * multiplier;
        }

        if (valA < valB) return -1 * multiplier;
        if (valA > valB) return 1 * multiplier;
        return 0;
    });

    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    if (searchTerm) filterTable(searchTerm);
    else renderTable(allPlayers);
}

function updateSortIcons() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('active');
        const icon = th.querySelector('i');
        icon.className = 'fa-solid fa-sort sort-icon';
        
        if (th.dataset.key === currentSort.key) {
            th.classList.add('active');
            icon.className = currentSort.order === 'asc' ? 'fa-solid fa-sort-up sort-icon' : 'fa-solid fa-sort-down sort-icon';
        }
    });
}

// ★ [핵심 수정] 정확한 이름 매칭을 위한 통계 계산 함수
function calculateStats(playerName, historyData) {
    let totalGames = 0;
    let totalWins = 0;
    let rankSum = 0;
    let rankCount = 0;
    const matches = [];

    // 헬퍼 함수: 쉼표로 자르고 앞뒤 공백 제거
    const parseMembers = (str) => {
        if (!str) return [];
        return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
    };

    historyData.forEach(record => {
        if (!record.match_detail || !Array.isArray(record.match_detail)) return;
        
        // 내 이름이 포함된 팀 찾기 (정확히 일치하는 경우만)
        const myIndex = record.match_detail.findIndex(team => {
            let memberList = [];
            
            if (Array.isArray(team.members)) {
                memberList = team.members;
            } else if (typeof team.members === 'string') {
                memberList = parseMembers(team.members);
            }
            
            // ★ includes()를 배열에 사용하면 정확히 일치하는 요소만 찾음 ("Jack" != "Captain Jack")
            return memberList.includes(playerName);
        });

        if (myIndex !== -1) {
            totalGames++;
            let rank = myIndex + 1; 
            const myRecord = record.match_detail[myIndex];
            const idText = (myRecord.id || '').toString();
            
            if (idText.includes('우승') || idText.includes('1등')) rank = 1;

            if (rank === 1) totalWins++;
            if (rank < 99) { rankSum += rank; rankCount++; }

            let displayMembers = "";
            if(Array.isArray(myRecord.members)) displayMembers = myRecord.members.join(', ');
            else displayMembers = myRecord.members;

            matches.push({
                date: new Date(record.created_at).toLocaleDateString(),
                title: record.team_name, 
                members: displayMembers,
                rank: rank,
                rankText: idText 
            });
        }
    });

    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const avgRank = rankCount > 0 ? (rankSum / rankCount).toFixed(1) : '-';

    return { totalGames, totalWins, winRate, avgRank, matches };
}

function renderTable(players) {
    const tbody = document.getElementById('playerTableBody');
    tbody.innerHTML = '';

    players.forEach(p => {
        const tr = document.createElement('tr');
        const imgHtml = p.image_url ? `<img src="${p.image_url}">` : `<i class="fa-solid fa-user" style="color:#555"></i>`;

        // 테이블 목록에서 티어 한글 변환
        let displayTier = p.tier || '-';
        if (displayTier === 'Chicken') displayTier = '닭';
        if (displayTier === 'Stick') displayTier = '나뭇가지';

        tr.innerHTML = `
            <td>
                <div class="td-player-info">
                    <div class="td-img">${imgHtml}</div>
                    <span class="td-name">${p.name}</span>
                </div>
            </td>
            <td style="color:var(--accent-gold); font-weight:bold;">${displayTier}</td>
            <td>${p.totalGames}</td>
            <td>${p.totalWins}</td>
            <td class="text-win-rate">${p.winRate}%</td>
            <td>${p.avgRank}</td>
        `;
        tr.addEventListener('click', () => openModal(p));
        tbody.appendChild(tr);
    });
}

function filterTable(term) {
    // 검색창 기능: 여기서는 'ja'라고 쳐도 'jack'이 나와야 하므로 includes 유지
    // 하지만 검색 결과 클릭 시 상세 정보는 위에서 수정한 calculateStats 덕분에 정확하게 나옴
    const filtered = allPlayers.filter(p => p.name.toLowerCase().includes(term));
    renderTable(filtered);
}

function openModal(player) {
    document.getElementById('pName').textContent = player.name;
    
    // 모달창에서도 티어 한글 변환
    let displayTier = player.tier || 'Unranked';
    if (displayTier === 'Chicken') displayTier = '닭';
    if (displayTier === 'Stick') displayTier = '나뭇가지';
    document.getElementById('pTier').textContent = displayTier;

    document.getElementById('pCost').textContent = `${player.cost || 0} 코스트`;
    
    const imgBox = document.getElementById('pImg');
    imgBox.innerHTML = player.image_url ? `<img src="${player.image_url}">` : `<i class="fa-solid fa-user"></i>`;

    document.getElementById('statTotal').textContent = player.totalGames;
    document.getElementById('statWins').textContent = player.totalWins;
    document.getElementById('statWinRate').textContent = `${player.winRate}%`;
    document.getElementById('statAvgRank').textContent = player.avgRank === '-' ? '-' : `${player.avgRank}위`;

    const listContainer = document.getElementById('matchHistoryList');
    listContainer.innerHTML = '';

    if (player.matches.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">기록이 없습니다.</p>';
    } else {
        player.matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'match-card';
            let rankClass = '';
            if (match.rank === 1) rankClass = 'rank-1';
            else if (match.rank === 2) rankClass = 'rank-2';
            else if (match.rank === 3) rankClass = 'rank-3';

            div.innerHTML = `
                <div class="match-info">
                    <div class="match-title">${match.title || 'Round'}</div> <div class="match-team"><i class="fa-solid fa-users"></i> ${match.members}</div>
                    <div class="match-date">${match.date}</div>
                </div>
                <div class="match-rank ${rankClass}">
                    ${match.rank < 99 ? match.rank + '위' : (match.rankText || '-')}
                </div>
            `;
            listContainer.appendChild(div);
        });
    }
    document.getElementById('profileModal').classList.add('active');
}

function closeModal() {
    document.getElementById('profileModal').classList.remove('active');
}