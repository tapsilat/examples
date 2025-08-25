<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Tapsilat\TapsilatAPI;
use Tapsilat\APIException;
use Tapsilat\Models\BuyerDTO;
use Tapsilat\Models\OrderCreateDTO;
use Tapsilat\Models\BasketItemDTO;
use Tapsilat\Models\BasketItemPayerDTO;
use Tapsilat\Models\BillingAddressDTO;
use Tapsilat\Models\ShippingAddressDTO;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Load environment variables from .env file
 */
function loadEnv($path = __DIR__ . '/../.env')
{
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);

        if (!array_key_exists($name, $_ENV)) {
            $_ENV[$name] = $value;
        }
    }
}

/**
 * Get API client
 */
function getApiClient()
{
    // Load .env file
    loadEnv();

    $apiKey = $_ENV['TAPSILAT_API_KEY'] ?? '';
    if (empty($apiKey)) {
        throw new Exception('TAPSILAT_API_KEY is not set in environment variables');
    }

    return new TapsilatAPI($apiKey);
}

/**
 * Validate input data
 */
function validateOrderData($data)
{
    if (empty($data['cart']) || !is_array($data['cart'])) {
        throw new Exception('Cart is empty or invalid');
    }

    if (empty($data['billing']) || !is_array($data['billing'])) {
        throw new Exception('Billing information is missing');
    }

    $required_billing = ['contact_name', 'email', 'contact_phone', 'address', 'city', 'vat_number'];
    foreach ($required_billing as $field) {
        if (empty($data['billing'][$field])) {
            throw new Exception("Missing '$field' field in billing information");
        }
    }

    if (!$data['same_address'] && (empty($data['shipping']) || !is_array($data['shipping']))) {
        throw new Exception('Shipping information is missing');
    }

    // Validate installment
    if (isset($data['installment'])) {
        $allowedInstallments = [1, 2, 3, 6, 12];
        if (!in_array((int)$data['installment'], $allowedInstallments)) {
            throw new Exception('Invalid installment option');
        }
    }

    return true;
}

/**
 * Calculate total amount
 */
function calculateTotal($cartItems)
{
    $total = 0;
    foreach ($cartItems as $item) {
        // Ensure precise calculation by converting to float and rounding
        $itemTotal = round((float)$item['price'] * (int)$item['quantity'], 2);
        $total += $itemTotal;
    }
    return round($total, 2);
}

/**
 * Create basket items for Tapsilat
 */
function createBasketItems($cartItems)
{
    $basketItems = [];

    foreach ($cartItems as $item) {
        $basketItemPayer = new BasketItemPayerDTO(
            null, // address
            $item['id'] . '_payer', // reference_id
            null, // tax_office
            null, // title
            'PERSONAL', // type
            null // vat
        );

        // Convert price to proper format (ensure it's a number with proper precision)
        $unitPrice = round((float) $item['price'], 2);
        $itemQuantity = (int) $item['quantity'];
        // For Tapsilat API, price should be the total price (unit price * quantity)
        $totalPrice = round($unitPrice * $itemQuantity, 2);

        $basketItem = new BasketItemDTO(
            $item['category'], // category1
            null, // category2
            0, // commission_amount
            null, // coupon
            0, // coupon_discount
            json_encode($item), // data
            $item['id'], // id
            'PHYSICAL', // item_type
            $item['name'], // name
            0, // paid_amount
            $basketItemPayer, // payer
            $totalPrice, // price - total price (unit * quantity)
            1 // quantity - always 1 since price is already total
        );

        $basketItems[] = $basketItem;
    }

    return $basketItems;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data');
    }

    // Validate input data
    validateOrderData($data);

    // Get API client
    $client = getApiClient();

    // Create buyer
    $billing = $data['billing'];
    $buyer = new BuyerDTO(
        explode(' ', $billing['contact_name'], 2)[0] ?? $billing['contact_name'], // first_name
        explode(' ', $billing['contact_name'], 2)[1] ?? '', // last_name
        null, // birth_date
        $billing['city'], // city
        'Turkey', // country
        $billing['email'], // email
        $billing['contact_phone'] // gsm_number
    );

    // Create billing address
    $billingAddress = new BillingAddressDTO(
        $billing['address'], // address
        'PERSONAL', // billing_type
        'TC', // citizenship
        $billing['city'], // city
        $billing['contact_name'], // contact_name
        $billing['contact_phone'], // contact_phone
        'Turkey', // country
        null, // district
        null, // tax_office
        $billing['contact_name'], // title
        $billing['vat_number'], // vat_number
        $billing['zip_code'] ?? null // zip_code
    );

    // Create shipping address
    $shipping = $data['same_address'] ? $billing : $data['shipping'];
    $shippingAddress = new ShippingAddressDTO(
        $shipping['address'], // address
        $shipping['city'], // city
        $shipping['contact_name'], // contact_name
        'Turkey', // country
        date('Y-m-d', strtotime('+3 days')), // shipping_date
        'TRACK' . time(), // tracking_code
        $shipping['zip_code'] ?? null // zip_code
    );

    // Create basket items
    $basketItems = createBasketItems($data['cart']);

    // Calculate total
    $total = calculateTotal($data['cart']);

    // Verify basket items total matches order total
    $basketTotal = 0;
    foreach ($basketItems as $item) {
        $itemArray = $item->toArray();
        // Since we're using total price in basket items, quantity is always 1
        $itemTotal = round((float)$itemArray['price'], 2);
        $basketTotal += $itemTotal;
    }
    $basketTotal = round($basketTotal, 2);

    // Use the basket total to ensure consistency
    $finalTotal = $basketTotal;

    // Get selected installment (default to 1 if not provided)
    $selectedInstallment = isset($data['installment']) ? (int)$data['installment'] : 1;

    // Prepare enabled installments based on selection
    $enabledInstallments = $selectedInstallment === 1 ? [1] : [1, 2, 3, 6, 12];

    // Create order with basket items
    $orderPayload = new OrderCreateDTO(
        $finalTotal, // amount - use basket total for consistency
        'TRY', // currency
        'tr', // locale
        $buyer, // buyer
        $basketItems, // basket_items
        $billingAddress, // billing_address
        null, // checkout_design
        null, // conversation_id
        $enabledInstallments, // enabled_installments
        'ORDER_' . time(), // external_reference_id
        null, // metadata
        null, // order_cards
        null, // paid_amount
        null, // partial_payment
        null, // payment_failure_url
        null, // payment_methods
        null, // payment_options
        null, // payment_success_url
        null, // payment_terms
        null, // pf_sub_merchant
        $shippingAddress // shipping_address
    );

    // Create order via Tapsilat API
    $orderResponse = $client->createOrder($orderPayload);

    // Get checkout URL
    $checkoutUrl = $client->getCheckoutUrl($orderResponse->getReferenceId());

    // Return success response
    echo json_encode([
        'success' => true,
        'order_id' => $orderResponse->getOrderId(),
        'reference_id' => $orderResponse->getReferenceId(),
        'checkout_url' => $checkoutUrl,
        'message' => 'Order created successfully'
    ]);

} catch (APIException $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Tapsilat API Error: ' . $e->error,
        'code' => $e->code,
        'status_code' => $e->statusCode
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
