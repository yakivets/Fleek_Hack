import { formatMoney, safeImageUrl } from './ebayCatalog.js';

function element(documentRef, tagName, text, className = '') {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
}

export function parseStoredCart(value) {
  if (!value) return [];
  try {
    const items = JSON.parse(value);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function renderCheckoutCart(container, items, documentRef = document) {
  container.replaceChildren();
  for (const item of items) {
    const card = element(documentRef, 'div', null, 'productDetails');
    const row = element(documentRef, 'div', null, 'row');

    const imageColumn = element(documentRef, 'div', null, 'col-3');
    const image = element(documentRef, 'img', null, 'img-fluid');
    const imageUrl = safeImageUrl(item?.image);
    if (imageUrl) image.src = imageUrl;
    image.alt = typeof item?.name === 'string' ? item.name : 'Cart item';
    imageColumn.appendChild(image);

    const nameColumn = element(documentRef, 'div', null, 'col-3');
    nameColumn.appendChild(
      element(
        documentRef,
        'h6',
        typeof item?.name === 'string' ? item.name : 'Untitled item',
        'card-title',
      ),
    );

    const quantityColumn = element(documentRef, 'div', null, 'col-2');
    const quantity = Math.max(Math.floor(Number(item?.quantity)) || 1, 1);
    quantityColumn.appendChild(element(documentRef, 'h5', `Qty: ${quantity}`));

    const priceColumn = element(documentRef, 'div', null, 'col-3');
    priceColumn.appendChild(
      element(documentRef, 'h5', `Price: ${formatMoney(item?.price, item?.currency)}`),
    );

    row.append(imageColumn, nameColumn, quantityColumn, priceColumn);
    row.appendChild(
      element(
        documentRef,
        'h6',
        'Authorities may apply duties, fees, and taxes upon delivery',
      ),
    );
    row.appendChild(element(documentRef, 'hr'));
    card.appendChild(row);
    container.appendChild(card);
  }
}
