import { supabase } from './supabase.js';
import { initTheme, setupThemeToggle } from './theme-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupThemeToggle();

    loadRealDashboard();
    startRealTimeClock();
    
    // ★ [추가] 명예의 전당 통계 계산 실행
    loadHallOfFameStats();

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html'; 
        });
    }

    const refreshBtn = document.getElementById('btnRefreshRanking');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const icon = document.getElementById('iconRefresh');
            
            // 1. 빙글빙글 애니메이션 시작
            if(icon) icon.classList.add('fa-spin');

            // 2. 데이터 다시 불러오기 (await로 완료될 때까지 기다림)
            await loadRealDashboard();

            // 3. 애니메이션 종료 (최소 0.5초는 돌게 해서 갱신된 느낌 주기)
            setTimeout(() => {
                if(icon) icon.classList.remove('fa-spin');
            }, 500);
        });
    }
});

// ============================================================
// 1. 대시보드 메인 데이터 (실시간 랭킹 & 최근 우승자)
// ============================================================
async function loadRealDashboard() {
    try {
        // 최근 우승자 (1명만)
        const { data: lastWinner } = await supabase
            .from('hall_of_fame')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (lastWinner && lastWinner.length > 0) renderLastWinner(lastWinner[0]);
        else renderLastWinner(null);

        // 현재 진행 중인 선수 및 점수 데이터
        const { data: players, error: pError } = await supabase
            .from('players')
            .select('*')
            .not('team_id', 'is', null)
            .order('team_id', { ascending: true });
        
        if (pError) throw pError;

        const { data: scores } = await supabase.from('match_scores').select('*');

        // 데이터 합치기
        let teamRankings = calculateTeamStandings(players, scores || []);
        
        // ★ [수정됨] 정렬 로직 변경
        teamRankings.sort((a, b) => {
            // 1. 점수가 다르면 점수 높은 순 (내림차순)
            if (b.score !== a.score) return b.score - a.score; 
            
            // 2. 점수가 같으면(0점 포함) 팀 번호 순 (오름차순: 1팀 -> 2팀...)
            // a.id는 calculateTeamStandings에서 넣어준 팀 번호입니다.
            return a.id - b.id;
        });

        // 1등과의 격차 계산
        teamRankings = calculateGapToLeader(teamRankings);

        renderPodium(teamRankings);
        renderRankingList(teamRankings);
        updateStatusBanner(teamRankings.length);

    } catch (err) {
        console.error("대시보드 로딩 실패:", err);
    }
}

// ============================================================
// ★ [수정] 명예의 전당 통계 계산 (DB image_url 100% 반영)
// ============================================================
async function loadHallOfFameStats() {
    try {
        // 1. 명예의 전당 기록 가져오기
        const { data: history, error } = await supabase
            .from('hall_of_fame')
            .select('*');

        // 2. ★ 플레이어들의 프로필 사진 주소(image_url) 미리 가져오기
        const { data: profiles } = await supabase
            .from('players')
            .select('name, image_url'); 
        
        // 이름:주소 형태로 매핑 (예: { "로컨": "https://...", "강퀴": "https://..." })
        const imgMap = {};
        if (profiles) {
            profiles.forEach(p => {
                if(p.name) imgMap[p.name] = p.image_url;
            });
        }

        if (error || !history || history.length === 0) {
            renderStats(null);
            return;
        }

        const stats = {};

        // 이름 분리 함수 (공백 제거)
        const parseMembers = (str) => {
            if (!str) return [];
            return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
        };

        history.forEach(record => {
            // 1. 우승 횟수 집계
            if (record.members) {
                const winners = parseMembers(record.members);
                winners.forEach(player => {
                    // ★ 통계 객체 생성 시, 위에서 만든 imgMap에서 주소를 꺼내 저장함
                    if (!stats[player]) {
                        stats[player] = { 
                            wins: 0, 
                            games: 0, 
                            rankSum: 0, 
                            img: imgMap[player] // 여기에 DB 주소가 들어감
                        }; 
                    }
                    stats[player].wins++;
                });
            }

            // 2. 출전 횟수 & 순위 집계
            if (record.match_detail && Array.isArray(record.match_detail)) {
                record.match_detail.forEach((team, index) => {
                    const rank = index + 1;
                    let membersStr = '';
                    if (Array.isArray(team.members)) membersStr = team.members.join(',');
                    else membersStr = team.members || '';

                    const members = parseMembers(membersStr);
                    members.forEach(player => {
                        if (!stats[player]) {
                            stats[player] = { 
                                wins: 0, 
                                games: 0, 
                                rankSum: 0, 
                                img: imgMap[player] // 여기에 DB 주소가 들어감
                            }; 
                        }
                        stats[player].games++;
                        stats[player].rankSum += rank;
                    });
                });
            }
        });

        // 3. 분야별 1등 선정
        let maxWins = { name: '-', val: 0, img: null };
        let maxGames = { name: '-', val: 0, img: null };
        let bestAvg = { name: '-', val: 999, img: null };

        Object.keys(stats).forEach(player => {
            const s = stats[player];

            // 최다 우승
            if (s.wins > maxWins.val) maxWins = { name: player, val: s.wins, img: s.img };

            // 최다 출전
            if (s.games > maxGames.val) maxGames = { name: player, val: s.games, img: s.img };

            // 최고 평점 (1경기 이상)
            if (s.games > 0) {
                const avg = s.rankSum / s.games;
                if (avg < bestAvg.val) bestAvg = { name: player, val: avg, img: s.img };
            }
        });

        renderStats({ maxWins, maxGames, bestAvg });

    } catch (err) {
        console.error("통계 계산 실패:", err);
    }
}

function renderStats(result) {
    if (!result) return;

    // ★ HTML 생성 도우미 (이미지 적용)
    const createContent = (data, unit) => {
    // 1. 임시 이미지 주소 (파일 없어도 됨)
    const fallbackImg = "https://placehold.co/100x100?text=No+Image"; 

    // 2. DB 이미지가 없으면 임시 이미지 사용
    const imgSrc = data.img ? data.img : fallbackImg;
    
    return `
        <div style="display:flex; align-items:center; gap:15px;">
            <img src="${imgSrc}" 
                 style="width:55px; height:55px; border-radius:50%; object-fit:cover; border:2px solid #333; background:#222;" 
                 onerror="this.src='${fallbackImg}'"> <div style="display:flex; flex-direction:column; justify-content:center;">
                <span class="stat-name" style="font-size:1.1rem; font-weight:bold; color:var(--text-main); margin-bottom:2px;">${data.name}</span>
                <span class="stat-value" style="font-size:0.95rem; color:var(--text-muted);">${data.val} ${unit}</span>
            </div>
        </div>
    `;
};

    // 1. 최다 우승
    const winsEl = document.getElementById('statMostWins');
    if (winsEl && result.maxWins.val > 0) {
        winsEl.innerHTML = createContent(result.maxWins, '회');
    }

    // 2. 최다 출전
    const gamesEl = document.getElementById('statMostGames');
    if (gamesEl && result.maxGames.val > 0) {
        gamesEl.innerHTML = createContent(result.maxGames, '회');
    }

    // 3. 평균 순위
    const avgEl = document.getElementById('statBestRank');
    if (avgEl && result.bestAvg.val < 999) {
        const avgDisplay = result.bestAvg.val.toFixed(1);
        avgEl.innerHTML = createContent({ ...result.bestAvg, val: `Avg #${avgDisplay}` }, '');
    }
}

// ============================================================
// 기존 로직 (팀 점수 계산, Gap, 렌더링 등)
// ============================================================

function calculateTeamStandings(players, scores) {
    const teamsMap = {};
    players.forEach(p => {
        const tId = p.team_id;
        if (!teamsMap[tId]) {
            teamsMap[tId] = {
                id: tId, teamName: `Team ${tId}`, members: [],
                teamCost: 0, totalScore: 0, matchCount: 0
            };
        }
        teamsMap[tId].members.push(p.name);
        teamsMap[tId].teamCost += (p.cost || 0);
    });

    scores.forEach(s => {
        if (teamsMap[s.team_id]) {
            teamsMap[s.team_id].totalScore += (s.score || 0);
            teamsMap[s.team_id].matchCount = Math.max(teamsMap[s.team_id].matchCount, s.round_num);
        }
    });

    return Object.values(teamsMap).map(team => ({
        team: team.teamName,
        members: team.members.join(', '),
        cost: team.teamCost,
        score: team.totalScore,
        rounds: team.matchCount
    }));
}

function calculateGapToLeader(sortedRankings) {
    if (sortedRankings.length === 0) return [];
    const leader = sortedRankings[0];
    return sortedRankings.map((team, index) => {
        if (index === 0) {
            team.gapText = "-"; team.gapColor = "#aaa";
        } else {
            const diff = leader.score - team.score;
            if (diff === 0) { team.gapText = "동점"; team.gapColor = "#e74c3c"; }
            else { team.gapText = `-${diff}`; team.gapColor = "#ff6b6b"; }
        }
        return team;
    });
}

function renderPodium(ranking) {
    const container = document.getElementById('podiumArea'); // ID 변경됨
    if(!container) return;
    container.innerHTML = '';

    // 상위 3팀만
    const top3 = ranking.slice(0, 3);

    if (top3.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:0.9rem;">대기 중...</div>';
        return;
    }

    top3.forEach((team, index) => {
        const div = document.createElement('div');
        div.className = 'podium-row';
        div.innerHTML = `
            <div class="p-rank r-${index + 1}">${index + 1}</div>
            <div class="p-info">
                <div class="p-team">${team.team}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${team.members}</div>
            </div>
            <div class="p-score">${team.score}</div>
        `;
        container.appendChild(div);
    });
}

function renderRankingList(ranking) {
    const tbody = document.getElementById('rankingTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    ranking.forEach((team, index) => {
        const tr = document.createElement('tr');
        // 1,2,3위는 클래스 추가 (색상 강조용)
        tr.className = `rank-${index + 1}`; 
        
        tr.innerHTML = `
            <td><span style="font-weight:800; font-size:1.1rem;">${index + 1}</span></td>
            
            <td style="font-weight:600; color: var(--text-main);">${team.team}</td>
            
            <td style="color:var(--text-muted); font-size:0.9rem;">${team.members}</td>
            <td style="font-weight:800; color:var(--accent-gold);">${team.score}</td>
            <td style="font-size:0.85rem; color:${team.gapColor};">${team.gapText}</td>
        `;
        tbody.appendChild(tr);
    });

    if (ranking.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:30px; text-align:center; color:var(--text-muted);">진행 중인 경기가 없습니다.</td></tr>';
    }
}

function renderLastWinner(winner) {
    const box = document.getElementById('lastWinnerBox');
    if(!box) return;
    if (winner) {
        box.innerHTML = `
            <div class="winner-members" style="color:var(--accent-gold); font-size:1.4rem; font-weight:800; line-height:1.4; margin-bottom:8px; word-break:keep-all;">
                ${winner.members || '-'}
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted); display:flex; align-items:center; justify-content:center; gap:5px;">
                <i class="fa-solid fa-trophy"></i> ${new Date(winner.created_at).toLocaleDateString()} 우승
            </div>
        `;
    } else {
        box.innerHTML = `<div style="color:var(--text-muted); padding:10px;">아직 기록이 없습니다.</div>`;
    }
}

function updateStatusBanner(teamCount) {
    const titleEl = document.querySelector('.match-title');
    if(titleEl) {
        if (teamCount > 0) titleEl.innerHTML = `무한섬 <span class="highlight-round">LIVE</span>`;
        else titleEl.innerHTML = `TOURNAMENT <span class="highlight-round">READY</span>`;
    }
}

function startRealTimeClock() {
    const timerEl = document.getElementById('gameTimer');
    if(timerEl) {
        setInterval(() => {
            const now = new Date();
            timerEl.innerHTML = `${now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })}`;
        }, 1000);
    }
}