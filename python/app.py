import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

# Tapsilat imports
from tapsilat_py import APIException, TapsilatAPI
from tapsilat_py.models import (
    BasketItemDTO,
    BasketItemPayerDTO,
    BillingAddressDTO,
    BuyerDTO,
    OrderCreateDTO,
    ShippingAddressDTO,
)

# Load environment variables
load_dotenv()

app = Flask(__name__)


def get_api_client():
    """Get API client"""
    api_key = os.getenv("TAPSILAT_API_KEY", "")
    if not api_key:
        raise ValueError("TAPSILAT_API_KEY environment variable is required")

    return TapsilatAPI(api_key)


def validate_order_data(data):
    """Validate input data"""
    if not data.get("cart") or not isinstance(data["cart"], list):
        raise ValueError("Cart information is required")

    if not data.get("billing") or not isinstance(data["billing"], dict):
        raise ValueError("Billing address information is required")

    required_billing = [
        "contact_name",
        "email",
        "contact_phone",
        "address",
        "city",
        "vat_number",
    ]
    for field in required_billing:
        if not data["billing"].get(field):
            raise ValueError(f"{field} field is required")

    if not data.get("same_address", True) and (
        not data.get("shipping") or not isinstance(data["shipping"], dict)
    ):
        raise ValueError("Shipping address information is required")

    # Validate installment
    if "installment" in data:
        try:
            installment = int(data["installment"])
            if installment not in [1, 2, 3, 6, 9, 12]:
                raise ValueError("Invalid installment count")
        except (ValueError, TypeError):
            raise ValueError("Invalid installment count")

    return True


def calculate_total(cart_items):
    """Calculate total amount"""
    total = 0
    for item in cart_items:
        if "price" not in item or "quantity" not in item:
            raise ValueError("Price and quantity information required in cart items")
        total += float(item["price"]) * int(item["quantity"])
    return round(total, 2)


def create_basket_items(cart_items):
    """Create basket items for Tapsilat - PHP compatible version"""
    basket_items = []

    for item in cart_items:
        # Validate required fields
        if not all(key in item for key in ["id", "name", "price", "quantity"]):
            raise ValueError(
                "id, name, price and quantity fields required in cart items"
            )

        # Create basket item payer exactly like PHP
        basket_item_payer = BasketItemPayerDTO(
            address=None,
            reference_id=f"{item['id']}_payer",
            tax_office=None,
            title=None,
            type="PERSONAL",
            vat=None,
        )

        # Convert price to proper format (ensure it's a number with proper precision)
        unit_price = round(float(item["price"]), 2)
        item_quantity = int(item["quantity"])
        # For Tapsilat API, price should be the total price (unit price * quantity)
        total_price = round(unit_price * item_quantity, 2)

        # Create basket item exactly like PHP
        basket_item = BasketItemDTO(
            category1=item.get("category", "Electronics"),
            category2=None,
            commission_amount=0,
            coupon=None,
            coupon_discount=0,
            data=str(item),  # JSON encode equivalent
            id=str(item["id"]),
            item_type="PHYSICAL",
            name=item["name"],
            paid_amount=0,
            payer=basket_item_payer,
            price=total_price,  # total price (unit * quantity)
            quantity=1,  # always 1 since price is already total
        )

        basket_items.append(basket_item)

    return basket_items


@app.route("/")
def index():
    """Main page"""
    return render_template("index.html")


@app.route("/api", methods=["POST"])
def api():
    """API endpoint for order creation"""
    try:
        # Get JSON input
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "message": "JSON data required"}), 400

        # Validate input data
        validate_order_data(data)

        # Get API client
        client = get_api_client()

        # Create buyer - PHP compatible version, Python parameter names
        billing = data["billing"]

        # Split name exactly like PHP does
        name_parts = billing["contact_name"].split(" ", 1)
        first_name = name_parts[0] if name_parts else billing["contact_name"]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        buyer = BuyerDTO(
            name=first_name,  # Python SDK uses 'name'
            surname=last_name,  # Python SDK uses 'surname'
            birth_date=None,
            city=billing["city"],
            country="Turkey",
            email=billing["email"],
            gsm_number=billing["contact_phone"],  # Direct use, same as PHP
            id=None,
            identity_number=None,
            ip=None,
            last_login_date=None,
            registration_address=None,
            registration_date=None,
            title=None,
            zip_code=None,
        )

        # Create billing address - PHP compatible version
        billing_address = BillingAddressDTO(
            address=billing["address"],
            billing_type="PERSONAL",
            citizenship="TC",
            city=billing["city"],
            contact_name=billing["contact_name"],
            contact_phone=billing["contact_phone"],
            country="Turkey",
            district=None,
            tax_office=None,
            title=billing["contact_name"],
            vat_number=billing["vat_number"],
            zip_code=billing.get("zip_code"),
        )

        # Create shipping address - PHP compatible version
        shipping = data["shipping"] if not data.get("same_address", True) else billing
        shipping_address = ShippingAddressDTO(
            address=shipping["address"],
            city=shipping["city"],
            contact_name=shipping["contact_name"],
            country="Turkey",
            shipping_date=None,  # PHP uses date('+3 days') but let's skip for now
            tracking_code=f"TRACK{int(__import__('time').time())}",  # PHP equivalent
            zip_code=shipping.get("zip_code"),
        )

        # Create basket items
        basket_items = create_basket_items(data["cart"])

        # Calculate total exactly like PHP
        # total = calculate_total(data['cart'])  # Not used, keeping for reference

        # Verify basket items total matches order total - PHP compatible
        basket_total = 0
        for item in basket_items:
            # Since we're using total price in basket items, quantity is always 1
            basket_total += item.price
        basket_total = round(basket_total, 2)

        # Use the basket total to ensure consistency - exactly like PHP
        final_total = basket_total

        # Create order with basket items - PHP compatible version but without enabled_installments bug
        import time

        order = OrderCreateDTO(
            amount=final_total,  # use basket total for consistency
            currency="TRY",
            locale="tr",
            buyer=buyer,
            basket_items=basket_items,
            billing_address=billing_address,
            checkout_design=None,
            conversation_id=None,
            # enabled_installments=enabled_installments,  # Commented due to SDK bug
            external_reference_id=f"ORDER_{int(time.time())}",
            metadata=None,
            order_cards=None,
            paid_amount=None,
            partial_payment=None,
            payment_failure_url=None,
            payment_methods=None,
            payment_options=None,
            payment_success_url=None,
            payment_terms=None,
            pf_sub_merchant=None,
            shipping_address=shipping_address,
        )

        # Create order via Tapsilat API - exactly like PHP
        response = client.create_order(order)

        # Get checkout URL like PHP does - using get_checkout_url method
        checkout_url = None
        if hasattr(response, "reference_id") and response.reference_id:
            try:
                # Use get_checkout_url method like in the SDK examples
                checkout_url = client.get_checkout_url(response.reference_id)
            except Exception as e:
                print("Error getting checkout URL:", str(e))

        # Return success response - exactly like PHP response structure
        return jsonify(
            {
                "success": True,
                "order_id": getattr(response, "order_id", None),
                "reference_id": getattr(response, "reference_id", None),
                "checkout_url": checkout_url,
                "message": "Order created successfully",
            }
        )

    except APIException as e:
        # PHP compatible error handling
        return jsonify(
            {
                "success": False,
                "message": f"Tapsilat API Error: {getattr(e, 'error', str(e))}",
                "code": getattr(e, "code", None),
                "status_code": getattr(e, "status_code", None),
            }
        ), 400

    except Exception as e:
        # PHP compatible error handling
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
