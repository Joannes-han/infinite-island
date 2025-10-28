// login.js

// [★주의★] 서버 주소와 토큰 키 정의 (다른 JS 파일과 동일해야 함)
const SERVER_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN_KEY = 'authToken'; // 세션 스토리지에 저장될 토큰 키 이름

document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('master-password');
    const loginButton = document.getElementById('login-button');
    const messageDisplay = document.getElementById('login-message');
    
    // 1. 로그인 처리 함수
    async function handleLogin() {
        const password = passwordInput.value;
        if (!password) {
            showMessage('MASTER KEY를 입력하세요.', 'error');
            return;
        }

        showMessage('로그인 중...', 'success'); // 로딩 표시
        loginButton.disabled = true;

        try {
            const response = await fetch(`${SERVER_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });
            
            const data = await response.json();

            if (response.ok) {
                // 2. 로그인 성공: 세션 스토리지에 토큰(상태) 저장
                sessionStorage.setItem(AUTH_TOKEN_KEY, data.token); // 서버가 준 토큰 저장
                showMessage('로그인 성공! 1초 후 메인 허브로 이동합니다.', 'success');
                
                // 3. 1초 후 메인 허브로 리다이렉션
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);

            } else {
                // 4. 로그인 실패
                throw new Error(data.message || '비밀번호가 일치하지 않습니다.');
            }
        } catch (e) {
            console.error('Login API 호출 오류:', e);
            showMessage(`로그인 실패: ${e.message}`, 'error');
            loginButton.disabled = false;
        }
    }
    
    // 메시지 표시 유틸리티
    function showMessage(msg, type = 'error') {
        if (messageDisplay) {
            messageDisplay.textContent = msg;
            messageDisplay.className = `login-message-box ${type}`;
        }
    }

    // 이벤트 리스너 연결
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
});