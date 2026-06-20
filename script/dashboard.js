// ── CONTROLE DO DASHBOARD DE RELATÓRIOS ──

document.addEventListener("DOMContentLoaded", () => {
  // Inicialização e Renderização
  carregarDashboard();
  
  // Event listeners para filtros
  document.getElementById("filtro_busca")?.addEventListener("input", filtrarERenderizar);
  document.getElementById("filtro_patrimonio")?.addEventListener("change", filtrarERenderizar);
  document.getElementById("filtro_ordenacao")?.addEventListener("change", filtrarERenderizar);
  
  // Criar ícones do Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Chave do LocalStorage
const STORAGE_KEY = "pace_relatorios";

// Função para buscar relatórios do LocalStorage
function obterRelatorios() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    console.error("Erro ao ler relatórios:", e);
    return [];
  }
}

// Salva a lista de relatórios no LocalStorage
function salvarRelatorios(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

// Carregar todas as informações do Dashboard
function carregarDashboard() {
  const relatorios = obterRelatorios();
  calcularEExibirMetricas(relatorios);
  renderizarRelatorios(relatorios);
}

// Calcular as métricas acumuladas (KPIs)
function calcularEExibirMetricas(relatorios) {
  const totalRelatorios = relatorios.length;
  let patrimonioTotalMapeado = 0;
  let prejuizoAcumulado = 0;

  relatorios.forEach(rep => {
    patrimonioTotalMapeado += Number(rep.totalPatrimonio) || 0;
    prejuizoAcumulado += Number(rep.prejuizoTributario) || 0;
  });

  const prejuizoMedio = totalRelatorios > 0 ? (prejuizoAcumulado / totalRelatorios) : 0;

  // Atualizar DOM
  const elQtd = document.getElementById("metric_qtd_relatorios");
  const elPat = document.getElementById("metric_patrimonio_total");
  const elPrej = document.getElementById("metric_prejuizo_medio");

  if (elQtd) elQtd.innerText = totalRelatorios;
  if (elPat) elPat.innerText = "R$ " + patrimonioTotalMapeado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elPrej) elPrej.innerText = "R$ " + prejuizoMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// Filtrar e renderizar dinamicamente em tempo real
function filtrarERenderizar() {
  const relatorios = obterRelatorios();
  const busca = document.getElementById("filtro_busca")?.value.toLowerCase().trim() || "";
  const faixaPatrimonio = document.getElementById("filtro_patrimonio")?.value || "todos";
  const ordenacao = document.getElementById("filtro_ordenacao")?.value || "recentes";

  let filtrados = relatorios.filter(rep => {
    // Busca por nome do cliente ou assessor
    const nomeCliente = (rep.nomeCliente || "").toLowerCase();
    const nomeAssessor = (rep.nomeAssessor || "").toLowerCase();
    const matchBusca = nomeCliente.includes(busca) || nomeAssessor.includes(busca);

    // Filtro por faixa de patrimônio
    let matchFaixa = true;
    const pat = Number(rep.totalPatrimonio) || 0;
    if (faixaPatrimonio === "ate_5m") {
      matchFaixa = pat <= 5000000;
    } else if (faixaPatrimonio === "5m_20m") {
      matchFaixa = pat > 5000000 && pat <= 20000000;
    } else if (faixaPatrimonio === "mais_20m") {
      matchFaixa = pat > 20000000;
    }

    return matchBusca && matchFaixa;
  });

  // Ordenação
  filtrados.sort((a, b) => {
    if (ordenacao === "recentes") {
      return new Date(b.dataCriacao || b.dataReuniao) - new Date(a.dataCriacao || a.dataReuniao);
    } else if (ordenacao === "antigos") {
      return new Date(a.dataCriacao || a.dataReuniao) - new Date(b.dataCriacao || b.dataReuniao);
    } else if (ordenacao === "patrimonio_maior") {
      return (Number(b.totalPatrimonio) || 0) - (Number(a.totalPatrimonio) || 0);
    } else if (ordenacao === "patrimonio_menor") {
      return (Number(a.totalPatrimonio) || 0) - (Number(b.totalPatrimonio) || 0);
    }
    return 0;
  });

  renderizarRelatorios(filtrados);
}

// Renderizar a lista de cards ou Empty State
function renderizarRelatorios(relatorios) {
  const container = document.getElementById("reports_container");
  if (!container) return;

  if (relatorios.length === 0) {
    container.style.display = "block";
    container.innerHTML = `
      <div class="empty-state reveal active">
        <div class="empty-state-icon">
          <i data-lucide="folder-open"></i>
        </div>
        <h3>Nenhum relatório encontrado</h3>
        <p>Inicie uma nova simulação patrimonial para preencher o seu histórico de relatórios gerados.</p>
        <a href="nova_simulacao.html" class="btn-new-report" style="margin: 0 auto; display: inline-flex;">
          <i data-lucide="plus"></i>
          Nova Simulação
        </a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.style.display = "grid";
  let html = "";

  relatorios.forEach(rep => {
    const totalPat = Number(rep.totalPatrimonio) || 0;
    const totalPrej = Number(rep.prejuizoTributario) || 0;
    
    // Risco de liquidez: Se prejuízo tributável ultrapassar liquidez (RF + Prev + Fundos + Offshore)
    // Usamos os dados internos salvos da simulação para calcular
    const dados = rep.dadosSessao?.patrimonio_dados || {};
    const rf = parseValor(dados.rf);
    const prev = parseValor(dados.prev);
    const inter = parseValor(dados.inter);
    const offshore = parseValor(dados.offshore);
    const liquidezTotal = rf + prev + inter + offshore;
    const isRiscoLiquidez = totalPrej > liquidezTotal && totalPat > 0;

    const formattedPat = "R$ " + totalPat.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    const formattedPrej = "R$ " + totalPrej.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    const formattedDate = rep.dataReuniao || new Date(rep.dataCriacao).toLocaleDateString("pt-BR");

    html += `
      <div class="report-card reveal active" id="card_${rep.id}">
        <div class="report-card-header">
          <div class="report-client-info">
            <h3 class="report-client-name">${escapeHTML(rep.nomeCliente)}</h3>
            <span class="report-advisor-name">Assessor: ${escapeHTML(rep.nomeAssessor)}</span>
          </div>
          <span class="report-date-pill">${formattedDate}</span>
        </div>
        <div class="report-card-body">
          <div class="report-data-item">
            <label>Patrimônio Total</label>
            <span>${formattedPat}</span>
          </div>
          <div class="report-data-item accent">
            <label>Prejuízo Sucessório</label>
            <span>${formattedPrej}</span>
          </div>
          
          <div class="report-badge-container">
            ${isRiscoLiquidez ? 
              `<div class="liquidity-badge danger">
                <i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Risco de Liquidez Alto
              </div>` : 
              `<div class="liquidity-badge safe">
                <i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Liquidez Adequada
              </div>`
            }
          </div>
        </div>
        <div class="report-card-footer">
          <button class="btn-action danger-icon" onclick="excluirRelatorio('${rep.id}')" title="Excluir Simulação">
            <i data-lucide="trash-2"></i>
          </button>
          <button class="btn-action secondary" onclick="editarSimulacao('${rep.id}')">
            <i data-lucide="edit-3"></i> Editar
          </button>
          <button class="btn-action primary" onclick="visualizarPDF('${rep.id}')">
            <i data-lucide="file-text"></i> PDF
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

// Auxiliar para parser
function parseValor(v) {
  if (!v) return 0;
  return Number(
    String(v)
      .replace(/\s/g, "")
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
  ) || 0;
}

// XSS Prevention
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Restaurar sessão no sessionStorage para visualizar o PDF
function restaurarSessao(id) {
  const relatorios = obterRelatorios();
  const rep = relatorios.find(r => r.id === id);
  if (!rep || !rep.dadosSessao) {
    alert("Dados da simulação não encontrados.");
    return false;
  }

  // Limpa sessão atual e popula com os dados do relatório
  sessionStorage.clear();
  Object.keys(rep.dadosSessao).forEach(key => {
    const val = rep.dadosSessao[key];
    if (typeof val === "object") {
      sessionStorage.setItem(key, JSON.stringify(val));
    } else {
      sessionStorage.setItem(key, val);
    }
  });

  return true;
}

// Ação de Visualizar PDF
function visualizarPDF(id) {
  if (restaurarSessao(id)) {
    // Redireciona com um parâmetro para abrir o preview do PDF de forma imediata
    window.location.href = "tributario.html?preview=true";
  }
}

// Ação de Editar Simulação
function editarSimulacao(id) {
  if (restaurarSessao(id)) {
    window.location.href = "patrimonio.html";
  }
}

// Excluir relatório com confirmação
function excluirRelatorio(id) {
  const relatorios = obterRelatorios();
  const rep = relatorios.find(r => r.id === id);
  if (!rep) return;

  if (confirm(`Tem certeza que deseja excluir a simulação do cliente ${rep.nomeCliente}?`)) {
    const atualizados = relatorios.filter(r => r.id !== id);
    salvarRelatorios(atualizados);
    carregarDashboard();
  }
}
