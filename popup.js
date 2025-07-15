document.addEventListener('DOMContentLoaded', () => {
    const tabsList = document.getElementById('tabs-list');
    const folderNameInput = document.getElementById('new-folder-name-input');
    const createNewFolderBtn = document.getElementById('save-new-folder-btn');
    const savedFoldersList = document.getElementById('saved-folders-list');
    const newFolderBtn = document.getElementById('new-folder-btn'); // ปุ่มเพิ่มโฟลเดอร์
    const cancelCreateBtn = document.getElementById('cancel-create-btn'); // ปุ่มยกเลิก
    const createNewSection = document.getElementById('create-new-section'); // ส่วนสร้างโฟลเดอร์ใหม่
    const folderDisplaySection = document.getElementById('folder-display-section'); // ส่วนแสดงโฟลเดอร์
    const filterInput = document.getElementById('filter-input'); // ช่อง Filter

    let currentTabs = []; // To store details of all currently open tabs

    // --- Show/Hide Create New Folder section ---
    newFolderBtn.addEventListener('click', () => {
        createNewSection.style.display = 'block';
        folderDisplaySection.style.display = 'none';
        loadCurrentTabs(); // โหลดแท็บปัจจุบันเมื่อจะสร้างโฟลเดอร์
    });

    cancelCreateBtn.addEventListener('click', () => {
        createNewSection.style.display = 'none';
        folderDisplaySection.style.display = 'block';
        folderNameInput.value = ''; // Clear input
        loadCurrentTabs(); // Uncheck boxes
    });

    // --- Function to load and display current tabs ---
    function loadCurrentTabs() {
        tabsList.innerHTML = ''; // Clear previous list
        chrome.tabs.query({ currentWindow: true, pinned: false }, (tabs) => { // ไม่รวม pinned tabs
            currentTabs = tabs; // Save all tab details
            if (tabs.length === 0) {
                tabsList.textContent = 'No active tabs to save.';
                return;
            }
            tabs.forEach(tab => {
                const li = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `tab-${tab.id}`;
                checkbox.value = tab.id; // Store tab ID

                const label = document.createElement('label');
                label.htmlFor = `tab-${tab.id}`;
                label.textContent = tab.title.length > 60 ? tab.title.substring(0, 57) + '...' : tab.title; // Truncate long titles

                li.appendChild(checkbox);
                li.appendChild(label);
                tabsList.appendChild(li);
            });
        });
    }

    // --- Function to save selected tabs as a folder ---
    createNewFolderBtn.addEventListener('click', () => {
        const folderName = folderNameInput.value.trim();
        if (!folderName) {
            alert('Please enter a folder name.');
            return;
        }

        const selectedTabIds = Array.from(tabsList.querySelectorAll('input[type="checkbox"]:checked'))
                                    .map(checkbox => parseInt(checkbox.value));

        if (selectedTabIds.length === 0) {
            alert('Please select at least one tab to save.');
            return;
        }

        const tabsToSave = currentTabs.filter(tab => selectedTabIds.includes(tab.id))
                                      .map(tab => ({ title: tab.title, url: tab.url }));

        if (tabsToSave.length === 0) {
            alert('Could not find selected tabs. Please refresh and try again.');
            return;
        }

        chrome.storage.local.get(['geminiFolders'], (result) => {
            let folders = result.geminiFolders || {};
            if (folders[folderName]) {
                if (!confirm(`Folder "${folderName}" already exists. Do you want to overwrite it?`)) {
                    return;
                }
            }
            folders[folderName] = tabsToSave;
            chrome.storage.local.set({ geminiFolders: folders }, () => {
                alert(`Folder "${folderName}" saved successfully!`);
                folderNameInput.value = ''; // Clear input
                createNewSection.style.display = 'none'; // ซ่อนส่วนสร้างโฟลเดอร์
                folderDisplaySection.style.display = 'block'; // แสดงส่วนแสดงโฟลเดอร์
                loadSavedFolders(); // Refresh saved folders list
                loadCurrentTabs(); // Uncheck boxes for next creation
            });
        });
    });

    // --- Function to load and display saved folders (with filter) ---
    function loadSavedFolders(filterText = '') {
        savedFoldersList.innerHTML = ''; // Clear previous list
        chrome.storage.local.get(['geminiFolders'], (result) => {
            const folders = result.geminiFolders || {};
            const folderNames = Object.keys(folders).sort(); // เรียงตามตัวอักษร

            const filteredFolderNames = folderNames.filter(name =>
                name.toLowerCase().includes(filterText.toLowerCase())
            );

            if (filteredFolderNames.length === 0) {
                const li = document.createElement('li');
                li.textContent = filterText ? 'No matching folders found.' : 'No folders saved yet.';
                savedFoldersList.appendChild(li);
                return;
            }

            filteredFolderNames.forEach(folderName => {
                const li = document.createElement('li');

                const folderInfoDiv = document.createElement('div');
                folderInfoDiv.classList.add('folder-info');
                const folderIcon = document.createElement('img');
                folderIcon.src = 'icons/folder.png'; // ไอคอนโฟลเดอร์
                folderIcon.classList.add('folder-action-icon');
                folderInfoDiv.appendChild(folderIcon);
                const folderNameSpan = document.createElement('span');
                folderNameSpan.textContent = folderName;
                folderInfoDiv.appendChild(folderNameSpan);
                li.appendChild(folderInfoDiv);

                const folderActionsDiv = document.createElement('div');
                folderActionsDiv.classList.add('folder-actions');

                // Open All Button
                const openBtn = document.createElement('button');
                openBtn.textContent = 'Open'; // เปลี่ยนจาก Open All เป็น Open
                openBtn.classList.add('open-folder-btn');
                openBtn.addEventListener('click', () => openFolder(folderName, folders[folderName]));
                folderActionsDiv.appendChild(openBtn);

                // Delete Button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.classList.add('delete-folder-btn');
                deleteBtn.addEventListener('click', () => deleteFolder(folderName));
                folderActionsDiv.appendChild(deleteBtn);

                li.appendChild(folderActionsDiv);
                savedFoldersList.appendChild(li);
            });
        });
    }

    // --- Function to open tabs from a saved folder ---
    function openFolder(folderName, tabsToOpen) {
        if (tabsToOpen && tabsToOpen.length > 0) {
            // Close the popup window first for a smoother experience
            window.close(); 
            tabsToOpen.forEach((tab, index) => {
                if (index === 0) {
                    // For the first tab, update the current active tab
                    // Check if current tab is new tab page or about:blank before updating
                    chrome.tabs.query({ active: true, currentWindow: true }, (currentActiveTab) => {
                        if (currentActiveTab[0] && (currentActiveTab[0].url === 'chrome://newtab/' || currentActiveTab[0].url === 'about:blank')) {
                            chrome.tabs.update(currentActiveTab[0].id, { url: tab.url });
                        } else {
                            chrome.tabs.create({ url: tab.url, active: true }); // Open first tab actively in new tab
                        }
                    });
                } else {
                    // For subsequent tabs, create new ones in background
                    chrome.tabs.create({ url: tab.url, active: false });
                }
            });
        } else {
            alert(`Folder "${folderName}" is empty or has no valid tabs.`);
        }
    }

    // --- Function to delete a folder ---
    function deleteFolder(folderName) {
        if (confirm(`Are you sure you want to delete the folder "${folderName}"?`)) {
            chrome.storage.local.get(['geminiFolders'], (result) => {
                let folders = result.geminiFolders || {};
                delete folders[folderName]; // Remove the folder from the object
                chrome.storage.local.set({ geminiFolders: folders }, () => {
                    alert(`Folder "${folderName}" deleted successfully.`);
                    loadSavedFolders(filterInput.value); // Reload with current filter
                });
            });
        }
    }

    // --- Filter functionality ---
    filterInput.addEventListener('input', (event) => {
        loadSavedFolders(event.target.value);
    });

    // Initial load
    loadSavedFolders(); // เริ่มต้นด้วยการแสดงโฟลเดอร์
    createNewSection.style.display = 'none'; // ซ่อนส่วนสร้างโฟลเดอร์ตอนแรก
});