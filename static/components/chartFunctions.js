let socket;
let lastPrice;
let lastUpdateTime;
let priceBuffer = [];

let currentTicker = null;

function initializeWebSocket(ticker) {
  if (socket) {
    socket.disconnect();
  }

  socket = io();

  socket.on("connect", () => {
    console.log("Connected to WebSocket");
    if (currentTicker !== ticker) {
      currentTicker = ticker;
      resetChart();
      socket.emit("start_stream", { ticker: ticker });
    }
  });

  socket.on("price_update", (data) => {
    updateChartWithNewData(data);
  });
}
function resetChart() {
  if (window.priceChart) {
    window.priceChart.data.labels = [];
    window.priceChart.data.datasets[0].data = [];
    window.priceChart.update();
  }
}

function updateChartFromBuffer() {
  if (priceBuffer.length === 0) return;

  const latestData = priceBuffer[priceBuffer.length - 1];
  updateChartWithNewData(latestData);
  priceBuffer = [];
}

function updateChartWithNewData(newData) {
  console.log("Received new data:", newData);
  if (
    !window.priceChart ||
    window.priceChart.data.datasets[0].data.length === 0
  )
    return;

  const newDate = new Date(newData.timestamp);
  let newPrice = parseFloat(newData.price);

  if (isNaN(newPrice)) {
    console.error("Invalid price data:", newData);
    return;
  }

  lastValidPrice = newPrice;

  const dataset = window.priceChart.data.datasets[0];
  const lastDataPoint = dataset.data[dataset.data.length - 1];

  if (newDate > lastDataPoint.x) {
    dataset.data.push({ x: newDate, y: newPrice });

    if (dataset.data.length > 390) {
      dataset.data.shift();
    }

    const firstDate = dataset.data[0].x;
    window.priceChart.options.scales.x.min = firstDate;
    window.priceChart.options.scales.x.max = newDate;

    const prices = dataset.data.map((d) => d.y);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.2;
    window.priceChart.options.scales.y.min = minPrice - padding;
    window.priceChart.options.scales.y.max = maxPrice + padding;

    window.priceChart.update("none");
  }

  updateCurrentPrice(newPrice);
  lastPrice = newPrice;
  lastUpdateTime = newData.timestamp;
}

function updatePriceChart(priceData, timeRange, ticker) {
  const ctx = document.getElementById("priceChart");
  if (!ctx) {
    console.error("Price chart canvas not found");
    return;
  }
  if (window.priceChart instanceof Chart) {
    window.priceChart.destroy();
  }

  let timeUnit, tooltipFormat;
  switch (timeRange) {
    case "day":
      timeUnit = "hour";
      tooltipFormat = "HH:mm";
      break;
    case "month":
      timeUnit = "day";
      tooltipFormat = "MMM d";
      break;
    case "year":
    case "ytd":
      timeUnit = "month";
      tooltipFormat = "MMM yyyy";
      break;
    default:
      timeUnit = "day";
      tooltipFormat = "MMM d, yyyy";
  }

  const chartData = priceData
    .map((d) => ({
      x: new Date(d.date),
      y: parseFloat(d.price),
    }))
    .filter((d) => !isNaN(d.y));
  if (chartData.length === 0) {
    console.warn("No valid price data available");

    return;
  }

  const lastDate = chartData[chartData.length - 1].x;
  const firstDate = chartData[0].x;

  window.priceChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: stockName,
          data: chartData,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: {
            unit: timeUnit,
            tooltipFormat: tooltipFormat,
          },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10,
            color: "white",
          },
          min: firstDate,
          max: lastDate,
        },
        y: {
          ticks: {
            color: "white",
          },
          beginAtZero: false,
          title: {
            display: true,
            text: "Price ($)",
            color: "white",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      animation: {
        duration: 0,
      },
    },
  });

  lastPrice = chartData[chartData.length - 1].y;
  lastUpdateTime = chartData[chartData.length - 1].x;
  initializeWebSocket(ticker);
}

function updateMarginChart(marginData) {
  const ctx = document.getElementById("marginChart");

  if (!ctx) {
    console.error("Margin chart canvas not found");
    return;
  }

  if (marginChart instanceof Chart) {
    marginChart.destroy();
  }

  marginChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: marginData.map((q) => q.date),
      datasets: [
        {
          label: "Gross Margin",
          data: marginData.map((q) => q.grossMargin),
          borderColor: "rgba(75, 192, 192, 1)",
          fill: false,
        },
        {
          label: "Operating Margin",
          data: marginData.map((q) => q.operatingMargin),
          borderColor: "rgba(255, 159, 64, 1)",
          fill: false,
        },
        {
          label: "Net Income Margin",
          data: marginData.map((q) => q.netIncomeMargin),
          borderColor: "rgba(153, 102, 255, 1)",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: {
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Percentage (%)",
            color: "white",
          },
          ticks: {
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "white",
          },
        },
      },
    },
  });
}

function updateBalanceSheetChart(balanceSheetData) {
  const ctx = document.getElementById("balanceSheetChart");

  if (!ctx) {
    console.error("Balance sheet chart canvas not found");
    return;
  }

  if (balanceSheetChart instanceof Chart) {
    balanceSheetChart.destroy();
  }

  balanceSheetChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: balanceSheetData.map((q) => q.date),
      datasets: [
        {
          label: "Current Assets",
          data: balanceSheetData.map((q) => q.currentAssets),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
        {
          label: "Current Liabilities",
          data: balanceSheetData.map((q) => q.currentLiabilities),
          backgroundColor: "rgba(255, 99, 132, 0.6)",
        },
        {
          label: "Long Term Assets",
          data: balanceSheetData.map((q) => q.longTermAssets),
          backgroundColor: "rgba(54, 162, 235, 0.6)",
        },
        {
          label: "Long Term Liabilities",
          data: balanceSheetData.map((q) => q.longTermLiabilities),
          backgroundColor: "rgba(255, 206, 86, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: {
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Amount ($)",
            color: "white",
          },
          ticks: {
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "white",
          },
        },
      },
    },
  });
}
function updateFinancialChart(quarterlyData) {
  const ctx = document.getElementById("financialChart");

  if (!ctx) {
    console.error("Financial chart canvas not found");
    return;
  }

  if (financialChart instanceof Chart) {
    financialChart.destroy();
  }

  financialChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: quarterlyData.map((q) => q.date),
      datasets: [
        {
          label: "Revenue",
          data: quarterlyData.map((q) => q.revenue),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
        {
          label: "Operating Income",
          data: quarterlyData.map((q) => q.operatingIncome),
          backgroundColor: "rgba(255, 159, 64, 0.6)",
        },
        {
          label: "Net Income",
          data: quarterlyData.map((q) => q.netIncome),
          backgroundColor: "rgba(153, 102, 255, 0.6)",
        },
        {
          label: "Operating Cash Flow",
          data: quarterlyData.map((q) => q.operatingCashFlow),
          backgroundColor: "rgba(255, 205, 86, 0.6)",
        },
        {
          label: "Free Cash Flow",
          data: quarterlyData.map((q) => q.freeCashFlow),
          backgroundColor: "rgba(54, 162, 235, 0.6)",
        },
        {
          label: "Cash Balance",
          data: quarterlyData.map((q) => q.cashBalance),
          backgroundColor: "rgba(0, 255, 0, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: {
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Amount ($)",
            color: "white",
          },
          ticks: {
            color: "white",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "white",
          },
        },
      },
    },
  });
}

window.updatePriceChart = updatePriceChart;
window.updateMarginChart = updateMarginChart;
window.updateBalanceSheetChart = updateBalanceSheetChart;
window.updateFinancialChart = updateFinancialChart;

window.initializeWebSocket = initializeWebSocket;
window.resetChart = resetChart;
window.priceChart = null;
window.marginChart = null;
window.balanceSheetChart = null;
window.financialChart = null;
window.currentTicker = null;
window.currentTimeRange = "month";
window.stockName = null;
