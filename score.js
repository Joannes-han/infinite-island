
const TOTAL_ROUNDS = 6; // 총 라운드 수
// 점수 저장을 위한 localStorage 키
const SCORE_STORAGE_KEY = 'savedRoundScores'; 

document.addEventListener('DOMContentLoaded', () => {
    // ---  모든 DOM 요소를 맨 위에서 선언 ---
    const tableBody = document.getElementById('score-table-body');
    const calculateButton = document.getElementById('calculate-score-button');
    const checkpointScoreInput = document.getElementById('checkpoint-score');
    const multiplierInputsContainer = document.getElementById('multiplier-inputs');
    const saveImageButton = document.getElementById('save-score-image-button');
    const resetScoresButton = document.getElementById('reset-scores-button'); // 초기화 버튼
    
    let teams = []; // 팀 정보를 담을 배열

    // 0. 라운드 배율 입력창 생성
    function createMultiplierInputs() {
        for (let i = 1; i <= TOTAL_ROUNDS; i++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `multiplier-round-${i}`;
            input.className = 'multiplier-input';
            input.value = (i === 3) ? '1' : '1'; // 3라운드만 배율 기본 설정
            multiplierInputsContainer.appendChild(input);
        }
    }

    // 1. localStorage에서 팀 데이터 불러오기
    function loadTeams() {
        try {
            const savedTeamsJSON = localStorage.getItem('savedTeams');
            if (!savedTeamsJSON) {
                showError('팀 배정 페이지(index.html)에서 팀을 먼저 구성하고 저장해야 합니다.');
                return false;
            }
            
            teams = JSON.parse(savedTeamsJSON);
            if (teams.length === 0) {
                 showError('배정된 팀이 없습니다.');
                 return false;
            }
            return true; // 성공
            
        } catch (e) {
            console.error("팀 데이터 로드 실패:", e);
            showError(`데이터 로드 오류: ${e.message}`);
            return false;
        }
    }
    
    // 테이블에 에러 메시지 표시
    function showError(message) {
        tableBody.innerHTML = `<tr><td colspan="${TOTAL_ROUNDS + 4}">${message}</td></tr>`;
    }


    // 2. 불러온 팀 정보로 테이블 채우기
    function renderTable() {
        //  저장된 점수 불러오기
        const savedScores = getSavedScores();
        
        tableBody.innerHTML = ''; // 테이블 비우기
        
        teams.forEach(team => {
            const row = document.createElement('tr');
            row.dataset.teamId = team.id; 
            
            const membersString = team.members.map(m => m.name).join(', ') || '(팀원 없음)';
            
            // 팀 이름, 팀원 <td> 추가
            row.innerHTML = `
                <td>${team.name}</td>
                <td>${membersString}</td>
            `;
            
            // 라운드 수만큼 점수 입력창 <td> 추가
            for (let i = 1; i <= TOTAL_ROUNDS; i++) {
                //  저장된 점수가 있으면 value에 반영
                const scoreValue = savedScores[team.id]?.[i-1] || 0;
                
                row.innerHTML += `
                    <td>
                        <input type="number" class="round-score-input" data-team-id="${team.id}" data-round-index="${i-1}" min="0" value="${scoreValue}">
                    </td>
                `;
            }
            
            // 최종 점수, 체크포인트 <td> 추가
            row.innerHTML += `
                <td><span class="total-score">0</span></td>
                <td><span class="checkpoint-result fail">X</span></td>
            `;
            
            tableBody.appendChild(row);
        });
        
        //  테이블이 렌더링 된 후, 저장된 점수로 즉시 계산/정렬 실행
        calculateAndSortScores();
        
        //  모든 입력창에 '입력 시 자동 저장' 이벤트 추가
        document.querySelectorAll('.round-score-input').forEach(input => {
            input.addEventListener('input', saveScoresToStorage);
        });
    }

    // 3. 점수 계산 및 순위 정렬
    function calculateAndSortScores() {
        let teamScores = []; // {id, totalPoints}를 저장할 임시 배열

        // 3-1. 설정값 읽어오기
        const checkpointScore = parseInt(checkpointScoreInput.value) || 0;
        const multipliers = [];
        for (let i = 1; i <= TOTAL_ROUNDS; i++) {
            const multiplier = parseInt(document.getElementById(`multiplier-round-${i}`).value) || 1;
            multipliers.push(multiplier);
        }

        // 3-2. 모든 팀의 점수 계산
        const teamRows = tableBody.querySelectorAll('tr');
        
        teamRows.forEach(row => {
            const teamId = row.dataset.teamId;
            //  teamId가 없으면 (예: 에러 메시지 행) 건너뛰기
            if (!teamId) return; 
            
            const scoreInputs = row.querySelectorAll('.round-score-input');
            let totalPoints = 0;
            
            scoreInputs.forEach(input => {
                const roundIndex = parseInt(input.dataset.roundIndex);
                const score = parseFloat(input.value) || 0;
                totalPoints += (score * multipliers[roundIndex]);
            });
            
            // 3-3. DOM에 최종 점수 및 체크포인트 결과 업데이트
            const scoreSpan = row.querySelector('.total-score');
            scoreSpan.textContent = totalPoints;
            
            const checkpointSpan = row.querySelector('.checkpoint-result');
            if (totalPoints >= checkpointScore) {
                checkpointSpan.textContent = 'O';
                checkpointSpan.className = 'checkpoint-result success';
            } else {
                checkpointSpan.textContent = 'X';
                checkpointSpan.className = 'checkpoint-result fail';
            }
            
            // 정렬을 위해 임시 배열에 저장
            teamScores.push({ id: teamId, totalPoints: totalPoints });
        });

        // 3-4. 점수를 기준으로 내림차순 정렬
        teamScores.sort((a, b) => b.totalPoints - a.totalPoints);

        // 3-5. 정렬된 순서대로 테이블(tbody)의 행(tr)을 다시 배치
        teamScores.forEach(scoreData => {
            const row = document.querySelector(`tr[data-team-id="${scoreData.id}"]`);
            tableBody.appendChild(row);
        });
    }

    // ---  점수 저장/복구/초기화 함수 ---
    
    // 현재 입력된 모든 점수를 읽어와 객체로 반환
    function getCurrentScores() {
        const scores = {}; // { teamId1: [r1, r2...], teamId2: [r1, r2...] }
        document.querySelectorAll('tr[data-team-id]').forEach(row => {
            const teamId = row.dataset.teamId;
            scores[teamId] = [];
            row.querySelectorAll('.round-score-input').forEach(input => {
                scores[teamId].push(parseFloat(input.value) || 0);
            });
        });
        return scores;
    }
    
    // 현재 점수를 localStorage에 저장
    function saveScoresToStorage() {
        const currentScores = getCurrentScores();
        localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(currentScores));
    }
    
    // localStorage에서 저장된 점수 불러오기
    function getSavedScores() {
        try {
            const saved = localStorage.getItem(SCORE_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("저장된 점수 로드 실패:", e);
            return {};
        }
    }
    
    // 점수 초기화 함수
    function resetScores() {
        if (!confirm('정말로 모든 라운드의 점수를 0으로 초기화하시겠습니까?')) {
            return;
        }
        
        // 1. localStorage에서 점수 데이터 삭제
        localStorage.removeItem(SCORE_STORAGE_KEY);
        
        // 2. 화면의 모든 입력창 값을 0으로 변경
        document.querySelectorAll('.round-score-input').forEach(input => {
            input.value = 0;
        });
        
        // 3. 0점으로 다시 계산 및 정렬
        calculateAndSortScores();
    }
    
    // --- 페이지 로드 시 실행 ---
    createMultiplierInputs(); // 배율 입력창 먼저 생성
    
    if (loadTeams()) { // 팀 로드에 성공하면
        renderTable(); // 테이블을 그림 (이 안에서 자동 점수 로드 및 계산 실행)
        
        // ---  모든 이벤트 리스너를 이 곳에 모음 ---
        
        // 1. 점수 계산 버튼
        calculateButton.addEventListener('click', calculateAndSortScores);
        
        // 2. 점수 초기화 버튼
        resetScoresButton.addEventListener('click', resetScores);
        
        // 이미지 저장 버튼 이벤트 리스너
    saveImageButton.addEventListener('click', () => {
        // [★수정★] 캡처할 영역의 DOM 요소를 정확히 지정
        const captureArea = document.querySelector('.score-table-container'); 
        
        if (!captureArea) {
            alert('캡처할 점수표 영역을 찾을 수 없습니다.');
            console.error('HTML 요소 .score-table-container 를 찾을 수 없음.');
            return;
        }

        html2canvas(captureArea, { // ★ 이 부분만 변경됩니다.
            backgroundColor: '#1e1e1e', 
            useCORS: true
        }).then(canvas => {
            const imageData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imageData;
            link.download = '점수표.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(error => {
            console.error('이미지 저장 중 오류 발생:', error);
            alert('이미지 저장에 실패했습니다.');
        });
    });
    }
});