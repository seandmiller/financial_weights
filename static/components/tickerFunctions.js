function fetchTopMovers() {
  fetch("/top_movers")
    .then((response) => response.json())
    .then((data) => {
      updateTickerTape(data);
    })
    .catch((error) => {
      console.error("Error fetching top movers:", error);
    });
}

function updateTickerTape(movers) {
  const tickerContent = document.getElementById("ticker-content");
  tickerContent.innerHTML = "";

  movers.forEach((mover) => {
    const item = document.createElement("span");
    item.classList.add("ticker-item");

    const changeClass = mover.change >= 0 ? "positive" : "negative";
    item.classList.add(changeClass);

    item.textContent = `${mover.symbol}: $${mover.price.toFixed(2)} ${
      mover.change >= 0 ? "▲" : "▼"
    }${Math.abs(mover.change).toFixed(2)} (${mover.percentChange.toFixed(2)}%)`;

    tickerContent.appendChild(item);
  });
}

window.fetchTopMovers;
window.updateTickerTape;
