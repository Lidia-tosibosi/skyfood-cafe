
export async function getCafeMenu(cafeId) {
  const response = await fetch(
    `/api/v1/public/cafes/${cafeId}/menu`
  );

  if (!response.ok) {
    throw new Error('Не удалось загрузить меню кафе');
  }

  const result = await response.json();

  if (!result.success || !Array.isArray(result.data?.items)) {
    throw new Error('Некорректный ответ сервера');
  }

  const categories = {
    BEVERAGE: 'Напитки',
    FOOD: 'Еда',
    WATER: 'Вода'
  };

  const emojis = {
    'Кофе': '☕',
    'Сок': '🍹',
    'Чай': '🍵',
    'Выпечка': '🥐',
    'Каша': '🥣',
    'Салат': '🥗',
    'Сэндвич': '🥪',
    'Фрукты': '🍎'
  };

  return result.data.items.map(item => ({
    id: item.itemId,
    name: item.itemName,
    description: item.description,
    category: categories[item.category] ?? item.category,
    price: Number(item.price),
    currency: item.currency,
    voucherTypes: item.voucherTypes,
    emoji: emojis[item.itemName]
      ?? (item.category === 'WATER' ? '💧' : '🍽️')
  }));
}
