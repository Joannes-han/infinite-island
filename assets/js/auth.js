// assets/js/auth.js
import { supabase } from './supabase.js';

// ★ 1. 로그인해야만 들어갈 수 있는 페이지 목록
const protectedPages = [
    'draft.html',
    'attendance.html',
    'tiers.html',
    'score.html'
];

// 현재 페이지 파일명 가져오기 (예: index.html)
const path = window.location.pathname;
const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();

    // === 로그인 상태가 아닐 때 ===
    if (!session) {
        // 1. 보호된 페이지에 접근하려고 하면 -> 로그인 페이지로 쫓아냄
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
            return;
        }

        // 2. 공개된 페이지라면 -> 관리자 메뉴 숨기기 (Guest 모드)
        if (currentPage !== 'login.html') {
            applyGuestMode();
        }
    } 
    // === 로그인 상태일 때 ===
    else {
        // 이미 로그인했는데 로그인 페이지에 왔다면 -> 대시보드로
        if (currentPage === 'login.html') {
            window.location.href = 'index.html';
        }
        // 로그인 상태면 모든 메뉴 보이기 (기본값)
    }
}

// ★ 게스트 모드: 관리자 전용 메뉴 숨기기 & 로그인 버튼 표시
function applyGuestMode() {
    // 1. 사이드바 메뉴 숨기기
    const menuLinks = document.querySelectorAll('.menu-list a');
    menuLinks.forEach(link => {
        // 링크의 href 속성을 가져옴 (예: draft.html)
        const href = link.getAttribute('href');
        
        // 보호된 페이지로 가는 링크라면 -> 부모 <li>를 숨김
        if (protectedPages.includes(href)) {
            link.parentElement.style.display = 'none';
        }
    });

    // 2. 로그아웃 버튼 -> 로그인 버튼으로 변경
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> 관리자 로그인';
        logoutBtn.style.color = '#2ed573'; // 초록색으로 변경
        
        // 기존 로그아웃 이벤트 제거하고 로그인 페이지 이동으로 변경
        // (가장 쉬운 방법은 요소를 새로 교체하는 것)
        const newBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }
}

// 로그아웃 기능 (로그인 상태일 때만 작동)
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            // 버튼 텍스트가 '로그아웃'일 때만 작동
            if (logoutBtn.textContent.includes('로그아웃')) {
                e.preventDefault();
                if (confirm("로그아웃 하시겠습니까?")) {
                    await supabase.auth.signOut();
                    window.location.href = 'index.html'; // 대시보드(게스트모드)로 이동
                }
            }
        });
    }
}

// 실행
checkSession();
document.addEventListener('DOMContentLoaded', setupLogout);