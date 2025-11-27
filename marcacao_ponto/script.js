// ===== VARIÁVEIS GLOBAIS =====
let currentUser = null;
let currentStream = null;
let currentPhoto = null;
let currentLat = null;
let currentLng = null;

// ===== INICIALIZAÇÃO IMEDIATA =====
initStorage(); 

// ===== EVENTOS AO CARREGAR A PÁGINA =====
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    checkAuth();

    // Configuração inicial de filtros (se estiver na página de relatórios)
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    if (monthFilter && yearFilter) {
        const today = new Date();
        monthFilter.value = today.getMonth() + 1;
        yearFilter.value = today.getFullYear();
    }
});

// ===== API DE CEP (NOVO) =====
async function searchCep(cep) {
    // Remove tudo que não é número (ex: traços, pontos)
    const cleanCep = cep.replace(/\D/g, '');

    // Verifica se tem 8 dígitos
    if (cleanCep.length !== 8) {
        return; // CEP incompleto, não faz nada
    }

    const loadingText = document.getElementById('cepLoading');
    const addressInput = document.getElementById('registerAddress');
    const neighborhoodInput = document.getElementById('registerNeighborhood');
    const cityInput = document.getElementById('registerCity');

    // Mostra aviso de "Buscando..."
    if(loadingText) loadingText.style.display = 'block';

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (data.erro) {
            alert('CEP não encontrado!');
            // Limpa os campos se der erro
            addressInput.value = '';
            neighborhoodInput.value = '';
            cityInput.value = '';
        } else {
            // Preenche os campos automaticamente
            addressInput.value = data.logradouro;
            neighborhoodInput.value = data.bairro;
            cityInput.value = `${data.localidade}/${data.uf}`;
        }
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        alert('Erro ao conectar com o serviço de CEP.');
    } finally {
        // Esconde aviso de "Buscando..."
        if(loadingText) loadingText.style.display = 'none';
    }
}

// ===== STORAGE & SESSÃO =====
function initStorage() {
    // Inicializa banco de dados mockado se não existir
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

function checkAuth() {
    const path = window.location.pathname;
    const page = path.split("/").pop(); // Pega o nome do arquivo

    const protectedPages = ['timeclock.html', 'reports.html'];
    const publicPages = ['login.html', 'register.html', 'forgot-password.html'];

    // Se estiver em página protegida e NÃO tiver usuário -> Vai pro Login
    if (protectedPages.includes(page) && !currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Se estiver em página pública e JÁ tiver usuário -> Vai pro Ponto
    if (publicPages.includes(page) && currentUser) {
        window.location.href = 'timeclock.html';
        return;
    }

    // Carregamento específico de cada página
    if (page === 'timeclock.html' && currentUser) {
        loadTimeClock();
    } else if (page === 'reports.html' && currentUser) {
        loadReports();
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
    window.location.href = "timeclock.html";
}

function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const company = document.getElementById('registerCompany').value.trim();
    
    // Captura os dados dos novos campos de endereço
    const cep = document.getElementById('registerCep').value.trim();
    const address = document.getElementById('registerAddress').value;
    const neighborhood = document.getElementById('registerNeighborhood').value;
    const city = document.getElementById('registerCity').value;

    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');

    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');

    // Validação
    if (!name || !email || !company || !cep) {
        showError(errorDiv, 'Preencha todos os campos obrigatórios');
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

    // Cria usuário incluindo o objeto de endereço
    const newUser = createUser({
        name,
        email,
        company,
        password: Math.random().toString(36).slice(-8), // Gera senha provisória
        addressData: { 
            cep,
            street: address,
            neighborhood,
            city
        }
    });

    saveUser(newUser);
    successDiv.textContent = 'Cadastro realizado! Redirecionando...';
    successDiv.classList.add('show');

    setTimeout(() => {
        window.location.href = "timeclock.html";
    }, 2000);
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    
    window.location.href = "login.html";
}

// ===== RECUPERAÇÃO DE SENHA =====
function handleFindEmail(event) {
    event.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    const errorDiv = document.getElementById('forgotError');

    errorDiv.classList.remove('show');

    if (!email) { showError(errorDiv, 'Digite seu email'); return; }
    if (!getUserByEmail(email)) { showError(errorDiv, 'Email não encontrado'); return; }

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

    if (!newPassword || !confirmPassword) { showError(errorDiv, 'Preencha todos os campos'); return; }
    if (newPassword !== confirmPassword) { showError(errorDiv, 'As senhas não conferem'); return; }
    if (newPassword.length < 6) { showError(errorDiv, 'A senha deve ter pelo menos 6 caracteres'); return; }

    if (updatePassword(email, newPassword)) {
        successDiv.textContent = 'Senha alterada! Indo para login...';
        successDiv.classList.add('show');
        setTimeout(() => { window.location.href = "login.html"; }, 2000);
    }
}

function goBackForgot() {
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step1').classList.remove('hidden');
    document.getElementById('forgotEmail').focus();
}

// ===== MARCAÇÃO DE PONTO =====
function loadTimeClock() {
    if (!currentUser) return;

    const nameDisplay = document.getElementById('userNameDisplay');
    const nameInfo = document.getElementById('userNameInfo');
    const companyInfo = document.getElementById('userCompanyInfo');

    if (nameDisplay) nameDisplay.textContent = currentUser.name;
    if (nameInfo) nameInfo.textContent = currentUser.name;
    if (companyInfo) companyInfo.textContent = currentUser.company;

    const todayRecords = getTodayRecords();
    updateRecordUI('entrada', todayRecords);
    updateRecordUI('entrada_almoco', todayRecords);
    updateRecordUI('saida_almoco', todayRecords);
    updateRecordUI('saida', todayRecords);
}

function updateRecordUI(type, records) {
    const record = records.find(r => r.type === type);
    const idPrefix = type.replace(/_([a-z])/g, (g) => g[1].toUpperCase()); 
    
    const btn = document.getElementById(`${idPrefix}Btn`);
    const timeDisplay = document.getElementById(`${idPrefix}Time`);

    if (btn && timeDisplay) {
        btn.disabled = !!record;
        timeDisplay.textContent = record ? record.time : '--:--';
    }
}

function recordTime(type) {
    if (!currentUser) return;
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    saveRecord({
        userId: currentUser.id,
        type: type,
        time: time,
        photo: currentPhoto,
        latitude: currentLat,
        longitude: currentLng
    });

    currentPhoto = null;
    alert(`${getTypeLabel(type)} registrada com sucesso às ${time}`);
    loadTimeClock();
}

function getTodayRecords() {
    if (!currentUser) return [];
    const records = getUserRecords(currentUser.id);
    const today = new Date().toDateString();
    return records.filter(r => new Date(r.timestamp).toDateString() === today);
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
        locationInfo.innerHTML = '<p style="color: #dc2626;">Geolocalização não suportada</p>';
        return;
    }
    locationInfo.innerHTML = '<p>Obtendo localização...</p>';
    navigator.geolocation.getCurrentPosition(
        function(position) {
            currentLat = position.coords.latitude.toFixed(6);
            currentLng = position.coords.longitude.toFixed(6);
            const accuracy = position.coords.accuracy.toFixed(0);
            locationInfo.innerHTML = `
                <p><strong>Lat:</strong> ${currentLat} | <strong>Long:</strong> ${currentLng}</p>
                <p><small>Precisão: ±${accuracy}m</small></p>
                <p style="color: #16a34a; font-size: 0.9rem; margin-top: 5px;">✅ Localização capturada para o registro.</p>
            `;
        },
        function(error) {
            locationInfo.innerHTML = `<p style="color: #dc2626;">Erro: ${error.message}</p>`;
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
    const nameDisplay = document.getElementById('userNameDisplay2');
    if (nameDisplay) nameDisplay.textContent = currentUser.name;
    if (typeof filterRecords === 'function') { filterRecords(); }
}

// ===== UTILITÁRIOS =====
function updateCurrentTime() {
    const now = new Date();
    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');
    if(timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR');
    if(dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR');
}

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => { element.classList.remove('show'); }, 5000);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function acceptCookies() {
    alert('Cookies aceitos!');
}