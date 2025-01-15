const API_URL = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
const API_KEY = 'dcb5d2ae-8c34-4792-96a9-b8819055c047';

let state = {
    orders: [],
    products: [],
    
};

// Функция показа уведомлений
function showNotification(message, type = 'success') {
    const notification = document.createElement('div')
    notification.className = `notification ${type}`

    const deleteNotif = document.createElement('button')
    deleteNotif.className = 'btn-delete-notif'
    deleteNotif.id = 'btn-delete-notif'
    deleteNotif.innerHTML = '&#10005;'
    notification.textContent = message;
    notification.appendChild(deleteNotif);

    

    

    
    const container = document.getElementById('notificationArea');
    container.appendChild(notification);

    deleteNotif.addEventListener('click', () => {
        container.removeChild(notification)
    });

    setTimeout(() => {
        if (notification.parentNode === container) {
            container.removeChild(notification);
        }
    }, 5000);
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        
        await fetchProducts();
        await fetchOrders();
        setupEventListeners();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка при загрузке данных', 'error');
    }
}
// Загрузка товара
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/goods?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка при загрузке товаров');
        state.products = await response.json();
    } catch (error) {
        console.error('Ошибка при загрузке товаров:', error);
        throw error;
    }
}

// Загрузка заказов
async function fetchOrders() {
    try {
        const response = await fetch(`${API_URL}/orders?api_key=${API_KEY}`);
        if (!response.ok) throw new Error('Ошибка при загрузке заказов');
        state.orders = await response.json();
        if (state.products.length > 0) {
            updateOrdersTable();
        }
    } catch (error) {
        console.error('Ошибка при загрузке заказов:', error);
        throw error;
    }
}

// Получение товара по айди
function getProductNameById(id) {
    const product = state.products.find(p => p.id === id);
    return product ? product.name : 'Товар не найден';
}


// Проверка на стоимость доствки при редактировании
function isWeekend(date) {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
}

function calculateDeliveryPrice(date, timeInterval) {
    let deliveryPrice = 200;

    if (isWeekend(date)) {
        deliveryPrice += 300;
    }

    if (!isWeekend(date) && timeInterval.startsWith('18:00')) {
        deliveryPrice += 200;
    }

    return deliveryPrice;
}

function calculateProductsTotal(goodIds) {
    return goodIds.reduce((total, id) => {
        const product = state.products.find(p => p.id === Number(id));
        return total + (product ? (product.discount_price || product.price) : 0);
    }, 0);
}

function updateTotalPrice() {
    const form = document.getElementById('editOrderForm');
    if (!form) return;

    const deliveryDate = form.querySelector('[name="delivery_date"]').value;
    const deliveryInterval = form.querySelector('[name="delivery_interval"]').value;
    
    const productItems = form.querySelectorAll('.product-item');
    const goodIds = Array.from(productItems).map(item => 
        Number(item.dataset.productId)
    );

    const deliveryPrice = calculateDeliveryPrice(deliveryDate, deliveryInterval);
    const productsTotal = calculateProductsTotal(goodIds);
    const totalPrice = productsTotal + deliveryPrice;

    const totalPriceElement = document.getElementById('orderTotalPrice');
    if (totalPriceElement) {
        totalPriceElement.innerHTML = `
            <div class="price-breakdown">
                <div>Товары: ${productsTotal}₽</div>
                <div>Доставка: ${deliveryPrice}₽</div>
                <div class="total">Итого: ${totalPrice}₽</div>
            </div>
        `;
    }

    return totalPrice;
}

function updateOrdersTable() {
    if (!state.products || state.products.length === 0) {
        console.error('Товары еще не загружены');
        return;
    }

    const tableBody = document.querySelector('#ordersTable tbody');
    const noOrders = document.getElementById('noOrders');

    if (state.orders.length === 0) {
        if (tableBody) tableBody.innerHTML = '';
        if (noOrders) noOrders.style.display = 'block';
        return;
    }

    if (noOrders) noOrders.style.display = 'none';
    if (!tableBody) return;

    tableBody.innerHTML = state.orders.map((order, index) => {
        const orderProducts = order.good_ids.map(id => getProductNameById(id)).join(', ');
        const total = calculateProductsTotal(order.good_ids);
        
        return `
            <tr data-order-id="${order.id}">
                <td>${index + 1}</td>
                <td>${new Date(order.created_at).toLocaleString()}</td>
                <td>${orderProducts}</td>
                <td>${total}₽</td>
                <td>${new Date(order.delivery_date).toLocaleString().slice(0, 10)}, ${order.delivery_interval}</td>
                
                <td class="actions">
                    <button class="view-order" title="Просмотреть">👁️</button>
                    <button class="edit-order" title="Редактировать">✏️</button>
                    <button class="delete-order" title="Удалить">❌</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showModal(content) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal';
    modalContainer.innerHTML = content;
    
    modalOverlay.appendChild(modalContainer);
    document.body.appendChild(modalOverlay);

    const closeButtons = modalOverlay.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modalOverlay.remove();
        });
    });
}

function showViewModal(orderId) {
    const order = state.orders.find(o => o.id === Number(orderId));
    if (!order) return;

    const deliveryPrice = calculateDeliveryPrice(order.delivery_date, order.delivery_interval);
    const productsTotal = calculateProductsTotal(order.good_ids);
    const totalPrice = productsTotal + deliveryPrice;

    const modalContent = `
        <div class="modal-header">
            <h3>Просмотр заказа №${order.id}</h3>
            <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
            <p><strong>ФИО:</strong> ${order.full_name}</p>
            <p><strong>Email:</strong> ${order.email}</p>
            <p><strong>Телефон:</strong> ${order.phone}</p>
            <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
            <p><strong>Дата доставки:</strong> ${order.delivery_date}</p>
            <p><strong>Интервал доставки:</strong> ${order.delivery_interval}</p>
            <p><strong>Комментарий:</strong> ${order.comment || 'Нет комментария'}</p>
            <div class="order-products">
                <h4>Товары в заказе:</h4>
                ${order.good_ids.map(id => {
                    const product = state.products.find(p => p.id === id);
                    return `
                        <div class="order-product-item">
                            ${getProductNameById(id)} - ${product ? (product.discount_price || product.price) + '₽' : 'Цена не доступна'}
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="price-breakdown">
                <div>Товары: ${productsTotal}₽</div>
                <div>Доставка: ${deliveryPrice}₽</div>
                <div class="total">Итого: ${totalPrice}₽</div>
            </div>
        </div>
    `;

    showModal(modalContent);
}

function showEditModal(orderId) {
    const order = state.orders.find(o => o.id === Number(orderId));
    if (!order) return;

    const modalContent = `
        <div class="modal-header">
            <h3>Редактирование заказа №${order.id}</h3>
            <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
            <form id="editOrderForm">
                <input type="hidden" name="orderId" value="${order.id}">
                <div class="form-group">
                    <label>ФИО:</label>
                    <input type="text" name="full_name" value="${order.full_name}" required>
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email" value="${order.email}" required>
                </div>
                <div class="form-group">
                    <label>Телефон:</label>
                    <input type="tel" name="phone" value="${order.phone}" required>
                </div>
                <div class="form-group">
                    <label>Адрес доставки:</label>
                    <input type="text" name="delivery_address" value="${order.delivery_address}" required>
                </div>
                <div class="form-group">
                    <label>Дата доставки:</label>
                    <input type="date" name="delivery_date" value="${order.delivery_date}" required>
                </div>
                <div class="form-group">
                    <label>Интервал доставки:</label>
                    <select name="delivery_interval" required>
                        <option value="08:00-12:00" ${order.delivery_interval === '08:00-12:00' ? 'selected' : ''}>08:00-12:00</option>
                        <option value="12:00-14:00" ${order.delivery_interval === '12:00-14:00' ? 'selected' : ''}>12:00-14:00</option>
                        <option value="14:00-18:00" ${order.delivery_interval === '14:00-18:00' ? 'selected' : ''}>14:00-18:00</option>
                        <option value="18:00-22:00" ${order.delivery_interval === '18:00-22:00' ? 'selected' : ''}>18:00-22:00</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Комментарий:</label>
                    <textarea name="comment">${order.comment || ''}</textarea>
                </div>

                <div class="form-group products-section">
                    <h4>Товары в заказе</h4>
                    <div class="products-list">
                        ${order.good_ids.map(goodId => {
                            const product = state.products.find(p => p.id === goodId);
                            return `
                                <div class="product-item" data-product-id="${goodId}">
                                    <span class="product-name">${getProductNameById(goodId)}</span>
                                    <span class="product-price">${product ? (product.discount_price || product.price) + '₽' : ''}</span>
                                    <button type="button" class="btn-remove-product">Удалить</button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="order-total" id="orderTotalPrice">
                        <!-- Здесь будет отображаться общая стоимость -->
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="submit" class="btn-save">Сохранить</button>
                    <button type="button" class="btn-cancel close-modal">Отмена</button>
                </div>
            </form>
        </div>
    `;

    showModal(modalContent);
    
    setupProductHandlers(order);
    updateTotalPrice();

    const form = document.getElementById('editOrderForm');
    const dateInput = form.querySelector('[name="delivery_date"]');
    
    dateInput.addEventListener('change', (e) => {
        if (!isValidDeliveryDate(e.target.value)) {
            showNotification('Дата доставки не может быть раньше текущей даты', 'error');
            e.target.value = ''; // Очищаем поле даты
        }
        updateTotalPrice();
    });

    form.querySelector('[name="delivery_date"]').addEventListener('change', updateTotalPrice);
    form.querySelector('[name="delivery_interval"]').addEventListener('change', updateTotalPrice);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goodIds = Array.from(form.querySelectorAll('.product-item'))
            .map(item => Number(item.dataset.productId));
        await updateOrder(new FormData(e.target), goodIds);
    });
}

// Редактирование заказа 
async function updateOrder(formData, goodIds) {
    try {
        
        const deliveryDate = formData.get('delivery_date');
        
        // Проверяем валидность даты доставки
        if (!isValidDeliveryDate(deliveryDate)) {
            throw new Error('Дата доставки не может быть раньше текущей даты');
        }
        
        const orderId = formData.get('orderId');
        const orderData = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            delivery_address: formData.get('delivery_address'),
            delivery_date: deliveryDate,
            delivery_interval: formData.get('delivery_interval'),
            comment: formData.get('comment'),
            good_ids: goodIds
        };

        const response = await fetch(`${API_URL}/orders/${orderId}?api_key=${API_KEY}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) throw new Error('Ошибка при обновлении заказа');

        const updatedOrder = await response.json();
        const orderIndex = state.orders.findIndex(o => o.id === Number(orderId));
        if (orderIndex !== -1) {
            state.orders[orderIndex] = updatedOrder;
        }

        updateOrdersTable();
        showNotification('Заказ успешно обновлен', 'success');
        
        // Закрываем модальное окно
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) modalOverlay.remove();
        
    } catch (error) {
        console.error('Ошибка при обновлении заказа:', error);
        showNotification(error.message || 'Ошибка при обновлении заказа', 'error');
    } 
}
function deleteOrder(orderId) {
    // Получаем шаблон модального окна
    const template = document.getElementById('deleteOrderModal');
    if (!template) {
        console.error('Шаблон модального окна не найден');
        return;
    }

    // Создаем overlay для модального окна
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Клонируем содержимое шаблона
    const modalContent = template.content.cloneNode(true);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Получаем ссылку на модальное окно
    const modalElement = modalOverlay.querySelector('.delete-order-modal');

    // Добавляем обработчики событий
    const confirmButton = modalElement.querySelector('.confirm-delete');
    const closeButtons = modalElement.querySelectorAll('.close-modal');

    // Обработчик подтверждения удаления
    confirmButton.addEventListener('click', async () => {
        await handleDeleteOrder(orderId);
        modalOverlay.remove();
    });

    // Обработчики закрытия модального окна
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modalOverlay.remove();
        });
    });

    // Закрытие по клику на overlay
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
}
        
async function handleDeleteOrder(orderId) {
    try {
        
        
        const response = await fetch(`${API_URL}/orders/${orderId}?api_key=${API_KEY}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Ошибка при удалении заказа');
        }

        // Обновляем локальное состояние
        state.orders = state.orders.filter(order => order.id !== parseInt(orderId));
        
        // Обновляем таблицу и показываем уведомление
        updateOrdersTable();
        showNotification('Заказ успешно удален', 'success');

    } catch (error) {
        console.error('Ошибка при удалении заказа:', error);
        showNotification('Ошибка при удалении заказа', 'error');
    }
}
        
function setupProductHandlers(order) {
    const form = document.getElementById('editOrderForm');
    if (!form) return;

    // Обработчик удаления товара
    form.querySelectorAll('.btn-remove-product').forEach(button => {
        button.addEventListener('click', function() {
            const productItem = this.closest('.product-item');
            if (productItem) {
                productItem.remove();
                updateTotalPrice();
            }
        });
    });
        
    // Обработчик добавления товара
    const addProductButton = form.querySelector('.btn-add-product');
    const productSelect = form.querySelector('#availableProducts');

    if (addProductButton && productSelect) {
        addProductButton.addEventListener('click', () => {
            const selectedProductId = Number(productSelect.value);
            if (!selectedProductId) return;

            const product = state.products.find(p => p.id === selectedProductId);
            if (!product) return;

            const productsList = form.querySelector('.products-list');
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.dataset.productId = product.id;
            productItem.innerHTML = `
                <span class="product-name">${product.name}</span>
                <span class="product-price">${product.discount_price || product.price}₽</span>
                <button type="button" class="btn-remove-product">Удалить</button>
            `;

            productsList.appendChild(productItem);
            
            // Добавляем обработчик удаления для нового товара
            const removeButton = productItem.querySelector('.btn-remove-product');
            removeButton.addEventListener('click', function() {
                productItem.remove();
                updateTotalPrice();
            });

            // Удаляем товар из списка доступных
            const option = productSelect.querySelector(`option[value="${product.id}"]`);
            if (option) option.remove();

            updateTotalPrice();
        });
    }
}

function setupEventListeners() {
    const ordersTable = document.getElementById('ordersTable');
    if (!ordersTable) return;

    ordersTable.addEventListener('click', async (e) => {
        const target = e.target;
        const orderRow = target.closest('tr');
        if (!orderRow) return;

        const orderId = orderRow.dataset.orderId;
        if (!orderId) return;

        if (target.classList.contains('view-order')) {
            showViewModal(orderId);
        } else if (target.classList.contains('edit-order')) {
            showEditModal(orderId);
        } else if (target.classList.contains('delete-order')) {
            deleteOrder(orderId);
        }
    });
}



function isValidDeliveryDate(deliveryDate) {
    // Преобразуем строку даты в объект Date
    const deliveryDateTime = new Date(deliveryDate);
    const currentDate = new Date();
    
    // Сбрасываем время до начала дня для корректного сравнения
    deliveryDateTime.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    // Проверяем, что дата доставки не раньше текущей даты
    return deliveryDateTime >= currentDate;
}