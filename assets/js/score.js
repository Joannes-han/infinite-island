import { supabase } from './supabase.js';

let teamsMap = {};
let scoresData = [];
let maxRound = 3; // 기본 3라운드

document.addEventListener('DOMContentLoaded', () => {
    initScoreBoard();
    setupEvents();
});

async function initScoreBoard() {
    await loadTeams();
    await loadScores();

    // 초기 렌더링: 입력판(고정)과 순위표(정렬) 둘 다 그리기
    renderInputTable();
    renderLeaderboard();
}

// 1. 팀 정보 가져오기
async function loadTeams() {
    const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .not('team_id', 'is', null);

    if (error) return console.error(error);

    // ★ 1. 티어 가중치 정의 (높을수록 점수가 큼)
    const tierWeight = {
        'SSS': 10, 'SS': 9, 'S': 8, 'A': 7,
        'B': 6, 'C': 5, 'D': 4, 'F': 3,
        'UNRANKED': 0
    };

    // ★ 2. 선수 정렬 (티어 높은 순 -> 이름 순)
    players.sort((a, b) => {
        // 티어가 없으면 'UNRANKED'로 취급
        const tierA = tierWeight[(a.tier || 'UNRANKED').toUpperCase()] || 0;
        const tierB = tierWeight[(b.tier || 'UNRANKED').toUpperCase()] || 0;

        if (tierA !== tierB) {
            return tierB - tierA; // 티어 점수 내림차순 (높은게 먼저)
        } else {
            return a.name.localeCompare(b.name); // 티어 같으면 이름순
        }
    });

    // 3. 정렬된 순서대로 팀에 넣기
    teamsMap = {};
    players.forEach(p => {
        if (!teamsMap[p.team_id]) {
            teamsMap[p.team_id] = { id: p.team_id, members: [] };
        }
        teamsMap[p.team_id].members.push(p.name);
    });
}

// 2. 점수 데이터 가져오기
async function loadScores() {
    const { data, error } = await supabase.from('scores').select('*');
    if (error) return console.error(error);

    scoresData = data;

    // DB에 저장된 최대 라운드 확인
    let dbMaxRound = 0;
    data.forEach(s => { if (s.round > dbMaxRound) dbMaxRound = s.round; });
    // 최소 3라운드 보장
    maxRound = Math.max(dbMaxRound, 3);
}


// ============================================================
// ★ 1. [오른쪽] 입력판 그리기 (팀 ID 순서 고정)
// ============================================================
function renderInputTable() {
    const tbody = document.getElementById('inputBody');
    const headerRow = document.getElementById('inputTableHeader');

    // 헤더 라운드(R1, R2...) 갱신
    headerRow.querySelectorAll('.col-round').forEach(el => el.remove());
    for (let r = 1; r <= maxRound; r++) {
        const th = document.createElement('th');
        th.className = 'col-round';
        th.textContent = `R${r}`;
        headerRow.appendChild(th);
    }

    tbody.innerHTML = '';

    // 팀 ID 순으로 정렬
    const sortedTeams = Object.values(teamsMap).sort((a, b) => a.id - b.id);

    sortedTeams.forEach(team => {
        // 현재 총점 계산
        let total = 0;
        const roundScores = {};
        scoresData.filter(s => s.team_id === team.id).forEach(s => {
            roundScores[s.round] = s.score;
            total += s.score;
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div>Team ${team.id}</div>
                <span class="team-members-small">${team.members.join(', ')}</span>
            </td>
            <td class="col-total-preview" id="preview-total-${team.id}">${total}</td>
        `;

        // 라운드별 입력칸 생성
        for (let r = 1; r <= maxRound; r++) {
            const score = roundScores[r] || 0;
            const td = document.createElement('td');
            // value가 0이면 빈칸으로 표시하려면: value="${score == 0 ? '' : score}"
            // 여기서는 0도 표시하도록 함
            td.innerHTML = `
                <input type="number" class="score-input" 
                    data-team="${team.id}" data-round="${r}" 
                    value="${score}" 
                    onfocus="this.select()">
            `;
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });

    // 입력 이벤트 연결 ('change' 이벤트 사용)
    document.querySelectorAll('.score-input').forEach(input => {
        input.addEventListener('change', handleScoreChange);
    });
}


// ============================================================
// ★ 2. [왼쪽] 순위표 그리기 (총점 순서 자동 정렬)
// ============================================================
function renderLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';

    // 랭킹 리스트 생성
    const rankingList = [];
    Object.values(teamsMap).forEach(team => {
        let total = 0;
        scoresData.filter(s => s.team_id === team.id).forEach(s => total += s.score);
        rankingList.push({ ...team, total });
    });

    // 점수 내림차순 정렬 (동점일 경우 팀 ID 빠른 순)
    rankingList.sort((a, b) => b.total - a.total || a.id - b.id);

    // 체크포인트 설정 값 확인
    const isCpEnabled = document.getElementById('checkpointToggle').checked;
    const cpTarget = parseInt(document.getElementById('checkpointTarget').value) || 50;

    // 체크포인트 헤더 보이기/숨기기
    const cpHeader = document.querySelector('.section-leaderboard .col-check');
    if (cpHeader) cpHeader.style.display = isCpEnabled ? 'table-cell' : 'none';

    rankingList.forEach((team, index) => {
        const isReached = team.total >= cpTarget;
        const tr = document.createElement('tr');

        // 1,2,3등 행 강조
        if (index === 0) tr.classList.add('rank-row-1');
        if (index === 1) tr.classList.add('rank-row-2');
        if (index === 2) tr.classList.add('rank-row-3');

        // 체크포인트 달성 강조
        if (isCpEnabled && isReached) tr.classList.add('checkpoint-reached');

        tr.innerHTML = `
            <td class="col-rank rank-${index + 1}">${index + 1}</td>
            <td class="col-team">
                <div style="font-weight:bold;">Team ${team.id}</div>
                <span class="team-members-small" style="font-size:11px; color:#888;">${team.members.join(', ')}</span>
            </td>
            <td class="col-check" style="display: ${isCpEnabled ? 'table-cell' : 'none'}">
                ${isReached ? '<i class="fa-solid fa-fire"></i>' : ''}
            </td>
            <td class="col-total">${team.total}</td>
        `;
        tbody.appendChild(tr);
    });
}


// ============================================================
// ★ 3. 점수 변경 핸들러 (입력판 포커스 유지 + 순위표만 갱신)
// ============================================================
async function handleScoreChange(e) {
    const input = e.target;
    const teamId = parseInt(input.dataset.team);
    const round = parseInt(input.dataset.round);

    // 빈칸이면 0으로 처리
    const inputValue = input.value.trim();
    const newScore = inputValue === '' ? 0 : parseInt(inputValue);

    // 1. DB 업데이트 (Upsert 로직 대체)
    const existingIndex = scoresData.findIndex(s => s.team_id === teamId && s.round === round);

    if (existingIndex >= 0) {
        // 이미 점수가 있으면 Update
        const id = scoresData[existingIndex].id;
        await supabase.from('scores').update({ score: newScore }).eq('id', id);
        scoresData[existingIndex].score = newScore; // 로컬 데이터 갱신
    } else {
        // 점수가 없으면 Insert
        const { data, error } = await supabase
            .from('scores')
            .insert([{ team_id: teamId, round: round, score: newScore }])
            .select();

        if (!error && data) {
            scoresData.push(data[0]); // 로컬 데이터 추가
        }
    }

    // 2. [오른쪽] 입력판의 '합계' 컬럼 숫자만 쏙 바꿈 (테이블 전체 리렌더링 X -> 포커스 유지됨)
    let currentTeamTotal = 0;
    scoresData.filter(s => s.team_id === teamId).forEach(s => currentTeamTotal += s.score);

    const totalCell = document.getElementById(`preview-total-${teamId}`);
    if (totalCell) totalCell.textContent = currentTeamTotal;

    // 3. [왼쪽] 순위표는 전체 다시 그리기 (순위 변동 반영)
    renderLeaderboard();
}

function setupEvents() {
    // 라운드 추가
    document.getElementById('addRoundBtn').addEventListener('click', () => {
        maxRound++;
        renderInputTable();
    });

    // 새로고침 (단순 리로드)
    document.getElementById('refreshBtn').addEventListener('click', () => {
        if (confirm("데이터를 새로고침 하시겠습니까?")) initScoreBoard();
    });

    // ★ 추가된 기능: 점수 초기화 (전체 삭제)
    document.getElementById('resetMatchBtn').addEventListener('click', async () => {

        // 1. DB에서 모든 점수 삭제
        // (id가 0이 아닌 모든 행을 삭제 = 전체 삭제)
        const { error } = await supabase
            .from('scores')
            .delete()
            .neq('id', 0);

        if (error) {
            console.error(error);
            alert("초기화 실패! (콘솔 확인)");
        } else {
            // 2. 로컬 데이터 초기화
            scoresData = [];
            maxRound = 3; // 라운드도 기본 3으로 리셋

            // 3. 화면 다시 그리기
            renderInputTable();
            renderLeaderboard();
        }
    });

    // 체크포인트 토글
    document.getElementById('checkpointToggle').addEventListener('change', (e) => {
        const targetInput = document.getElementById('checkpointTarget');
        targetInput.disabled = !e.target.checked;
        renderLeaderboard();
    });

    document.getElementById('checkpointTarget').addEventListener('change', renderLeaderboard);

    // ★ 대회 종료 및 저장 (자동 회차 계산 기능 추가)
    document.getElementById('finalizeBtn').addEventListener('click', async () => {
        // 1. 현재 1등 팀 계산
        const rankingList = [];
        Object.values(teamsMap).forEach(team => {
            let total = 0;
            scoresData.filter(s => s.team_id === team.id).forEach(s => total += s.score);
            rankingList.push({ ...team, total });
        });
        rankingList.sort((a, b) => b.total - a.total);

        const winner = rankingList[0];

        if (!winner || winner.total === 0) {
            return alert("점수 데이터가 없습니다.");
        }

        // 2. ★ 자동 회차 계산 로직 ★
        // DB에서 기존 우승 팀 이름들을 가져옵니다.
        const { data: history, error: fetchError } = await supabase
            .from('hall_of_fame')
            .select('team_name');

        let nextRound = 1; // 기본값 1회차

        if (!fetchError && history.length > 0) {
            // "숫자+회차" 패턴을 찾아서 가장 큰 숫자를 찾음
            const rounds = history.map(h => {
                // 예: "16회차 우승팀" -> 16 추출
                const match = h.team_name.match(/(\d+)회차/);
                return match ? parseInt(match[1]) : 0;
            });

            const maxRound = Math.max(...rounds);
            nextRound = maxRound + 1; // 다음 회차 번호
        }

        // 3. 이름 확정하기 (사용자에게 확인 받기)
        // 기본값으로 '17회차 우승팀'이 입력되어 뜹니다.
        const defaultName = `${nextRound}회차 우승팀`;
        const finalTeamName = prompt("이번 대회의 이름을 입력하세요.\n(확인을 누르면 명예의 전당에 저장됩니다)", defaultName);

        // 취소 버튼 누르면 저장 안 함
        if (finalTeamName === null) return;
        if (finalTeamName.trim() === "") return alert("이름을 입력해야 합니다.");

        // 4. DB 저장
        const { error } = await supabase
            .from('hall_of_fame')
            .insert([{
                team_name: finalTeamName, // 입력받은 이름 (예: 17회차 우승팀)
                members: winner.members.join(', '),
                total_score: winner.total,
                match_detail: rankingList
            }]);

        if (error) {
            console.error(error);
            alert("저장 실패! (콘솔 확인)");
        } else {
            alert(`축하합니다! 🎉\n[${finalTeamName}] 기록이 명예의 전당에 등록되었습니다.`);
        }
    });
}