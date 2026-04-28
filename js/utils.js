// ==========================================
// LÓGICA DO DASHBOARD DE LUCRO (DINÂMICO)
// ==========================================
function salvarPorcentagem(valor) {
    let num = parseInt(valor);
    
    if (isNaN(num) || num < 0) num = 0;
    if (num > 100) num = 100;
    
    db.minhaParte = num;
    localStorage.setItem('barber_v6', JSON.stringify(db));
    
    renderAjustes(); 
}

function renderAjustes() {
    if (db.minhaParte === undefined || db.minhaParte === null) {
        db.minhaParte = 60;
    }
    
    const inputPct = document.getElementById('input-porcentagem');
    if (inputPct) inputPct.value = db.minhaParte;
    
    const mePercentage = parseFloat(db.minhaParte) / 100;
    const storePercentage = 1 - mePercentage;
    
    const totalPago = db.atendimentos
        .filter(a => !a.pendente)
        .reduce((acc, a) => acc + (parseFloat(a.total) || 0), 0);
    
    const totalGorjetas = db.atendimentos
        .reduce((acc, a) => acc + (parseFloat(a.gorjeta) || 0), 0);
    
    const totalParaDividir = totalPago - totalGorjetas;
    const meuLucro  = (totalParaDividir * mePercentage) + totalGorjetas;
    const caixaLoja = totalParaDividir * storePercentage;
    
    const fmt = (valor) => `R$ ${valor.toFixed(2)}`;
    
    const elMyCut  = document.getElementById('dash-meu');
    const elStore  = document.getElementById('dash-custos');
    const labelMeu = document.getElementById('label-meu');
    const labelCustos = document.getElementById('label-custos');
    
    if (elMyCut)  elMyCut.textContent  = fmt(meuLucro);
    if (elStore)  elStore.textContent  = fmt(caixaLoja);
    
    if (labelMeu) {
        labelMeu.innerText = totalGorjetas > 0 
            ? `Minha Parte (${db.minhaParte}% + 💵 ${fmt(totalGorjetas)})`
            : `Minha Parte (${db.minhaParte}%)`;
    }
    if (labelCustos) {
        labelCustos.innerText = `Loja/Custos (${100 - db.minhaParte}%)`;
    }
}

// ==========================================
// FUNÇÃO DE RELATÓRIO DIDÁTICO (PNG)
// ==========================================
async function gerarRelatorioPNG() {
    const container = document.getElementById('relatorio-temp');
    const pctMeu = db.minhaParte || 60;
    
    let totalGeralServicos = 0;
    let totalPendente = 0;
    let totalGorjetas = 0;

    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - 7);
    
    let html = `
        <div style="font-family: 'Inter', sans-serif; color: #1e293b; background: white; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; color: #e11d48; letter-spacing: -1px;">Cliente Max</h1>
                <p style="margin: 5px 0 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase">Fechamento Semanal: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="text-align: left; border-bottom: 1px solid #e2e8f0; color: #94a3b8;">
                        <th style="padding: 8px 0; text-transform: uppercase">Cliente / Status</th>
                        <th style="padding: 8px 0; text-align: right; text-transform: uppercase">Valor</th>
                    </tr>
                </thead>
                <tbody>
    `;

    const atendimentosFiltrados = db.atendimentos.filter(a => new Date(a.dataHora || 0) >= limiteData);

    atendimentosFiltrados.forEach(atend => {
        let valorTotal = parseFloat(atend.total || 0);
        let gorjeta = parseFloat(atend.gorjeta || 0);
        totalGeralServicos += valorTotal;
        totalGorjetas += gorjeta;
        if(atend.pendente) totalPendente += valorTotal;

        html += `
            <tr style="border-bottom: 1px solid #f8fafc;">
                <td style="padding: 12px 0;">
                    <div style="font-weight: 900; text-transform: uppercase; font-size: 12px;">${atend.nome}</div>
                    <div style="font-size: 9px; color: ${atend.pendente ? '#e11d48' : '#64748b'}; font-weight: 700;">
                        ${atend.pendente ? '⚠️ PENDENTE' : '✅ PAGO'} - Com: ${atend.recebedor || 'N/I'}
                    </div>
                    <div style="font-size: 8px; color: #94a3b8; font-weight: 600; margin-top: 2px;">
                        ${atend.servicos.join(' + ')} [${atend.pagamento || 'N/I'}]
                    </div>
                    ${gorjeta > 0 ? `<div style="font-size: 8px; color: #f59e0b; font-weight: 700; margin-top: 2px;">💵 Gorjeta: R$ ${gorjeta.toFixed(2)}</div>` : ''}
                </td>
                <td style="padding: 12px 0; text-align: right; font-weight: 900; color: #1e293b; font-size: 13px;">
                    R$ ${valorTotal.toFixed(2)}
                </td>
            </tr>
        `;
    });

    const totalLiquido = totalGeralServicos - totalGorjetas;
    const valorMinhaParte = ((totalLiquido * (pctMeu / 100)) + totalGorjetas).toFixed(2);
    const valorLoja = (totalLiquido * ((100 - pctMeu) / 100)).toFixed(2);

    html += `
                </tbody>
            </table>

            <div style="margin-top: 25px; padding: 20px; background: #f8fafc; border-radius: 24px; border: 1px solid #f1f5f9;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Bruto:</span>
                    <span style="font-size: 14px; font-weight: 900; color: #1e293b;">R$ ${totalGeralServicos.toFixed(2)}</span>
                </div>
                ${totalGorjetas > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #f59e0b;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase;">💵 Total Gorjetas (Suas):</span>
                    <span style="font-size: 14px; font-weight: 900;">R$ ${totalGorjetas.toFixed(2)}</span>
                </div>` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #e11d48;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase;">Total Pendente:</span>
                    <span style="font-size: 14px; font-weight: 900;">R$ ${totalPendente.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 2px dashed #e2e8f0; padding-top: 10px; margin-top: 5px;">
                    <span style="font-size: 11px; font-weight: 800; color: #10b981; text-transform: uppercase;">Minha Parte (${pctMeu}% + 💵):</span>
                    <span style="font-size: 18px; font-weight: 900; color: #10b981;">R$ ${valorMinhaParte}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 5px;">
                    <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Loja/Custos (${100 - pctMeu}%):</span>
                    <span style="font-size: 14px; font-weight: 900; color: #64748b;">R$ ${valorLoja}</span>
                </div>
            </div>
            
            <p style="text-align: center; font-size: 9px; color: #94a3b8; margin-top: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Gerado por Cliente Max</p>
        </div>
    `;

    container.innerHTML = html;

    try {
        const canvas = await html2canvas(container, {
            backgroundColor: "#ffffff",
            scale: 3, 
            logging: false,
            useCORS: true
        });

        canvas.toBlob(async (blob) => {
            const dataRef = new Date().toLocaleDateString().replace(/\//g, '-');
            const file = new File([blob], `relatorio_barbearia_${dataRef}.png`, { type: 'image/png' });
            
            if (navigator.share) {
                await navigator.share({
                    title: 'Relatório Cliente Max',
                    files: [file]
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `relatorio_barbearia_${dataRef}.png`;
                link.click();
            }
        }, 'image/png');
    } catch (err) {
        alert("Erro ao gerar imagem do relatório.");
        console.error(err);
    }
}

// ==========================================
// FUNÇÕES DE BACKUP (SISTEMA)
// ==========================================
async function exportarBackup() {
    const dataRef = new Date().toLocaleDateString().replace(/\//g, '-');
    const nomeArquivo = `backup_topindica_${dataRef}.json`;
    const dadosStr = JSON.stringify(db, null, 2);

    if (navigator.share) {
        try {
            const arquivo = new File([dadosStr], nomeArquivo, { type: 'application/json' });
            await navigator.share({
                title: 'Backup Cliente Max',
                files: [arquivo]
            });
            return;
        } catch (err) {
            console.log("Compartilhamento cancelado");
        }
    }

    const blob = new Blob([dadosStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
}

function importarBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const dados = JSON.parse(ev.target.result);
            if (dados.atendimentos || dados.clientes) {
                if(confirm("ATENÇÃO: Isso irá substituir os dados atuais pelos do backup. Continuar?")) {
                    db = dados;
                    localStorage.setItem('barber_v6', JSON.stringify(db));
                    location.reload();
                }
            } else {
                alert("Arquivo de backup inválido.");
            }
        } catch (err) {
            alert("Erro ao ler o arquivo.");
        }
    };
    reader.readAsText(file);
}