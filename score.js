// --- (이 아래는 수정하지 않아도 됩니다) ---

const TOTAL_ROUNDS = 6; // 총 라운드 수

document.addEventListener('DOMContentLoaded', () => {
    // --- [★수정★] 모든 DOM 요소를 맨 위에서 선언 ---
    const tableBody = document.getElementById('score-table-body');
    const calculateButton = document.getElementById('calculate-score-button');
    const checkpointScoreInput = document.getElementById('checkpoint-score');
    const multiplierInputsContainer = document.getElementById('multiplier-inputs');
    const saveImageButton = document.getElementById('save-score-image-button'); // 이미지 버튼
    
    let teams = []; // 팀 정보를 담을 배열

    // 0. 라운드 배율 입력창 생성
    function createMultiplierInputs() {
        for (let i = 1; i <= TOTAL_ROUNDS; i++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = `multiplier-round-${i}`;
            input.className = 'multiplier-input';
            input.value = (i === 3) ? '2' : '1'; // 3라운드만 배율 2로 기본 설정
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
                row.innerHTML += `
                    <td>
                        <input type="number" class="round-score-input" data-round-index="${i-1}" min="0" value="0">
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

    // --- 페이지 로드 시 실행 ---
    createMultiplierInputs(); // 배율 입력창 먼저 생성
    
    if (loadTeams()) { // 팀 로드에 성공하면
        renderTable(); // 테이블을 그리고
        
        // --- [★수정★] 모든 이벤트 리스너를 이 곳에 모음 ---
        
        // 1. 점수 계산 버튼
        calculateButton.addEventListener('click', calculateAndSortScores);
        
        // 2. 이미지 저장 버튼
        saveImageButton.addEventListener('click', () => {
            // 캡처할 영역 (score-container 전체)
            const targetElement = document.querySelector('.score-container');
            
            if (!targetElement) {
                alert('이미지를 저장할 영역을 찾을 수 없습니다.');
                return;
            }

            // html2canvas 옵션 (배경색 지정)
            const options = { 
                backgroundColor: '#1e1e1e', // .score-container 배경색
                useCORS: true 
            };

            html2canvas(targetElement, options).then(canvas => {
                const imageURL = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.href = imageURL;
                downloadLink.download = '점수 계산표.png';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }).catch(error => {
                console.error('이미지 저장 중 오류 발생:', error);
                alert('이미지 저장에 실패했습니다. 콘솔을 확인해주세요.');
            });
        });
    }
});