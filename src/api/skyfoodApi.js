
export async function getVoucherByBoardingCode(boardingCode) {
  const code = boardingCode.trim().toUpperCase();

  if (!code) {
    throw new Error('Введите код посадочного талона');
  }

  const response = await fetch(
    `/api/v1/public/vouchers/check?boardingPassCode=${encodeURIComponent(code)}`,
    { cache: 'no-store' }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.error?.message ||
      'Не удалось проверить посадочный талон'
    );
  }

  const voucher = result.data;

  if (voucher.status !== 'ACTIVE') {
    throw new Error('У пассажира нет активного ваучера');
  }

  return {
    boardingPassCode: code,
    passengerName: voucher.passengerName,
    type: voucher.voucherType,
    currentPeriodAmount: Number(voucher.totalAmount),
    balance: Number(voucher.balance),
    currency: voucher.currency,
    status: voucher.status
  };
}

export async function createOrder(order) {
  let response;

  try {
    response = await fetch('/api/v1/cafe/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    });
  } catch {
    throw new Error(
      'Не удалось получить ответ сервера. ' +
      'Статус оплаты неизвестен. ' +
      'Повторите тот же заказ, не меняя его состав.'
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.error?.message ||
      'Не удалось подтвердить оплату. ' +
      'Проверьте состояние заказа перед новой попыткой.'
    );
  }

  return result.data;
}
