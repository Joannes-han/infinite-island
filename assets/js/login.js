// assets/js/login.js
import { supabase } from './supabase.js';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // 새로고침 방지

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    const loginBtn = document.getElementById('loginBtn');

    // 로딩 표시
    loginBtn.textContent = "로그인 중...";
    loginBtn.disabled = true;
    errorMsg.textContent = "";

    // Supabase 로그인 요청
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error("로그인 실패:", error);
        errorMsg.textContent = "아이디 또는 비밀번호가 잘못되었습니다.";
        loginBtn.textContent = "로그인";
        loginBtn.disabled = false;
    } else {
        // 성공 시 대시보드로 이동
        window.location.href = 'index.html';
    }
});