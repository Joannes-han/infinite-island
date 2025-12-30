// assets/js/notice.js

/**
 * ★ 중요: 공지사항을 새로 띄울 때마다 이 ID를 바꿔주세요!
 * 예: 'notice_v1', 'notice_20251213', 'notice_update_draft' 등
 */
const CURRENT_NOTICE_ID = 'notice_2025_12_13_v2';

document.addEventListener('DOMContentLoaded', () => {
    checkNotice();
});

function checkNotice() {
    const popup = document.getElementById('noticePopup');
    if (!popup) return;

    // 1. 로컬 스토리지 확인
    // "이 사용자가 이 버전(CURRENT_NOTICE_ID)의 공지를 닫은 적이 있는가?"
    const hasSeen = localStorage.getItem(CURRENT_NOTICE_ID);

    if (!hasSeen) {
        // 본 적 없다면 팝업 띄움
        popup.style.display = 'flex';
    }
}

// 이벤트 연결
const closeForeverBtn = document.getElementById('closeNoticeForever');
const closeOnceBtn = document.getElementById('closeNoticeOnce');
const popup = document.getElementById('noticePopup');

// [다시 보지 않기] -> 영구 저장
if (closeForeverBtn) {
    closeForeverBtn.addEventListener('click', () => {
        // "봤음"이라고 도장을 찍음 (저장)
        localStorage.setItem(CURRENT_NOTICE_ID, 'true');
        popup.style.display = 'none';
    });
}

// [닫기] -> 이번만 닫기 (새로고침하면 또 뜸 - 테스트용이나 단순 닫기용)
// 만약 '오늘 하루 열지 않기'가 아니라 그냥 '확인' 개념이라면 여기서 저장해도 됩니다.
if (closeOnceBtn) {
    closeOnceBtn.addEventListener('click', () => {
        // 여기서는 저장을 안 하므로, 새로고침하면 또 뜹니다.
        // 만약 '닫기' 눌러도 안 뜨게 하려면 아래 주석을 해제하세요.
        localStorage.setItem(CURRENT_NOTICE_ID, 'true'); 
        popup.style.display = 'none';
    });
}