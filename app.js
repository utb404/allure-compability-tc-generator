// Хранение данных в памяти (не используем localStorage согласно инструкциям)
let testCases = [];
let currentEditingId = null;
let generatedZipBlob = null;

// Генерация UUID
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback для старых браузеров
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Класс для управления тест-кейсами
class TestCase {
    constructor(data) {
        this.id = data.id || generateUUID();
        this.name = data.name;
        this.description = data.description || '';
        this.epic = data.epic || '';
        this.feature = data.feature || '';
        this.story = data.story || '';
        this.severity = data.severity || 'normal';
        this.owner = data.owner || '';
        this.steps = data.steps || [];
        this.createdAt = data.createdAt || Date.now();
    }

    getStatus() {
        if (!this.steps.length) return 'passed';
        const hasFailedSteps = this.steps.some(step => step.status === 'failed');
        return hasFailedSteps ? 'failed' : 'passed';
    }

    addStep(stepData) {
        const step = {
            id: generateUUID(),
            name: stepData.name,
            description: stepData.description || '',
            status: stepData.status || 'passed'
        };
        this.steps.push(step);
        return step;
    }

    removeStep(stepId) {
        this.steps = this.steps.filter(step => step.id !== stepId);
    }

    updateStep(stepId, stepData) {
        const stepIndex = this.steps.findIndex(step => step.id === stepId);
        if (stepIndex !== -1) {
            this.steps[stepIndex] = { ...this.steps[stepIndex], ...stepData };
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    renderTestCasesList();
    updateGenerateButton();
});

function initializeEventListeners() {
    // Форма создания тест-кейса
    const form = document.getElementById('testCaseForm');
    form.addEventListener('submit', handleTestCaseSubmit);

    // Кнопки
    document.getElementById('addStepBtn').addEventListener('click', addNewStep);
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
    document.getElementById('generateBtn').addEventListener('click', generateAllureJson);
    document.getElementById('downloadBtn').addEventListener('click', downloadZip);

    // Модальное окно
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
    document.getElementById('cancelDelete').addEventListener('click', hideModal);

    // Закрытие модального окна по клику вне его
    document.getElementById('confirmModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideModal();
        }
    });
}

function handleTestCaseSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    const formData = getFormData();
    const steps = collectStepsData();

    if (currentEditingId) {
        updateTestCase(currentEditingId, formData, steps);
    } else {
        createTestCase(formData, steps);
    }

    resetForm();
    renderTestCasesList();
    updateGenerateButton();
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
        epic: document.getElementById('epic').value.trim(),
        feature: document.getElementById('feature').value.trim(),
        story: document.getElementById('story').value.trim(),
        severity: document.getElementById('severity').value,
        owner: document.getElementById('owner').value.trim()
    };
}

function collectStepsData() {
    const stepItems = document.querySelectorAll('.step-item');
    return Array.from(stepItems).map(stepItem => ({
        name: stepItem.querySelector('.step-name-input').value.trim(),
        description: stepItem.querySelector('.step-description-input').value.trim(),
        status: stepItem.querySelector('input[name^="stepStatus"]:checked').value
    })).filter(step => step.name); // Удаляем пустые шаги
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
        steps.forEach(stepData => testCase.addStep(stepData));
    }
    currentEditingId = null;
}

function resetForm() {
    document.getElementById('testCaseForm').reset();
    document.getElementById('severity').value = 'normal';
    document.getElementById('stepsContainer').innerHTML = '';
    document.getElementById('submitText').textContent = 'Создать тест-кейс';
    document.getElementById('cancelBtn').classList.add('hidden');
    document.getElementById('nameError').textContent = '';
    currentEditingId = null;
}

function addNewStep() {
    const container = document.getElementById('stepsContainer');
    const stepNumber = container.children.length + 1;
    const stepId = generateUUID();
    
    const stepHtml = createStepHtml(stepNumber, stepId);
    container.insertAdjacentHTML('beforeend', stepHtml);
    
    // Добавляем обработчик для кнопки удаления
    const removeBtn = container.lastElementChild.querySelector('.remove-step-btn');
    removeBtn.addEventListener('click', () => removeStep(stepId));
}

function createStepHtml(stepNumber, stepId, stepData = null) {
    const nameValue = stepData ? stepData.name : '';
    const descriptionValue = stepData ? stepData.description : '';
    const statusValue = stepData ? stepData.status : 'passed';
    
    return `
        <div class="step-item" data-step-id="${stepId}">
            <div class="step-header">
                <div class="step-number">${stepNumber}</div>
                <div class="step-actions">
                    <button type="button" class="remove-step-btn" title="Удалить шаг">×</button>
                </div>
            </div>
            <div class="step-content">
                <div class="form-group">
                    <label class="form-label">Название шага</label>
                    <input type="text" class="form-control step-name-input" value="${nameValue}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Описание шага</label>
                    <textarea class="form-control step-description-input" rows="2">${descriptionValue}</textarea>
                </div>
            </div>
            <div class="step-status">
                <label class="form-label">Статус шага</label>
                <div class="status-options">
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
            </div>
        </div>
    `;
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

function cancelEdit() {
    resetForm();
}

function editTestCase(id) {
    const testCase = testCases.find(tc => tc.id === id);
    if (!testCase) return;

    currentEditingId = id;
    
    // Заполняем форму
    document.getElementById('testCaseName').value = testCase.name;
    document.getElementById('testCaseDescription').value = testCase.description;
    document.getElementById('epic').value = testCase.epic;
    document.getElementById('feature').value = testCase.feature;
    document.getElementById('story').value = testCase.story;
    document.getElementById('severity').value = testCase.severity;
    document.getElementById('owner').value = testCase.owner;

    // Очищаем контейнер шагов и добавляем существующие
    const container = document.getElementById('stepsContainer');
    container.innerHTML = '';
    
    testCase.steps.forEach((step, index) => {
        const stepHtml = createStepHtml(index + 1, step.id, step);
        container.insertAdjacentHTML('beforeend', stepHtml);
        
        // Добавляем обработчик для кнопки удаления
        const removeBtn = container.lastElementChild.querySelector('.remove-step-btn');
        removeBtn.addEventListener('click', () => removeStep(step.id));
    });

    // Обновляем UI
    document.getElementById('submitText').textContent = 'Обновить тест-кейс';
    document.getElementById('cancelBtn').classList.remove('hidden');
    
    // Прокручиваем к форме
    document.querySelector('.create-section').scrollIntoView({ behavior: 'smooth' });
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
        updateGenerateButton();
        showToast('Тест-кейс удален!');
    }
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

function renderTestCasesList() {
    const container = document.getElementById('testCasesList');
    
    if (testCases.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Пока нет созданных тест-кейсов</p>
                <p>Создайте первый тест-кейс, используя форму выше</p>
            </div>
        `;
        return;
    }

    const testCasesHtml = testCases.map(testCase => createTestCaseCardHtml(testCase)).join('');
    container.innerHTML = testCasesHtml;

    // Добавляем обработчики событий
    testCases.forEach(testCase => {
        const card = document.querySelector(`[data-testcase-id="${testCase.id}"]`);
        const header = card.querySelector('.test-case-header');
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');

        header.addEventListener('click', () => toggleTestCaseCard(testCase.id));
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editTestCase(testCase.id);
        });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTestCase(testCase.id);
        });
    });
}

function createTestCaseCardHtml(testCase) {
    const status = testCase.getStatus();
    const statusIndicatorClass = status === 'passed' ? 'passed' : status === 'failed' ? 'failed' : 'mixed';
    
    const labels = [];
    if (testCase.epic) labels.push({ name: 'Epic', value: testCase.epic });
    if (testCase.feature) labels.push({ name: 'Feature', value: testCase.feature });
    if (testCase.story) labels.push({ name: 'Story', value: testCase.story });
    if (testCase.severity) labels.push({ name: 'Критичность', value: testCase.severity.toUpperCase() });
    if (testCase.owner) labels.push({ name: 'Владелец', value: testCase.owner });

    const labelsHtml = labels.map(label => 
        `<span class="label">${label.name}: ${label.value}</span>`
    ).join('');

    const stepsHtml = testCase.steps.map((step, index) => `
        <div class="step-display ${step.status}">
            <div class="step-display-number">${index + 1}</div>
            <div class="step-display-content">
                <div class="step-display-name">${step.name}</div>
                ${step.description ? `<div class="step-display-description">${step.description}</div>` : ''}
            </div>
        </div>
    `).join('');

    const createdDate = new Date(testCase.createdAt).toLocaleString('ru-RU');

    return `
        <div class="test-case-card" data-testcase-id="${testCase.id}">
            <div class="test-case-header">
                <div class="test-case-info">
                    <div class="test-case-title">${testCase.name}</div>
                    <div class="test-case-meta">
                        <span class="meta-item">Шагов: ${testCase.steps.length}</span>
                        <span class="meta-item">Создан: ${createdDate}</span>
                    </div>
                </div>
                <div class="test-case-status">
                    <div class="status-indicator ${statusIndicatorClass}"></div>
                    <span>${status === 'passed' ? 'PASSED' : 'FAILED'}</span>
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

function updateGenerateButton() {
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = testCases.length === 0;
}

async function generateAllureJson() {
    if (testCases.length === 0) {
        showToast('Нет тест-кейсов для генерации', 'error');
        return;
    }

    try {
        const zip = new JSZip();
        
        testCases.forEach(testCase => {
            const allureJson = createAllureJson(testCase);
            const fileName = `${allureJson.uuid}-result.json`;
            zip.file(fileName, JSON.stringify(allureJson, null, 2));
        });

        generatedZipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Показываем кнопку скачивания
        document.getElementById('downloadBtn').classList.remove('hidden');
        showToast(`Сгенерировано ${testCases.length} JSON файлов!`);
    } catch (error) {
        console.error('Ошибка при генерации JSON:', error);
        showToast('Ошибка при генерации файлов', 'error');
    }
}

function createAllureJson(testCase) {
    const now = Date.now();
    const uuid = generateUUID();
    const historyId = generateUUID();
    const testCaseId = generateUUID();

    const steps = testCase.steps.map(step => ({
        name: step.name,
        status: step.status,
        start: now,
        stop: now + Math.random() * 1000 // Случайная длительность шага
    }));

    const labels = [];
    if (testCase.epic) labels.push({ name: 'epic', value: testCase.epic });
    if (testCase.feature) labels.push({ name: 'feature', value: testCase.feature });
    if (testCase.story) labels.push({ name: 'story', value: testCase.story });
    if (testCase.severity) labels.push({ name: 'severity', value: testCase.severity });
    if (testCase.owner) labels.push({ name: 'owner', value: testCase.owner });

    return {
        uuid: uuid,
        historyId: historyId,
        testCaseId: testCaseId,
        fullName: `TestClass.${testCase.name.replace(/\s+/g, '')}`,
        name: testCase.name,
        status: testCase.getStatus(),
        start: now,
        stop: now + Math.random() * 5000, // Случайная длительность теста
        steps: steps,
        labels: labels
    };
}

function downloadZip() {
    if (!generatedZipBlob) {
        showToast('Сначала сгенерируйте JSON файлы', 'error');
        return;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(generatedZipBlob);
    link.download = `allure-results-${Date.now()}.zip`;
    link.click();
    
    // Очищаем URL для экономии памяти
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    
    showToast('ZIP архив скачан!');
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

// Глобальные переменные для модального окна
let currentDeletingId = null;