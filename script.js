/* =========================================================
   VÓ RITA — BALANÇO GERAL
   Sistema financeiro + Google Sheets
========================================================= */


/* =========================================================
   CONFIGURAÇÃO GOOGLE APPS SCRIPT
========================================================= */

const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw6pibnMvmjK6VAVZASUFdIx1ChgH9Kx6riNO9XMaL-F7os7s-VAbJq9GUy1MMxc4df4g/exec";


/* =========================================================
   DADOS
========================================================= */

let vendas = JSON.parse(
    localStorage.getItem("voRitaVendas")
) || [];

let despesas = JSON.parse(
    localStorage.getItem("voRitaDespesas")
) || [];

let produtos = JSON.parse(
    localStorage.getItem("voRitaProdutos")
) || [];


let financeChart = null;
let monthlyChart = null;
let comparisonChart = null;

let toastTimer = null;


/* =========================================================
   ELEMENTOS PRINCIPAIS
========================================================= */

const pages = document.querySelectorAll(".page");
const menuItems = document.querySelectorAll(".menu-item");

const pageTitle = document.getElementById("pageTitle");
const pageKicker = document.getElementById("pageKicker");

const sidebar = document.querySelector(".sidebar");


/* =========================================================
   DATA
========================================================= */

const hoje = new Date();

const hojeISO = formatarISO(hoje);


const nomesMeses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
];


const nomesMesesCurto = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez"
];


/* =========================================================
   UTILITÁRIOS
========================================================= */

function formatarISO(data) {

    const d = new Date(data);

    const ano = d.getFullYear();

    const mes = String(
        d.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        d.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


function moeda(valor) {

    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function dataBR(data) {

    if (!data) {
        return "-";
    }

    const partes = String(data).split("-");

    if (partes.length !== 3) {
        return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


function escapar(texto) {

    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function gerarId(prefixo = "vr") {

    if (
        window.crypto &&
        typeof crypto.randomUUID === "function"
    ) {
        return `${prefixo}_${crypto.randomUUID()}`;
    }

    return `${prefixo}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
}


function salvarLocal() {

    localStorage.setItem(
        "voRitaVendas",
        JSON.stringify(vendas)
    );

    localStorage.setItem(
        "voRitaDespesas",
        JSON.stringify(despesas)
    );

    localStorage.setItem(
        "voRitaProdutos",
        JSON.stringify(produtos)
    );
}


function normalizarData(valor) {

    if (!valor) {
        return hojeISO;
    }

    if (
        typeof valor === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ) {
        return valor;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return hojeISO;
    }

    return formatarISO(data);
}


/* =========================================================
   GOOGLE SHEETS
   COMPATÍVEL EXATAMENTE COM O Código.gs
========================================================= */


/*
    O Código.gs espera:

    NOVA VENDA

    acao
    data
    produto
    cliente
    quantidade
    pagamento
    valorUnitario
    total


    NOVA DESPESA

    acao
    data
    descricao
    categoria
    pagamento
    valor


    NOVO PRODUTO

    acao
    nome
    quantidade
    minimo
    preco
    custo


    EXCLUSÃO

    acao
    linha
*/


function urlConfigurada() {

    return (
        GOOGLE_SCRIPT_URL &&
        GOOGLE_SCRIPT_URL.includes(
            "script.google.com/macros/s/"
        )
    );
}


/* =========================================================
   POST PARA GOOGLE SHEETS
========================================================= */

async function enviarParaPlanilha(acao, dados = {}) {

    if (!urlConfigurada()) {

        console.warn(
            "URL do Google Apps Script não configurada."
        );

        return {
            sucesso: false,
            local: true
        };
    }


    const parametros = new URLSearchParams();


    parametros.append(
        "acao",
        acao
    );


    Object.keys(dados).forEach(chave => {

        let valor = dados[chave];

        /*
            O Apps Script usa e.parameter.
            Portanto tudo é enviado como string.
        */

        if (
            valor !== undefined &&
            valor !== null
        ) {

            parametros.append(
                chave,
                String(valor)
            );

        }

    });


    try {

        const resposta = await fetch(
            GOOGLE_SCRIPT_URL,
            {
                method: "POST",
                body: parametros
            }
        );


        const texto = await resposta.text();


        let resultado;


        try {

            resultado = JSON.parse(texto);

        } catch {

            resultado = {
                sucesso: resposta.ok,
                mensagem: texto
            };

        }


        if (
            resultado &&
            resultado.sucesso === false
        ) {

            throw new Error(
                resultado.mensagem ||
                "Erro ao salvar na planilha."
            );

        }


        return {
            sucesso: true,
            resposta: resultado
        };


    } catch (erro) {

        console.error(
            "Erro ao enviar para Google Sheets:",
            erro
        );


        return {
            sucesso: false,
            erro: erro.message
        };

    }

}


/* =========================================================
   CARREGAR DADOS DA PLANILHA
========================================================= */

async function carregarDaPlanilha() {

    if (!urlConfigurada()) {

        return false;

    }


    try {

        const url =
            `${GOOGLE_SCRIPT_URL}?t=${Date.now()}`;


        const resposta = await fetch(
            url,
            {
                method: "GET",
                cache: "no-store"
            }
        );


        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP " + resposta.status
            );

        }


        const resultado =
            await resposta.json();


        /*
            O Código.gs devolve:

            {
                vendas: [],
                despesas: [],
                produtos: []
            }
        */


        vendas = Array.isArray(
            resultado.vendas
        )
            ? resultado.vendas
            : [];


        despesas = Array.isArray(
            resultado.despesas
        )
            ? resultado.despesas
            : [];


        produtos = Array.isArray(
            resultado.produtos
        )
            ? resultado.produtos
            : [];


        normalizarDados();


        salvarLocal();


        prepararSeletoresMensais();


        atualizarTudo();


        return true;


    } catch (erro) {

        console.error(
            "Erro ao carregar Google Sheets:",
            erro
        );


        mostrarToast(
            "Não foi possível carregar a planilha."
        );


        return false;

    }

}


/* =========================================================
   NORMALIZAÇÃO DOS DADOS DA PLANILHA
========================================================= */

function normalizarDados() {


    vendas = vendas.map(venda => {

        return {

            /*
                A planilha possui:
                objeto.linha

                Essa linha é MUITO importante
                para exclusão.
            */

            linha: Number(
                venda.linha || 0
            ),

            produto: String(
                venda.Produto ??
                venda.produto ??
                ""
            ),

            cliente: String(
                venda.Cliente ??
                venda.cliente ??
                "Não informado"
            ),

            quantidade: Number(
                venda.Quantidade ??
                venda.quantidade ??
                0
            ),

            pagamento: String(
                venda.Pagamento ??
                venda.pagamento ??
                "Outro"
            ),

            preco: Number(
                venda.ValorUnitario ??
                venda.valorUnitario ??
                venda.preco ??
                0
            ),

            total: Number(
                venda.Total ??
                venda.total ??
                0
            ),

            data: normalizarData(
                venda.Data ??
                venda.data
            )

        };

    });


    despesas = despesas.map(despesa => {

        return {

            linha: Number(
                despesa.linha || 0
            ),

            descricao: String(
                despesa.Descricao ??
                despesa.descricao ??
                ""
            ),

            categoria: String(
                despesa.Categoria ??
                despesa.categoria ??
                "Outros"
            ),

            pagamento: String(
                despesa.Pagamento ??
                despesa.pagamento ??
                "Outro"
            ),

            valor: Number(
                despesa.Valor ??
                despesa.valor ??
                0
            ),

            data: normalizarData(
                despesa.Data ??
                despesa.data
            )

        };

    });


    produtos = produtos.map(produto => {

        return {

            linha: Number(
                produto.linha || 0
            ),

            nome: String(
                produto.Nome ??
                produto.nome ??
                ""
            ),

            quantidade: Number(
                produto.Quantidade ??
                produto.quantidade ??
                0
            ),

            minimo: Number(
                produto.Minimo ??
                produto.minimo ??
                0
            ),

            preco: Number(
                produto.Preco ??
                produto.preco ??
                0
            ),

            custo: Number(
                produto.Custo ??
                produto.custo ??
                0
            )

        };

    });

}


/* =========================================================
   TOAST
========================================================= */

function mostrarToast(mensagem) {

    const toast =
        document.getElementById("toast");

    const mensagemEl =
        document.getElementById("toastMessage");


    if (!toast || !mensagemEl) {
        return;
    }


    mensagemEl.textContent =
        mensagem;


    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


/* =========================================================
   DATA NO CABEÇALHO
========================================================= */

const todayElement =
    document.getElementById("today");


if (todayElement) {

    todayElement.textContent =
        hoje.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}


/* =========================================================
   DATAS INICIAIS DOS FORMULÁRIOS
========================================================= */

const saleDateElement =
    document.getElementById("saleDate");


const expenseDateElement =
    document.getElementById("expenseDate");


if (saleDateElement) {

    saleDateElement.value =
        hojeISO;

}


if (expenseDateElement) {

    expenseDateElement.value =
        hojeISO;

}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

const pageNames = {

    dashboard: [
        "VISÃO GERAL",
        "Dashboard"
    ],

    vendas: [
        "ENTRADAS",
        "Vendas"
    ],

    despesas: [
        "SAÍDAS",
        "Despesas"
    ],

    estoque: [
        "PRODUTOS",
        "Estoque"
    ],

    relatorios: [
        "ANÁLISE",
        "Relatórios"
    ]

};


function abrirPagina(id) {

    pages.forEach(page => {

        page.classList.toggle(
            "active",
            page.id === id
        );

    });


    menuItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === id
        );

    });


    if (
        pageNames[id] &&
        pageKicker &&
        pageTitle
    ) {

        pageKicker.textContent =
            pageNames[id][0];

        pageTitle.textContent =
            pageNames[id][1];

    }


    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }


    atualizarTudo();

}


/* =========================================================
   EVENTOS DE NAVEGAÇÃO
========================================================= */

menuItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

            abrirPagina(
                item.dataset.page
            );

        }
    );

});


document
    .querySelectorAll("[data-go]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                abrirPagina(
                    button.dataset.go
                );

            }
        );

    });


const mobileMenu =
    document.getElementById("mobileMenu");


if (mobileMenu) {

    mobileMenu.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );

        }
    );

}


/* =========================================================
   MODAIS
========================================================= */

function abrirModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.classList.add(
            "active"
        );

    }

}


function fecharModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


document
    .querySelectorAll("[data-close]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                fecharModal(
                    button.dataset.close
                );

            }
        );

    });


document
    .querySelectorAll(".modal-overlay")
    .forEach(overlay => {

        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target === overlay
                ) {

                    overlay.classList.remove(
                        "active"
                    );

                }

            }
        );

    });


/* =========================================================
   VENDA — ABRIR MODAL
========================================================= */

const newSale =
    document.getElementById("newSale");


const quickSale =
    document.getElementById("quickSale");


if (newSale) {

    newSale.addEventListener(
        "click",
        () => abrirModal("saleModal")
    );

}


if (quickSale) {

    quickSale.addEventListener(
        "click",
        () => abrirModal("saleModal")
    );

}


/* =========================================================
   VENDA — PREÇO / TOTAL
========================================================= */

const saleQuantity =
    document.getElementById("saleQuantity");


const saleUnitPrice =
    document.getElementById("saleUnitPrice");


const saleTotalPreview =
    document.getElementById("saleTotalPreview");


function atualizarTotalVenda() {

    if (
        !saleQuantity ||
        !saleUnitPrice ||
        !saleTotalPreview
    ) {

        return;

    }


    const quantidade =
        Number(
            saleQuantity.value
        ) || 0;


    const preco =
        Number(
            saleUnitPrice.value
        ) || 0;


    saleTotalPreview.textContent =
        moeda(
            quantidade * preco
        );

}


if (saleQuantity) {

    saleQuantity.addEventListener(
        "input",
        atualizarTotalVenda
    );

}


if (saleUnitPrice) {

    saleUnitPrice.addEventListener(
        "input",
        atualizarTotalVenda
    );

}


/* =========================================================
   VENDA — SALVAR
========================================================= */

const saleForm =
    document.getElementById("saleForm");


if (saleForm) {

    saleForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const produto =
                document
                    .getElementById("saleProduct")
                    .value
                    .trim();


            const cliente =
                document
                    .getElementById("saleClient")
                    .value
                    .trim();


            const quantidade =
                Number(
                    document
                        .getElementById("saleQuantity")
                        .value
                );


            const preco =
                Number(
                    document
                        .getElementById("saleUnitPrice")
                        .value
                );


            const data =
                document
                    .getElementById("saleDate")
                    .value;


            const pagamento =
                document
                    .getElementById("salePayment")
                    .value;


            if (
                !produto ||
                quantidade <= 0 ||
                preco < 0 ||
                !data
            ) {

                mostrarToast(
                    "Confira os dados da venda."
                );

                return;

            }


            const total =
                quantidade * preco;


            /*
                Registro LOCAL

                A planilha NÃO recebe o id.
                Ela recebe somente os campos
                definidos no Código.gs.
            */

            const venda = {

                id: gerarId("venda"),

                linha: 0,

                produto,

                cliente:
                    cliente ||
                    "Não informado",

                quantidade,

                pagamento,

                preco,

                total,

                data

            };


            /*
                Primeiro salva localmente
                para a interface responder
                imediatamente.
            */

            vendas.push(venda);

            salvarLocal();

            atualizarTudo();


            /*
                AGORA envia exatamente
                os parâmetros esperados
                pelo Código.gs.
            */

            const resultado =
                await enviarParaPlanilha(
                    "novaVenda",
                    {

                        data,

                        produto,

                        cliente:
                            cliente ||
                            "Não informado",

                        quantidade,

                        pagamento,

                        valorUnitario:
                            preco,

                        total

                    }
                );


            if (
                resultado.sucesso
            ) {

                mostrarToast(
                    "Venda salva na planilha!"
                );


                /*
                    Recarrega os dados para
                    obter a linha real da planilha.
                */

                await carregarDaPlanilha();

            } else {

                mostrarToast(
                    "Venda salva localmente. Não foi possível confirmar a planilha."
                );

            }


            fecharModal(
                "saleModal"
            );


            saleForm.reset();


            if (saleQuantity) {

                saleQuantity.value = 1;

            }


            if (saleDateElement) {

                saleDateElement.value =
                    hojeISO;

            }


            atualizarTotalVenda();

        }
    );

}


/* =========================================================
   DESPESAS — ABRIR
========================================================= */

const newExpense =
    document.getElementById("newExpense");


if (newExpense) {

    newExpense.addEventListener(
        "click",
        () => abrirModal("expenseModal")
    );

}


/* =========================================================
   DESPESAS — SALVAR
========================================================= */

const expenseForm =
    document.getElementById("expenseForm");


if (expenseForm) {

    expenseForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const descricao =
                document
                    .getElementById(
                        "expenseDescription"
                    )
                    .value
                    .trim();


            const categoria =
                document
                    .getElementById(
                        "expenseCategory"
                    )
                    .value;


            const valor =
                Number(
                    document
                        .getElementById(
                            "expenseValue"
                        )
                        .value
                );


            const data =
                document
                    .getElementById(
                        "expenseDate"
                    )
                    .value;


            const pagamento =
                document
                    .getElementById(
                        "expensePayment"
                    )
                    .value;


            if (
                !descricao ||
                valor < 0 ||
                !data
            ) {

                mostrarToast(
                    "Confira os dados da despesa."
                );

                return;

            }


            const despesa = {

                id:
                    gerarId("despesa"),

                linha: 0,

                descricao,

                categoria,

                pagamento,

                valor,

                data

            };


            despesas.push(
                despesa
            );


            salvarLocal();


            atualizarTudo();


            /*
                EXATAMENTE como o Código.gs
                espera.
            */

            const resultado =
                await enviarParaPlanilha(
                    "novaDespesa",
                    {

                        data,

                        descricao,

                        categoria,

                        pagamento,

                        valor

                    }
                );


            if (
                resultado.sucesso
            ) {

                mostrarToast(
                    "Despesa salva na planilha!"
                );

                await carregarDaPlanilha();

            } else {

                mostrarToast(
                    "Despesa salva localmente. Não foi possível confirmar a planilha."
                );

            }


            fecharModal(
                "expenseModal"
            );


            expenseForm.reset();


            if (expenseDateElement) {

                expenseDateElement.value =
                    hojeISO;

            }


            atualizarTudo();

        }
    );

}


/* =========================================================
   PRODUTOS — ABRIR
========================================================= */

const newProduct =
    document.getElementById("newProduct");


const emptyNewProduct =
    document.getElementById(
        "emptyNewProduct"
    );


if (newProduct) {

    newProduct.addEventListener(
        "click",
        () => abrirModal("productModal")
    );

}


if (emptyNewProduct) {

    emptyNewProduct.addEventListener(
        "click",
        () => abrirModal("productModal")
    );

}


/* =========================================================
   PRODUTOS — SALVAR
========================================================= */

const productForm =
    document.getElementById("productForm");


if (productForm) {

    productForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const nome =
                document
                    .getElementById(
                        "productName"
                    )
                    .value
                    .trim();


            const quantidade =
                Number(
                    document
                        .getElementById(
                            "productQuantity"
                        )
                        .value
                );


            const minimo =
                Number(
                    document
                        .getElementById(
                            "productMinimum"
                        )
                        .value
                );


            const preco =
                Number(
                    document
                        .getElementById(
                            "productPrice"
                        )
                        .value
                );


            const custo =
                Number(
                    document
                        .getElementById(
                            "productCost"
                        )
                        .value
                );


            if (
                !nome ||
                quantidade < 0 ||
                minimo < 0 ||
                preco < 0 ||
                custo < 0
            ) {

                mostrarToast(
                    "Confira os dados do produto."
                );

                return;

            }


            const produto = {

                id:
                    gerarId("produto"),

                linha: 0,

                nome,

                quantidade,

                minimo,

                preco,

                custo

            };


            produtos.push(
                produto
            );


            salvarLocal();


            atualizarTudo();


            /*
                EXATAMENTE como o Código.gs
                espera.
            */

            const resultado =
                await enviarParaPlanilha(
                    "novoProduto",
                    {

                        nome,

                        quantidade,

                        minimo,

                        preco,

                        custo

                    }
                );


            if (
                resultado.sucesso
            ) {

                mostrarToast(
                    "Produto salvo na planilha!"
                );

                await carregarDaPlanilha();

            } else {

                mostrarToast(
                    "Produto salvo localmente. Não foi possível confirmar a planilha."
                );

            }


            fecharModal(
                "productModal"
            );


            productForm.reset();


            const quantidadeInput =
                document.getElementById(
                    "productQuantity"
                );


            const minimoInput =
                document.getElementById(
                    "productMinimum"
                );


            if (quantidadeInput) {

                quantidadeInput.value =
                    0;

            }


            if (minimoInput) {

                minimoInput.value =
                    5;

            }


            atualizarTudo();

        }
    );

}


/* =========================================================
   EXCLUSÃO — VENDA
========================================================= */

async function excluirVenda(linha) {

    if (!linha || Number(linha) <= 1) {

        mostrarToast(
            "Linha da venda inválida."
        );

        return;

    }


    if (
        !confirm(
            "Deseja realmente excluir esta venda?"
        )
    ) {

        return;

    }


    const numeroLinha =
        Number(linha);


    /*
        Remove visualmente primeiro.
    */

    vendas =
        vendas.filter(
            venda =>
                Number(venda.linha) !==
                numeroLinha
        );


    salvarLocal();


    atualizarTudo();


    /*
        O Código.gs espera:

        acao = excluirVenda
        linha = número da linha
    */

    const resultado =
        await enviarParaPlanilha(
            "excluirVenda",
            {
                linha:
                    numeroLinha
            }
        );


    if (
        resultado.sucesso
    ) {

        mostrarToast(
            "Venda excluída."
        );

        await carregarDaPlanilha();

    } else {

        mostrarToast(
            "A venda foi removida da tela, mas não foi possível confirmar a exclusão na planilha."
        );

    }

}


/* =========================================================
   EXCLUSÃO — DESPESA
========================================================= */

async function excluirDespesa(linha) {

    if (!linha || Number(linha) <= 1) {

        mostrarToast(
            "Linha da despesa inválida."
        );

        return;

    }


    if (
        !confirm(
            "Deseja realmente excluir esta despesa?"
        )
    ) {

        return;

    }


    const numeroLinha =
        Number(linha);


    despesas =
        despesas.filter(
            despesa =>
                Number(despesa.linha) !==
                numeroLinha
        );


    salvarLocal();


    atualizarTudo();


    const resultado =
        await enviarParaPlanilha(
            "excluirDespesa",
            {
                linha:
                    numeroLinha
            }
        );


    if (
        resultado.sucesso
    ) {

        mostrarToast(
            "Despesa excluída."
        );

        await carregarDaPlanilha();

    } else {

        mostrarToast(
            "A despesa foi removida da tela, mas não foi possível confirmar a exclusão na planilha."
        );

    }

}


/* =========================================================
   EXCLUSÃO — PRODUTO
========================================================= */

async function excluirProduto(linha) {

    if (!linha || Number(linha) <= 1) {

        mostrarToast(
            "Linha do produto inválida."
        );

        return;

    }


    if (
        !confirm(
            "Deseja realmente excluir este produto?"
        )
    ) {

        return;

    }


    const numeroLinha =
        Number(linha);


    produtos =
        produtos.filter(
            produto =>
                Number(produto.linha) !==
                numeroLinha
        );


    salvarLocal();


    atualizarTudo();


    const resultado =
        await enviarParaPlanilha(
            "excluirProduto",
            {
                linha:
                    numeroLinha
            }
        );


    if (
        resultado.sucesso
    ) {

        mostrarToast(
            "Produto excluído."
        );

        await carregarDaPlanilha();

    } else {

        mostrarToast(
            "O produto foi removido da tela, mas não foi possível confirmar a exclusão na planilha."
        );

    }

}


/*
    Os botões HTML usam onclick.
*/

window.excluirVenda =
    excluirVenda;

window.excluirDespesa =
    excluirDespesa;

window.excluirProduto =
    excluirProduto;


/* =========================================================
   FILTROS DO DASHBOARD
========================================================= */

function pertenceAoPeriodo(
    dataTexto,
    periodo
) {

    if (
        periodo === "all"
    ) {

        return true;

    }


    if (
        periodo === "today"
    ) {

        return dataTexto === hojeISO;

    }


    const data =
        new Date(
            `${dataTexto}T12:00:00`
        );


    const agora =
        new Date();


    if (
        periodo === "month"
    ) {

        return (
            data.getMonth() ===
                agora.getMonth() &&

            data.getFullYear() ===
                agora.getFullYear()
        );

    }


    if (
        periodo === "year"
    ) {

        return (
            data.getFullYear() ===
            agora.getFullYear()
        );

    }


    return true;

}


function vendasPeriodo(periodo) {

    return vendas.filter(
        venda =>
            pertenceAoPeriodo(
                venda.data,
                periodo
            )
    );

}


function despesasPeriodo(periodo) {

    return despesas.filter(
        despesa =>
            pertenceAoPeriodo(
                despesa.data,
                periodo
            )
    );

}


/* =========================================================
   DASHBOARD
========================================================= */

function atualizarDashboard() {

    const periodoElement =
        document.getElementById(
            "dashboardPeriod"
        );


    const periodo =
        periodoElement
            ? periodoElement.value
            : "month";


    const vendasFiltradas =
        vendasPeriodo(periodo);


    const despesasFiltradas =
        despesasPeriodo(periodo);


    const faturamento =
        vendasFiltradas.reduce(
            (soma, venda) =>
                soma +
                Number(venda.total),
            0
        );


    const totalDespesas =
        despesasFiltradas.reduce(
            (soma, despesa) =>
                soma +
                Number(despesa.valor),
            0
        );


    const lucro =
        faturamento -
        totalDespesas;


    const dashRevenue =
        document.getElementById(
            "dashRevenue"
        );


    const dashExpenses =
        document.getElementById(
            "dashExpenses"
        );


    const dashProfit =
        document.getElementById(
            "dashProfit"
        );


    const dashOrders =
        document.getElementById(
            "dashOrders"
        );


    if (dashRevenue) {

        dashRevenue.textContent =
            moeda(faturamento);

    }


    if (dashExpenses) {

        dashExpenses.textContent =
            moeda(totalDespesas);

    }


    if (dashProfit) {

        dashProfit.textContent =
            moeda(lucro);

    }


    if (dashOrders) {

        dashOrders.textContent =
            vendasFiltradas.length;

    }


    const averageTicket =
        document.getElementById(
            "averageTicket"
        );


    if (averageTicket) {

        averageTicket.textContent =
            moeda(
                vendasFiltradas.length
                    ? faturamento /
                      vendasFiltradas.length
                    : 0
            );

    }


    const productCount =
        document.getElementById(
            "productCount"
        );


    if (productCount) {

        productCount.textContent =
            produtos.length;

    }


    const estoqueBaixo =
        produtos.filter(
            produto =>
                Number(produto.quantidade) <=
                Number(produto.minimo)
        ).length;


    const lowStockCount =
        document.getElementById(
            "lowStockCount"
        );


    if (lowStockCount) {

        lowStockCount.textContent =
            estoqueBaixo;

    }


    const margem =
        faturamento > 0
            ? (
                lucro /
                faturamento
            ) * 100
            : 0;


    const profitMargin =
        document.getElementById(
            "profitMargin"
        );


    if (profitMargin) {

        profitMargin.textContent =
            margem.toFixed(1) + "%";

    }


    atualizarGrafico(
        vendasFiltradas,
        despesasFiltradas
    );


    atualizarUltimasVendas();

}


/* =========================================================
   GRÁFICO PRINCIPAL
========================================================= */

function atualizarGrafico(
    vendasLista,
    despesasLista
) {

    const contexto =
        document.getElementById(
            "financeChart"
        );


    if (
        !contexto ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    const datas = {};


    vendasLista.forEach(
        venda => {

            if (
                !datas[venda.data]
            ) {

                datas[venda.data] = {
                    vendas: 0,
                    despesas: 0
                };

            }


            datas[venda.data].vendas +=
                Number(venda.total);

        }
    );


    despesasLista.forEach(
        despesa => {

            if (
                !datas[despesa.data]
            ) {

                datas[despesa.data] = {
                    vendas: 0,
                    despesas: 0
                };

            }


            datas[despesa.data].despesas +=
                Number(despesa.valor);

        }
    );


    let labels =
        Object.keys(datas)
            .sort();


    if (!labels.length) {

        labels = [
            hojeISO
        ];


        datas[hojeISO] = {
            vendas: 0,
            despesas: 0
        };

    }


    labels =
        labels.slice(-10);


    const vendasData =
        labels.map(
            data =>
                datas[data].vendas
        );


    const despesasData =
        labels.map(
            data =>
                datas[data].despesas
        );


    if (financeChart) {

        financeChart.destroy();

    }


    financeChart =
        new Chart(
            contexto,
            {

                type: "line",

                data: {

                    labels:
                        labels.map(dataBR),

                    datasets: [

                        {

                            label:
                                "Faturamento",

                            data:
                                vendasData,

                            borderWidth:
                                3,

                            tension:
                                .35,

                            pointRadius:
                                3

                        },

                        {

                            label:
                                "Despesas",

                            data:
                                despesasData,

                            borderWidth:
                                3,

                            tension:
                                .35,

                            pointRadius:
                                3

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {

                                usePointStyle:
                                    true,

                                boxWidth:
                                    8

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    value =>
                                        "R$ " +
                                        Number(
                                            value
                                        ).toLocaleString(
                                            "pt-BR"
                                        )

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   ÚLTIMAS VENDAS
========================================================= */

function atualizarUltimasVendas() {

    const tabela =
        document.getElementById(
            "recentSales"
        );


    const empty =
        document.getElementById(
            "emptyRecentSales"
        );


    if (!tabela || !empty) {

        return;

    }


    const lista =
        [...vendas]
            .sort(
                (a, b) =>
                    new Date(
                        `${b.data}T12:00:00`
                    ) -
                    new Date(
                        `${a.data}T12:00:00`
                    )
            )
            .slice(0, 6);


    tabela.innerHTML = "";


    if (!lista.length) {

        empty.style.display =
            "block";

        return;

    }


    empty.style.display =
        "none";


    lista.forEach(venda => {

        tabela.innerHTML += `

            <tr>

                <td>
                    ${dataBR(venda.data)}
                </td>

                <td>
                    <strong>
                        ${escapar(
                            venda.produto
                        )}
                    </strong>
                </td>

                <td>
                    ${venda.quantidade}
                </td>

                <td>
                    ${escapar(
                        venda.pagamento
                    )}
                </td>

                <td>
                    <strong>
                        ${moeda(venda.total)}
                    </strong>
                </td>

            </tr>

        `;

    });

}


/* =========================================================
   TABELA DE VENDAS
========================================================= */

function atualizarTabelaVendas() {

    const tabela =
        document.getElementById(
            "salesTable"
        );


    const empty =
        document.getElementById(
            "emptySales"
        );


    const pesquisaElement =
        document.getElementById(
            "salesSearch"
        );


    if (!tabela || !empty) {

        return;

    }


    const pesquisa =
        pesquisaElement
            ? pesquisaElement.value
                .toLowerCase()
            : "";


    const lista =
        vendas
            .filter(venda => {

                return `${venda.produto}
                        ${venda.cliente}
                        ${venda.pagamento}`
                    .toLowerCase()
                    .includes(pesquisa);

            })
            .sort(
                (a, b) =>
                    new Date(
                        `${b.data}T12:00:00`
                    ) -
                    new Date(
                        `${a.data}T12:00:00`
                    )
            );


    tabela.innerHTML = "";


    empty.style.display =
        lista.length
            ? "none"
            : "block";


    lista.forEach(venda => {

        tabela.innerHTML += `

            <tr>

                <td>
                    ${dataBR(venda.data)}
                </td>

                <td>
                    <strong>
                        ${escapar(
                            venda.produto
                        )}
                    </strong>
                </td>

                <td>
                    ${escapar(
                        venda.cliente
                    )}
                </td>

                <td>
                    ${venda.quantidade}
                </td>

                <td>
                    ${escapar(
                        venda.pagamento
                    )}
                </td>

                <td>
                    <strong>
                        ${moeda(
                            venda.total
                        )}
                    </strong>
                </td>

                <td>

                    <button
                        class="delete-button"
                        onclick="excluirVenda(${Number(venda.linha)})"
                    >

                        <i
                            class="fa-solid fa-trash"
                        ></i>

                    </button>

                </td>

            </tr>

        `;

    });


    const total =
        vendas.reduce(
            (soma, venda) =>
                soma +
                Number(venda.total),
            0
        );


    const salesTotal =
        document.getElementById(
            "salesTotal"
        );


    const salesQuantity =
        document.getElementById(
            "salesQuantity"
        );


    const salesAverage =
        document.getElementById(
            "salesAverage"
        );


    if (salesTotal) {

        salesTotal.textContent =
            moeda(total);

    }


    if (salesQuantity) {

        salesQuantity.textContent =
            vendas.length;

    }


    if (salesAverage) {

        salesAverage.textContent =
            moeda(
                vendas.length
                    ? total /
                      vendas.length
                    : 0
            );

    }

}


/* =========================================================
   TABELA DE DESPESAS
========================================================= */

function atualizarTabelaDespesas() {

    const tabela =
        document.getElementById(
            "expensesTable"
        );


    const empty =
        document.getElementById(
            "emptyExpenses"
        );


    const pesquisaElement =
        document.getElementById(
            "expenseSearch"
        );


    if (!tabela || !empty) {

        return;

    }


    const pesquisa =
        pesquisaElement
            ? pesquisaElement.value
                .toLowerCase()
            : "";


    const lista =
        despesas
            .filter(despesa => {

                return `${despesa.descricao}
                        ${despesa.categoria}
                        ${despesa.pagamento}`
                    .toLowerCase()
                    .includes(pesquisa);

            })
            .sort(
                (a, b) =>
                    new Date(
                        `${b.data}T12:00:00`
                    ) -
                    new Date(
                        `${a.data}T12:00:00`
                    )
            );


    tabela.innerHTML = "";


    empty.style.display =
        lista.length
            ? "none"
            : "block";


    lista.forEach(despesa => {

        tabela.innerHTML += `

            <tr>

                <td>
                    ${dataBR(
                        despesa.data
                    )}
                </td>

                <td>
                    <strong>
                        ${escapar(
                            despesa.descricao
                        )}
                    </strong>
                </td>

                <td>
                    ${escapar(
                        despesa.categoria
                    )}
                </td>

                <td>
                    ${escapar(
                        despesa.pagamento
                    )}
                </td>

                <td>
                    <strong>
                        ${moeda(
                            despesa.valor
                        )}
                    </strong>
                </td>

                <td>

                    <button
                        class="delete-button"
                        onclick="excluirDespesa(${Number(despesa.linha)})"
                    >

                        <i
                            class="fa-solid fa-trash"
                        ></i>

                    </button>

                </td>

            </tr>

        `;

    });


    const total =
        despesas.reduce(
            (soma, despesa) =>
                soma +
                Number(despesa.valor),
            0
        );


    const maior =
        despesas.length
            ? Math.max(
                ...despesas.map(
                    despesa =>
                        Number(
                            despesa.valor
                        )
                )
            )
            : 0;


    const expenseTotal =
        document.getElementById(
            "expenseTotal"
        );


    const expenseQuantity =
        document.getElementById(
            "expenseQuantity"
        );


    const largestExpense =
        document.getElementById(
            "largestExpense"
        );


    if (expenseTotal) {

        expenseTotal.textContent =
            moeda(total);

    }


    if (expenseQuantity) {

        expenseQuantity.textContent =
            despesas.length;

    }


    if (largestExpense) {

        largestExpense.textContent =
            moeda(maior);

    }

}


/* =========================================================
   ESTOQUE
========================================================= */

function atualizarEstoque() {

    const grid =
        document.getElementById(
            "productGrid"
        );


    const empty =
        document.getElementById(
            "emptyProducts"
        );


    if (!grid || !empty) {

        return;

    }


    grid.innerHTML = "";


    if (!produtos.length) {

        grid.style.display =
            "none";

        empty.style.display =
            "block";

    } else {

        grid.style.display =
            "grid";

        empty.style.display =
            "none";

    }


    produtos.forEach(produto => {

        const percentual =
            produto.minimo > 0

                ? Math.min(
                    100,
                    (
                        produto.quantidade /
                        (
                            produto.minimo *
                            4
                        )
                    ) * 100
                )

                : 100;


        const baixo =
            Number(
                produto.quantidade
            ) <=
            Number(
                produto.minimo
            );


        const lucro =
            Number(
                produto.preco
            ) -
            Number(
                produto.custo
            );


        grid.innerHTML += `

            <div class="product-card">

                <div class="product-top">

                    <div class="product-image">

                        <i
                            class="fa-solid fa-cookie-bite"
                        ></i>

                    </div>


                    <button
                        class="delete-button"
                        onclick="excluirProduto(${Number(produto.linha)})"
                    >

                        <i
                            class="fa-solid fa-trash"
                        ></i>

                    </button>

                </div>


                <h4>
                    ${escapar(
                        produto.nome
                    )}
                </h4>


                <div class="product-price">

                    ${moeda(
                        produto.preco
                    )}

                </div>


                <div class="stock-bar">

                    <div
                        class="stock-progress ${baixo ? "low" : ""}"
                        style="width:${percentual}%"
                    ></div>

                </div>


                <div class="stock-info">

                    <span>
                        ${produto.quantidade}
                        unidades
                    </span>

                    <span>
                        mínimo:
                        ${produto.minimo}
                    </span>

                </div>


                <div class="product-actions">

                    <span
                        style="
                            font-size:11px;
                            color:var(--muted)
                        "
                    >

                        Custo:
                        ${moeda(
                            produto.custo
                        )}

                    </span>


                    <strong
                        style="
                            font-size:12px;
                            color:${
                                lucro >= 0
                                    ? "var(--green)"
                                    : "var(--red)"
                            }
                        "
                    >

                        Lucro:
                        ${moeda(lucro)}

                    </strong>

                </div>

            </div>

        `;

    });


    const unidades =
        produtos.reduce(
            (soma, produto) =>
                soma +
                Number(
                    produto.quantidade
                ),
            0
        );


    const baixo =
        produtos.filter(
            produto =>
                Number(
                    produto.quantidade
                ) <=
                Number(
                    produto.minimo
                )
        ).length;


    const stockProducts =
        document.getElementById(
            "stockProducts"
        );


    const stockUnits =
        document.getElementById(
            "stockUnits"
        );


    const stockLow =
        document.getElementById(
            "stockLow"
        );


    if (stockProducts) {

        stockProducts.textContent =
            produtos.length;

    }


    if (stockUnits) {

        stockUnits.textContent =
            unidades;

    }


    if (stockLow) {

        stockLow.textContent =
            baixo;

    }

}


/* =========================================================
   RELATÓRIOS GERAIS
========================================================= */

function atualizarRelatoriosGerais() {

    const faturamento =
        vendas.reduce(
            (soma, venda) =>
                soma +
                Number(venda.total),
            0
        );


    const totalDespesas =
        despesas.reduce(
            (soma, despesa) =>
                soma +
                Number(despesa.valor),
            0
        );


    const lucro =
        faturamento -
        totalDespesas;


    const margem =
        faturamento > 0
            ? (
                lucro /
                faturamento
            ) * 100
            : 0;


    const reportRevenue =
        document.getElementById(
            "reportRevenue"
        );


    const reportExpenses =
        document.getElementById(
            "reportExpenses"
        );


    const reportProfit =
        document.getElementById(
            "reportProfit"
        );


    const reportMargin =
        document.getElementById(
            "reportMargin"
        );


    const summaryRevenue =
        document.getElementById(
            "summaryRevenue"
        );


    const summaryExpenses =
        document.getElementById(
            "summaryExpenses"
        );


    const summaryProfit =
        document.getElementById(
            "summaryProfit"
        );


    if (reportRevenue) {

        reportRevenue.textContent =
            moeda(faturamento);

    }


    if (reportExpenses) {

        reportExpenses.textContent =
            moeda(totalDespesas);

    }


    if (reportProfit) {

        reportProfit.textContent =
            moeda(lucro);

    }


    if (reportMargin) {

        reportMargin.textContent =
            margem.toFixed(1) + "%";

    }


    if (summaryRevenue) {

        summaryRevenue.textContent =
            moeda(faturamento);

    }


    if (summaryExpenses) {

        summaryExpenses.textContent =
            moeda(totalDespesas);

    }


    if (summaryProfit) {

        summaryProfit.textContent =
            moeda(lucro);

    }


    /*
        PRODUTOS MAIS VENDIDOS
    */

    const ranking = {};


    vendas.forEach(venda => {

        if (
            !ranking[venda.produto]
        ) {

            ranking[venda.produto] =
                0;

        }


        ranking[venda.produto] +=
            Number(
                venda.quantidade
            );

    });


    const melhores =
        Object.entries(ranking)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .slice(0, 5);


    const bestContainer =
        document.getElementById(
            "bestProducts"
        );


    if (bestContainer) {

        bestContainer.innerHTML =
            "";


        if (!melhores.length) {

            bestContainer.innerHTML =
                `
                <div class="empty-state">
                    Nenhuma venda registrada.
                </div>
                `;

        } else {

            melhores.forEach(
                (item, index) => {

                    bestContainer.innerHTML += `

                        <div class="rank-item">

                            <div class="rank-left">

                                <div
                                    class="rank-number"
                                >
                                    ${index + 1}
                                </div>

                                <span
                                    class="rank-name"
                                >
                                    ${escapar(
                                        item[0]
                                    )}
                                </span>

                            </div>


                            <span
                                class="rank-value"
                            >
                                ${item[1]}
                                unidades
                            </span>

                        </div>

                    `;

                }
            );

        }

    }


    /*
        CATEGORIAS DE DESPESAS
    */

    const categorias = {};


    despesas.forEach(
        despesa => {

            if (
                !categorias[
                    despesa.categoria
                ]
            ) {

                categorias[
                    despesa.categoria
                ] = 0;

            }


            categorias[
                despesa.categoria
            ] += Number(
                despesa.valor
            );

        }
    );


    const categoriasOrdenadas =
        Object.entries(
            categorias
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )
        .slice(0, 5);


    const expenseContainer =
        document.getElementById(
            "expenseCategories"
        );


    if (expenseContainer) {

        expenseContainer.innerHTML =
            "";


        if (
            !categoriasOrdenadas.length
        ) {

            expenseContainer.innerHTML =
                `
                <div class="empty-state">
                    Nenhuma despesa registrada.
                </div>
                `;

        } else {

            categoriasOrdenadas.forEach(
                (item, index) => {

                    expenseContainer.innerHTML += `

                        <div class="rank-item">

                            <div class="rank-left">

                                <div
                                    class="rank-number"
                                >
                                    ${index + 1}
                                </div>

                                <span
                                    class="rank-name"
                                >
                                    ${escapar(
                                        item[0]
                                    )}
                                </span>

                            </div>


                            <span
                                class="rank-value"
                            >
                                ${moeda(
                                    item[1]
                                )}
                            </span>

                        </div>

                    `;

                }
            );

        }

    }

}


/* =========================================================
   SELETORES DO BALANÇO MENSAL
========================================================= */

function prepararSeletoresMensais() {

    const monthSelect =
        document.getElementById(
            "reportMonth"
        );


    const yearSelect =
        document.getElementById(
            "reportYear"
        );


    if (
        !monthSelect ||
        !yearSelect
    ) {

        return;

    }


    monthSelect.innerHTML =
        "";


    nomesMeses.forEach(
        (mes, index) => {

            monthSelect.innerHTML +=
                `
                <option value="${index}">
                    ${mes}
                </option>
                `;

        }
    );


    const anoAtual =
        hoje.getFullYear();


    const anosExistentes = [

        ...vendas.map(
            venda =>
                Number(
                    String(
                        venda.data
                    ).slice(0, 4)
                )
        ),

        ...despesas.map(
            despesa =>
                Number(
                    String(
                        despesa.data
                    ).slice(0, 4)
                )
        ),

        anoAtual

    ].filter(
        ano =>
            Number.isFinite(ano) &&
            ano > 1900
    );


    const menorAno =
        Math.min(
            anoAtual - 5,
            ...anosExistentes
        );


    const maiorAno =
        Math.max(
            anoAtual + 2,
            ...anosExistentes
        );


    yearSelect.innerHTML =
        "";


    for (
        let ano = menorAno;
        ano <= maiorAno;
        ano++
    ) {

        yearSelect.innerHTML +=
            `
            <option value="${ano}">
                ${ano}
            </option>
            `;

    }


    /*
        Só define o mês atual se
        ainda não houver seleção.
    */

    if (
        !monthSelect.dataset.pronto
    ) {

        monthSelect.value =
            hoje.getMonth();

        yearSelect.value =
            anoAtual;

        monthSelect.dataset.pronto =
            "true";

    }

}


/* =========================================================
   DADOS DO MÊS
========================================================= */

function obterDadosMensais(
    mes,
    ano
) {

    const vendasMes =
        vendas.filter(
            venda => {

                const data =
                    new Date(
                        `${venda.data}T12:00:00`
                    );


                return (
                    data.getMonth() ===
                        Number(mes) &&

                    data.getFullYear() ===
                        Number(ano)
                );

            }
        );


    const despesasMes =
        despesas.filter(
            despesa => {

                const data =
                    new Date(
                        `${despesa.data}T12:00:00`
                    );


                return (
                    data.getMonth() ===
                        Number(mes) &&

                    data.getFullYear() ===
                        Number(ano)
                );

            }
        );


    return {
        vendasMes,
        despesasMes
    };

}


/* =========================================================
   BALANÇO MENSAL
========================================================= */

function atualizarBalancoMensal() {

    const monthSelect =
        document.getElementById(
            "reportMonth"
        );


    const yearSelect =
        document.getElementById(
            "reportYear"
        );


    if (
        !monthSelect ||
        !yearSelect
    ) {

        return;

    }


    const mes =
        Number(
            monthSelect.value
        );


    const ano =
        Number(
            yearSelect.value
        );


    const {
        vendasMes,
        despesasMes
    } =
        obterDadosMensais(
            mes,
            ano
        );


    const faturamento =
        vendasMes.reduce(
            (soma, venda) =>
                soma +
                Number(
                    venda.total
                ),
            0
        );


    const totalDespesas =
        despesasMes.reduce(
            (soma, despesa) =>
                soma +
                Number(
                    despesa.valor
                ),
            0
        );


    const lucro =
        faturamento -
        totalDespesas;


    const margem =
        faturamento > 0
            ? (
                lucro /
                faturamento
            ) * 100
            : 0;


    const title =
        document.getElementById(
            "monthlyReportTitle"
        );


    if (title) {

        title.textContent =
            `${nomesMeses[mes]} de ${ano}`;

    }


    const monthlyRevenue =
        document.getElementById(
            "monthlyRevenue"
        );


    const monthlyExpenses =
        document.getElementById(
            "monthlyExpenses"
        );


    const monthlyProfit =
        document.getElementById(
            "monthlyProfit"
        );


    const monthlyMargin =
        document.getElementById(
            "monthlyMargin"
        );


    if (monthlyRevenue) {

        monthlyRevenue.textContent =
            moeda(faturamento);

    }


    if (monthlyExpenses) {

        monthlyExpenses.textContent =
            moeda(totalDespesas);

    }


    if (monthlyProfit) {

        monthlyProfit.textContent =
            moeda(lucro);

    }


    if (monthlyMargin) {

        monthlyMargin.textContent =
            margem.toFixed(1) + "%";

    }


    const itensVendidos =
        vendasMes.reduce(
            (soma, venda) =>
                soma +
                Number(
                    venda.quantidade
                ),
            0
        );


    const ticket =
        vendasMes.length
            ? faturamento /
              vendasMes.length
            : 0;


    const monthlySalesCount =
        document.getElementById(
            "monthlySalesCount"
        );


    const monthlyTicket =
        document.getElementById(
            "monthlyTicket"
        );


    const monthlyItems =
        document.getElementById(
            "monthlyItems"
        );


    if (monthlySalesCount) {

        monthlySalesCount.textContent =
            vendasMes.length;

    }


    if (monthlyTicket) {

        monthlyTicket.textContent =
            moeda(ticket);

    }


    if (monthlyItems) {

        monthlyItems.textContent =
            itensVendidos;

    }


    /*
        PRODUTO MAIS VENDIDO
    */

    const produtosMes = {};


    vendasMes.forEach(
        venda => {

            if (
                !produtosMes[
                    venda.produto
                ]
            ) {

                produtosMes[
                    venda.produto
                ] = {

                    quantidade: 0,

                    faturamento: 0

                };

            }


            produtosMes[
                venda.produto
            ].quantidade +=
                Number(
                    venda.quantidade
                );


            produtosMes[
                venda.produto
            ].faturamento +=
                Number(
                    venda.total
                );

        }
    );


    const produtosOrdenados =
        Object.entries(
            produtosMes
        )
        .sort(
            (a, b) =>
                b[1].quantidade -
                a[1].quantidade
        );


    const campeao =
        produtosOrdenados[0];


    const monthlyBestProduct =
        document.getElementById(
            "monthlyBestProduct"
        );


    if (monthlyBestProduct) {

        monthlyBestProduct.textContent =
            campeao
                ? `${campeao[0]} (${campeao[1].quantidade})`
                : "—";

    }


    atualizarGraficoMensal(
        vendasMes,
        despesasMes
    );


    atualizarPagamentosMensais(
        vendasMes
    );


    atualizarProdutosMensais(
        produtosOrdenados
    );


    atualizarComparativoMensal(
        mes,
        ano
    );

}


/* =========================================================
   GRÁFICO MENSAL
========================================================= */

function atualizarGraficoMensal(
    vendasMes,
    despesasMes
) {

    const contexto =
        document.getElementById(
            "monthlyChart"
        );


    if (
        !contexto ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    const dias = {};


    vendasMes.forEach(
        venda => {

            const dia =
                String(
                    venda.data
                ).slice(-2);


            if (!dias[dia]) {

                dias[dia] = {
                    vendas: 0,
                    despesas: 0
                };

            }


            dias[dia].vendas +=
                Number(
                    venda.total
                );

        }
    );


    despesasMes.forEach(
        despesa => {

            const dia =
                String(
                    despesa.data
                ).slice(-2);


            if (!dias[dia]) {

                dias[dia] = {
                    vendas: 0,
                    despesas: 0
                };

            }


            dias[dia].despesas +=
                Number(
                    despesa.valor
                );

        }
    );


    let labels =
        Object.keys(dias)
            .sort(
                (a, b) =>
                    Number(a) -
                    Number(b)
            );


    if (!labels.length) {

        labels = ["01"];


        dias["01"] = {
            vendas: 0,
            despesas: 0
        };

    }


    if (monthlyChart) {

        monthlyChart.destroy();

    }


    monthlyChart =
        new Chart(
            contexto,
            {

                type: "bar",

                data: {

                    labels:
                        labels.map(
                            dia =>
                                "Dia " +
                                dia
                        ),

                    datasets: [

                        {

                            label:
                                "Faturamento",

                            data:
                                labels.map(
                                    dia =>
                                        dias[
                                            dia
                                        ].vendas
                                ),

                            borderWidth:
                                1

                        },

                        {

                            label:
                                "Despesas",

                            data:
                                labels.map(
                                    dia =>
                                        dias[
                                            dia
                                        ].despesas
                                ),

                            borderWidth:
                                1

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    value =>
                                        "R$ " +
                                        Number(
                                            value
                                        ).toLocaleString(
                                            "pt-BR"
                                        )

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   PAGAMENTOS DO MÊS
========================================================= */

function atualizarPagamentosMensais(
    vendasMes
) {

    const container =
        document.getElementById(
            "monthlyPayments"
        );


    if (!container) {

        return;

    }


    const pagamentos = {};


    vendasMes.forEach(
        venda => {

            const forma =
                venda.pagamento ||
                "Outro";


            if (
                !pagamentos[forma]
            ) {

                pagamentos[forma] = {

                    quantidade: 0,

                    valor: 0

                };

            }


            pagamentos[forma].quantidade++;


            pagamentos[forma].valor +=
                Number(
                    venda.total
                );

        }
    );


    const lista =
        Object.entries(
            pagamentos
        )
        .sort(
            (a, b) =>
                b[1].valor -
                a[1].valor
        );


    container.innerHTML =
        "";


    if (!lista.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                Nenhuma venda neste mês.
            </div>
            `;

        return;

    }


    lista.forEach(item => {

        container.innerHTML += `

            <div class="payment-row">

                <div class="payment-left">

                    <i
                        class="fa-solid fa-credit-card"
                    ></i>

                    <span>
                        ${escapar(
                            item[0]
                        )}
                    </span>

                </div>


                <div class="payment-right">

                    ${item[1].quantidade}
                    venda(s)
                    —
                    ${moeda(
                        item[1].valor
                    )}

                </div>

            </div>

        `;

    });

}


/* =========================================================
   PRODUTOS DO MÊS
========================================================= */

function atualizarProdutosMensais(
    produtosOrdenados
) {

    const container =
        document.getElementById(
            "monthlyBestProducts"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    if (
        !produtosOrdenados.length
    ) {

        container.innerHTML =
            `
            <div class="empty-state">
                Nenhuma venda neste mês.
            </div>
            `;

        return;

    }


    produtosOrdenados
        .slice(0, 5)
        .forEach(
            (item, index) => {

                container.innerHTML += `

                    <div class="rank-item">

                        <div class="rank-left">

                            <div
                                class="rank-number"
                            >
                                ${index + 1}
                            </div>

                            <span
                                class="rank-name"
                            >
                                ${escapar(
                                    item[0]
                                )}
                            </span>

                        </div>


                        <span
                            class="rank-value"
                        >

                            ${item[1].quantidade}
                            un.
                            —
                            ${moeda(
                                item[1].faturamento
                            )}

                        </span>

                    </div>

                `;

            }
        );

}


/* =========================================================
   ÚLTIMOS 12 MESES
========================================================= */

function obterUltimos12Meses(
    mesAtual,
    anoAtual
) {

    const resultado = [];


    for (
        let i = 11;
        i >= 0;
        i--
    ) {

        const data =
            new Date(
                anoAtual,
                mesAtual - i,
                1
            );


        resultado.push({

            mes:
                data.getMonth(),

            ano:
                data.getFullYear()

        });

    }


    return resultado;

}


/* =========================================================
   COMPARATIVO MENSAL
========================================================= */

function atualizarComparativoMensal(
    mesAtual,
    anoAtual
) {

    const periodos =
        obterUltimos12Meses(
            mesAtual,
            anoAtual
        );


    const dados =
        periodos.map(
            periodo => {

                const vendasPeriodo =
                    vendas.filter(
                        venda => {

                            const data =
                                new Date(
                                    `${venda.data}T12:00:00`
                                );


                            return (
                                data.getMonth() ===
                                    periodo.mes &&

                                data.getFullYear() ===
                                    periodo.ano
                            );

                        }
                    );


                const despesasPeriodo =
                    despesas.filter(
                        despesa => {

                            const data =
                                new Date(
                                    `${despesa.data}T12:00:00`
                                );


                            return (
                                data.getMonth() ===
                                    periodo.mes &&

                                data.getFullYear() ===
                                    periodo.ano
                            );

                        }
                    );


                const faturamento =
                    vendasPeriodo.reduce(
                        (soma, venda) =>
                            soma +
                            Number(
                                venda.total
                            ),
                        0
                    );


                const saidas =
                    despesasPeriodo.reduce(
                        (soma, despesa) =>
                            soma +
                            Number(
                                despesa.valor
                            ),
                        0
                    );


                const lucro =
                    faturamento -
                    saidas;


                const margem =
                    faturamento > 0
                        ? (
                            lucro /
                            faturamento
                        ) * 100
                        : 0;


                return {

                    mes:
                        periodo.mes,

                    ano:
                        periodo.ano,

                    faturamento,

                    despesas:
                        saidas,

                    lucro,

                    margem

                };

            }
        );


    const labels =
        dados.map(
            item =>
                `${nomesMesesCurto[item.mes]}/${String(item.ano).slice(-2)}`
        );


    atualizarGraficoComparativo(
        labels,
        dados
    );


    atualizarTabelaComparativo(
        dados
    );

}


/* =========================================================
   GRÁFICO COMPARATIVO
========================================================= */

function atualizarGraficoComparativo(
    labels,
    dados
) {

    const contexto =
        document.getElementById(
            "comparisonChart"
        );


    if (
        !contexto ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    if (comparisonChart) {

        comparisonChart.destroy();

    }


    comparisonChart =
        new Chart(
            contexto,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Faturamento",

                            data:
                                dados.map(
                                    item =>
                                        item.faturamento
                                ),

                            borderWidth:
                                3,

                            tension:
                                .35,

                            pointRadius:
                                3

                        },

                        {

                            label:
                                "Despesas",

                            data:
                                dados.map(
                                    item =>
                                        item.despesas
                                ),

                            borderWidth:
                                3,

                            tension:
                                .35,

                            pointRadius:
                                3

                        },

                        {

                            label:
                                "Lucro",

                            data:
                                dados.map(
                                    item =>
                                        item.lucro
                                ),

                            borderWidth:
                                3,

                            tension:
                                .35,

                            pointRadius:
                                3

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    value =>
                                        "R$ " +
                                        Number(
                                            value
                                        ).toLocaleString(
                                            "pt-BR"
                                        )

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   TABELA COMPARATIVA
========================================================= */

function atualizarTabelaComparativo(
    dados
) {

    const tabela =
        document.getElementById(
            "monthlyComparisonTable"
        );


    if (!tabela) {

        return;

    }


    tabela.innerHTML =
        "";


    dados.forEach(
        item => {

            tabela.innerHTML += `

                <tr>

                    <td>
                        <strong>
                            ${nomesMeses[item.mes]}
                            /
                            ${item.ano}
                        </strong>
                    </td>

                    <td>
                        ${moeda(
                            item.faturamento
                        )}
                    </td>

                    <td>
                        ${moeda(
                            item.despesas
                        )}
                    </td>

                    <td>
                        <strong>
                            ${moeda(
                                item.lucro
                            )}
                        </strong>
                    </td>

                    <td>
                        ${item.margem.toFixed(1)}%
                    </td>

                </tr>

            `;

        }
    );

}


/* =========================================================
   EVENTOS DOS FILTROS
========================================================= */

const reportMonth =
    document.getElementById(
        "reportMonth"
    );


const reportYear =
    document.getElementById(
        "reportYear"
    );


if (reportMonth) {

    reportMonth.addEventListener(
        "change",
        atualizarBalancoMensal
    );

}


if (reportYear) {

    reportYear.addEventListener(
        "change",
        atualizarBalancoMensal
    );

}


const salesSearch =
    document.getElementById(
        "salesSearch"
    );


if (salesSearch) {

    salesSearch.addEventListener(
        "input",
        atualizarTabelaVendas
    );

}


const expenseSearch =
    document.getElementById(
        "expenseSearch"
    );


if (expenseSearch) {

    expenseSearch.addEventListener(
        "input",
        atualizarTabelaDespesas
    );

}


const dashboardPeriod =
    document.getElementById(
        "dashboardPeriod"
    );


if (dashboardPeriod) {

    dashboardPeriod.addEventListener(
        "change",
        atualizarDashboard
    );

}


/* =========================================================
   TEMA ESCURO
========================================================= */

const themeButton =
    document.getElementById(
        "themeButton"
    );


if (themeButton) {

    themeButton.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );


            const dark =
                document.body.classList.contains(
                    "dark"
                );


            localStorage.setItem(
                "voRitaDark",
                dark
            );


            const icon =
                themeButton.querySelector(
                    "i"
                );


            if (icon) {

                icon.className =
                    dark
                        ? "fa-solid fa-sun"
                        : "fa-solid fa-moon";

            }

        }
    );

}


if (
    localStorage.getItem(
        "voRitaDark"
    ) === "true"
) {

    document.body.classList.add(
        "dark"
    );


    const icon =
        document.querySelector(
            "#themeButton i"
        );


    if (icon) {

        icon.className =
            "fa-solid fa-sun";

    }

}


/* =========================================================
   ATUALIZAÇÃO GERAL
========================================================= */

function atualizarTudo() {

    atualizarDashboard();

    atualizarTabelaVendas();

    atualizarTabelaDespesas();

    atualizarEstoque();

    atualizarRelatoriosGerais();

    atualizarBalancoMensal();

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

prepararSeletoresMensais();

atualizarTotalVenda();

atualizarTudo();


/* =========================================================
   SINCRONIZAÇÃO INICIAL
========================================================= */

(async function iniciarSincronizacao() {

    if (!urlConfigurada()) {

        mostrarToast(
            "Configure a URL do Google Apps Script."
        );

        return;

    }


    const sucesso =
        await carregarDaPlanilha();


    if (sucesso) {

        mostrarToast(
            "Dados sincronizados com a planilha."
        );

    }

})();