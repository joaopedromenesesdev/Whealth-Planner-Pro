let g1, g2, g3, g4;
Chart.register(ChartDataLabels);

// =========================
// FORMATAÇÃO
// =========================
function formatar(input) {
  let value = input.value.replace(/\D/g, "");

  // Converte para decimal (centavos)
  let val = (Number(value) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (value === "") {
    input.value = "";
  } else {
    input.value = val;
  }
}

function pegar(id) {
  let el = document.getElementById(id);
  if (!el || !el.value) return 0;

  // Remove pontos e troca vírgula por ponto para o Number()
  let valor = el.value
    .replace(/\./g, "")
    .replace(",", ".");

  return Number(valor) || 0;
}

function formatarPercentual(v) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + "%";
}

// =========================
// ANIMAÇÃO DE NÚMEROS
// =========================
function animateValue(id, start, end, duration) {
  if (start === end) return;
  const obj = document.getElementById(id);
  const range = end - start;
  let current = start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.abs(Math.floor(duration / range));

  // Se o range for muito grande, usamos um passo fixo por frame
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (easeOutExpo)
    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

    current = start + (range * easeProgress);
    obj.innerText = "R$ " + Math.floor(current).toLocaleString("pt-BR");

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      obj.innerText = "R$ " + end.toLocaleString("pt-BR");
    }
  }

  requestAnimationFrame(update);
}

// =========================
// EMPRESAS DINÂMICAS
// =========================


document.getElementById("tem_empresas").addEventListener("change", function () {
  let area = document.getElementById("area_empresas");

  if (this.value === "sim") {
    area.style.display = "block";
  } else {
    area.style.display = "none";
    document.getElementById("inputs_empresas").innerHTML = "";
  }

  salvarPatrimonio();
});

document.getElementById("qtd_empresas").addEventListener("input", function () {
  let qtd = Number(this.value);
  let container = document.getElementById("inputs_empresas");

  let html = "";

  for (let i = 1; i <= qtd; i++) {
    html += `
      <div class="empresa_item" style="background: #f8faff; padding: 20px; border-radius: 12px; border: 1px dashed rgba(11, 83, 184, 0.2); margin-top: 15px;">
        <h5 class="empresa_nome_display" style="margin-bottom: 10px; color: #0B53B8; font-size: 14px;">Empresa ${i}</h5>
        
        <div class="input-group">
          <label>CNPJ (Autopreenchimento Inteligente)</label>
          <input type="text" class="empresa_cnpj" placeholder="00.000.000/0000-00">
        </div>

        <div class="input-group" style="margin-top: 10px;">
          <label>Valor da Empresa</label>
          <div class="input-box">
            <span>R$</span>
            <input type="text" class="empresa_valor">
          </div>
        </div>

        <div class="input-group" style="margin-top: 10px;">
          <label>Sua participação (%)</label>
          <input type="number" class="empresa_pct" placeholder="Ex: 50">
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  adicionarEventosEmpresas();
  salvarPatrimonio();
});

function adicionarEventosEmpresas() {
  document.querySelectorAll(".empresa_valor").forEach(input => {
    input.addEventListener("input", function () {
      formatar(this);
      salvarPatrimonio();
    });
  });

  document.querySelectorAll(".empresa_pct").forEach(input => {
    input.addEventListener("input", salvarPatrimonio);
  });

  document.querySelectorAll(".empresa_cnpj").forEach(input => {
    input.addEventListener("input", async function () {
      let cnpj = this.value.replace(/\D/g, "");
      
      // Aplicar Máscara
      if (cnpj.length <= 14) {
        let m = cnpj;
        if (m.length > 12) m = m.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2}).*/, "$1.$2.$3/$4-$5");
        else if (m.length > 8) m = m.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, "$1.$2.$3/$4");
        else if (m.length > 5) m = m.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, "$1.$2.$3");
        else if (m.length > 2) m = m.replace(/^(\d{2})(\d{1,3}).*/, "$1.$2");
        this.value = m;
      }

      let displayEl = this.closest(".empresa_item").querySelector(".empresa_nome_display");

      if (cnpj.length === 14) {
        displayEl.innerHTML = `<span class="loading-dots">Buscando dados da empresa</span>`;
        try {
          let response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
          if (response.ok) {
            let data = await response.json();
            displayEl.innerHTML = `<i class="icon-check" style="color: #1D6F42"></i> ${escapeHTML(data.nome_fantasia || data.razao_social)}`;

            // Preenchimento do Valor (Capital Social)
            if (data.capital_social > 0) {
              let valorInput = input.closest(".empresa_item").querySelector(".empresa_valor");
              
              // Passa o valor para o formato que a função formatar() entende (apenas números, centavos)
              // Multiplicamos por 100 para compensar o /100 da função formatar()
              valorInput.value = (data.capital_social * 100).toString();
              formatar(valorInput);
              valorInput.classList.add("filled");
            }

          } else {
            displayEl.innerText = "Empresa não encontrada";
          }
        } catch (e) {
          displayEl.innerText = "Erro na conexão";
        }
        salvarPatrimonio();
      } else if (cnpj.length === 0) {
        displayEl.innerText = "Empresa";
        salvarPatrimonio();
      }
    });
  });
}

// =========================
// EVENTOS INPUTS
// =========================
document.querySelectorAll("input, select").forEach(input => {
  input.addEventListener("input", function () {
    if (this.type === "text") formatar(this);
    checkFilled(this);
    salvarPatrimonio();
  });
});

function checkFilled(el) {
  if (el.value && el.value !== "0" && el.value !== "" && el.value !== "Selecione") {
    el.classList.add("filled");
  } else {
    el.classList.remove("filled");
  }
}

// =========================
// CONFIG GRÁFICOS
// =========================
function baseOptions(isPercent = true, showDatalabels = false) {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 }, // Começa sem animação para não "vazar" antes do scroll
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
        display: showDatalabels,
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
      y: {
        grid: { display: false }
      }
    }
  };
}

// =========================
// CÁLCULO
// =========================
function calcular() {

  let valoresEmpresas = document.querySelectorAll(".empresa_valor");
  let pctsEmpresas = document.querySelectorAll(".empresa_pct");

  let totalEmpresas = 0;
  let distribuicaoEmpresas = [];

  valoresEmpresas.forEach((input, i) => {
    let valorTexto = input.value.replace(/\./g, "").replace(",", ".");
    let valor = Number(valorTexto) || 0;
    let pct = Number(pctsEmpresas[i]?.value) || 0;

    let valorCliente = valor * (pct / 100);

    totalEmpresas += valorCliente;
    distribuicaoEmpresas.push(valorCliente);
  });

  let rf = pegar("rf");
  let rv = pegar("rv");
  let inter = pegar("inter");
  let prev = pegar("prev");
  let offshore = pegar("offshore");

  let totalA = rf + rv + inter + prev + offshore;

  let apt = pegar("apt");
  let casa = pegar("casa");
  let terr = pegar("terr");
  let galp = pegar("galp");

  let totalI = apt + casa + terr + galp;

  let bens = pegar("bens");

  let totalGeral = totalA + totalI + bens + totalEmpresas;

  // 🔥 SALVA TOTAL
  sessionStorage.setItem("total_patrimonio", totalGeral);

  // 🔥 SALVA DADOS DOS GRÁFICOS (IMPORTANTE PRO PDF)
  sessionStorage.setItem("dados_graficos", JSON.stringify({
    aplicacoes: totalA,
    imoveis: totalI,
    bens: bens,
    empresas: totalEmpresas
  }));

  const totalEl = document.getElementById("total");
  const valorAnterior = window.valorTotalAntigo || 0;
  window.valorTotalAntigo = totalGeral;

  animateValue("total", valorAnterior, totalGeral, 650);

  if (totalGeral === 0) return;

  let pA = (totalA / totalGeral) * 100;
  let pI = (totalI / totalGeral) * 100;
  let pB = (bens / totalGeral) * 100;
  let pE = (totalEmpresas / totalGeral) * 100;

  let pRF = totalA ? (rf / totalA) * 100 : 0;
  let pRV = totalA ? (rv / totalA) * 100 : 0;
  let pINTER = totalA ? (inter / totalA) * 100 : 0;
  let pPREV = totalA ? (prev / totalA) * 100 : 0;
  let pOFF = totalA ? (offshore / totalA) * 100 : 0;

  let pAPT = totalI ? (apt / totalI) * 100 : 0;
  let pCASA = totalI ? (casa / totalI) * 100 : 0;
  let pTERR = totalI ? (terr / totalI) * 100 : 0;
  let pGALP = totalI ? (galp / totalI) * 100 : 0;

  if (g1) g1.destroy();
  if (g2) g2.destroy();
  if (g3) g3.destroy();
  if (g4) g4.destroy();

  const cor = "#0B53B8";

  g1 = new Chart(document.getElementById("g1"), {
    type: "bar",
    data: {
      labels: ["Aplicações", "Imóveis", "Bens", "Empresas"],
      datasets: [{ data: [pA, pI, pB, pE], backgroundColor: cor }]
    },
    options: {
      ...baseOptions(true, true),
      onClick: (evt, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const labels = ["Aplicações Financeiras", "Bens Imóveis", "Bens Móveis", "Empresas"];
          const targetLabel = labels[index];

          // Procura o título h2 correspondente e faz scroll
          const headers = document.querySelectorAll("h2");
          headers.forEach(h => {
            if (h.innerText.includes(targetLabel)) {
              h.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              h.parentElement.style.ring = "2px solid var(--primary)";
              h.parentElement.classList.add("highlight-card");
              setTimeout(() => h.parentElement.classList.remove("highlight-card"), 2000);
            }
          });
        }
      },
      onHover: (evt, elements) => {
        evt.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    }
  });

  g2 = new Chart(document.getElementById("g2"), {
    type: "bar",
    data: {
      labels: ["Renda Fixa", "Renda Variável", "Fundos de Investimento", "Previdência", "Offshore"],
      datasets: [{ data: [pRF, pRV, pINTER, pPREV, pOFF], backgroundColor: cor }]
    },
    options: baseOptions(true, true)
  });

  g3 = new Chart(document.getElementById("g3"), {
    type: "bar",
    data: {
      labels: ["Apartamento", "Casa", "Terreno", "Galpão/Imóvel Rural"],
      datasets: [{ data: [pAPT, pCASA, pTERR, pGALP], backgroundColor: cor }]
    },
    options: baseOptions(true, true)
  });

  g4 = new Chart(document.getElementById("g4"), {
    type: "bar",
    data: {
      labels: distribuicaoEmpresas.map((_, i) => "Empresa " + (i + 1)),
      datasets: [{ data: distribuicaoEmpresas, backgroundColor: cor }]
    },
    options: baseOptions(false, true)
  });
}

// =========================
// SALVAR
// =========================
function salvarPatrimonio() {

  const empresas = [];

  document.querySelectorAll(".empresa_item").forEach(item => {
    empresas.push({
      nome: item.querySelector(".empresa_nome_display").innerText,
      cnpj: item.querySelector(".empresa_cnpj").value,
      valor: item.querySelector(".empresa_valor").value,
      pct: item.querySelector(".empresa_pct").value
    });
  });

  const dados = {
    rf: document.getElementById("rf").value,
    rv: document.getElementById("rv").value,
    inter: document.getElementById("inter").value,
    prev: document.getElementById("prev").value,
    offshore: document.getElementById("offshore").value,

    apt: document.getElementById("apt").value,
    casa: document.getElementById("casa").value,
    terr: document.getElementById("terr").value,
    galp: document.getElementById("galp").value,

    bens: document.getElementById("bens").value,

    temEmpresas: document.getElementById("tem_empresas").value,
    qtdEmpresas: document.getElementById("qtd_empresas").value,
    empresas: empresas
  };

  sessionStorage.setItem("patrimonio_dados", JSON.stringify(dados));

  calcular();
  document.querySelectorAll("input, select").forEach(checkFilled);
};

// =========================
// INIT
// =========================
window.onload = function () {

  const dados = JSON.parse(sessionStorage.getItem("patrimonio_dados"));
  if (!dados) return;

  Object.keys(dados).forEach(id => {
    if (document.getElementById(id)) {
      document.getElementById(id).value = dados[id];
    }
  });

  if (dados.temEmpresas === "sim") {
    document.getElementById("area_empresas").style.display = "block";
  }

  let container = document.getElementById("inputs_empresas");

  if (dados.empresas) {
    dados.empresas.forEach((emp, i) => {
      container.innerHTML += `
        <div class="empresa_item" style="background: #f8faff; padding: 20px; border-radius: 12px; border: 1px dashed rgba(11, 83, 184, 0.2); margin-top: 15px;">
          <h5 class="empresa_nome_display" style="margin-bottom: 10px; color: #0B53B8; font-size: 14px;">${escapeHTML(emp.nome) || `Empresa ${i + 1}`}</h5>
          
          <div class="input-group">
            <label>CNPJ (Autopreenchimento Inteligente)</label>
            <input type="text" class="empresa_cnpj" placeholder="00.000.000/0000-00" value="${emp.cnpj || ''}">
          </div>

          <div class="input-group" style="margin-top: 10px;">
            <label>Valor da Empresa</label>
            <div class="input-box">
              <span>R$</span>
              <input type="text" class="empresa_valor" value="${emp.valor}">
            </div>
          </div>

          <div class="input-group" style="margin-top: 10px;">
            <label>Sua participação (%)</label>
            <input type="number" class="empresa_pct" value="${emp.pct}">
          </div>
        </div>
      `;
    });

    adicionarEventosEmpresas();
  }

  calcular();

  // ATIVA AUTO-SAVE: Sempre que mudar um campo, salva automaticamente
  document.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("input", salvarPatrimonio);
  });
}

// =========================
// MODAL COLAR DADOS
// =========================
function abrirModalColar() {
  document.getElementById("modal_colar").style.display = "flex";
  document.getElementById("texto_colar").value = "";
  document.getElementById("texto_colar").focus();
}

function fecharModalColar() {
  document.getElementById("modal_colar").style.display = "none";
}

function processarColagem() {
  const texto = document.getElementById("texto_colar").value;
  if (!texto) {
    alert("Por favor, cole os dados do Excel primeiro.");
    return;
  }

  const lines = texto.split("\n");
  let dadosImportados = 0;

  lines.forEach(line => {
    // Excel separa colunas por TAB (\t)
    const parts = line.split("\t");
    if (parts.length >= 2) {
      const id = parts[0].trim().toLowerCase();
      const valorRaw = parts[1].trim();

      const input = document.getElementById(id);
      if (input) {
        const valorLimpo = valorRaw.replace(/[R$\s.]/g, "").replace(",", ".");
        const num = parseFloat(valorLimpo);

        if (!isNaN(num)) {
          input.value = num.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
          input.classList.add("filled");
          dadosImportados++;
        }
      }
    }
  });

  if (dadosImportados > 0) {
    alert(`${dadosImportados} campos preenchidos via Excel!`);
    calcular();
    fecharModalColar();
  } else {
    alert("Não foi possível identificar dados compatíveis. Verifique se copiou as colunas ID e Valor.");
  }
}
function processarCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const lines = text.split("\n");

    let dadosImportados = 0;

    lines.forEach(line => {
      // Tenta separar por ponto-e-vírgula ou vírgula
      const parts = line.split(/[;,]/);
      if (parts.length >= 2) {
        const id = parts[0].trim().toLowerCase();
        const valorRaw = parts[1].trim();

        // Se o ID existir na página, preenchemos
        const input = document.getElementById(id);
        if (input) {
          // Limpa o valor de símbolos de moeda se houver e formata
          const valorLimpo = valorRaw.replace(/[R$\s.]/g, "").replace(",", ".");
          const num = parseFloat(valorLimpo);

          if (!isNaN(num)) {
            // Formata para o padrão brasileiro para o input
            input.value = num.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
            input.classList.add("filled");
            dadosImportados++;
          }
        }
      }
    });

    if (dadosImportados > 0) {
      alert(`${dadosImportados} campos preenchidos com sucesso!`);
      calcular(); // Dispara o cálculo automático
    } else {
      alert("Nenhum dado compatível encontrado no arquivo. Use o formato: id;valor");
    }
  };

  reader.readAsText(file);
  // Limpa o input para permitir importar o mesmo arquivo se necessário
  event.target.value = "";
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