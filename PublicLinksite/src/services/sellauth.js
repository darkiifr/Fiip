export async function openCheckout(url) {
  if (!url) {
    throw new Error('Checkout SellAuth non configuré pour ce plan.');
  }
  window.location.assign(url);
}
