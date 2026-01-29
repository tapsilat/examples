<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Tapsilat\TapsilatAPI;
use Tapsilat\Models\OrderCreateDTO;
use Tapsilat\Models\OrderPaymentTermCreateDTO;
use Tapsilat\Models\OrderPaymentTermUpdateDTO;
use Tapsilat\Models\OrderTermRefundRequest;
use Tapsilat\Models\RefundOrderDTO;
use Tapsilat\Models\SubscriptionCreateRequest;
use Tapsilat\Models\SubscriptionCancelRequest;
use Tapsilat\Models\SubscriptionBillingDTO;
use Tapsilat\Models\SubscriptionUserDTO;
use Tapsilat\Models\BuyerDTO;
use Tapsilat\Models\BillingAddressDTO;
use Tapsilat\Models\ShippingAddressDTO;
use Tapsilat\Models\BasketItemDTO;

// Load .env
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Config
$apiKey = $_ENV['TAPSILAT_API_KEY'] ?? '';
$baseUrl = $_SERVER['HTTP_HOST'];
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$appUrl = $protocol . '://' . $baseUrl;

// Initialize Client
$api = new TapsilatAPI($apiKey, 30); // 30s timeout

// Helper Responses
function jsonResponse($data, $status = 200)
{
    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function renderView($view, $data = [])
{
    extract($data);
    include __DIR__ . '/../templates/' . $view;
    exit;
}

// Router
$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($uri, PHP_URL_PATH);

// Simple Routing
if ($path === '/' && $method === 'GET') {
    renderView('index.php', ['title' => 'Tapsilat PHP Dashboard']);
}

// API: Create Order
if ($path === '/api' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    // Map input to OrderCreateDTO
    // Note: The SDK's DTOs might need usage adjustment depending on constructor or setters.
    // Looking at SDK, let's assume standard object property mapping or available methods.

    // Simplification: We map input manually to structures required by SDK
    // The PHP SDK DTOs usually have specific structures. 
    // Let's instantiate and populate.

    $req = new OrderCreateDTO();
    $req->amount = calculateTotal($input['cart']);
    $req->currency = $input['currency'] ?? 'TRY';
    $req->locale = $input['locale'] ?? 'en';
    $req->conversation_id = $input['conversation_id'] ?? generateConversationId();
    $req->enabled_installments = $input['enabled_installments'] ?? [1, 2, 3, 6, 9, 12];

    // Buyer
    $buyer = new BuyerDTO();
    $buyer->name = explode(' ', $input['billing']['contact_name'])[0] ?? 'John';
    $buyer->surname = explode(' ', $input['billing']['contact_name'])[1] ?? 'Doe';
    $buyer->email = $input['billing']['email'];
    $buyer->gsm_number = $input['billing']['contact_phone'];
    $buyer->identity_number = $input['billing']['vat_number'];
    $buyer->registration_address = $input['billing']['address'];
    $buyer->city = $input['billing']['city'];
    $buyer->country = 'Turkey';
    $buyer->zip_code = $input['billing']['zip_code'];
    $buyer->ip = '127.0.0.1';
    $req->buyer = $buyer;

    // Billing
    $billing = new BillingAddressDTO();
    $billing->contact_name = $input['billing']['contact_name'];
    $billing->city = $input['billing']['city'];
    $billing->country = 'Turkey';
    $billing->address = $input['billing']['address'];
    $billing->zip_code = $input['billing']['zip_code'];
    $billing->vat_number = $input['billing']['vat_number'];
    $req->billing_address = $billing;

    // Shipping
    $shippingData = ($input['same_address'] ?? true) ? $input['billing'] : ($input['shipping'] ?? $input['billing']);
    $shipping = new ShippingAddressDTO();
    $shipping->contact_name = $shippingData['contact_name'];
    $shipping->city = $shippingData['city'];
    $shipping->country = 'Turkey';
    $shipping->address = $shippingData['address'];
    $shipping->zip_code = $shippingData['zip_code'];
    $req->shipping_address = $shipping;

    // Items
    $req->basket_items = [];
    foreach ($input['cart'] as $item) {
        $bItem = new BasketItemDTO();
        $bItem->id = (string) $item['id'];
        $bItem->name = $item['name'];
        $bItem->price = $item['price'] * $item['quantity']; // Total price rule
        $bItem->quantity = 1; // Always 1
        $bItem->category1 = 'Electronics';
        $bItem->item_type = 'PHYSICAL';
        $req->basket_items[] = $bItem;
    }

    // URLs
    $req->payment_success_url = $appUrl . '/payment/success';
    $req->payment_failure_url = $appUrl . '/payment/failure';

    // Options
    $req->three_d_force = $input['three_d_force'] ?? false;
    $req->payment_methods = $input['payment_methods'] ?? true;
    $req->payment_options = $input['payment_options'] ?? ['card', 'bank_transfer'];

    try {
        $response = $api->createOrder($req);

        // Checkout URL logic
        $checkoutUrl = $response->getCheckoutUrl();
        // If missing but ref ID exists, try fetching? SDK handles createOrder returns checkoutUrl usually
        // but if strictly referencing Go logic:
        if (empty($checkoutUrl) && $response->getReferenceId()) {
            try {
                $checkoutUrl = $api->getCheckoutUrl($response->getReferenceId());
            } catch (Exception $e) {
            }
        }

        jsonResponse([
            'success' => true,
            'checkout_url' => $checkoutUrl,
            'reference_id' => $response->getReferenceId()
        ]);
    } catch (Exception $e) {
        jsonResponse([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
}

// API: Subscription
if ($path === '/api/subscription' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $sub = new SubscriptionCreateRequest();
    $sub->title = $input['name'];
    $sub->amount = (float) $input['amount'];
    $sub->period = (int) $input['period'];
    $sub->payment_date = (int) ($input['payment_date'] ?? 1);
    $sub->currency = 'TRY';
    $sub->cycle = 12;
    $sub->success_url = $appUrl . '/payment/success';
    $sub->failure_url = $appUrl . '/payment/failure';

    // User
    $user = new SubscriptionUserDTO();
    $user->first_name = 'John';
    $user->last_name = 'Doe';
    $user->email = $input['subscriber_email'];
    $user->phone = $input['subscriber_phone'];
    $user->address = 'Mock Address';
    $user->city = 'Istanbul';
    $user->country = 'Turkey';
    $user->zip_code = '34000';
    $user->identity_number = '11111111111';
    $sub->user = $user; // Note if SDK supports 'user' field properly now. Rust SDK needed a fix. PHP SDK might be similar.

    // Billing
    $billing = new SubscriptionBillingDTO();
    $billing->contact_name = 'John Doe';
    $billing->city = 'Istanbul';
    $billing->country = 'Turkey';
    $billing->address = 'Mock Address';
    $billing->zip_code = '34000';
    $sub->billing = $billing;

    try {
        $response = $api->createSubscription($sub);

        $checkoutUrl = null;
        if ($response->getOrderReferenceId()) {
            try {
                $checkoutUrl = $api->getCheckoutUrl($response->getOrderReferenceId());
            } catch (Exception $e) {
            }
        }

        jsonResponse([
            'success' => true,
            'reference_id' => $response->getReferenceId(),
            'checkout_url' => $checkoutUrl
        ]);
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// Pages: Success/Failure
if ($path === '/payment/success') {
    renderView('payment_success.php', $_GET);
}
if ($path === '/payment/failure') {
    renderView('payment_failure.php', $_GET);
}

// API: List Orders
if ($path === '/api/order/list' && $method === 'GET') {
    try {
        $page = $_GET['page'] ?? 1;
        $perPage = $_GET['per_page'] ?? 10;
        $res = $api->getOrderList($page, $perPage);
        jsonResponse($res);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// API: Get Order
if (preg_match('#^/api/order/details/([^/]+)$#', $path, $matches)) {
    try {
        $res = $api->getOrder($matches[1]);
        jsonResponse($res); // might need serialization if object
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// API: Cancel
if ($path === '/api/cancel' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    try {
        $res = $api->cancelOrder($input['reference_id']);
        jsonResponse($res);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// API: Refund
if ($path === '/api/refund' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    try {
        $dto = new RefundOrderDTO();
        $dto->reference_id = $input['reference_id'];
        $dto->amount = (float) $input['amount'];
        $res = $api->refundOrder($dto);
        jsonResponse($res);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// API: Submerchants
if ($path === '/api/order/submerchants' && $method === 'GET') {
    try {
        $page = $_GET['page'] ?? 1;
        $perPage = $_GET['per_page'] ?? 10;
        $res = $api->getOrderSubmerchants($page, $perPage);
        jsonResponse($res);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// API: Organization Settings
if ($path === '/api/organization/settings' && $method === 'GET') {
    try {
        $res = $api->getOrganizationSettings();
        jsonResponse($res);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// API: Create Term
if ($path === '/api/term/create' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    try {
        $dto = new OrderPaymentTermCreateDTO();
        $dto->order_id = $input['order_reference_id']; // Mapped to order_id
        $dto->amount = (float) $input['amount'];
        $dto->due_date = $input['due_date'];
        $dto->required = $input['required'] ?? false;

        $res = $api->createOrderTerm($dto);
        jsonResponse($res);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// API: Delete Term
if ($path === '/api/term/delete' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    try {
        $res = $api->deleteOrderTerm($input['order_id'], $input['term_reference_id']);
        jsonResponse($res);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

// Webhooks listing
if ($path === '/api/webhooks' && $method === 'GET') {
    $files = glob(__DIR__ . '/../webhooks/*.json');
    $logs = [];
    foreach ($files as $file) {
        $content = file_get_contents($file);
        $logs[] = [
            'filename' => basename($file),
            'content' => json_decode($content),
            'raw' => $content
        ];
    }
    // Sort logic skipped for brevity, files come in fs order
    $logs = array_reverse($logs);
    jsonResponse($logs);
}

// Webhook Callback Receiver
if (preg_match('#^/api/(.+)_callback$#', $path, $matches)) {
    $type = $matches[1]; // success, fail, etc.
    $body = file_get_contents('php://input');

    // Save
    $filename = __DIR__ . '/../webhooks/' . date('Ymd_His') . '_' . rand(100, 999) . '_' . $type . '.json';
    file_put_contents($filename, $body);

    jsonResponse(['status' => 'received']);
}

// Helpers
function calculateTotal($cart)
{
    $total = 0;
    foreach ($cart as $item) {
        $total += $item['price'] * $item['quantity'];
    }
    return $total;
}

function generateConversationId()
{
    return 'CONV_' . time() . '_' . substr(md5(uniqid()), 0, 8);
}

// Fallback
http_response_code(404);
echo "Not Found";


