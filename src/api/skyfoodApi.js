
import { mockVouchers } from '../data/mockVouchers';

function mockDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const testCodes = [
  'TEST-NETWORK',
  'TEST-PRICE',
  'TEST-BALANCE',
  'TEST-CLOSED',
];

function getTestVoucher(code) {
  if (!testCodes.includes(code)) return null;

  const example = mockVouchers.find(
    item => item.boardingPassCode === 'SKY123'
  );

  if (!example) return null;

  return {
    ...example,
    id: `TEST-${code}`,
    boardingPassCode: code,
    balance: 1500,
  };
}

export async function getVoucherByBoardingCode(boardingCode) {
  await mockDelay(1000);

  const code = boardingCode.trim().toUpperCase();

const voucher = getTestVoucher(code) ?? mockVouchers.find(
  item => item.boardingPassCode === code
);

  if (!voucher) {
    throw new Error('Пассажир с таким посадочным талоном не найден');
  }

  if (voucher.status === 'NOT_ISSUED') {
    throw new Error('У пассажира пока нет активного ваучера');
  }

  if (voucher.status !== 'ACTIVE') {
    throw new Error(
      'Ваучер недействителен. Оформление покупки невозможно'
    );
  }

  return {
  ...voucher,
  balance: voucherBalances.has(voucher.id)
    ? voucherBalances.get(voucher.id)
    : voucher.balance,
};
}

import { mockMenu } from '../data/mockMenu';

// Моковое хранилище остатков
const voucherBalances = new Map();

// Защита от повторного выполнения одного запроса
const processedOrders = new Map();

export async function createOrder({
  boardingPassCode,
  items,
  requestId,
}) {
  if (processedOrders.has(requestId)) {
    return processedOrders.get(requestId);
  }

  const orderPromise = (async () => {

await mockDelay(1500);

const code = boardingPassCode.trim().toUpperCase();

// Тестовые ошибки. В реальном API их не будет.
if (code === 'TEST-NETWORK') {
  throw new Error(
    'Не удалось связаться с сервером. Статус заказа неизвестен. Обратитесь к администратору перед повторной попыткой.'
  );
}

if (code === 'TEST-PRICE') {
  throw new Error(
    'Цена одного из товаров изменилась. Обновите заказ.'
  );
}

if (code === 'TEST-BALANCE') {
  throw new Error(
    'Недостаточно средств. Баланс ваучера изменился.'
  );
}

if (code === 'TEST-CLOSED') {
  throw new Error(
    'Ваучер закрыт. Оформление заказа невозможно.'
  );
}

const voucher = getTestVoucher(code) ?? mockVouchers.find(
  item => item.boardingPassCode === code
);


    if (!voucher || voucher.status !== 'ACTIVE') {
      throw new Error('Ваучер недействителен или не найден');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Корзина пуста');
    }

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = mockMenu.find(
        product => product.id === item.id
      );

      if (
        !product ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new Error('В заказе обнаружен недоступный товар');
      }

      if (!product.voucherTypes.includes(voucher.type)) {
        throw new Error(
          `Товар «${product.name}» недоступен для ваучера ${voucher.type}`
        );
      }

      total += product.price * item.quantity;

      orderItems.push({
        ...product,
        quantity: item.quantity,
      });
    }

    const balance = voucherBalances.has(voucher.id)
      ? voucherBalances.get(voucher.id)
      : voucher.balance;

    if (total > balance) {
      throw new Error(
        'Недостаточно средств на ваучере. Проверьте остаток.'
      );
    }

    const newBalance = balance - total;
    voucherBalances.set(voucher.id, newBalance);

    return {
      number: `SF-${Date.now()}`,
      passengerName: voucher.passengerName,
      items: orderItems,
      total,
      currency: voucher.currency,
      balanceAfter: newBalance,
      confirmedAt: new Date().toLocaleString('ru-RU'),
    };
  })();

  processedOrders.set(requestId, orderPromise);

  try {
    return await orderPromise;
  } catch (error) {
    processedOrders.delete(requestId);
    throw error;
  }
}
