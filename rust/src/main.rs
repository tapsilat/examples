use actix_files as actix_fs;
use actix_web::{web, App, HttpResponse, HttpServer, Responder, middleware};
use chrono::Local;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::io::Write;
use tapsilat::{
    TapsilatClient,
    types::{
        CreateOrderRequest, CreateBuyerRequest, BasketItemDTO, BillingAddressDTO,
        ShippingAddressDTO, MetadataDTO,
        SubscriptionCreateRequest, SubscriptionUser, SubscriptionBilling
    }
};
use tera::Tera;
use uuid::Uuid;

// --- Structs matching Go example ---

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Product {
    id: i32,
    name: String,
    price: f64,
    #[serde(default)]
    description: String,
    #[serde(default)]
    image: String,
    #[serde(default)]
    quantity: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Address {
    #[serde(rename = "contact_name")]
    contact_name: String,
    email: String,
    #[serde(rename = "contact_phone")]
    contact_phone: String,
    address: String,
    city: String,
    #[serde(rename = "zip_code")]
    zip_code: String,
    #[serde(rename = "vat_number")]
    vat_number: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct OrderRequest {
    cart: Vec<Product>,
    #[serde(default)]
    installment: i32,
    #[serde(default, rename = "enabled_installments")]
    enabled_installments: Vec<i32>,
    billing: Address,
    shipping: Option<Address>,
    #[serde(default, rename = "same_address")]
    same_address: bool,
    #[serde(default, rename = "conversation_id")]
    conversation_id: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    locale: String,
    #[serde(default)]
    currency: String,
    #[serde(default, rename = "three_d_force")]
    three_d_force: bool,
    #[serde(default, rename = "payment_methods")]
    payment_methods: bool,
    #[serde(default, rename = "payment_options")]
    payment_options: Vec<String>,
    #[serde(default)]
    metadata: Vec<MetadataDTO>,
}

#[derive(Debug, Serialize)]
struct OrderResponseLocal {
    success: bool,
    #[serde(rename = "checkout_url", skip_serializing_if = "Option::is_none")]
    checkout_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(rename = "reference_id", skip_serializing_if = "Option::is_none")]
    reference_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PaymentResult {
    #[serde(rename = "reference_id")]
    reference_id: Option<String>,
    #[serde(rename = "conversation_id")]
    conversation_id: Option<String>,
    status: Option<String>,
    #[serde(rename = "error_message")]
    error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SubscriptionRequest {
    name: String,
    amount: f64,
    period: i32,
    #[serde(rename = "payment_date")]
    payment_date: i32,
    #[serde(rename = "card_id")]
    card_id: Option<String>,
    #[serde(rename = "subscriber_email")]
    subscriber_email: String,
    #[serde(rename = "subscriber_phone")]
    subscriber_phone: String,
}

#[derive(Debug, Serialize)]
struct SubscriptionResponseLocal {
    success: bool,
    #[serde(rename = "checkout_url", skip_serializing_if = "Option::is_none")]
    checkout_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(rename = "reference_id", skip_serializing_if = "Option::is_none")]
    reference_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CancelRequest {
    reference_id: String,
}

#[derive(Debug, Deserialize)]
struct RefundRequest {
    reference_id: String,
    amount: String, // Go code receives string for amount
}

// --- App State ---
struct AppState {
    client: TapsilatClient,
    tera: Tera,
}

// --- Helpers ---

fn get_base_url(req: &actix_web::HttpRequest) -> String {
    let conn_info = req.connection_info();
    format!("{}://{}", conn_info.scheme(), conn_info.host())
}

fn generate_reference_id(prefix: &str) -> String {
    format!("{}_{}", prefix, Uuid::new_v4().to_string().chars().take(8).collect::<String>())
}

fn generate_conversation_id() -> String {
    let timestamp = Local::now().timestamp();
    let unique_id: String = Uuid::new_v4().to_string().chars().take(8).collect();
    format!("CONV_{}_{}", timestamp, unique_id)
}

fn calculate_total(cart: &[Product]) -> f64 {
    cart.iter().map(|item| item.price * (item.quantity.max(1) as f64)).sum()
}

// --- Handlers ---

async fn index(tera: web::Data<AppState>) -> impl Responder {
    let ctx = tera::Context::new();
    let rendered = tera.tera.render("index.html", &ctx).unwrap_or_else(|e| format!("Template error: {}", e));
    HttpResponse::Ok().content_type("text/html").body(rendered)
}

async fn create_order(
    req: web::Json<OrderRequest>,
    data: web::Data<AppState>,
    http_req: actix_web::HttpRequest,
) -> impl Responder {
    let base_url = get_base_url(&http_req);
    let total = calculate_total(&req.cart);
    let conversation_id = if req.conversation_id.is_empty() {
        generate_conversation_id()
    } else {
        req.conversation_id.clone()
    };

    // Construct basket items
    let basket_items: Vec<BasketItemDTO> = req.cart.iter().map(|item| {
        let total_price = item.price * (item.quantity.max(1) as f64);
        BasketItemDTO {
            id: Some(item.id.to_string()),
            name: Some(item.name.clone()),
            price: Some(total_price),
            quantity: Some(1), // API requires 1 if price is total
            category1: Some("Electronics".to_string()),
            item_type: Some("PHYSICAL".to_string()),
            // Set defaults for others
            category2: None, commission_amount: None, coupon: None, coupon_discount: None,
            data: None, paid_amount: None, payer: None, quantity_float: None, quantity_unit: None, sub_merchant_key: None, sub_merchant_price: None
        }
    }).collect();

    // Determine addresses
    let billing = &req.billing;
    let shipping = if !req.same_address && req.shipping.is_some() {
        req.shipping.as_ref().unwrap()
    } else {
        billing
    };

    // Metadata
    let mut metadata = vec![
        MetadataDTO { key: "cart_items_count".to_string(), value: req.cart.len().to_string() },
        MetadataDTO { key: "selected_installment".to_string(), value: req.installment.to_string() },
        MetadataDTO { key: "same_billing_shipping".to_string(), value: req.same_address.to_string() },
        MetadataDTO { key: "application_name".to_string(), value: "Tapsilat Rust SDK Example".to_string() },
        MetadataDTO { key: "framework".to_string(), value: "Actix-Web".to_string() },
        MetadataDTO { key: "customer_city".to_string(), value: billing.city.clone() },
    ];
    metadata.extend(req.metadata.clone());

    let create_req = CreateOrderRequest {
        amount: total,
        currency: if req.currency.is_empty() { "TRY".to_string() } else { req.currency.clone() },
        locale: if req.locale.is_empty() { "en".to_string() } else { req.locale.clone() },
        conversation_id: Some(conversation_id.clone()),
        external_reference_id: None,
        
        buyer: CreateBuyerRequest {
            name: billing.contact_name.split_whitespace().next().unwrap_or("Customer").to_string(),
            surname: billing.contact_name.split_whitespace().last().unwrap_or("User").to_string(),
            email: Some(billing.email.clone()),
            gsm_number: Some(billing.contact_phone.clone()),
            identity_number: Some(billing.vat_number.clone()),
            registration_address: Some(billing.address.clone()),
            city: Some(billing.city.clone()),
            country: Some("Turkey".to_string()),
            zip_code: Some(billing.zip_code.clone()),
            ip: Some("127.0.0.1".to_string()),
        },
        billing_address: Some(BillingAddressDTO {
            contact_name: Some(billing.contact_name.clone()),
            city: Some(billing.city.clone()),
            country: Some("Turkey".to_string()),
            address: Some(billing.address.clone()),
            zip_code: Some(billing.zip_code.clone()),
            vat_number: Some(billing.vat_number.clone()),
            // Defaults
            billing_type: None, citizenship: None, contact_phone: None, district: None, tax_office: None, title: None,
        }),
        shipping_address: Some(ShippingAddressDTO {
            contact_name: Some(shipping.contact_name.clone()),
            city: Some(shipping.city.clone()),
            country: Some("Turkey".to_string()),
            address: Some(shipping.address.clone()),
            zip_code: Some(shipping.zip_code.clone()),
            // Defaults
            shipping_date: None, tracking_code: None,
        }),
        basket_items: Some(basket_items),
        metadata: Some(metadata),
        payment_success_url: Some(format!("{}/payment/success", base_url)),
        payment_failure_url: Some(format!("{}/payment/failure", base_url)),
        three_d_force: Some(req.three_d_force),
        payment_methods: Some(req.payment_methods),
        payment_options: Some(if req.payment_options.is_empty() { vec!["card".to_string(), "bank_transfer".to_string()] } else { req.payment_options.clone() }),
        enabled_installments: if req.enabled_installments.is_empty() { None } else { Some(req.enabled_installments.clone()) },
        
        // Defaults for others
        checkout_design: None, order_cards: None, paid_amount: None, partial_payment: None, 
        payment_mode: None, payment_terms: None, pf_sub_merchant: None, redirect_failure_url: None, 
        redirect_success_url: None, sub_organization: None, submerchants: None, tax_amount: None,
    };

    match data.client.create_order(create_req) {
        Ok(resp) => {
            let checkout_url = if let Some(url) = resp.checkout_url.clone() {
                Some(url)
            } else if let Some(ref_id) = &resp.reference_id {
                match data.client.get_checkout_url(ref_id) {
                    Ok(url) => Some(url),
                    Err(e) => {
                         eprintln!("Failed to fetch checkout URL for ref {}: {:?}", ref_id, e);
                         None
                    }
                }
            } else {
                None
            };
            
            HttpResponse::Ok().json(OrderResponseLocal {
                success: true,
                checkout_url,
                error: None,
                reference_id: resp.reference_id,
            })
        },
        Err(e) => {
            eprintln!("Error creating order: {:?}", e);
            HttpResponse::InternalServerError().json(OrderResponseLocal {
                success: false,
                checkout_url: None,
                error: Some(format!("Failed to create order: {}", e)),
                reference_id: None,
            })
        }
    }
}

async fn create_subscription(
    req: web::Json<SubscriptionRequest>,
    data: web::Data<AppState>,
    http_req: actix_web::HttpRequest,
) -> impl Responder {
    let base_url = get_base_url(&http_req);
    
    let sub_req = SubscriptionCreateRequest {
        title: Some(req.name.clone()),
        amount: Some(req.amount),
        currency: Some("TRY".to_string()),
        period: Some(req.period),
        payment_date: Some(std::cmp::max(1, req.payment_date)),
        cycle: Some(12),
        success_url: Some(format!("{}/payment/success", base_url)),
        failure_url: Some(format!("{}/payment/failure", base_url)),
        
        user: Some(SubscriptionUser {
            id: Some(generate_reference_id("SUB_USER")),
            first_name: Some("John".to_string()),
            last_name: Some("Doe".to_string()),
            email: Some(req.subscriber_email.clone()),
            phone: Some(req.subscriber_phone.clone()),
            address: Some("Mock Address".to_string()),
            city: Some("Istanbul".to_string()),
            country: Some("Turkey".to_string()),
            zip_code: Some("34000".to_string()),
            // Defaults
            identity_number: Some("11111111111".to_string()),
        }),
        billing: Some(SubscriptionBilling {
            contact_name: Some("John Doe".to_string()),
            country: Some("Turkey".to_string()),
            city: Some("Istanbul".to_string()),
            address: Some("Mock Billing Address".to_string()),
            zip_code: Some("34000".to_string()),
            vat_number: Some("11111111111".to_string()),
        }),
        // Defaults
        card_id: None, external_reference_id: None,
    };

    match data.client.create_subscription(sub_req) {
        Ok(resp) => {
             let mut checkout_url = None;
             if let Some(order_ref) = &resp.order_reference_id {
                 if let Ok(url) = data.client.get_checkout_url(order_ref) {
                     checkout_url = Some(url);
                 }
             }

             HttpResponse::Ok().json(SubscriptionResponseLocal {
                 success: true,
                 reference_id: resp.reference_id,
                 checkout_url,
                 error: None,
             })
        },
        Err(e) => {
            eprintln!("Error creating subscription: {:?}", e);
            HttpResponse::InternalServerError().json(SubscriptionResponseLocal {
                success: false,
                checkout_url: None,
                reference_id: None,
                error: Some(format!("Failed to create subscription: {}", e)),
            })
        }
    }
}

async fn payment_success(
    web::Query(params): web::Query<PaymentResult>,
    data: web::Data<AppState>,
) -> impl Responder {
    let mut ctx = tera::Context::new();
    if let Some(ref_id) = &params.reference_id {
        ctx.insert("ReferenceID", ref_id);
    }
    if let Some(conv_id) = &params.conversation_id {
        ctx.insert("ConversationID", conv_id);
    }
    
    let rendered = data.tera.render("payment_success.html", &ctx).unwrap();
    HttpResponse::Ok().content_type("text/html").body(rendered)
}

async fn payment_failure(
    web::Query(params): web::Query<PaymentResult>,
    data: web::Data<AppState>,
) -> impl Responder {
    let mut ctx = tera::Context::new();
    if let Some(ref_id) = &params.reference_id {
        ctx.insert("ReferenceID", ref_id);
    }
    if let Some(conv_id) = &params.conversation_id {
        ctx.insert("ConversationID", conv_id);
    }
    if let Some(err_msg) = &params.error_message {
        ctx.insert("ErrorMessage", err_msg);
    }

    let rendered = data.tera.render("payment_failure.html", &ctx).unwrap();
    HttpResponse::Ok().content_type("text/html").body(rendered)
}

// --- Order API ---

async fn get_order_list(data: web::Data<AppState>, req: actix_web::HttpRequest) -> impl Responder {
    let query = req.uri().query().unwrap_or("");
    let params: Vec<(String, String)> = actix_web::web::Query::from_query(query).unwrap_or(actix_web::web::Query(vec![])).0;
    
    let page = params.iter().find(|(k, _)| k == "page").and_then(|(_, v)| v.parse().ok()).unwrap_or(1);
    let per_page = params.iter().find(|(k, _)| k == "per_page").and_then(|(_, v)| v.parse().ok()).unwrap_or(10);
    
    match data.client.get_order_list(page, per_page, None) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()}))
    }
}

async fn get_order_details(path: web::Path<String>, data: web::Data<AppState>) -> impl Responder {
    let reference_id = path.into_inner();
    match data.client.get_order(&reference_id) {
        Ok(order) => HttpResponse::Ok().json(order),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

async fn get_order_by_conversation(path: web::Path<String>, data: web::Data<AppState>) -> impl Responder {
    let conversation_id = path.into_inner();
    match data.client.get_order_by_conversation_id(&conversation_id) {
        Ok(resp) => HttpResponse::Ok().json(resp),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

async fn get_order_transactions(path: web::Path<String>, data: web::Data<AppState>) -> impl Responder {
    let reference_id = path.into_inner();
    match data.client.get_order_transactions(&reference_id) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

async fn cancel_order(req: web::Json<CancelRequest>, data: web::Data<AppState>) -> impl Responder {
    match data.client.cancel_order(&req.reference_id) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

async fn refund_order(req: web::Json<RefundRequest>, data: web::Data<AppState>) -> impl Responder {
    let amount = req.amount.parse::<f64>().unwrap_or(0.0);
    use tapsilat::types::RefundOrderRequest as SDKRefundRequest;
    let refund_req = SDKRefundRequest {
        reference_id: req.reference_id.clone(),
        amount,
        order_item_id: None,
        order_item_payment_id: None,
    };
    
    match data.client.refund_order(refund_req) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

// --- Subscription API ---
async fn list_subscriptions(data: web::Data<AppState>) -> impl Responder {
     match data.client.list_subscriptions(1, 20) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()}))
    }
}

    // --- Missing Handlers ---

async fn get_payment_status(path: web::Path<String>, data: web::Data<AppState>) -> impl Responder {
    let reference_id = path.into_inner();
    match data.client.get_order_status(&reference_id) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

async fn get_order_submerchants(data: web::Data<AppState>, req: actix_web::HttpRequest) -> impl Responder {
    let query = req.uri().query().unwrap_or("");
    let params: Vec<(String, String)> = actix_web::web::Query::from_query(query).unwrap_or(actix_web::web::Query(vec![])).0;
    
    let page = params.iter().find(|(k, _)| k == "page").and_then(|(_, v)| v.parse().ok()).unwrap_or(1);
    let per_page = params.iter().find(|(k, _)| k == "per_page").and_then(|(_, v)| v.parse().ok()).unwrap_or(10);
    
    match data.client.get_order_submerchants(page, per_page) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

#[derive(Debug, Deserialize)]
struct CancelSubRequest {
    subscription_id: String,
}

async fn cancel_subscription(req: web::Json<CancelSubRequest>, data: web::Data<AppState>) -> impl Responder {
    use tapsilat::types::SubscriptionCancelRequest as SDKCancelSubReq;
    let cancel_req = SDKCancelSubReq {
        reference_id: Some(req.subscription_id.clone()),
        external_reference_id: None,
    };
    
    match data.client.cancel_subscription(cancel_req) {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"success": true, "message": "Subscription cancelled"})),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

// Term Handlers
async fn get_order_term(path: web::Path<String>, data: web::Data<AppState>) -> impl Responder {
    let reference_id = path.into_inner();
    match data.client.get_order_term(&reference_id) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

async fn create_order_term(req: web::Json<tapsilat::types::OrderPaymentTermCreateDTO>, data: web::Data<AppState>) -> impl Responder {
    match data.client.create_order_term(req.into_inner()) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

#[derive(Debug, Deserialize)]
struct DeleteTermRequest {
    order_id: String,
    term_reference_id: String,
}

async fn delete_order_term(req: web::Json<DeleteTermRequest>, data: web::Data<AppState>) -> impl Responder {
    match data.client.delete_order_term(&req.order_id, &req.term_reference_id) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

async fn update_order_term(req: web::Json<tapsilat::types::OrderPaymentTermUpdateDTO>, data: web::Data<AppState>) -> impl Responder {
    match data.client.update_order_term(req.into_inner()) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

async fn refund_order_term(req: web::Json<tapsilat::types::OrderTermRefundRequest>, data: web::Data<AppState>) -> impl Responder {
    match data.client.refund_order_term(req.into_inner()) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

// Other Order Actions
#[derive(Debug, Deserialize)]
struct TerminateOrderRequest {
    reference_id: String,
}

async fn terminate_order(req: web::Json<TerminateOrderRequest>, data: web::Data<AppState>) -> impl Responder {
    match data.client.order_terminate(&req.reference_id) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

#[derive(Debug, Deserialize)]
struct ManualCallbackRequest {
    reference_id: String,
    conversation_id: Option<String>,
}

async fn manual_callback(req: web::Json<ManualCallbackRequest>, data: web::Data<AppState>) -> impl Responder {
    match data.client.order_manual_callback(&req.reference_id, req.conversation_id.clone()) {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

// --- Webhooks ---

// Save webhook to file
fn save_webhook(type_: &str, body: web::Bytes) {
    let _ = fs::create_dir_all("webhooks");
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let mut rng = rand::thread_rng();
    let rand_suffix = rng.gen_range(0..1000);
    let filename = format!("webhooks/{}_{}_{}.json", timestamp, rand_suffix, type_);
    
    if let Ok(mut file) = fs::File::create(&filename) {
        let _ = file.write_all(&body);
        println!("Webhook saved: {}", filename);
    }
}

async fn get_organization_settings(data: web::Data<AppState>) -> impl Responder {
    match data.client.get_organization_settings() {
        Ok(val) => HttpResponse::Ok().json(val),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({"error": e.to_string()})),
    }
}

async fn webhook_callback(path: web::Path<String>, body: web::Bytes) -> impl Responder {
    let type_ = path.into_inner(); 
    save_webhook(&type_, body);
    HttpResponse::Ok().json(serde_json::json!({"status": "received"}))
}

async fn list_webhooks() -> impl Responder {
    let mut entries = fs::read_dir("webhooks")
        .map(|res| res.map(|e| e.ok()).collect::<Vec<_>>())
        .unwrap_or_default()
        .into_iter()
        .flatten()
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
        .collect::<Vec<_>>();
    
    let mut logs = Vec::new();
    for entry in entries {
        if let Ok(content) = fs::read_to_string(entry.path()) {
            let json_content: serde_json::Value = serde_json::from_str(&content).unwrap_or(serde_json::Value::Null);
            logs.push(serde_json::json!({
                "filename": entry.file_name().to_string_lossy(),
                "content": json_content,
                "raw": content
            }));
        }
    }
    // Reverse simple
    logs.reverse();
    
    HttpResponse::Ok().json(logs)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    env_logger::init();

    let api_key = env::var("TAPSILAT_API_KEY").expect("TAPSILAT_API_KEY must be set");
    let port = env::var("PORT").unwrap_or_else(|_| "5005".to_string());
    
    // Validate that API key is reasonable length for valid config, though Config::new does it too.
    let client = TapsilatClient::from_api_key(api_key).expect("Failed to create client");
    
    let tera = Tera::new("templates/**/*.html").expect("Failed to load templates");
    
    let app_state = web::Data::new(AppState {
        client,
        tera,
    });

    println!("Server starting on port {}", port);
    println!("Application available at: http://localhost:{}", port);

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .wrap(middleware::Logger::default())
            .service(actix_fs::Files::new("/static", "./static"))
            .route("/", web::get().to(index))
            .route("/api", web::post().to(create_order))
            .route("/api/subscription", web::post().to(create_subscription))
            .route("/api/cancel", web::post().to(cancel_order))
            .route("/api/refund", web::post().to(refund_order))
            .route("/payment/success", web::get().to(payment_success))
            .route("/payment/failure", web::get().to(payment_failure))
            .route("/api/order/details/{reference_id}", web::get().to(get_order_details))
            .route("/api/order/conversation/{conversation_id}", web::get().to(get_order_by_conversation))
            .route("/api/order/transactions/{reference_id}", web::get().to(get_order_transactions))
            .route("/api/order/list", web::get().to(get_order_list))
            .route("/api/payment/status/{reference_id}", web::get().to(get_payment_status))
            .route("/api/order/submerchants", web::get().to(get_order_submerchants))
            
            // Subscription
            .route("/api/subscription/list", web::get().to(list_subscriptions))
            .route("/api/subscription/cancel", web::post().to(cancel_subscription))
            
             // Payment Terms
            .route("/api/term/create", web::post().to(create_order_term))
            .route("/api/term/{reference_id}", web::get().to(get_order_term))
            .route("/api/term/delete", web::post().to(delete_order_term))
            .route("/api/term/update", web::post().to(update_order_term))
            .route("/api/term/refund", web::post().to(refund_order_term))

            // Extra
            .route("/api/order/terminate", web::post().to(terminate_order))
            .route("/api/order/manual-callback", web::post().to(manual_callback))
            
            .route("/api/webhooks", web::get().to(list_webhooks))
            .route("/api/callback", web::post().to(|b: web::Bytes| webhook_callback(web::Path::from("success".to_string()), b)))
            .route("/api/fail_callback", web::post().to(|b: web::Bytes| webhook_callback(web::Path::from("fail".to_string()), b)))
            .route("/api/refund_callback", web::post().to(|b: web::Bytes| webhook_callback(web::Path::from("refund".to_string()), b)))
            .route("/api/cancel_callback", web::post().to(|b: web::Bytes| webhook_callback(web::Path::from("cancel".to_string()), b)))
            
            // Organization
            .route("/api/organization/settings", web::get().to(get_organization_settings))
    })
    .bind(format!("0.0.0.0:{}", port))?
    .run()
    .await
}
