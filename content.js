// content.js

// Function to create and append the floating button
function createFloatingButton() {
    const button = document.createElement('button');
    button.id = 'gemini-folders-floating-button';
    button.title = 'Open Gemini Folders'; // เพิ่ม title สำหรับ tooltip

    // สร้าง img element สำหรับไอคอน
    const iconImg = document.createElement('img');
    // iconImg.src = chrome.runtime.getURL('icons/gemini.png'); // <-- เปลี่ยนเป็นชื่อไฟล์ไอคอนประกายดาวของคุณ
    // iconImg.alt = 'Gemini';
    iconImg.classList.add('floating-button-icon'); // เพิ่ม class สำหรับ CSS

    // สร้าง span element สำหรับข้อความ
    const buttonText = document.createElement('span');
    buttonText.textContent = 'Gemini'; // <-- เปลี่ยนข้อความตรงนี้ตามที่คุณต้องการ
    buttonText.classList.add('floating-button-text'); // เพิ่ม class สำหรับ CSS

    // เพิ่ม icon และ text ลงในปุ่ม
    button.appendChild(iconImg);
    button.appendChild(buttonText);

    document.body.appendChild(button);

    // Event listener for the button
    button.addEventListener('click', () => {
        // Send a message to the background script to open the side panel
        chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
            } else {
                console.log("Response from background:", response);
            }
        });
    });
}

// Check if the button already exists to prevent duplication
if (!document.getElementById('gemini-folders-floating-button')) {
    createFloatingButton();
}