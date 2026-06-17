type CheckoutPresentationInput = {
  isFreeOrder: boolean;
  currencySymbol: string;
  total: number;
};

export function getCheckoutPresentation({
  isFreeOrder,
  currencySymbol,
  total,
}: CheckoutPresentationInput) {
  if (isFreeOrder) {
    return {
      stepLabels: ['Information', 'Review', 'Complete'],
      confirmTitle: 'Review your order',
      confirmDescription: 'No payment is required.',
      submitLabel: 'Confirm free order',
    };
  }

  return {
    stepLabels: ['Information', 'Payment', 'Complete'],
    confirmTitle: 'Payment Details',
    confirmDescription: 'Select your preferred payment method',
    submitLabel: `Pay ${currencySymbol}${total.toFixed(2)} Now`,
  };
}
