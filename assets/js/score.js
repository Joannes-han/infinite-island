import { supabase } from './supabase.js';
// ★ 테마 매니저 연결 (index.html과 동일하게)
import { initTheme, setupThemeToggle } from './theme-manager.js';

let teamsMap = {};
let scoresData = []; // 'match_scores' 테이블 데이터를 담을 곳
let maxRound = 3; // 기본 3라운드

document.addEventListener('DOMContentLoaded', () => {
    // 1. 테마 기능 실행
    initTheme();
    setupThemeToggle();

    // 2. 점수판 초기화
    initScoreBoard();
    setupEvents();
});

async function initScoreBoard() {
    await loadTeams();
    await loadScores();

    // 입력판(오른쪽)과 순위표(왼쪽) 그리기
    renderInputTable();
    renderLeaderboard();
}

// 1. 팀 정보 가져오기 (players 테이블)
async function loadTeams() {
    const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .not('team_id', 'is', null);

    if (error) return console.error(error);

    // 티어 가중치 (정렬용)
    const tierWeight = {
        'SSS': 10, 'SS': 9, 'S': 8, 'A': 7,
        'B': 6, 'C': 5, 'D': 4, 'F': 3,
        'UNRANKED': 0, '닭': 0, '나뭇가지': -1
    };

    // 선수 정렬 (티어 높은 순 -> 이름 순)
    players.sort((a, b) => {
        const tierA = tierWeight[(a.tier || 'UNRANKED').toUpperCase()] || 0;
        const tierB = tierWeight[(b.tier || 'UNRANKED').toUpperCase()] || 0;

        if (tierA !== tierB) {
            return tierB - tierA;
        } else {
            return a.name.localeCompare(b.name);
        }
    });

    // 팀별로 묶기
    teamsMap = {};
    players.forEach(p => {
        if (!teamsMap[p.team_id]) {
            teamsMap[p.team_id] = { id: p.team_id, members: [] };
        }
        teamsMap[p.team_id].members.push(p.name);
    });
}

// 2. 점수 데이터 가져오기 (match_scores 테이블)
async function loadScores() {
    // ★ [수정] DB의 'match_scores' 테이블에서 가져옵니다.
    const { data, error } = await supabase
        .from('match_scores')
        .select('*');
        
    if (error) {
        console.error("점수 로딩 실패:", error);
        return;
    }

    scoresData = data;

    // DB에 저장된 최대 라운드 확인 (데이터가 있으면 라운드 수 자동 확장)
    let dbMaxRound = 0;
    data.forEach(s => { if (s.round_num > dbMaxRound) dbMaxRound = s.round_num; });
    
    // 최소 3라운드는 유지
    maxRound = Math.max(dbMaxRound, 3);
}


// ============================================================
// ★ 1. [오른쪽] 입력판 그리기 (팀 ID 순서 고정)
// ============================================================
function renderInputTable() {
    const tbody = document.getElementById('inputBody');
    const headerRow = document.getElementById('inputTableHeader');

    if (!tbody || !headerRow) return;

    // 헤더 라운드 갱신
    headerRow.querySelectorAll('.col-round').forEach(el => el.remove());
    for (let r = 1; r <= maxRound; r++) {
        const th = document.createElement('th');
        th.className = 'col-round';
        th.textContent = `R${r}`;
        headerRow.appendChild(th);
    }

    tbody.innerHTML = '';

    // 팀 ID 순 정렬
    const sortedTeams = Object.values(teamsMap).sort((a, b) => a.id - b.id);

    sortedTeams.forEach(team => {
        // 총점 계산
        let total = 0;
        const roundScores = {};
        scoresData.filter(s => s.team_id === team.id).forEach(s => {
            roundScores[s.round_num] = s.score;
            total += s.score;
        });

        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:2px;">
                    Team ${team.id}
                </div>

                <div style="font-size:1.05rem; font-weight:800; color:var(--text-main);">
                    ${team.members.join(', ')}
                </div>
            </td>
            <td class="col-total-preview" id="preview-total-${team.id}" style="font-weight:bold; color:var(--accent-gold);">${total}</td>
        `;

        // 라운드별 입력칸
        for (let r = 1; r <= maxRound; r++) {
            const score = roundScores[r] || 0;
            const td = document.createElement('td');
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

    // 이벤트 연결
    document.querySelectorAll('.score-input').forEach(input => {
        input.addEventListener('change', handleScoreChange);
    });
}


// ============================================================
// ★ 2. [왼쪽] 순위표 그리기 (총점순 자동 정렬)
// ============================================================
function renderLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // 랭킹 리스트 생성
    const rankingList = [];
    Object.values(teamsMap).forEach(team => {
        let total = 0;
        scoresData.filter(s => s.team_id === team.id).forEach(s => total += s.score);
        rankingList.push({ ...team, total });
    });

    // 점수 내림차순 정렬
    rankingList.sort((a, b) => b.total - a.total || a.id - b.id);

    // 체크포인트 설정 확인
    const toggle = document.getElementById('checkpointToggle');
    const isCpEnabled = toggle ? toggle.checked : false;
    const targetInput = document.getElementById('checkpointTarget');
    const cpTarget = targetInput ? (parseInt(targetInput.value) || 50) : 50;

    // 헤더 처리
    const cpHeader = document.querySelector('.section-leaderboard .col-check');
    if (cpHeader) cpHeader.style.display = isCpEnabled ? 'table-cell' : 'none';

    rankingList.forEach((team, index) => {
        const isReached = team.total >= cpTarget;
        const tr = document.createElement('tr');

        // 1~3위 강조
        if (index === 0) tr.classList.add('rank-row-1');
        if (index === 1) tr.classList.add('rank-row-2');
        if (index === 2) tr.classList.add('rank-row-3');

        // 체크포인트 강조
        if (isCpEnabled && isReached) tr.classList.add('checkpoint-reached');

        tr.innerHTML = `
            <td class="col-rank rank-${index + 1}">${index + 1}</td>
            <td class="col-team">
                <span class="team-name" style="display:block; font-size:0.8rem; color:var(--text-muted); margin-bottom:2px;">
                    Team ${team.id}
                </span>

                <div style="font-size:1.1rem; font-weight:800; color:var(--text-main); line-height:1.2;">
                    ${team.members.join(', ')}
                </div>
            </td>
            <td class="col-check" style="display: ${isCpEnabled ? 'table-cell' : 'none'}">
                ${isReached ? '<i class="fa-solid fa-fire" style="color:#ff4757"></i>' : ''}
            </td>
            <td class="col-total" style="font-weight:bold; font-size:1.2rem;">${team.total}</td>
        `;
        tbody.appendChild(tr);
    });
}   

// ============================================================
// ★ 3. 점수 변경 핸들러 (DB 실시간 저장)
// ============================================================
async function handleScoreChange(e) {
    const input = e.target;
    const teamId = parseInt(input.dataset.team);
    const round = parseInt(input.dataset.round);

    // 빈칸이면 0으로 처리
    const inputValue = input.value.trim();
    const newScore = inputValue === '' ? 0 : parseInt(inputValue);

    // 로컬 데이터에서 해당 기록 찾기
    const existingIndex = scoresData.findIndex(s => s.team_id === teamId && s.round_num === round);

    try {
        if (existingIndex >= 0) {
            // ★ 이미 있으면 UPDATE
            const recordId = scoresData[existingIndex].id;
            
            // 화면 반응 속도를 위해 로컬 데이터 먼저 갱신
            scoresData[existingIndex].score = newScore;

            await supabase
                .from('match_scores')
                .update({ score: newScore })
                .eq('id', recordId);
                
        } else {
            // ★ 없으면 INSERT (새 데이터)
            const { data, error } = await supabase
                .from('match_scores')
                .insert([{ team_id: teamId, round_num: round, score: newScore }])
                .select();

            if (error) throw error;

            if (data) {
                scoresData.push(data[0]); // 로컬 데이터에 추가
            }
        }

        // 2. [오른쪽] 합계 미리보기 갱신
        let currentTeamTotal = 0;
        scoresData.filter(s => s.team_id === teamId).forEach(s => currentTeamTotal += s.score);

        const totalCell = document.getElementById(`preview-total-${teamId}`);
        if (totalCell) totalCell.textContent = currentTeamTotal;

        // 3. [왼쪽] 순위표 전체 다시 그리기 (순위 변동 반영)
        renderLeaderboard();

    } catch (err) {
        console.error("점수 저장 실패:", err);
        // 실패 시 사용자에게 알림 (선택 사항)
        // alert("저장에 실패했습니다. 인터넷 연결을 확인하세요.");
    }
}

function setupEvents() {
    // 라운드 추가 버튼
    const addRoundBtn = document.getElementById('addRoundBtn');
    if(addRoundBtn) {
        addRoundBtn.addEventListener('click', () => {
            maxRound++;
            renderInputTable();
        });
    }

    // 새로고침 버튼
    const refreshBtn = document.getElementById('refreshBtn');
    if(refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // if (confirm("데이터를 새로고침 하시겠습니까?")) 
            initScoreBoard();
        });
    }

    // ★ 점수 초기화 (DB 전체 삭제)
    const resetBtn = document.getElementById('resetMatchBtn');
    if(resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (!confirm("정말 모든 점수 데이터를 초기화하시겠습니까?\n(되돌릴 수 없습니다!)")) return;

            const { error } = await supabase
                .from('match_scores')
                .delete()
                .neq('id', 0); // 전체 삭제

            if (error) {
                console.error(error);
                alert("초기화 실패!");
            } else {
                scoresData = [];
                maxRound = 3;
                renderInputTable();
                renderLeaderboard();
            }
        });
    }

    // 체크포인트 토글
    const cpToggle = document.getElementById('checkpointToggle');
    if(cpToggle) {
        cpToggle.addEventListener('change', (e) => {
            const targetInput = document.getElementById('checkpointTarget');
            if(targetInput) targetInput.disabled = !e.target.checked;
            renderLeaderboard();
        });
    }

    const cpTarget = document.getElementById('checkpointTarget');
    if(cpTarget) {
        cpTarget.addEventListener('change', renderLeaderboard);
    }

    // ★ 대회 종료 및 명예의 전당 저장
    const finalizeBtn = document.getElementById('finalizeBtn');
    if(finalizeBtn) {
        finalizeBtn.addEventListener('click', async () => {
            // 1등 팀 계산
            const rankingList = [];
            Object.values(teamsMap).forEach(team => {
                let total = 0;
                scoresData.filter(s => s.team_id === team.id).forEach(s => total += s.score);
                rankingList.push({ ...team, total });
            });
            rankingList.sort((a, b) => b.total - a.total);

            const winner = rankingList[0];

            if (!winner || winner.total === 0) {
                return alert("점수 데이터가 없거나 0점입니다.");
            }

            // 자동 회차 계산 (예: "17회차")
            const { data: history, error: fetchError } = await supabase
                .from('hall_of_fame')
                .select('team_name');

            let nextRoundNum = 1;

            if (!fetchError && history.length > 0) {
                const rounds = history.map(h => {
                    const match = h.team_name.match(/(\d+)회차/);
                    return match ? parseInt(match[1]) : 0;
                });
                const maxR = Math.max(...rounds);
                nextRoundNum = maxR + 1;
            }

            const defaultName = `${nextRoundNum}회차 우승팀`;
            const finalTeamName = prompt("이번 대회의 이름을 입력하세요.", defaultName);

            if (finalTeamName === null) return;
            if (finalTeamName.trim() === "") return alert("이름을 입력해주세요.");

            // 명예의 전당에 저장
            const { error } = await supabase
                .from('hall_of_fame')
                .insert([{
                    team_name: finalTeamName,
                    members: winner.members.join(', '),
                    total_score: winner.total,
                    // 상세 랭킹 정보도 같이 저장 (선택 사항)
                    match_detail: rankingList 
                }]);

            if (error) {
                console.error(error);
                alert("저장 실패! (콘솔 확인)");
            } else {
                alert(`축하합니다! [${finalTeamName}] 우승이 기록되었습니다.`);
            }
        });
    }
}