// ==========================================
// BACKUP AUTOMÁTICO - backup.js
// ==========================================

const BACKUP_DIR_NAME = 'Cliente Max';
const BACKUP_SUBDIR = 'backup';

let _backupDirHandle = null;
let _backupThrottle = null;

// Inicializa o diretório de backup silenciosamente
// Só pede permissão uma vez; reutiliza o handle depois.
async function inicializarBackupDir() {
    if (_backupDirHandle) return _backupDirHandle;

    try {
        // Tenta usar storage/emulated/0 via showDirectoryPicker
        // O usuário escolhe a pasta "Cliente Max/backup" uma única vez.
        // Em Android com Kiwi/Firefox, showDirectoryPicker abre o seletor de pastas.
        if (!window._backupRootHandle) {
            window._backupRootHandle = await window.showDirectoryPicker({
                id: 'clientemax-backup',
                mode: 'readwrite',
                startIn: 'downloads'
            });
        }

        const root = window._backupRootHandle;

        // Cria ou abre subpasta "backup"
        _backupDirHandle = await root.getDirectoryHandle(BACKUP_SUBDIR, { create: true });
        return _backupDirHandle;
    } catch (e) {
        // Usuário cancelou ou API não disponível — falha silenciosa
        return null;
    }
}

// Gera nome do arquivo: backup_YYYY-MM-DD_HH-MM-SS.json
function _nomeArquivoBackup() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const data = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const hora = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `backup_${data}_${hora}.json`;
}

// Remove backups antigos, mantém apenas os 10 mais recentes
async function _limparBackupsAntigos(dirHandle) {
    try {
        const arquivos = [];
        for await (const [nome] of dirHandle.entries()) {
            if (nome.startsWith('backup_') && nome.endsWith('.json')) {
                arquivos.push(nome);
            }
        }
        arquivos.sort(); // ordem cronológica pelo nome
        const excesso = arquivos.length - 10;
        for (let i = 0; i < excesso; i++) {
            await dirHandle.removeEntry(arquivos[i]);
        }
    } catch (e) {
        // Falha silenciosa
    }
}

// Função principal — chamada por salvarDB()
// Throttle de 3 segundos para não gravar a cada keystroke
async function fazerBackupAutomatico() {
    if (!window.showDirectoryPicker) return; // API não suportada

    clearTimeout(_backupThrottle);
    _backupThrottle = setTimeout(async () => {
        try {
            const dirHandle = await inicializarBackupDir();
            if (!dirHandle) return;

            const dados = JSON.parse(localStorage.getItem('barber_v6') || '{}');
            const payload = JSON.stringify({
                versao: 'barber_v6',
                geradoEm: new Date().toISOString(),
                dados
            }, null, 2);

            const nome = _nomeArquivoBackup();
            const fileHandle = await dirHandle.getFileHandle(nome, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(payload);
            await writable.close();

            await _limparBackupsAntigos(dirHandle);
        } catch (e) {
            // Falha silenciosa — não interrompe o app
        }
    }, 3000);
}
