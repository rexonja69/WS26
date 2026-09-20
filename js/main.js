// Default data
const defaultParticipants = [
    'Person 1', 'Person 2', 'Person 3', 'Person 4',
    'Person 5', 'Person 6', 'Person 7', 'Person 8',
    'Person 9', 'Person 10', 'Person 11', 'Person 12',
    'Person 13', 'Person 14', 'Person 15', 'Person 16'
];

const defaultEpochs = ['1', '2', '3', '4', '5', '6', '7', '8'];

const defaultTasks = [
    'Create a minimalist poster',
    'Design a typographic composition',
    'Illustrate a scene',
    'Design a logo',
    'Create a color palette',
    'Design packaging',
    'Create an icon set',
    'Design a book cover'
];

// State
let participants = [];
let originalParticipants = []; // Keep original for selection order
let epochs = [];
let tasks = [];
let teamSpinIndex = 0;
let currentTeamNumber = 1;
let currentTeamMember = 1;
let results = [];
let usedParticipantIndices = new Set(); // Track which original indices have been used

// Deterministic random-looking selection order for 16 participants
// This order will always be the same but appears random
const selectionOrder = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15];

// Colors for wheel segments
const colors = [
    '#00f0ff', '#00d0ff', '#00b0ff', '#00a0ff',
    '#0090ff', '#0080ff', '#0070ff', '#0060ff',
    '#0050ff', '#0040ff', '#0030ff', '#0020ff',
    '#0010ff', '#0000ff', '#0000e0', '#0000c0'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    initializeWheels();
    setupEventListeners();
    loadConfigInputs();
    renderResults();
});

function loadFromStorage() {
    const savedParticipants = localStorage.getItem('participants');
    const savedEpochs = localStorage.getItem('epochs');
    const savedTasks = localStorage.getItem('tasks');
    const savedResults = localStorage.getItem('results');
    const savedTeamIndex = localStorage.getItem('teamSpinIndex');
    const savedTeamNumber = localStorage.getItem('currentTeamNumber');
    const savedTeamMember = localStorage.getItem('currentTeamMember');
    const savedUsedIndices = localStorage.getItem('usedParticipantIndices');

    participants = savedParticipants ? JSON.parse(savedParticipants) : [...defaultParticipants];
    originalParticipants = [...participants]; // Keep a copy
    epochs = savedEpochs ? JSON.parse(savedEpochs) : [...defaultEpochs];
    tasks = savedTasks ? JSON.parse(savedTasks) : [...defaultTasks];
    results = savedResults ? JSON.parse(savedResults) : [];
    teamSpinIndex = savedTeamIndex ? parseInt(savedTeamIndex) : 0;
    currentTeamNumber = savedTeamNumber ? parseInt(savedTeamNumber) : 1;
    currentTeamMember = savedTeamMember ? parseInt(savedTeamMember) : 1;
    usedParticipantIndices = savedUsedIndices ? new Set(JSON.parse(savedUsedIndices)) : new Set();
    
    // Rebuild participants array based on used indices
    if (usedParticipantIndices.size > 0) {
        participants = originalParticipants.filter((_, index) => !usedParticipantIndices.has(index));
    }
}

function saveToStorage() {
    localStorage.setItem('participants', JSON.stringify(originalParticipants)); // Save original
    localStorage.setItem('epochs', JSON.stringify(epochs));
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('results', JSON.stringify(results));
    localStorage.setItem('teamSpinIndex', teamSpinIndex);
    localStorage.setItem('currentTeamNumber', currentTeamNumber);
    localStorage.setItem('currentTeamMember', currentTeamMember);
    localStorage.setItem('usedParticipantIndices', JSON.stringify([...usedParticipantIndices]));
}

function initializeWheels() {
    drawWheel('teamWheel', participants, colors);
    drawWheel('epochWheel', epochs, colors.slice(0, epochs.length));
    drawWheel('taskWheel', tasks, colors.slice(0, tasks.length));
}

function drawWheel(canvasId, segments, wheelColors) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Calculate font size based on canvas size
    const fontSize = Math.max(12, Math.floor(canvas.width / 35));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (segments.length === 0) {
        ctx.fillStyle = '#00f0ff';
        ctx.font = `${fontSize * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('No data', centerX, centerY);
        return;
    }

    const segmentAngle = (2 * Math.PI) / segments.length;

    segments.forEach((segment, index) => {
        const startAngle = index * segmentAngle - Math.PI / 2;
        const endAngle = startAngle + segmentAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = wheelColors[index % wheelColors.length];
        ctx.fill();
        ctx.strokeStyle = '#0a0a1a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#0a0a1a';
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText(segment.substring(0, 15), radius - 20, 5);
        ctx.restore();
    });

    // Draw pointer (base on wheel edge, pointing inward)
    ctx.save();
    ctx.translate(centerX + radius, centerY);
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-30, 0);
    ctx.lineTo(0, 15);
    ctx.closePath();
    ctx.fillStyle = '#ff4444';
    ctx.fill();
    ctx.restore();
}

function spinWheel(canvasId, segments, wheelColors, isRigged = false, forcedTargetIndex = null) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Calculate font size based on canvas size
    const fontSize = Math.max(12, Math.floor(canvas.width / 35));

    let currentRotation = 0;
    const spinDuration = 3000;
    const startTime = Date.now();

    let targetIndex;
    if (forcedTargetIndex !== null) {
        targetIndex = forcedTargetIndex;
    } else if (isRigged) {
        // Use the predetermined selection order
        targetIndex = selectionOrder[teamSpinIndex % selectionOrder.length];
    } else {
        targetIndex = Math.floor(Math.random() * segments.length);
    }

    const segmentAngle = (2 * Math.PI) / segments.length;
    const targetRotation = (2 * Math.PI) - (targetIndex * segmentAngle) - (segmentAngle / 2) + Math.PI / 2;
    const totalRotation = targetRotation + (5 * 2 * Math.PI); // Add 5 full rotations

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        currentRotation = totalRotation * easeOut;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        segments.forEach((segment, index) => {
            const startAngle = index * segmentAngle + currentRotation - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();

            ctx.fillStyle = wheelColors[index % wheelColors.length];
            ctx.fill();
            ctx.strokeStyle = '#0a0a1a';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#0a0a1a';
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillText(segment.substring(0, 15), radius - 20, 5);
            ctx.restore();
        });

        // Draw pointer (base on wheel edge, pointing inward)
        ctx.save();
        ctx.translate(centerX + radius, centerY);
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-30, 0);
        ctx.lineTo(0, 15);
        ctx.closePath();
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.restore();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            return targetIndex;
        }
    }

    return new Promise((resolve) => {
        function animateWithResolve() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / spinDuration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            currentRotation = totalRotation * easeOut;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            segments.forEach((segment, index) => {
                const startAngle = index * segmentAngle + currentRotation - Math.PI / 2;
                const endAngle = startAngle + segmentAngle;

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();

                ctx.fillStyle = wheelColors[index % wheelColors.length];
                ctx.fill();
                ctx.strokeStyle = '#0a0a1a';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(startAngle + segmentAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#0a0a1a';
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.fillText(segment.substring(0, 15), radius - 20, 5);
                ctx.restore();
            });

            // Draw pointer (base on wheel edge, pointing inward)
            ctx.save();
            ctx.translate(centerX + radius, centerY);
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(-30, 0);
            ctx.lineTo(0, 15);
            ctx.closePath();
            ctx.fillStyle = '#ff4444';
            ctx.fill();
            ctx.restore();

            if (progress < 1) {
                requestAnimationFrame(animateWithResolve);
            } else {
                resolve(targetIndex);
            }
        }
        animateWithResolve();
    });
}

function setupEventListeners() {
    document.getElementById('spinTeamBtn').addEventListener('click', handleTeamSpin);
    document.getElementById('spinEpochBtn').addEventListener('click', handleEpochSpin);
    document.getElementById('spinTaskBtn').addEventListener('click', handleTaskSpin);
    document.getElementById('saveParticipantsBtn').addEventListener('click', saveParticipants);
    document.getElementById('saveEpochsBtn').addEventListener('click', saveEpochs);
    document.getElementById('saveTasksBtn').addEventListener('click', saveTasks);
    document.getElementById('clearResultsBtn').addEventListener('click', clearResults);
    document.getElementById('exportResultsBtn').addEventListener('click', exportResults);
    document.getElementById('openConfigBtn').addEventListener('click', () => {
        document.getElementById('configSection').style.display = 'block';
    });
    document.getElementById('closeConfigBtn').addEventListener('click', () => {
        document.getElementById('configSection').style.display = 'none';
    });
    
    // Fullscreen buttons
    document.querySelectorAll('.fullscreen-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wheelId = e.target.dataset.wheel;
            const wheelContainer = document.getElementById(wheelId).closest('.wheel-container');
            const canvas = document.getElementById(wheelId);
            const isFullscreen = wheelContainer.classList.toggle('fullscreen');
            e.target.textContent = isFullscreen ? '✕' : '⛶';
            
            // Adjust canvas resolution for fullscreen
            if (isFullscreen) {
                canvas.setAttribute('data-original-width', canvas.width);
                canvas.setAttribute('data-original-height', canvas.height);
                canvas.width = 1200;
                canvas.height = 1200;
            } else {
                const origWidth = canvas.getAttribute('data-original-width');
                const origHeight = canvas.getAttribute('data-original-height');
                canvas.width = origWidth ? parseInt(origWidth) : 400;
                canvas.height = origHeight ? parseInt(origHeight) : 400;
            }
            
            // Redraw wheel with new resolution
            if (wheelId === 'teamWheel') {
                drawWheel('teamWheel', participants, colors);
            } else if (wheelId === 'epochWheel') {
                drawWheel('epochWheel', epochs, colors.slice(0, epochs.length));
            } else if (wheelId === 'taskWheel') {
                drawWheel('taskWheel', tasks, colors.slice(0, tasks.length));
            }
        });
    });
    
    // Escape key to exit fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.wheel-container.fullscreen').forEach(container => {
                container.classList.remove('fullscreen');
                const btn = container.querySelector('.fullscreen-btn');
                if (btn) btn.textContent = '⛶';
                
                // Restore canvas resolution
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    const origWidth = canvas.getAttribute('data-original-width');
                    const origHeight = canvas.getAttribute('data-original-height');
                    canvas.width = origWidth ? parseInt(origWidth) : 400;
                    canvas.height = origHeight ? parseInt(origHeight) : 400;
                    
                    // Redraw wheel
                    const wheelId = canvas.id;
                    if (wheelId === 'teamWheel') {
                        drawWheel('teamWheel', participants, colors);
                    } else if (wheelId === 'epochWheel') {
                        drawWheel('epochWheel', epochs, colors.slice(0, epochs.length));
                    } else if (wheelId === 'taskWheel') {
                        drawWheel('taskWheel', tasks, colors.slice(0, tasks.length));
                    }
                }
            });
        }
    });
}

async function handleTeamSpin() {
    if (participants.length === 0) {
        alert('Please add participants first!');
        return;
    }

    const btn = document.getElementById('spinTeamBtn');
    btn.disabled = true;

    // Get the next index from selection order that hasn't been used
    let targetIndex;
    for (let i = 0; i < selectionOrder.length; i++) {
        const originalIndex = selectionOrder[i];
        if (!usedParticipantIndices.has(originalIndex)) {
            targetIndex = originalIndex;
            break;
        }
    }
    
    if (targetIndex === undefined) {
        alert('All participants have been selected!');
        btn.disabled = false;
        return;
    }

    // Find the current index in the participants array (which may have deletions)
    const currentArrayIndex = participants.indexOf(originalParticipants[targetIndex]);
    
    const selectedIndex = await spinWheel('teamWheel', participants, colors, true, currentArrayIndex);
    const selectedPerson = participants[selectedIndex];

    document.getElementById('teamResult').textContent = `Selected: ${selectedPerson}`;

    // Mark this original index as used
    usedParticipantIndices.add(targetIndex);

    // Handle team assignment
    if (currentTeamMember === 1) {
        // First member of team
        results.push({
            teamNumber: currentTeamNumber,
            member1: selectedPerson,
            member2: '',
            epoch: '',
            task: ''
        });
        currentTeamMember = 2;
    } else {
        // Second member of team
        const teamIndex = results.findIndex(r => r.teamNumber === currentTeamNumber && r.member2 === '');
        if (teamIndex !== -1) {
            results[teamIndex].member2 = selectedPerson;
        }
        currentTeamMember = 1;
        currentTeamNumber++;
    }

    teamSpinIndex++;
    
    // Remove selected person from wheel
    participants.splice(currentArrayIndex, 1);
    
    saveToStorage();
    drawWheel('teamWheel', participants, colors);
    renderResults();
    btn.disabled = false;
}

async function handleEpochSpin() {
    if (epochs.length === 0) {
        alert('Please add epochs first!');
        return;
    }

    const btn = document.getElementById('spinEpochBtn');
    btn.disabled = true;

    const selectedIndex = await spinWheel('epochWheel', epochs, colors.slice(0, epochs.length));
    const selectedEpoch = epochs[selectedIndex];

    document.getElementById('epochResult').textContent = `Selected: Epoch ${selectedEpoch}`;

    // Assign to the most recent incomplete team
    const teamIndex = results.findIndex(r => r.epoch === '' && r.member1 && r.member2);
    if (teamIndex !== -1) {
        results[teamIndex].epoch = selectedEpoch;
        
        // Remove selected epoch from wheel
        epochs.splice(selectedIndex, 1);
        
        saveToStorage();
        drawWheel('epochWheel', epochs, colors.slice(0, epochs.length));
        renderResults();
    }

    btn.disabled = false;
}

async function handleTaskSpin() {
    if (tasks.length === 0) {
        alert('Please add tasks first!');
        return;
    }

    const btn = document.getElementById('spinTaskBtn');
    btn.disabled = true;

    const selectedIndex = await spinWheel('taskWheel', tasks, colors.slice(0, tasks.length));
    const selectedTask = tasks[selectedIndex];

    document.getElementById('taskResult').textContent = `Selected: ${selectedTask}`;

    // Assign to the most recent incomplete team
    const teamIndex = results.findIndex(r => r.task === '' && r.epoch);
    if (teamIndex !== -1) {
        results[teamIndex].task = selectedTask;
        
        // Remove selected task from wheel
        tasks.splice(selectedIndex, 1);
        
        saveToStorage();
        drawWheel('taskWheel', tasks, colors.slice(0, tasks.length));
        renderResults();
    }

    btn.disabled = false;
}

function loadConfigInputs() {
    document.getElementById('participantsInput').value = participants.join('\n');
    document.getElementById('epochsInput').value = epochs.join('\n');
    document.getElementById('tasksInput').value = tasks.join('\n');
}

function saveParticipants() {
    const input = document.getElementById('participantsInput').value;
    const names = input.split('\n').map(n => n.trim()).filter(n => n);
    
    if (names.length !== 16) {
        alert('Please enter exactly 16 participant names!');
        return;
    }

    participants = names;
    originalParticipants = [...names];
    teamSpinIndex = 0;
    currentTeamNumber = 1;
    currentTeamMember = 1;
    results = [];
    usedParticipantIndices = new Set();
    
    saveToStorage();
    drawWheel('teamWheel', participants, colors);
    renderResults();
    alert('Participants saved successfully!');
}

function saveEpochs() {
    const input = document.getElementById('epochsInput').value;
    const epochList = input.split('\n').map(e => e.trim()).filter(e => e);
    
    if (epochList.length === 0) {
        alert('Please enter at least one epoch!');
        return;
    }

    epochs = epochList;
    saveToStorage();
    drawWheel('epochWheel', epochs, colors.slice(0, epochs.length));
    alert('Epochs saved successfully!');
}

function saveTasks() {
    const input = document.getElementById('tasksInput').value;
    const taskList = input.split('\n').map(t => t.trim()).filter(t => t);
    
    if (taskList.length === 0) {
        alert('Please enter at least one task!');
        return;
    }

    tasks = taskList;
    saveToStorage();
    drawWheel('taskWheel', tasks, colors.slice(0, tasks.length));
    alert('Tasks saved successfully!');
}

function renderResults() {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    results.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Team ${result.teamNumber}</td>
            <td>${result.member1}</td>
            <td>${result.member2}</td>
            <td>${result.epoch || '-'}</td>
            <td>${result.task || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

function clearResults() {
    if (confirm('Are you sure you want to clear all results? This cannot be undone.')) {
        results = [];
        teamSpinIndex = 0;
        currentTeamNumber = 1;
        currentTeamMember = 1;
        usedParticipantIndices = new Set();
        
        // Reload original data from localStorage
        const savedParticipants = localStorage.getItem('participants');
        const savedEpochs = localStorage.getItem('epochs');
        const savedTasks = localStorage.getItem('tasks');
        
        participants = savedParticipants ? JSON.parse(savedParticipants) : [...defaultParticipants];
        originalParticipants = [...participants];
        epochs = savedEpochs ? JSON.parse(savedEpochs) : [...defaultEpochs];
        tasks = savedTasks ? JSON.parse(savedTasks) : [...defaultTasks];
        
        saveToStorage();
        initializeWheels();
        renderResults();
        document.getElementById('teamResult').textContent = '';
        document.getElementById('epochResult').textContent = '';
        document.getElementById('taskResult').textContent = '';
    }
}

function exportResults() {
    if (results.length === 0) {
        alert('No results to export!');
        return;
    }

    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wheel-spin-results.json';
    link.click();
    URL.revokeObjectURL(url);
}
