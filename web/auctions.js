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

const operationErrors = new Map([
  ["Auction duration must be at least one hour", "Elige un cierre al menos una hora después de la publicación."],
  ["Auction duration cannot exceed thirty days", "Elige un cierre dentro de los próximos 30 días."],
  ["Auction closing date must be after publication date", "La fecha de cierre debe ser posterior a la publicación."],
  ["Auction closing date must be in the future", "Elige una fecha de cierre futura."],
  ["Bids are only allowed on open auctions", "La subasta ya no está abierta."],
  ["Bids are not allowed after the auction closing date", "El plazo para ofertar terminó."],
  ["Seller cannot bid on own auction", "No puedes ofertar en tu propia subasta."],
  ["First bid must be greater than or equal to base price", "La primera oferta debe alcanzar el precio base."],
  ["Highest bidder cannot outbid own leading bid", "Tu oferta ya es la más alta."],
  ["Bid must be greater than or equal to current highest bid plus minimum increment", "La oferta debe cubrir la oferta vigente más el incremento mínimo."],
]);

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

function auctionPhoto(auction) {
  const image = document.createElement("img");
  image.className = "auction-photo";
  image.alt = `Foto de ${auction.itemId}`;
  image.hidden = true;
  image.addEventListener("load", () => { image.hidden = false; }, { once: true });
  image.addEventListener("error", () => image.remove(), { once: true });
  image.src = `/auctions/${encodeURIComponent(auction.id)}/photo`;
  return image;
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result), { once: true });
    reader.addEventListener("error", () => reject(reader.error), { once: true });
    reader.readAsDataURL(file);
  });
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
  const publication = document.querySelector("#auction-publication");
  const publicationForm = document.querySelector("#publication-form");
  const photoInput = document.querySelector("#auction-photo");
  const photoPreview = document.querySelector("#photo-preview");
  const bidForm = document.querySelector("#bid-form");
  const backToProfile = document.querySelector("#back-to-profile");
  const backToList = document.querySelector("#back-to-auctions");
  const cancelPublication = document.querySelector("#cancel-publication");
  let active;
  let page = 1;
  let currentAuction;
  let sessionToken;
  let userId;
  let submitting = false;
  let previewUrl;

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
    photoPreview.hidden = true;
    photoPreview.removeAttribute("src");
  }

  photoInput.addEventListener("change", () => {
    clearPreview();
    message.textContent = "";
    const file = photoInput.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)
      || file.size === 0 || file.size > 2 * 1024 * 1024) {
      photoInput.value = "";
      message.textContent = "Selecciona una foto JPEG, PNG o WebP de hasta 2 MB.";
      return;
    }
    previewUrl = URL.createObjectURL(file);
    photoPreview.src = previewUrl;
    photoPreview.hidden = false;
  });

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

  function renderDetail(auction) {
    currentAuction = auction;
    document.querySelector("#auction-detail-heading").textContent = auction.itemId;
    const history = document.createElement("ol");
    for (const bid of [...auction.bids].reverse()) {
      history.append(element("li", `${money.format(bid.amount)} · ${date.format(new Date(bid.placedAt))}`));
    }
    detailContent.replaceChildren(
      auctionPhoto(auction),
      element("p", `${states[auction.status] ?? auction.status} · Categoría: ${auction.categoryId}`),
      element("p", amount(auction)),
      element("p", `Incremento mínimo: ${money.format(auction.minimumIncrement)}`),
      element("p", `Cierre: ${date.format(new Date(auction.closesAt))}`),
      element("h2", "Historial de pujas"),
      auction.bids.length ? history : element("p", "Todavía no hay pujas."),
    );
    const minimum = auction.currentBidAmount === null
      ? auction.basePrice
      : auction.currentBidAmount + auction.minimumIncrement;
    document.querySelector("#bid-minimum").textContent = `Próxima oferta mínima: ${money.format(minimum)}`;
    bidForm.hidden = auction.status !== "OPEN" || auction.sellerId === userId;
  }

  function openDetail() {
    listing.hidden = true;
    publication.hidden = true;
    detail.hidden = false;
    bidForm.reset();
  }

  function showDetail(id, token) {
    openDetail();
    const heading = document.querySelector("#auction-detail-heading");
    heading.textContent = "Detalle de subasta";
    heading.focus();
    detailContent.replaceChildren();
    bidForm.hidden = true;
    currentAuction = undefined;
    return load(`/auctions/${encodeURIComponent(id)}`, renderDetail,
      "No pudimos cargar el detalle. Vuelve al listado e inténtalo otra vez.", token);
  }

  function showList(token, focus = false) {
    view.hidden = false;
    detail.hidden = true;
    publication.hidden = true;
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
          auctionPhoto(auction),
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

  async function submitOperation(form, path, body, onSuccess, fallback) {
    const controls = [form.querySelector('button[type="submit"]'), backToProfile, backToList, cancelPublication];
    submitting = true;
    controls.forEach((control) => { control.disabled = true; });
    message.textContent = "Enviando…";
    try {
      const result = await request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify(await (typeof body === "function" ? body() : body)),
      });
      onSuccess(result);
    } catch (error) {
      if (error.statusCode === 401) {
        onExpired();
      } else if (error.details?.code === "INVALID_PHOTO") {
        message.textContent = "La foto debe ser un archivo JPEG, PNG o WebP válido.";
      } else if (error.statusCode === 413) {
        message.textContent = "La foto supera el límite de 2 MB.";
      } else if (error.statusCode === 409) {
        message.textContent = "La subasta cambió. Vuelve al listado y abre el detalle antes de reintentar.";
      } else {
        message.textContent = operationErrors.get(error.details?.message) ?? fallback;
      }
    } finally {
      controls.forEach((control) => { control.disabled = false; });
      submitting = false;
    }
  }

  document.querySelector("#open-publication").addEventListener("click", () => {
    active?.abort();
    listing.hidden = true;
    publication.hidden = false;
    message.textContent = "";
    document.querySelector("#publication-heading").focus();
  });
  cancelPublication.addEventListener("click", () => {
    publicationForm.reset();
    clearPreview();
    showList(sessionToken, true);
  });

  publicationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting) return;
    const fields = new FormData(publicationForm);
    const itemId = fields.get("itemId").trim();
    const categoryId = fields.get("categoryId").trim();
    const basePrice = Number(fields.get("basePrice"));
    const minimumIncrement = Number(fields.get("minimumIncrement"));
    const closesAt = new Date(fields.get("closesAt"));
    if (!itemId || !categoryId || !Number.isSafeInteger(basePrice)
      || !Number.isSafeInteger(minimumIncrement) || !Number.isFinite(closesAt.getTime())) {
      message.textContent = "Revisa el artículo, la categoría, los valores en pesos y la fecha de cierre.";
      return;
    }

    const file = photoInput.files[0];
    submitOperation(publicationForm, "/auctions", async () => ({
      auctionId: crypto.randomUUID(),
      itemId,
      categoryId,
      basePrice,
      minimumIncrement,
      publishedAt: new Date().toISOString(),
      closesAt: closesAt.toISOString(),
      ...(file && { photo: await readPhoto(file) }),
    }), (auction) => {
      publicationForm.reset();
      clearPreview();
      filters.reset();
      page = 1;
      openDetail();
      renderDetail(auction);
      message.textContent = "Subasta publicada.";
      document.querySelector("#auction-detail-heading").focus();
    }, "No pudimos publicar la subasta. Revisa los datos o vuelve a intentarlo.");
  });

  bidForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting || !currentAuction || bidForm.hidden) return;
    const bidAmount = Number(new FormData(bidForm).get("amount"));
    if (!Number.isSafeInteger(bidAmount) || bidAmount < 1) {
      message.textContent = "Ingresa un monto válido en pesos enteros.";
      return;
    }
    submitOperation(bidForm, `/auctions/${encodeURIComponent(currentAuction.id)}/bids`, {
      bidId: crypto.randomUUID(),
      rejectedBidAttemptId: crypto.randomUUID(),
      amount: bidAmount,
    }, (auction) => {
      renderDetail(auction);
      bidForm.reset();
      message.textContent = "Oferta aceptada.";
    }, "No pudimos registrar la oferta. Vuelve a intentarlo.");
  });

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
    open(token, authenticatedUserId) {
      sessionToken = token;
      userId = authenticatedUserId;
      return showList(token, true);
    },
    close() {
      active?.abort();
      view.hidden = true;
      sessionToken = undefined;
      userId = undefined;
      currentAuction = undefined;
      page = 1;
      filters.reset();
      publicationForm.reset();
      clearPreview();
      bidForm.reset();
    },
  };
}
