// ==========================================
// BACKUP AUTOMÁTICO - backup.js
// ==========================================
// Funciona APENAS no APK via AndroidBridge.
// No PWA/navegador não faz nada (sem prompts, sem bugs).

function fazerBackupAutomatico() {
    // Só executa se estiver no APK
    if (!window.AndroidBridge || typeof window.AndroidBridge.salvarBackup !== 'function') {
        return; // PWA/navegador: não faz nada
    }

    try {
        const dadosJson = localStorage.getItem('barber_v6') || '{}';
        window.AndroidBridge.salvarBackup(dadosJson);
    } catch (e) {
        // Falha silenciosa
    }
}
