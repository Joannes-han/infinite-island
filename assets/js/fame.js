import { supabase } from './supabase.js';

let allHistory = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

document.addEventListener('DOMContentLoaded', () => {
    loadHallOfFame();
    setupPaginationEvents();
});

async function loadHallOfFame() {
    const { data: history, error } = await supabase
        .from('hall_of_fame')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("로딩 실패:", error);
        return;
    }

    if (!history || history.length === 0) {
        document.getElementById('historyList').innerHTML = '<div style="text-align:center; color:#777; padding:30px;">아직 등록된 우승 기록이 없습니다.</div>';
        document.getElementById('playerRankingBody').innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#555;">-</td></tr>';
        return;
    }

    allHistory = history;

    calculateAndRenderRanking(allHistory);
    renderHistoryPage(1);
}

function renderHistoryPage(page) {
    currentPage = page;
    const container = document.getElementById('historyList');
    if (!container) return;

    container.innerHTML = '';

    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = allHistory.slice(start, end);

    pageData.forEach(record => {
        let dateStr = "날짜 없음";
        if (record.created_at) {
            dateStr = new Date(record.created_at).toLocaleDateString();
        }
        const membersStr = record.members || "멤버 정보 없음";
        

        // 상세 테이블 HTML 생성
        let detailsHtml = '';
        if (record.match_detail && Array.isArray(record.match_detail)) {
            detailsHtml = `
                <table class="mini-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>팀</th>
                            <th>멤버</th>
                            <th style="text-align:right">점수</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            record.match_detail.forEach((team, idx) => {
                const teamMembers = Array.isArray(team.members) ? team.members.join(', ') : team.members;
                detailsHtml += `
                    <tr>
                        <td class="mini-rank">${idx + 1}</td>
                        <td>Team ${team.id || '-'}</td>
                        <td style="color:#888">${teamMembers}</td>
                        <td class="mini-score">${team.total}</td>
                    </tr>
                `;
            });
            detailsHtml += `</tbody></table>`;
        } else {
            detailsHtml = `<div style="text-align:center; padding:10px; color:#555;">상세 기록이 없습니다.</div>`;
        }

        // 카드 생성
        const div = document.createElement('div');
        div.className = 'history-card';
        div.innerHTML = `
            <div class="history-summary">
                <div class="info">
                    <div class="history-date">${dateStr}</div>
                    <div class="history-team">${record.team_name || 'Team?'}</div>
                    <div class="history-members">
                        <i class="fa-solid fa-users"></i> ${membersStr}
                    </div>
                </div>
                <div class="history-score">
                    ${record.total_score || 0}<span>pts</span>
                    <div style="font-size:10px; color:#555; text-align:right; margin-top:5px;">▼ Click</div>
                </div>
            </div>
            
            <div class="details-box">
                ${detailsHtml}
            </div>
        `;

        // 1. 카드 전체(요약 부분)를 누르면 토글
        div.addEventListener('click', () => {
            div.classList.toggle('active');
        });

        // ★ 2. 상세 내용 박스를 누르면 -> 부모(카드)에게 클릭 신호를 보내지 않음 (닫힘 방지)
        const detailBox = div.querySelector('.details-box');
        detailBox.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        container.appendChild(div);
    });

    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(allHistory.length / ITEMS_PER_PAGE) || 1;
    const pageIndicator = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (pageIndicator) pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
}

function setupPaginationEvents() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) renderHistoryPage(currentPage - 1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(allHistory.length / ITEMS_PER_PAGE);
            if (currentPage < totalPages) renderHistoryPage(currentPage + 1);
        });
    }
}

// ★ 수정된 함수 (const -> let)
function calculateAndRenderRanking(history) {
    const winCounts = {};

    history.forEach(record => {
        if (!record.members) return;
        
        // 1. 쉼표로 쪼개고 공백 제거하여 '정확한 이름'들의 배열을 만듦
        const members = record.members.split(',').map(m => m.trim());
        
        members.forEach(player => {
            if (player) {
                // 2. 정확히 일치하는 이름에만 카운트 (잭 != 캡틴잭)
                winCounts[player] = (winCounts[player] || 0) + 1;
            }
        });
    });

    // (이하 정렬 및 렌더링 코드는 기존과 동일)
    let rankingList = Object.entries(winCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    rankingList = rankingList.slice(0, 10); 

    const tbody = document.getElementById('playerRankingBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let realRank = 1;
    rankingList.forEach((p, index) => {
        if (index > 0 && p.count < rankingList[index - 1].count) {
            realRank = index + 1;
        }

        let rankClass = 'rank-other';
        if (realRank === 1) rankClass = 'rank-1';
        else if (realRank === 2) rankClass = 'rank-2';
        else if (realRank === 3) rankClass = 'rank-3';

        const tr = document.createElement('tr');
        tr.className = rankClass;
        tr.innerHTML = `
            <td><span class="rank-badge">${realRank}</span></td>
            <td style="font-weight:600">${p.name}</td>
            <td class="win-count">${p.count}회</td>
        `;
        tbody.appendChild(tr);
    });
}
