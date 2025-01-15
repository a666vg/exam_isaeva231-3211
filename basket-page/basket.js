const API_URL = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = 'dcb5d2ae-8c34-4792-96a9-b8819055c047';
const DELIVERY_COST = 500;

// Состояние приложения
let state = {
    products: [],
    cart: [],
    filters: {
        categories: new Set(),
        minPrice: null,
        maxPrice: null,
        discountOnly: false
    },
    sortBy: 'default',
    page: 1,
    itemsPerPage: 12,
    searchQuery: ''
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    loadCartFromLocalStorage();
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('quantity-btn')) {
            const item = e.target.closest('.product-card');
            const action = e.target.dataset.action;
            if (item && action) {
                updateQuantity(parseInt(item.dataset.id), action);
            }
        }
    });

    const resetBtn = document.querySelector('.btn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }

    setMinDeliveryDate();

    // Добавляем слушатели для пересчета стоимости
    document.getElementById('deliveryDate')?.addEventListener('change', updateTotalPrice);
    document.getElementById('deliveryTime')?.addEventListener('change', updateTotalPrice);
}

// Загрузка товаров с сервера
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/goods?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка при загрузке данных');
        
        state.products = await response.json();
        updateCartDisplay();
    } catch (error) {
        console.error('Ошибка при загрузке товаров:', error);
        showNotification('Ошибка при загрузке товаров: ' + error.message, 'error');
    }
}


// Создание звездного рейтинга
function createRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    // Добавляем полные звезды
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star full">★</span>';
    }
    
    // Добавляем половину звезды, если нужно
    if (hasHalfStar) {
        stars += '<span class="star half">★</span>';
    }
    
    // Добавляем пустые звезды
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star empty">☆</span>';
    }
    
    return stars;
}

// Создание карточки товара
function createProductCard(product) {
    const currentPrice = product.discount_price || product.actual_price;
    const discount = product.discount_price ? 
        Math.round((1 - product.discount_price / product.actual_price) * 100) : 0;

    return `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.image_url}" alt="${product.name}" loading="lazy">
            <h3 title="${product.name}">${product.name}</h3>
            <div class="product-rating">
                ${createRatingStars(product.rating)}
                <span>${product.rating}</span>
            </div>
            <div class="product-price">
                ${product.discount_price ? 
                    `<span class="original-price">${product.actual_price}₽</span>
                     <span class="discount-price">${product.discount_price}₽</span>
                     <span class="discount-badge">-${discount}%</span>` : 
                    `<span class="regular-price">${product.actual_price}₽</span>`
                }
            </div>
            
            <button class="remove-item" onclick="removeFromCart(${product.id})">Удалить</button>
        </div>
    `;
}

// Обработка оформления заказа
async function handleCheckout(e) {
    e.preventDefault();
    showLoader();

    try {
        if (state.cart.length === 0) {
            showNotification('Корзина пуста', 'error');
            return;
        }

        const formData = new FormData(e.target);
        validateForm(formData);

        // const date = new Date(formData.get('delivery_date').split('.').reverse().join('-'));

        const formatDate = (dateString) => {
            if (!dateString) return null;
            const [year, month, day] = dateString.split('-');
            return `${day}.${month}.${year}`;
        };
        
        const orderData = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            delivery_address: formData.get('delivery_address'),
            delivery_date: formatDate(formData.get('delivery_date')),

            delivery_interval: formData.get('delivery_interval'),
            comment: formData.get('comment'),
            good_ids: state.cart.map(item => item.id)
        };
        console.log(orderData)

        const response = await fetch(`${API_URL}/orders?api_key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Удален заголовок Access-Control-Allow-Origin
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Ошибка оформления заказа');
        }

        await response.json();
        
        clearCart();
        resetForm();
        showNotification('Заказ успешно оформлен!', 'success');

        setTimeout(() => {
            window.location.href = '../main-page/main.html';
        }, 2000);

    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoader();
    }
}

// Валидация формы
function validateForm(formData) {
    const requiredFields = ['full_name', 'email', 'phone', 'delivery_address', 'delivery_date'];
    
    for (const field of requiredFields) {
        if (!formData.get(field)) {
            throw new Error(`Поле ${field} обязательно для заполнения`);
        }
    }

  
}

// Обновление отображения корзины
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const orderForm = document.getElementById('orderForm');
    const cartCount = document.getElementById('cartCount');

    if (state.cart.length === 0) {
        if (cartItems) cartItems.style.display = 'none';
        if (emptyCart) emptyCart.style.display = 'block';
        if (orderForm) orderForm.style.display = 'none';
        if (cartCount) cartCount.textContent = '0';
        return;
    }

    if (cartItems) {
        cartItems.style.display = 'grid';
        cartItems.innerHTML = state.cart.map(cartItem => {
            const product = state.products.find(p => p.id === cartItem.id);
            if (product) {
                product.quantity = cartItem.quantity;
                return createProductCard(product);
            }
            return '';
        }).join('');
    }

    if (emptyCart) emptyCart.style.display = 'none';
    if (orderForm) orderForm.style.display = 'block';
    if (cartCount) cartCount.textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    updateTotalPrice();
}

// Обновление итоговой стоимости
function updateTotalPrice() {
    const deliveryDate = document.getElementById('deliveryDate')?.value;
    const deliveryInterval = document.getElementById('deliveryTime')?.value;

    let deliveryCost = 200;
    if (deliveryDate) {
        const date = new Date(deliveryDate);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isEveningDelivery = deliveryInterval === '18:00-22:00';

        if (!isWeekend && isEveningDelivery) {
            deliveryCost += 200;
        }
        if (isWeekend) {
            deliveryCost += 300;
        }
    }

    const subtotal = state.cart.reduce((sum, cartItem) => {
        const product = state.products.find(p => p.id === cartItem.id);
        if (product) {
            const price = product.discount_price || product.actual_price;
            return sum + (price * cartItem.quantity);
        }
        return sum;
    }, 0);

    const total = subtotal + deliveryCost;

    document.getElementById('subtotalPrice').textContent = `${subtotal}₽`;
    document.getElementById('deliveryCost').textContent = `${deliveryCost}₽`;
    document.getElementById('totalPrice').textContent = `${total}₽`;
}

// Вспомогательные функции
function showLoader() {
    const loader = document.createElement('div');
    loader.className = 'loader';
    document.body.appendChild(loader);
}

function hideLoader() {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.remove();
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const deleteNotif = document.createElement('button');
    deleteNotif.className = 'btn-delete-notif';
    deleteNotif.innerHTML = '✕';
    
    notification.textContent = message;
    notification.appendChild(deleteNotif);

    const container = document.getElementById('notificationArea');
    container.appendChild(notification);

    deleteNotif.addEventListener('click', () => {
        container.removeChild(notification);
    });

    setTimeout(() => {
        if (notification.parentNode === container) {
            container.removeChild(notification);
        }
    }, 3000);
}

// Работа с localStorage
function loadCartFromLocalStorage() {
    try {
        const savedCart = localStorage.getItem('cart');
        state.cart = savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
        console.error('Ошибка при загрузке корзины:', error);
        state.cart = [];
    }
}

function saveCartToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(state.cart));
}

// Управление корзиной
function updateQuantity(productId, action) {
    const cartItemIndex = state.cart.findIndex(item => item.id === productId);
    
    if (cartItemIndex === -1) {
        if (action === 'increase') {
            state.cart.push({ id: productId, quantity: 1 });
        }
        return;
    }

    if (action === 'increase') {
        state.cart[cartItemIndex].quantity++;
    } else if (action === 'decrease') {
        state.cart[cartItemIndex].quantity--;
        if (state.cart[cartItemIndex].quantity <= 0) {
            state.cart = state.cart.filter(item => item.id !== productId);
        }
    }

    saveCartToLocalStorage();
    updateCartDisplay();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveCartToLocalStorage();
    updateCartDisplay();
    showNotification('Товар удален из корзины');
}

function clearCart() {
    state.cart = [];
    localStorage.removeItem('cart');
    updateCartDisplay();
}

function resetForm() {
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.reset();
        showNotification('Форма очищена');
    }
}

// Установка минимальной даты доставки
function setMinDeliveryDate() {
    const deliveryDateInput = document.getElementById('deliveryDate');
    if (deliveryDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        deliveryDateInput.min = tomorrow.toISOString().split('T')[0];
    }
}