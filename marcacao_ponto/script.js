// ===== VARIÁVEIS GLOBAIS =====
let currentUser = null;
let currentStream = null;
let currentPhoto = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    initStorage();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Definir mês e ano atuais nos filtros
    const today = new Date();
    document.getElementById('monthFilter').value = today.getMonth() + 1;
    document.getElementById('yearFilter').value = today.getFullYear();
});

// ===== STORAGE =====
function initStorage() {
    if (!localStorage.getItem('users')) {
        const demoUsers = [
            {
                id: '1',
                name: 'João Silva',
                email: 'joao.silva@empresa.com',
                password: 'senha123',
                company: 'Tech Solutions'
            },
            {
                id: '2',
                name: 'Maria Santos',
                email: 'maria.santos@empresa.com',
                password: 'senha123',
                company: 'Inovação Digital'
            }
        ];
        localStorage.setItem('users', JSON.stringify(demoUsers));
    }

    if (!localStorage.getItem('records')) {
        localStorage.setItem('records', JSON.stringify([]));
    }

    // Carregar usuário logado
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
}

function saveUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    currentUser = user;
}

function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

function getUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email === email);
}

function createUser(userData) {
    const users = getUsers();
    const newUser = {
        id: Date.now().toString(),
        ...userData
    };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return newUser;
}

function updatePassword(email, newPassword) {
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (user) {
        user.password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        return true;
    }
    return false;
}

function getRecords() {
    return JSON.parse(localStorage.getItem('records') || '[]');
}

function saveRecord(record) {
    const records = getRecords();
    records.push({
        id: Date.now().toString(),
        ...record,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('records', JSON.stringify(records));
}

function getUserRecords(userId) {
    const records = getRecords();
    return records.filter(r => r.userId === userId);
}

// ===== NAVEGAÇÃO =====
function showPage(pageId) {
    // Esconder todas as páginas
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('hidden'));

    // Mostrar página selecionada
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.remove('hidden');
    }

    // Se é página protegida, verificar autenticação
    if (['timeclock', 'reports'].includes(pageId) && !currentUser) {
        showPage('login');
        return;
    }

    // Atualizar informações do usuário
    if (pageId === 'timeclock') {
        loadTimeClock();
    } else if (pageId === 'reports') {
        loadReports();
    }
}

// ===== AUTENTICAÇÃO =====
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    errorDiv.classList.remove('show');

    if (!email || !password) {
        showError(errorDiv, 'Preencha todos os campos');
        return;
    }

    const user = getUserByEmail(email);
    if (!user || user.password !== password) {
        showError(errorDiv, 'Email ou senha inválidos');
        return;
    }

    saveUser(user);
    document.getElementById('loginForm').reset();
    showPage('timeclock');
}

function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const company = document.getElementById('registerCompany').value.trim();
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');

    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');

    if (!name || !email || !company) {
        showError(errorDiv, 'Preencha todos os campos');
        return;
    }

    if (!isValidEmail(email)) {
        showError(errorDiv, 'Email inválido');
        return;
    }

    if (getUserByEmail(email)) {
        showError(errorDiv, 'Email já cadastrado');
        return;
    }

    const newUser = createUser({
        name,
        email,
        company,
        password: Math.random().toString(36).slice(-8)
    });

    saveUser(newUser);
    successDiv.textContent = 'Cadastro realizado com sucesso! Redirecionando...';
    successDiv.classList.add('show');

    setTimeout(() => {
        document.getElementById('registerForm').reset();
        showPage('timeclock');
    }, 2000);
}

function handleFindEmail(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value.trim();
    const errorDiv = document.getElementById('forgotError');

    errorDiv.classList.remove('show');

    if (!email) {
        showError(errorDiv, 'Digite seu email');
        return;
    }

    if (!getUserByEmail(email)) {
        showError(errorDiv, 'Email não encontrado');
        return;
    }

    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');
}

function handleResetPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('resetError');
    const successDiv = document.getElementById('resetSuccess');

    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');

    if (!newPassword || !confirmPassword) {
        showError(errorDiv, 'Preencha todos os campos');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError(errorDiv, 'As senhas não conferem');
        return;
    }

    if (newPassword.length < 6) {
        showError(errorDiv, 'A senha deve ter pelo menos 6 caracteres');
        return;
    }

    if (updatePassword(email, newPassword)) {
        successDiv.textContent = 'Senha alterada com sucesso! Redirecionando para login...';
        successDiv.classList.add('show');

        setTimeout(() => {
            document.getElementById('forgotEmail').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('step1').classList.remove('hidden');
            showPage('login');
        }, 2000);
    }
}

function goBackForgot() {
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step1').classList.remove('hidden');
    document.getElementById('forgotEmail').focus();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    
    showPage('home');
}

function acceptCookies() {
    alert('Cookies aceitos! Obrigado.');
}

// ===== MARCAÇÃO DE PONTO =====
function loadTimeClock() {
    if (!currentUser) return;

    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userNameInfo').textContent = currentUser.name;
    document.getElementById('userCompanyInfo').textContent = currentUser.company;

    const todayRecords = getTodayRecords();
    
    // Atualizar botões
    const entradaRecord = todayRecords.find(r => r.type === 'entrada');
    const entradaAlmocoRecord = todayRecords.find(r => r.type === 'entrada_almoco');
    const saidaAlmocoRecord = todayRecords.find(r => r.type === 'saida_almoco');
    const saidaRecord = todayRecords.find(r => r.type === 'saida');

    document.getElementById('entradaBtn').disabled = !!entradaRecord;
    document.getElementById('entradaAlmocoBtn').disabled = !!entradaAlmocoRecord;
    document.getElementById('saidaAlmocoBtn').disabled = !!saidaAlmocoRecord;
    document.getElementById('saidaBtn').disabled = !!saidaRecord;

    document.getElementById('entradaTime').textContent = entradaRecord ? entradaRecord.time : '--:--';
    document.getElementById('entradaAlmocoTime').textContent = entradaAlmocoRecord ? entradaAlmocoRecord.time : '--:--';
    document.getElementById('saidaAlmocoTime').textContent = saidaAlmocoRecord ? saidaAlmocoRecord.time : '--:--';
    document.getElementById('saidaTime').textContent = saidaRecord ? saidaRecord.time : '--:--';
}

function recordTime(type) {
    if (!currentUser) return;

    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    saveRecord({
        userId: currentUser.id,
        type: type,
        time: time,
        photo: currentPhoto
    });

    currentPhoto = null;
    alert(`${getTypeLabel(type)} registrada com sucesso às ${time}`);
    loadTimeClock();
}

function getTodayRecords() {
    if (!currentUser) return [];

    const records = getUserRecords(currentUser.id);
    const today = new Date().toDateString();

    return records.filter(r => {
        return new Date(r.timestamp).toDateString() === today;
    });
}

function getTypeLabel(type) {
    const labels = {
        'entrada': 'Entrada',
        'entrada_almoco': 'Entrada Almoço',
        'saida_almoco': 'Saída Almoço',
        'saida': 'Saída'
    };
    return labels[type] || type;
}

// ===== GEOLOCALIZAÇÃO =====
function getLocation() {
    const locationInfo = document.getElementById('locationInfo');

    if (!navigator.geolocation) {
        locationInfo.innerHTML = '<p style="color: #dc2626;">Geolocalização não suportada neste navegador</p>';
        return;
    }

    locationInfo.innerHTML = '<p>Obtendo localização...</p>';

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const latitude = position.coords.latitude.toFixed(6);
            const longitude = position.coords.longitude.toFixed(6);
            const accuracy = position.coords.accuracy.toFixed(0);

            locationInfo.innerHTML = `
                <p><strong>Latitude:</strong> ${latitude}</p>
                <p><strong>Longitude:</strong> ${longitude}</p>
                <p><strong>Precisão:</strong> ±${accuracy}m</p>
                <p><strong>Horário:</strong> ${new Date().toLocaleTimeString('pt-BR')}</p>
            `;
        },
        function(error) {
            locationInfo.innerHTML = '<p style="color: #dc2626;">Erro ao obter localização: ' + error.message + '</p>';
        }
    );
}

// ===== CÂMERA =====
function startCamera() {
    const video = document.getElementById('cameraPreview');
    const startBtn = document.getElementById('startCameraBtn');
    const takeBtn = document.getElementById('takPhotoBtn');

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(function(stream) {
            currentStream = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            startBtn.classList.add('hidden');
            takeBtn.classList.remove('hidden');
        })
        .catch(function(error) {
            alert('Erro ao acessar câmera: ' + error.message);
        });
}

function takePhoto() {
    const video = document.getElementById('cameraPreview');
    const canvas = document.getElementById('photoCanvas');
    const preview = document.getElementById('photoPreview');
    const takeBtn = document.getElementById('takPhotoBtn');
    const retakeBtn = document.getElementById('retakePhotoBtn');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    currentPhoto = canvas.toDataURL('image/jpeg');

    preview.src = currentPhoto;
    preview.style.display = 'block';
    video.style.display = 'none';
    takeBtn.classList.add('hidden');
    retakeBtn.classList.remove('hidden');
}

function retakePhoto() {
    const video = document.getElementById('cameraPreview');
    const preview = document.getElementById('photoPreview');
    const takeBtn = document.getElementById('takPhotoBtn');
    const retakeBtn = document.getElementById('retakePhotoBtn');

    video.style.display = 'block';
    preview.style.display = 'none';
    takeBtn.classList.remove('hidden');
    retakeBtn.classList.add('hidden');
    currentPhoto = null;
}

// ===== RELATÓRIOS =====
function loadReports() {
    if (!currentUser) return;

    document.getElementById('userNameDisplay2').textContent = currentUser.name;
    filterRecords();
}

function filterRecords() {
    if (!currentUser) return;

    const month = parseInt(document.getElementById('monthFilter').value);
    const year = parseInt(document.getElementById('yearFilter').value);

    const records = getUserRecords(currentUser.id);
    const filteredRecords = records.filter(r => {
        const recordDate = new Date(r.timestamp);
        return recordDate.getFullYear() === year && recordDate.getMonth() === month - 1;
    });

    // Agrupar por data
    const recordsByDate = {};
    filteredRecords.forEach(record => {
        const date = new Date(record.timestamp).toLocaleDateString('pt-BR');
        if (!recordsByDate[date]) {
            recordsByDate[date] = {};
        }
        recordsByDate[date][record.type] = record.time;
    });

    // Calcular estatísticas
    const dates = Object.keys(recordsByDate).sort();
    let totalHours = 0;
    let totalDays = dates.length;

    // Renderizar tabela
    const tbody = document.getElementById('recordsTableBody');
    if (dates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum registro encontrado</td></tr>';
    } else {
        tbody.innerHTML = dates.map(date => {
            const dayRecords = recordsByDate[date];
            const hours = calculateDayHours(dayRecords);
            totalHours += hours;

            return `
                <tr>
                    <td><strong>${date}</strong></td>
                    <td>${dayRecords.entrada || '--:--'}</td>
                    <td>${dayRecords.entrada_almoco || '--:--'}</td>
                    <td>${dayRecords.saida_almoco || '--:--'}</td>
                    <td>${dayRecords.saida || '--:--'}</td>
                    <td><strong>${hours.toFixed(2)}h</strong></td>
                </tr>
            `;
        }).join('');
    }

    // Atualizar resumo
    document.getElementById('totalDays').textContent = totalDays;
    document.getElementById('totalHours').textContent = totalHours.toFixed(2) + 'h';
    document.getElementById('avgHours').textContent = totalDays > 0 ? (totalHours / totalDays).toFixed(2) + 'h' : '0h';
}

function calculateDayHours(dayRecords) {
    const entrada = timeToMinutes(dayRecords.entrada);
    const entradaAlmoco = timeToMinutes(dayRecords.entrada_almoco);
    const saidaAlmoco = timeToMinutes(dayRecords.saida_almoco);
    const saida = timeToMinutes(dayRecords.saida);

    if (!entrada || !saida) return 0;

    let totalMinutes = saida - entrada;

    if (entradaAlmoco && saidaAlmoco) {
        totalMinutes -= (saidaAlmoco - entradaAlmoco);
    }

    return totalMinutes / 60;
}

function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function exportCSV() {
    if (!currentUser) return;

    const month = document.getElementById('monthFilter').value;
    const year = document.getElementById('yearFilter').value;

    const records = getUserRecords(currentUser.id);
    const filteredRecords = records.filter(r => {
        const recordDate = new Date(r.timestamp);
        return recordDate.getFullYear() === parseInt(year) && recordDate.getMonth() === parseInt(month) - 1;
    });

    const recordsByDate = {};
    filteredRecords.forEach(record => {
        const date = new Date(record.timestamp).toLocaleDateString('pt-BR');
        if (!recordsByDate[date]) {
            recordsByDate[date] = {};
        }
        recordsByDate[date][record.type] = record.time;
    });

    let csv = 'Data,Entrada,Entrada Almoço,Saída Almoço,Saída,Total de Horas\n';
    Object.keys(recordsByDate).sort().forEach(date => {
        const dayRecords = recordsByDate[date];
        const hours = calculateDayHours(dayRecords);
        csv += `${date},${dayRecords.entrada || '--:--'},${dayRecords.entrada_almoco || '--:--'},${dayRecords.saida_almoco || '--:--'},${dayRecords.saida || '--:--'},${hours.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${year}_${month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ===== UTILITÁRIOS =====
function updateCurrentTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('pt-BR');
    document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-BR');
}

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
