import { supabase } from './supabase.js';
import { initTheme, setupThemeToggle } from './theme-manager.js';

// ★ 디스코드 알림용 웹훅 URL
const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1449097214839361698/h8hD4IAgh309EFixVsRPT-kJGhDrOA8sawxKu4vZrwWqcnLdyqwFdjuIhEc7Jf9LQhG4";

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupThemeToggle();
    setupTabs(); 

    loadInquiries(); 

    document.getElementById('sendInquiryBtn').addEventListener('click', sendInquiry);
    document.getElementById('refreshBtn').addEventListener('click', loadInquiries);
});

// 1. 탭 전환 기능
function setupTabs() {
    const tabWrite = document.getElementById('tabWrite');
    const tabList = document.getElementById('tabList');
    const sectionWrite = document.getElementById('sectionWrite');
    const sectionList = document.getElementById('sectionList');

    if(!tabWrite || !tabList) return;

    tabWrite.addEventListener('click', () => {
        tabWrite.classList.add('active'); tabList.classList.remove('active');
        sectionWrite.style.display = 'block'; sectionList.style.display = 'none';
    });

    tabList.addEventListener('click', () => {
        tabList.classList.add('active'); tabWrite.classList.remove('active');
        sectionWrite.style.display = 'none'; sectionList.style.display = 'block';
        loadInquiries(); 
    });
}

// 2. 문의 내역 불러오기
async function loadInquiries() {
    const listDiv = document.getElementById('inquiryList');
    listDiv.innerHTML = '<div style="text-align:center; padding:20px;">로딩 중...</div>';

    try {
        const { data, error } = await supabase
            .from('inquiries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderList(data);

    } catch (err) {
        console.error(err);
        listDiv.innerHTML = '<div style="color:red; text-align:center;">데이터를 불러오지 못했습니다.</div>';
    }
}

// 3. 리스트 그리기 (★ 수정됨: 아코디언 기능 추가)
function renderList(data) {
    const listDiv = document.getElementById('inquiryList');
    listDiv.innerHTML = '';

    if (!data || data.length === 0) {
        listDiv.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">등록된 문의가 없습니다.</div>';
        return;
    }

    data.forEach(item => {
        const div = document.createElement('div');
        const isDone = item.status === 'completed' || (item.answer && item.answer.trim() !== '');
        
        div.className = `inq-card status-${isDone ? 'completed' : 'pending'}`;
        const dateStr = new Date(item.created_at).toLocaleDateString();

        // 답변 HTML
        let answerHtml = '';
        if (item.answer) {
            answerHtml = `
                <div class="answer-box">
                    <span class="admin-title"><i class="fa-solid fa-check"></i> 관리자 답변</span>
                    <div class="answer-text">${item.answer}</div>
                </div>
            `;
        } 
        
        // 카테고리
        let categoryTag = '';
        if (item.category) {
            categoryTag = `<span class="category-badge">[${item.category}]</span>`;
        }
        const senderName = item.sender || '익명';

        // ★ HTML 구조 변경: 헤더(클릭영역) + 바디(숨김영역)
        div.innerHTML = `
            <div class="card-header-area">
                <div class="header-left">
                    <div style="font-size:1.1rem; color:var(--text-main); font-weight:bold;">
                        ${categoryTag} ${senderName}
                    </div>
                    <div class="header-info">
                        <span>${dateStr}</span>
                        <span class="badge ${isDone ? 'done' : 'wait'}">
                            ${isDone ? '답변완료' : '대기중'}
                        </span>
                    </div>
                </div>
                <div class="header-right">
                    <i class="fa-solid fa-chevron-down toggle-icon"></i>
                </div>
            </div>

            <div class="inq-detail-area">
                <div class="question-text">${item.content}</div>
                ${answerHtml}
            </div>
        `;

        // ★ 클릭 이벤트 추가: active 클래스 토글
        div.querySelector('.card-header-area').addEventListener('click', () => {
            div.classList.toggle('active');
        });

        listDiv.appendChild(div);
    });
}

// 4. 문의 전송
async function sendInquiry() {
    const categoryVal = document.getElementById('inqCategory').value;
    const nameVal = document.getElementById('inqName').value.trim();
    const contentVal = document.getElementById('inqContent').value.trim();
    const btn = document.getElementById('sendInquiryBtn');

    if (!nameVal || !contentVal) return alert("이름과 내용을 입력해주세요.");

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 전송 중...';

    try {
        const { data, error } = await supabase
            .from('inquiries')
            .insert([{
                sender: nameVal,
                category: categoryVal,
                content: contentVal,
                status: 'pending'
            }])
            .select();

        if (error) throw error;
        
        await sendToDiscordWebhook(data[0].id, categoryVal, nameVal, contentVal);

        alert("문의가 등록되었습니다!");
        
        document.getElementById('inqContent').value = '';
        document.getElementById('inqName').value = '';
        document.getElementById('tabList').click();

    } catch (err) {
        console.error("DB 저장 실패:", err);
        alert("오류가 발생했습니다.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-regular fa-paper-plane"></i> 문의 등록하기';
    }
}

// 디스코드 웹훅 알림
async function sendToDiscordWebhook(id, category, name, content) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("여기에")) return;

    let color = 0x3498db; 
    if (category === '버그') color = 0xe74c3c;
    if (category === '신고') color = 0xe67e22;
    if (category === '건의') color = 0x2ecc71;

    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "무한섬 문의봇",
                embeds: [{
                    title: `🔔 새 문의 접수 (#${id})`,
                    color: color,
                    fields: [
                        { name: "유형", value: category, inline: true },
                        { name: "작성자", value: name, inline: true },
                        { name: "내용", value: content }
                    ],
                    footer: { text: `DB ID: ${id} (Supabase Table에서 수정하세요)` },
                    timestamp: new Date().toISOString()
                }]
            })
        });
    } catch (e) {
        console.error("디스코드 알림 전송 실패:", e);
    }
}