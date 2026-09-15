/* =========================================================
   VÓ RITA — BALANÇO GERAL
   SCRIPT.JS
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxvHq6N62Yj8s91vRSrByUnMLp1wJ0UjLcczN80fVDwH2HqGPPleP3MHypygLwoY8uvhQ/exec";


/* =========================================================
   DADOS LOCAIS
========================================================= */

let sales = JSON.parse(
    localStorage.getItem("voRitaSales") || "[]"
);

let expenses = JSON.parse(
    localStorage.getItem("voRitaExpenses") || "[]"
);

let products = JSON.parse(
    localStorage.getItem("voRitaProducts") || "[]"
);


/* =========================================================
   VARIÁVEIS
========================================================= */

let financeChart = null;
let monthlyChart = null;
let comparisonChart = null;

let currentPage = "dashboard";


/* =========================================================
   ELEMENTOS
========================================================= */

const $ = (selector) =>
    document.querySelector(selector);

const $$ = (selector) =>
    document.querySelectorAll(selector);


/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatMoney(value) {

    return Number(value || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


function formatDate(dateString) {

    if (!dateString) return "—";

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString(
        "pt-BR"
    );

}


function todayISO() {

    const date = new Date();

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const toast =
        $("#toast");

    const toastMessage =
        $("#toastMessage");

    if (!toast) return;

    toastMessage.textContent =
        message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function saveLocalData() {

    localStorage.setItem(
        "voRitaSales",
        JSON.stringify(sales)
    );

    localStorage.setItem(
        "voRitaExpenses",
        JSON.stringify(expenses)
    );

    localStorage.setItem(
        "voRitaProducts",
        JSON.stringify(products)
    );

}


/* =========================================================
   GOOGLE SHEETS
========================================================= */

async function sendToGoogleSheets(data) {

    if (
        !GOOGLE_SCRIPT_URL ||
        GOOGLE_SCRIPT_URL.includes(
            "COLE_AQUI"
        )
    ) {

        console.warn(
            "Google Apps Script ainda não configurado."
        );

        return null;

    }


    try {

        const response =
            await fetch(
                GOOGLE_SCRIPT_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body:
                        JSON.stringify(data)
                }
            );


        const result =
            await response.json();

        return result;

    } catch (error) {

        console.error(
            "Erro ao enviar para Google Sheets:",
            error
        );

        return null;

    }

}


/* =========================================================
   CARREGAR DADOS DA PLANILHA
========================================================= */

async function loadFromGoogleSheets() {

    if (
        !GOOGLE_SCRIPT_URL ||
        GOOGLE_SCRIPT_URL.includes(
            "COLE_AQUI"
        )
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                GOOGLE_SCRIPT_URL
            );

        const data =
            await response.json();


        if (
            data &&
            Array.isArray(data.vendas)
        ) {

            sales =
                data.vendas;

        }


        if (
            data &&
            Array.isArray(data.despesas)
        ) {

            expenses =
                data.despesas;

        }


        if (
            data &&
            Array.isArray(data.estoque)
        ) {

            products =
                data.estoque;

        }


        saveLocalData();

        refreshAll();

        showToast(
            "Dados sincronizados com a planilha."
        );


    } catch (error) {

        console.warn(
            "Não foi possível carregar os dados da planilha.",
            error
        );

    }

}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function navigateTo(page) {

    currentPage =
        page;


    $$(".page").forEach(
        section => {

            section.classList.toggle(
                "active",
                section.id === page
            );

        }
    );


    $$(".menu-item").forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        }
    );


    updatePageHeader(
        page
    );


    if (
        window.innerWidth <= 850
    ) {

        $(".sidebar")
            ?.classList.remove("open");

    }


    if (page === "dashboard") {

        updateDashboard();

    }

    if (page === "vendas") {

        renderSales();

    }

    if (page === "despesas") {

        renderExpenses();

    }

    if (page === "estoque") {

        renderProducts();

    }

    if (page === "relatorios") {

        updateReports();

    }

}


function updatePageHeader(page) {

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


    const data =
        titles[page] ||
        titles.dashboard;


    if ($("#pageKicker"))
        $("#pageKicker").textContent =
            data[0];


    if ($("#pageTitle"))
        $("#pageTitle").textContent =
            data[1];

}


/* =========================================================
   DATA ATUAL
========================================================= */

function updateToday() {

    const element =
        $("#today");

    if (!element) return;

    const date =
        new Date();


    element.textContent =
        date.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );

}


/* =========================================================
   PERÍODOS
========================================================= */

function filterByPeriod(
    data,
    period
) {

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        now.getMonth();


    return data.filter(
        item => {

            const date =
                new Date(
                    item.data + "T00:00:00"
                );


            if (period === "today") {

                return (
                    date.getFullYear() === year &&
                    date.getMonth() === month &&
                    date.getDate() === now.getDate()
                );

            }


            if (period === "month") {

                return (
                    date.getFullYear() === year &&
                    date.getMonth() === month
                );

            }


            if (period === "year") {

                return (
                    date.getFullYear() === year
                );

            }


            return true;

        }
    );

}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

    const period =
        $("#dashboardPeriod")
            ?.value || "month";


    const filteredSales =
        filterByPeriod(
            sales,
            period
        );


    const filteredExpenses =
        filterByPeriod(
            expenses,
            period
        );


    const revenue =
        filteredSales.reduce(
            (sum, item) =>
                sum +
                Number(item.total || 0),
            0
        );


    const expenseTotal =
        filteredExpenses.reduce(
            (sum, item) =>
                sum +
                Number(item.valor || 0),
            0
        );


    const profit =
        revenue -
        expenseTotal;


    const quantity =
        filteredSales.length;


    const ticket =
        quantity > 0
            ? revenue / quantity
            : 0;


    const margin =
        revenue > 0
            ? (profit / revenue) * 100
            : 0;


    setText(
        "dashRevenue",
        formatMoney(revenue)
    );


    setText(
        "dashExpenses",
        formatMoney(expenseTotal)
    );


    setText(
        "dashProfit",
        formatMoney(profit)
    );


    setText(
        "dashOrders",
        quantity
    );


    setText(
        "averageTicket",
        formatMoney(ticket)
    );


    setText(
        "productCount",
        products.length
    );


    const lowStock =
        products.filter(
            product =>
                Number(product.quantidade || 0) <=
                Number(product.minimo || 0)
        ).length;


    setText(
        "lowStockCount",
        lowStock
    );


    setText(
        "profitMargin",
        `${margin.toFixed(1)}%`
    );


    renderRecentSales(
        filteredSales
    );


    renderFinanceChart(
        filteredSales,
        filteredExpenses
    );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element)
        element.textContent =
            value;

}


/* =========================================================
   ÚLTIMAS VENDAS
========================================================= */

function renderRecentSales(
    data
) {

    const tbody =
        $("#recentSales");

    const empty =
        $("#emptyRecentSales");


    if (!tbody) return;


    tbody.innerHTML = "";


    const recent =
        [...data]
            .sort(
                (a, b) =>
                    new Date(b.data) -
                    new Date(a.data)
            )
            .slice(0, 5);


    if (recent.length === 0) {

        if (empty)
            empty.style.display =
                "block";

        return;

    }


    if (empty)
        empty.style.display =
            "none";


    recent.forEach(
        sale => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = `

                <td>
                    ${formatDate(sale.data)}
                </td>

                <td>
                    ${escapeHTML(
                        sale.produto
                    )}
                </td>

                <td>
                    ${sale.quantidade}
                </td>

                <td>
                    ${escapeHTML(
                        sale.pagamento
                    )}
                </td>

                <td>
                    <strong>
                        ${formatMoney(
                            sale.total
                        )}
                    </strong>
                </td>

            `;


            tbody.appendChild(tr);

        }
    );

}


/* =========================================================
   GRÁFICO FINANCEIRO
========================================================= */

function renderFinanceChart(
    saleData,
    expenseData
) {

    const canvas =
        $("#financeChart");

    if (!canvas) return;


    const context =
        canvas.getContext("2d");


    const labels = [];
    const revenues = [];
    const expensesValues = [];


    const today =
        new Date();


    for (
        let i = 6;
        i >= 0;
        i--
    ) {

        const date =
            new Date(today);

        date.setDate(
            today.getDate() - i
        );


        const iso =
            date.toISOString()
                .split("T")[0];


        labels.push(
            date.toLocaleDateString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit"
                }
            )
        );


        revenues.push(
            saleData
                .filter(
                    item =>
                        item.data === iso
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(item.total || 0),
                    0
                )
        );


        expensesValues.push(
            expenseData
                .filter(
                    item =>
                        item.data === iso
                )
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(item.valor || 0),
                    0
                )
        );

    }


    if (financeChart)
        financeChart.destroy();


    financeChart =
        new Chart(
            context,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Faturamento",

                            data:
                                revenues,

                            borderWidth:
                                2,

                            tension:
                                .35
                        },

                        {
                            label:
                                "Despesas",

                            data:
                                expensesValues,

                            borderWidth:
                                2,

                            tension:
                                .35
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: true
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    value =>
                                        formatMoney(
                                            value
                                        )

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   VENDAS
========================================================= */

function renderSales(
    search = ""
) {

    const tbody =
        $("#salesTable");

    const empty =
        $("#emptySales");


    if (!tbody) return;


    tbody.innerHTML = "";


    const term =
        search
            .trim()
            .toLowerCase();


    const filtered =
        sales.filter(
            sale => {

                if (!term)
                    return true;


                return (

                    String(
                        sale.produto
                    )
                    .toLowerCase()
                    .includes(term)

                    ||

                    String(
                        sale.cliente || ""
                    )
                    .toLowerCase()
                    .includes(term)

                    ||

                    String(
                        sale.pagamento
                    )
                    .toLowerCase()
                    .includes(term)

                );

            }
        );


    const total =
        sales.reduce(
            (sum, sale) =>
                sum +
                Number(sale.total || 0),
            0
        );


    const quantity =
        sales.length;


    const average =
        quantity > 0
            ? total / quantity
            : 0;


    setText(
        "salesTotal",
        formatMoney(total)
    );


    setText(
        "salesQuantity",
        quantity
    );


    setText(
        "salesAverage",
        formatMoney(average)
    );


    if (
        filtered.length === 0
    ) {

        if (empty)
            empty.style.display =
                "block";

        return;

    }


    if (empty)
        empty.style.display =
            "none";


    filtered
        .sort(
            (a, b) =>
                new Date(b.data) -
                new Date(a.data)
        )
        .forEach(
            sale => {

                const tr =
                    document.createElement(
                        "tr"
                    );


                tr.innerHTML = `

                    <td>
                        ${formatDate(
                            sale.data
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            sale.produto
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            sale.cliente || "—"
                        )}
                    </td>

                    <td>
                        ${sale.quantidade}
                    </td>

                    <td>
                        ${escapeHTML(
                            sale.pagamento
                        )}
                    </td>

                    <td>
                        <strong>
                            ${formatMoney(
                                sale.total
                            )}
                        </strong>
                    </td>

                    <td>

                        <button
                            class="delete-button"
                            title="Excluir"
                            data-delete-sale="${sale.id}">

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </td>

                `;


                tbody.appendChild(tr);

            }
        );

}


/* =========================================================
   DESPESAS
========================================================= */

function renderExpenses(
    search = ""
) {

    const tbody =
        $("#expensesTable");

    const empty =
        $("#emptyExpenses");


    if (!tbody) return;


    tbody.innerHTML = "";


    const term =
        search
            .trim()
            .toLowerCase();


    const filtered =
        expenses.filter(
            expense => {

                if (!term)
                    return true;


                return (

                    String(
                        expense.descricao
                    )
                    .toLowerCase()
                    .includes(term)

                    ||

                    String(
                        expense.categoria
                    )
                    .toLowerCase()
                    .includes(term)

                    ||

                    String(
                        expense.pagamento
                    )
                    .toLowerCase()
                    .includes(term)

                );

            }
        );


    const total =
        expenses.reduce(
            (sum, expense) =>
                sum +
                Number(expense.valor || 0),
            0
        );


    const quantity =
        expenses.length;


    const largest =
        expenses.length
            ? Math.max(
                ...expenses.map(
                    item =>
                        Number(
                            item.valor || 0
                        )
                )
            )
            : 0;


    setText(
        "expenseTotal",
        formatMoney(total)
    );


    setText(
        "expenseQuantity",
        quantity
    );


    setText(
        "largestExpense",
        formatMoney(largest)
    );


    if (
        filtered.length === 0
    ) {

        if (empty)
            empty.style.display =
                "block";

        return;

    }


    if (empty)
        empty.style.display =
            "none";


    filtered
        .sort(
            (a, b) =>
                new Date(b.data) -
                new Date(a.data)
        )
        .forEach(
            expense => {

                const tr =
                    document.createElement(
                        "tr"
                    );


                tr.innerHTML = `

                    <td>
                        ${formatDate(
                            expense.data
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            expense.descricao
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            expense.categoria
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            expense.pagamento
                        )}
                    </td>

                    <td>
                        <strong>
                            ${formatMoney(
                                expense.valor
                            )}
                        </strong>
                    </td>

                    <td>

                        <button
                            class="delete-button"
                            title="Excluir"
                            data-delete-expense="${expense.id}">

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </td>

                `;


                tbody.appendChild(tr);

            }
        );

}


/* =========================================================
   ESTOQUE
========================================================= */

function renderProducts() {

    const grid =
        $("#productGrid");

    const empty =
        $("#emptyProducts");


    if (!grid) return;


    grid.innerHTML = "";


    const totalUnits =
        products.reduce(
            (sum, product) =>
                sum +
                Number(
                    product.quantidade || 0
                ),
            0
        );


    const low =
        products.filter(
            product =>
                Number(
                    product.quantidade || 0
                ) <=
                Number(
                    product.minimo || 0
                )
        ).length;


    setText(
        "stockProducts",
        products.length
    );


    setText(
        "stockUnits",
        totalUnits
    );


    setText(
        "stockLow",
        low
    );


    if (
        products.length === 0
    ) {

        if (empty)
            empty.style.display =
                "block";

        return;

    }


    if (empty)
        empty.style.display =
            "none";


    products.forEach(
        product => {

            const quantity =
                Number(
                    product.quantidade || 0
                );

            const minimum =
                Number(
                    product.minimo || 0
                );


            const percent =
                minimum > 0
                    ? Math.min(
                        100,
                        (quantity / minimum) * 100
                    )
                    : 100;


            const lowStock =
                quantity <= minimum;


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "product-card";


            card.innerHTML = `

                <div class="product-top">

                    <div class="product-image">

                        <i class="fa-solid fa-cookie-bite"></i>

                    </div>

                </div>


                <h4>
                    ${escapeHTML(
                        product.nome
                    )}
                </h4>


                <div class="product-price">

                    ${formatMoney(
                        product.preco
                    )}

                </div>


                <div class="stock-bar">

                    <div
                        class="stock-progress ${
                            lowStock
                                ? "low"
                                : ""
                        }"
                        style="width:${percent}%">
                    </div>

                </div>


                <div class="stock-info">

                    <span>
                        Estoque:
                        ${quantity}
                    </span>

                    <span>
                        Mínimo:
                        ${minimum}
                    </span>

                </div>


                <div class="product-actions">

                    <small>
                        Custo:
                        ${formatMoney(
                            product.custo
                        )}
                    </small>


                    <button
                        class="delete-button"
                        title="Excluir"
                        data-delete-product="${product.id}">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            `;


            grid.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   MODAIS
========================================================= */

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (modal)
        modal.classList.add(
            "active"
        );

}


function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (modal)
        modal.classList.remove(
            "active"
        );

}


/* =========================================================
   PREVIEW DA VENDA
========================================================= */

function updateSalePreview() {

    const quantity =
        Number(
            $("#saleQuantity")?.value || 0
        );


    const unitPrice =
        Number(
            $("#saleUnitPrice")?.value || 0
        );


    const total =
        quantity *
        unitPrice;


    setText(
        "saleTotalPreview",
        formatMoney(total)
    );

}


/* =========================================================
   REGISTRAR VENDA
========================================================= */

async function registerSale(
    event
) {

    event.preventDefault();


    const produto =
        $("#saleProduct").value.trim();


    const cliente =
        $("#saleClient").value.trim();


    const quantidade =
        Number(
            $("#saleQuantity").value
        );


    const unitPrice =
        Number(
            $("#saleUnitPrice").value
        );


    const data =
        $("#saleDate").value;


    const pagamento =
        $("#salePayment").value;


    if (!produto) {

        showToast(
            "Informe o produto."
        );

        return;

    }


    if (
        quantidade <= 0 ||
        unitPrice < 0
    ) {

        showToast(
            "Informe quantidade e valor válidos."
        );

        return;

    }


    const total =
        quantidade *
        unitPrice;


    const sale = {

        id:
            createId(),

        data,

        produto,

        cliente,

        quantidade,

        valorUnitario:
            unitPrice,

        total,

        pagamento

    };


    sales.push(
        sale
    );


    saveLocalData();

    refreshAll();


    closeModal(
        "saleModal"
    );


    $("#saleForm")
        .reset();


    setDefaultDates();


    showToast(
        "Venda salva. Sincronizando com a planilha..."
    );


    const result =
        await sendToGoogleSheets(
            {
                action:
                    "addSale",

                sale
            }
        );


    if (
        result &&
        result.success
    ) {

        showToast(
            "Venda salva na planilha!"
        );

    } else {

        showToast(
            "Venda salva localmente. Verifique a conexão com a planilha."
        );

    }

}


/* =========================================================
   REGISTRAR DESPESA
========================================================= */

async function registerExpense(
    event
) {

    event.preventDefault();


    const descricao =
        $("#expenseDescription")
            .value
            .trim();


    const categoria =
        $("#expenseCategory")
            .value;


    const valor =
        Number(
            $("#expenseValue").value
        );


    const data =
        $("#expenseDate").value;


    const pagamento =
        $("#expensePayment").value;


    if (!descricao) {

        showToast(
            "Informe a descrição."
        );

        return;

    }


    if (
        valor <= 0
    ) {

        showToast(
            "Informe um valor válido."
        );

        return;

    }


    const expense = {

        id:
            createId(),

        data,

        descricao,

        categoria,

        valor,

        pagamento

    };


    expenses.push(
        expense
    );


    saveLocalData();

    refreshAll();


    closeModal(
        "expenseModal"
    );


    $("#expenseForm")
        .reset();


    setDefaultDates();


    showToast(
        "Despesa salva. Sincronizando..."
    );


    const result =
        await sendToGoogleSheets(
            {
                action:
                    "addExpense",

                expense
            }
        );


    if (
        result &&
        result.success
    ) {

        showToast(
            "Despesa salva na planilha!"
        );

    } else {

        showToast(
            "Despesa salva localmente."
        );

    }

}


/* =========================================================
   REGISTRAR PRODUTO
========================================================= */

async function registerProduct(
    event
) {

    event.preventDefault();


    const nome =
        $("#productName")
            .value
            .trim();


    const quantidade =
        Number(
            $("#productQuantity").value
        );


    const minimo =
        Number(
            $("#productMinimum").value
        );


    const preco =
        Number(
            $("#productPrice").value
        );


    const custo =
        Number(
            $("#productCost").value
        );


    if (!nome) {

        showToast(
            "Informe o nome do produto."
        );

        return;

    }


    const product = {

        id:
            createId(),

        nome,

        quantidade,

        minimo,

        preco,

        custo

    };


    products.push(
        product
    );


    saveLocalData();

    refreshAll();


    closeModal(
        "productModal"
    );


    $("#productForm")
        .reset();


    showToast(
        "Produto salvo. Sincronizando..."
    );


    const result =
        await sendToGoogleSheets(
            {
                action:
                    "addProduct",

                product
            }
        );


    if (
        result &&
        result.success
    ) {

        showToast(
            "Produto salvo na planilha!"
        );

    } else {

        showToast(
            "Produto salvo localmente."
        );

    }

}


/* =========================================================
   EXCLUSÃO
========================================================= */

async function deleteSale(
    id
) {

    const confirmed =
        confirm(
            "Deseja realmente excluir esta venda?"
        );


    if (!confirmed)
        return;


    sales =
        sales.filter(
            sale =>
                String(sale.id) !==
                String(id)
        );


    saveLocalData();

    refreshAll();


    showToast(
        "Venda excluída."
    );


    await sendToGoogleSheets(
        {
            action:
                "deleteSale",

            id
        }
    );

}


async function deleteExpense(
    id
) {

    const confirmed =
        confirm(
            "Deseja realmente excluir esta despesa?"
        );


    if (!confirmed)
        return;


    expenses =
        expenses.filter(
            expense =>
                String(expense.id) !==
                String(id)
        );


    saveLocalData();

    refreshAll();


    showToast(
        "Despesa excluída."
    );


    await sendToGoogleSheets(
        {
            action:
                "deleteExpense",

            id
        }
    );

}


async function deleteProduct(
    id
) {

    const confirmed =
        confirm(
            "Deseja realmente excluir este produto?"
        );


    if (!confirmed)
        return;


    products =
        products.filter(
            product =>
                String(product.id) !==
                String(id)
        );


    saveLocalData();

    refreshAll();


    showToast(
        "Produto excluído."
    );


    await sendToGoogleSheets(
        {
            action:
                "deleteProduct",

            id
        }
    );

}


/* =========================================================
   RELATÓRIOS
========================================================= */

function populateReportSelectors() {

    const monthSelect =
        $("#reportMonth");

    const yearSelect =
        $("#reportYear");


    if (!monthSelect || !yearSelect)
        return;


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


    monthSelect.innerHTML = "";


    months.forEach(
        (month, index) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                index;

            option.textContent =
                month;

            monthSelect.appendChild(
                option
            );

        }
    );


    const currentYear =
        new Date().getFullYear();


    yearSelect.innerHTML = "";


    for (
        let year = currentYear - 4;
        year <= currentYear + 1;
        year++
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            year;

        option.textContent =
            year;

        yearSelect.appendChild(
            option
        );

    }


    monthSelect.value =
        new Date().getMonth();


    yearSelect.value =
        currentYear;

}


/* =========================================================
   DADOS DO MÊS
========================================================= */

function getMonthlyData(
    month,
    year
) {

    const monthlySales =
        sales.filter(
            sale => {

                const date =
                    new Date(
                        sale.data +
                        "T00:00:00"
                    );

                return (
                    date.getMonth() ===
                    Number(month)

                    &&

                    date.getFullYear() ===
                    Number(year)
                );

            }
        );


    const monthlyExpenses =
        expenses.filter(
            expense => {

                const date =
                    new Date(
                        expense.data +
                        "T00:00:00"
                    );

                return (
                    date.getMonth() ===
                    Number(month)

                    &&

                    date.getFullYear() ===
                    Number(year)
                );

            }
        );


    return {
        sales:
            monthlySales,

        expenses:
            monthlyExpenses
    };

}


/* =========================================================
   ATUALIZAR RELATÓRIO
========================================================= */

function updateReports() {

    const month =
        Number(
            $("#reportMonth")?.value ??
            new Date().getMonth()
        );


    const year =
        Number(
            $("#reportYear")?.value ??
            new Date().getFullYear()
        );


    const data =
        getMonthlyData(
            month,
            year
        );


    const revenue =
        data.sales.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.total || 0
                ),
            0
        );


    const expenseTotal =
        data.expenses.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.valor || 0
                ),
            0
        );


    const profit =
        revenue -
        expenseTotal;


    const margin =
        revenue > 0
            ? (profit / revenue) * 100
            : 0;


    setText(
        "monthlyRevenue",
        formatMoney(revenue)
    );


    setText(
        "monthlyExpenses",
        formatMoney(expenseTotal)
    );


    setText(
        "monthlyProfit",
        formatMoney(profit)
    );


    setText(
        "monthlyMargin",
        `${margin.toFixed(1)}%`
    );


    setText(
        "monthlySalesCount",
        data.sales.length
    );


    const ticket =
        data.sales.length
            ? revenue /
              data.sales.length
            : 0;


    setText(
        "monthlyTicket",
        formatMoney(ticket)
    );


    const items =
        data.sales.reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.quantidade || 0
                ),
            0
        );


    setText(
        "monthlyItems",
        items
    );


    const title =
        new Date(
            year,
            month,
            1
        ).toLocaleDateString(
            "pt-BR",
            {
                month: "long",
                year: "numeric"
            }
        );


    setText(
        "monthlyReportTitle",
        capitalize(title)
    );


    renderMonthlyChart(
        data.sales,
        data.expenses,
        month,
        year
    );


    renderMonthlyPayments(
        data.sales
    );


    renderMonthlyProducts(
        data.sales
    );


    renderComparison();

    renderGeneralReports();

}


/* =========================================================
   GRÁFICO MENSAL
========================================================= */

function renderMonthlyChart(
    saleData,
    expenseData,
    month,
    year
) {

    const canvas =
        $("#monthlyChart");

    if (!canvas) return;


    const context =
        canvas.getContext("2d");


    const days =
        new Date(
            year,
            Number(month) + 1,
            0
        ).getDate();


    const labels = [];
    const revenues = [];
    const expensesValues = [];


    for (
        let day = 1;
        day <= days;
        day++
    ) {

        const date =
            new Date(
                year,
                month,
                day
            );


        const iso =
            `${year}-${String(
                Number(month) + 1
            ).padStart(2, "0")}-${String(
                day
            ).padStart(2, "0")}`;


        labels.push(
            String(day)
        );


        revenues.push(
            saleData
                .filter(
                    sale =>
                        sale.data === iso
                )
                .reduce(
                    (sum, sale) =>
                        sum +
                        Number(
                            sale.total || 0
                        ),
                    0
                )
        );


        expensesValues.push(
            expenseData
                .filter(
                    expense =>
                        expense.data === iso
                )
                .reduce(
                    (sum, expense) =>
                        sum +
                        Number(
                            expense.valor || 0
                        ),
                    0
                )
        );

    }


    if (monthlyChart)
        monthlyChart.destroy();


    monthlyChart =
        new Chart(
            context,
            {
                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Entradas",

                            data:
                                revenues,

                            borderWidth:
                                1
                        },

                        {
                            label:
                                "Saídas",

                            data:
                                expensesValues,

                            borderWidth:
                                1
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    value =>
                                        formatMoney(
                                            value
                                        )

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   PAGAMENTOS
========================================================= */

function renderMonthlyPayments(
    data
) {

    const container =
        $("#monthlyPayments");


    if (!container) return;


    container.innerHTML = "";


    const payments = {};


    data.forEach(
        sale => {

            const payment =
                sale.pagamento ||
                "Outro";


            payments[payment] =
                (
                    payments[payment] ||
                    0
                ) +
                Number(
                    sale.total || 0
                );

        }
    );


    const entries =
        Object.entries(
            payments
        );


    if (
        entries.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-wallet"></i>

                <p>
                    Nenhuma venda neste mês.
                </p>

            </div>

        `;

        return;

    }


    entries
        .sort(
            (a, b) =>
                b[1] - a[1]
        )
        .forEach(
            ([payment, value]) => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "payment-row";


                row.innerHTML = `

                    <div class="payment-left">

                        <i class="fa-solid fa-credit-card"></i>

                        <span>
                            ${escapeHTML(
                                payment
                            )}
                        </span>

                    </div>

                    <div class="payment-right">

                        ${formatMoney(
                            value
                        )}

                    </div>

                `;


                container.appendChild(
                    row
                );

            }
        );

}


/* =========================================================
   PRODUTOS DO MÊS
========================================================= */

function renderMonthlyProducts(
    data
) {

    const container =
        $("#monthlyBestProducts");

    const bestProduct =
        $("#monthlyBestProduct");


    if (!container)
        return;


    container.innerHTML = "";


    const ranking = {};


    data.forEach(
        sale => {

            const name =
                sale.produto ||
                "Produto";


            ranking[name] =
                (
                    ranking[name] ||
                    0
                ) +
                Number(
                    sale.quantidade || 0
                );

        }
    );


    const sorted =
        Object.entries(
            ranking
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        );


    if (
        bestProduct
    ) {

        bestProduct.textContent =
            sorted.length
                ? sorted[0][0]
                : "—";

    }


    sorted
        .slice(0, 5)
        .forEach(
            ([name, quantity], index) => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "rank-item";


                item.innerHTML = `

                    <div class="rank-left">

                        <div class="rank-number">
                            ${index + 1}
                        </div>

                        <div class="rank-name">
                            ${escapeHTML(name)}
                        </div>

                    </div>

                    <div class="rank-value">

                        ${quantity}
                        ${quantity === 1
                            ? "unidade"
                            : "unidades"}

                    </div>

                `;


                container.appendChild(
                    item
                );

            }
        );


    if (
        sorted.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-box-open"></i>

                <p>
                    Nenhuma venda neste mês.
                </p>

            </div>

        `;

    }

}


/* =========================================================
   COMPARATIVO DOS ÚLTIMOS 12 MESES
========================================================= */

function renderComparison() {

    const canvas =
        $("#comparisonChart");

    const tbody =
        $("#monthlyComparisonTable");


    if (!canvas || !tbody)
        return;


    const labels = [];
    const revenues = [];
    const expenseValues = [];
    const profits = [];


    tbody.innerHTML = "";


    const now =
        new Date();


    for (
        let i = 11;
        i >= 0;
        i--
    ) {

        const date =
            new Date(
                now.getFullYear(),
                now.getMonth() - i,
                1
            );


        const month =
            date.getMonth();

        const year =
            date.getFullYear();


        const data =
            getMonthlyData(
                month,
                year
            );


        const revenue =
            data.sales.reduce(
                (sum, sale) =>
                    sum +
                    Number(
                        sale.total || 0
                    ),
                0
            );


        const expense =
            data.expenses.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.valor || 0
                    ),
                0
            );


        const profit =
            revenue -
            expense;


        const margin =
            revenue > 0
                ? (profit / revenue) * 100
                : 0;


        labels.push(
            date.toLocaleDateString(
                "pt-BR",
                {
                    month: "short"
                }
            )
        );


        revenues.push(
            revenue
        );

        expenseValues.push(
            expense
        );

        profits.push(
            profit
        );


        const tr =
            document.createElement(
                "tr"
            );


        tr.innerHTML = `

            <td>
                ${capitalize(
                    date.toLocaleDateString(
                        "pt-BR",
                        {
                            month:
                                "long",
                            year:
                                "numeric"
                        }
                    )
                )}
            </td>

            <td>
                ${formatMoney(
                    revenue
                )}
            </td>

            <td>
                ${formatMoney(
                    expense
                )}
            </td>

            <td>
                ${formatMoney(
                    profit
                )}
            </td>

            <td>
                ${margin.toFixed(1)}%
            </td>

        `;


        tbody.appendChild(
            tr
        );

    }


    if (comparisonChart)
        comparisonChart.destroy();


    comparisonChart =
        new Chart(
            canvas.getContext("2d"),
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Faturamento",

                            data:
                                revenues,

                            borderWidth:
                                2,

                            tension:
                                .35
                        },

                        {
                            label:
                                "Despesas",

                            data:
                                expenseValues,

                            borderWidth:
                                2,

                            tension:
                                .35
                        },

                        {
                            label:
                                "Lucro",

                            data:
                                profits,

                            borderWidth:
                                2,

                            tension:
                                .35
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    value =>
                                        formatMoney(
                                            value
                                        )

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   RELATÓRIOS GERAIS
========================================================= */

function renderGeneralReports() {

    const revenue =
        sales.reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.total || 0
                ),
            0
        );


    const expenseTotal =
        expenses.reduce(
            (sum, expense) =>
                sum +
                Number(
                    expense.valor || 0
                ),
            0
        );


    const profit =
        revenue -
        expenseTotal;


    const margin =
        revenue > 0
            ? (profit / revenue) * 100
            : 0;


    setText(
        "reportRevenue",
        formatMoney(revenue)
    );


    setText(
        "reportExpenses",
        formatMoney(expenseTotal)
    );


    setText(
        "reportProfit",
        formatMoney(profit)
    );


    setText(
        "reportMargin",
        `${margin.toFixed(1)}%`
    );


    setText(
        "summaryRevenue",
        formatMoney(revenue)
    );


    setText(
        "summaryExpenses",
        formatMoney(expenseTotal)
    );


    setText(
        "summaryProfit",
        formatMoney(profit)
    );


    renderBestProducts();

    renderExpenseCategories();

}


/* =========================================================
   PRODUTOS MAIS VENDIDOS — GERAL
========================================================= */

function renderBestProducts() {

    const container =
        $("#bestProducts");


    if (!container)
        return;


    container.innerHTML = "";


    const ranking = {};


    sales.forEach(
        sale => {

            const name =
                sale.produto ||
                "Produto";


            ranking[name] =
                (
                    ranking[name] ||
                    0
                ) +
                Number(
                    sale.quantidade || 0
                );

        }
    );


    const sorted =
        Object.entries(
            ranking
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )
        .slice(0, 5);


    if (
        sorted.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-box-open"></i>

                <p>
                    Ainda não existem vendas.
                </p>

            </div>

        `;

        return;

    }


    sorted.forEach(
        ([name, quantity], index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "rank-item";


            item.innerHTML = `

                <div class="rank-left">

                    <div class="rank-number">
                        ${index + 1}
                    </div>

                    <div class="rank-name">
                        ${escapeHTML(name)}
                    </div>

                </div>

                <div class="rank-value">
                    ${quantity} un.
                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   DESPESAS POR CATEGORIA
========================================================= */

function renderExpenseCategories() {

    const container =
        $("#expenseCategories");


    if (!container)
        return;


    container.innerHTML = "";


    const categories = {};


    expenses.forEach(
        expense => {

            const category =
                expense.categoria ||
                "Outros";


            categories[category] =
                (
                    categories[category] ||
                    0
                ) +
                Number(
                    expense.valor || 0
                );

        }
    );


    const sorted =
        Object.entries(
            categories
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )
        .slice(0, 5);


    if (
        sorted.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-money-bill-wave"></i>

                <p>
                    Nenhuma despesa registrada.
                </p>

            </div>

        `;

        return;

    }


    sorted.forEach(
        ([category, value], index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "rank-item";


            item.innerHTML = `

                <div class="rank-left">

                    <div class="rank-number">
                        ${index + 1}
                    </div>

                    <div class="rank-name">
                        ${escapeHTML(category)}
                    </div>

                </div>

                <div class="rank-value">
                    ${formatMoney(value)}
                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {


    /* MENU */

    $$(".menu-item")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        navigateTo(
                            button.dataset.page
                        )
                );

            }
        );


    /* LINKS INTERNOS */

    $$("[data-go]")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        navigateTo(
                            button.dataset.go
                        )
                );

            }
        );


    /* MENU MOBILE */

    $("#mobileMenu")
        ?.addEventListener(
            "click",
            () => {

                $(".sidebar")
                    ?.classList.toggle(
                        "open"
                    );

            }
        );


    /* TEMA */

    $("#themeButton")
        ?.addEventListener(
            "click",
            toggleTheme
        );


    /* NOVA VENDA */

    $("#quickSale")
        ?.addEventListener(
            "click",
            () =>
                openModal(
                    "saleModal"
                )
        );


    $("#newSale")
        ?.addEventListener(
            "click",
            () =>
                openModal(
                    "saleModal"
                )
        );


    /* NOVA DESPESA */

    $("#newExpense")
        ?.addEventListener(
            "click",
            () =>
                openModal(
                    "expenseModal"
                )
        );


    /* NOVO PRODUTO */

    $("#newProduct")
        ?.addEventListener(
            "click",
            () =>
                openModal(
                    "productModal"
                )
        );


    $("#emptyNewProduct")
        ?.addEventListener(
            "click",
            () =>
                openModal(
                    "productModal"
                )
        );


    /* FECHAR MODAIS */

    $$("[data-close]")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        closeModal(
                            button.dataset.close
                        )
                );

            }
        );


    /* CLICAR FORA DO MODAL */

    $$(".modal-overlay")
        .forEach(
            overlay => {

                overlay.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            overlay
                        ) {

                            overlay.classList
                                .remove(
                                    "active"
                                );

                        }

                    }
                );

            }
        );


    /* FORM VENDA */

    $("#saleForm")
        ?.addEventListener(
            "submit",
            registerSale
        );


    /* FORM DESPESA */

    $("#expenseForm")
        ?.addEventListener(
            "submit",
            registerExpense
        );


    /* FORM PRODUTO */

    $("#productForm")
        ?.addEventListener(
            "submit",
            registerProduct
        );


    /* PREVIEW VENDA */

    $("#saleQuantity")
        ?.addEventListener(
            "input",
            updateSalePreview
        );


    $("#saleUnitPrice")
        ?.addEventListener(
            "input",
            updateSalePreview
        );


    /* FILTRO DASHBOARD */

    $("#dashboardPeriod")
        ?.addEventListener(
            "change",
            updateDashboard
        );


    /* BUSCA VENDAS */

    $("#salesSearch")
        ?.addEventListener(
            "input",
            event =>
                renderSales(
                    event.target.value
                )
        );


    /* BUSCA DESPESAS */

    $("#expenseSearch")
        ?.addEventListener(
            "input",
            event =>
                renderExpenses(
                    event.target.value
                )
        );


    /* MÊS DO RELATÓRIO */

    $("#reportMonth")
        ?.addEventListener(
            "change",
            updateReports
        );


    $("#reportYear")
        ?.addEventListener(
            "change",
            updateReports
        );


    /* DELEÇÕES */

    document.addEventListener(
        "click",
        event => {

            const saleButton =
                event.target.closest(
                    "[data-delete-sale]"
                );


            if (saleButton) {

                deleteSale(
                    saleButton.dataset
                        .deleteSale
                );

                return;

            }


            const expenseButton =
                event.target.closest(
                    "[data-delete-expense]"
                );


            if (expenseButton) {

                deleteExpense(
                    expenseButton.dataset
                        .deleteExpense
                );

                return;

            }


            const productButton =
                event.target.closest(
                    "[data-delete-product]"
                );


            if (productButton) {

                deleteProduct(
                    productButton.dataset
                        .deleteProduct
                );

            }

        }
    );


    /* ESC FECHA MODAL */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                $$(".modal-overlay")
                    .forEach(
                        modal =>
                            modal.classList
                                .remove(
                                    "active"
                                )
                    );

            }

        }
    );

}


/* =========================================================
   TEMA
========================================================= */

function toggleTheme() {

    document.body.classList.toggle(
        "dark"
    );


    const isDark =
        document.body.classList
            .contains("dark");


    localStorage.setItem(
        "voRitaTheme",
        isDark
            ? "dark"
            : "light"
    );


    updateThemeIcon();

}


function loadTheme() {

    const theme =
        localStorage.getItem(
            "voRitaTheme"
        );


    if (theme === "dark") {

        document.body.classList.add(
            "dark"
        );

    }


    updateThemeIcon();

}


function updateThemeIcon() {

    const button =
        $("#themeButton");


    if (!button)
        return;


    const icon =
        button.querySelector(
            "i"
        );


    if (!icon)
        return;


    const dark =
        document.body.classList
            .contains("dark");


    icon.className =
        dark
            ? "fa-solid fa-sun"
            : "fa-solid fa-moon";

}


/* =========================================================
   DATAS PADRÃO
========================================================= */

function setDefaultDates() {

    const today =
        todayISO();


    const saleDate =
        $("#saleDate");

    const expenseDate =
        $("#expenseDate");


    if (saleDate) {

        saleDate.value =
            today;

    }


    if (expenseDate) {

        expenseDate.value =
            today;

    }

}


/* =========================================================
   REFRESH GERAL
========================================================= */

function refreshAll() {

    updateDashboard();

    renderSales(
        $("#salesSearch")?.value || ""
    );

    renderExpenses(
        $("#expenseSearch")?.value || ""
    );

    renderProducts();

    if (
        currentPage ===
        "relatorios"
    ) {

        updateReports();

    } else {

        renderGeneralReports();

    }

}


/* =========================================================
   ID
========================================================= */

function createId() {

    return (
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );

}


/* =========================================================
   CAPITALIZE
========================================================= */

function capitalize(
    text
) {

    if (!text)
        return "";

    return (
        text.charAt(0)
            .toUpperCase() +
        text.slice(1)
    );

}


/* =========================================================
   SEGURANÇA HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {

    updateToday();

    loadTheme();

    populateReportSelectors();

    setDefaultDates();

    setupEvents();

    refreshAll();


    /*
       Primeiro mostramos os dados locais.
       Depois tentamos sincronizar com a planilha.
    */

    await loadFromGoogleSheets();

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);