document.addEventListener('DOMContentLoaded', () => {
    alert(222);
    const tabsList = document.getElementById('tabs-list');
    const folderNameInput = document.getElementById('new-folder-name-input');
    const createNewFolderBtn = document.getElementById('save-new-folder-btn');
    const savedFoldersList = document.getElementById('saved-folders-list');
    const newFolderBtn = document.getElementById('new-folder-btn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    const createNewSection = document.getElementById('create-new-section');
    const folderDisplaySection = document.getElementById('folder-display-section');
    const filterInput = document.getElementById('filter-input');

    let currentTabs = [];

    // --- Show/Hide Create New Folder section ---
    newFolderBtn.addEventListener('click', () => {
        createNewSection.style.display = 'block';
        folderDisplaySection.style.display = 'none';
        loadCurrentTabs();
    });

    cancelCreateBtn.addEventListener('click', () => {
        createNewSection.style.display = 'none';
        folderDisplaySection.style.display = 'block';
        folderNameInput.value = '';
        // Uncheck all checkboxes when cancelling
        tabsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    });

    // --- Function to load and display current tabs ---
    function loadCurrentTabs() {
        tabsList.innerHTML = '';
        chrome.tabs.query({ currentWindow: true, pinned: false }, (tabs) => {
            currentTabs = tabs;
            if (tabs.length === 0) {
                tabsList.textContent = 'No active tabs to save.';
                return;
            }
            tabs.forEach(tab => {
                const li = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `tab-${tab.id}`;
                checkbox.value = tab.id;

                const label = document.createElement('label');
                label.htmlFor = `tab-${tab.id}`;
                label.textContent = tab.title.length > 60 ? tab.title.substring(0, 57) + '...' : tab.title;

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
                folderNameInput.value = '';
                createNewSection.style.display = 'none';
                folderDisplaySection.style.display = 'block';
                loadSavedFolders();
                // Uncheck all checkboxes after saving
                tabsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
            });
        });
    });

    // --- Function to load and display saved folders (with filter) ---
    function loadSavedFolders(filterText = '') {
        savedFoldersList.innerHTML = '';
        chrome.storage.local.get(['geminiFolders'], (result) => {
            const folders = result.geminiFolders || {};
            const folderNames = Object.keys(folders).sort((a, b) => a.localeCompare(b)); // Sort alphabetically

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
                folderIcon.src = 'icons/folder.png';
                folderIcon.alt = 'Folder icon';
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
                openBtn.textContent = 'Open';
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
            // Close the side panel window for a smoother experience
            //window.close();
            // Open tabs
            tabsToOpen.forEach((tab, index) => {
                if (index === 0) {
                    // For the first tab, try to update current active tab if it's newtab/blank
                    chrome.tabs.query({ active: true, currentWindow: true }, (currentActiveTab) => {
                        if (currentActiveTab[0] && (currentActiveTab[0].url === 'chrome://newtab/' || currentActiveTab[0].url === 'about:blank' || currentActiveTab[0].url.startsWith('chrome-extension://'))) {
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
                delete folders[folderName];
                chrome.storage.local.set({ geminiFolders: folders }, () => {
                    // alert(`Folder "${folderName}" deleted successfully.`); // Removed for smoother UX
                    loadSavedFolders(filterInput.value);
                });
            });
        }
    }

    // --- Filter functionality ---
    filterInput.addEventListener('input', (event) => {
        loadSavedFolders(event.target.value);
    });

    // Initial load for the side panel
    loadSavedFolders();
    createNewSection.style.display = 'none'; // Ensure create section is hidden on initial load
});