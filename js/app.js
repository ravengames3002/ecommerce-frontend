// Group 5/js/app.js
const API_URLS = {
  auth: 'https://ecommerce-auth.onrender.com',
  products: 'http://localhost:5002',
  cart: 'http://localhost:5003',
  orders: 'http://localhost:5004'
};

const getToken = () => localStorage.getItem('accessToken');
const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');

const setToken = (token) => localStorage.setItem('accessToken', token);
const setRefreshToken = (token) => localStorage.setItem('refreshToken', token);
const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

const clearAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const fetchWithAuth = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearAuth();
    window.location.href = '/login.html';
    throw new Error('Unauthorized');
  }

  return response;
};

const updateNavigation = () => {
  const user = getUser();
  const token = getToken();

  document.getElementById('loginLink').style.display = token ? 'none' : 'block';
  document.getElementById('registerLink').style.display = token ? 'none' : 'block';
  document.getElementById('userLink').style.display = token ? 'block' : 'none';
  document.getElementById('logoutBtn').style.display = token ? 'block' : 'none';
  document.getElementById('ordersLink').style.display = token ? 'block' : 'none';
  
  if (user.role === 'admin') {
    document.getElementById('adminLink').style.display = 'block';
  }

  if (document.getElementById('userLink')) {
    document.getElementById('userLink').textContent = user.name || 'Profile';
  }
};

const login = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_URLS.auth}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);

    document.getElementById('message').textContent = 'Login successful!';
    document.getElementById('message').className = 'success';
    setTimeout(() => window.location.href = '/index.html', 1500);
  } catch (error) {
    document.getElementById('message').textContent = error.message;
    document.getElementById('message').className = 'error';
  }
};

const register = async () => {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    document.getElementById('message').textContent = 'Passwords do not match';
    document.getElementById('message').className = 'error';
    return;
  }

  try {
    const response = await fetch(`${API_URLS.auth}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);

    document.getElementById('message').textContent = 'Registration successful!';
    document.getElementById('message').className = 'success';
    setTimeout(() => window.location.href = '/index.html', 1500);
  } catch (error) {
    document.getElementById('message').textContent = error.message;
    document.getElementById('message').className = 'error';
  }
};

const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  try {
    await fetchWithAuth(`${API_URLS.auth}/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
  } catch (error) {
    console.log('Logout error:', error);
  }
  clearAuth();
  window.location.href = '/index.html';
};

const loadProducts = async () => {
  const search = document.getElementById('searchInput')?.value || '';
  const category = document.getElementById('categoryFilter')?.value || '';

  try {
    let url = `${API_URLS.products}/products?skip=0&limit=20`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;

    const response = await fetch(url);
    const data = await response.json();

    const container = document.getElementById('productsContainer');
    if (data.products.length === 0) {
      container.innerHTML = '<p>No products found</p>';
      return;
    }

    container.innerHTML = data.products.map(product => `
      <div class="product-card" onclick="window.location.href='/product.html?id=${product._id}'">
        ${product.images.length > 0 ? `<img src="${product.images[0]}" alt="${product.title}">` : '<div style="height:200px;background:#eee;"></div>'}
        <h3>${product.title}</h3>
        <p class="price">$${(product.priceCents / 100).toFixed(2)}</p>
        <p class="stock">${product.stock} in stock</p>
        <button onclick="event.stopPropagation(); addToCart('${product._id}')">Add to Cart</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading products:', error);
    document.getElementById('productsContainer').innerHTML = '<p>Error loading products</p>';
  }
};

const loadProductDetail = async () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    document.getElementById('productDetail').innerHTML = '<p>Product not found</p>';
    return;
  }

  try {
    const response = await fetch(`${API_URLS.products}/products/${productId}`);
    if (!response.ok) throw new Error('Product not found');

    const product = await response.json();

    document.getElementById('productDetail').innerHTML = `
      <div class="product-detail-content">
        ${product.images.length > 0 ? `<img src="${product.images[0]}" alt="${product.title}">` : '<div style="height:400px;background:#eee;"></div>'}
        <div class="product-info">
          <h2>${product.title}</h2>
          <p class="category">${product.category}</p>
          <p class="price">$${(product.priceCents / 100).toFixed(2)}</p>
          <p class="stock">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
          <div class="controls">
            <input type="number" id="quantity" value="1" min="1" max="${product.stock}">
            <button onclick="addToCart('${product._id}')">Add to Cart</button>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading product:', error);
    document.getElementById('productDetail').innerHTML = '<p>Error loading product</p>';
  }
};

const addToCart = async (productId) => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const quantity = parseInt(document.getElementById('quantity')?.value || 1);

  try {
    const response = await fetchWithAuth(`${API_URLS.cart}/cart/add`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });

    if (!response.ok) throw new Error('Failed to add to cart');

    alert('Added to cart!');
  } catch (error) {
    console.error('Error adding to cart:', error);
    alert('Error adding to cart');
  }
};

const loadCart = async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const response = await fetchWithAuth(`${API_URLS.cart}/cart`);
    const cart = await response.json();

    const container = document.getElementById('cartItems');
    if (!cart.items || cart.items.length === 0) {
      container.innerHTML = '<p>Your cart is empty</p>';
      document.getElementById('cartTotal').textContent = '0.00';
      return;
    }

    let total = 0;
    container.innerHTML = cart.items.map(item => {
      const itemTotal = item.priceAtAdd * item.quantity;
      total += itemTotal;
      return `
        <div class="cart-item">
          <div class="cart-item-info">
            <h3>${item.productId}</h3>
            <p class="price">$${(item.priceAtAdd / 100).toFixed(2)} x ${item.quantity}</p>
          </div>
          <div class="cart-item-controls">
            <input type="number" value="${item.quantity}" min="1" onchange="updateCart('${item.productId}', this.value)">
            <button onclick="removeFromCart('${item.productId}')">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('cartTotal').textContent = (total / 100).toFixed(2);
  } catch (error) {
    console.error('Error loading cart:', error);
  }
};

const updateCart = async (productId, quantity) => {
  const token = getToken();
  if (!token) return;

  try {
    await fetchWithAuth(`${API_URLS.cart}/cart/update`, {
      method: 'PUT',
      body: JSON.stringify({ productId, quantity: parseInt(quantity) })
    });
    await loadCart();
  } catch (error) {
    console.error('Error updating cart:', error);
  }
};

const removeFromCart = async (productId) => {
  const token = getToken();
  if (!token) return;

  try {
    await fetchWithAuth(`${API_URLS.cart}/cart/remove`, {
      method: 'DELETE',
      body: JSON.stringify({ productId })
    });
    await loadCart();
  } catch (error) {
    console.error('Error removing from cart:', error);
  }
};

const checkout = async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const cartResponse = await fetchWithAuth(`${API_URLS.cart}/cart`);
    const cart = await cartResponse.json();

    if (!cart.items || cart.items.length === 0) {
      alert('Cart is empty');
      return;
    }

    const address = document.getElementById('address').value || 'Default Address';

    const orderResponse = await fetchWithAuth(`${API_URLS.orders}/orders/create`, {
      method: 'POST',
      body: JSON.stringify({ items: cart.items, shippingAddress: address })
    });

    if (!orderResponse.ok) throw new Error('Failed to create order');

    const order = await orderResponse.json();

    const paymentResponse = await fetchWithAuth(`${API_URLS.orders}/payments/mock`, {
      method: 'POST',
      body: JSON.stringify({ orderId: order._id, amount: order.totalCents })
    });

    if (!paymentResponse.ok) throw new Error('Payment failed');

    alert('Order placed successfully!');
    window.location.href = '/orders.html';
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Checkout failed: ' + error.message);
  }
};

const loadMyOrders = async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const response = await fetchWithAuth(`${API_URLS.orders}/orders/my`);
    const orders = await response.json();

    const container = document.getElementById('ordersContainer');
    if (orders.length === 0) {
      container.innerHTML = '<p>No orders yet</p>';
      return;
    }

    container.innerHTML = orders.map(order => `
      <div class="order-card">
        <h3>Order ${order._id}</h3>
        <p>Total: $${(order.totalCents / 100).toFixed(2)}</p>
        <p>Status: <span class="status ${order.status.toLowerCase()}">${order.status}</span></p>
        <p>Payment: <span class="status ${order.paymentStatus.toLowerCase()}">${order.paymentStatus}</span></p>
        <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading orders:', error);
  }
};

const loadAdminProducts = async () => {
  try {
    const response = await fetch(`${API_URLS.products}/products?limit=100`);
    const data = await response.json();

    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = data.products.map(product => `
      <tr>
        <td>${product.title}</td>
        <td>${product.category}</td>
        <td>$${(product.priceCents / 100).toFixed(2)}</td>
        <td>${product.stock}</td>
        <td>
          <button onclick="deleteProduct('${product._id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading admin products:', error);
  }
};

const addProduct = async () => {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const title = document.getElementById('productTitle').value;
  const category = document.getElementById('productCategory').value;
  const priceCents = parseInt(document.getElementById('productPrice').value);
  const stock = parseInt(document.getElementById('productStock').value);
  const imagesStr = document.getElementById('productImages').value;
  const images = imagesStr.split(',').map(url => url.trim()).filter(url => url);

  if (!title || !category || !priceCents || !stock) {
    alert('All fields required');
    return;
  }

  try {
    const response = await fetchWithAuth(`${API_URLS.products}/products`, {
      method: 'POST',
      body: JSON.stringify({ title, category, priceCents, stock, images })
    });

    if (!response.ok) throw new Error('Failed to add product');

    alert('Product added!');
    document.getElementById('productTitle').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productImages').value = '';
    await loadAdminProducts();
  } catch (error) {
    console.error('Error adding product:', error);
    alert('Error adding product');
  }
};

const deleteProduct = async (productId) => {
  const token = getToken();
  if (!token) return;

  if (!confirm('Delete this product?')) return;

  try {
    const response = await fetchWithAuth(`${API_URLS.products}/products/${productId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete product');

    await loadAdminProducts();
  } catch (error) {
    console.error('Error deleting product:', error);
  }
};

const loadAdminUsers = async () => {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetchWithAuth(`${API_URLS.auth}/admin/users`);
    const users = await response.json();

    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>
          <button onclick="deleteUser('${user._id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading admin users:', error);
  }
};

const deleteUser = async (userId) => {
  const token = getToken();
  if (!token) return;

  if (!confirm('Delete this user?')) return;

  try {
    const response = await fetchWithAuth(`${API_URLS.auth}/admin/users/${userId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete user');

    await loadAdminUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

const loadAdminOrders = async () => {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetchWithAuth(`${API_URLS.orders}/admin/orders`);
    const orders = await response.json();

    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = orders.map(order => `
      <tr>
        <td>${order._id.slice(0, 8)}...</td>
        <td>${order.userId}</td>
        <td>$${(order.totalCents / 100).toFixed(2)}</td>
        <td>
          <select onchange="updateOrderStatus('${order._id}', this.value)">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading admin orders:', error);
  }
};

const updateOrderStatus = async (orderId, status) => {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetchWithAuth(`${API_URLS.orders}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    if (!response.ok) throw new Error('Failed to update order');

    await loadAdminOrders();
  } catch (error) {
    console.error('Error updating order:', error);
  }
};


