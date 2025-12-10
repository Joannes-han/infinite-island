// main.js (Electron의 대장 파일)

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// 현재 파일의 위치를 알아내는 코드 (ES Module 방식이라 필요함)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  // 1. 브라우저 창 만들기
  mainWindow = new BrowserWindow({
    width: 1280,        // 초기 너비
    height: 800,        // 초기 높이
    minWidth: 1000,     // 최소 너비
    minHeight: 700,     // 최소 높이
    title: "무한섬 Manager", // 창 제목
    icon: path.join(__dirname, 'assets', 'icon.png'), // 아이콘 (나중에 추가 가능)
    webPreferences: {
      nodeIntegration: false, // 보안을 위해 끔
      contextIsolation: true, // 보안을 위해 킴
    }
  });

  mainWindow.setMenu(null);

  // 2. 우리가 만든 index.html 파일을 불러오기
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // (선택사항) 개발자 도구(F12) 자동으로 열기 (개발 끝나면 주석 처리)
  // mainWindow.webContents.openDevTools();

  // 창이 닫히면 변수 비우기
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron 준비가 끝나면 창을 띄움
app.whenReady().then(createWindow);

// 모든 창이 닫히면 프로그램 종료 (맥OS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 맥OS를 위한 처리 (독 아이콘 클릭 시 창 다시 열기)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});