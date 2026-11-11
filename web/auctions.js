const states = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
  DESERTED: "Desierta",
  DEFAULTED: "Incumplida",
};
const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  currencyDisplay: "code",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function amount(auction) {
  return auction.currentBidAmount === null
    ? `Precio base: ${money.format(auction.basePrice)}`
    : `Oferta vigente: ${money.format(auction.currentBidAmount)}`;
}

export function setupAuctions(request, onExpired) {
  const view = document.querySelector("#auctions");
  const listing = document.querySelector("#auction-list");
  const detail = document.querySelector("#auction-detail");
  const filters = document.querySelector("#auction-filters");
  const cards = document.querySelector("#auction-cards");
  const pagination = document.querySelector("#auction-pagination");
  const previous = document.querySelector("#previous-page");
  const next = document.querySelector("#next-page");
  const message = document.querySelector("#auction-status");
  const detailContent = document.querySelector("#auction-detail-content");
  let active;
  let page = 1;

  async function load(path, render, fallback, token) {
    active?.abort();
    const controller = new AbortController();
    active = controller;
    message.textContent = "Cargando…";
    try {
      const data = await request(path, {
        signal: controller.signal,
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      });
      if (controller.signal.aborted) return;
      render(data);
      message.textContent = "";
    } catch (error) {
      if (controller.signal.aborted) return;
      if (token && error.statusCode === 401) {
        onExpired();
        return;
      }
      message.textContent = error.statusCode === 404 ? "Esta subasta ya no está disponible." : fallback;
    }
  }

  function showDetail(id, token) {
    listing.hidden = true;
    detail.hidden = false;
    const heading = document.querySelector("#auction-detail-heading");
    heading.textContent = "Detalle de subasta";
    heading.focus();
    detailContent.replaceChildren();

    return load(`/auctions/${encodeURIComponent(id)}`, (auction) => {
      heading.textContent = auction.itemId;
      const history = document.createElement("ol");
      for (const bid of [...auction.bids].reverse()) {
        history.append(element("li", `${money.format(bid.amount)} · ${date.format(new Date(bid.placedAt))}`));
      }
      detailContent.append(
        element("p", `${states[auction.status] ?? auction.status} · Categoría: ${auction.categoryId}`),
        element("p", amount(auction)),
        element("p", `Incremento mínimo: ${money.format(auction.minimumIncrement)}`),
        element("p", `Cierre: ${date.format(new Date(auction.closesAt))}`),
        element("h2", "Historial de pujas"),
        auction.bids.length ? history : element("p", "Todavía no hay pujas."),
      );
    }, "No pudimos cargar el detalle. Vuelve al listado e inténtalo otra vez.", token);
  }

  function showList(token, focus = false) {
    view.hidden = false;
    detail.hidden = true;
    listing.hidden = false;
    cards.replaceChildren();
    pagination.hidden = true;
    if (focus) document.querySelector("#auctions-heading").focus();

    const query = new URLSearchParams({ page });
    for (const [key, value] of new FormData(filters)) {
      if (value.trim()) query.set(key, value.trim());
    }

    return load(`/auctions?${query}`, (result) => {
      const { items, pagination: info } = result;
      if (!items.length) {
        cards.append(element("li", "No se encontraron subastas."));
      }
      for (const auction of items) {
        const card = element("li", "");
        card.className = "auction-card";
        const open = element("button", "Ver detalle");
        open.type = "button";
        open.setAttribute("aria-label", `Ver detalle de ${auction.itemId}`);
        open.addEventListener("click", () => showDetail(auction.id, token));
        card.append(
          element("h2", auction.itemId),
          element("p", `${states[auction.status] ?? auction.status} · Categoría: ${auction.categoryId}`),
          element("p", amount(auction)),
          open,
        );
        cards.append(card);
      }
      previous.disabled = info.page <= 1;
      next.disabled = info.page >= info.totalPages;
      document.querySelector("#auction-page").textContent = `Página ${info.page} de ${info.totalPages}`;
      pagination.hidden = info.totalPages <= 1 && info.page <= 1;
    }, "No pudimos cargar las subastas. Usa Buscar para reintentar.");
  }

  let sessionToken;
  filters.addEventListener("submit", (event) => {
    event.preventDefault();
    page = 1;
    showList(sessionToken);
  });
  previous.addEventListener("click", () => {
    page -= 1;
    showList(sessionToken, true);
  });
  next.addEventListener("click", () => {
    page += 1;
    showList(sessionToken, true);
  });
  document.querySelector("#back-to-auctions").addEventListener("click", () => showList(sessionToken, true));

  return {
    open(token) {
      sessionToken = token;
      return showList(token, true);
    },
    close() {
      active?.abort();
      view.hidden = true;
      sessionToken = undefined;
      page = 1;
      filters.reset();
    },
  };
}
