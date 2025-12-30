import { supabase } from './supabase.js';


document.addEventListener('DOMContentLoaded', () => {
    // 날짜 표시
    const today = new Date();
    document.getElementById('currentDate').textContent = today.toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });

    loadDashboardData();
});

// 1. loadDashboardData 수정 (MVP 로직 추가)
async function loadDashboardData() {
    // 선수 정보 먼저 가져오기 (이미지 매칭용)
    const { data: players, error: pError } = await supabase.from('players').select('*');

    if (!pError && players) {
        updateAttendance(players);
        updateTierChart(players);
    }

    // 명예의 전당 기록 가져오기
    const { data: history, error: hError } = await supabase
        .from('hall_of_fame')
        .select('*')
        .order('created_at', { ascending: false });

    if (!hError && history && history.length > 0) {
        updateLastWinner(history[0]); // 최근 우승자
        updateMVP(history, players);  // ★ 추가: 최다 우승자 계산
    }

    // 실시간 랭킹
    const { data: scores, error: sError } = await supabase.from('scores').select('*');
    if (!sError && scores && scores.length > 0) {
        updateLiveRank(scores);
    }
}

// 2. ★ 추가: 최다 우승자 계산 및 표시 함수
function updateMVP(history, players) {
    const winCounts = {};

    // 우승 횟수 카운팅
    history.forEach(record => {
        if (!record.members) return;
        const members = record.members.split(',').map(m => m.trim());
        members.forEach(player => {
            if (player) winCounts[player] = (winCounts[player] || 0) + 1;
        });
    });

    // 1등 찾기
    let maxWins = 0;
    let mvpName = "-";
    
    Object.entries(winCounts).forEach(([name, count]) => {
        if (count > maxWins) {
            maxWins = count;
            mvpName = name;
        }
    });

    if (maxWins === 0) return;

    // MVP 선수의 이미지 찾기
    // players 테이블에서 이름이 일치하는 선수를 찾음
    const mvpData = players.find(p => p.name === mvpName);
    const imgUrl = mvpData ? mvpData.image_url : null;

    // 이미지 HTML 생성
    const imgHtml = imgUrl 
        ? `<img src="${imgUrl}" alt="${mvpName}">` 
        : `<i class="fa-solid fa-user"></i>`;

    // 화면 그리기
    const container = document.getElementById('mvpContent');
    container.innerHTML = `
        <div class="mvp-img-box">
            ${imgHtml}
        </div>
        <div class="mvp-name">${mvpName}</div>
        <div class="mvp-count-badge">
            <i class="fa-solid fa-trophy"></i> 총 ${maxWins}회 우승
        </div>
    `;
}

// --- 위젯 업데이트 함수들 ---

function updateAttendance(players) {
    const total = players.length;
    const present = players.filter(p => p.status === 'present').length;
    const percent = total === 0 ? 0 : Math.round((present / total) * 100);

    document.getElementById('attendanceCount').textContent = `${present} / ${total} 명`;
    document.getElementById('attendancePercent').textContent = `출석률 ${percent}%`;

    // 바 애니메이션
    setTimeout(() => {
        document.getElementById('attendanceBar').style.width = `${percent}%`;
    }, 100);
}

function updateLastWinner(record) {
    document.getElementById('lastWinnerTeam').textContent = record.team_name;
    document.getElementById('lastWinnerMembers').textContent = record.members;
    document.getElementById('lastWinnerDate').textContent = new Date(record.created_at).toLocaleDateString();
}

function updateTierChart(players) {
    // 출석한 사람만 카운트
    const targets = players.filter(p => p.status === 'present');
    const tiers = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F'];
    const counts = {};
    let maxCount = 0;

    tiers.forEach(t => counts[t] = 0);
    targets.forEach(p => {
        const t = (p.tier || 'Unranked').toUpperCase();
        if (counts[t] !== undefined) counts[t]++;
    });

    // 최대값 찾기
    Object.values(counts).forEach(c => { if (c > maxCount) maxCount = c; });

    const container = document.getElementById('tierChart');
    container.innerHTML = '';

    // ★ 수정된 부분: 데이터가 없을 때 중앙 정렬 스타일 적용
    if (targets.length === 0) {
        container.innerHTML = `
            <p style="
                width: 100%; 
                text-align: center; 
                color: var(--text-muted); 
                align-self: center; /* 부모의 아래 정렬을 무시하고 수직 중앙 정렬 */
                margin: 0;
                font-size: 14px;
            ">
                출석한 선수가 없습니다.
            </p>`;
        return;
    }

    tiers.forEach(tier => {
        const count = counts[tier];
        const heightPercent = maxCount === 0 ? 0 : (count / maxCount) * 100;

        const colorVar = getComputedStyle(document.documentElement).getPropertyValue(`--tier-${tier.toLowerCase()}`);

        container.innerHTML += `
            <div class="chart-bar-group">
                <div class="chart-value">${count > 0 ? count : ''}</div>
                <div class="chart-bar" style="height: ${heightPercent}%; background-color: ${colorVar || '#555'}"></div>
                <div class="chart-label" style="color:${colorVar || '#aaa'}">${tier}</div>
            </div>
        `;
    });
}

function updateLiveRank(scores) {
    // 팀별 총점 계산
    const teamScores = {};
    scores.forEach(s => {
        teamScores[s.team_id] = (teamScores[s.team_id] || 0) + s.score;
    });

    // 정렬
    const sorted = Object.entries(teamScores).sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0) {
        const [teamId, score] = sorted[0]; // 1등

        const container = document.getElementById('liveRankContent');
        container.innerHTML = `
            <div class="live-rank-1">
                <i class="fa-solid fa-crown rank-badge"></i>
                <div class="live-team-name">Team ${teamId}</div>
                <div class="live-score">${score} pts</div>
            </div>
        `;
    }
}