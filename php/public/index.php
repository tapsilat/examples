<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tapsilat E-Ticaret Sepeti</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .product-card {
            transition: transform 0.2s;
        }
        .product-card:hover {
            transform: translateY(-5px);
        }
        .cart-item {
            border-bottom: 1px solid #eee;
            padding: 15px 0;
        }
        .cart-item:last-child {
            border-bottom: none;
        }
        .quantity-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .quantity-btn {
            width: 30px;
            height: 30px;
            border: 1px solid #ddd;
            background: #f8f9fa;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }
        .quantity-btn:hover {
            background: #e9ecef;
        }
        .step-indicator {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
        }
        .step {
            padding: 10px 20px;
            margin: 0 5px;
            background: #f8f9fa;
            border-radius: 25px;
            position: relative;
        }
        .step.active {
            background: #007bff;
            color: white;
        }
        .step.completed {
            background: #28a745;
            color: white;
        }
        .installment-options .form-check {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
            transition: all 0.2s;
        }
        .installment-options .form-check:hover {
            border-color: #007bff;
            background-color: #f8f9fa;
        }
        .installment-options .form-check-input:checked + .form-check-label {
            color: #007bff;
            font-weight: 600;
        }
        .installment-amount {
            font-size: 0.9em;
            color: #6c757d;
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        <h1 class="text-center mb-4">
            <i class="fas fa-shopping-cart"></i> Tapsilat E-Commerce Cart
        </h1>

        <!-- Step Indicator -->
        <div class="step-indicator">
            <div class="step active" id="step-cart">
                <i class="fas fa-shopping-cart"></i> Cart
            </div>
            <div class="step" id="step-address">
                <i class="fas fa-map-marker-alt"></i> Address Information
            </div>
            <div class="step" id="step-payment">
                <i class="fas fa-credit-card"></i> Payment
            </div>
        </div>

        <!-- Cart Step -->
        <div id="cart-step" class="step-content">
            <div class="row">
                <!-- Products Section -->
                <div class="col-md-8">
                    <h3>Products</h3>
                    <div class="row" id="products-container">
                        <!-- Products will be loaded here -->
                    </div>
                </div>

                <!-- Cart Section -->
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-shopping-cart"></i> My Cart</h5>
                        </div>
                        <div class="card-body">
                            <div id="cart-items">
                                <!-- Cart items will be loaded here -->
                            </div>
                            <hr>

                            <!-- Installment Options -->
                            <div class="mb-3">
                                <label class="form-label"><i class="fas fa-credit-card"></i> Payment Option</label>
                                <div class="installment-options">
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="installment" id="installment-1" value="1" checked>
                                        <label class="form-check-label" for="installment-1">
                                            <strong>Cash Payment</strong> <span class="text-success">(0% commission)</span>
                                        </label>
                                        <div class="installment-amount" id="amount-1"></div>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="installment" id="installment-2" value="2">
                                        <label class="form-check-label" for="installment-2">
                                            <strong>2 Installments</strong>
                                        </label>
                                        <div class="installment-amount" id="amount-2"></div>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="installment" id="installment-3" value="3">
                                        <label class="form-check-label" for="installment-3">
                                            <strong>3 Installments</strong>
                                        </label>
                                        <div class="installment-amount" id="amount-3"></div>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="installment" id="installment-6" value="6">
                                        <label class="form-check-label" for="installment-6">
                                            <strong>6 Installments</strong>
                                        </label>
                                        <div class="installment-amount" id="amount-6"></div>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="installment" id="installment-12" value="12">
                                        <label class="form-check-label" for="installment-12">
                                            <strong>12 Installments</strong>
                                        </label>
                                        <div class="installment-amount" id="amount-12"></div>
                                    </div>
                                </div>
                            </div>

                            <hr>
                            <div class="d-flex justify-content-between">
                                <strong>Total:</strong>
                                <strong id="cart-total">₺0.00</strong>
                            </div>
                            <button class="btn btn-primary w-100 mt-3" id="proceed-to-address" disabled>
                                Continue <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Address Step -->
        <div id="address-step" class="step-content" style="display: none;">
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-file-invoice"></i> Billing Address</h5>
                        </div>
                        <div class="card-body">
                            <form id="billing-form">
                                <div class="mb-3">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" class="form-control" name="contact_name" value="John Doe" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">E-mail *</label>
                                    <input type="email" class="form-control" name="email" value="john.doe@example.com" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Phone *</label>
                                    <input type="tel" class="form-control" name="contact_phone" value="05551234567" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Address *</label>
                                    <textarea class="form-control" name="address" rows="3" required>Besiktas District, Barbaros Boulevard No:123/4</textarea>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">City *</label>
                                        <input type="text" class="form-control" name="city" value="Istanbul" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Postal Code</label>
                                        <input type="text" class="form-control" name="zip_code" value="34353">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tax Number / ID Number *</label>
                                    <input type="text" class="form-control" name="vat_number" value="12345678901" required>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-truck"></i> Shipping Address</h5>
                        </div>
                        <div class="card-body">
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="same-address" checked>
                                <label class="form-check-label" for="same-address">
                                    Same as billing address
                                </label>
                            </div>
                            <form id="shipping-form">
                                <div class="mb-3">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" class="form-control" name="contact_name" value="John Doe" disabled>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Address *</label>
                                    <textarea class="form-control" name="address" rows="3" disabled>Besiktas District, Barbaros Boulevard No:123/4</textarea>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">City *</label>
                                        <input type="text" class="form-control" name="city" value="Istanbul" disabled>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Postal Code</label>
                                        <input type="text" class="form-control" name="zip_code" value="34353" disabled>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Order Summary -->
                    <div class="card mt-3">
                        <div class="card-header">
                            <h5><i class="fas fa-receipt"></i> Order Summary</h5>
                        </div>
                        <div class="card-body">
                            <div id="order-summary">
                                <!-- Order summary will be loaded here -->
                            </div>
                            <hr>
                            <div class="d-flex justify-content-between">
                                <strong>Total:</strong>
                                <strong id="order-total">₺0.00</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mt-3">
                <div class="col-12 text-center">
                    <button class="btn btn-secondary me-2" id="back-to-cart">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <button class="btn btn-success" id="create-order">
                        Complete Order <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Loading Step -->
        <div id="loading-step" class="step-content text-center" style="display: none;">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Your order is being created...</p>
        </div>

        <!-- Error Modal -->
        <div class="modal fade" id="errorModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Hata</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="error-message">
                        <!-- Error message will be shown here -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">OK</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Sample products data
        const products = [
            {
                id: 'product_1',
                name: 'Wireless Bluetooth Headphones',
                price: 299.99,
                icon: 'fas fa-headphones',
                category: 'Electronics',
                description: 'High-quality wireless headphones for superior sound experience'
            },
            {
                id: 'product_2',
                name: 'Smart Watch',
                price: 899.99,
                icon: 'fas fa-clock',
                category: 'Electronics',
                description: 'Advanced smartwatch with comprehensive features'
            },
            {
                id: 'product_3',
                name: 'USB-C Charging Cable',
                price: 79.99,
                icon: 'fas fa-plug',
                category: 'Accessories',
                description: 'Fast charging USB-C cable'
            },
            {
                id: 'product_4',
                name: 'Wireless Charging Pad',
                price: 199.99,
                icon: 'fas fa-battery-half',
                category: 'Accessories',
                description: 'Qi standard wireless charging device'
            },
            {
                id: 'product_5',
                name: 'Bluetooth Speaker',
                price: 449.99,
                icon: 'fas fa-volume-up',
                category: 'Electronics',
                description: 'Powerful bass and crystal clear sound quality'
            }
        ];

        let cart = [];

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            loadProducts();
            updateCartDisplay();
            setupEventListeners();

            // Auto-add some items to cart for quick testing
            setTimeout(() => {
                addToCart('product_1'); // Bluetooth Headphones
                addToCart('product_2'); // Smart Watch
                addToCart('product_3'); // USB-C Cable
                addToCart('product_3'); // USB-C Cable (second item)
            }, 500);
        });

        // Load products
        function loadProducts() {
            const container = document.getElementById('products-container');
            container.innerHTML = '';

            products.forEach(product => {
                const productCard = `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card product-card h-100">
                            <div class="card-img-top d-flex align-items-center justify-content-center" style="height: 200px; background: #f8f9fa;">
                                <i class="${product.icon}" style="font-size: 3rem; color: #6c757d;"></i>
                            </div>
                            <div class="card-body d-flex flex-column">
                                <h6 class="card-title">${product.name}</h6>
                                <p class="card-text small text-muted">${product.description}</p>
                                <div class="mt-auto">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span class="badge bg-secondary">${product.category}</span>
                                        <strong class="text-primary">₺${product.price.toFixed(2)}</strong>
                                    </div>
                                    <button class="btn btn-outline-primary btn-sm w-100" onclick="addToCart('${product.id}')">
                                        <i class="fas fa-cart-plus"></i> Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                container.innerHTML += productCard;
            });
        }

        // Add to cart
        function addToCart(productId) {
            const product = products.find(p => p.id === productId);
            const existingItem = cart.find(item => item.id === productId);

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    quantity: 1
                });
            }

            updateCartDisplay();
        }

        // Remove from cart
        function removeFromCart(productId) {
            cart = cart.filter(item => item.id !== productId);
            updateCartDisplay();
        }

        // Update quantity
        function updateQuantity(productId, change) {
            const item = cart.find(item => item.id === productId);
            if (item) {
                item.quantity += change;
                if (item.quantity <= 0) {
                    removeFromCart(productId);
                } else {
                    updateCartDisplay();
                }
            }
        }

        // Update cart display
        function updateCartDisplay() {
            const cartItems = document.getElementById('cart-items');
            const cartTotal = document.getElementById('cart-total');
            const proceedBtn = document.getElementById('proceed-to-address');

            if (cart.length === 0) {
                cartItems.innerHTML = '<p class="text-muted text-center">Your cart is empty</p>';
                cartTotal.textContent = '₺0.00';
                proceedBtn.disabled = true;
                return;
            }

            let html = '';
            let total = 0;

            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;

                html += `
                    <div class="cart-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${item.name}</h6>
                                <small class="text-muted">${item.category}</small>
                                <div class="quantity-controls mt-2">
                                    <div class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">
                                        <i class="fas fa-minus"></i>
                                    </div>
                                    <span class="mx-2">${item.quantity}</span>
                                    <div class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">
                                        <i class="fas fa-plus"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="text-end">
                                <div class="text-primary fw-bold">₺${itemTotal.toFixed(2)}</div>
                                <button class="btn btn-sm btn-outline-danger mt-1" onclick="removeFromCart('${item.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            cartItems.innerHTML = html;
            cartTotal.textContent = `₺${total.toFixed(2)}`;
            proceedBtn.disabled = false;

            // Update installment amounts
            updateInstallmentAmounts(total);

            // Update order summary if in address step
            updateOrderSummary();
        }

        // Update installment amounts
        function updateInstallmentAmounts(total) {
            // Installment rates (commission rates)
            const installmentRates = {
                1: 0,      // Cash 0%
                2: 0.02,   // 2 installments 2%
                3: 0.03,   // 3 installments 3%
                6: 0.06,   // 6 installments 6%
                12: 0.12   // 12 installments 12%
            };

            [1, 2, 3, 6, 12].forEach(installment => {
                const amountElement = document.getElementById(`amount-${installment}`);
                if (total > 0) {
                    const rate = installmentRates[installment];
                    const totalWithCommission = total * (1 + rate);

                    if (installment === 1) {
                        amountElement.innerHTML = `<strong>₺${total.toFixed(2)}</strong>`;
                    } else {
                        const monthlyAmount = totalWithCommission / installment;
                        amountElement.innerHTML = `
                            <small>
                                ${installment}x ₺${monthlyAmount.toFixed(2)} =
                                <strong>₺${totalWithCommission.toFixed(2)}</strong>
                                ${rate > 0 ? `<span class="text-warning">(+${(rate*100).toFixed(0)}% commission)</span>` : ''}
                            </small>
                        `;
                    }
                } else {
                    amountElement.innerHTML = '';
                }
            });
        }

        // Update order summary
        function updateOrderSummary() {
            const orderSummary = document.getElementById('order-summary');
            const orderTotal = document.getElementById('order-total');

            if (!orderSummary) return;

            let html = '';
            let total = 0;

            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;

                html += `
                    <div class="d-flex justify-content-between mb-2">
                        <span>${item.name} x${item.quantity}</span>
                        <span>₺${itemTotal.toFixed(2)}</span>
                    </div>
                `;
            });

            orderSummary.innerHTML = html;
            orderTotal.textContent = `₺${total.toFixed(2)}`;
        }

        // Setup event listeners
        function setupEventListeners() {
            // Proceed to address
            document.getElementById('proceed-to-address').addEventListener('click', function() {
                showStep('address');
            });

            // Back to cart
            document.getElementById('back-to-cart').addEventListener('click', function() {
                showStep('cart');
            });

            // Same address checkbox
            document.getElementById('same-address').addEventListener('change', function() {
                const shippingInputs = document.querySelectorAll('#shipping-form input, #shipping-form textarea');
                const billingInputs = document.querySelectorAll('#billing-form input, #billing-form textarea');

                if (this.checked) {
                    shippingInputs.forEach((input, index) => {
                        input.disabled = true;
                        if (billingInputs[index]) {
                            input.value = billingInputs[index].value;
                        }
                    });
                } else {
                    shippingInputs.forEach(input => {
                        input.disabled = false;
                    });
                }
            });

            // Sync billing to shipping when same address is checked
            document.querySelectorAll('#billing-form input, #billing-form textarea').forEach(input => {
                input.addEventListener('input', function() {
                    if (document.getElementById('same-address').checked) {
                        const shippingField = document.querySelector(`#shipping-form [name="${this.name}"]`);
                        if (shippingField) {
                            shippingField.value = this.value;
                        }
                    }
                });
            });

            // Create order
            document.getElementById('create-order').addEventListener('click', createOrder);
        }

        // Show step
        function showStep(step) {
            // Hide all steps
            document.querySelectorAll('.step-content').forEach(content => {
                content.style.display = 'none';
            });

            // Reset step indicators
            document.querySelectorAll('.step').forEach(stepEl => {
                stepEl.classList.remove('active', 'completed');
            });

            // Show current step
            document.getElementById(`${step}-step`).style.display = 'block';

            // Update step indicators
            if (step === 'cart') {
                document.getElementById('step-cart').classList.add('active');
            } else if (step === 'address') {
                document.getElementById('step-cart').classList.add('completed');
                document.getElementById('step-address').classList.add('active');
                updateOrderSummary();
            } else if (step === 'payment') {
                document.getElementById('step-cart').classList.add('completed');
                document.getElementById('step-address').classList.add('completed');
                document.getElementById('step-payment').classList.add('active');
            } else if (step === 'loading') {
                document.getElementById('step-cart').classList.add('completed');
                document.getElementById('step-address').classList.add('completed');
                document.getElementById('step-payment').classList.add('active');
            }
        }

        // Create order
        async function createOrder() {
            // Validate billing form
            const billingForm = document.getElementById('billing-form');
            if (!billingForm.checkValidity()) {
                billingForm.reportValidity();
                return;
            }

            // Validate shipping form if not same address
            const sameAddress = document.getElementById('same-address').checked;
            if (!sameAddress) {
                const shippingForm = document.getElementById('shipping-form');
                if (!shippingForm.checkValidity()) {
                    shippingForm.reportValidity();
                    return;
                }
            }

            showStep('loading');

            try {
                // Get selected installment
                const selectedInstallment = document.querySelector('input[name="installment"]:checked').value;

                // Prepare order data
                const billingData = new FormData(billingForm);
                const shippingData = sameAddress ? billingData : new FormData(document.getElementById('shipping-form'));

                const orderData = {
                    cart: cart,
                    billing: Object.fromEntries(billingData),
                    shipping: Object.fromEntries(shippingData),
                    same_address: sameAddress,
                    installment: parseInt(selectedInstallment)
                };

                // Send order to backend
                const response = await fetch('api.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });

                const result = await response.json();

                if (result.success) {
                    // Redirect to checkout URL
                    window.location.href = result.checkout_url;
                } else {
                    throw new Error(result.message || 'An error occurred while creating the order');
                }
            } catch (error) {
                console.error('Order creation error:', error);
                showError(error.message || 'An error occurred while creating the order');
                showStep('address');
            }
        }

        // Show error
        function showError(message) {
            document.getElementById('error-message').textContent = message;
            const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
            errorModal.show();
        }
    </script>
</body>
</html>
