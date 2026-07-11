const url = '../data.json';

async function fetchPurchaseProducts() {
	try {
		const response = await fetch(url);
		const data = await response.json();
		if (data.purchaseProducts.length === 0) {
			return false;
		}
		return data.purchaseProducts;
	} catch (error) {
		console.error('Error fetching data:', error);
	}
}

async function fetchWatchlistProducts() {
	const watchlist = localStorage.getItem('watchlist');
	if (!watchlist) return false;

	try {
		const products = JSON.parse(watchlist);
		return Array.isArray(products) ? products : false;
	} catch {
		return false;
	}
}

export { fetchPurchaseProducts, fetchWatchlistProducts };
