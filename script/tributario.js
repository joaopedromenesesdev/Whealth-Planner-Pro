let graficoGeral, graficoAplicacoes, graficoImoveis, graficoEmpresas;
Chart.register(ChartDataLabels);

// =========================
// CARREGAR DADOS
// =========================
window.onload = function () {

  let total = Number(sessionStorage.getItem("total_patrimonio")) || 0;

  document.getElementById("total_pdf").innerText =
    "R$ " + total.toLocaleString("pt-BR");

  document.getElementById("data_pdf").innerText =
    sessionStorage.getItem("data_reuniao") || new Date().toLocaleDateString("pt-BR");

  const dados = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};

  let rf = parseValor(dados.rf);
  let rv = parseValor(dados.rv);
  let inter = parseValor(dados.inter);
  let prev = parseValor(dados.prev);
  let offshore = parseValor(dados.offshore);

  let apt = parseValor(dados.apt);
  let casa = parseValor(dados.casa);
  let terr = parseValor(dados.terr);
  let galp = parseValor(dados.galp);

  let bens = parseValor(dados.bens);

  let totalEmpresas = 0;

  if (dados.empresas) {
    dados.empresas.forEach(emp => {
      let valor = parseValor(emp.valor);
      let pct = Number(emp.pct) || 0;
      totalEmpresas += valor * (pct / 100);
    });
  }

  let totalA = rf + rv + inter + prev + offshore;
  let totalI = apt + casa + terr + galp + parseValor(dados.bens_particulares);

  criarGraficos(dados);
  renderizarGraficoEvolucao();
  renderizarEstruturaFamiliar();
  initPrejuizo();

  // Verifica se deve abrir o preview do PDF automaticamente
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("preview") === "true") {
    setTimeout(() => {
      abrirPreview();
    }, 600);
  }
};

// =========================
// ESTRUTURA FAMILIAR
// =========================
function renderizarEstruturaFamiliar() {
  const familiaStr = sessionStorage.getItem("familia");
  if (!familiaStr) return;

  const familia = JSON.parse(familiaStr);

  // Nome do cliente na capa
  const nomeCapa = document.getElementById("nome_cliente_capa");
  if (nomeCapa) {
    nomeCapa.innerText = familia.nome ? familia.nome : "Cliente";
  }

  // Container para os detalhes da família
  const container = document.getElementById("estrutura_familiar_container");
  if (!container) return;

  let html = `<h3>Estrutura Familiar</h3><ul>`;

  // Dados principais
  if (familia.estadoCivil) {
    html += `<li><strong>Estado Civil:</strong> <span style="text-transform: capitalize;">${escapeHTML(familia.estadoCivil)}</span></li>`;
  }
  if (familia.estadoCivil === "casado" && familia.conjuge) {
    html += `<li><strong>Cônjuge:</strong> ${escapeHTML(familia.conjuge)}</li>`;
    if (familia.regime) {
      html += `<li><strong>Regime de Casamento:</strong> ${escapeHTML(familia.regime)}</li>`;
    }
  }

  // Filhos
  if (familia.temFilhos === "sim" && familia.qtdFilhos) {
    html += `<li><strong>Filhos:</strong> ${familia.qtdFilhos}</li>`;
    if (familia.idadesFilhos && familia.idadesFilhos.length > 0) {
      const idades = familia.idadesFilhos.filter(i => i !== "").join(", ");
      if (idades) {
        html += `<li><strong>Idades dos filhos:</strong> ${idades} anos</li>`;
      }
    }
  }

  // Pais
  if (familia.possuiPais === "sim" && familia.qtdPais) {
    html += `<li><strong>Pais vivos (Ascendentes):</strong> ${familia.qtdPais}</li>`;
  }

  // Colaterais
  if (familia.possuiColaterais === "sim" && familia.qtdColaterais) {
    html += `<li><strong>Parentes Colaterais:</strong> ${familia.qtdColaterais}`;
    if (familia.tipoColaterais) {
      html += ` (${familia.tipoColaterais})`;
    }
    html += `</li>`;
  }

  // --- Dados Cônjuge Extra ---
  if (familia.estadoCivil === "casado") {
    if (familia.conjugePossuiPais === "sim" && familia.conjugeQtdPais) {
      html += `<li><strong>Pais vivos do Cônjuge:</strong> ${familia.conjugeQtdPais}</li>`;
    }
    if (familia.conjugePossuiColaterais === "sim" && familia.conjugeQtdColaterais) {
      html += `<li><strong>Colaterais do Cônjuge:</strong> ${familia.conjugeQtdColaterais}`;
      if (familia.conjugeTipoColaterais) {
        html += ` (${familia.conjugeTipoColaterais})`;
      }
      html += `</li>`;
    }
  }

  html += `</ul>`;
  container.innerHTML = html;
}

// =========================
// PARSE MAIS ROBUSTO (corrigido)
// =========================
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


// =========================
// EVOLUÇÃO PATRIMONIAL
// =========================
let graficoEvolucao;

function renderizarGraficoEvolucao(scope = document) {

  let dadosEvolucaoStr = sessionStorage.getItem("evolucao_dados");
  let aviso = document.getElementById("aviso_evolucao");
  let canvasContainer = document.querySelector(".grafico-evolucao-pdf");

  if (!dadosEvolucaoStr) {
    if (aviso) aviso.style.display = "block";
    if (canvasContainer) canvasContainer.style.display = "none";
    return;
  }

  if (aviso) aviso.style.display = "none";
  if (canvasContainer) canvasContainer.style.display = "block";

  let dadosEvolucao = JSON.parse(dadosEvolucaoStr);
  let anos = dadosEvolucao.anos;
  let resultados = dadosEvolucao.resultados;

  const ctx = scope.querySelector("#grafico_evolucao") || document.getElementById("grafico_evolucao");
  if (!ctx) return;

  if (graficoEvolucao && scope === document) graficoEvolucao.destroy();

  const newChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: anos.map(a => a + " anos"),
      datasets: [{
        label: "Patrimônio (R$)",
        data: resultados,
        borderColor: "#0B53B8",
        backgroundColor: "rgba(11,83,184,0.08)",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: context => {
          const year = context.dataIndex;
          return year % 5 === 0 ? 5 : 0;
        },
        pointHoverRadius: 7,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: {
        legend: { display: false },
        datalabels: { display: false }
      },
      scales: {
        y: {
          ticks: {
            callback: v => "R$ " + v.toLocaleString("pt-BR")
          }
        }
      }
    }
  });
  if (scope === document) graficoEvolucao = newChart;
}


// =========================
// FORMATAR PERCENTUAL
// =========================
function formatarPercentual(v) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + "%";
}

// =========================
// CONFIG BASE DOS GRÁFICOS
// =========================
function baseOptions(isPercent = true, animationDuration = 1000) {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: animationDuration },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => isPercent
            ? formatarPercentual(ctx.raw)
            : "R$ " + ctx.raw.toLocaleString("pt-BR")
        }
      },
      datalabels: {
        display: true,
        anchor: "center",
        align: "center",
        color: "#fff",
        font: { weight: "bold", size: 11 },
        formatter: v => v > 0
          ? (isPercent ? formatarPercentual(v) : "R$ " + v.toLocaleString("pt-BR"))
          : ""
      }
    },
    scales: {
      x: {
        ticks: {
          callback: v => isPercent ? v + "%" : "R$ " + v.toLocaleString("pt-BR")
        }
      },
      y: { grid: { display: false } }
    }
  };
}

// =========================
// GRAFICOS
// =========================
function criarGraficos(dados, scope = document) {
  const coresPaleta = ["#0B53B8", "#1D6F42", "#FFB800", "#E53935", "#6F42C1", "#00B8D9", "#7A7A7A"];

  let rf = parseValor(dados.rf);
  let rv = parseValor(dados.rv);
  let inter = parseValor(dados.inter);
  let prev = parseValor(dados.prev);
  let offshore = parseValor(dados.offshore);

  let apt = parseValor(dados.apt);
  let casa = parseValor(dados.casa);
  let terr = parseValor(dados.terr);
  let galp = parseValor(dados.galp);
  let bens_particulares = parseValor(dados.bens_particulares);

  let bens = parseValor(dados.bens);

  let totalEmpresas = 0;
  let distribuicaoEmpresas = [];

  if (dados.empresas) {
    dados.empresas.forEach(emp => {
      let valor = parseValor(emp.valor);
      let pct = Number(emp.pct) || 0;
      let valorCliente = valor * (pct / 100);
      totalEmpresas += valorCliente;
      distribuicaoEmpresas.push(valorCliente);
    });
  }

  let totalA = rf + rv + inter + prev + offshore;
  let totalI = apt + casa + terr + galp + bens_particulares;
  let totalGeral = totalA + totalI + bens + totalEmpresas;

  // Lógica de visibilidade: Esconde se o valor for zero
  const elApp = scope.querySelector("#container_grafico_aplicacoes");
  const elImov = scope.querySelector("#container_grafico_imoveis");
  const elEmp = scope.querySelector("#container_grafico_empresas");

  if (elApp) elApp.style.display = totalA > 0 ? "block" : "none";
  if (elImov) elImov.style.display = totalI > 0 ? "block" : "none";
  if (elEmp) elEmp.style.display = totalEmpresas > 0 ? "block" : "none";

  // Inteligência de Layout: Se houver 3 ou mais gráficos, empilha para maior clareza.
  const grid = scope.querySelector(".graficos-grid");
  if (grid) {
    const visiveis = [totalA, totalI, totalEmpresas].filter(v => v > 0).length + 1;
    // Se houver 2 ou 3 gráficos, empilhamos. Se houver 4, usamos 2 colunas (2x2) para caber na folha.
    if (visiveis === 2 || visiveis === 3) {
      grid.classList.add("grid-coluna-unica");
    } else {
      grid.classList.remove("grid-coluna-unica");
    }
  }

  if (totalGeral === 0) return;
  
  // Determina se deve animar (apenas na tela principal)
  const anim = scope === document ? 1000 : 0;

  // G1 - Geral
  let pA = (totalA / totalGeral) * 100;
  let pI = (totalI / totalGeral) * 100;
  let pB = (bens / totalGeral) * 100;
  let pE = (totalEmpresas / totalGeral) * 100;

  const ctxGeral = scope.querySelector("#grafico_geral");
  if (ctxGeral) {
    if (graficoGeral && scope === document) graficoGeral.destroy();
    graficoGeral = new Chart(ctxGeral, {
      type: "bar",
      data: {
        labels: ["Aplicações", "Imóveis", "Bens", "Empresas"],
        datasets: [{ data: [pA, pI, pB, pE], backgroundColor: coresPaleta, borderRadius: 6 }]
      },
      options: baseOptions(true, anim)
    });
  }

  // G2 - Aplicações
  let pRF = totalA ? (rf / totalA) * 100 : 0;
  let pRV = totalA ? (rv / totalA) * 100 : 0;
  let pINTER = totalA ? (inter / totalA) * 100 : 0;
  let pPREV = totalA ? (prev / totalA) * 100 : 0;
  let pOFF = totalA ? (offshore / totalA) * 100 : 0;

  const ctxApp = scope.querySelector("#grafico_aplicacoes");
  if (ctxApp) {
    if (graficoAplicacoes && scope === document) graficoAplicacoes.destroy();
    graficoAplicacoes = new Chart(ctxApp, {
      type: "bar",
      data: {
        labels: ["Renda Fixa", "Renda Variável", "Fundos de Investimento", "Previdência", "Offshore"],
        datasets: [{ data: [pRF, pRV, pINTER, pPREV, pOFF], backgroundColor: coresPaleta, borderRadius: 6 }]
      },
      options: baseOptions(true, anim)
    });
  }

  // G3 - Imóveis
  let pAPT = totalI ? (apt / totalI) * 100 : 0;
  let pCASA = totalI ? (casa / totalI) * 100 : 0;
  let pTERR = totalI ? (terr / totalI) * 100 : 0;
  let pGALP = totalI ? (galp / totalI) * 100 : 0;
  let pBENS_PART = totalI ? (bens_particulares / totalI) * 100 : 0;

  const ctxImov = scope.querySelector("#grafico_imoveis");
  if (ctxImov) {
    if (graficoImoveis && scope === document) graficoImoveis.destroy();
    graficoImoveis = new Chart(ctxImov, {
      type: "bar",
      data: {
        labels: ["Apartamento", "Casa", "Terreno", "Galpão/Imóvel Rural", "Bens Particulares"],
        datasets: [{ data: [pAPT, pCASA, pTERR, pGALP, pBENS_PART], backgroundColor: coresPaleta, borderRadius: 6 }]
      },
      options: baseOptions(true, anim)
    });
  }

  // G4 - Empresas
  const ctxEmp = scope.querySelector("#grafico_empresas");
  if (ctxEmp) {
    if (graficoEmpresas && scope === document) graficoEmpresas.destroy();
    graficoEmpresas = new Chart(ctxEmp, {
      type: "bar",
      data: {
        labels: distribuicaoEmpresas.map((_, i) => "Empresa " + (i + 1)),
        datasets: [{ data: distribuicaoEmpresas, backgroundColor: coresPaleta, borderRadius: 6 }]
      },
      options: baseOptions(false, anim)
    });
  }
}

// =========================
// SIMULADOR DE PREJUIZO PREMIUM
// =========================
function initPrejuizo() {
  const ids = ["taxa_itcmd", "taxa_honorarios", "taxa_custas"];

  ids.forEach(id => {
    let el = document.getElementById(id);
    if (el) el.addEventListener("input", calcularPrejuizo);
  });

  // Carrega os dados do resumo lateral
  carregarResumoSidebar();

  // Carrega valores salvos de inputs
  const salvos = JSON.parse(sessionStorage.getItem("tributario_inputs"));
  if (salvos) {
    if (salvos.uf) document.getElementById("uf_itcmd").value = salvos.uf;
    if (salvos.itcmd) document.getElementById("taxa_itcmd").value = salvos.itcmd;
    if (salvos.honorarios) document.getElementById("taxa_honorarios").value = salvos.honorarios;
    if (salvos.custas) document.getElementById("taxa_custas").value = salvos.custas;
  }

  // Listeners para salvar ao mudar
  document.getElementById("uf_itcmd")?.addEventListener("change", salvarInputsTributario);
  document.getElementById("taxa_itcmd")?.addEventListener("input", salvarInputsTributario);
  document.getElementById("taxa_honorarios")?.addEventListener("input", salvarInputsTributario);
  document.getElementById("taxa_custas")?.addEventListener("input", salvarInputsTributario);

  calcularPrejuizo();
}

function salvarInputsTributario() {
  const uf = document.getElementById("uf_itcmd")?.value;
  const itcmd = document.getElementById("taxa_itcmd")?.value;
  const honorarios = document.getElementById("taxa_honorarios")?.value;
  const custas = document.getElementById("taxa_custas")?.value;

  sessionStorage.setItem("tributario_inputs", JSON.stringify({ uf, itcmd, honorarios, custas }));
  calcularPrejuizo();
}

function carregarResumoSidebar() {
  const totalAtual = Number(sessionStorage.getItem("total_patrimonio")) || 0;
  const dadosPatrimonio = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};
  const prev = parseValor(dadosPatrimonio.prev);

  const dadosEvolucao = JSON.parse(sessionStorage.getItem("evolucao_dados")) || { resultados: [], resultadosPrev: [] };
  const totalProjetado = (dadosEvolucao.resultados && dadosEvolucao.resultados.length > 0)
    ? dadosEvolucao.resultados[dadosEvolucao.resultados.length - 1]
    : totalAtual;

  const prevProjetado = (dadosEvolucao.resultadosPrev && dadosEvolucao.resultadosPrev.length > 0)
    ? dadosEvolucao.resultadosPrev[dadosEvolucao.resultadosPrev.length - 1]
    : prev;

  const dadosFamilia = JSON.parse(sessionStorage.getItem("familia")) || {};
  const regime = dadosFamilia.regime || "Não informado";

  const elAtual = document.getElementById("resumo_atual");
  const elPrevAtual = document.getElementById("resumo_prev_atual");
  const elProj = document.getElementById("resumo_projetado");
  const elPrevProj = document.getElementById("resumo_prev_projetada");
  const elRegime = document.getElementById("resumo_regime");

  if (elAtual) elAtual.innerText = "R$ " + totalAtual.toLocaleString("pt-BR");
  if (elPrevAtual) elPrevAtual.innerText = "R$ " + prev.toLocaleString("pt-BR");
  if (elProj) elProj.innerText = "R$ " + totalProjetado.toLocaleString("pt-BR");
  if (elPrevProj) elPrevProj.innerText = "R$ " + prevProjetado.toLocaleString("pt-BR");
  if (elRegime) elRegime.innerText = regime;

  // Armazena para uso no cálculo
  window.dadosCalculo = { totalAtual, totalProjetado, prev, prevProjetado, regime };
}

function atualizarITCMD() {
  const uf = document.getElementById("uf_itcmd").value;
  const inputITCMD = document.getElementById("taxa_itcmd");
  if (uf !== "outro") {
    inputITCMD.value = uf;
    salvarInputsTributario();
  }
}

function calcularPrejuizo() {
  if (!window.dadosCalculo) carregarResumoSidebar();

  const { totalAtual, totalProjetado, prev, prevProjetado, regime } = window.dadosCalculo;

  const itcmd = Number(document.getElementById("taxa_itcmd")?.value) || 0;
  const honorarios = Number(document.getElementById("taxa_honorarios")?.value) || 0;
  const custas = Number(document.getElementById("taxa_custas")?.value) || 0;

  const taxaTotal = itcmd + honorarios + custas;

  // Regra do Regime: Se for Comunhão (Parcial ou Universal) ou Participação Final nos Aquestos, incide sobre 50%
  const regimeLower = regime.toLowerCase();
  const multiplicadorRegime = (regimeLower.includes("comunhão") || regimeLower.includes("participação final") || regimeLower.includes("aquestos")) ? 0.5 : 1;

  // Base de Cálculo: Abate a previdência e a meação
  const baseAtual = Math.max(0, totalAtual - prev) * multiplicadorRegime;
  const baseProjetada = Math.max(0, totalProjetado - prevProjetado) * multiplicadorRegime;

  const prejuizoAtual = baseAtual * (taxaTotal / 100);
  const prejuizoProjetado = baseProjetada * (taxaTotal / 100);

  // Atualiza Tela
  const elVAtual = document.getElementById("prejuizo_atual_valor");
  const elVProj = document.getElementById("prejuizo_projetado_valor");

  if (elVAtual) elVAtual.innerText = "R$ " + prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elVProj) elVProj.innerText = "R$ " + prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  const pctAtual = totalAtual > 0 ? (prejuizoAtual / totalAtual) * 100 : 0;
  const pctProjetado = totalProjetado > 0 ? (prejuizoProjetado / totalProjetado) * 100 : 0;

  const elPAtual = document.getElementById("prejuizo_atual_pct");
  const elPProj = document.getElementById("prejuizo_projetado_pct");

  if (elPAtual) elPAtual.innerText = pctAtual.toFixed(1) + "% do total atual";
  if (elPProj) elPProj.innerText = pctProjetado.toFixed(1) + "% do total projetado";

  const elBAtual = document.getElementById("base_atual");
  const elBProj = document.getElementById("base_projetada");

  if (elBAtual) elBAtual.innerText = "R$ " + baseAtual.toLocaleString("pt-BR");
  if (elBProj) elBProj.innerText = "R$ " + baseProjetada.toLocaleString("pt-BR");

  // Alarme de Liquidez
  const dadosPatrimonio = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};
  const rf = parseValor(dadosPatrimonio.rf);
  const inter = parseValor(dadosPatrimonio.inter);
  const offshore = parseValor(dadosPatrimonio.offshore);
  const liquidez = rf + prev + inter + offshore;
  const imobilizado = totalAtual > 0 ? (totalAtual - liquidez) : 0;

  const alertaLiquidez = document.getElementById("alerta_liquidez");
  const alertaTexto = document.getElementById("alerta_liquidez_texto");

  if (alertaLiquidez && alertaTexto) {
    if (prejuizoAtual > liquidez && totalAtual > 0) {
      let pctImobilizado = ((imobilizado / totalAtual) * 100).toFixed(0);
      alertaLiquidez.style.display = "block";
      alertaTexto.innerHTML = `Seu patrimônio é <b>${pctImobilizado}% imobilizado</b>. Em caso de sucessão, sua família não terá caixa suficiente (R$ ${liquidez.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}) para pagar os <b>R$ ${prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</b> do inventário e será forçada a vender imóveis/empresas com deságio.`;
    } else {
      alertaLiquidez.style.display = "none";
    }
  }

  // Salva para o PDF
  sessionStorage.setItem("prejuizo_final", JSON.stringify({
    prejuizoAtual, prejuizoProjetado, pctAtual, pctProjetado, baseAtual, baseProjetada, taxaTotal
  }));

  // Atualiza elementos no relatório PDF (se existirem na página)
  const elPdfAtual = document.getElementById("prejuizo_atual_pdf");
  const elPdfProj = document.getElementById("prejuizo_projetado_pdf");
  const elPdfTotalProj = document.getElementById("total_projetado_pdf");

  if (elPdfAtual) elPdfAtual.innerText = "R$ " + prejuizoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elPdfProj) elPdfProj.innerText = "R$ " + prejuizoProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elPdfTotalProj) elPdfTotalProj.innerText = "R$ " + totalProjetado.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  gerarNarrativaIA(totalAtual, prejuizoAtual, regime);
  calcularPartilha(totalAtual, regime);
  calcularHolding(prejuizoAtual);
  salvarRelatorioNoHistorico();
}

// =========================
// SIMULADOR DE HOLDING VS INVENTÁRIO
// =========================
function calcularHolding(custoInventario) {
  // Uma Holding custa em média 35% do valor de um inventário total (ITCMD sobre base reduzida + Honorários fixos)
  const custoHolding = custoInventario * 0.35;
  const economia = custoInventario - custoHolding;

  const elInv = document.getElementById("holding_custo_inventario");
  const elHold = document.getElementById("holding_custo_holding");
  const elEco = document.getElementById("holding_economia");

  if (elInv) elInv.innerText = "R$ " + custoInventario.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elHold) elHold.innerText = "R$ " + custoHolding.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (elEco) elEco.innerText = "R$ " + economia.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function calcularPartilha(total, regime) {
  const familia = JSON.parse(sessionStorage.getItem("familia")) || {};
  const casado = familia.estadoCivil === "casado";
  const temFilhos = familia.temFilhos === "sim";
  const qtdFilhos = Number(familia.qtdFilhos) || 0;
  const possuiPais = familia.possuiPais === "sim";
  const qtdPais = Number(familia.qtdPais) || 0;
  const possuiColaterais = familia.possuiColaterais === "sim";
  const qtdColaterais = Number(familia.qtdColaterais) || 0;

  // Previdência não entra em inventário (isenta/excluída da partilha judicial de meação e herança)
  const dadosPatrimonio = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};
  const prev = parseValor(dadosPatrimonio.prev);
  const totalCalculo = Math.max(0, total - prev);

  let fatias = [];
  let labels = [];
  const coresBase = ["#0B53B8", "#1D6F42", "#FFB800", "#E53935", "#6F42C1"];
  let cores = [];

  let meacao = 0;
  let heranca = totalCalculo;

  // 1. DEFINIÇÃO DE MEAÇÃO E BASE DA HERANÇA
  const regimeL = regime.toLowerCase();
  const comunhaoParcial = regimeL.includes("comunhão parcial") || regimeL.includes("participação final") || regimeL.includes("aquestos");
  const comunhaoUniversal = regimeL.includes("comunhão universal");
  const separacaoTotal = regimeL.includes("separação total");
  const comunhao = comunhaoParcial || comunhaoUniversal;

  let bensComuns = 0;
  let bensParticularesCalculo = 0;

  if (casado) {
    if (comunhaoUniversal) {
      bensComuns = totalCalculo;
      bensParticularesCalculo = 0;
    } else if (comunhaoParcial) {
      bensParticularesCalculo = Math.min(totalCalculo, parseValor(dadosPatrimonio.bens_particulares));
      bensComuns = Math.max(0, totalCalculo - bensParticularesCalculo);
    } else if (separacaoTotal) {
      bensComuns = 0;
      bensParticularesCalculo = totalCalculo;
    } else {
      bensComuns = totalCalculo;
      bensParticularesCalculo = 0;
    }
  } else {
    bensComuns = 0;
    bensParticularesCalculo = totalCalculo;
  }

  // Meação (somente sobre bens comuns)
  if (casado && comunhao) {
    meacao = bensComuns * 0.5;
  }

  // Divisão da Herança dos Bens Comuns
  let herancaComuns = bensComuns * (casado && comunhao ? 0.5 : 1);
  let cHerancaComuns = 0;
  let filhosComuns = 0;
  let paisComuns = 0;
  let colateraisComuns = 0;
  let uniaoComuns = 0;

  if (temFilhos && qtdFilhos > 0) {
    if (casado && comunhao) {
      // Regra: "quando o cônjuge for meiero ele pegue os 50% e o resto da herança fique pros filhos"
      cHerancaComuns = 0;
      filhosComuns = herancaComuns;
    } else if (casado && !separacaoTotal) {
      let quotaConjuge;
      if (qtdFilhos >= 3) {
        quotaConjuge = herancaComuns * 0.25;
      } else {
        quotaConjuge = herancaComuns / (qtdFilhos + 1);
      }
      cHerancaComuns = quotaConjuge;
      filhosComuns = herancaComuns - cHerancaComuns;
    } else {
      cHerancaComuns = 0;
      filhosComuns = herancaComuns;
    }
  } else if (possuiPais && qtdPais > 0) {
    if (casado) {
      cHerancaComuns = herancaComuns / (qtdPais + 1);
      paisComuns = herancaComuns - cHerancaComuns;
    } else {
      cHerancaComuns = 0;
      paisComuns = herancaComuns;
    }
  } else if (casado) {
    cHerancaComuns = herancaComuns;
  } else if (possuiColaterais && qtdColaterais > 0) {
    colateraisComuns = herancaComuns;
  } else {
    uniaoComuns = herancaComuns;
  }

  // Divisão da Herança dos Bens Particulares
  let herancaParticulares = bensParticularesCalculo;
  let cHerancaParticulares = 0;
  let filhosParticulares = 0;
  let paisParticulares = 0;
  let colateraisParticulares = 0;
  let uniaoParticulares = 0;

  if (temFilhos && qtdFilhos > 0) {
    if (casado && (comunhaoParcial || separacaoTotal)) {
      // Para Comunhão Parcial / Participação Final nos Aquestos ou Separação Total, divide igualmente entre cônjuge e filhos
      let quotaConjuge = herancaParticulares / (qtdFilhos + 1);
      cHerancaParticulares = quotaConjuge;
      filhosParticulares = herancaParticulares - cHerancaParticulares;
    } else {
      // Comunhão Universal (ou outros regimes não especificados)
      cHerancaParticulares = 0;
      filhosParticulares = herancaParticulares;
    }
  } else {
    // Se não tiverem filhos
    if (casado && comunhaoParcial) {
      // "se não tiverem filhos os bens particulares vão direto pro cônjuge"
      cHerancaParticulares = herancaParticulares;
      filhosParticulares = 0;
    } else if (possuiPais && qtdPais > 0) {
      if (casado) {
        cHerancaParticulares = herancaParticulares / (qtdPais + 1);
        paisParticulares = herancaParticulares - cHerancaParticulares;
      } else {
        cHerancaParticulares = 0;
        paisParticulares = herancaParticulares;
      }
    } else if (casado) {
      cHerancaParticulares = herancaParticulares;
    } else if (possuiColaterais && qtdColaterais > 0) {
      colateraisParticulares = herancaParticulares;
    } else {
      uniaoParticulares = herancaParticulares;
    }
  }

  // Total da Herança + Meação do Cônjuge (Unificados em uma única barra/fatia)
  let totalHerancaConjuge = cHerancaComuns + cHerancaParticulares;
  let totalConjuge = meacao + totalHerancaConjuge;
  if (totalConjuge > 0) {
    labels.push("Cônjuge (Meação + Herança)");
    fatias.push(totalConjuge);
  }

  // Total dos Filhos
  let totalFilhos = filhosComuns + filhosParticulares;
  if (totalFilhos > 0) {
    const quotaPorFilho = totalFilhos / qtdFilhos;
    for (let i = 1; i <= qtdFilhos; i++) {
      labels.push(`Filho ${i}`);
      fatias.push(quotaPorFilho);
    }
  }

  // Total dos Pais
  let totalPais = paisComuns + paisParticulares;
  if (totalPais > 0) {
    const quotaPorPai = totalPais / qtdPais;
    for (let i = 1; i <= qtdPais; i++) {
      labels.push(qtdPais === 2 ? (i === 1 ? "Pai" : "Mãe") : "Ascendente");
      fatias.push(quotaPorPai);
    }
  }

  // Total dos Colaterais
  let totalColaterais = colateraisComuns + colateraisParticulares;
  if (totalColaterais > 0) {
    const quotaPorColateral = totalColaterais / qtdColaterais;
    for (let i = 1; i <= qtdColaterais; i++) {
      labels.push(`Colateral ${i}`);
      fatias.push(quotaPorColateral);
    }
  }

  // União
  let totalUniao = uniaoComuns + uniaoParticulares;
  if (totalUniao > 0) {
    labels.push("Município / DF / União");
    fatias.push(totalUniao);
  }

  // Definir herança para calcularSegundaMorte
  heranca = totalCalculo - meacao;

  // Atribui cores consistentes: Cônjuge sempre Azul (0), Filhos em diante
  labels.forEach((label, i) => {
    if (label.includes("Cônjuge")) {
      cores.push(coresBase[0]);
    } else {
      cores.push(coresBase[(i % (coresBase.length - 1)) + 1] || coresBase[1]);
    }
  });

  // SALVA DADOS PARA O PDF
  sessionStorage.setItem("partilha_dados", JSON.stringify({ labels, fatias, cores }));

  // 3. RENDERIZAR LISTA TEXTUAL
  const lista = document.getElementById("lista_partilha");
  if (lista) {
    let html = '<ul style="list-style: none; padding: 0;">';
    labels.forEach((label, i) => {
      let pct = (fatias[i] / total) * 100;
      html += `<li style="margin-bottom: 10px; padding-left: 15px; border-left: 3px solid ${cores[i % cores.length]}">
        <strong>${label}:</strong> R$ ${fatias[i].toLocaleString("pt-BR", { maximumFractionDigits: 0 })} 
        <span style="opacity: 0.6; font-size: 12px;">(${pct.toFixed(1)}%)</span>
      </li>`;
    });
    
    html += "</ul>";
    lista.innerHTML = html;
  }

  // Preenchimento da Previdência Sucessória (fora da herança/segunda morte)
  const divPrev = document.getElementById("container_previdencia_sucessao");
  if (divPrev) {
    if (prev > 0) {
      let pctPrev = (prev / total) * 100;
      divPrev.style.display = "block";
      divPrev.innerHTML = `<strong>💜 Previdência Privada (Transmissão Direta):</strong> R$ ${prev.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} <span style="opacity: 0.7; font-size: 12px;">(${pctPrev.toFixed(1)}% do patrimônio total)</span>.<br>Por lei, os planos de previdência privada (VGBL/PGBL) não entram no processo de inventário, sendo repassados diretamente aos beneficiários indicados, sem incidência de ITCMD na maioria dos estados e sem custos de partilha.`;
    } else {
      divPrev.style.display = "none";
    }
  }

  // 4. RENDERIZAR GRÁFICO
  const ctx = document.getElementById("grafico_partilha");
  if (ctx) {
    // Destrói gráfico anterior se existir
    const existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: fatias,
          backgroundColor: cores,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff',
            formatter: (v) => {
              let p = (v / total) * 100;
              return p > 5 ? p.toFixed(0) + '%' : '';
            }
          }
        }
      }
    });
  }

  // CALCULA SEGUNDA MORTE
  let fatiaConjugeTotal = 0;
  labels.forEach((l, i) => {
    if (l.includes("Cônjuge")) fatiaConjugeTotal += fatias[i];
  });

  calcularSegundaMorte(total, heranca, meacao, fatiaConjugeTotal, labels, fatias);
}

function calcularSegundaMorte(totalOriginal, herancaPrimeira, meacaoPrimeira, valorConjuge, labelsPrimeira, fatiasPrimeira) {
  const familia = JSON.parse(sessionStorage.getItem("familia")) || {};

  // Ocultar página se solteiro ou sem valor para o cônjuge
  const pgSegunda = document.getElementById("pagina_segunda_morte");
  const footerUltima = document.querySelector("#area-relatorio .pagina:last-child .footer-relatorio");

  if (familia.estadoCivil !== "casado" || valorConjuge <= 0) {
    if (pgSegunda) {
      pgSegunda.style.display = "none";
    }
    sessionStorage.removeItem("segunda_morte_dados");
    return; // Encerra aqui se não for casado
  } else {
    if (pgSegunda) {
      pgSegunda.style.display = "block";
    }
  }

  const temFilhos = familia.temFilhos === "sim";
  const qtdFilhos = Number(familia.qtdFilhos) || 0;
  const conjugePossuiPais = familia.conjugePossuiPais === "sim";
  const conjugeQtdPais = Number(familia.conjugeQtdPais) || 0;
  const conjugePossuiColaterais = familia.conjugePossuiColaterais === "sim";
  const conjugeQtdColaterais = Number(familia.conjugeQtdColaterais) || 0;

  let fatiasSegunda = [];
  let labelsSegunda = [];
  const coresBase = ["#0B53B8", "#1D6F42", "#FFB800", "#E53935", "#6F42C1"];
  let coresSegunda = [];

  // Descrição Estágio 1
  const elT1 = document.getElementById("texto_primeira_morte");
  if (elT1) {
    elT1.innerHTML = `No falecimento do cliente, o patrimônio de R$ ${totalOriginal.toLocaleString("pt-BR")} é dividido entre os herdeiros diretos. O cônjuge recebe <strong>R$ ${valorConjuge.toLocaleString("pt-BR")}</strong> (somando meação e herança).`;
  }

  // Divisão Estágio 2 (Morte do Cônjuge)
  // O montante da segunda morte é o que o cônjuge recebeu + o que ele já tinha (meação)
  let totalSegunda = valorConjuge;

  if (temFilhos && qtdFilhos > 0) {
    // Se houver filhos, tudo vai para os filhos (que são herdeiros de ambos)
    let valorPorFilho = totalSegunda / qtdFilhos;
    for (let i = 1; i <= qtdFilhos; i++) {
      labelsSegunda.push(`Filho ${i}`);
      fatiasSegunda.push(valorPorFilho);
    }
  } else if (conjugePossuiPais && conjugeQtdPais > 0) {
    // Se não houver filhos, vai para os pais do cônjuge
    let valorPorPai = totalSegunda / conjugeQtdPais;
    for (let i = 1; i <= conjugeQtdPais; i++) {
      labelsSegunda.push(`Pai/Mãe do Cônjuge ${i}`);
      fatiasSegunda.push(valorPorPai);
    }
  } else if (conjugePossuiColaterais && conjugeQtdColaterais > 0) {
    // Se não houver filhos nem pais, vai para os colaterais do cônjuge
    let valorPorParente = totalSegunda / conjugeQtdColaterais;
    for (let i = 1; i <= conjugeQtdColaterais; i++) {
      labelsSegunda.push(`Parente Colateral (Cônjuge) ${i}`);
      fatiasSegunda.push(valorPorParente);
    }
  } else {
    labelsSegunda.push("Herdeiros do Cônjuge / Outros");
    fatiasSegunda.push(totalSegunda);
  }

  // Atribui cores: na segunda morte, como não há cônjuge, pulamos o azul (coresBase[0])
  // para que o Filho 1 continue sendo Verde (coresBase[1])
  labelsSegunda.forEach((label, i) => {
    coresSegunda.push(coresBase[((i + 1) % coresBase.length)] || coresBase[1]);
  });

  // Salva dados para o PDF poder redesenhar no preview
  sessionStorage.setItem("segunda_morte_dados", JSON.stringify({
    labels: labelsSegunda,
    fatias: fatiasSegunda,
    cores: coresSegunda
  }));

  // Renderizar Estágio 2
  const elT2 = document.getElementById("texto_segunda_morte");
  if (elT2) {
    elT2.innerHTML = `Com o falecimento posterior do cônjuge, o montante acumulado de <strong>R$ ${totalSegunda.toLocaleString("pt-BR")}</strong> segue para os seus respectivos herdeiros legais.`;
  }

  // Renderizar Gráfico Segunda Morte
  const ctx = document.getElementById("grafico_segunda_morte");
  if (ctx) {
    const existingChart = Chart.getChart(ctx);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labelsSegunda,
        datasets: [{
          data: fatiasSegunda,
          backgroundColor: coresSegunda,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff',
            formatter: (v) => {
              let p = (v / totalSegunda) * 100;
              return p > 5 ? p.toFixed(0) + '%' : '';
            }
          }
        }
      }
    });
  }

  // Lista Segunda Morte
  const lista = document.getElementById("lista_segunda_morte");
  if (lista) {
    let html = '<ul style="list-style: none; padding: 0;">';
    labelsSegunda.forEach((label, i) => {
      let pct = (fatiasSegunda[i] / totalSegunda) * 100;
      html += `<li style="margin-bottom: 10px; padding-left: 15px; border-left: 3px solid ${coresSegunda[i % coresSegunda.length]}">
        <strong>${label}:</strong> R$ ${fatiasSegunda[i].toLocaleString("pt-BR", { maximumFractionDigits: 0 })} 
        <span style="opacity: 0.6; font-size: 12px;">(${pct.toFixed(1)}%)</span>
      </li>`;
    });
    html += "</ul>";
    lista.innerHTML = html;
  }

  // Alerta de Destino (Saída de Linhagem)
  const alerta = document.getElementById("alerta_destino");
  if (alerta) {
    if (!temFilhos && (conjugePossuiPais || conjugePossuiColaterais)) {
      alerta.style.display = "block";
      alerta.style.background = "rgba(229, 57, 53, 0.08)";
      alerta.style.borderLeft = "4px solid #E53935";
      alerta.style.color = "#c62828";
      alerta.innerHTML = `<strong>⚠️ Alerta de Destino:</strong> Como não há descendentes diretos, o patrimônio originalmente construído pelo cliente acaba saindo da sua linhagem familiar e migrando integralmente para a família do cônjuge na segunda morte.`;
    } else {
      alerta.style.display = "block";
      alerta.style.background = "rgba(11, 83, 184, 0.05)";
      alerta.style.borderLeft = "4px solid #0B53B8";
      alerta.style.color = "#0B53B8";
      alerta.innerHTML = `<strong>ℹ️ Continuidade Familiar:</strong> O patrimônio segue para os descendentes comuns, mantendo a unidade familiar ao longo das gerações.`;
    }
  }
}

function gerarNarrativaIA(total, prejuizo, regime) {
  const el = document.getElementById("narrativa_ia");
  if (!el) return;

  const familia = JSON.parse(sessionStorage.getItem("familia")) || {};
  const nome = escapeHTML(familia.nome) || "do cliente";
  const dadosPat = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};

  // Identifica a maior classe de ativos
  const classes = [
    { nome: "Aplicações Financeiras", valor: parseValor(dadosPat.rf) + parseValor(dadosPat.rv) + parseValor(dadosPat.inter) + parseValor(dadosPat.prev) },
    { nome: "Bens Imóveis", valor: parseValor(dadosPat.apt) + parseValor(dadosPat.casa) + parseValor(dadosPat.terr) + parseValor(dadosPat.galp) },
    { nome: "Empresas", valor: (dadosPat.empresas || []).reduce((acc, e) => acc + (parseValor(e.valor) * (e.pct / 100)), 0) }
  ];

  const maiorClasse = classes.reduce((prev, current) => (prev.valor > current.valor) ? prev : current);

  let texto = `O planejamento patrimonial de <strong>${nome}</strong> apresenta um patrimônio consolidado de <strong>R$ ${total.toLocaleString("pt-BR")}</strong>, com maior concentração em <strong>${maiorClasse.nome}</strong>. `;

  texto += `No cenário atual, sob o regime de <strong>${regime}</strong>, identificamos um prejuízo tributário em processo de sucessão de <strong>R$ ${prejuizo.toLocaleString("pt-BR")}</strong> (considerando ITCMD, honorários e custas). `;

  if (maiorClasse.nome === "Empresas" && maiorClasse.valor > 0) {
    texto += `Destaca-se que a sucessão de cotas empresariais exige atenção especial devido à liquidez e avaliação de mercado. `;
  }

  texto += `A estrutura Pace recomenda a avaliação de ferramentas de otimização, como Holding ou Previdência, para reduzir este impacto tributário e garantir a perenidade do legado familiar.`;

  el.innerHTML = texto;
}


// =========================
// PREVIEW E GERAR PDF
// =========================
function abrirPreview() {
  const modal = document.getElementById("modal-preview");
  const modalBody = document.getElementById("modal-body-pdf");
  const reportArea = document.getElementById("area-relatorio");

  // Limpa o modal antes de clonar
  modalBody.innerHTML = "";

  // Clona o conteúdo
  const clone = reportArea.cloneNode(true);
  clone.id = "area-relatorio-clone";

  // Limpa TODOS os estilos inline que vieram do original (como top: -9999px)
  clone.removeAttribute("style");
  
  // Aplica estilos necessários para o preview
  clone.style.display = "block";
  clone.style.position = "relative";
  clone.style.width = "100%";
  clone.style.margin = "0 auto";
  clone.style.backgroundColor = "#fff";
  clone.style.boxShadow = "0 10px 30px rgba(0,0,0,0.1)";

  modalBody.appendChild(clone);

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Redesenha todos os gráficos no clone
  const dados = JSON.parse(sessionStorage.getItem("patrimonio_dados")) || {};

  // Chamamos as funções passando o clone como escopo
  criarGraficos(dados, clone);
  renderizarGraficoEvolucao(clone);

  // Re-executa o cálculo de prejuízo para preencher partilha e segunda morte no clone
  if (typeof calcularPrejuizo === "function") {
    // Note: calcularPrejuizo chama calcularPartilha e calcularSegundaMorte internamente
    // Vamos garantir que elas usem o clone
    const totalAtual = Number(sessionStorage.getItem("total_patrimonio")) || 0;
    const dadosFamilia = JSON.parse(sessionStorage.getItem("familia")) || {};
    const regime = dadosFamilia.regime || "Não informado";

    // Forçamos o recálculo da partilha no clone
    recalculaGraficosEspeciaisPDF(totalAtual, regime, clone);
  }
}

function recalculaGraficosEspeciaisPDF(total, regime, scope = document) {
  const dadosPartilha = JSON.parse(sessionStorage.getItem("partilha_dados"));
  
  if (dadosPartilha && scope.querySelector("#grafico_partilha")) {
    const canvasPartilha = scope.querySelector("#grafico_partilha");
    new Chart(canvasPartilha, {
      type: "doughnut",
      data: {
        labels: dadosPartilha.labels,
        datasets: [{
          data: dadosPartilha.fatias,
          backgroundColor: dadosPartilha.cores || ["#0B53B8", "#1D6F42", "#FFB800", "#E53935", "#6F42C1"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, datalabels: { display: false } }
      }
    });
  }



  // Segunda Morte (apenas se for CASADO e houver dados)
  const dadosFamiliaSM = JSON.parse(sessionStorage.getItem("familia")) || {};
  const isCasado = dadosFamiliaSM.estadoCivil === "casado";
  const dadosSM = JSON.parse(sessionStorage.getItem("segunda_morte_dados"));
  const canvasSM = scope.querySelector("#grafico_segunda_morte");
  const containerSM = scope.querySelector("#pagina_segunda_morte");

  if (isCasado && dadosSM && canvasSM) {
    if (containerSM) containerSM.style.display = "block";
    new Chart(canvasSM, {
      type: "doughnut",
      data: {
        labels: dadosSM.labels,
        datasets: [{
          data: dadosSM.fatias,
          backgroundColor: dadosSM.cores || ["#1D6F42", "#0B53B8", "#FFB800", "#E53935", "#6F42C1"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, datalabels: { display: false } }
      }
    });
  } else {
    if (containerSM) containerSM.style.display = "none";
  }
}

function fecharPreview() {
  const modal = document.getElementById("modal-preview");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

async function gerarPDF() {
  const elemento = document.querySelector("#modal-body-pdf .pdf-container");
  if (!elemento) {
    alert("Por favor, abra o Preview antes de baixar.");
    return;
  }

  const btn = document.querySelector(".modal-actions button:last-child");
  const textoOriginal = btn.innerText;
  btn.innerText = "Processando...";
  btn.disabled = true;

  try {
    document.body.classList.add("pdf-exporting");

    // Remove temporariamente o scroll do modal para a captura pegar todas as páginas
    const modalBody = document.getElementById("modal-body-pdf");
    const originalOverflow = modalBody.style.overflow;
    const originalMaxHeight = modalBody.style.maxHeight;
    modalBody.style.overflow = "visible";
    modalBody.style.maxHeight = "none";

    // Configurações otimizadas para captura manual
    const h2c = window.html2canvas || html2canvas;
    const canvas = await h2c(elemento, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: elemento.scrollHeight
    });

    // Restaura o modal
    modalBody.style.overflow = originalOverflow;
    modalBody.style.maxHeight = originalMaxHeight;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Criação manual do PDF via jsPDF
    const { jsPDF } = window.jspdf ? window.jspdf : window;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // Adiciona a imagem ao PDF (tratando múltiplas páginas)
    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    // Primeira página
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    // Páginas seguintes
    while (heightLeft > 5) { // Tolerância de 5mm para evitar páginas em branco
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    // DISPARO DO DOWNLOAD (Método de link direto para burlar bloqueios)
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'Relatorio_Pace_Capital.pdf';
    document.body.appendChild(a);
    a.click();

    // Limpeza
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

  } catch (e) {
    console.error("Erro no PDF:", e);
    alert("Ocorreu um erro técnico. Por favor, tente usar o navegador Google Chrome ou Microsoft Edge.");
  } finally {
    document.body.classList.remove("pdf-exporting");
    btn.innerText = textoOriginal;
    btn.disabled = false;
  }
}

// Ativa animação quando o elemento entra na tela
document.addEventListener('revealed', (e) => {
  const container = e.target;
  const canvas = container.querySelector('canvas');
  if (canvas) {
    const chart = Chart.getChart(canvas);
    if (chart) {
      chart.options.animation.duration = 2000;
      chart.update();
    }
  }
});

// Auto-salvar no localStorage do Dashboard
function salvarRelatorioNoHistorico() {
  const familiaStr = sessionStorage.getItem("familia");
  if (!familiaStr) return;

  const familia = JSON.parse(familiaStr);
  const nomeCliente = familia.nome || "Cliente";
  const nomeAssessor = sessionStorage.getItem("nome_assessor") || "Assessor";
  const dataReuniao = sessionStorage.getItem("data_reuniao") || new Date().toLocaleDateString("pt-BR");
  
  const totalPatrimonio = Number(sessionStorage.getItem("total_patrimonio")) || 0;
  const prejuizoFinalStr = sessionStorage.getItem("prejuizo_final");
  let prejuizoTributario = 0;
  if (prejuizoFinalStr) {
    const finalObj = JSON.parse(prejuizoFinalStr);
    prejuizoTributario = finalObj.prejuizoAtual || 0;
  }

  // Identificador da simulação
  let reportId = sessionStorage.getItem("current_report_id");
  if (!reportId) {
    reportId = "rep_" + Date.now();
    sessionStorage.setItem("current_report_id", reportId);
  }

  // Chaves do sessionStorage a persistir
  const sessionData = {};
  const keysToSave = [
    "patrimonio_dados",
    "total_patrimonio",
    "nome_assessor",
    "data_reuniao",
    "familia",
    "evolucao_dados",
    "tributario_inputs",
    "prejuizo_final",
    "partilha_dados",
    "segunda_morte_dados",
    "current_report_id"
  ];
  keysToSave.forEach(key => {
    const val = sessionStorage.getItem(key);
    if (val) {
      try {
        sessionData[key] = JSON.parse(val);
      } catch (e) {
        sessionData[key] = val;
      }
    }
  });

  const relatorio = {
    id: reportId,
    nomeCliente,
    nomeAssessor,
    dataReuniao,
    totalPatrimonio,
    prejuizoTributario,
    dataCriacao: new Date().toISOString(),
    dadosSessao: sessionData
  };

  const STORAGE_KEY = "pace_relatorios";
  let relatorios = [];
  try {
    relatorios = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    relatorios = [];
  }

  const index = relatorios.findIndex(r => r.id === reportId);
  if (index !== -1) {
    // Preserva a data de criação original ao atualizar
    relatorio.dataCriacao = relatorios[index].dataCriacao || relatorio.dataCriacao;
    relatorios[index] = relatorio;
  } else {
    relatorios.push(relatorio);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(relatorios));
}
