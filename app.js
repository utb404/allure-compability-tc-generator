// Global variables
let testCases = [];
let currentEditingId = null;
let currentDeletingId = null;
let currentCloningId = null;
let filteredTestCases = [];

// UUID generation
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Enhanced Test Case class with all Allure TestOPS fields
class TestCase {
    constructor(data) {
        this.id = data.id || generateUUID();
        
        // Basic fields
        this.name = data.name;
        this.description = data.description || '';
        this.preconditions = data.preconditions || '';
        this.expectedResult = data.expectedResult || '';
        
        // Metadata labels
        this.epic = data.epic || '';
        this.feature = data.feature || '';
        this.story = data.story || '';
        this.component = data.component || '';
        this.testLayer = data.testLayer || '';
        this.severity = data.severity || 'NORMAL';
        this.priority = data.priority || 'MEDIUM';
        this.environment = data.environment || '';
        this.browser = data.browser || '';
        
        // Members
        this.owner = data.owner || '';
        this.author = data.author || '';
        this.reviewer = data.reviewer || '';
        
        // External links
        this.testCaseId = data.testCaseId || '';
        this.issueLinks = data.issueLinks || '';
        this.testCaseLinks = data.testCaseLinks || '';
        
        // Additional fields
        this.tags = data.tags || '';
        this.testType = data.testType || 'manual';
        
        // Steps and metadata
        this.steps = data.steps || [];
        this.createdAt = data.createdAt || Date.now();
        this.updatedAt = data.updatedAt || Date.now();
    }

    getStatus() {
        if (!this.steps.length) return 'passed';
        const hasFailedSteps = this.steps.some(step => step.status === 'failed');
        const hasSkippedSteps = this.steps.some(step => step.status === 'skipped');
        
        if (hasFailedSteps) return 'failed';
        if (hasSkippedSteps) return 'mixed';
        return 'passed';
    }

    addStep(stepData) {
        const step = {
            id: generateUUID(),
            name: stepData.name,
            description: stepData.description || '',
            expectedResult: stepData.expectedResult || '',
            status: stepData.status || 'passed',
            bugLink: stepData.bugLink || '',
            skipReason: stepData.skipReason || '',
            attachments: stepData.attachments || ''
        };
        this.steps.push(step);
        return step;
    }

    clone(newName) {
        const clonedData = { ...this };
        clonedData.id = generateUUID();
        clonedData.name = newName;
        clonedData.createdAt = Date.now();
        clonedData.updatedAt = Date.now();
        clonedData.steps = this.steps.map(step => ({ ...step, id: generateUUID() }));
        return new TestCase(clonedData);
    }
}

// Application initialization
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeEventListeners();
    renderTestCasesList();
    updateExportButtons();
});

function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sectionName = e.target.dataset.section;
            switchSection(sectionName);
        });
    });
}

function switchSection(sectionName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Show/hide sections
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Refresh content based on section
    if (sectionName === 'manage') {
        renderTestCasesList();
        applyFilters();
    }
}

function initializeEventListeners() {
    // Form submission
    document.getElementById('testCaseForm').addEventListener('submit', handleTestCaseSubmit);
    
    // Form buttons
    document.getElementById('addStepBtn').addEventListener('click', addNewStep);
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
    
    // Search and filters
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('severityFilter').addEventListener('change', applyFilters);
    
    // Import/Export buttons
    document.getElementById('exportAllBtn').addEventListener('click', exportAllTestCases);
    document.getElementById('generateAllureBtn').addEventListener('click', generateAllureJson);
    document.getElementById('createBackupBtn').addEventListener('click', createBackup);
    document.getElementById('importFileInput').addEventListener('change', handleFileSelect);
    document.getElementById('importBtn').addEventListener('click', importTestCases);
    
    // Modal buttons
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
    document.getElementById('cancelDelete').addEventListener('click', hideModal);
    document.getElementById('confirmClone').addEventListener('click', confirmClone);
    document.getElementById('cancelClone').addEventListener('click', hideCloneModal);
    
    // Close modals on backdrop click
    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) hideModal();
    });
    document.getElementById('cloneModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) hideCloneModal();
    });
}

function handleTestCaseSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) return;

    const formData = getFormData();
    const steps = collectStepsData();

    if (currentEditingId) {
        updateTestCase(currentEditingId, formData, steps);
    } else {
        createTestCase(formData, steps);
    }

    resetForm();
    renderTestCasesList();
    updateExportButtons();
    showToast(currentEditingId ? 'Тест-кейс обновлен!' : 'Тест-кейс создан!');
}

function validateForm() {
    const nameInput = document.getElementById('testCaseName');
    const errorElement = document.getElementById('nameError');
    
    if (!nameInput.value.trim()) {
        errorElement.textContent = 'Название тест-кейса обязательно для заполнения';
        nameInput.focus();
        return false;
    }
    
    errorElement.textContent = '';
    return true;
}

function getFormData() {
    return {
        name: document.getElementById('testCaseName').value.trim(),
        description: document.getElementById('testCaseDescription').value.trim(),
        preconditions: document.getElementById('preconditions').value.trim(),
        expectedResult: document.getElementById('expectedResult').value.trim(),
        epic: document.getElementById('epic').value.trim(),
        feature: document.getElementById('feature').value.trim(),
        story: document.getElementById('story').value.trim(),
        component: document.getElementById('component').value.trim(),
        testLayer: document.getElementById('testLayer').value,
        severity: document.getElementById('severity').value,
        priority: document.getElementById('priority').value,
        environment: document.getElementById('environment').value.trim(),
        browser: document.getElementById('browser').value.trim(),
        owner: document.getElementById('owner').value.trim(),
        author: document.getElementById('author').value.trim(),
        reviewer: document.getElementById('reviewer').value.trim(),
        testCaseId: document.getElementById('testCaseId').value.trim(),
        issueLinks: document.getElementById('issueLinks').value.trim(),
        testCaseLinks: document.getElementById('testCaseLinks').value.trim(),
        tags: document.getElementById('tags').value.trim(),
        testType: document.querySelector('input[name="testType"]:checked').value
    };
}

function collectStepsData() {
    const stepItems = document.querySelectorAll('.step-item');
    return Array.from(stepItems).map(stepItem => {
        const status = stepItem.querySelector('input[name^="stepStatus"]:checked').value;
        return {
            name: stepItem.querySelector('.step-name-input').value.trim(),
            description: stepItem.querySelector('.step-description-input').value.trim(),
            expectedResult: stepItem.querySelector('.step-expected-input').value.trim(),
            status: status,
            bugLink: status === 'failed' ? stepItem.querySelector('.step-bug-link')?.value.trim() || '' : '',
            skipReason: status === 'skipped' ? stepItem.querySelector('.step-skip-reason')?.value.trim() || '' : '',
            attachments: stepItem.querySelector('.step-attachments-input').value.trim()
        };
    }).filter(step => step.name);
}

function createTestCase(formData, steps) {
    const testCase = new TestCase(formData);
    steps.forEach(stepData => testCase.addStep(stepData));
    testCases.push(testCase);
}

function updateTestCase(id, formData, steps) {
    const testCaseIndex = testCases.findIndex(tc => tc.id === id);
    if (testCaseIndex !== -1) {
        const testCase = testCases[testCaseIndex];
        Object.assign(testCase, formData);
        testCase.steps = [];
        testCase.updatedAt = Date.now();
        steps.forEach(stepData => testCase.addStep(stepData));
    }
    currentEditingId = null;
}

function addNewStep() {
    const container = document.getElementById('stepsContainer');
    const stepNumber = container.children.length + 1;
    const stepId = generateUUID();
    
    const stepHtml = createStepHtml(stepNumber, stepId);
    container.insertAdjacentHTML('beforeend', stepHtml);
    
    const stepElement = container.lastElementChild;
    setupStepEventListeners(stepElement, stepId);
}

function createStepHtml(stepNumber, stepId, stepData = null) {
    const nameValue = stepData?.name || '';
    const descriptionValue = stepData?.description || '';
    const expectedValue = stepData?.expectedResult || '';
    const statusValue = stepData?.status || 'passed';
    const bugLinkValue = stepData?.bugLink || '';
    const skipReasonValue = stepData?.skipReason || '';
    const attachmentsValue = stepData?.attachments || '';
    
    return `
        <div class="step-item" data-step-id="${stepId}">
            <div class="step-header">
                <div class="step-number">${stepNumber}</div>
                <button type="button" class="remove-step-btn" title="Удалить шаг">×</button>
            </div>
            <div class="step-content">
                <div class="form-group">
                    <label class="form-label">Название шага *</label>
                    <input type="text" class="form-control step-name-input" value="${nameValue}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Описание шага</label>
                    <textarea class="form-control step-description-input" rows="2">${descriptionValue}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Ожидаемый результат</label>
                    <textarea class="form-control step-expected-input" rows="2">${expectedValue}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Вложения (ссылки через запятую)</label>
                    <input type="text" class="form-control step-attachments-input" value="${attachmentsValue}" placeholder="http://link1, http://link2">
                </div>
            </div>
            <div class="step-status">
                <label class="form-label">Статус шага</label>
                <div class="step-status-options">
                    <div class="status-option">
                        <input type="radio" id="passed_${stepId}" name="stepStatus_${stepId}" value="passed" ${statusValue === 'passed' ? 'checked' : ''}>
                        <label for="passed_${stepId}" class="status-label passed">PASSED</label>
                    </div>
                    <div class="status-option">
                        <input type="radio" id="failed_${stepId}" name="stepStatus_${stepId}" value="failed" ${statusValue === 'failed' ? 'checked' : ''}>
                        <label for="failed_${stepId}" class="status-label failed">FAILED</label>
                    </div>
                    <div class="status-option">
                        <input type="radio" id="skipped_${stepId}" name="stepStatus_${stepId}" value="skipped" ${statusValue === 'skipped' ? 'checked' : ''}>
                        <label for="skipped_${stepId}" class="status-label skipped">SKIPPED</label>
                    </div>
                </div>
                <div class="step-conditional" id="conditional_${stepId}">
                    ${statusValue === 'failed' ? `<div class="form-group"><label class="form-label">Ссылка на баг</label><input type="text" class="form-control step-bug-link" value="${bugLinkValue}" placeholder="http://jira/bug-123"></div>` : ''}
                    ${statusValue === 'skipped' ? `<div class="form-group"><label class="form-label">Причина пропуска</label><textarea class="form-control step-skip-reason" rows="2">${skipReasonValue}</textarea></div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function setupStepEventListeners(stepElement, stepId) {
    const removeBtn = stepElement.querySelector('.remove-step-btn');
    removeBtn.addEventListener('click', () => removeStep(stepId));
    
    const statusRadios = stepElement.querySelectorAll(`input[name="stepStatus_${stepId}"]`);
    statusRadios.forEach(radio => {
        radio.addEventListener('change', () => updateStepConditionalFields(stepId, radio.value));
    });
}

function updateStepConditionalFields(stepId, status) {
    const conditionalContainer = document.getElementById(`conditional_${stepId}`);
    let html = '';
    
    if (status === 'failed') {
        html = '<div class="form-group"><label class="form-label">Ссылка на баг</label><input type="text" class="form-control step-bug-link" placeholder="http://jira/bug-123"></div>';
    } else if (status === 'skipped') {
        html = '<div class="form-group"><label class="form-label">Причина пропуска</label><textarea class="form-control step-skip-reason" rows="2"></textarea></div>';
    }
    
    conditionalContainer.innerHTML = html;
}

function removeStep(stepId) {
    const stepElement = document.querySelector(`[data-step-id="${stepId}"]`);
    if (stepElement) {
        stepElement.remove();
        renumberSteps();
    }
}

function renumberSteps() {
    const stepItems = document.querySelectorAll('.step-item');
    stepItems.forEach((stepItem, index) => {
        const stepNumber = stepItem.querySelector('.step-number');
        stepNumber.textContent = index + 1;
    });
}

function resetForm() {
    document.getElementById('testCaseForm').reset();
    document.getElementById('severity').value = 'NORMAL';
    document.getElementById('priority').value = 'MEDIUM';
    document.getElementById('stepsContainer').innerHTML = '';
    document.getElementById('submitText').textContent = 'Создать тест-кейс';
    document.getElementById('cancelBtn').classList.add('hidden');
    document.getElementById('nameError').textContent = '';
    currentEditingId = null;
}

function cancelEdit() {
    resetForm();
}

function editTestCase(id) {
    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase) return;

    currentEditingId = id;
    
    // Fill basic fields
    document.getElementById('testCaseName').value = testCase.name;
    document.getElementById('testCaseDescription').value = testCase.description;
    document.getElementById('preconditions').value = testCase.preconditions;
    document.getElementById('expectedResult').value = testCase.expectedResult;
    
    // Fill metadata
    document.getElementById('epic').value = testCase.epic;
    document.getElementById('feature').value = testCase.feature;
    document.getElementById('story').value = testCase.story;
    document.getElementById('component').value = testCase.component;
    document.getElementById('testLayer').value = testCase.testLayer;
    document.getElementById('severity').value = testCase.severity;
    document.getElementById('priority').value = testCase.priority;
    document.getElementById('environment').value = testCase.environment;
    document.getElementById('browser').value = testCase.browser;
    
    // Fill members
    document.getElementById('owner').value = testCase.owner;
    document.getElementById('author').value = testCase.author;
    document.getElementById('reviewer').value = testCase.reviewer;
    
    // Fill external links
    document.getElementById('testCaseId').value = testCase.testCaseId;
    document.getElementById('issueLinks').value = testCase.issueLinks;
    document.getElementById('testCaseLinks').value = testCase.testCaseLinks;
    
    // Fill additional fields
    document.getElementById('tags').value = testCase.tags;
    document.querySelector(`input[name="testType"][value="${testCase.testType}"]`).checked = true;

    // Clear and populate steps
    const container = document.getElementById('stepsContainer');
    container.innerHTML = '';
    
    testCase.steps.forEach((step, index) => {
        const stepHtml = createStepHtml(index + 1, step.id, step);
        container.insertAdjacentHTML('beforeend', stepHtml);
        setupStepEventListeners(container.lastElementChild, step.id);
    });

    // Update UI
    document.getElementById('submitText').textContent = 'Обновить тест-кейс';
    document.getElementById('cancelBtn').classList.remove('hidden');
    
    // Switch to create section and scroll
    switchSection('create');
    document.querySelector('.app-header').scrollIntoView({ behavior: 'smooth' });
}

function cloneTestCase(id) {
    currentCloningId = id;
    const testCase = testCases.find(tc => tc.id === id);
    document.getElementById('cloneName').value = `${testCase.name} (Copy)`;
    showCloneModal();
}

function confirmClone() {
    const newName = document.getElementById('cloneName').value.trim();
    if (!newName) {
        showToast('Введите название для клонированного тест-кейса', 'error');
        return;
    }
    
    const originalTestCase = testCases.find(tc => tc.id === currentCloningId);
    if (originalTestCase) {
        const clonedTestCase = originalTestCase.clone(newName);
        testCases.push(clonedTestCase);
        renderTestCasesList();
        updateExportButtons();
        showToast('Тест-кейс успешно клонирован!');
    }
    
    hideCloneModal();
}

function deleteTestCase(id) {
    currentDeletingId = id;
    showModal();
}

function confirmDelete() {
    if (currentDeletingId) {
        testCases = testCases.filter(tc => tc.id !== currentDeletingId);
        currentDeletingId = null;
        hideModal();
        renderTestCasesList();
        updateExportButtons();
        showToast('Тест-кейс удален!');
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const severityFilter = document.getElementById('severityFilter').value;
    
    filteredTestCases = testCases.filter(testCase => {
        const matchesSearch = !searchTerm || 
            testCase.name.toLowerCase().includes(searchTerm) ||
            testCase.description.toLowerCase().includes(searchTerm) ||
            testCase.tags.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || testCase.getStatus() === statusFilter;
        const matchesSeverity = !severityFilter || testCase.severity === severityFilter;
        
        return matchesSearch && matchesStatus && matchesSeverity;
    });
    
    renderTestCasesList();
}

function renderTestCasesList() {
    const container = document.getElementById('testCasesList');
    const casesToRender = filteredTestCases.length > 0 || 
                          document.getElementById('searchInput').value ||
                          document.getElementById('statusFilter').value ||
                          document.getElementById('severityFilter').value ? 
                          filteredTestCases : testCases;
    
    if (casesToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Нет тест-кейсов для отображения</p>
                <p>Попробуйте изменить фильтры или создать новый тест-кейс</p>
            </div>
        `;
        return;
    }

    const testCasesHtml = casesToRender.map(testCase => createTestCaseCardHtml(testCase)).join('');
    container.innerHTML = testCasesHtml;

    // Add event listeners
    casesToRender.forEach(testCase => {
        const card = document.querySelector(`[data-testcase-id="${testCase.id}"]`);
        const header = card.querySelector('.test-case-header');
        const editBtn = card.querySelector('.edit-btn');
        const cloneBtn = card.querySelector('.clone-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        const exportBtn = card.querySelector('.export-btn');

        header.addEventListener('click', () => toggleTestCaseCard(testCase.id));
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); editTestCase(testCase.id); });
        cloneBtn.addEventListener('click', (e) => { e.stopPropagation(); cloneTestCase(testCase.id); });
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteTestCase(testCase.id); });
        exportBtn.addEventListener('click', (e) => { e.stopPropagation(); exportSingleTestCase(testCase.id); });
    });
}

function createTestCaseCardHtml(testCase) {
    const status = testCase.getStatus();
    const statusIndicatorClass = status;
    
    const labels = [];
    if (testCase.epic) labels.push({ name: 'Epic', value: testCase.epic });
    if (testCase.feature) labels.push({ name: 'Feature', value: testCase.feature });
    if (testCase.story) labels.push({ name: 'Story', value: testCase.story });
    if (testCase.component) labels.push({ name: 'Component', value: testCase.component });
    if (testCase.testLayer) labels.push({ name: 'Layer', value: testCase.testLayer });
    if (testCase.severity) labels.push({ name: 'Severity', value: testCase.severity });
    if (testCase.priority) labels.push({ name: 'Priority', value: testCase.priority });
    if (testCase.owner) labels.push({ name: 'Owner', value: testCase.owner });
    if (testCase.environment) labels.push({ name: 'Env', value: testCase.environment });

    const labelsHtml = labels.map(label => 
        `<span class="label">${label.name}: ${label.value}</span>`
    ).join('');

    const stepsHtml = testCase.steps.map((step, index) => {
        let detailsHtml = '';
        if (step.status === 'failed' && step.bugLink) {
            detailsHtml = `<div class="step-display-details failed">Bug: <a href="${step.bugLink}" target="_blank">${step.bugLink}</a></div>`;
        } else if (step.status === 'skipped' && step.skipReason) {
            detailsHtml = `<div class="step-display-details skipped">Причина: ${step.skipReason}</div>`;
        }
        
        return `
            <div class="step-display ${step.status}">
                <div class="step-display-number">${index + 1}</div>
                <div class="step-display-content">
                    <div class="step-display-name">${step.name}</div>
                    ${step.description ? `<div class="step-display-description">${step.description}</div>` : ''}
                    ${detailsHtml}
                </div>
            </div>
        `;
    }).join('');

    const createdDate = new Date(testCase.createdAt).toLocaleString('ru-RU');
    const updatedDate = new Date(testCase.updatedAt).toLocaleString('ru-RU');

    return `
        <div class="test-case-card" data-testcase-id="${testCase.id}">
            <div class="test-case-header">
                <div class="test-case-info">
                    <div class="test-case-title">${testCase.name}</div>
                    <div class="test-case-meta">
                        <span class="meta-item">Шагов: ${testCase.steps.length}</span>
                        <span class="meta-item">Создан: ${createdDate}</span>
                        ${testCase.updatedAt !== testCase.createdAt ? `<span class="meta-item">Обновлен: ${updatedDate}</span>` : ''}
                    </div>
                </div>
                <div class="test-case-status">
                    <div class="status-indicator ${statusIndicatorClass}"></div>
                    <span>${status.toUpperCase()}</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="test-case-content">
                <div class="test-case-body">
                    ${testCase.description ? `<div class="test-case-description">"${testCase.description}"</div>` : ''}
                    
                    ${labels.length > 0 ? `
                        <div class="test-case-labels">
                            ${labelsHtml}
                        </div>
                    ` : ''}

                    ${testCase.steps.length > 0 ? `
                        <div class="test-case-steps">
                            <h4>Шаги тест-кейса</h4>
                            <div class="steps-list">
                                ${stepsHtml}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="test-case-actions">
                    <button class="btn btn--secondary edit-btn">Редактировать</button>
                    <button class="btn btn--outline clone-btn">Клонировать</button>
                    <button class="btn btn--outline export-btn">Export JSON</button>
                    <button class="btn btn--outline delete-btn">Удалить</button>
                </div>
            </div>
        </div>
    `;
}

function toggleTestCaseCard(id) {
    const card = document.querySelector(`[data-testcase-id="${id}"]`);
    const header = card.querySelector('.test-case-header');
    const content = card.querySelector('.test-case-content');
    
    header.classList.toggle('expanded');
    content.classList.toggle('expanded');
}

function updateExportButtons() {
    const hasTestCases = testCases.length > 0;
    document.getElementById('exportAllBtn').disabled = !hasTestCases;
    document.getElementById('generateAllureBtn').disabled = !hasTestCases;
    document.getElementById('createBackupBtn').disabled = !hasTestCases;
}

// Export functionality
async function exportAllTestCases() {
    if (testCases.length === 0) return;
    
    try {
        showProgress();
        const zip = new JSZip();
        const testCasesFolder = zip.folder('test-cases');
        
        testCases.forEach((testCase, index) => {
            const fileName = `testcase-${testCase.id}.json`;
            testCasesFolder.file(fileName, JSON.stringify(testCase, null, 2));
            updateProgress((index + 1) / testCases.length * 100);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `test-cases-${Date.now()}.zip`);
        showToast(`Экспортировано ${testCases.length} тест-кейсов!`);
    } catch (error) {
        console.error('Export error:', error);
        showToast('Ошибка при экспорте', 'error');
    } finally {
        hideProgress();
    }
}

async function exportSingleTestCase(id) {
    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase) return;
    
    const fileName = `testcase-${testCase.name.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(testCase, null, 2)], { type: 'application/json' });
    downloadBlob(blob, fileName);
    showToast('Тест-кейс экспортирован!');
}

async function generateAllureJson() {
    if (testCases.length === 0) return;
    
    try {
        showProgress();
        const zip = new JSZip();
        
        testCases.forEach((testCase, index) => {
            const allureJson = createAllureJson(testCase);
            const fileName = `${allureJson.uuid}-result.json`;
            zip.file(fileName, JSON.stringify(allureJson, null, 2));
            updateProgress((index + 1) / testCases.length * 100);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `allure-results-${Date.now()}.zip`);
        showToast(`Сгенерировано ${testCases.length} Allure JSON файлов!`);
    } catch (error) {
        console.error('Allure generation error:', error);
        showToast('Ошибка при генерации Allure JSON', 'error');
    } finally {
        hideProgress();
    }
}

function createAllureJson(testCase) {
    const now = Date.now();
    const uuid = generateUUID();
    const historyId = generateUUID();
    const testCaseId = testCase.testCaseId || generateUUID();

    const steps = testCase.steps.map(step => {
        const stepResult = {
            name: step.name,
            status: step.status,
            start: now,
            stop: now + Math.random() * 1000
        };
        
        if (step.status === 'failed' && step.bugLink) {
            stepResult.statusDetails = { message: `Bug link: ${step.bugLink}` };
        } else if (step.status === 'skipped' && step.skipReason) {
            stepResult.statusDetails = { trace: `Skip reason: ${step.skipReason}` };
        }
        
        if (step.attachments) {
            stepResult.attachments = step.attachments.split(',').map(link => ({
                name: link.trim().split('/').pop(),
                source: link.trim()
            }));
        }
        
        return stepResult;
    });

    const labels = [];
    if (testCase.epic) labels.push({ name: 'epic', value: testCase.epic });
    if (testCase.feature) labels.push({ name: 'feature', value: testCase.feature });
    if (testCase.story) labels.push({ name: 'story', value: testCase.story });
    if (testCase.severity) labels.push({ name: 'severity', value: testCase.severity.toLowerCase() });
    if (testCase.priority) labels.push({ name: 'priority', value: testCase.priority.toLowerCase() });
    if (testCase.owner) labels.push({ name: 'owner', value: testCase.owner });
    if (testCase.author) labels.push({ name: 'author', value: testCase.author });
    if (testCase.testLayer) labels.push({ name: 'layer', value: testCase.testLayer });
    if (testCase.component) labels.push({ name: 'component', value: testCase.component });
    if (testCase.environment) labels.push({ name: 'environment', value: testCase.environment });
    
    if (testCase.tags) {
        testCase.tags.split(',').forEach(tag => {
            labels.push({ name: 'tag', value: tag.trim() });
        });
    }

    const links = [];
    if (testCase.issueLinks) {
        testCase.issueLinks.split(',').forEach(link => {
            links.push({ name: 'Issue', url: link.trim(), type: 'issue' });
        });
    }
    if (testCase.testCaseLinks) {
        testCase.testCaseLinks.split(',').forEach(link => {
            links.push({ name: 'Test Case', url: link.trim(), type: 'tms' });
        });
    }

    return {
        uuid: uuid,
        historyId: historyId,
        testCaseId: testCaseId,
        fullName: `TestClass.${testCase.name.replace(/\s+/g, '')}`,
        name: testCase.name,
        description: testCase.description,
        status: testCase.getStatus(),
        start: now,
        stop: now + Math.random() * 5000,
        steps: steps,
        labels: labels,
        links: links,
        parameters: []
    };
}

async function createBackup() {
    const backup = {
        timestamp: Date.now(),
        version: '1.0',
        testCases: testCases
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `backup-${Date.now()}.json`);
    showToast('Backup создан!');
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    const importBtn = document.getElementById('importBtn');
    
    if (file) {
        importBtn.disabled = false;
        showToast(`Выбран файл: ${file.name}`);
    } else {
        importBtn.disabled = true;
    }
}

async function importTestCases() {
    const fileInput = document.getElementById('importFileInput');
    const file = fileInput.files[0];
    const overwrite = document.getElementById('overwriteExisting').checked;
    
    if (!file) return;
    
    try {
        showProgress();
        
        if (file.name.endsWith('.zip')) {
            await importFromZip(file, overwrite);
        } else {
            await importFromJson(file, overwrite);
        }
        
        renderTestCasesList();
        updateExportButtons();
        fileInput.value = '';
        document.getElementById('importBtn').disabled = true;
    } catch (error) {
        console.error('Import error:', error);
        showToast('Ошибка при импорте', 'error');
    } finally {
        hideProgress();
    }
}

async function importFromZip(file, overwrite) {
    const zip = await JSZip.loadAsync(file);
    let importedCount = 0;
    
    const files = Object.keys(zip.files);
    for (let i = 0; i < files.length; i++) {
        const fileName = files[i];
        if (fileName.endsWith('.json')) {
            const content = await zip.files[fileName].async('text');
            try {
                const data = JSON.parse(content);
                if (await importTestCaseData(data, overwrite)) {
                    importedCount++;
                }
            } catch (e) {
                console.warn(`Не удалось импортировать ${fileName}:`, e);
            }
        }
        updateProgress((i + 1) / files.length * 100);
    }
    
    showToast(`Импортировано ${importedCount} тест-кейсов из ZIP архива!`);
}

async function importFromJson(file, overwrite) {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (data.testCases && Array.isArray(data.testCases)) {
        // Backup file
        let importedCount = 0;
        for (const tcData of data.testCases) {
            if (await importTestCaseData(tcData, overwrite)) {
                importedCount++;
            }
        }
        showToast(`Импортировано ${importedCount} тест-кейсов из backup!`);
    } else {
        // Single test case
        if (await importTestCaseData(data, overwrite)) {
            showToast('Тест-кейс импортирован!');
        }
    }
}

async function importTestCaseData(data, overwrite) {
    // Validate data structure
    if (!data.name) {
        console.warn('Пропущен тест-кейс без названия');
        return false;
    }
    
    const existingIndex = testCases.findIndex(tc => tc.name === data.name);
    
    if (existingIndex !== -1) {
        if (overwrite) {
            testCases[existingIndex] = new TestCase(data);
            return true;
        } else {
            console.warn(`Тест-кейс "${data.name}" уже существует`);
            return false;
        }
    } else {
        testCases.push(new TestCase(data));
        return true;
    }
}

// Utility functions
function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
}

function showProgress() {
    const progressBar = document.getElementById('progressBar');
    progressBar.classList.add('visible');
    updateProgress(0);
}

function updateProgress(percent) {
    const fill = document.querySelector('.progress-fill');
    fill.style.width = `${percent}%`;
}

function hideProgress() {
    const progressBar = document.getElementById('progressBar');
    progressBar.classList.remove('visible');
}

function showModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('visible'), 10);
}

function hideModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 250);
}

function showCloneModal() {
    const modal = document.getElementById('cloneModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('visible'), 10);
}

function hideCloneModal() {
    const modal = document.getElementById('cloneModal');
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 250);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const messageElement = document.getElementById('toastMessage');
    
    messageElement.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('visible');
    
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}