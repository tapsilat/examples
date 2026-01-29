import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import {
  TapsilatSDK,
  OrderCreateRequest,
  SubscriptionCreateRequest,
  OrderPaymentTermCreateDTO,
  OrderPaymentTermUpdateDTO,
  PaymentTermDeleteRequest,
  BasketItem,
  Buyer,
  BillingAddress,
  Address,
  OrderAccountingRequest,
  OrderPostAuthRequest,
  OrderTerminateRequest,
} from "@tapsilat/tapsilat-js";

// -- CONFIGURATION --
const config = {
  bearerToken:
    "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6IkF0YWthbkBhcGkudGFwc2lsYXRkZXYiLCJJRCI6IjQwNTZlNWQyLTc2ZTMtNGZiYS1hNmI1LThjNWVlYjdjNzliOCIsIk9yZ2FuaXphdGlvbklEIjoiMWY5NDVmZjctZDBkOS00M2U3LWI5NjItZGI4YmMzMzViYWFiIiwiT3JnYW5pemF0aW9uIjoiVGFwc2lsYXRERVYiLCJJc09yZ2FuaXphdGlvblVzZXIiOnRydWUsIklwQWRkcmVzcyI6IiIsIkFnZW50IjoiIiwiT3JnVGltZXplb25lIjoiVHVya2V5IiwiSXNBcGlVc2VyIjp0cnVlLCJpc3MiOiJ0YXBzaWxhdCIsImV4cCI6MjYxMDUzMDA1Nn0.rX1lQiUjOWSXea4XuGO1gnu9Ekw2-mCAis-1AuUAkC7p0aTAa9leFvdZJBOphrZ5LcI7SjVgLcj1XEqC9EAmxQ",
  baseURL: "https://panel.tapsilat.dev/api/v1",
  debug: true,
};

const sdk = new TapsilatSDK(config);
const app = express();
const PORT = process.env.PORT || 8080;

// -- MIDDLEWARE --
app.use(cors());
app.use(bodyParser.json());

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, "../public")));

// -- API ROUTES --

// 1. Create Order
app.post("/api/order", async (req, res) => {
  try {
    const data = req.body;

    // Map frontend data to SDK Request
    const buyer: Buyer = {
      id: "BYr-" + Date.now(),
      name: data.billing.contact_name?.split(" ")[0] || "John",
      surname: data.billing.contact_name?.split(" ")[1] || "Doe",
      identity_number: data.billing.vat_number || "11111111111",
      email: data.billing.email || "test@example.com",
      gsm_number: data.billing.contact_phone || "+905555555555",
      registration_address: data.billing.address || "Test Adres",
      city: data.billing.city || "Istanbul",
      country: "Turkey",
      zip_code: data.billing.zip_code || "34000",
      ip: "127.0.0.1",
    };

    const address: Address = {
      contact_name: data.billing.contact_name,
      address: data.billing.address,
      city: data.billing.city,
      country: "Turkey",
      zip_code: data.billing.zip_code,
    };

    const basketItems: BasketItem[] = data.cart.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      category1: "General",
      item_type: "PHYSICAL",
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity),
    }));

    const orderRequest: OrderCreateRequest = {
      amount: basketItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      currency: data.currency,
      locale: data.locale,
      conversation_id: data.conversation_id,
      buyer: buyer,
      billing_address: { ...address, billing_type: "PERSONAL" },
      shipping_address: data.same_address ? address : address, // Simplify for demo
      basket_items: basketItems,
      payment_options: data.payment_options,
      enabled_installments: data.enabled_installments,
      three_d_force: data.three_d_force,
      payment_methods: data.payment_methods,
      payment_success_url: "https://tapsilat.dev/success",
      payment_failure_url: "https://tapsilat.dev/fail",
    };

    const response = await sdk.createOrder(orderRequest);
    const checkoutUrl = await sdk.getCheckoutUrl(response.reference_id);

    res.json({ ...response, checkout_url: checkoutUrl });
  } catch (error: any) {
    console.error("Create Order Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// 2. List Orders
app.get("/api/order/list", async (req, res) => {
  try {
    const params: any = {
      page: parseInt(req.query.page as string) || 1,
      per_page: parseInt(req.query.per_page as string) || 10,
    };
    if (req.query.start_date) params.start_date = req.query.start_date;
    if (req.query.end_date) params.end_date = req.query.end_date;
    if (req.query.organization_id)
      params.organization_id = req.query.organization_id;
    if (req.query.related_reference_id)
      params.related_reference_id = req.query.related_reference_id;

    const result = await sdk.getOrders(params);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Order Details
app.get("/api/order/details/:ref", async (req, res) => {
  try {
    const order = await sdk.getOrder(req.params.ref);
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get Transactions
app.get("/api/order/transactions/:ref", async (req, res) => {
  try {
    const txs = await sdk.getOrderTransactions(req.params.ref);
    res.json(txs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Cancel Order
app.post("/api/cancel", async (req, res) => {
  try {
    const result = await sdk.cancelOrder(req.body.reference_id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Refund Order
app.post("/api/refund", async (req, res) => {
  try {
    const { reference_id, amount } = req.body;
    if (amount) {
      const result = await sdk.refundOrder({
        reference_id,
        amount: parseFloat(amount),
      });
      res.json(result);
    } else {
      const result = await sdk.refundAllOrder(reference_id);
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Payment Terms
app.post("/api/order/term", async (req, res) => {
  try {
    // Note: SDK requires order_id (UUID), but frontend often works with reference_id.
    // In a real app, you'd lookup the order ID from reference_id first.
    // implementing simplified wrapper here assuming we have IDs or adapting.

    // For this demo, if order_id is missing but we have reference_id, we might need to fetch order first.
    // The Frontend 'createTerm' passes order_reference_id.

    // If SDK createOrderTerm accepts DTO with order_id, we need that UUID.
    // Hack: We'll fetch the order to get the ID.
    if (req.body.order_reference_id && !req.body.order_id) {
      const order = await sdk.getOrder(req.body.order_reference_id);
      req.body.order_id = (order as any).order_id; // Assuming type overlap or any cast
    }

    const termData: OrderPaymentTermCreateDTO = {
      order_id: req.body.order_id,
      term_reference_id: "TRM-" + Date.now(),
      amount: req.body.amount,
      due_date: req.body.due_date,
      term_sequence: 1, // simplified
      required: req.body.required,
      status: "WAITING",
    };

    const result = await sdk.createOrderTerm(termData);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/order/term/delete", async (req, res) => {
  try {
    const result = await sdk.deleteOrderTerm({
      term_reference_id: req.body.term_reference_id,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Subscriptions
app.post("/api/subscription", async (req, res) => {
  try {
    const data: SubscriptionCreateRequest = {
      title: req.body.title || "My Subscription",
      period: req.body.period,
      payment_date: new Date().getDate(),
      amount: req.body.amount,
      currency: "TRY",
      external_reference_id: "SUB-" + Date.now(),
      user: {
        first_name: "John",
        last_name: "Doe",
        email: req.body.subscriber_email,
        phone: req.body.subscriber_phone,
      },
    };

    const sub = await sdk.createSubscription(data);
    const redirect = await sdk.redirectSubscription({
      subscription_id: sub.reference_id,
    });

    res.json({ ...sub, checkout_url: redirect.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/subscription/list", async (req, res) => {
  try {
    const list = await sdk.listSubscriptions({ per_page: 20 });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/subscription/cancel", async (req, res) => {
  try {
    const result = await sdk.cancelSubscription({
      reference_id: req.body.subscription_id,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Submerchants
app.get("/api/order/submerchants", async (req, res) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      per_page: parseInt(req.query.per_page as string) || 10,
    };
    const result = await sdk.getOrderSubmerchants(params);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Organization Settings
app.get("/api/organization/settings", async (req, res) => {
  try {
    const settings = await sdk.getOrganizationSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Webhooks
const webhooks: any[] = [];
app.post("/api/webhook", (req, res) => {
  webhooks.unshift({
    filename: `HOOK-${Date.now()}`,
    content: req.body,
    created_at: new Date(),
  });
  // Keep last 50
  if (webhooks.length > 50) webhooks.pop();
  res.json({ success: true });
});

app.get("/api/webhooks", (req, res) => {
  res.json(webhooks);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
