import os
import glob
import json
import time
import uuid
from dataclasses import asdict

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

# Tapsilat imports
from tapsilat_py import TapsilatAPI
from tapsilat_py import models as tapsilat_models

# Load environment variables
load_dotenv()

app = Flask(__name__)

def get_base_url():
    """Get base URL automatically from request"""
    return request.host_url.rstrip("/")

def get_api_client():
    """Get API client using either frontend-provided key/url or environment variables"""
    api_key = request.headers.get("X-Api-Key")
    if not api_key:
        api_key = os.getenv("TAPSILAT_API_KEY", "")
    
    api_url = request.headers.get("X-Api-Url")
    if not api_url:
        api_url = os.getenv("TAPSILAT_BASE_URL", "https://panel.tapsilat.dev/api/v1")
        
    return TapsilatAPI(api_key, base_url=api_url)

@app.route("/")
def index():
    return render_template("index.html")

# --- SYSTEM ENDPOINTS ---

@app.route("/api/system/order-statuses", methods=["GET"])
def system_order_statuses():
    try:
        client = get_api_client()
        return jsonify(client.get_system_order_statuses())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/system/basket-item-types", methods=["GET"])
def system_basket_item_types():
    try:
        client = get_api_client()
        return jsonify(client.get_system_basket_item_types())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/system/error-codes", methods=["GET"])
def system_error_codes():
    try:
        client = get_api_client()
        return jsonify(client.get_system_error_codes())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/system/payment-term-statuses", methods=["GET"])
def system_payment_term_statuses():
    try:
        client = get_api_client()
        return jsonify(client.get_system_payment_term_statuses())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/system/product-types", methods=["GET"])
def system_product_types():
    try:
        client = get_api_client()
        return jsonify(client.get_system_product_types())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/system/shortcut-types", methods=["GET"])
def system_shortcut_types():
    try:
        client = get_api_client()
        return jsonify(client.get_system_shortcut_types())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/system/transaction-payment-types", methods=["GET"])
def system_transaction_payment_types():
    try:
        client = get_api_client()
        return jsonify(client.get_system_transaction_payment_types())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/system/transaction-purposes", methods=["GET"])
def system_transaction_purposes():
    try:
        client = get_api_client()
        return jsonify(client.get_system_transaction_purposes())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/system/transaction-statuses", methods=["GET"])
def system_transaction_statuses():
    try:
        client = get_api_client()
        return jsonify(client.get_system_transaction_statuses())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- ORDER ENDPOINTS ---

@app.route("/api/order/conversation/<conversation_id>", methods=["GET"])
def get_order_by_conv(conversation_id):
    try:
        client = get_api_client()
        response = client.get_order_by_conversation_id(conversation_id)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/submerchants", methods=["GET"])
def get_order_submerchants():
    try:
        client = get_api_client()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 10))
        return jsonify(client.get_order_submerchants(page, per_page))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/<reference_id>/checkout-url", methods=["GET"])
def get_checkout_url(reference_id):
    try:
        client = get_api_client()
        return jsonify({"checkout_url": client.get_checkout_url(reference_id)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/payment-details", methods=["POST"])
def get_order_payment_details():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderPaymentDetailDTO(**data)
        return jsonify(client.get_order_payment_details(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/<reference_id>/payment-details", methods=["GET"])
def get_order_payment_details_by_id(reference_id):
    try:
        client = get_api_client()
        return jsonify(client.get_order_payment_details_by_id(reference_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/<reference_id>/status", methods=["GET"])
def get_order_status(reference_id):
    try:
        client = get_api_client()
        return jsonify(client.get_order_status(reference_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/<reference_id>/transactions", methods=["GET"])
def get_order_transactions(reference_id):
    try:
        client = get_api_client()
        return jsonify(client.get_order_transactions(reference_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/manual-callback", methods=["POST"])
def manual_callback():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderManualCallbackDTO(**data)
        return jsonify(client.manual_callback(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/list", methods=["GET"])
def get_orders():
    try:
        client = get_api_client()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 10))
        params = {
            "page": page,
            "per_page": per_page,
            "start_date": request.args.get("start_date", ""),
            "end_date": request.args.get("end_date", ""),
            "organization_id": request.args.get("organization_id", ""),
            "related_reference_id": request.args.get("related_reference_id", ""),
        }
        response = client.get_order_list(**params)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/create", methods=["POST"])
def create_order():
    try:
        data = request.get_json()
        client = get_api_client()
        base_url = get_base_url()

        # Build DTOs from request data
        billing = tapsilat_models.BillingAddressDTO(**data.get("billing_address", {})) if data.get("billing_address") else None
        shipping = tapsilat_models.ShippingAddressDTO(**data.get("shipping_address", {})) if data.get("shipping_address") else None
        buyer = tapsilat_models.BuyerDTO(**data.get("buyer", {}))
        
        basket_items = []
        for item in data.get("basket_items", []):
            if "payer" in item and item["payer"]:
                item["payer"] = tapsilat_models.BasketItemPayerDTO(**item["payer"])
            basket_items.append(tapsilat_models.BasketItemDTO(**item))

        # Collect extra arguments dynamically
        extra_args = {}
        handled_keys = ["amount", "currency", "locale", "buyer", "basket_items", "billing_address", "shipping_address", "payment_success_url", "payment_failure_url"]
        for key, value in data.items():
            if key not in handled_keys:
                if key == "checkout_design" and value:
                    extra_args[key] = tapsilat_models.CheckoutDesignDTO(**value)
                elif key == "consents" and value:
                    extra_args[key] = [tapsilat_models.OrderConsent(**c) for c in value]
                elif key == "metadata" and value:
                    extra_args[key] = [tapsilat_models.MetadataDTO(**m) for m in value]
                elif key == "order_cards" and value:
                    extra_args[key] = [tapsilat_models.OrderCardDTO(**c) for c in value]
                elif key == "payment_terms" and value:
                    extra_args[key] = [tapsilat_models.PaymentTermDTO(**t) for t in value]
                elif key == "pf_sub_merchant" and value:
                    extra_args[key] = tapsilat_models.OrderPFSubMerchantDTO(**value)
                elif key == "sub_organization" and value:
                    extra_args[key] = tapsilat_models.SubOrganizationDTO(**value)
                elif key == "submerchants" and value:
                    extra_args[key] = [tapsilat_models.SubmerchantDTO(**s) for s in value]
                else:
                    extra_args[key] = value

        if "conversation_id" not in extra_args:
            extra_args["conversation_id"] = f"CONV_{int(time.time())}"
        if "external_reference_id" not in extra_args:
            extra_args["external_reference_id"] = f"EXT_{int(time.time())}"
        if "three_d_force" not in extra_args:
            extra_args["three_d_force"] = True

        order_dto = tapsilat_models.OrderCreateDTO(
            amount=float(data["amount"]),
            currency=data.get("currency", "TRY"),
            locale=data.get("locale", "tr"),
            buyer=buyer,
            basket_items=basket_items,
            billing_address=billing,
            shipping_address=shipping,
            payment_success_url=data.get("payment_success_url", f"{base_url}/payment/success"),
            payment_failure_url=data.get("payment_failure_url", f"{base_url}/payment/failure"),
            **extra_args
        )

        response = client.create_order(order_dto)
        return jsonify(response)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/<reference_id>", methods=["GET"])
def get_order_detail(reference_id):
    try:
        client = get_api_client()
        response = client.get_order(reference_id)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/cancel", methods=["POST"])
def cancel_order():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.CancelOrderDTO(reference_id=data["reference_id"])
        return jsonify(client.cancel_order(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/refund", methods=["POST"])
def refund_order():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.RefundOrderDTO(
            reference_id=data["reference_id"],
            amount=float(data["amount"]),
            order_item_id=data.get("order_item_id"),
            order_item_payment_id=data.get("order_item_payment_id")
        )
        return jsonify(client.refund_order(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/refund-all", methods=["POST"])
def refund_all_order():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.RefundAllOrderDTO(reference_id=data["reference_id"])
        return jsonify(client.refund_all_order(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/accounting", methods=["POST"])
def order_accounting():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderAccountingRequest(order_reference_id=data["order_reference_id"])
        return jsonify(client.order_accounting(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/postauth", methods=["POST"])
def order_postauth():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderPostAuthRequest(reference_id=data["reference_id"], amount=float(data["amount"]))
        return jsonify(client.order_postauth(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/payment-options", methods=["PATCH"])
def update_payment_options():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderPaymentOptionsUpdateDTO(**data)
        return jsonify(client.update_payment_options(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/split", methods=["POST"])
def split_order():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.SplitOrderItemPaymentDTO(**data)
        return jsonify(client.split_order_item_payment(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/orders/<order_id>/callback", methods=["GET"])
def order_callback(order_id):
    try:
        client = get_api_client()
        return jsonify(client.order_callback(order_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/orders/<order_id>/vpos-query", methods=["GET"])
def vpos_query(order_id):
    try:
        client = get_api_client()
        return jsonify(client.order_vpos_query(order_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/related", methods=["PATCH"])
def related_update():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderRelatedReferenceDTO(**data)
        return jsonify(client.related_update(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/order/terminate", methods=["POST"])
def terminate_order():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.TerminateRequest(reference_id=data["reference_id"])
        return jsonify(client.terminate_order(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- BASKET ENDPOINTS ---

@app.route("/api/order/basket-item", methods=["POST", "PATCH", "DELETE"])
def basket_item():
    try:
        data = request.get_json()
        client = get_api_client()
        if request.method == "POST":
            item = tapsilat_models.BasketItemDTO(**data["basket_item"])
            req = tapsilat_models.AddBasketItemRequest(order_reference_id=data["order_reference_id"], basket_item=item)
            return jsonify(client.add_basket_item(req))
        elif request.method == "PATCH":
            item = tapsilat_models.BasketItemDTO(**data["basket_item"])
            req = tapsilat_models.UpdateBasketItemRequest(order_reference_id=data["order_reference_id"], basket_item=item)
            return jsonify(client.update_basket_item(req))
        else:
            req = tapsilat_models.RemoveBasketItemRequest(order_reference_id=data["order_reference_id"], basket_item_id=data["basket_item_id"])
            return jsonify(client.remove_basket_item(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- TERM ENDPOINTS ---

@app.route("/api/term", methods=["GET"])
def get_term():
    try:
        client = get_api_client()
        term_reference_id = request.args.get("term_reference_id")
        return jsonify(client.get_order_term(term_reference_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/term/create", methods=["POST"])
def create_term():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderPaymentTermCreateDTO(**data)
        return jsonify(client.create_order_term(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/term/delete", methods=["POST"])
def delete_term():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderPaymentTermDeleteDTO(**data)
        return jsonify(client.delete_order_term(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/term/update", methods=["PATCH"])
def update_term():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderPaymentTermUpdateDTO(**data)
        return jsonify(client.update_order_term(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/term/refund", methods=["POST"])
def refund_term():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrderTermRefundRequest(**data)
        return jsonify(client.refund_order_term(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- ORGANIZATION ENDPOINTS ---

@app.route("/api/organization/limit/user", methods=["GET", "POST"])
def org_limit_user():
    try:
        client = get_api_client()
        if request.method == "GET":
            req = tapsilat_models.GetUserLimitRequest(user_id=request.args.get("user_id"))
            return jsonify(client.get_organization_limit_user(req))
        else:
            data = request.get_json()
            req = tapsilat_models.SetLimitUserRequest(**data)
            return jsonify(client.set_organization_limit_user(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/suborganizations/<id>", methods=["GET"])
def org_suborg_details(id):
    try:
        client = get_api_client()
        return jsonify(client.get_organization_suborganization_details(id))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/suborganizations/<id>/submerchant", methods=["GET"])
def org_suborg_submerchants(id):
    try:
        client = get_api_client()
        return jsonify(client.get_organization_suborganization_submerchants(id))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/currency-presets", methods=["GET"])
def org_currency_presets():
    try:
        client = get_api_client()
        return jsonify(client.get_organization_currency_presets())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/settings", methods=["GET"])
def org_settings():
    try:
        client = get_api_client()
        return jsonify(client.get_organization_settings())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/callback", methods=["GET", "PATCH"])
def org_callback():
    try:
        client = get_api_client()
        if request.method == "GET":
            return jsonify(client.get_organization_callback())
        else:
            data = request.get_json()
            req = tapsilat_models.CallbackURLDTO(**data)
            return jsonify(client.update_organization_callback(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/business/create", methods=["POST"])
def org_business_create():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrgCreateBusinessRequest(**data)
        return jsonify(client.create_organization_business(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/currencies", methods=["GET"])
def org_currencies():
    try:
        client = get_api_client()
        return jsonify(client.get_organization_currencies())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/limits", methods=["GET"])
def org_limits():
    try:
        client = get_api_client()
        return jsonify(client.get_organization_limits())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/vpos", methods=["POST"])
def org_vpos():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.GetVposRequest(currency_id=data["currency_id"])
        return jsonify(client.list_organization_vpos(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/meta/<name>", methods=["GET"])
def org_meta(name):
    try:
        client = get_api_client()
        return jsonify(client.get_organization_meta(name))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/scopes", methods=["GET"])
def org_scopes():
    try:
        client = get_api_client()
        return jsonify(client.get_organization_scopes())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/suborganizations", methods=["GET"])
def org_suborgs():
    try:
        client = get_api_client()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 10))
        return jsonify(client.get_organization_suborganizations(page, per_page))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/user/create", methods=["POST"])
def org_user_create():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrgCreateUserReq(**data)
        return jsonify(client.create_organization_user(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/user/verify", methods=["POST"])
def org_user_verify():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrgUserVerifyReq(**data)
        return jsonify(client.verify_organization_user(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/organization/user/verify-mobile", methods=["POST"])
def org_user_verify_mobile():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.OrgUserMobileVerifyReq(**data)
        return jsonify(client.verify_organization_user_mobile(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- SUBSCRIPTION ENDPOINTS ---

@app.route("/api/subscription/list", methods=["GET"])
def sub_list():
    try:
        client = get_api_client()
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 10))
        return jsonify(client.list_subscriptions(page, per_page))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/subscription", methods=["POST"])
def sub_get():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.SubscriptionGetRequest(**data)
        return jsonify(client.get_subscription(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/subscription/create", methods=["POST"])
def sub_create():
    try:
        data = request.get_json()
        client = get_api_client()
        
        # Build user and billing if provided
        user = tapsilat_models.SubscriptionUser(**data.get("user", {})) if data.get("user") else None
        billing = tapsilat_models.SubscriptionBilling(**data.get("billing", {})) if data.get("billing") else None
        
        req = tapsilat_models.SubscriptionCreateRequest(
            amount=float(data["amount"]),
            currency=data.get("currency", "TRY"),
            title=data.get("title", "Subscription"),
            period=int(data.get("period", 1)),
            user=user,
            billing=billing,
            success_url=f"{get_base_url()}/payment/success",
            failure_url=f"{get_base_url()}/payment/failure"
        )
        return jsonify(client.create_subscription(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/subscription/cancel", methods=["POST"])
def sub_cancel():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.SubscriptionCancelRequest(**data)
        return jsonify(client.cancel_subscription(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/api/subscription/redirect", methods=["POST"])
def sub_redirect():
    try:
        data = request.get_json()
        client = get_api_client()
        req = tapsilat_models.SubscriptionRedirectRequest(**data)
        return jsonify(client.redirect_subscription(req))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# --- CALLBACK & WEBHOOKS ---

@app.route("/payment/success")
@app.route("/payment/failure")
def payment_result():
    return render_template("index.html")

@app.route("/webhook", methods=["POST"])
def handle_webhook():
    payload = request.get_data().decode('utf-8')
    # Save webhook for display
    if not os.path.exists("webhooks"): os.makedirs("webhooks")
    with open(f"webhooks/webhook_{int(time.time())}.json", "w") as f:
        f.write(payload)
    return "OK", 200

@app.route("/api/webhooks/logs", methods=["GET"])
def webhook_logs():
    logs = []
    if os.path.exists("webhooks"):
        files = sorted(glob.glob("webhooks/*.json"), reverse=True)[:20]
        for f in files:
            with open(f, "r") as fh: 
                try:
                    logs.append(json.load(fh))
                except:
                    pass
    return jsonify(logs)

if __name__ == "__main__":
    app.run(debug=True, port=5001)
