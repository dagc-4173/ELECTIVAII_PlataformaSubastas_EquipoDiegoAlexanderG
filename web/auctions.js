import { connectAuction } from "./auction-realtime.js";

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
const paymentStates = { PENDING: "Pendiente", CONFIRMED: "Confirmada", EXPIRED: "Vencida" };
const sellerPaymentLabels = { PENDING: "Pago pendiente", CONFIRMED: "Pago confirmado", EXPIRED: "Pago vencido" };

const operationErrors = new Map([
  ["Only the auction seller can cancel the auction", "Solo el vendedor puede cancelar la subasta."],
  ["Only open auctions can be cancelled", "La subasta ya no está abierta para cancelación."],
  ["Auction with bids cannot be cancelled", "La subasta ya recibió una puja y no se puede cancelar."],
  ["Only the auction seller can edit the publication", "Solo el vendedor puede editar la publicación."],
  ["Only open auctions can be edited", "La subasta ya no está abierta para edición."],
  ["Auction with bids cannot be edited", "La subasta ya recibió una puja y no se puede editar."],
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

const bidAmountErrors = new Set([
  "First bid must be greater than or equal to base price",
  "Bid must be greater than or equal to current highest bid plus minimum increment",
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
  const activity = document.querySelector("#auction-activity");
  const detail = document.querySelector("#auction-detail");
  const filters = document.querySelector("#auction-filters");
  const cards = document.querySelector("#auction-cards");
  const pagination = document.querySelector("#auction-pagination");
  const previous = document.querySelector("#previous-page");
  const next = document.querySelector("#next-page");
  const message = document.querySelector("#auction-status");
  const detailContent = document.querySelector("#auction-detail-content");
  const connection = document.querySelector("#auction-connection");
  const participants = document.querySelector("#auction-participants");
  const liveNotice = document.querySelector("#auction-live-notice");
  const payment = document.querySelector("#payment-order");
  const sellerPayment = document.querySelector("#seller-payment");
  const sellerPaymentStatus = document.querySelector("#seller-payment-status");
  const paymentSummary = document.querySelector("#payment-summary");
  const paymentFeedback = document.querySelector("#payment-feedback");
  const refreshPayment = document.querySelector("#refresh-payment");
  const publication = document.querySelector("#auction-publication");
  const publicationForm = document.querySelector("#publication-form");
  const publicationTerms = document.querySelector("#publication-terms");
  const publicationHeading = document.querySelector("#publication-heading");
  const editPublication = document.querySelector("#edit-publication");
  const cancelAuction = document.querySelector("#cancel-auction");
  const photoInput = document.querySelector("#auction-photo");
  const photoPreview = document.querySelector("#photo-preview");
  const bidForm = document.querySelector("#bid-form");
  const bidInput = document.querySelector("#bid-amount");
  const bidFeedback = document.querySelector("#bid-feedback");
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
  let editing = false;
  let activityKind;
  let stopLive;
  let paymentRequest;
  let paymentAuctionId;

  function clearPayment() {
    paymentRequest?.abort();
    paymentAuctionId = undefined;
    payment.hidden = true;
    paymentSummary.replaceChildren();
    paymentFeedback.textContent = "";
  }

  async function loadPayment() {
    paymentRequest?.abort();
    const controller = new AbortController();
    paymentRequest = controller;
    refreshPayment.disabled = true;
    paymentFeedback.textContent = "Consultando la orden…";
    try {
      const order = await request(`/auctions/${encodeURIComponent(paymentAuctionId)}/payment-order`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (controller.signal.aborted) return;
      const fields = document.createElement("dl");
      for (const [label, value] of [
        ["Estado", paymentStates[order.status] ?? order.status],
        ["Monto", money.format(order.amount)],
        ["Fecha límite", date.format(new Date(order.dueAt))],
        ["Identificador", order.id],
      ]) {
        fields.append(element("dt", label), element("dd", value));
      }
      paymentSummary.replaceChildren(fields);
      paymentFeedback.textContent = "Estado del pago actualizado.";
      if (order.status === "EXPIRED" && currentAuction.status === "CLOSED") {
        renderDetail({ ...currentAuction, status: "DEFAULTED" }, true);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.statusCode === 401) onExpired();
      else if (error.statusCode === 403) clearPayment();
      else paymentFeedback.textContent = "No pudimos consultar la orden. Intenta actualizar su estado.";
    } finally {
      if (!controller.signal.aborted) refreshPayment.disabled = false;
    }
  }

  refreshPayment.addEventListener("click", loadPayment);

  function leaveLiveDetail() {
    stopLive?.();
    stopLive = undefined;
    connection.hidden = true;
    participants.hidden = true;
    liveNotice.hidden = true;
  }

  function startLiveDetail(id, token) {
    leaveLiveDetail();
    let sync;
    let closingTimer;
    connection.hidden = false;

    function scheduleCloseCheck() {
      clearTimeout(closingTimer);
      if (currentAuction.status !== "OPEN") return;
      const remaining = Date.parse(currentAuction.closesAt) - Date.now();
      closingTimer = setTimeout(refresh, Math.min(2_147_483_647, Math.max(1000, remaining + 200)));
    }

    async function refresh(refreshOrder = false) {
      sync?.abort();
      const controller = new AbortController();
      sync = controller;
      try {
        const auction = await request(`/auctions/${encodeURIComponent(id)}`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!controller.signal.aborted) {
          const hadOrder = paymentAuctionId === id;
          renderDetail(auction, true);
          if (refreshOrder && hadOrder) void loadPayment();
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.statusCode === 401) {
          onExpired();
          return;
        }
      }
      if (!controller.signal.aborted) scheduleCloseCheck();
    }

    const disconnect = connectAuction(id, token, {
      onExpired,
      onConnection(connected) {
        connection.textContent = connected ? "En vivo" : "Conectando actualizaciones…";
        if (!connected) participants.hidden = true;
      },
      onMessage({ type, count }) {
        if (type === "PARTICIPANT_COUNT" && Number.isInteger(count)) {
          participants.textContent = count === 1 ? "1 participante conectado" : `${count} participantes conectados`;
          participants.hidden = false;
        }
        if (type === "BID_OUTBID") {
          liveNotice.textContent = "Otro postor superó tu oferta.";
          liveNotice.hidden = false;
        }
        if (["SUBSCRIBED", "BID_ACCEPTED", "AUCTION_CLOSED", "BID_OUTBID", "PAYMENT_UPDATED"].includes(type)) {
          void refresh(type === "PAYMENT_UPDATED" || type === "SUBSCRIBED");
        }
      },
    });
    scheduleCloseCheck();
    stopLive = () => {
      disconnect();
      sync?.abort();
      clearTimeout(closingTimer);
    };
  }

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

  function renderDetail(auction, fromLive = false) {
    if (currentAuction?.id === auction.id && (
      auction.bids.length < currentAuction.bids.length ||
      (currentAuction.status !== "OPEN" && auction.status === "OPEN")
    )) return;
    const photo = fromLive && currentAuction?.itemId === auction.itemId
      ? detailContent.querySelector("img")
      : null;
    currentAuction = auction;
    document.querySelector("#auction-detail-heading").textContent = auction.itemId;
    const history = document.createElement("ol");
    for (const bid of [...auction.bids].reverse()) {
      history.append(element("li", `${money.format(bid.amount)} · ${date.format(new Date(bid.placedAt))}`));
    }
    detailContent.replaceChildren(
      photo ?? auctionPhoto(auction),
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
    bidInput.min = String(minimum);
    bidInput.step = String(auction.minimumIncrement);
    document.querySelector("#bid-minimum").textContent = `Próxima oferta mínima: ${money.format(minimum)}`;
    const leading = auction.status === "OPEN" && auction.bids.at(-1)?.bidderId === userId;
    if (leading) {
      detailContent.append(element("p", "Tu cuenta tiene la oferta más alta. Podrás volver a ofertar cuando otro postor la supere."));
    }
    bidForm.hidden = auction.status !== "OPEN" || auction.sellerId === userId || leading;
    editPublication.hidden = auction.sellerId !== userId || auction.status !== "OPEN"
      || auction.bids.length > 0 || Date.parse(auction.closesAt) <= Date.now();
    cancelAuction.hidden = editPublication.hidden;
    const sellerStatus = sellerPaymentLabels[auction.sellerPaymentStatus];
    if (sellerPaymentStatus.textContent !== (sellerStatus ?? "")) {
      sellerPaymentStatus.textContent = sellerStatus ?? "";
    }
    sellerPayment.hidden = !sellerStatus;
    if ((auction.status === "CLOSED" || auction.status === "DEFAULTED")
      && auction.bids.at(-1)?.bidderId === userId && paymentAuctionId !== auction.id) {
      paymentAuctionId = auction.id;
      payment.hidden = false;
      void loadPayment();
    }
  }

  function openDetail() {
    clearPayment();
    sellerPayment.hidden = true;
    listing.hidden = true;
    activity.hidden = true;
    publication.hidden = true;
    detail.hidden = false;
    bidForm.reset();
    clearBidFeedback();
  }

  function clearBidFeedback() {
    bidFeedback.textContent = "";
    bidInput.removeAttribute("aria-invalid");
  }

  function showBidError(text, invalidAmount = false) {
    bidFeedback.textContent = text;
    if (invalidAmount && !bidForm.hidden) {
      bidInput.setAttribute("aria-invalid", "true");
      bidInput.focus();
    }
  }

  bidInput.addEventListener("input", clearBidFeedback);

  function showDetail(id, token) {
    leaveLiveDetail();
    openDetail();
    backToList.textContent = activityKind === "published" ? "Volver a mis subastas"
      : activityKind === "participated" ? "Volver a mis pujas" : "Volver a subastas";
    const heading = document.querySelector("#auction-detail-heading");
    heading.textContent = "Detalle de subasta";
    heading.focus();
    detailContent.replaceChildren();
    bidForm.hidden = true;
    editPublication.hidden = true;
    cancelAuction.hidden = true;
    currentAuction = undefined;
    return load(`/auctions/${encodeURIComponent(id)}`, (auction) => {
      renderDetail(auction);
      startLiveDetail(id, token);
    },
      "No pudimos cargar el detalle. Vuelve al listado e inténtalo otra vez.", token);
  }

  function showList(token, focus = false) {
    clearPayment();
    leaveLiveDetail();
    view.hidden = false;
    activity.hidden = true;
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
      for (const auction of items) cards.append(makeCard(auction, token));
      previous.disabled = info.page <= 1;
      next.disabled = info.page >= info.totalPages;
      document.querySelector("#auction-page").textContent = `Página ${info.page} de ${info.totalPages}`;
      pagination.hidden = info.totalPages <= 1 && info.page <= 1;
    }, "No pudimos cargar las subastas. Usa Buscar para reintentar.");
  }

  function makeCard(auction, token, note) {
    const card = element("li", "");
    card.className = "auction-card";
    const badge = element("span", states[auction.status] ?? auction.status);
    badge.className = "auction-state";
    badge.dataset.state = auction.status;
    const open = element("button", "Ver detalle");
    open.type = "button";
    open.setAttribute("aria-label", `Ver detalle de ${auction.itemId}`);
    open.addEventListener("click", () => showDetail(auction.id, token));
    card.append(
      badge,
      auctionPhoto(auction),
      element("h2", auction.itemId),
      element("p", `Categoría: ${auction.categoryId}`),
      element("p", amount(auction)),
    );
    if (note) card.append(element("p", note));
    card.append(open);
    return card;
  }

  function showActivity() {
    clearPayment();
    leaveLiveDetail();
    view.hidden = false;
    listing.hidden = true;
    detail.hidden = true;
    activity.hidden = false;
    const heading = document.querySelector("#activity-heading");
    const activityCards = document.querySelector("#activity-cards");
    const published = activityKind === "published";
    heading.textContent = published ? "Mis subastas" : "Mis pujas";
    heading.focus();
    activityCards.replaceChildren();
    return load("/users/me", (profile) => {
      const items = published ? profile.publishedAuctions : profile.participatedAuctions;
      if (!items.length) activityCards.append(element("li", published ? "Todavía no has publicado subastas." : "Todavía no tienes pujas aceptadas."));
      for (const auction of items) {
        const leads = auction.bids.at(-1)?.bidderId === userId;
        const note = published ? undefined : auction.status === "OPEN"
          ? (leads ? "Vas ganando" : "Superaron tu oferta")
          : leads ? `Adjudicada a tu cuenta${auction.paymentStatus ? ` · Orden ${paymentStates[auction.paymentStatus].toLowerCase()}` : ""}`
            : "Adjudicada a otro postor";
        activityCards.append(makeCard(auction, sessionToken, note));
      }
    }, "No pudimos consultar tu actividad. Vuelve a Mi perfil e inténtalo de nuevo.", sessionToken);
  }

  async function submitOperation(form, path, body, onSuccess, fallback, { method = "POST", onError } = {}) {
    const controls = [form.querySelector('button[type="submit"]'), backToProfile, backToList, cancelPublication, editPublication];
    submitting = true;
    controls.forEach((control) => { control.disabled = true; });
    message.textContent = "Enviando…";
    try {
      const result = await request(path, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify(await (typeof body === "function" ? body() : body)),
      });
      onSuccess(result);
    } catch (error) {
      if (error.statusCode === 401) {
        onExpired();
      } else if (onError) {
        message.textContent = "";
        onError(error);
      } else if (error.details?.code === "INVALID_PHOTO") {
        message.textContent = "La foto debe ser un archivo JPEG, PNG o WebP válido.";
      } else if (error.statusCode === 413) {
        message.textContent = "La foto supera el límite de 2 MB.";
      } else if (error.statusCode === 409) {
        message.textContent = "La subasta cambió. Vuelve al listado y abre el detalle antes de reintentar.";
      } else if (error.statusCode === 404) {
        message.textContent = "Esta subasta ya no está disponible.";
      } else if (error.statusCode === 403 && !operationErrors.has(error.details?.message)) {
        message.textContent = "Tu cuenta no tiene permiso para realizar este cambio.";
      } else {
        message.textContent = operationErrors.get(error.details?.message) ?? fallback;
      }
    } finally {
      controls.forEach((control) => { control.disabled = false; });
      submitting = false;
    }
  }

  function openPublication(auction) {
    clearPayment();
    leaveLiveDetail();
    active?.abort();
    editing = Boolean(auction);
    publicationForm.reset();
    clearPreview();
    listing.hidden = true;
    detail.hidden = true;
    publication.hidden = false;
    publicationTerms.hidden = editing;
    publicationTerms.disabled = editing;
    publicationHeading.textContent = editing ? "Editar publicación" : "Publicar subasta";
    publicationForm.querySelector('button[type="submit"]').textContent = editing ? "Guardar cambios" : "Publicar";
    cancelPublication.textContent = editing ? "Volver al detalle" : "Volver a subastas";
    if (auction) {
      publicationForm.elements.namedItem("itemId").value = auction.itemId;
      publicationForm.elements.namedItem("categoryId").value = auction.categoryId;
    }
    message.textContent = "";
    publicationHeading.focus();
  }

  document.querySelector("#open-publication").addEventListener("click", () => openPublication());
  editPublication.addEventListener("click", () => openPublication(currentAuction));
  cancelAuction.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting || !currentAuction || cancelAuction.hidden) return;
    if (!window.confirm(`¿Cancelar la subasta «${currentAuction.itemId}»? Esta acción es definitiva.`)) return;
    submitOperation(cancelAuction, `/auctions/${encodeURIComponent(currentAuction.id)}`, undefined, (auction) => {
      renderDetail(auction, true);
      message.textContent = "Subasta cancelada.";
      document.querySelector("#auction-detail-heading").focus();
    }, "No pudimos cancelar la subasta. Comprueba su estado antes de reintentar.", { method: "DELETE" });
  });
  cancelPublication.addEventListener("click", () => {
    publicationForm.reset();
    clearPreview();
    if (editing) showDetail(currentAuction.id, sessionToken);
    else showList(sessionToken, true);
  });

  publicationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting) return;
    const fields = new FormData(publicationForm);
    const itemId = fields.get("itemId").trim();
    const categoryId = fields.get("categoryId").trim();
    const file = photoInput.files[0];
    if (editing) {
      if (!itemId || !categoryId) {
        message.textContent = "Completa el artículo y la categoría.";
        return;
      }
      submitOperation(publicationForm, `/auctions/${encodeURIComponent(currentAuction.id)}`, async () => ({
        itemId,
        categoryId,
        ...(file && { photo: await readPhoto(file) }),
      }), (auction) => {
        publicationForm.reset();
        clearPreview();
        openDetail();
        renderDetail(auction);
        startLiveDetail(auction.id, sessionToken);
        message.textContent = "Cambios guardados.";
        document.querySelector("#auction-detail-heading").focus();
      }, "No pudimos guardar los cambios. Revisa los datos o vuelve a intentarlo.", { method: "PATCH" });
      return;
    }
    const basePrice = Number(fields.get("basePrice"));
    const minimumIncrement = Number(fields.get("minimumIncrement"));
    const closesAt = new Date(fields.get("closesAt"));
    if (!itemId || !categoryId || !Number.isSafeInteger(basePrice)
      || !Number.isSafeInteger(minimumIncrement) || !Number.isFinite(closesAt.getTime())) {
      message.textContent = "Revisa el artículo, la categoría, los valores en pesos y la fecha de cierre.";
      return;
    }

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
      startLiveDetail(auction.id, sessionToken);
      message.textContent = "Subasta publicada.";
      document.querySelector("#auction-detail-heading").focus();
    }, "No pudimos publicar la subasta. Revisa los datos o vuelve a intentarlo.");
  });

  bidForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting || !currentAuction || bidForm.hidden) return;
    clearBidFeedback();
    const bidAmount = bidInput.valueAsNumber;
    if (!Number.isSafeInteger(bidAmount) || bidAmount < 1) {
      message.textContent = "";
      showBidError("Ingresa un monto mayor que cero en pesos enteros.", true);
      return;
    }
    submitOperation(bidForm, `/auctions/${encodeURIComponent(currentAuction.id)}/bids`, {
      bidId: crypto.randomUUID(),
      rejectedBidAttemptId: crypto.randomUUID(),
      amount: bidAmount,
    }, (auction) => {
      renderDetail(auction, true);
      liveNotice.hidden = true;
      bidForm.reset();
      message.textContent = "Oferta aceptada.";
    }, "No pudimos registrar la oferta.", {
      onError(error) {
        const reason = error.details?.message;
        const code = error.details?.code;
        if (code === "CONCURRENT_MODIFICATION" || error.statusCode === 409) {
          showBidError("Otra operación cambió la subasta. Vuelve al listado, abre el detalle y comprueba la próxima oferta mínima antes de reintentar.");
        } else if (error.statusCode === 404) {
          showBidError("Esta subasta ya no está disponible.");
        } else if (bidAmountErrors.has(reason)) {
          showBidError(`${operationErrors.get(reason)} Consulta la próxima oferta mínima e ingresa un monto igual o mayor.`, true);
        } else if (operationErrors.has(reason)) {
          showBidError(operationErrors.get(reason));
        } else if (code === "INVALID_REQUEST" || error.statusCode === 403) {
          showBidError("La API rechazó la oferta. Comprueba el monto y que tu cuenta pueda participar.");
        } else {
          showBidError("No pudimos confirmar la oferta. Comprueba el historial antes de volver a enviarla.");
        }
      },
    });
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
  document.querySelector("#back-to-auctions").addEventListener("click", () => {
    if (activityKind) showActivity();
    else showList(sessionToken, true);
  });

  return {
    open(token, authenticatedUserId, kind) {
      sessionToken = token;
      userId = authenticatedUserId;
      activityKind = kind;
      return kind ? showActivity() : showList(token, true);
    },
    close() {
      clearPayment();
      leaveLiveDetail();
      active?.abort();
      view.hidden = true;
      sessionToken = undefined;
      userId = undefined;
      activityKind = undefined;
      currentAuction = undefined;
      page = 1;
      filters.reset();
      publicationForm.reset();
      clearPreview();
      bidForm.reset();
    },
  };
}
