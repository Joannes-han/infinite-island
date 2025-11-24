import { supabase } from './supabase.js';

let allPlayers = [];      // 전체 선수 데이터 (스탯 포함)
let hallOfFameData = [];  // 명예의 전당 기록

// 정렬 상태 저장 (기본: 이름 오름차순)
let currentSort = {
    key: 'name',
    order: 'asc' // 'asc' or 'desc'
};

// 티어 정렬을 위한 가중치 (높을수록 상위)
const TIER_WEIGHT = {
    'SSS': 100, 'SS': 90, 'S': 80, 'A': 70, 
    'B': 60, 'C': 50, 'D': 40, 'F': 30, 
    'UNRANKED': 0, '-': 0
};

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();

    // 모달 닫기 이벤트
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('profileModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('profileModal')) closeModal();
    });

    // 검색 필터
    document.getElementById('tableSearch').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filterTable(term);
    });

    // ★ 정렬 이벤트 연결
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

    // 스탯 계산 후 데이터 합치기
    allPlayers = playersRes.data.map(player => {
        const stats = calculateStats(player.name, hallOfFameData);
        return { ...player, ...stats };
    });

    // 초기 렌더링
    renderTable(allPlayers);
}

// ★ 정렬 핸들러
function handleSort(key) {
    // 이미 선택된 컬럼이면 순서 반전 (오름 <-> 내림)
    if (currentSort.key === key) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        // 새로운 컬럼이면 기본 정렬 설정
        currentSort.key = key;
        // 승률, 우승횟수 등 숫자는 내림차순(높은게 위로)이 기본이 좋음
        if (['totalGames', 'totalWins', 'winRate'].includes(key)) {
            currentSort.order = 'desc';
        } else if (key === 'avgRank') {
            currentSort.order = 'asc'; // 순위는 낮을수록(1위) 좋음
        } else {
            currentSort.order = 'asc'; // 이름, 티어는 오름차순
        }
    }

    updateSortIcons(); // 아이콘 UI 업데이트
    sortAndRender();   // 실제 데이터 정렬 및 그리기
}

function sortAndRender() {
    const { key, order } = currentSort;
    const multiplier = order === 'asc' ? 1 : -1;

    allPlayers.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        // 1. 티어 정렬 특수 처리
        if (key === 'tier') {
            valA = TIER_WEIGHT[(valA || '-').toUpperCase()] || 0;
            valB = TIER_WEIGHT[(valB || '-').toUpperCase()] || 0;
            // 티어는 점수가 높을수록 좋은 거니, 오름차순일 때 반대로(낮은게 먼저) 보이게 할지, 높은게 먼저일지 결정
            // 여기선 일반적인 로직(값 크기 비교) 따름
        } 
        // 2. 평균 순위 특수 처리 ('-'는 꼴등보다 아래로)
        else if (key === 'avgRank') {
            // '-'는 무한대 값으로 취급하여 항상 뒤로 보냄
            valA = valA === '-' ? 999 : parseFloat(valA);
            valB = valB === '-' ? 999 : parseFloat(valB);
        }
        // 3. 문자열 비교 (이름 등)
        else if (typeof valA === 'string') {
            return valA.localeCompare(valB) * multiplier;
        }

        // 숫자 비교
        if (valA < valB) return -1 * multiplier;
        if (valA > valB) return 1 * multiplier;
        return 0;
    });

    // 현재 검색어가 있다면 검색 결과 내에서 렌더링, 아니면 전체 렌더링
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    if (searchTerm) {
        filterTable(searchTerm);
    } else {
        renderTable(allPlayers);
    }
}

// 정렬 아이콘 UI 업데이트
function updateSortIcons() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('active');
        const icon = th.querySelector('i');
        icon.className = 'fa-solid fa-sort sort-icon'; // 초기화
        
        if (th.dataset.key === currentSort.key) {
            th.classList.add('active');
            if (currentSort.order === 'asc') {
                icon.className = 'fa-solid fa-sort-up sort-icon'; // 오름차순 아이콘
            } else {
                icon.className = 'fa-solid fa-sort-down sort-icon'; // 내림차순 아이콘
            }
        }
    });
}

function calculateStats(playerName, historyData) {
    let totalGames = 0;
    let totalWins = 0;
    let rankSum = 0;
    let rankCount = 0;
    const matches = [];

    historyData.forEach(record => {
        if (!record.match_detail) return;
        const myRecord = record.match_detail.find(team => 
            team.members && team.members.includes(playerName)
        );

        if (myRecord) {
            totalGames++;
            let rank = 99;
            if (myRecord.id.includes('위')) rank = parseInt(myRecord.id.replace('위', ''));
            else if (myRecord.id.includes('우승') || myRecord.id.includes('1등')) rank = 1;

            if (rank === 1) totalWins++;
            if (rank < 99) {
                rankSum += rank;
                rankCount++;
            }

            matches.push({
                date: new Date(record.created_at).toLocaleDateString(),
                title: record.team_name,
                members: myRecord.members,
                rank: rank,
                rankText: myRecord.id
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

        tr.innerHTML = `
            <td>
                <div class="td-player-info">
                    <div class="td-img">${imgHtml}</div>
                    <span class="td-name">${p.name}</span>
                </div>
            </td>
            <td style="color:var(--accent-gold); font-weight:bold;">${p.tier || '-'}</td>
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
    const filtered = allPlayers.filter(p => p.name.toLowerCase().includes(term));
    renderTable(filtered);
}

// 모달 관련 함수
function openModal(player) {
    document.getElementById('pName').textContent = player.name;
    document.getElementById('pTier').textContent = player.tier || 'Unranked';
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
                    <div class="match-title">${match.title}</div>
                    <div class="match-team"><i class="fa-solid fa-users"></i> ${match.members}</div>
                    <div class="match-date">${match.date}</div>
                </div>
                <div class="match-rank ${rankClass}">
                    ${match.rank < 99 ? match.rank + '위' : match.rankText}
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