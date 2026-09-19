/* =====================================================
   VÓ RITA - BALANÇO GERAL
   SCRIPT COMPLETO
===================================================== */


/* =====================================================
   CONFIGURAÇÃO
===================================================== */

const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwVjr0jAdT2HH_LoFR-nE0P1bs_HzOfJkJ-zMoQz_opnUOnTO-WRvmVetBhNU7GKHAoMQ/exec";


let sales = [];
let expenses = [];
let products = [];

let financeChart = null;
let monthlyChart = null;
let comparisonChart = null;

let salesPieChart = null;
let expensesPieChart = null;

let toastTimer = null;


/* =====================================================
   ATALHO DOM
===================================================== */

function $(selector) {
    return document.querySelector(selector);
}


function $all(selector) {
    return document.querySelectorAll(selector);
}


/* =====================================================
   UTILITÁRIOS
===================================================== */

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   NÚMEROS
===================================================== */

function parseNumber(value) {

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (value === null || value === undefined || value === "") {
        return 0;
    }

    let text = String(value)
        .trim()
        .replace(/\s/g, "");

    /*
       Caso brasileiro:
       1.234,56
    */

    if (text.includes(",") && text.includes(".")) {

        text = text
            .replace(/\./g, "")
            .replace(",", ".");

    } else if (text.includes(",")) {

        text = text.replace(",", ".");

    }

    const number = Number(text);

    return Number.isFinite(number) ? number : 0;

}


/* =====================================================
   MOEDA
===================================================== */

function formatCurrency(value) {

    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

}


function formatNumber(value) {

    return Number(value || 0).toLocaleString("pt-BR");

}


function formatPercent(value) {

    return `${Number(value || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    })}%`;

}


/* =====================================================
   DATAS
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
       Evita problema de fuso horário.
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

    const brazilDate =
        text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (brazilDate) {

        return new Date(
            Number(brazilDate[3]),
            Number(brazilDate[2]) - 1,
            Number(brazilDate[1])
        );

    }


    /*
       ISO / Google Sheets
    */

    const date = new Date(text);

    return isNaN(date.getTime())
        ? null
        : date;

}


function getRecordDate(record) {

    if (!record) {
        return null;
    }

    return (
        parseDateValue(record.Data) ||
        parseDateValue(record.Registro)
    );

}


function dateToInput(date) {

    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function todayInputValue() {

    return dateToInput(new Date());

}


function formatDate(value) {

    const date = parseDateValue(value);

    if (!date) {
        return "-";
    }

    return date.toLocaleDateString("pt-BR");

}


function formatDateLong(value) {

    const date = parseDateValue(value);

    if (!date) {
        return "-";
    }

    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

}


/* =====================================================
   NORMALIZAÇÃO DOS DADOS
   ALINHADO AO CÓDIGO.GS
===================================================== */

function normalizeSales(data) {

    return (Array.isArray(data) ? data : []).map(item => {

        return {

            Registro: item.Registro,
            Data: item.Data,
            Produto: item.Produto || "",
            Cliente: item.Cliente || "",
            Quantidade: parseNumber(item.Quantidade),
            Pagamento: item.Pagamento || "",
            ValorUnitario: parseNumber(item.ValorUnitario),
            Total: parseNumber(item.Total),
            linha: Number(item.linha)

        };

    });

}


function normalizeExpenses(data) {

    return (Array.isArray(data) ? data : []).map(item => {

        return {

            Registro: item.Registro,
            Data: item.Data,
            Descricao: item.Descricao || "",
            Categoria: item.Categoria || "",
            Pagamento: item.Pagamento || "",
            Valor: parseNumber(item.Valor),
            linha: Number(item.linha)

        };

    });

}


function normalizeProducts(data) {

    return (Array.isArray(data) ? data : []).map(item => {

        return {

            Registro: item.Registro,
            Nome: item.Nome || "",
            Quantidade: parseNumber(item.Quantidade),
            Minimo: parseNumber(item.Minimo),
            Preco: parseNumber(item.Preco),
            Custo: parseNumber(item.Custo),
            linha: Number(item.linha)

        };

    });

}


/* =====================================================
   CARREGAR DADOS
===================================================== */

async function loadData() {

    try {

        const response = await fetch(
            GOOGLE_SCRIPT_URL + "?t=" + Date.now(),
            {
                method: "GET",
                cache: "no-store"
            }
        );


        if (!response.ok) {

            throw new Error(
                `Erro HTTP ${response.status}`
            );

        }


        const data = await response.json();


        sales =
            normalizeSales(data.vendas || []);

        expenses =
            normalizeExpenses(data.despesas || []);

        products =
            normalizeProducts(data.produtos || []);


        renderAll();


    } catch (error) {

        console.error(
            "Erro ao carregar dados:",
            error
        );

        showToast(
            "Não foi possível carregar os dados.",
            "error"
        );

        renderAll();

    }

}


/* =====================================================
   ENVIAR DADOS PARA O GOOGLE APPS SCRIPT
===================================================== */

async function postData(payload) {

    const body = new URLSearchParams();


    Object.entries(payload).forEach(
        ([key, value]) => {

            body.append(
                key,
                value === null || value === undefined
                    ? ""
                    : String(value)
            );

        }
    );


    const response = await fetch(
        GOOGLE_SCRIPT_URL,
        {
            method: "POST",
            body: body
        }
    );


    if (!response.ok) {

        throw new Error(
            `Erro HTTP ${response.status}`
        );

    }


    const text = await response.text();


    if (!text) {

        return {
            sucesso: true
        };

    }


    try {

        return JSON.parse(text);

    } catch {

        return {
            sucesso: true,
            mensagem: text
        };

    }

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message, type = "success") {

    const toast = document.getElementById("toast");
    const toastMessage =
        document.getElementById("toastMessage");


    if (!toast) {
        return;
    }


    if (toastMessage) {
        toastMessage.textContent = message;
    }


    const icon = toast.querySelector("i");


    if (icon) {

        icon.className =
            type === "error"
                ? "fa-solid fa-circle-exclamation"
                : "fa-solid fa-circle-check";

    }


    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


/* =====================================================
   MENU MOBILE
===================================================== */

function createMobileOverlay() {

    let overlay =
        document.getElementById("mobileOverlay");


    if (!overlay) {

        overlay =
            document.createElement("div");

        overlay.id =
            "mobileOverlay";

        overlay.className =
            "mobile-overlay";


        document.body.appendChild(overlay);

    }


    return overlay;

}


function openMobileMenu() {

    const sidebar =
        document.querySelector(".sidebar");

    const overlay =
        createMobileOverlay();


    if (!sidebar) {
        return;
    }


    sidebar.classList.add("open");

    overlay.classList.add("active");

    document.body.classList.add(
        "menu-open"
    );

}


function closeMobileMenu() {

    const sidebar =
        document.querySelector(".sidebar");

    const overlay =
        document.getElementById(
            "mobileOverlay"
        );


    if (sidebar) {

        sidebar.classList.remove("open");

    }


    if (overlay) {

        overlay.classList.remove("active");

    }


    document.body.classList.remove(
        "menu-open"
    );

}


function toggleMobileMenu() {

    const sidebar =
        document.querySelector(".sidebar");


    if (!sidebar) {
        return;
    }


    if (sidebar.classList.contains("open")) {

        closeMobileMenu();

    } else {

        openMobileMenu();

    }

}


/* =====================================================
   NAVEGAÇÃO
===================================================== */

function navigateToPage(pageId) {

    if (!pageId) {
        return;
    }


    const target =
        document.getElementById(pageId);


    if (!target) {
        return;
    }


    $all(".page").forEach(page => {

        page.classList.remove("active");

    });


    target.classList.add("active");


    $all(".menu-item").forEach(item => {

        item.classList.remove("active");

    });


    const activeItem =
        document.querySelector(
            `.menu-item[data-page="${pageId}"]`
        );


    if (activeItem) {

        activeItem.classList.add("active");

    }


    updatePageTitle(pageId);


    /*
       IMPORTANTE:
       no celular o menu fecha depois
       de selecionar a página.
    */

    if (window.innerWidth <= 850) {

        closeMobileMenu();

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    /*
       Atualiza relatórios quando
       entrar nessa página.
    */

    if (pageId === "relatorios") {

        renderReports();

    }

}


function updatePageTitle(pageId) {

    const title =
        document.querySelector(
            ".topbar-title h2"
        );

    const eyebrow =
        document.querySelector(
            ".topbar-title span"
        );


    const titles = {

        dashboard: {
            title: "Dashboard",
            eyebrow: "VISÃO GERAL"
        },

        vendas: {
            title: "Vendas",
            eyebrow: "ENTRADAS"
        },

        despesas: {
            title: "Despesas",
            eyebrow: "SAÍDAS"
        },

        estoque: {
            title: "Estoque",
            eyebrow: "PRODUTOS"
        },

        relatorios: {
            title: "Relatórios",
            eyebrow: "ANÁLISE FINANCEIRA"
        }

    };


    const data =
        titles[pageId];


    if (!data) {
        return;
    }


    if (title) {
        title.textContent =
            data.title;
    }


    if (eyebrow) {
        eyebrow.textContent =
            data.eyebrow;
    }

}


/* =====================================================
   DASHBOARD - FILTRO
===================================================== */

function filterDashboardData(period) {

    const now = new Date();


    return {

        sales: sales.filter(item => {

            const date =
                getRecordDate(item);

            if (!date) {
                return false;
            }


            if (period === "today") {

                return (
                    date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth() &&
                    date.getDate() === now.getDate()
                );

            }


            if (period === "month") {

                return (
                    date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth()
                );

            }


            if (period === "year") {

                return (
                    date.getFullYear() === now.getFullYear()
                );

            }


            return true;

        }),


        expenses: expenses.filter(item => {

            const date =
                getRecordDate(item);

            if (!date) {
                return false;
            }


            if (period === "today") {

                return (
                    date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth() &&
                    date.getDate() === now.getDate()
                );

            }


            if (period === "month") {

                return (
                    date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth()
                );

            }


            if (period === "year") {

                return (
                    date.getFullYear() === now.getFullYear()
                );

            }


            return true;

        })

    };

}


/* =====================================================
   DASHBOARD
===================================================== */

function renderDashboard() {

    const filter =
        document.getElementById(
            "dashboardPeriod"
        );


    const period =
        filter
            ? filter.value
            : "month";


    const data =
        filterDashboardData(period);


    const revenue =
        data.sales.reduce(
            (sum, item) =>
                sum + item.Total,
            0
        );


    const expenseTotal =
        data.expenses.reduce(
            (sum, item) =>
                sum + item.Valor,
            0
        );


    const profit =
        revenue - expenseTotal;


    const orders =
        data.sales.length;


    const average =
        orders
            ? revenue / orders
            : 0;


    const lowStock =
        products.filter(item =>
            item.Quantidade <= item.Minimo
        ).length;


    const margin =
        revenue
            ? (profit / revenue) * 100
            : 0;


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


    renderRecentSales(data.sales);

    renderFinanceChart(
        data.sales,
        data.expenses,
        period
    );

}


/* =====================================================
   VENDAS RECENTES
===================================================== */

function renderRecentSales(data) {

    const table =
        document.getElementById(
            "recentSales"
        );

    const empty =
        document.getElementById(
            "emptyRecentSales"
        );


    if (!table) {
        return;
    }


    const sorted =
        [...data]
            .sort(
                (a, b) =>
                    (getRecordDate(b)?.getTime() || 0) -
                    (getRecordDate(a)?.getTime() || 0)
            )
            .slice(0, 8);


    if (!sorted.length) {

        table.innerHTML = "";

        if (empty) {
            empty.style.display = "block";
        }

        return;

    }


    if (empty) {
        empty.style.display = "none";
    }


    table.innerHTML =
        sorted.map(item => {

            return `

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

            `;

        }).join("");

}


/* =====================================================
   GRÁFICO FINANCEIRO
===================================================== */

function renderFinanceChart(
    dataSales,
    dataExpenses,
    period
) {

    const canvas =
        document.getElementById(
            "financeChart"
        );


    if (!canvas || typeof Chart === "undefined") {
        return;
    }


    if (financeChart) {

        financeChart.destroy();

        financeChart = null;

    }


    const labels = [];
    const salesValues = [];
    const expenseValues = [];


    const now = new Date();


    if (period === "today") {

        labels.push("Hoje");


        salesValues.push(
            dataSales.reduce(
                (sum, item) =>
                    sum + item.Total,
                0
            )
        );


        expenseValues.push(
            dataExpenses.reduce(
                (sum, item) =>
                    sum + item.Valor,
                0
            )
        );

    }


    else if (period === "month") {

        const days =
            new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0
            ).getDate();


        for (let day = 1; day <= days; day++) {

            labels.push(
                String(day).padStart(2, "0")
            );


            const revenue =
                dataSales
                    .filter(item => {

                        const date =
                            getRecordDate(item);

                        return date &&
                            date.getDate() === day;

                    })
                    .reduce(
                        (sum, item) =>
                            sum + item.Total,
                        0
                    );


            const expense =
                dataExpenses
                    .filter(item => {

                        const date =
                            getRecordDate(item);

                        return date &&
                            date.getDate() === day;

                    })
                    .reduce(
                        (sum, item) =>
                            sum + item.Valor,
                        0
                    );


            salesValues.push(revenue);
            expenseValues.push(expense);

        }

    }


    else {

        for (let month = 0; month < 12; month++) {

            labels.push(
                new Date(
                    now.getFullYear(),
                    month,
                    1
                ).toLocaleDateString(
                    "pt-BR",
                    {
                        month: "short"
                    }
                )
            );


            salesValues.push(
                dataSales
                    .filter(item => {

                        const date =
                            getRecordDate(item);

                        return date &&
                            date.getMonth() === month;

                    })
                    .reduce(
                        (sum, item) =>
                            sum + item.Total,
                        0
                    )
            );


            expenseValues.push(
                dataExpenses
                    .filter(item => {

                        const date =
                            getRecordDate(item);

                        return date &&
                            date.getMonth() === month;

                    })
                    .reduce(
                        (sum, item) =>
                            sum + item.Valor,
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

                            data: salesValues,

                            borderColor:
                                "#5B9BD5",

                            backgroundColor:
                                "rgba(91,155,213,.12)",

                            tension: .35,

                            fill: true,

                            borderWidth: 2

                        },

                        {
                            label: "Despesas",

                            data: expenseValues,

                            borderColor:
                                "#C75C65",

                            backgroundColor:
                                "rgba(199,92,101,.10)",

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
                        mode: "index",
                        intersect: false
                    },

                    plugins: {

                        legend: {
                            display: true
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback: function(value) {

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

    const search =
        (
            document.getElementById(
                "salesSearch"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    const filtered =
        sales.filter(item => {

            const text = [

                item.Produto,
                item.Cliente,
                item.Pagamento,
                formatDate(item.Data)

            ]
                .join(" ")
                .toLowerCase();


            return text.includes(search);

        });


    const total =
        sales.reduce(
            (sum, item) =>
                sum + item.Total,
            0
        );


    const quantity =
        sales.reduce(
            (sum, item) =>
                sum + item.Quantidade,
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
        document.getElementById(
            "salesTable"
        );

    const empty =
        document.getElementById(
            "emptySales"
        );


    if (!table) {
        return;
    }


    if (!filtered.length) {

        table.innerHTML = "";

        if (empty) {
            empty.style.display = "block";
        }

        return;

    }


    if (empty) {
        empty.style.display = "none";
    }


    table.innerHTML =
        filtered.map(item => {

            return `

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
                        <strong>
                            ${formatCurrency(
                                item.Total
                            )}
                        </strong>
                    </td>

                    <td>

                        <button
                            class="delete-button"
                            type="button"
                            title="Excluir venda"
                            data-delete-sale="${item.linha}"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </td>

                </tr>

            `;

        }).join("");

}


/* =====================================================
   DESPESAS
===================================================== */

function renderExpenses() {

    const search =
        (
            document.getElementById(
                "expenseSearch"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    const filtered =
        expenses.filter(item => {

            const text = [

                item.Descricao,
                item.Categoria,
                item.Pagamento,
                formatDate(item.Data)

            ]
                .join(" ")
                .toLowerCase();


            return text.includes(search);

        });


    const total =
        expenses.reduce(
            (sum, item) =>
                sum + item.Valor,
            0
        );


    const quantity =
        expenses.length;


    const largest =
        expenses.length
            ? Math.max(
                ...expenses.map(
                    item => item.Valor
                )
            )
            : 0;


    setText(
        "expenseTotal",
        formatCurrency(total)
    );


    setText(
        "expenseQuantity",
        formatNumber(quantity)
    );


    setText(
        "largestExpense",
        formatCurrency(largest)
    );


    const table =
        document.getElementById(
            "expensesTable"
        );

    const empty =
        document.getElementById(
            "emptyExpenses"
        );


    if (!table) {
        return;
    }


    if (!filtered.length) {

        table.innerHTML = "";

        if (empty) {
            empty.style.display = "block";
        }

        return;

    }


    if (empty) {
        empty.style.display = "none";
    }


    table.innerHTML =
        filtered.map(item => {

            return `

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
                        <strong>
                            ${formatCurrency(
                                item.Valor
                            )}
                        </strong>
                    </td>

                    <td>

                        <button
                            class="delete-button"
                            type="button"
                            title="Excluir despesa"
                            data-delete-expense="${item.linha}"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </td>

                </tr>

            `;

        }).join("");

}


/* =====================================================
   ESTOQUE
===================================================== */

function renderProducts() {

    const totalUnits =
        products.reduce(
            (sum, item) =>
                sum + item.Quantidade,
            0
        );


    const lowStock =
        products.filter(item =>
            item.Quantidade <= item.Minimo
        ).length;


    setText(
        "stockProducts",
        formatNumber(products.length)
    );


    setText(
        "stockUnits",
        formatNumber(totalUnits)
    );


    setText(
        "stockLow",
        formatNumber(lowStock)
    );


    const grid =
        document.getElementById(
            "productGrid"
        );

    const empty =
        document.getElementById(
            "emptyProducts"
        );


    if (!grid) {
        return;
    }


    if (!products.length) {

        grid.innerHTML = "";

        if (empty) {
            empty.style.display = "block";
        }

        return;

    }


    if (empty) {
        empty.style.display = "none";
    }


    grid.innerHTML =
        products.map(item => {

            const isLow =
                item.Quantidade <= item.Minimo;


            const percentage =
                item.Minimo > 0
                    ? Math.min(
                        100,
                        (item.Quantidade /
                            (item.Minimo * 2)) *
                        100
                    )
                    : 100;


            return `

                <div class="product-card">

                    <div class="product-top">

                        <div>

                            <h4>
                                ${escapeHTML(
                                    item.Nome
                                )}
                            </h4>

                            <div class="product-price">

                                ${formatCurrency(
                                    item.Preco
                                )}

                            </div>

                        </div>


                        <div class="product-image">

                            <i class="fa-solid fa-box"></i>

                        </div>

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
                            ${formatNumber(
                                item.Quantidade
                            )}
                        </span>

                        <span>
                            Mínimo:
                            ${formatNumber(
                                item.Minimo
                            )}
                        </span>

                    </div>


                    <div class="product-actions">

                        <small>

                            Custo:
                            ${formatCurrency(
                                item.Custo
                            )}

                        </small>


                        <button
                            class="delete-button"
                            type="button"
                            title="Excluir produto"
                            data-delete-product="${item.linha}"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </div>

            `;

        }).join("");

}


/* =====================================================
   RELATÓRIOS - SELECTS
===================================================== */

function initializeReportSelectors() {

    const monthSelect =
        document.getElementById(
            "reportMonth"
        );

    const yearSelect =
        document.getElementById(
            "reportYear"
        );


    const months = [

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


    if (monthSelect &&
        monthSelect.options.length === 0) {

        months.forEach(
            (month, index) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(index);

                option.textContent =
                    month;

                monthSelect.appendChild(
                    option
                );

            }
        );

    }


    if (monthSelect) {

        monthSelect.value =
            String(
                new Date().getMonth()
            );

    }


    if (yearSelect) {

        const currentYear =
            new Date().getFullYear();


        if (yearSelect.options.length === 0) {

            for (
                let year = currentYear - 5;
                year <= currentYear + 1;
                year++
            ) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(year);

                option.textContent =
                    String(year);

                yearSelect.appendChild(
                    option
                );

            }

        }


        yearSelect.value =
            String(currentYear);

    }

}


/* =====================================================
   FILTRAR MÊS
===================================================== */

function getSelectedReportMonth() {

    const month =
        Number(
            document.getElementById(
                "reportMonth"
            )?.value
        );


    const year =
        Number(
            document.getElementById(
                "reportYear"
            )?.value
        );


    return {

        month: Number.isFinite(month)
            ? month
            : new Date().getMonth(),

        year: Number.isFinite(year)
            ? year
            : new Date().getFullYear()

    };

}


function isInMonth(record, month, year) {

    const date =
        getRecordDate(record);


    if (!date) {
        return false;
    }


    return (
        date.getMonth() === month &&
        date.getFullYear() === year
    );

}


/* =====================================================
   RELATÓRIO MENSAL
===================================================== */

function renderReports() {

    const selected =
        getSelectedReportMonth();


    const monthSales =
        sales.filter(item =>
            isInMonth(
                item,
                selected.month,
                selected.year
            )
        );


    const monthExpenses =
        expenses.filter(item =>
            isInMonth(
                item,
                selected.month,
                selected.year
            )
        );


    const revenue =
        monthSales.reduce(
            (sum, item) =>
                sum + item.Total,
            0
        );


    const expenseTotal =
        monthExpenses.reduce(
            (sum, item) =>
                sum + item.Valor,
            0
        );


    const profit =
        revenue - expenseTotal;


    const margin =
        revenue
            ? (profit / revenue) * 100
            : 0;


    const quantity =
        monthSales.reduce(
            (sum, item) =>
                sum + item.Quantidade,
            0
        );


    const ticket =
        monthSales.length
            ? revenue / monthSales.length
            : 0;


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
        formatNumber(
            monthSales.length
        )
    );


    setText(
        "monthlyTicket",
        formatCurrency(ticket)
    );


    setText(
        "monthlyItems",
        formatNumber(quantity)
    );


    const bestProduct =
        getBestProduct(
            monthSales
        );


    setText(
        "monthlyBestProduct",
        bestProduct
            ? bestProduct.name
            : "-"
    );


    renderMonthlyChart(
        monthSales,
        monthExpenses,
        selected.month,
        selected.year
    );


    renderMonthlyPayments(
        monthSales
    );


    renderMonthlyBestProducts(
        monthSales
    );


    /*
       NOVOS GRÁFICOS DE PIZZA
    */

    renderSalesPieChart(
        monthSales
    );


    renderExpensesPieChart(
        monthExpenses
    );


    renderComparison(
        selected.month,
        selected.year
    );


    renderGeneralReports();

}


/* =====================================================
   GRÁFICO MENSAL
===================================================== */

function renderMonthlyChart(
    monthSales,
    monthExpenses,
    month,
    year
) {

    const canvas =
        document.getElementById(
            "monthlyChart"
        );


    if (!canvas ||
        typeof Chart === "undefined") {

        return;

    }


    if (monthlyChart) {

        monthlyChart.destroy();

        monthlyChart = null;

    }


    const days =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    const labels = [];
    const salesValues = [];
    const expenseValues = [];


    for (
        let day = 1;
        day <= days;
        day++
    ) {

        labels.push(
            String(day).padStart(2, "0")
        );


        salesValues.push(

            monthSales
                .filter(item => {

                    const date =
                        getRecordDate(item);

                    return date &&
                        date.getDate() === day;

                })
                .reduce(
                    (sum, item) =>
                        sum + item.Total,
                    0
                )

        );


        expenseValues.push(

            monthExpenses
                .filter(item => {

                    const date =
                        getRecordDate(item);

                    return date &&
                        date.getDate() === day;

                })
                .reduce(
                    (sum, item) =>
                        sum + item.Valor,
                    0
                )

        );

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

                            data: salesValues,

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

                            data: expenseValues,

                            borderColor:
                                "#C75C65",

                            backgroundColor:
                                "rgba(199,92,101,.10)",

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

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback: value =>
                                    formatCurrency(
                                        value
                                    )

                            }

                        }

                    }

                }

            }
        );

}


/* =====================================================
   GRÁFICO DE PIZZA - VENDAS
===================================================== */

function renderSalesPieChart(monthSales) {

    const canvas =
        findOrCreatePieCanvas(
            "salesPieChart",
            "Vendas do mês",
            "Distribuição das vendas por produto."
        );


    if (!canvas ||
        typeof Chart === "undefined") {

        return;

    }


    if (salesPieChart) {

        salesPieChart.destroy();

        salesPieChart = null;

    }


    const grouped = {};


    monthSales.forEach(item => {

        const name =
            item.Produto || "Outros";


        grouped[name] =
            (grouped[name] || 0) +
            item.Total;

    });


    let entries =
        Object.entries(grouped)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    /*
       Se não houver vendas
    */

    if (!entries.length) {

        entries = [
            ["Sem vendas", 1]
        ];

    }


    const labels =
        entries.map(item => item[0]);


    const values =
        entries.map(item => item[1]);


    const colors =
        generateChartColors(
            labels.length
        );


    salesPieChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels,

                    datasets: [

                        {

                            data: values,

                            backgroundColor:
                                colors,

                            borderColor:
                                "#FFFFFF",

                            borderWidth: 2

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "58%",

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true,

                                padding: 14

                            }

                        },

                        tooltip: {

                            callbacks: {

                                label: function(context) {

                                    const value =
                                        context.raw;

                                    const total =
                                        values.reduce(
                                            (
                                                sum,
                                                number
                                            ) =>
                                                sum +
                                                number,
                                            0
                                        );


                                    const percentage =
                                        total
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
                                        percentage.toFixed(
                                            1
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
   GRÁFICO DE PIZZA - DESPESAS
===================================================== */

function renderExpensesPieChart(
    monthExpenses
) {

    const canvas =
        findOrCreatePieCanvas(
            "expensesPieChart",
            "Despesas do mês",
            "Distribuição das despesas por categoria."
        );


    if (!canvas ||
        typeof Chart === "undefined") {

        return;

    }


    if (expensesPieChart) {

        expensesPieChart.destroy();

        expensesPieChart = null;

    }


    const grouped = {};


    monthExpenses.forEach(item => {

        const category =
            item.Categoria ||
            "Sem categoria";


        grouped[category] =
            (grouped[category] || 0) +
            item.Valor;

    });


    let entries =
        Object.entries(grouped)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    if (!entries.length) {

        entries = [
            ["Sem despesas", 1]
        ];

    }


    const labels =
        entries.map(item => item[0]);


    const values =
        entries.map(item => item[1]);


    const colors =
        generateChartColors(
            labels.length,
            true
        );


    expensesPieChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels,

                    datasets: [

                        {

                            data: values,

                            backgroundColor:
                                colors,

                            borderColor:
                                "#FFFFFF",

                            borderWidth: 2

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "58%",

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true,

                                padding: 14

                            }

                        },

                        tooltip: {

                            callbacks: {

                                label: function(context) {

                                    const value =
                                        context.raw;

                                    const total =
                                        values.reduce(
                                            (
                                                sum,
                                                number
                                            ) =>
                                                sum +
                                                number,
                                            0
                                        );


                                    const percentage =
                                        total
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
                                        percentage.toFixed(
                                            1
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
   CRIAR CANVAS DOS GRÁFICOS DE PIZZA
   Caso o HTML ainda não tenha os IDs.
===================================================== */

function findOrCreatePieCanvas(
    id,
    title,
    description
) {

    let canvas =
        document.getElementById(id);


    if (canvas) {
        return canvas;
    }


    /*
       Tenta encontrar o card pelo título.
    */

    const headings =
        Array.from(
            document.querySelectorAll(
                "h3, h4, .panel-header h3"
            )
        );


    const heading =
        headings.find(
            element =>
                element.textContent
                    .trim()
                    .toLowerCase() ===
                title.toLowerCase()
        );


    if (heading) {

        const panel =
            heading.closest(
                ".panel"
            );


        if (panel) {

            const container =
                document.createElement(
                    "div"
                );


            container.className =
                "monthly-chart-container";


            canvas =
                document.createElement(
                    "canvas"
                );


            canvas.id = id;


            container.appendChild(
                canvas
            );


            panel.appendChild(
                container
            );


            return canvas;

        }

    }


    /*
       Se não encontrar, cria
       uma área no relatório mensal.
    */

    const report =
        document.getElementById(
            "relatorios"
        );


    if (!report) {
        return null;
    }


    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "panel";


    panel.innerHTML = `

        <div class="panel-header">

            <div>

                <span class="panel-kicker">
                    ${escapeHTML(
                        title === "Vendas do mês"
                            ? "VENDAS"
                            : "DESPESAS"
                    )}
                </span>

                <h3>
                    ${escapeHTML(title)}
                </h3>

                <p class="panel-description">
                    ${escapeHTML(description)}
                </p>

            </div>

        </div>

        <div
            class="monthly-chart-container"
            style="height:330px;"
        >

            <canvas id="${id}"></canvas>

        </div>

    `;


    report.appendChild(
        panel
    );


    return document.getElementById(id);

}


/* =====================================================
   CORES DOS GRÁFICOS
===================================================== */

function generateChartColors(
    count,
    expensesMode = false
) {

    const salesColors = [

        "#5B9BD5",
        "#3978B8",
        "#76B7E5",
        "#8ECAE6",
        "#4F8A68",
        "#B88A3B",
        "#7A6FA8",
        "#D28C9C",
        "#4E9A9A",
        "#E0A458"

    ];


    const expenseColors = [

        "#C75C65",
        "#D77A83",
        "#B94A54",
        "#B88A3B",
        "#A66A3F",
        "#8E6FA8",
        "#5B7FA3",
        "#6B8E72",
        "#9B7A52",
        "#7A7F87"

    ];


    const palette =
        expensesMode
            ? expenseColors
            : salesColors;


    return Array.from(
        { length: count },
        (_, index) =>
            palette[
                index % palette.length
            ]
    );

}


/* =====================================================
   PAGAMENTOS DO MÊS
===================================================== */

function renderMonthlyPayments(
    monthSales
) {

    const container =
        document.getElementById(
            "monthlyPayments"
        );


    if (!container) {
        return;
    }


    const grouped = {};


    monthSales.forEach(item => {

        const payment =
            item.Pagamento ||
            "Não informado";


        grouped[payment] =
            (grouped[payment] || 0) +
            item.Total;

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

                <i class="fa-solid fa-credit-card"></i>

                <p>
                    Nenhuma venda no período.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        entries.map(
            ([payment, value]) => {

                return `

                    <div class="payment-row">

                        <div class="payment-left">

                            <i class="fa-solid fa-wallet"></i>

                            <span>
                                ${escapeHTML(
                                    payment
                                )}
                            </span>

                        </div>

                        <div class="payment-right">

                            ${formatCurrency(
                                value
                            )}

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =====================================================
   MELHORES PRODUTOS DO MÊS
===================================================== */

function getProductRanking(
    monthSales
) {

    const grouped = {};


    monthSales.forEach(item => {

        const name =
            item.Produto ||
            "Produto sem nome";


        if (!grouped[name]) {

            grouped[name] = {

                quantity: 0,

                revenue: 0

            };

        }


        grouped[name].quantity +=
            item.Quantidade;


        grouped[name].revenue +=
            item.Total;

    });


    return Object.entries(grouped)

        .map(
            ([name, data]) => ({

                name,

                quantity:
                    data.quantity,

                revenue:
                    data.revenue

            })
        )

        .sort(
            (a, b) =>
                b.quantity -
                a.quantity
        );

}


function getBestProduct(
    monthSales
) {

    const ranking =
        getProductRanking(
            monthSales
        );


    return ranking[0] || null;

}


function renderMonthlyBestProducts(
    monthSales
) {

    const container =
        document.getElementById(
            "monthlyBestProducts"
        );


    if (!container) {
        return;
    }


    const ranking =
        getProductRanking(
            monthSales
        ).slice(0, 5);


    if (!ranking.length) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-box-open"></i>

                <p>
                    Nenhum produto vendido no período.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        ranking.map(
            (item, index) => {

                return `

                    <div class="rank-item">

                        <div class="rank-left">

                            <div class="rank-number">
                                ${index + 1}
                            </div>

                            <div>

                                <div class="rank-name">
                                    ${escapeHTML(
                                        item.name
                                    )}
                                </div>

                                <div class="rank-value">
                                    ${formatNumber(
                                        item.quantity
                                    )}
                                    unidades
                                </div>

                            </div>

                        </div>

                        <div class="rank-value">

                            ${formatCurrency(
                                item.revenue
                            )}

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =====================================================
   COMPARATIVO DOS ÚLTIMOS 12 MESES
===================================================== */

function renderComparison(
    selectedMonth,
    selectedYear
) {

    const labels = [];
    const revenue = [];
    const expense = [];
    const profit = [];


    for (
        let i = 11;
        i >= 0;
        i--
    ) {

        const date =
            new Date(
                selectedYear,
                selectedMonth - i,
                1
            );


        const month =
            date.getMonth();


        const year =
            date.getFullYear();


        labels.push(
            date.toLocaleDateString(
                "pt-BR",
                {
                    month: "short",
                    year: "2-digit"
                }
            )
        );


        const monthRevenue =
            sales
                .filter(item =>
                    isInMonth(
                        item,
                        month,
                        year
                    )
                )
                .reduce(
                    (sum, item) =>
                        sum + item.Total,
                    0
                );


        const monthExpense =
            expenses
                .filter(item =>
                    isInMonth(
                        item,
                        month,
                        year
                    )
                )
                .reduce(
                    (sum, item) =>
                        sum + item.Valor,
                    0
                );


        revenue.push(
            monthRevenue
        );


        expense.push(
            monthExpense
        );


        profit.push(
            monthRevenue -
            monthExpense
        );

    }


    const canvas =
        document.getElementById(
            "comparisonChart"
        );


    if (
        canvas &&
        typeof Chart !== "undefined"
    ) {

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

                                data: revenue,

                                backgroundColor:
                                    "#5B9BD5"

                            },

                            {

                                label: "Despesas",

                                data: expense,

                                backgroundColor:
                                    "#C75C65"

                            },

                            {

                                label: "Lucro",

                                data: profit,

                                backgroundColor:
                                    "#4F8A68"

                            }

                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        scales: {

                            y: {

                                beginAtZero: true,

                                ticks: {

                                    callback:
                                        value =>
                                            formatCurrency(
                                                value
                                            )

                                }

                            }

                        }

                    }

                }
            );

    }


    renderComparisonTable(
        labels,
        revenue,
        expense,
        profit
    );

}


/* =====================================================
   TABELA COMPARATIVA
===================================================== */

function renderComparisonTable(
    labels,
    revenue,
    expense,
    profit
) {

    const table =
        document.getElementById(
            "monthlyComparisonTable"
        );


    if (!table) {
        return;
    }


    table.innerHTML =
        labels.map(
            (label, index) => {

                return `

                    <tr>

                        <td>
                            ${escapeHTML(
                                label
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                revenue[index]
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                expense[index]
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                profit[index]
                            )}
                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* =====================================================
   RELATÓRIOS GERAIS
===================================================== */

function renderGeneralReports() {

    const revenue =
        sales.reduce(
            (sum, item) =>
                sum + item.Total,
            0
        );


    const expense =
        expenses.reduce(
            (sum, item) =>
                sum + item.Valor,
            0
        );


    const profit =
        revenue - expense;


    const margin =
        revenue
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


    renderOverallBestProducts();

    renderExpenseCategories();

}


/* =====================================================
   PRODUTOS MAIS VENDIDOS - GERAL
===================================================== */

function renderOverallBestProducts() {

    const container =
        document.getElementById(
            "bestProducts"
        );


    if (!container) {
        return;
    }


    const ranking =
        getProductRanking(
            sales
        ).slice(0, 5);


    if (!ranking.length) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-box-open"></i>

                <p>
                    Nenhuma venda registrada.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        ranking.map(
            (item, index) => {

                return `

                    <div class="rank-item">

                        <div class="rank-left">

                            <div class="rank-number">
                                ${index + 1}
                            </div>

                            <div>

                                <div class="rank-name">
                                    ${escapeHTML(
                                        item.name
                                    )}
                                </div>

                                <div class="rank-value">
                                    ${formatNumber(
                                        item.quantity
                                    )}
                                    unidades
                                </div>

                            </div>

                        </div>

                        <div class="rank-value">
                            ${formatCurrency(
                                item.revenue
                            )}
                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =====================================================
   CATEGORIAS DE DESPESAS
===================================================== */

function renderExpenseCategories() {

    const container =
        document.getElementById(
            "expenseCategories"
        );


    if (!container) {
        return;
    }


    const grouped = {};


    expenses.forEach(item => {

        const category =
            item.Categoria ||
            "Sem categoria";


        grouped[category] =
            (grouped[category] || 0) +
            item.Valor;

    });


    const entries =
        Object.entries(grouped)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .slice(0, 8);


    if (!entries.length) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-money-bill"></i>

                <p>
                    Nenhuma despesa registrada.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        entries.map(
            ([category, value]) => {

                return `

                    <div class="rank-item">

                        <div class="rank-left">

                            <div class="rank-number">

                                <i class="fa-solid fa-receipt"></i>

                            </div>

                            <div class="rank-name">

                                ${escapeHTML(
                                    category
                                )}

                            </div>

                        </div>

                        <div class="rank-value">

                            ${formatCurrency(
                                value
                            )}

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =====================================================
   MODAIS
===================================================== */

function openModal(id) {

    const modal =
        document.getElementById(id);


    if (modal) {

        modal.classList.add(
            "active"
        );

    }

}


function closeModal(id) {

    const modal =
        document.getElementById(id);


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


/* =====================================================
   MODAL VENDA
===================================================== */

function prepareSaleForm() {

    const form =
        document.getElementById(
            "saleForm"
        );


    if (!form) {
        return;
    }


    form.reset();


    const date =
        document.getElementById(
            "saleDate"
        );


    const quantity =
        document.getElementById(
            "saleQuantity"
        );


    const unitPrice =
        document.getElementById(
            "saleUnitPrice"
        );


    if (date) {

        date.value =
            todayInputValue();

    }


    if (quantity) {

        quantity.value = 1;

    }


    if (unitPrice) {

        unitPrice.value = "";

    }


    updateSaleTotal();

}


function updateSaleTotal() {

    const quantity =
        parseNumber(
            document.getElementById(
                "saleQuantity"
            )?.value
        );


    const unitPrice =
        parseNumber(
            document.getElementById(
                "saleUnitPrice"
            )?.value
        );


    const total =
        quantity * unitPrice;


    setText(
        "saleTotalPreview",
        formatCurrency(total)
    );

}


/* =====================================================
   MODAL DESPESA
===================================================== */

function prepareExpenseForm() {

    const form =
        document.getElementById(
            "expenseForm"
        );


    if (!form) {
        return;
    }


    form.reset();


    const date =
        document.getElementById(
            "expenseDate"
        );


    if (date) {

        date.value =
            todayInputValue();

    }

}


/* =====================================================
   MODAL PRODUTO
===================================================== */

function prepareProductForm() {

    const form =
        document.getElementById(
            "productForm"
        );


    if (!form) {
        return;
    }


    form.reset();

}


/* =====================================================
   SALVAR VENDA
   ALINHADO AO CÓDIGO.GS
===================================================== */

async function saveSale(event) {

    event.preventDefault();


    const product =
        document.getElementById(
            "saleProduct"
        )?.value.trim();


    const client =
        document.getElementById(
            "saleClient"
        )?.value.trim();


    const quantity =
        parseNumber(
            document.getElementById(
                "saleQuantity"
            )?.value
        );


    const unitPrice =
        parseNumber(
            document.getElementById(
                "saleUnitPrice"
            )?.value
        );


    const date =
        document.getElementById(
            "saleDate"
        )?.value;


    const payment =
        document.getElementById(
            "salePayment"
        )?.value;


    if (!product) {

        showToast(
            "Informe o produto.",
            "error"
        );

        return;

    }


    if (quantity <= 0) {

        showToast(
            "Informe uma quantidade válida.",
            "error"
        );

        return;

    }


    if (unitPrice < 0) {

        showToast(
            "Informe um preço válido.",
            "error"
        );

        return;

    }


    if (!date) {

        showToast(
            "Informe a data da venda.",
            "error"
        );

        return;

    }


    const total =
        quantity * unitPrice;


    try {

        await postData({

            acao: "novaVenda",

            data: date,

            produto: product,

            cliente: client,

            quantidade: quantity,

            pagamento: payment,

            valorUnitario: unitPrice,

            total: total

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
            "Erro ao salvar venda.",
            "error"
        );

    }

}


/* =====================================================
   SALVAR DESPESA
===================================================== */

async function saveExpense(event) {

    event.preventDefault();


    const description =
        document.getElementById(
            "expenseDescription"
        )?.value.trim();


    const category =
        document.getElementById(
            "expenseCategory"
        )?.value;


    const value =
        parseNumber(
            document.getElementById(
                "expenseValue"
            )?.value
        );


    const date =
        document.getElementById(
            "expenseDate"
        )?.value;


    const payment =
        document.getElementById(
            "expensePayment"
        )?.value;


    if (!description) {

        showToast(
            "Informe a descrição da despesa.",
            "error"
        );

        return;

    }


    if (value <= 0) {

        showToast(
            "Informe um valor válido.",
            "error"
        );

        return;

    }


    try {

        await postData({

            acao: "novaDespesa",

            data: date,

            descricao: description,

            categoria: category,

            pagamento: payment,

            valor: value

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
            "Erro ao salvar despesa.",
            "error"
        );

    }

}


/* =====================================================
   SALVAR PRODUTO
===================================================== */

async function saveProduct(event) {

    event.preventDefault();


    const name =
        document.getElementById(
            "productName"
        )?.value.trim();


    const quantity =
        parseNumber(
            document.getElementById(
                "productQuantity"
            )?.value
        );


    const minimum =
        parseNumber(
            document.getElementById(
                "productMinimum"
            )?.value
        );


    const price =
        parseNumber(
            document.getElementById(
                "productPrice"
            )?.value
        );


    const cost =
        parseNumber(
            document.getElementById(
                "productCost"
            )?.value
        );


    if (!name) {

        showToast(
            "Informe o nome do produto.",
            "error"
        );

        return;

    }


    try {

        await postData({

            acao: "novoProduto",

            nome: name,

            quantidade: quantity,

            minimo: minimum,

            preco: price,

            custo: cost

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
            "Erro ao salvar produto.",
            "error"
        );

    }

}


/* =====================================================
   EXCLUIR VENDA
===================================================== */

async function deleteSale(line) {

    const venda =
        sales.find(
            item =>
                Number(item.linha) ===
                Number(line)
        );


    if (!venda) {

        showToast(
            "Venda não encontrada.",
            "error"
        );

        return;

    }


    const confirmed =
        confirm(
            `Excluir a venda de "${venda.Produto}"?\n\nEssa venda será enviada para o backup antes de ser apagada.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await postData({

            acao: "excluirVenda",

            linha: venda.linha

        });


        showToast(
            "Venda excluída e enviada para o backup."
        );


        await loadData();


    } catch (error) {

        console.error(error);

        showToast(
            "Erro ao excluir venda.",
            "error"
        );

    }

}


/* =====================================================
   EXCLUIR DESPESA
===================================================== */

async function deleteExpense(line) {

    const expense =
        expenses.find(
            item =>
                Number(item.linha) ===
                Number(line)
        );


    if (!expense) {

        showToast(
            "Despesa não encontrada.",
            "error"
        );

        return;

    }


    const confirmed =
        confirm(
            `Excluir a despesa "${expense.Descricao}"?\n\nEla será enviada para o backup antes de ser apagada.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await postData({

            acao: "excluirDespesa",

            linha: expense.linha

        });


        showToast(
            "Despesa excluída e enviada para o backup."
        );


        await loadData();


    } catch (error) {

        console.error(error);

        showToast(
            "Erro ao excluir despesa.",
            "error"
        );

    }

}


/* =====================================================
   EXCLUIR PRODUTO
===================================================== */

async function deleteProduct(line) {

    const product =
        products.find(
            item =>
                Number(item.linha) ===
                Number(line)
        );


    if (!product) {

        showToast(
            "Produto não encontrado.",
            "error"
        );

        return;

    }


    const confirmed =
        confirm(
            `Excluir o produto "${product.Nome}"?\n\nEle será enviado para o backup antes de ser apagado.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await postData({

            acao: "excluirProduto",

            linha: product.linha

        });


        showToast(
            "Produto excluído e enviado para o backup."
        );


        await loadData();


    } catch (error) {

        console.error(error);

        showToast(
            "Erro ao excluir produto.",
            "error"
        );

    }

}


/* =====================================================
   TEMA
===================================================== */

function initializeTheme() {

    const button =
        document.getElementById(
            "themeButton"
        );


    const savedTheme =
        localStorage.getItem(
            "vorita-theme"
        );


    if (savedTheme === "dark") {

        document.body.classList.add(
            "dark"
        );

    }


    updateThemeIcon();


    if (button) {

        button.addEventListener(
            "click",
            function() {

                document.body.classList.toggle(
                    "dark"
                );


                const dark =
                    document.body.classList.contains(
                        "dark"
                    );


                localStorage.setItem(
                    "vorita-theme",
                    dark
                        ? "dark"
                        : "light"
                );


                updateThemeIcon();

            }
        );

    }

}


function updateThemeIcon() {

    const button =
        document.getElementById(
            "themeButton"
        );


    if (!button) {
        return;
    }


    const icon =
        button.querySelector("i");


    if (!icon) {
        return;
    }


    const dark =
        document.body.classList.contains(
            "dark"
        );


    icon.className =
        dark
            ? "fa-solid fa-sun"
            : "fa-solid fa-moon";

}


/* =====================================================
   DATA ATUAL
===================================================== */

function initializeToday() {

    const today =
        document.getElementById(
            "today"
        );


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
   EVENTOS
===================================================== */

function initializeEvents() {

    /* ---------------------------------------------
       MENU MOBILE
    --------------------------------------------- */

    const mobileMenu =
        document.getElementById(
            "mobileMenu"
        );


    if (mobileMenu) {

        mobileMenu.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();

                toggleMobileMenu();

            }
        );

    }


    /*
       Cria o overlay mesmo que ele
       não exista no HTML.
    */

    const overlay =
        createMobileOverlay();


    overlay.addEventListener(
        "click",
        function() {

            closeMobileMenu();

        }
    );


    /* ---------------------------------------------
       MENU PRINCIPAL
    --------------------------------------------- */

    $all(
        ".menu-item[data-page]"
    ).forEach(item => {

        item.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                const page =
                    this.dataset.page;


                navigateToPage(
                    page
                );

            }
        );

    });


    /* ---------------------------------------------
       BOTÕES data-go
    --------------------------------------------- */

    $all(
        "[data-go]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            function() {

                navigateToPage(
                    this.dataset.go
                );

            }
        );

    });


    /* ---------------------------------------------
       BOTÕES NOVO
    --------------------------------------------- */

    const newSale =
        document.getElementById(
            "newSale"
        );


    if (newSale) {

        newSale.addEventListener(
            "click",
            function() {

                prepareSaleForm();

                openModal(
                    "saleModal"
                );

            }
        );

    }


    const newExpense =
        document.getElementById(
            "newExpense"
        );


    if (newExpense) {

        newExpense.addEventListener(
            "click",
            function() {

                prepareExpenseForm();

                openModal(
                    "expenseModal"
                );

            }
        );

    }


    const newProduct =
        document.getElementById(
            "newProduct"
        );


    if (newProduct) {

        newProduct.addEventListener(
            "click",
            function() {

                prepareProductForm();

                openModal(
                    "productModal"
                );

            }
        );

    }


    /* ---------------------------------------------
       FECHAR MODAIS
    --------------------------------------------- */

    $all(
        "[data-close]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            function() {

                closeModal(
                    this.dataset.close
                );

            }
        );

    });


    $all(
        ".modal-overlay"
    ).forEach(overlayElement => {

        overlayElement.addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    overlayElement
                ) {

                    overlayElement.classList.remove(
                        "active"
                    );

                }

            }
        );

    });


    /* ---------------------------------------------
       ESC
    --------------------------------------------- */

    document.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Escape") {

                $all(
                    ".modal-overlay.active"
                ).forEach(modal => {

                    modal.classList.remove(
                        "active"
                    );

                });


                closeMobileMenu();

            }

        }
    );


    /* ---------------------------------------------
       FORM VENDA
    --------------------------------------------- */

    const saleForm =
        document.getElementById(
            "saleForm"
        );


    if (saleForm) {

        saleForm.addEventListener(
            "submit",
            saveSale
        );

    }


    /* ---------------------------------------------
       FORM DESPESA
    --------------------------------------------- */

    const expenseForm =
        document.getElementById(
            "expenseForm"
        );


    if (expenseForm) {

        expenseForm.addEventListener(
            "submit",
            saveExpense
        );

    }


    /* ---------------------------------------------
       FORM PRODUTO
    --------------------------------------------- */

    const productForm =
        document.getElementById(
            "productForm"
        );


    if (productForm) {

        productForm.addEventListener(
            "submit",
            saveProduct
        );

    }


    /* ---------------------------------------------
       TOTAL VENDA
    --------------------------------------------- */

    const saleQuantity =
        document.getElementById(
            "saleQuantity"
        );


    const saleUnitPrice =
        document.getElementById(
            "saleUnitPrice"
        );


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


    /* ---------------------------------------------
       FILTRO DASHBOARD
    --------------------------------------------- */

    const dashboardPeriod =
        document.getElementById(
            "dashboardPeriod"
        );


    if (dashboardPeriod) {

        dashboardPeriod.addEventListener(
            "change",
            renderDashboard
        );

    }


    /* ---------------------------------------------
       BUSCA VENDAS
    --------------------------------------------- */

    const salesSearch =
        document.getElementById(
            "salesSearch"
        );


    if (salesSearch) {

        salesSearch.addEventListener(
            "input",
            renderSales
        );

    }


    /* ---------------------------------------------
       BUSCA DESPESAS
    --------------------------------------------- */

    const expenseSearch =
        document.getElementById(
            "expenseSearch"
        );


    if (expenseSearch) {

        expenseSearch.addEventListener(
            "input",
            renderExpenses
        );

    }


    /* ---------------------------------------------
       MÊS / ANO
    --------------------------------------------- */

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
            renderReports
        );

    }


    if (reportYear) {

        reportYear.addEventListener(
            "change",
            renderReports
        );

    }


    /* ---------------------------------------------
       EXCLUSÕES
       Delegação de eventos
    --------------------------------------------- */

    document.addEventListener(
        "click",
        function(event) {

            const saleButton =
                event.target.closest(
                    "[data-delete-sale]"
                );


            if (saleButton) {

                deleteSale(
                    Number(
                        saleButton.dataset.deleteSale
                    )
                );

                return;

            }


            const expenseButton =
                event.target.closest(
                    "[data-delete-expense]"
                );


            if (expenseButton) {

                deleteExpense(
                    Number(
                        expenseButton.dataset.deleteExpense
                    )
                );

                return;

            }


            const productButton =
                event.target.closest(
                    "[data-delete-product]"
                );


            if (productButton) {

                deleteProduct(
                    Number(
                        productButton.dataset.deleteProduct
                    )
                );

            }

        }
    );


    /* ---------------------------------------------
       REDIMENSIONAMENTO
    --------------------------------------------- */

    window.addEventListener(
        "resize",
        function() {

            if (window.innerWidth > 850) {

                closeMobileMenu();

            }

        }
    );

}


/* =====================================================
   RENDERIZA TUDO
===================================================== */

function renderAll() {

    renderDashboard();

    renderSales();

    renderExpenses();

    renderProducts();

    renderReports();

}


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        initializeToday();

        initializeReportSelectors();

        initializeTheme();

        initializeEvents();

        /*
           Garante que o Dashboard
           seja a página inicial.
        */

        navigateToPage(
            "dashboard"
        );


        await loadData();

    }
);
