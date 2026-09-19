/* =====================================================
   VÓ RITA
   SISTEMA DE BALANÇO GERAL
   SCRIPT COMPLETO
===================================================== */


/* =====================================================
   CONFIGURAÇÃO
===================================================== */

const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw6pibnMvmjK6VAVZASUFdIx1ChgH9Kx6riNO9XMaL-F7os7s-VAbJq9GUy1MMxc4df4g/exec";


/* =====================================================
   DADOS
===================================================== */

let sales = [];
let expenses = [];
let products = [];


/* =====================================================
   GRÁFICOS
===================================================== */

let financeChart = null;
let monthlyChart = null;
let comparisonChart = null;

let monthlySalesPie = null;
let monthlyExpensesPie = null;


/* =====================================================
   CORES DOS GRÁFICOS
===================================================== */

const PIE_COLORS = [

    "#5B9BD5",
    "#4F8A68",
    "#C75C65",
    "#B88A3B",
    "#8E6BBE",
    "#E67E52",
    "#4DA6A6",
    "#D16BA5",
    "#7A9E9F",
    "#9B7EDE",
    "#D4A72C",
    "#5C7AEA",
    "#6C8EBF",
    "#A66DD4",
    "#5FA8A8",
    "#D97A6A"

];


/* =====================================================
   MAPA DE CORES
   Mantém a mesma cor para o mesmo produto/categoria
===================================================== */

const colorMap = {};


function getItemColor(nome, index = 0) {

    const chave = String(nome || "Outros")
        .trim()
        .toLowerCase();

    if (!colorMap[chave]) {

        colorMap[chave] =
            PIE_COLORS[
                Object.keys(colorMap).length %
                PIE_COLORS.length
            ];

    }

    return colorMap[chave];

}


/* =====================================================
   UTILITÁRIOS
===================================================== */

function $(id) {

    return document.getElementById(id);

}


function setText(id, value) {

    const element = $(id);

    if (element) {

        element.textContent = value;

    }

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   MOEDA
===================================================== */

function formatCurrency(value) {

    const number = Number(value) || 0;

    return number.toLocaleString("pt-BR", {

        style: "currency",

        currency: "BRL"

    });

}


/* =====================================================
   NÚMERO
===================================================== */

function formatNumber(value) {

    const number = Number(value) || 0;

    return number.toLocaleString("pt-BR", {

        maximumFractionDigits: 2

    });

}


/* =====================================================
   PORCENTAGEM
===================================================== */

function formatPercent(value) {

    const number = Number(value) || 0;

    return number.toLocaleString("pt-BR", {

        minimumFractionDigits: 1,

        maximumFractionDigits: 1

    }) + "%";

}


/* =====================================================
   CONVERTER NÚMERO
===================================================== */

function toNumber(value) {

    if (typeof value === "number") {

        return Number.isFinite(value)
            ? value
            : 0;

    }

    if (value === null || value === undefined || value === "") {

        return 0;

    }

    let text = String(value).trim();

    /*
       Trata valores como:

       1.250,50
       1250,50
       1250.50
    */

    if (
        text.includes(".") &&
        text.includes(",")
    ) {

        text = text
            .replace(/\./g, "")
            .replace(",", ".");

    } else if (text.includes(",")) {

        text = text.replace(",", ".");

    }

    const number = Number(text);

    return Number.isFinite(number)
        ? number
        : 0;

}


/* =====================================================
   DATA
===================================================== */

function parseDateValue(value) {

    if (!value) {

        return null;

    }


    if (value instanceof Date) {

        return isNaN(value.getTime())
            ? null
            : value;

    }


    const text = String(value).trim();


    /*
       YYYY-MM-DD

       É importante não usar
       new Date("YYYY-MM-DD")
       porque pode causar diferença de fuso.
    */

    const simpleDate =
        text.match(/^(\d{4})-(\d{2})-(\d{2})$/);


    if (simpleDate) {

        return new Date(

            Number(simpleDate[1]),

            Number(simpleDate[2]) - 1,

            Number(simpleDate[3])

        );

    }


    /*
       DD/MM/YYYY
    */

    const brDate =
        text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);


    if (brDate) {

        return new Date(

            Number(brDate[3]),

            Number(brDate[2]) - 1,

            Number(brDate[1])

        );

    }


    const date = new Date(text);


    if (isNaN(date.getTime())) {

        return null;

    }


    return date;

}


/* =====================================================
   DATA PARA INPUT
===================================================== */

function dateInputValue(date = new Date()) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


/* =====================================================
   FORMATAR DATA
===================================================== */

function formatDate(value) {

    const date = parseDateValue(value);

    if (!date) {

        return "-";

    }

    return date.toLocaleDateString("pt-BR");

}


/* =====================================================
   DATA DO REGISTRO
===================================================== */

function getRecordDate(record) {

    if (!record) {

        return null;

    }

    return (
        parseDateValue(record.Data) ||
        parseDateValue(record.Registro)
    );

}


/* =====================================================
   CHAVE DA DATA
===================================================== */

function dateKey(date) {

    if (!date) {

        return "";

    }

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


/* =====================================================
   ORDENAR MAIS RECENTE
===================================================== */

function sortNewest(a, b) {

    const dateA = getRecordDate(a);
    const dateB = getRecordDate(b);

    const timeA =
        dateA ? dateA.getTime() : 0;

    const timeB =
        dateB ? dateB.getTime() : 0;

    return timeB - timeA;

}


/* =====================================================
   MÊS / ANO
===================================================== */

const MONTH_NAMES = [

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


/* =====================================================
   NORMALIZAR VENDAS
===================================================== */

function normalizeSales(data) {

    return (data || []).map(item => ({

        Registro: item.Registro,

        Data: item.Data,

        Produto: item.Produto || "",

        Cliente: item.Cliente || "",

        Quantidade:
            toNumber(item.Quantidade),

        Pagamento:
            item.Pagamento || "",

        ValorUnitario:
            toNumber(item.ValorUnitario),

        Total:
            toNumber(item.Total),

        linha:
            Number(item.linha) || 0

    }));

}


/* =====================================================
   NORMALIZAR DESPESAS
===================================================== */

function normalizeExpenses(data) {

    return (data || []).map(item => ({

        Registro: item.Registro,

        Data: item.Data,

        Descricao:
            item.Descricao || "",

        Categoria:
            item.Categoria || "",

        Pagamento:
            item.Pagamento || "",

        Valor:
            toNumber(item.Valor),

        linha:
            Number(item.linha) || 0

    }));

}


/* =====================================================
   NORMALIZAR PRODUTOS
===================================================== */

function normalizeProducts(data) {

    return (data || []).map(item => ({

        Registro: item.Registro,

        Nome:
            item.Nome || "",

        Quantidade:
            toNumber(item.Quantidade),

        Minimo:
            toNumber(item.Minimo),

        Preco:
            toNumber(item.Preco),

        Custo:
            toNumber(item.Custo),

        linha:
            Number(item.linha) || 0

    }));

}


/* =====================================================
   CARREGAR DADOS DA PLANILHA
===================================================== */

async function loadData() {

    try {

        const response = await fetch(

            GOOGLE_SCRIPT_URL +
            "?t=" +
            Date.now(),

            {
                method: "GET",

                cache: "no-store"

            }

        );


        if (!response.ok) {

            throw new Error(
                "Erro ao acessar a planilha."
            );

        }


        const data =
            await response.json();


        sales =
            normalizeSales(
                data.vendas || []
            );


        expenses =
            normalizeExpenses(
                data.despesas || []
            );


        products =
            normalizeProducts(
                data.produtos || []
            );


        renderAll();


    } catch (error) {

        console.error(
            "Erro ao carregar dados:",
            error
        );


        renderAll();


        showToast(
            "Não foi possível carregar os dados."
        );

    }

}


/* =====================================================
   ENVIAR PARA O GOOGLE APPS SCRIPT
===================================================== */

async function postData(payload) {

    const body =
        new URLSearchParams();


    Object.entries(payload).forEach(
        ([key, value]) => {

            body.append(

                key,

                value === null ||
                value === undefined
                    ? ""
                    : String(value)

            );

        }
    );


    const response =
        await fetch(

            GOOGLE_SCRIPT_URL,

            {

                method: "POST",

                body: body

            }

        );


    if (!response.ok) {

        throw new Error(
            "Erro ao enviar os dados."
        );

    }


    const text =
        await response.text();


    if (!text) {

        return {
            sucesso: true
        };

    }


    try {

        const result =
            JSON.parse(text);


        if (
            result &&
            result.sucesso === false
        ) {

            throw new Error(
                result.mensagem ||
                "Erro no servidor."
            );

        }


        return result;


    } catch (error) {

        /*
           Se o Apps Script responder com
           texto simples, consideramos enviado.
        */

        return {

            sucesso: true,

            mensagem: text

        };

    }

}


/* =====================================================
   RENDERIZAR TUDO
===================================================== */

function renderAll() {

    renderDashboard();

    renderSales();

    renderExpenses();

    renderProducts();

    renderMonthlyReport();

    renderGeneralReports();

}


/* =====================================================
   FILTRO DO DASHBOARD
===================================================== */

function getDashboardPeriod() {

    const element =
        $("dashboardPeriod");

    return element
        ? element.value
        : "month";

}


/* =====================================================
   FILTRAR DASHBOARD
===================================================== */

function getDashboardData() {

    const period =
        getDashboardPeriod();


    const now =
        new Date();


    const currentYear =
        now.getFullYear();


    const currentMonth =
        now.getMonth();


    let filteredSales =
        [...sales];


    let filteredExpenses =
        [...expenses];


    if (period === "today") {

        const today =
            dateKey(now);


        filteredSales =
            sales.filter(item => {

                const date =
                    getRecordDate(item);

                return (
                    date &&
                    dateKey(date) === today
                );

            });


        filteredExpenses =
            expenses.filter(item => {

                const date =
                    getRecordDate(item);

                return (
                    date &&
                    dateKey(date) === today
                );

            });

    }


    if (period === "month") {

        filteredSales =
            sales.filter(item => {

                const date =
                    getRecordDate(item);

                return (

                    date &&

                    date.getFullYear() ===
                        currentYear &&

                    date.getMonth() ===
                        currentMonth

                );

            });


        filteredExpenses =
            expenses.filter(item => {

                const date =
                    getRecordDate(item);

                return (

                    date &&

                    date.getFullYear() ===
                        currentYear &&

                    date.getMonth() ===
                        currentMonth

                );

            });

    }


    if (period === "year") {

        filteredSales =
            sales.filter(item => {

                const date =
                    getRecordDate(item);

                return (

                    date &&

                    date.getFullYear() ===
                        currentYear

                );

            });


        filteredExpenses =
            expenses.filter(item => {

                const date =
                    getRecordDate(item);

                return (

                    date &&

                    date.getFullYear() ===
                        currentYear

                );

            });

    }


    return {

        sales: filteredSales,

        expenses: filteredExpenses

    };

}


/* =====================================================
   DASHBOARD
===================================================== */

function renderDashboard() {

    const data =
        getDashboardData();


    const filteredSales =
        data.sales;


    const filteredExpenses =
        data.expenses;


    const revenue =
        filteredSales.reduce(

            (sum, item) =>
                sum + toNumber(item.Total),

            0

        );


    const expenseTotal =
        filteredExpenses.reduce(

            (sum, item) =>
                sum + toNumber(item.Valor),

            0

        );


    const profit =
        revenue - expenseTotal;


    const orders =
        filteredSales.length;


    const average =
        orders > 0
            ? revenue / orders
            : 0;


    const margin =
        revenue > 0
            ? (profit / revenue) * 100
            : 0;


    const lowStock =
        products.filter(item =>

            toNumber(item.Quantidade) <=
            toNumber(item.Minimo)

        ).length;


    setText(
        "dashRevenue",
        formatCurrency(revenue)
    );


    setText(
        "dashExpenses",
        formatCurrency(expenseTotal)
    );


    setText(
        "dashProfit",
        formatCurrency(profit)
    );


    setText(
        "dashOrders",
        formatNumber(orders)
    );


    setText(
        "averageTicket",
        formatCurrency(average)
    );


    setText(
        "productCount",
        formatNumber(products.length)
    );


    setText(
        "lowStockCount",
        formatNumber(lowStock)
    );


    setText(
        "profitMargin",
        formatPercent(margin)
    );


    renderRecentSales(
        filteredSales
    );


    renderFinanceChart(
        filteredSales,
        filteredExpenses
    );

}


/* =====================================================
   VENDAS RECENTES
===================================================== */

function renderRecentSales(data) {

    const table =
        $("recentSales");


    const empty =
        $("emptyRecentSales");


    if (!table) {

        return;

    }


    const recent =
        [...data]
            .sort(sortNewest)
            .slice(0, 8);


    if (!recent.length) {

        table.innerHTML = "";

        if (empty) {

            empty.style.display =
                "block";

        }

        return;

    }


    if (empty) {

        empty.style.display =
            "none";

    }


    table.innerHTML =
        recent.map(item => `

            <tr>

                <td>
                    ${escapeHTML(
                        formatDate(item.Data)
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.Produto
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.Cliente || "-"
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.Quantidade
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        item.Total
                    )}
                </td>

            </tr>

        `).join("");

}


/* =====================================================
   GRÁFICO FINANCEIRO DO DASHBOARD
===================================================== */

function renderFinanceChart(
    filteredSales,
    filteredExpenses
) {

    const canvas =
        $("financeChart");


    if (!canvas || typeof Chart === "undefined") {

        return;

    }


    if (financeChart) {

        financeChart.destroy();

    }


    const period =
        getDashboardPeriod();


    const now =
        new Date();


    const labels = [];

    const revenueData = [];

    const expenseData = [];


    if (period === "today") {

        labels.push("Hoje");


        revenueData.push(

            filteredSales.reduce(

                (sum, item) =>
                    sum + toNumber(item.Total),

                0

            )

        );


        expenseData.push(

            filteredExpenses.reduce(

                (sum, item) =>
                    sum + toNumber(item.Valor),

                0

            )

        );

    }


    else if (period === "month") {

        const year =
            now.getFullYear();

        const month =
            now.getMonth();

        const days =
            new Date(
                year,
                month + 1,
                0
            ).getDate();


        for (
            let day = 1;
            day <= days;
            day++
        ) {

            labels.push(
                String(day)
            );


            const revenue =
                filteredSales
                    .filter(item => {

                        const date =
                            getRecordDate(item);

                        return (

                            date &&

                            date.getDate() ===
                                day

                        );

                    })
                    .reduce(

                        (sum, item) =>
                            sum + toNumber(item.Total),

                        0

                    );


            const expense =
                filteredExpenses
                    .filter(item => {

                        const date =
                            getRecordDate(item);

                        return (

                            date &&

                            date.getDate() ===
                                day

                        );

                    })
                    .reduce(

                        (sum, item) =>
                            sum + toNumber(item.Valor),

                        0

                    );


            revenueData.push(revenue);

            expenseData.push(expense);

        }

    }


    else {

        for (
            let month = 0;
            month < 12;
            month++
        ) {

            labels.push(
                MONTH_NAMES[month].substring(0, 3)
            );


            revenueData.push(

                filteredSales
                    .filter(item => {

                        const date =
                            getRecordDate(item);

                        return (

                            date &&

                            date.getMonth() ===
                                month

                        );

                    })
                    .reduce(

                        (sum, item) =>
                            sum + toNumber(item.Total),

                        0

                    )

            );


            expenseData.push(

                filteredExpenses
                    .filter(item => {

                        const date =
                            getRecordDate(item);

                        return (

                            date &&

                            date.getMonth() ===
                                month

                        );

                    })
                    .reduce(

                        (sum, item) =>
                            sum + toNumber(item.Valor),

                        0

                    )

            );

        }

    }


    financeChart =
        new Chart(

            canvas,

            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label: "Vendas",

                            data: revenueData,

                            borderColor:
                                "#4F8A68",

                            backgroundColor:
                                "rgba(79,138,104,.10)",

                            tension: .35,

                            fill: true,

                            borderWidth: 2

                        },

                        {

                            label: "Despesas",

                            data: expenseData,

                            borderColor:
                                "#C75C65",

                            backgroundColor:
                                "rgba(199,92,101,.08)",

                            tension: .35,

                            fill: true,

                            borderWidth: 2

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        intersect: false,

                        mode: "index"

                    },

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true

                            }

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (

                                            " " +
                                            context.dataset.label +
                                            ": " +
                                            formatCurrency(
                                                context.raw
                                            )

                                        );

                                    }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return formatCurrency(
                                            value
                                        );

                                    }

                            }

                        }

                    }

                }

            }

        );

}


/* =====================================================
   VENDAS
===================================================== */

function renderSales() {

    const total =
        sales.reduce(

            (sum, item) =>
                sum + toNumber(item.Total),

            0

        );


    const quantity =
        sales.reduce(

            (sum, item) =>
                sum + toNumber(item.Quantidade),

            0

        );


    const average =
        sales.length
            ? total / sales.length
            : 0;


    setText(
        "salesTotal",
        formatCurrency(total)
    );


    setText(
        "salesQuantity",
        formatNumber(quantity)
    );


    setText(
        "salesAverage",
        formatCurrency(average)
    );


    const table =
        $("salesTable");


    const empty =
        $("emptySales");


    if (!table) {

        return;

    }


    const search =
        (
            $("salesSearch")?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const filtered =
        [...sales]
            .sort(sortNewest)
            .filter(item => {

                if (!search) {

                    return true;

                }


                const text = [

                    item.Produto,

                    item.Cliente,

                    item.Pagamento,

                    formatDate(item.Data),

                    item.Data

                ]
                    .join(" ")
                    .toLowerCase();


                return text.includes(search);

            });


    if (!filtered.length) {

        table.innerHTML = "";

        if (empty) {

            empty.style.display =
                "block";

        }

        return;

    }


    if (empty) {

        empty.style.display =
            "none";

    }


    table.innerHTML =
        filtered.map(item => `

            <tr>

                <td>
                    ${escapeHTML(
                        formatDate(item.Data)
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.Produto
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.Cliente || "-"
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.Quantidade
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.Pagamento || "-"
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        item.Total
                    )}
                </td>

                <td>

                    <button
                        class="delete-button"
                        title="Excluir venda"
                        data-delete-sale="${item.linha}"
                    >

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </td>

            </tr>

        `).join("");

}


/* =====================================================
   DESPESAS
===================================================== */

function renderExpenses() {

    const total =
        expenses.reduce(

            (sum, item) =>
                sum + toNumber(item.Valor),

            0

        );


    const largest =
        expenses.reduce(

            (max, item) =>
                Math.max(
                    max,
                    toNumber(item.Valor)
                ),

            0

        );


    setText(
        "expenseTotal",
        formatCurrency(total)
    );


    setText(
        "expenseQuantity",
        formatNumber(expenses.length)
    );


    setText(
        "largestExpense",
        formatCurrency(largest)
    );


    const table =
        $("expensesTable");


    const empty =
        $("emptyExpenses");


    if (!table) {

        return;

    }


    const search =
        (
            $("expenseSearch")?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const filtered =
        [...expenses]
            .sort(sortNewest)
            .filter(item => {

                if (!search) {

                    return true;

                }


                const text = [

                    item.Descricao,

                    item.Categoria,

                    item.Pagamento,

                    formatDate(item.Data),

                    item.Data

                ]
                    .join(" ")
                    .toLowerCase();


                return text.includes(search);

            });


    if (!filtered.length) {

        table.innerHTML = "";

        if (empty) {

            empty.style.display =
                "block";

        }

        return;

    }


    if (empty) {

        empty.style.display =
            "none";

    }


    table.innerHTML =
        filtered.map(item => `

            <tr>

                <td>
                    ${escapeHTML(
                        formatDate(item.Data)
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.Descricao
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.Categoria || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.Pagamento || "-"
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        item.Valor
                    )}
                </td>

                <td>

                    <button
                        class="delete-button"
                        title="Excluir despesa"
                        data-delete-expense="${item.linha}"
                    >

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </td>

            </tr>

        `).join("");

}


/* =====================================================
   ESTOQUE
===================================================== */

function renderProducts() {

    const units =
        products.reduce(

            (sum, item) =>
                sum + toNumber(item.Quantidade),

            0

        );


    const low =
        products.filter(item =>

            toNumber(item.Quantidade) <=
            toNumber(item.Minimo)

        ).length;


    setText(
        "stockProducts",
        formatNumber(products.length)
    );


    setText(
        "stockUnits",
        formatNumber(units)
    );


    setText(
        "stockLow",
        formatNumber(low)
    );


    const grid =
        $("productGrid");


    const empty =
        $("emptyProducts");


    if (!grid) {

        return;

    }


    if (!products.length) {

        grid.innerHTML = "";

        if (empty) {

            empty.style.display =
                "block";

        }

        return;

    }


    if (empty) {

        empty.style.display =
            "none";

    }


    grid.innerHTML =
        products.map(item => {

            const quantity =
                toNumber(item.Quantidade);

            const minimum =
                toNumber(item.Minimo);


            const percentage =
                minimum > 0

                    ? Math.min(
                        100,
                        (quantity / minimum) * 100
                    )

                    : Math.min(
                        100,
                        quantity > 0
                            ? 100
                            : 0
                    );


            const isLow =
                quantity <= minimum;


            return `

                <div class="product-card">

                    <div class="product-top">

                        <div>

                            <div class="product-image">

                                <i class="fa-solid fa-box"></i>

                            </div>

                        </div>

                        <button
                            class="delete-button"
                            title="Excluir produto"
                            data-delete-product="${item.linha}"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>


                    <h4>
                        ${escapeHTML(item.Nome)}
                    </h4>


                    <div class="product-price">

                        ${formatCurrency(item.Preco)}

                    </div>


                    <div class="stock-bar">

                        <div
                            class="stock-progress ${isLow ? "low" : ""}"
                            style="width:${percentage}%"
                        ></div>

                    </div>


                    <div class="stock-info">

                        <span>
                            Estoque:
                            ${formatNumber(quantity)}
                        </span>

                        <span>
                            Mínimo:
                            ${formatNumber(minimum)}
                        </span>

                    </div>


                    <div class="product-actions">

                        <span>
                            Custo:
                            ${formatCurrency(item.Custo)}
                        </span>

                        <strong>
                            ${isLow ? "Estoque baixo" : "Normal"}
                        </strong>

                    </div>

                </div>

            `;

        }).join("");

}


/* =====================================================
   INICIALIZAR SELECT DE ANO
===================================================== */

function initReportSelectors() {

    const monthSelect =
        $("reportMonth");


    const yearSelect =
        $("reportYear");


    const now =
        new Date();


    if (monthSelect) {

        monthSelect.innerHTML =
            MONTH_NAMES.map(
                (month, index) => `

                    <option value="${index}">
                        ${month}
                    </option>

                `
            ).join("");


        monthSelect.value =
            String(now.getMonth());

    }


    if (yearSelect) {

        const years = [];


        const currentYear =
            now.getFullYear();


        for (
            let year = currentYear - 5;
            year <= currentYear + 1;
            year++
        ) {

            years.push(year);

        }


        yearSelect.innerHTML =
            years.map(
                year => `

                    <option value="${year}">
                        ${year}
                    </option>

                `
            ).join("");


        yearSelect.value =
            String(currentYear);

    }

}


/* =====================================================
   DADOS DO BALANÇO MENSAL
===================================================== */

function getSelectedMonthData() {

    const month =
        Number(
            $("reportMonth")?.value ??
            new Date().getMonth()
        );


    const year =
        Number(
            $("reportYear")?.value ??
            new Date().getFullYear()
        );


    const monthSales =
        sales.filter(item => {

            const date =
                getRecordDate(item);

            return (

                date &&

                date.getMonth() === month &&

                date.getFullYear() === year

            );

        });


    const monthExpenses =
        expenses.filter(item => {

            const date =
                getRecordDate(item);

            return (

                date &&

                date.getMonth() === month &&

                date.getFullYear() === year

            );

        });


    return {

        month,

        year,

        sales: monthSales,

        expenses: monthExpenses

    };

}


/* =====================================================
   BALANÇO MENSAL
===================================================== */

function renderMonthlyReport() {

    const data =
        getSelectedMonthData();


    const monthSales =
        data.sales;


    const monthExpenses =
        data.expenses;


    const revenue =
        monthSales.reduce(

            (sum, item) =>
                sum + toNumber(item.Total),

            0

        );


    const expenseTotal =
        monthExpenses.reduce(

            (sum, item) =>
                sum + toNumber(item.Valor),

            0

        );


    const profit =
        revenue - expenseTotal;


    const margin =
        revenue > 0
            ? (profit / revenue) * 100
            : 0;


    const ticket =
        monthSales.length
            ? revenue / monthSales.length
            : 0;


    const items =
        monthSales.reduce(

            (sum, item) =>
                sum + toNumber(item.Quantidade),

            0

        );


    setText(
        "monthlyReportTitle",
        `Balanço de ${MONTH_NAMES[data.month]}`
    );


    setText(
        "monthlyRevenue",
        formatCurrency(revenue)
    );


    setText(
        "monthlyExpenses",
        formatCurrency(expenseTotal)
    );


    setText(
        "monthlyProfit",
        formatCurrency(profit)
    );


    setText(
        "monthlyMargin",
        formatPercent(margin)
    );


    setText(
        "monthlySalesCount",
        formatNumber(monthSales.length)
    );


    setText(
        "monthlyTicket",
        formatCurrency(ticket)
    );


    setText(
        "monthlyItems",
        formatNumber(items)
    );


    const bestProduct =
        getBestMonthlyProduct(
            monthSales
        );


    setText(
        "monthlyBestProduct",
        bestProduct
            ? bestProduct.name
            : "Nenhum"
    );


    renderMonthlyChart(
        monthSales,
        monthExpenses,
        data.month,
        data.year
    );


    renderMonthlySalesPie(
        monthSales
    );


    renderMonthlyExpensesPie(
        monthExpenses
    );


    renderMonthlyPayments(
        monthSales
    );


    renderMonthlyBestProducts(
        monthSales
    );


    renderMonthlyComparison(
        data.month,
        data.year
    );

}


/* =====================================================
   GRÁFICO DIÁRIO DO MÊS
===================================================== */

function renderMonthlyChart(
    monthSales,
    monthExpenses,
    month,
    year
) {

    const canvas =
        $("monthlyChart");


    if (!canvas || typeof Chart === "undefined") {

        return;

    }


    if (monthlyChart) {

        monthlyChart.destroy();

    }


    const days =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    const labels = [];

    const revenueData = [];

    const expenseData = [];


    for (
        let day = 1;
        day <= days;
        day++
    ) {

        labels.push(
            String(day)
        );


        const revenue =
            monthSales
                .filter(item => {

                    const date =
                        getRecordDate(item);

                    return (

                        date &&
                        date.getDate() === day

                    );

                })
                .reduce(

                    (sum, item) =>
                        sum + toNumber(item.Total),

                    0

                );


        const expense =
            monthExpenses
                .filter(item => {

                    const date =
                        getRecordDate(item);

                    return (

                        date &&
                        date.getDate() === day

                    );

                })
                .reduce(

                    (sum, item) =>
                        sum + toNumber(item.Valor),

                    0

                );


        revenueData.push(revenue);

        expenseData.push(expense);

    }


    monthlyChart =
        new Chart(

            canvas,

            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label: "Vendas",

                            data: revenueData,

                            borderColor:
                                "#5B9BD5",

                            backgroundColor:
                                "rgba(91,155,213,.12)",

                            fill: true,

                            tension: .35,

                            borderWidth: 2

                        },

                        {

                            label: "Despesas",

                            data: expenseData,

                            borderColor:
                                "#C75C65",

                            backgroundColor:
                                "rgba(199,92,101,.08)",

                            fill: true,

                            tension: .35,

                            borderWidth: 2

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        mode: "index",

                        intersect: false

                    },

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true

                            }

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (

                                            " " +
                                            context.dataset.label +
                                            ": " +
                                            formatCurrency(
                                                context.raw
                                            )

                                        );

                                    }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return formatCurrency(
                                            value
                                        );

                                    }

                            }

                        }

                    }

                }

            }

        );

}


/* =====================================================
   PREPARAR CANVAS DE PIZZA
===================================================== */

function getOrCreatePieCanvas(
    preferredId,
    parentSelector,
    fallbackId
) {

    let canvas =
        $(preferredId);


    if (canvas) {

        return canvas;

    }


    const parent =
        document.querySelector(
            parentSelector
        );


    if (!parent) {

        return null;

    }


    /*
       Caso o HTML já tenha um canvas
       dentro do card, usamos ele.
    */

    canvas =
        parent.querySelector(
            "canvas"
        );


    if (canvas) {

        return canvas;

    }


    /*
       Caso não exista, criamos automaticamente.
    */

    canvas =
        document.createElement("canvas");


    canvas.id =
        fallbackId;


    const container =
        document.createElement("div");


    container.style.height =
        "260px";


    container.style.position =
        "relative";


    container.appendChild(canvas);


    parent.appendChild(container);


    return canvas;

}


/* =====================================================
   GRÁFICO DE PIZZA — VENDAS
===================================================== */

function renderMonthlySalesPie(
    monthSales
) {

    const canvas =
        getOrCreatePieCanvas(

            "monthlySalesChart",

            ".revenue-month",

            "monthlySalesChart"

        );


    if (!canvas || typeof Chart === "undefined") {

        return;

    }


    if (monthlySalesPie) {

        monthlySalesPie.destroy();

    }


    /*
       Agrupar vendas por produto
    */

    const grouped = {};


    monthSales.forEach(item => {

        const product =
            String(
                item.Produto ||
                "Sem produto"
            ).trim();


        if (!grouped[product]) {

            grouped[product] = 0;

        }


        grouped[product] +=
            toNumber(item.Total);

    });


    const labels =
        Object.keys(grouped);


    const values =
        labels.map(
            label => grouped[label]
        );


    /*
       Se não houver vendas
    */

    if (!labels.length) {

        monthlySalesPie =
            new Chart(

                canvas,

                {

                    type: "pie",

                    data: {

                        labels: [
                            "Sem vendas"
                        ],

                        datasets: [

                            {

                                data: [1],

                                backgroundColor: [
                                    "#E1E6EA"
                                ],

                                borderColor:
                                    "#FFFFFF",

                                borderWidth: 3

                            }

                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        plugins: {

                            legend: {

                                position: "bottom"

                            }

                        }

                    }

                }

            );

        return;

    }


    const colors =
        labels.map(
            label =>
                getItemColor(label)
        );


    monthlySalesPie =
        new Chart(

            canvas,

            {

                type: "pie",

                data: {

                    labels,

                    datasets: [

                        {

                            data: values,

                            backgroundColor:
                                colors,

                            borderColor:
                                "#FFFFFF",

                            borderWidth: 3,

                            hoverOffset: 7

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true,

                                padding: 15,

                                font: {

                                    size: 11

                                }

                            }

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        const total =
                                            values.reduce(
                                                (
                                                    sum,
                                                    value
                                                ) =>
                                                    sum + value,

                                                0
                                            );


                                        const value =
                                            Number(
                                                context.raw
                                            ) || 0;


                                        const percentage =
                                            total > 0

                                                ? (
                                                    value /
                                                    total
                                                ) * 100

                                                : 0;


                                        return (

                                            " " +
                                            context.label +
                                            ": " +
                                            formatCurrency(
                                                value
                                            ) +
                                            " (" +
                                            percentage.toLocaleString(
                                                "pt-BR",
                                                {
                                                    maximumFractionDigits: 1
                                                }
                                            ) +
                                            "%)"

                                        );

                                    }

                            }

                        }

                    }

                }

            }

        );

}


/* =====================================================
   GRÁFICO DE PIZZA — DESPESAS
===================================================== */

function renderMonthlyExpensesPie(
    monthExpenses
) {

    const canvas =
        getOrCreatePieCanvas(

            "monthlyExpensesChart",

            ".expense-month",

            "monthlyExpensesChart"

        );


    if (!canvas || typeof Chart === "undefined") {

        return;

    }


    if (monthlyExpensesPie) {

        monthlyExpensesPie.destroy();

    }


    /*
       Agrupar despesas por categoria
    */

    const grouped = {};


    monthExpenses.forEach(item => {

        const category =
            String(
                item.Categoria ||
                "Sem categoria"
            ).trim();


        if (!grouped[category]) {

            grouped[category] = 0;

        }


        grouped[category] +=
            toNumber(item.Valor);

    });


    const labels =
        Object.keys(grouped);


    const values =
        labels.map(
            label => grouped[label]
        );


    /*
       Sem despesas
    */

    if (!labels.length) {

        monthlyExpensesPie =
            new Chart(

                canvas,

                {

                    type: "pie",

                    data: {

                        labels: [
                            "Sem despesas"
                        ],

                        datasets: [

                            {

                                data: [1],

                                backgroundColor: [
                                    "#E1E6EA"
                                ],

                                borderColor:
                                    "#FFFFFF",

                                borderWidth: 3

                            }

                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        plugins: {

                            legend: {

                                position: "bottom"

                            }

                        }

                    }

                }

            );

        return;

    }


    const colors =
        labels.map(
            label =>
                getItemColor(
                    "despesa-" + label
                )
        );


    monthlyExpensesPie =
        new Chart(

            canvas,

            {

                type: "pie",

                data: {

                    labels,

                    datasets: [

                        {

                            data: values,

                            backgroundColor:
                                colors,

                            borderColor:
                                "#FFFFFF",

                            borderWidth: 3,

                            hoverOffset: 7

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true,

                                padding: 15,

                                font: {

                                    size: 11

                                }

                            }

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        const total =
                                            values.reduce(
                                                (
                                                    sum,
                                                    value
                                                ) =>
                                                    sum + value,

                                                0
                                            );


                                        const value =
                                            Number(
                                                context.raw
                                            ) || 0;


                                        const percentage =
                                            total > 0

                                                ? (
                                                    value /
                                                    total
                                                ) * 100

                                                : 0;


                                        return (

                                            " " +
                                            context.label +
                                            ": " +
                                            formatCurrency(
                                                value
                                            ) +
                                            " (" +
                                            percentage.toLocaleString(
                                                "pt-BR",
                                                {
                                                    maximumFractionDigits: 1
                                                }
                                            ) +
                                            "%)"

                                        );

                                    }

                            }

                        }

                    }

                }

            }

        );

}


/* =====================================================
   MELHOR PRODUTO DO MÊS
===================================================== */

function getBestMonthlyProduct(
    monthSales
) {

    const grouped = {};


    monthSales.forEach(item => {

        const name =
            String(
                item.Produto ||
                "Sem produto"
            ).trim();


        if (!grouped[name]) {

            grouped[name] = {

                quantity: 0,

                revenue: 0

            };

        }


        grouped[name].quantity +=
            toNumber(item.Quantidade);


        grouped[name].revenue +=
            toNumber(item.Total);

    });


    const entries =
        Object.entries(grouped);


    if (!entries.length) {

        return null;

    }


    entries.sort(
        (a, b) =>
            b[1].quantity -
            a[1].quantity
    );


    return {

        name: entries[0][0],

        quantity:
            entries[0][1].quantity,

        revenue:
            entries[0][1].revenue

    };

}


/* =====================================================
   PAGAMENTOS DO MÊS
===================================================== */

function renderMonthlyPayments(
    monthSales
) {

    const container =
        $("monthlyPayments");


    if (!container) {

        return;

    }


    const grouped = {};


    monthSales.forEach(item => {

        const payment =
            String(
                item.Pagamento ||
                "Não informado"
            ).trim();


        if (!grouped[payment]) {

            grouped[payment] = 0;

        }


        grouped[payment] +=
            toNumber(item.Total);

    });


    const entries =
        Object.entries(grouped)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    if (!entries.length) {

        container.innerHTML = `

            <div class="empty-state">

                <p>
                    Nenhum pagamento registrado neste mês.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        entries.map(
            ([payment, value]) => `

                <div class="payment-row">

                    <div class="payment-left">

                        <i class="fa-solid fa-credit-card"></i>

                        <span>
                            ${escapeHTML(payment)}
                        </span>

                    </div>

                    <div class="payment-right">

                        ${formatCurrency(value)}

                    </div>

                </div>

            `
        ).join("");

}


/* =====================================================
   PRODUTOS MAIS VENDIDOS DO MÊS
===================================================== */

function renderMonthlyBestProducts(
    monthSales
) {

    const container =
        $("monthlyBestProducts");


    if (!container) {

        return;

    }


    const grouped = {};


    monthSales.forEach(item => {

        const name =
            String(
                item.Produto ||
                "Sem produto"
            ).trim();


        if (!grouped[name]) {

            grouped[name] = {

                quantity: 0,

                revenue: 0

            };

        }


        grouped[name].quantity +=
            toNumber(item.Quantidade);


        grouped[name].revenue +=
            toNumber(item.Total);

    });


    const entries =
        Object.entries(grouped)
            .sort(
                (a, b) =>
                    b[1].quantity -
                    a[1].quantity
            )
            .slice(0, 5);


    if (!entries.length) {

        container.innerHTML = `

            <div class="empty-state">

                <p>
                    Nenhuma venda neste mês.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        entries.map(
            ([name, data], index) => `

                <div class="rank-item">

                    <div class="rank-left">

                        <div class="rank-number">
                            ${index + 1}
                        </div>

                        <div>

                            <div class="rank-name">
                                ${escapeHTML(name)}
                            </div>

                            <div class="rank-value">
                                ${formatCurrency(
                                    data.revenue
                                )}
                            </div>

                        </div>

                    </div>

                    <div class="rank-value">

                        ${formatNumber(
                            data.quantity
                        )} un.

                    </div>

                </div>

            `
        ).join("");

}


/* =====================================================
   COMPARATIVO DOS MESES
===================================================== */

function getMonthOffset(
    month,
    year,
    offset
) {

    const date =
        new Date(
            year,
            month + offset,
            1
        );


    return {

        month:
            date.getMonth(),

        year:
            date.getFullYear()

    };

}


/* =====================================================
   DADOS COMPARATIVOS
===================================================== */

function getMonthlyTotals(
    month,
    year
) {

    const monthSales =
        sales.filter(item => {

            const date =
                getRecordDate(item);

            return (

                date &&

                date.getMonth() === month &&

                date.getFullYear() === year

            );

        });


    const monthExpenses =
        expenses.filter(item => {

            const date =
                getRecordDate(item);

            return (

                date &&

                date.getMonth() === month &&

                date.getFullYear() === year

            );

        });


    const revenue =
        monthSales.reduce(

            (sum, item) =>
                sum + toNumber(item.Total),

            0

        );


    const expense =
        monthExpenses.reduce(

            (sum, item) =>
                sum + toNumber(item.Valor),

            0

        );


    return {

        revenue,

        expense,

        profit:
            revenue - expense

    };

}


/* =====================================================
   RENDERIZAR COMPARATIVO
===================================================== */

function renderMonthlyComparison(
    selectedMonth,
    selectedYear
) {

    const labels = [];

    const revenueData = [];

    const expenseData = [];

    const profitData = [];

    const rows = [];


    for (
        let offset = -5;
        offset <= 0;
        offset++
    ) {

        const target =
            getMonthOffset(
                selectedMonth,
                selectedYear,
                offset
            );


        const totals =
            getMonthlyTotals(
                target.month,
                target.year
            );


        labels.push(

            MONTH_NAMES[
                target.month
            ].substring(0, 3) +
            "/" +
            String(
                target.year
            ).slice(-2)

        );


        revenueData.push(
            totals.revenue
        );


        expenseData.push(
            totals.expense
        );


        profitData.push(
            totals.profit
        );


        rows.push({

            month:
                MONTH_NAMES[
                    target.month
                ],

            year:
                target.year,

            revenue:
                totals.revenue,

            expense:
                totals.expense,

            profit:
                totals.profit

        });

    }


    renderComparisonChart(
        labels,
        revenueData,
        expenseData,
        profitData
    );


    renderComparisonTable(
        rows
    );

}


/* =====================================================
   GRÁFICO COMPARATIVO
===================================================== */

function renderComparisonChart(
    labels,
    revenueData,
    expenseData,
    profitData
) {

    const canvas =
        $("comparisonChart");


    if (!canvas || typeof Chart === "undefined") {

        return;

    }


    if (comparisonChart) {

        comparisonChart.destroy();

    }


    comparisonChart =
        new Chart(

            canvas,

            {

                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {

                            label: "Vendas",

                            data: revenueData,

                            backgroundColor:
                                "#5B9BD5",

                            borderRadius: 6

                        },

                        {

                            label: "Despesas",

                            data: expenseData,

                            backgroundColor:
                                "#C75C65",

                            borderRadius: 6

                        },

                        {

                            label: "Lucro",

                            data: profitData,

                            backgroundColor:
                                "#4F8A68",

                            borderRadius: 6

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true

                            }

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return (

                                            " " +
                                            context.dataset.label +
                                            ": " +
                                            formatCurrency(
                                                context.raw
                                            )

                                        );

                                    }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return formatCurrency(
                                            value
                                        );

                                    }

                            }

                        }

                    }

                }

            }

        );

}


/* =====================================================
   TABELA COMPARATIVA
===================================================== */

function renderComparisonTable(rows) {

    const container =
        $("monthlyComparisonTable");


    if (!container) {

        return;

    }


    container.innerHTML =
        rows.map(row => `

            <tr>

                <td>
                    ${row.month}/${row.year}
                </td>

                <td>
                    ${formatCurrency(
                        row.revenue
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        row.expense
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        row.profit
                    )}
                </td>

            </tr>

        `).join("");

}


/* =====================================================
   RELATÓRIOS GERAIS
===================================================== */

function renderGeneralReports() {

    const revenue =
        sales.reduce(

            (sum, item) =>
                sum + toNumber(item.Total),

            0

        );


    const expense =
        expenses.reduce(

            (sum, item) =>
                sum + toNumber(item.Valor),

            0

        );


    const profit =
        revenue - expense;


    const margin =
        revenue > 0
            ? (profit / revenue) * 100
            : 0;


    setText(
        "reportRevenue",
        formatCurrency(revenue)
    );


    setText(
        "reportExpenses",
        formatCurrency(expense)
    );


    setText(
        "reportProfit",
        formatCurrency(profit)
    );


    setText(
        "reportMargin",
        formatPercent(margin)
    );


    renderOverallBestProducts();

    renderExpenseCategories();

    renderFinancialSummary();

}


/* =====================================================
   PRODUTOS MAIS VENDIDOS — GERAL
===================================================== */

function renderOverallBestProducts() {

    const container =
        $("bestProducts");


    if (!container) {

        return;

    }


    const grouped = {};


    sales.forEach(item => {

        const name =
            String(
                item.Produto ||
                "Sem produto"
            ).trim();


        if (!grouped[name]) {

            grouped[name] = {

                quantity: 0,

                revenue: 0

            };

        }


        grouped[name].quantity +=
            toNumber(item.Quantidade);


        grouped[name].revenue +=
            toNumber(item.Total);

    });


    const entries =
        Object.entries(grouped)
            .sort(
                (a, b) =>
                    b[1].quantity -
                    a[1].quantity
            )
            .slice(0, 5);


    if (!entries.length) {

        container.innerHTML = `

            <div class="empty-state">

                <p>
                    Nenhuma venda registrada.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        entries.map(
            ([name, data], index) => `

                <div class="rank-item">

                    <div class="rank-left">

                        <div class="rank-number">
                            ${index + 1}
                        </div>

                        <div>

                            <div class="rank-name">
                                ${escapeHTML(name)}
                            </div>

                            <div class="rank-value">
                                ${formatCurrency(
                                    data.revenue
                                )}
                            </div>

                        </div>

                    </div>

                    <div class="rank-value">

                        ${formatNumber(
                            data.quantity
                        )} un.

                    </div>

                </div>

            `
        ).join("");

}


/* =====================================================
   CATEGORIAS DE DESPESAS
===================================================== */

function renderExpenseCategories() {

    const container =
        $("expenseCategories");


    if (!container) {

        return;

    }


    const grouped = {};


    expenses.forEach(item => {

        const category =
            String(
                item.Categoria ||
                "Sem categoria"
            ).trim();


        if (!grouped[category]) {

            grouped[category] = 0;

        }


        grouped[category] +=
            toNumber(item.Valor);

    });


    const entries =
        Object.entries(grouped)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    if (!entries.length) {

        container.innerHTML = `

            <div class="empty-state">

                <p>
                    Nenhuma despesa registrada.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        entries.slice(0, 6).map(
            ([name, value], index) => `

                <div class="rank-item">

                    <div class="rank-left">

                        <div class="rank-number">
                            ${index + 1}
                        </div>

                        <div class="rank-name">
                            ${escapeHTML(name)}
                        </div>

                    </div>

                    <div class="rank-value">

                        ${formatCurrency(value)}

                    </div>

                </div>

            `
        ).join("");

}


/* =====================================================
   RESUMO FINANCEIRO
===================================================== */

function renderFinancialSummary() {

    const container =
        $("summaryRevenue")
            ? null
            : null;


    const revenue =
        sales.reduce(

            (sum, item) =>
                sum + toNumber(item.Total),

            0

        );


    const expense =
        expenses.reduce(

            (sum, item) =>
                sum + toNumber(item.Valor),

            0

        );


    const profit =
        revenue - expense;


    setText(
        "summaryRevenue",
        formatCurrency(revenue)
    );


    setText(
        "summaryExpenses",
        formatCurrency(expense)
    );


    setText(
        "summaryProfit",
        formatCurrency(profit)
    );

}


/* =====================================================
   NAVEGAÇÃO
===================================================== */

function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.toggle(
                "active",
                page.id === pageId
            );

        });


    document
        .querySelectorAll(
            ".menu-item[data-page]"
        )
        .forEach(button => {

            button.classList.toggle(

                "active",

                button.dataset.page ===
                pageId

            );

        });


    const titles = {

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
            "ANÁLISE FINANCEIRA",
            "Relatórios"
        ]

    };


    const title =
        titles[pageId];


    if (title) {

        const kicker =
            document.querySelector(
                ".topbar-title span"
            );


        const heading =
            document.querySelector(
                ".topbar-title h2"
            );


        if (kicker) {

            kicker.textContent =
                title[0];

        }


        if (heading) {

            heading.textContent =
                title[1];

        }

    }


    const sidebar =
        $("sidebar");


    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }

}


/* =====================================================
   TEMA ESCURO
===================================================== */

function initTheme() {

    const saved =
        localStorage.getItem(
            "vorita-theme"
        );


    if (saved === "dark") {

        document.body.classList.add(
            "dark"
        );

    }


    updateThemeButton();

}


function toggleTheme() {

    document.body.classList.toggle(
        "dark"
    );


    const isDark =
        document.body.classList.contains(
            "dark"
        );


    localStorage.setItem(

        "vorita-theme",

        isDark
            ? "dark"
            : "light"

    );


    updateThemeButton();

}


function updateThemeButton() {

    const button =
        $("themeButton");


    if (!button) {

        return;

    }


    const isDark =
        document.body.classList.contains(
            "dark"
        );


    button.innerHTML = isDark

        ? '<i class="fa-solid fa-sun"></i>'

        : '<i class="fa-solid fa-moon"></i>';

}


/* =====================================================
   DATA DE HOJE
===================================================== */

function initToday() {

    const today =
        $("today");


    if (!today) {

        return;

    }


    today.textContent =
        new Date().toLocaleDateString(
            "pt-BR",
            {

                weekday: "long",

                day: "2-digit",

                month: "long",

                year: "numeric"

            }
        );

}


/* =====================================================
   MODAIS
===================================================== */

function openModal(id) {

    const modal =
        $(id);


    if (modal) {

        modal.classList.add(
            "active"
        );

    }

}


function closeModal(id) {

    const modal =
        $(id);


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


/* =====================================================
   RESETAR FORMULÁRIO DE VENDA
===================================================== */

function prepareSaleForm() {

    const form =
        $("saleForm");


    if (form) {

        form.reset();

    }


    const date =
        $("saleDate");


    if (date) {

        date.value =
            dateInputValue();

    }


    const quantity =
        $("saleQuantity");


    if (quantity) {

        quantity.value =
            "1";

    }


    const unitPrice =
        $("saleUnitPrice");


    if (unitPrice) {

        unitPrice.value =
            "";

    }


    updateSaleTotal();

    populateSaleProducts();

}


/* =====================================================
   PRODUTOS NO SELECT DE VENDA
===================================================== */

function populateSaleProducts() {

    const select =
        $("saleProduct");


    if (!select) {

        return;

    }


    const currentValue =
        select.value;


    select.innerHTML = `

        <option value="">
            Selecione o produto
        </option>

    `;


    products.forEach(product => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            product.Nome;


        option.textContent =
            product.Nome;


        option.dataset.price =
            product.Preco;


        select.appendChild(
            option
        );

    });


    if (currentValue) {

        select.value =
            currentValue;

    }

}


/* =====================================================
   ATUALIZAR PREÇO DA VENDA
===================================================== */

function updateSaleProductPrice() {

    const select =
        $("saleProduct");


    const price =
        $("saleUnitPrice");


    if (!select || !price) {

        return;

    }


    const option =
        select.options[
            select.selectedIndex
        ];


    if (
        option &&
        option.dataset &&
        option.dataset.price
    ) {

        price.value =
            toNumber(
                option.dataset.price
            );

    }


    updateSaleTotal();

}


/* =====================================================
   TOTAL DA VENDA
===================================================== */

function updateSaleTotal() {

    const quantity =
        toNumber(
            $("saleQuantity")?.value
        );


    const unitPrice =
        toNumber(
            $("saleUnitPrice")?.value
        );


    const total =
        quantity * unitPrice;


    setText(
        "saleTotalPreview",
        formatCurrency(total)
    );

}


/* =====================================================
   PREPARAR FORMULÁRIO DE DESPESA
===================================================== */

function prepareExpenseForm() {

    const form =
        $("expenseForm");


    if (form) {

        form.reset();

    }


    const date =
        $("expenseDate");


    if (date) {

        date.value =
            dateInputValue();

    }

}


/* =====================================================
   PREPARAR FORMULÁRIO DE PRODUTO
===================================================== */

function prepareProductForm() {

    const form =
        $("productForm");


    if (form) {

        form.reset();

    }


    const quantity =
        $("productQuantity");


    if (quantity) {

        quantity.value =
            "0";

    }


    const minimum =
        $("productMinimum");


    if (minimum) {

        minimum.value =
            "0";

    }

}


/* =====================================================
   SALVAR VENDA
===================================================== */

async function saveSale(event) {

    event.preventDefault();


    const product =
        $("saleProduct")?.value.trim();


    const client =
        $("saleClient")?.value.trim();


    const quantity =
        toNumber(
            $("saleQuantity")?.value
        );


    const unitPrice =
        toNumber(
            $("saleUnitPrice")?.value
        );


    const date =
        $("saleDate")?.value;


    const payment =
        $("salePayment")?.value;


    const total =
        quantity * unitPrice;


    if (!product) {

        showToast(
            "Selecione um produto."
        );

        return;

    }


    if (quantity <= 0) {

        showToast(
            "Informe uma quantidade válida."
        );

        return;

    }


    if (unitPrice < 0) {

        showToast(
            "Informe um preço válido."
        );

        return;

    }


    try {

        await postData({

            acao:
                "novaVenda",

            data:
                date,

            produto:
                product,

            cliente:
                client,

            quantidade:
                quantity,

            pagamento:
                payment,

            valorUnitario:
                unitPrice,

            total:
                total

        });


        closeModal(
            "saleModal"
        );


        showToast(
            "Venda salva com sucesso."
        );


        await loadData();


    } catch (error) {

        console.error(error);


        showToast(
            "Erro ao salvar a venda."
        );

    }

}


/* =====================================================
   SALVAR DESPESA
===================================================== */

async function saveExpense(event) {

    event.preventDefault();


    const description =
        $("expenseDescription")
            ?.value
            .trim();


    const category =
        $("expenseCategory")
            ?.value
            .trim();


    const value =
        toNumber(
            $("expenseValue")?.value
        );


    const date =
        $("expenseDate")?.value;


    const payment =
        $("expensePayment")?.value;


    if (!description) {

        showToast(
            "Informe a descrição da despesa."
        );

        return;

    }


    if (value <= 0) {

        showToast(
            "Informe um valor válido."
        );

        return;

    }


    try {

        await postData({

            acao:
                "novaDespesa",

            data:
                date,

            descricao:
                description,

            categoria:
                category,

            pagamento:
                payment,

            valor:
                value

        });


        closeModal(
            "expenseModal"
        );


        showToast(
            "Despesa salva com sucesso."
        );


        await loadData();


    } catch (error) {

        console.error(error);


        showToast(
            "Erro ao salvar a despesa."
        );

    }

}


/* =====================================================
   SALVAR PRODUTO
===================================================== */

async function saveProduct(event) {

    event.preventDefault();


    const name =
        $("productName")
            ?.value
            .trim();


    const quantity =
        toNumber(
            $("productQuantity")?.value
        );


    const minimum =
        toNumber(
            $("productMinimum")?.value
        );


    const price =
        toNumber(
            $("productPrice")?.value
        );


    const cost =
        toNumber(
            $("productCost")?.value
        );


    if (!name) {

        showToast(
            "Informe o nome do produto."
        );

        return;

    }


    if (price < 0 || cost < 0) {

        showToast(
            "Informe valores válidos."
        );

        return;

    }


    try {

        await postData({

            acao:
                "novoProduto",

            nome:
                name,

            quantidade:
                quantity,

            minimo:
                minimum,

            preco:
                price,

            custo:
                cost

        });


        closeModal(
            "productModal"
        );


        showToast(
            "Produto salvo com sucesso."
        );


        await loadData();


    } catch (error) {

        console.error(error);


        showToast(
            "Erro ao salvar o produto."
        );

    }

}


/* =====================================================
   EXCLUIR VENDA
===================================================== */

async function deleteSale(linha) {

    const row =
        Number(linha);


    if (!row || row <= 1) {

        showToast(
            "Linha inválida."
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


    try {

        await postData({

            acao:
                "excluirVenda",

            linha:
                row

        });


        showToast(
            "Venda excluída."
        );


        await loadData();


    } catch (error) {

        console.error(error);


        showToast(
            "Erro ao excluir a venda."
        );

    }

}


/* =====================================================
   EXCLUIR DESPESA
===================================================== */

async function deleteExpense(linha) {

    const row =
        Number(linha);


    if (!row || row <= 1) {

        showToast(
            "Linha inválida."
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


    try {

        await postData({

            acao:
                "excluirDespesa",

            linha:
                row

        });


        showToast(
            "Despesa excluída."
        );


        await loadData();


    } catch (error) {

        console.error(error);


        showToast(
            "Erro ao excluir a despesa."
        );

    }

}


/* =====================================================
   EXCLUIR PRODUTO
===================================================== */

async function deleteProduct(linha) {

    const row =
        Number(linha);


    if (!row || row <= 1) {

        showToast(
            "Linha inválida."
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


    try {

        await postData({

            acao:
                "excluirProduto",

            linha:
                row

        });


        showToast(
            "Produto excluído."
        );


        await loadData();


    } catch (error) {

        console.error(error);


        showToast(
            "Erro ao excluir o produto."
        );

    }

}


/* =====================================================
   TOAST
===================================================== */

let toastTimer = null;


function showToast(message) {

    const toast =
        $("toast");


    const text =
        $("toastMessage");


    if (!toast || !text) {

        return;

    }


    text.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 3000);

}


/* =====================================================
   EVENTOS
===================================================== */

function initEvents() {


    /* ================================================
       MENU
    ================================================= */

    document
        .querySelectorAll(
            ".menu-item[data-page]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showPage(
                        button.dataset.page
                    );

                }
            );

        });


    document
        .querySelectorAll(
            ".text-button[data-go]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showPage(
                        button.dataset.go
                    );

                }
            );

        });


    /* ================================================
       MENU MOBILE
    ================================================= */

    const mobileMenu =
        $("mobileMenu");


    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (mobileMenu && sidebar) {

        mobileMenu.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "open"
                );

            }
        );

    }


    /* ================================================
       TEMA
    ================================================= */

    const themeButton =
        $("themeButton");


    if (themeButton) {

        themeButton.addEventListener(
            "click",
            toggleTheme
        );

    }


    /* ================================================
       FILTRO DASHBOARD
    ================================================= */

    const dashboardPeriod =
        $("dashboardPeriod");


    if (dashboardPeriod) {

        dashboardPeriod.addEventListener(
            "change",
            renderDashboard
        );

    }


    /* ================================================
       BUSCA VENDAS
    ================================================= */

    const salesSearch =
        $("salesSearch");


    if (salesSearch) {

        salesSearch.addEventListener(
            "input",
            renderSales
        );

    }


    /* ================================================
       BUSCA DESPESAS
    ================================================= */

    const expenseSearch =
        $("expenseSearch");


    if (expenseSearch) {

        expenseSearch.addEventListener(
            "input",
            renderExpenses
        );

    }


    /* ================================================
       NOVA VENDA
    ================================================= */

    const newSale =
        $("newSale");


    if (newSale) {

        newSale.addEventListener(
            "click",
            () => {

                prepareSaleForm();

                openModal(
                    "saleModal"
                );

            }
        );

    }


    /* ================================================
       NOVA DESPESA
    ================================================= */

    const newExpense =
        $("newExpense");


    if (newExpense) {

        newExpense.addEventListener(
            "click",
            () => {

                prepareExpenseForm();

                openModal(
                    "expenseModal"
                );

            }
        );

    }


    /* ================================================
       NOVO PRODUTO
    ================================================= */

    const newProduct =
        $("newProduct");


    if (newProduct) {

        newProduct.addEventListener(
            "click",
            () => {

                prepareProductForm();

                openModal(
                    "productModal"
                );

            }
        );

    }


    /* ================================================
       FORM VENDA
    ================================================= */

    const saleForm =
        $("saleForm");


    if (saleForm) {

        saleForm.addEventListener(
            "submit",
            saveSale
        );

    }


    /* ================================================
       FORM DESPESA
    ================================================= */

    const expenseForm =
        $("expenseForm");


    if (expenseForm) {

        expenseForm.addEventListener(
            "submit",
            saveExpense
        );

    }


    /* ================================================
       FORM PRODUTO
    ================================================= */

    const productForm =
        $("productForm");


    if (productForm) {

        productForm.addEventListener(
            "submit",
            saveProduct
        );

    }


    /* ================================================
       PRODUTO DA VENDA
    ================================================= */

    const saleProduct =
        $("saleProduct");


    if (saleProduct) {

        saleProduct.addEventListener(
            "change",
            updateSaleProductPrice
        );

    }


    /* ================================================
       QUANTIDADE / PREÇO
    ================================================= */

    const saleQuantity =
        $("saleQuantity");


    const saleUnitPrice =
        $("saleUnitPrice");


    if (saleQuantity) {

        saleQuantity.addEventListener(
            "input",
            updateSaleTotal
        );

    }


    if (saleUnitPrice) {

        saleUnitPrice.addEventListener(
            "input",
            updateSaleTotal
        );

    }


    /* ================================================
       MÊS DO RELATÓRIO
    ================================================= */

    const reportMonth =
        $("reportMonth");


    const reportYear =
        $("reportYear");


    if (reportMonth) {

        reportMonth.addEventListener(
            "change",
            renderMonthlyReport
        );

    }


    if (reportYear) {

        reportYear.addEventListener(
            "change",
            renderMonthlyReport
        );

    }


    /* ================================================
       FECHAR MODAIS
    ================================================= */

    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    closeModal(
                        button.dataset.close
                    );

                }
            );

        });


    /* ================================================
       FECHAR CLICANDO FORA
    ================================================= */

    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(overlay => {

            overlay.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        overlay
                    ) {

                        overlay.classList.remove(
                            "active"
                        );

                    }

                }
            );

        });


    /* ================================================
       TECLA ESC
    ================================================= */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                document
                    .querySelectorAll(
                        ".modal-overlay.active"
                    )
                    .forEach(modal => {

                        modal.classList.remove(
                            "active"
                        );

                    });

            }

        }
    );


    /* ================================================
       EXCLUSÕES
    ================================================= */

    document.addEventListener(
        "click",
        event => {

            const saleButton =
                event.target.closest(
                    "[data-delete-sale]"
                );


            if (saleButton) {

                deleteSale(
                    saleButton.dataset.deleteSale
                );

                return;

            }


            const expenseButton =
                event.target.closest(
                    "[data-delete-expense]"
                );


            if (expenseButton) {

                deleteExpense(
                    expenseButton.dataset.deleteExpense
                );

                return;

            }


            const productButton =
                event.target.closest(
                    "[data-delete-product]"
                );


            if (productButton) {

                deleteProduct(
                    productButton.dataset.deleteProduct
                );

                return;

            }

        }
    );

}


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initTheme();

        initToday();

        initReportSelectors();

        initEvents();

        populateSaleProducts();

        /*
           Define datas iniciais
        */

        const saleDate =
            $("saleDate");


        if (saleDate) {

            saleDate.value =
                dateInputValue();

        }


        const expenseDate =
            $("expenseDate");


        if (expenseDate) {

            expenseDate.value =
                dateInputValue();

        }


        /*
           Carrega os dados do Google Sheets
        */

        await loadData();

    }
);