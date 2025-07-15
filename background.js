// background.js

// กำหนด URL ของ Gemini
const GEMINI_URL = "https://gemini.google.com/";

// Listener สำหรับรับข้อความจาก Content Script (ที่ใช้สำหรับปุ่มลอย)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openSidePanel') {
        // เปิด Side Panel สำหรับหน้าต่าง (window) ที่ส่งข้อความมา
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
        sendResponse({ status: 'Side panel opened' });
    }
});

// Listener สำหรับเมื่อแท็บมีการอัปเดต (เช่น เปลี่ยน URL, โหลดเสร็จ)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // ตรวจสอบว่า URL มีการเปลี่ยนแปลงหรือไม่ และแท็บมี URL ที่ถูกต้อง
    if (changeInfo.url && tab.url) {
        // ตรวจสอบว่า URL ของแท็บเริ่มต้นด้วย GEMINI_URL หรือไม่
        if (tab.url.startsWith(GEMINI_URL)) {
            // ถ้าอยู่ใน Gemini URL: เปิดใช้งาน Side Panel สำหรับแท็บนี้
            await chrome.sidePanel.setOptions({
                tabId: tabId,
                enabled: true
            });
        } else {
            // ถ้าไม่ได้อยู่ใน Gemini URL: ปิดใช้งาน Side Panel สำหรับแท็บนี้
            await chrome.sidePanel.setOptions({
                tabId: tabId,
                enabled: false
            });
        }
    }
});

// Listener สำหรับเมื่อแท็บมีการใช้งาน (active) เปลี่ยนไป
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // ดึงข้อมูลแท็บที่เพิ่ง active ขึ้นมา
    const tab = await chrome.tabs.get(activeInfo.tabId);

    // ตรวจสอบว่า URL ของแท็บนั้นเริ่มต้นด้วย GEMINI_URL หรือไม่
    if (tab.url && tab.url.startsWith(GEMINI_URL)) {
        // ถ้าอยู่ใน Gemini URL: เปิดใช้งาน Side Panel สำหรับแท็บนี้
        await chrome.sidePanel.setOptions({
            tabId: tab.id,
            enabled: true
        });
    } else {
        // ถ้าไม่ได้อยู่ใน Gemini URL: ปิดใช้งาน Side Panel สำหรับแท็บนี้
        await chrome.sidePanel.setOptions({
            tabId: tab.id,
            enabled: false
        });
    }
});
