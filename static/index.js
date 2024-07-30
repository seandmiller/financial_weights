document.addEventListener("DOMContentLoaded", function () {
  const stockForm = document.getElementById("stockForm");
  const financialInfo = document.getElementById("financialInfo");
  const priceChartCanvas = document.getElementById("priceChart");
  const financialChartCanvas = document.getElementById("financialChart");
  const marginChartCanvas = document.getElementById("marginChart");
  const balanceSheetChartCanvas = document.getElementById("balanceSheetChart");

  fetchTopMovers();
  setInterval(fetchTopMovers, 7000);

  if (
    !stockForm ||
    !financialInfo ||
    !priceChartCanvas ||
    !financialChartCanvas ||
    !marginChartCanvas ||
    !balanceSheetChartCanvas
  ) {
    console.error("One or more required elements are missing from the DOM");
    return;
  }

  stockForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const ticker = document.getElementById("tickerSymbol").value;
    currentTicker = ticker;
    fetchFinancialData(ticker);
    fetchStockPriceData(ticker, currentTimeRange);
  });

  document.querySelectorAll(".time-range-buttons button").forEach((button) => {
    button.addEventListener("click", function () {
      const timeRange = this.getAttribute("data-range");
      currentTimeRange = timeRange;
      if (currentTicker) {
        fetchStockPriceData(currentTicker, timeRange);
      }
    });
  });
});

function fetchStockPriceData(ticker, timeRange) {
  fetch(`/stock/${ticker}/price/${timeRange}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      } else if (!data.priceData || data.priceData.length === 0) {
        throw new Error("No price data available");
      } else {
        resetChart();
        updatePriceChart(data.priceData, timeRange, ticker);
        updateCurrentPrice(data.currentPrice);
        stockName = data.companyName;
        initializeWebSocket(ticker);
      }
    })
    .catch((error) => {
      handleFetchError(error);
    });
}

function fetchFinancialData(ticker) {
  fetch(`/stock/${ticker}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      } else {
        updateFinancialInfo(data);
      }
    })
    .catch((error) => {
      handleFetchError(error);
    });
}

function updateFinancialInfo(data) {
  stockName = data.companyName;
  document.getElementById("companyName").textContent = stockName;
  document.getElementById("stockPrice").textContent =
    data.stockPrice !== "N/A"
      ? "$" + parseFloat(data.stockPrice).toFixed(2)
      : "N/A";
  document.getElementById("peRatio").textContent =
    data.peRatio !== "N/A" ? parseFloat(data.peRatio).toFixed(2) : "N/A";
  document.getElementById("financialInfo").style.display = "block";

  if (data.marginData && data.marginData.length > 0) {
    updateMarginChart(data.marginData);
  }
  if (data.balanceSheetData && data.balanceSheetData.length > 0) {
    updateBalanceSheetChart(data.balanceSheetData);
  }
  if (data.quarterlyData && data.quarterlyData.length > 0) {
    updateFinancialChart(data.quarterlyData);
  }
}

function updateCurrentPrice(price) {
  document.getElementById("stockPrice").textContent =
    price !== "N/A" ? "$" + parseFloat(price).toFixed(2) : "N/A";
}

function handleFetchError(error) {
  document.getElementById("financialInfo").style.display = "none";
  if (!error.message) {
    alert(
      "The stock you are searching for could not be found, remember to type in the company's Ticker symbol"
    );
  } else {
    alert(`An error occurred while fetching the data: ${error.message}`);
  }
}
