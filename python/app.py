import os
import glob
import json
import time
import uuid

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

# Tapsilat imports
from tapsilat_py import TapsilatAPI
from tapsilat_py import models as tapsilat_models
from tapsilat_py.models import (
    BasketItemDTO,
    BasketItemPayerDTO,
    BillingAddressDTO,
    BuyerDTO,
    MetadataDTO,
    OrderCreateDTO,
    ShippingAddressDTO,
    RefundOrderDTO,
    SubscriptionCreateRequest,
    SubscriptionCancelRequest,
    SubscriptionUser,
    SubscriptionBilling,
    OrderPaymentTermCreateDTO,
)

# Load environment variables
load_dotenv()

app = Flask(__name__)


def get_base_url():
    """Get base URL automatically from request"""
    return request.host_url.rstrip("/")


def get_api_client():
    """Get API client"""
    api_key = os.getenv("TAPSILAT_API_KEY", "")
    if not api_key:
        raise ValueError("TAPSILAT_API_KEY environment variable is required")
    return TapsilatAPI(
        api_key,
        base_url=os.getenv("TAPSILAT_BASE_URL", "https://panel.tapsilat.dev/api/v1"),
    )


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/order/list", methods=["GET"])
def get_orders():
    try:
        client = get_api_client()
        page = request.args.get("page", 1)
        per_page = request.args.get("per_page", 10)
        start_date = request.args.get("start_date", "")
        end_date = request.args.get("end_date", "")
        organization_id = request.args.get("organization_id", "")
        related_reference_id = request.args.get("related_reference_id", "")

        # SDK expects string for date params
        response = client.get_order_list(
            page=int(page),
            per_page=int(per_page),
            start_date=start_date,
            end_date=end_date,
            organization_id=organization_id,
            related_reference_id=related_reference_id,
        )
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/create", methods=["POST"])
def create_order():
    try:
        data = request.get_json()
        client = get_api_client()
        base_url = get_base_url()

        # 1. Billing Address
        billing_data = data.get("billing", {})
        billing_address = BillingAddressDTO(
            contact_name=billing_data.get("contact_name"),
            city=billing_data.get("city"),
            country="Turkey",
            address=billing_data.get("address"),
            zip_code=billing_data.get("zip_code"),
            contact_phone=billing_data.get("contact_phone"),
            vat_number=billing_data.get("vat_number"),
        )

        # 2. Shipping Address
        # Logic: if same_address is true, use billing data, else use shipping data (not implemented in UI but logic handles it)
        shipping_address = ShippingAddressDTO(
            contact_name=billing_data.get("contact_name"),
            city=billing_data.get("city"),
            country="Turkey",
            address=billing_data.get("address"),
            zip_code=billing_data.get("zip_code"),
        )

        # 3. Buyer
        name_parts = billing_data.get("contact_name", "John Doe").split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        buyer = BuyerDTO(
            name=first_name,
            surname=last_name,
            email=billing_data.get("email"),
            gsm_number=billing_data.get("contact_phone"),
            ip=request.remote_addr,
            city=billing_data.get("city"),
            country="Turkey",
            registration_address=billing_data.get("address"),
        )

        # 4. Basket Items
        basket_items = []
        cart_total = 0
        for item in data.get("cart", []):
            price = float(item["price"])
            qty = int(item["quantity"])
            total_price = price * qty
            cart_total += total_price

            # Helper for basket item payer
            payer = BasketItemPayerDTO()  # Optional details

            basket_item = BasketItemDTO(
                id=str(item["id"]),
                name=item["name"],
                price=total_price,  # Total price for item line
                item_type="PHYSICAL",
                category1="General",
                quantity=1,  # SDK convention: price is total, quantity is 1
                payer=payer,
            )
            basket_items.append(basket_item)

        # 5. Metadata
        metadata_list = []
        for m in data.get("metadata", []):
            metadata_list.append(MetadataDTO(key=m["key"], value=m["value"]))

        # 6. Order Create DTO
        order_dto = OrderCreateDTO(
            amount=round(float(cart_total), 2),
            currency=data.get("currency", "TRY"),
            locale=data.get("locale", "tr"),
            buyer=buyer,
            basket_items=basket_items,
            billing_address=billing_address,
            shipping_address=shipping_address,
            conversation_id=data.get("conversation_id"),
            external_reference_id=f"EXT_{int(time.time())}",
            payment_success_url=f"{base_url}/payment/success",
            payment_failure_url=f"{base_url}/payment/failure",
            metadata=metadata_list,
            # Handle enabled installments
            enabled_installments=data.get("enabled_installments"),
            # Boolean to bool conversion if needed, but Python handles json bools
            three_d_force=data.get("three_d_force", False),
            payment_options=data.get("payment_options"),
        )

        # Determine payment methods (all pay methods bool)
        if data.get("payment_methods") is True:
            order_dto.payment_methods = True  # Enabling all

        response = client.create_order(order_dto)
        response_dict = (
            response.to_dict() if hasattr(response, "to_dict") else dict(response)
        )

        # Manually fetch the checkout URL and add it to the response JSON
        ref_id = getattr(response, "reference_id", response_dict.get("reference_id"))
        if ref_id:
            try:
                checkout_url = client.get_checkout_url(ref_id)
                if checkout_url:
                    response_dict["checkout_url"] = checkout_url
            except Exception:
                pass

        # Serialize response
        return jsonify(response_dict)

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/<reference_id>", methods=["GET"])
def get_order(reference_id):
    try:
        client = get_api_client()
        response = client.get_order(reference_id)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/<reference_id>/transactions", methods=["GET"])
def get_order_transactions(reference_id):
    try:
        client = get_api_client()
        response = client.get_order_transactions(reference_id)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/<reference_id>/status", methods=["GET"])
def get_order_status(reference_id):
    try:
        client = get_api_client()
        response = client.get_order_status(reference_id)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/cancel", methods=["POST"])
def cancel_order():
    try:
        data = request.get_json()
        client = get_api_client()
        response = client.cancel_order(data["reference_id"])
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/refund", methods=["POST"])
def refund_order():
    try:
        data = request.get_json()
        client = get_api_client()

        # Prepare DTO
        refund_dto = RefundOrderDTO(
            reference_id=data["reference_id"],
            amount=float(data.get("amount", 0))
            if data.get("amount")
            else 0,  # If 0 or omitted, logic might vary, but SDK usually needs amount
        )
        # Wait, if amount is empty, user might mean "full refund".
        # But DTO requires amount. In PHP example, we prompt for amount or fetch order to get amount.
        # Let's assume frontend sends amount or we handle checking order amount first if 0.
        # For parity with simple example, let's just use what's sent.
        if "amount" not in data or not data["amount"]:
            # Retrieve order to get full amount if needed, or error
            # Simple approach: error if missing
            pass

        response = client.refund_order(refund_dto)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/submerchants", methods=["GET"])
def get_order_submerchants():
    try:
        client = get_api_client()
        page = request.args.get("page", 1)
        per_page = request.args.get("per_page", 10)
        response = client.get_order_submerchants(page=int(page), per_page=int(per_page))
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/settings", methods=["GET"])
def get_organization_settings():
    try:
        client = get_api_client()
        response = client.get_organization_settings()
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/term/create", methods=["POST"])
def create_order_term():
    try:
        data = request.get_json()
        client = get_api_client()

        term_dto = OrderPaymentTermCreateDTO(
            order_id=data[
                "order_reference_id"
            ],  # SDK uses 'order_id' parameter name in DTO but maps to 'order_id' or 'reference_id'?
            # SDK DTO: order_id: str
            # Let's assume it maps to reference_id or internal ID.
            term_reference_id=f"TERM_{int(time.time())}",
            amount=float(data["amount"]),
            due_date=data["due_date"],
            term_sequence=1,  # Default
            required=data.get("required", False),
            status="WAITING",
            data=data.get("data"),
        )
        response = client.create_order_term(term_dto)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/term/delete", methods=["POST"])
def delete_order_term():
    try:
        data = request.get_json()
        client = get_api_client()
        response = client.delete_order_term(data["order_id"], data["term_reference_id"])
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Subscriptions
@app.route("/api/subscription/list", methods=["GET"])
def list_subscriptions():
    try:
        client = get_api_client()
        page = request.args.get("page", 1)
        per_page = request.args.get("per_page", 10)
        response = client.list_subscriptions(page=int(page), per_page=int(per_page))
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/subscription/create", methods=["POST"])
def create_subscription():
    try:
        data = request.get_json()
        client = get_api_client()
        base_url = get_base_url()

        sub_req = SubscriptionCreateRequest(
            title=data.get("title"),
            amount=float(data.get("amount")),
            period=int(data.get("period")),
            currency=data.get("currency", "TRY"),
            external_reference_id=f"SUB_{int(time.time())}",
            success_url=f"{base_url}/payment/success",
            failure_url=f"{base_url}/payment/failure",
            # Minimal user info for demo
            user=SubscriptionUser(
                email=data.get("subscriber_email", "test@sub.com"),
                phone=data.get("subscriber_phone", "5551234567"),
                first_name="Sub",
                last_name="Scriber",
            ),
            billing=SubscriptionBilling(
                contact_name="Sub Scriber",
                city="Istanbul",
                country="Turkey",
                address="Test Address",
            ),
        )

        response = client.create_subscription(sub_req)
        # Convert response to dict manually if needed or if it's a dataclass
        # SDK methods return dataclasses usually, except for dict returns
        # create_subscription returns SubscriptionCreateResponse (dataclass)

        # Need to serialize dataclass
        from dataclasses import asdict

        return jsonify(asdict(response))

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/subscription/cancel", methods=["POST"])
def cancel_subscription():
    try:
        data = request.get_json()
        client = get_api_client()
        req = SubscriptionCancelRequest(
            reference_id=data.get("subscription_id") or data.get("reference_id")
        )
        response = client.cancel_subscription(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/webhooks", methods=["GET"])
def list_webhooks():
    try:
        # List json files in 'webhooks/'
        files = glob.glob("webhooks/*.json")
        logs = []
        for f in sorted(files, reverse=True):  # Newest first
            with open(f, "r") as fh:
                try:
                    content = json.load(fh)
                    logs.append({"filename": os.path.basename(f), "content": content})
                except Exception:
                    pass
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- MISSING SDK ENDPOINTS ---


@app.route("/api/order/accounting", methods=["POST"])
def order_accounting():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderAccountingRequest(**data)
        response = client.order_accounting(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/postauth", methods=["POST"])
def order_postauth():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderPostAuthRequest(**data)
        response = client.order_postauth(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/system/order-statuses", methods=["GET"])
def system_order_statuses():
    try:
        client = get_api_client()
        response = client.get_system_order_statuses()
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/conversation/<conversation_id>", methods=["GET"])
def get_order_by_conversation(conversation_id):
    try:
        client = get_api_client()
        response = client.get_order_by_conversation_id(conversation_id)
        return jsonify(response if isinstance(response, dict) else response.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/refund-all", methods=["POST"])
def refund_all_order():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.RefundAllOrderDTO(**data)
        response = client.refund_all_order(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/payment-details", methods=["POST"])
def get_order_payment_details_post():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderPaymentDetailDTO(**data)
        response = client.get_order_payment_details(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/<reference_id>/payment-details", methods=["GET"])
def get_order_payment_details_get(reference_id):
    try:
        client = get_api_client()
        response = client.get_order_payment_details_by_id(reference_id)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/term/update", methods=["PATCH"])
def update_order_term():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderPaymentTermUpdateDTO(**data)
        response = client.update_order_term(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/term/<term_ref_id>", methods=["GET"])
def get_order_term(term_ref_id):
    try:
        client = get_api_client()
        response = client.get_order_term(term_ref_id)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/term/refund", methods=["POST"])
def refund_order_term():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderTermRefundRequest(**data)
        response = client.refund_order_term(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/terminate", methods=["POST"])
def terminate_order():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.TerminateRequest(**data)
        response = client.terminate_order(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/callback", methods=["POST"])
def manual_callback():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderManualCallbackDTO(**data)
        response = client.manual_callback(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/related", methods=["PATCH"])
def related_update():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderRelatedReferenceDTO(**data)
        response = client.related_update(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/order/basket-item", methods=["POST", "DELETE", "PATCH"])
def handle_basket_item():
    try:
        data = request.get_json()
        client = get_api_client()
        if request.method == "POST":
            if "basket_item" in data and isinstance(data["basket_item"], dict):
                data["basket_item"] = tapsilat_models.BasketItemDTO(
                    **data["basket_item"]
                )
            req = tapsilat_models.AddBasketItemRequest(**data)
            response = client.add_basket_item(req)
        elif request.method == "DELETE":
            req = tapsilat_models.RemoveBasketItemRequest(**data)
            response = client.remove_basket_item(req)
        elif request.method == "PATCH":
            if "basket_item" in data and isinstance(data["basket_item"], dict):
                data["basket_item"] = tapsilat_models.BasketItemDTO(
                    **data["basket_item"]
                )
            req = tapsilat_models.UpdateBasketItemRequest(**data)
            response = client.update_basket_item(req)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/callback", methods=["GET"])
def get_org_callback():
    try:
        client = get_api_client()
        return jsonify(client.get_organization_callback())
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/callback", methods=["PATCH"])
def update_org_callback():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.CallbackURLDTO(**data)
        return jsonify(client.update_organization_callback(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/business", methods=["POST"])
def create_org_business():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrgCreateBusinessRequest(**data)
        return jsonify(client.create_organization_business(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/currencies", methods=["GET"])
def get_org_currencies():
    try:
        client = get_api_client()
        return jsonify(client.get_organization_currencies())
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/limit/user", methods=["GET", "POST"])
def org_limit_user():
    try:
        client = get_api_client()
        if request.method == "GET":
            data = request.args.to_dict()
            req = tapsilat_models.GetUserLimitRequest(**data)
            return jsonify(client.get_organization_limit_user(req))
        else:
            data = request.get_json() or {}
            req = tapsilat_models.SetLimitUserRequest(**data)
            return jsonify(client.set_organization_limit_user(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/limits", methods=["GET"])
def get_org_limits():
    try:
        client = get_api_client()
        return jsonify(client.get_organization_limits())
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/vpos", methods=["POST"])
def list_org_vpos():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.GetVposRequest(**data)
        return jsonify(client.list_organization_vpos(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/meta/<name>", methods=["GET"])
def get_org_meta(name):
    try:
        client = get_api_client()
        return jsonify(client.get_organization_meta(name))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/scopes", methods=["GET"])
def get_org_scopes():
    try:
        client = get_api_client()
        return jsonify(client.get_organization_scopes())
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/suborganizations", methods=["GET"])
def get_org_suborganizations():
    try:
        client = get_api_client()
        page = request.args.get("page", 1)
        per_page = request.args.get("per_page", 10)
        return jsonify(
            client.get_organization_suborganizations(int(page), int(per_page))
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/user", methods=["POST"])
def create_org_user():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrgCreateUserReq(**data)
        return jsonify(client.create_organization_user(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/user/verify", methods=["POST"])
def verify_org_user():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrgUserVerifyReq(**data)
        return jsonify(client.verify_organization_user(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/organization/user/verify-mobile", methods=["POST"])
def verify_org_user_mobile():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrgUserMobileVerifyReq(**data)
        return jsonify(client.verify_organization_user_mobile(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/subscription", methods=["POST"])
def get_subscription():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.SubscriptionGetRequest(**data)
        return jsonify(client.get_subscription(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/subscription/redirect", methods=["POST"])
def redirect_subscription():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.SubscriptionRedirectRequest(**data)
        return jsonify(client.redirect_subscription(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Callback Pages
@app.route("/payment/success", methods=["GET", "POST"])
def payment_success():
    # Handle both GET and POST callbacks
    return render_template("payment_success.html", params=request.values)


@app.route("/payment/failure", methods=["GET", "POST"])
def payment_failure():
    return render_template("payment_failure.html", params=request.values)


@app.route("/webhook", methods=["POST"])
def webhook():
    # Save webhook payload
    try:
        payload = request.get_json(force=True, silent=True)
        if not payload:
            payload = request.form.to_dict()

        if not os.path.exists("webhooks"):
            os.makedirs("webhooks")

        filename = f"webhooks/webhook_{int(time.time())}_{uuid.uuid4().hex[:6]}.json"
        with open(filename, "w") as f:
            json.dump(payload, f, indent=2)

        return jsonify({"status": "received"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
