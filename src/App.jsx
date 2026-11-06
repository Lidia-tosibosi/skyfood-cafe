import './App.css';
import { mockMenu } from './data/mockMenu';
import {
  getVoucherByBoardingCode,
  createOrder,
} from './api/skyfoodApi';
import { useEffect, useRef, useState } from 'react';
const MOCK_EMPLOYEE = {
  username: 'admin',
  password: '1234',
  cafe: {
    id: 1,
    name: 'SkyCoffee',
  },
};

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState('');
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('Все');
  const [screen, setScreen] = useState('menu');
  useEffect(() => {
  window.scrollTo({
    top: 0,
    behavior: 'instant',
  });
}, [screen]);
  const [boardingCode, setBoardingCode] = useState('');
  const [voucher, setVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const orderSubmittingRef = useRef(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  function handleLogin(event) {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Заполните логин и пароль');
      return;
    }

    if (
      username !== MOCK_EMPLOYEE.username ||
      password !== MOCK_EMPLOYEE.password
    ) {
      setError('Неверный логин или пароль');
      return;
    }

    setEmployee({
      username: MOCK_EMPLOYEE.username,
      cafe: MOCK_EMPLOYEE.cafe,
    });
    setPassword('');
  }

  function handleLogout() {
    if (orderSubmittingRef.current) return;
    setEmployee(null);
    setUsername('');
    setPassword('');
    setError('');

    setCart([]);
    setCategory('Все');
    setScreen('menu');

    setBoardingCode('');
    resetVoucherCheck();
    setCompletedOrder(null);
  }


  const categories = ['Все', ...new Set(mockMenu.map(item => item.category))];

  const filteredMenu = category === 'Все'
    ? mockMenu
    : mockMenu.filter(item => item.category === category);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  useEffect(() => {
  if (screen === 'order' && cart.length === 0 && !orderLoading) {
    setScreen('menu');
    setBoardingCode('');
    setVoucher(null);
    setVoucherError('');
    setIdentityConfirmed(false);
  }
}, [cart.length, screen, orderLoading]);

  function addToCart(product) {
    if (orderSubmittingRef.current) return;
    setCart(current => {
      const existing = current.find(item => item.id === product.id);

      if (existing) {
        return current.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  }

  
function changeQuantity(productId, amount) {
  if (orderSubmittingRef.current) return;

  setCart(current =>
    current
      .map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity + amount }
          : item
      )
      .filter(item => item.quantity > 0)
  );
}


  function formatPrice(value) {
    return `${value.toLocaleString('ru-RU')} ₽`;
  }


  function resetVoucherCheck() {
    setVoucher(null);
    setVoucherError('');
    setIdentityConfirmed(false);
  }


async function checkVoucher() {
  if (voucherLoading || orderLoading) return;

  resetVoucherCheck();

  const code = boardingCode.trim().toUpperCase();

  if (!code) {
    setVoucherError('Введите код посадочного талона');
    return;
  }

  setVoucherLoading(true);

  try {
    const foundVoucher = await getVoucherByBoardingCode(code);
    setVoucher(foundVoucher);
  } catch (error) {
    setVoucherError(
      error.message || 'Не удалось проверить ваучер. Попробуйте ещё раз.'
    );
  } finally {
    setVoucherLoading(false);
  }
}

const currentBalance = voucher?.balance ?? 0;
  const forbiddenItems = voucher
    ? cart.filter(item => !item.voucherTypes.includes(voucher.type))
    : [];

  const hasForbiddenItems = forbiddenItems.length > 0;

  const insufficientBalance = voucher
    ? cartTotal > currentBalance
    : false;

  const canConfirmOrder =
    voucher !== null &&
    identityConfirmed &&
    cart.length > 0 &&
    !hasForbiddenItems &&
    !insufficientBalance;


async function confirmOrder() {
  if (
    !canConfirmOrder ||
    orderSubmittingRef.current ||
    voucherLoading
  ) {
    return;
  }

  orderSubmittingRef.current = true;
  setOrderLoading(true);
  setVoucherError('');

  try {
    const result = await createOrder({
      boardingPassCode: voucher.boardingPassCode,
      items: cart.map(item => ({
        id: item.id,
        quantity: item.quantity,
      })),
requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,    });

    setCompletedOrder(result);
    setScreen('success');
  
} catch (error) {
  setVoucherError(
    error.message || 'Не удалось оформить заказ. Проверьте статус операции.'
  );

  setVoucher(null);
  setIdentityConfirmed(false);

  } finally {
    orderSubmittingRef.current = false;
    setOrderLoading(false);
  }
}

  function startNewOrder() {
    if (orderSubmittingRef.current) return;
    setCart([]);
    setCategory('Все');
    setBoardingCode('');
    resetVoucherCheck();
    setCompletedOrder(null);
    setScreen('menu');
  }


  function cancelOrder() {
    if (orderSubmittingRef.current) return;
    if (cart.length === 0) return;

    const confirmed = window.confirm(
      'Отменить заказ? Все выбранные товары будут удалены.'
    );

    if (!confirmed) return;

    setCart([]);
    setBoardingCode('');
    resetVoucherCheck();
    setCompletedOrder(null);
    setScreen('menu');
  }


  if (employee) {
    return (
      <div className="cafe-app">
        <header className="cafe-header">
          <div className="brand">
            <span className="brand-icon">✈</span>
            <span>SkyFood</span>
          </div>

          <div className="header-actions">
            <span className="cafe-label">☕ {employee.cafe.name}</span>
            <button className="logout-button" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </header>

        <main className="cafe-content">
          {screen === 'menu' ? (
            <>
              <section className="menu-hero">
                <div>
                  <span className="eyebrow">SKYFOOD · CAFE</span>
                  <h1>Меню SkyCoffee ☕</h1>
                  <p>
                    Соберите заказ для пассажира.
                    Ваучер проверим перед оформлением.
                  </p>
                </div>
                <span className="hero-decoration">🥐</span>
              </section>

              <div className="category-list">
                {categories.map(item => (
                  <button
                    key={item}
                    className={`category-button ${category === item ? 'active' : ''}`}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <section className="products-grid">
                {filteredMenu.map(product => {
                  const selected = cart.find(item => item.id === product.id);
                  const quantity = selected?.quantity || 0;

                  return (
                    <article className="product-card" key={product.id}>
                      <div className="product-illustration">
                        {product.emoji}
                      </div>

                      <div className="product-details">
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>

                        <div className="product-bottom">
                          <strong>{formatPrice(product.price)}</strong>

                          {quantity === 0 ? (
                            <button
                              className="add-button"
                              onClick={() => addToCart(product)}
                            >
                              + Добавить
                            </button>
                          ) : (
                            <div className="quantity-control">
                              <button onClick={() => changeQuantity(product.id, -1)}>
                                −
                              </button>
                              <span>{quantity}</span>
                              <button onClick={() => changeQuantity(product.id, 1)}>
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              {cartCount > 0 && (
                <div className="cart-bottom-bar">
                  <div>
                    <span>{cartCount} товаров</span>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>
                  <button onClick={() => setScreen('order')}>
                    К заказу →
                  </button>
                </div>
              )}
            </>
          ) : screen === 'order' ? (
            <section className="order-page">
              
<div className="order-navigation">
  <button
    className="back-button"
    disabled={orderLoading}
    onClick={() => setScreen('menu')}
  >
    ← К меню
  </button>

  <button
    className="cancel-order-button"
    disabled={orderLoading}
    onClick={cancelOrder}
  >
    Отменить заказ
  </button>
</div>



              <h1>Ваш заказ</h1>
              <p className="order-subtitle">
                Проверьте выбранные товары перед оформлением.
              </p>

              <div className="order-card">
                {cart.map(item => (
                  <div className="order-item" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>{formatPrice(item.price)} × {item.quantity}</p>
                    </div>

                    <div className="order-item-right">
                      <strong>{formatPrice(item.price * item.quantity)}</strong>
                      <div className="quantity-control">
                        <button onClick={() => changeQuantity(item.id, -1)}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => changeQuantity(item.id, 1)}>+</button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="order-total">
                  <span>Итого</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>
              </div>

              
<div className="voucher-check-card">
  <span className="eyebrow">ПРОВЕРКА ПАССАЖИРА</span>
  <h2>Проверка ваучера ✈</h2>
  <p className="voucher-description">
    Введите код с посадочного талона пассажира.
  </p>

  <label className="voucher-label" htmlFor="boarding-code">
    Код посадочного талона
  </label>

  <div className="voucher-input-row">
    <input
      id="boarding-code"
      value={boardingCode}
      placeholder="Например, SKY123"
      disabled={voucherLoading || orderLoading}
      onChange={event => {
        setBoardingCode(event.target.value);
        resetVoucherCheck();
      }}
    />
    <button
  onClick={checkVoucher}
  disabled={voucherLoading || orderLoading}
>
{voucherLoading ? (
  <span className="loading-label">
    <span className="button-spinner" />
    Проверяем…
  </span>
) : (
  'Проверить'
)}</button>
  </div>

  {voucherError && (
    <div className="voucher-alert" role="alert">
      {voucherError}
    </div>
  )}

  
{voucher && (
  <div className="voucher-result">
    <div className="voucher-result-heading">
      <strong>Данные пассажира</strong>
      <span className="voucher-active">
        <span className="status-dot" />
        Активен
      </span>
    </div>

    <div className="passenger-primary">
      <span className="passenger-caption">ПАССАЖИР</span>
      <h3>{voucher.passengerName}</h3>

      <div className="flight-details">
        <span>✈ Рейс {voucher.flightNumber}</span>
        <span>Место {voucher.seatNumber || 'не указано'}</span>
      </div>
    </div>

    <div className="voucher-balance-panel">
      <div>
        <span className="balance-caption">
          Доступный остаток
        </span>
        <strong className="balance-value">
          {formatPrice(currentBalance)}
        </strong>
        <span className="period-amount">
          Сумма периода: {formatPrice(voucher.currentPeriodAmount)}
        </span>
      </div>

      <span className={`voucher-type voucher-type-${voucher.type.toLowerCase()}`}>
        {voucher.type}
      </span>
    </div>

    <div className="document-reminder">
      <span className="document-icon">☑</span>
      <span>
        Сверьте ФИО с документом пассажира перед оформлением.
      </span>
    </div>

    <label className="identity-check">
      <input
        type="checkbox"
        checked={identityConfirmed}
        disabled={orderLoading}
        onChange={event =>
          setIdentityConfirmed(event.target.checked)
        }
      />
      <span>
        Я сверил(а) ФИО пассажира с документом.
        Данные совпадают.
      </span>
    </label>

    {hasForbiddenItems && (
      <div className="voucher-alert">
        Для ваучера {voucher.type} недоступны:
        {' '}{forbiddenItems.map(item => item.name).join(', ')}.
        Удалите эти товары из заказа.
      </div>
    )}

    {insufficientBalance && (
      <div className="voucher-alert">
        Недостаточно средств. Доступно:
        {' '}{formatPrice(currentBalance)}.
        Измените состав заказа.
      </div>
    )}
  </div>
)}


<button
  className="confirm-order-button"
  disabled={!canConfirmOrder || orderLoading || voucherLoading}
  onClick={confirmOrder}
>
{orderLoading ? (
  <span className="loading-label">
    <span className="button-spinner" />
    Оформляем заказ…
  </span>
) : (
  `Подтвердить заказ · ${formatPrice(cartTotal)}`
)}
</button>

  {!voucher && (
    <p className="confirm-hint">
      Подтверждение станет доступно после проверки ваучера.
    </p>
  )}
</div>


            </section>
          ) : (
            <section className="success-page">
              <div className="success-icon">✓</div>
              <h1>Заказ оформлен!</h1>
              <p>Оплата ваучером успешно выполнена.</p>

              <div className="success-receipt">
                <div className="receipt-highlight">
  <span>Списано с ваучера</span>
  <strong>{formatPrice(completedOrder?.total ?? 0)}</strong>
  <span className="receipt-balance-label">
    Остаток: {formatPrice(completedOrder?.balanceAfter ?? 0)}
  </span>
</div>
                <div className="receipt-row">
                  <span>Номер заказа</span>
                  <strong>{completedOrder?.number}</strong>
                </div>
                <div className="receipt-row">
                  <span>Пассажир</span>
                  <strong>{completedOrder?.passengerName}</strong>
                </div>

                <div className="receipt-divider" />

                {completedOrder?.items.map(item => (
                  <div className="receipt-row" key={item.id}>
                    <span>{item.name} × {item.quantity}</span>
                    <strong>
                      {formatPrice(item.price * item.quantity)}
                    </strong>
                  </div>
                ))}

                <div className="receipt-divider" />
                <div className="receipt-row">
                  <span>Дата и время</span>
                  <strong>{completedOrder?.confirmedAt}</strong>
                </div>
              </div>

              <button
                className="new-order-button"
                onClick={startNewOrder}
              >
                Новый заказ →
              </button>
            </section>
          )}
        </main>

      </div>
    );
  }


  return (
    <div className="app">
      <div className="login-card">
        <div className="brand">
          <span className="brand-icon">✈</span>
          <span>SkyFood</span>
        </div>

        <div className="login-heading">
          <span className="eyebrow">
            СИСТЕМА ДЛЯ СОТРУДНИКОВ КАФЕ
          </span>
          <h1>Добро пожаловать!</h1>
          <p>
            Войдите, чтобы оформлять заказы по ваучерам пассажиров.
          </p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="username">Логин</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="Введите логин"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Введите пароль"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit">Войти →</button>
        </form>

        <div className="login-footer">
          SkyFood · Сервис питания при задержке рейсов
        </div>
      </div>
    </div>
  );
}

export default App;
