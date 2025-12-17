import { TapsilatSDK } from "@tapsilat/tapsilat-js";
import type {
  TapsilatConfig,
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
} from "@tapsilat/tapsilat-js";

// Mock Configuration
const config: TapsilatConfig = {
  bearerToken:
    "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJFbWFpbCI6IkF0YWthbkBhcGkudGFwc2lsYXRkZXYiLCJJRCI6IjQwNTZlNWQyLTc2ZTMtNGZiYS1hNmI1LThjNWVlYjdjNzliOCIsIk9yZ2FuaXphdGlvbklEIjoiMWY5NDVmZjctZDBkOS00M2U3LWI5NjItZGI4YmMzMzViYWFiIiwiT3JnYW5pemF0aW9uIjoiVGFwc2lsYXRERVYiLCJJc09yZ2FuaXphdGlvblVzZXIiOnRydWUsIklwQWRkcmVzcyI6IiIsIkFnZW50IjoiIiwiT3JnVGltZXplb25lIjoiVHVya2V5IiwiSXNBcGlVc2VyIjp0cnVlLCJpc3MiOiJ0YXBzaWxhdCIsImV4cCI6MjYxMDUzMDA1Nn0.rX1lQiUjOWSXea4XuGO1gnu9Ekw2-mCAis-1AuUAkC7p0aTAa9leFvdZJBOphrZ5LcI7SjVgLcj1XEqC9EAmxQ",
  baseURL: "https://panel.tapsilat.dev/api/v1",
  debug: true,
};

const sdk = new TapsilatSDK(config);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const Logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`${colors.green}[INFO]${colors.reset} ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`, ...args);
  },
  header: (message: string) => {
    console.log(`\n${colors.blue}${message}${colors.reset}`);
  },
  general: (message: string) => {
    console.log(`${colors.cyan}[INFO]${colors.reset} ${message}`);
  },
};

async function main() {
  Logger.general("Starting Tapsilat SDK Feature Walkthrough...\n");

  try {
    // 1. Health Check
    Logger.header("--- 1. API Health Check ---");
    try {
      const health = await sdk.healthCheck();
      Logger.info("Health Check Success:", health);
    } catch (e: any) {
      Logger.warn("Health Check Note (Mock):", e.message);
    }
    await sleep(1000);

    // 2. System Order Statuses
    Logger.header("--- 2. Get System Order Statuses ---");
    try {
      const statuses = await sdk.getSystemOrderStatuses();
      Logger.info(
        "Statuses Retrieved:",
        JSON.stringify(statuses).substring(0, 100) + "..."
      );
    } catch (e: any) {
      Logger.warn("Statuses Note:", e.message);
    }
    await sleep(1000);

    // 3. Create Order
    Logger.header("--- 3. Create Order ---");
    const orderRef = `ORD-${Date.now()}`;

    const buyer: Buyer = {
      id: "BYr-1",
      name: "John",
      surname: "Doe",
      email: "john.doe@example.com",
      gsm_number: "+905551234567",
      identity_number: "11111111111",
      registration_address: "Test Mah. Test Sok. No:1",
      city: "Istanbul",
      country: "Turkey",
      zip_code: "34000",
      ip: "127.0.0.1",
    };

    const address: Address = {
      address: "Test Mah. Test Sok. No:1",
      city: "Istanbul",
      country: "Turkey",
      zip_code: "34000",
      contact_name: "John Doe",
    };

    const billingAddress: BillingAddress = {
      ...address,
      billing_type: "PERSONAL",
    };

    const basketItem: BasketItem = {
      id: "ITEM-1",
      name: "Test Product",
      category1: "Electronics",
      item_type: "PHYSICAL",
      price: 100.0,
      quantity: 1,
    };

    const mockOrder: OrderCreateRequest = {
      amount: 100.0,
      currency: "TRY",
      locale: "tr",
      buyer: buyer,
      basket_items: [basketItem],
      shipping_address: address,
      billing_address: billingAddress,
      enabled_installments: [1, 2, 3, 6, 9, 12],
    };

    let createdOrderRef = "";
    let createdOrderId = "";

    try {
      const order = await sdk.createOrder(mockOrder);
      Logger.info("Order Created:", order);
      createdOrderRef = order.reference_id || orderRef;
      createdOrderId = (order as any).order_id || "";
    } catch (e: any) {
      Logger.error("Create Order Failed:", e.message);
      createdOrderRef = orderRef;
      createdOrderId = "mock-order-id"; // Fallback
    }
    await sleep(1000);

    if (createdOrderRef) {
      // 4. Get Checkout URL
      Logger.header("--- 4. Get Checkout URL ---");
      try {
        const checkoutUrl = await sdk.getCheckoutUrl(createdOrderRef);
        Logger.info("Checkout URL:", checkoutUrl);
      } catch (e: any) {
        Logger.warn("Checkout URL Note:", e.message);
      }
      await sleep(1000);

      // 5. Get Order Details
      Logger.header("--- 5. Get Order Details ---");
      try {
        const orderDetails = await sdk.getOrder(createdOrderRef);
        Logger.info("Order Details:", orderDetails ? "Found" : "Not Found");
      } catch (e: any) {
        Logger.warn("Get Order Note:", e.message);
      }
      await sleep(1000);

      // 6. Get Order Status
      Logger.header("--- 6. Get Order Status ---");
      try {
        const status = await sdk.getOrderStatus(createdOrderRef);
        Logger.info("Order Status:", status);
      } catch (e: any) {
        Logger.warn("Order Status Note:", e.message);
      }
      await sleep(1000);

      // 6.1 Order Accounting (New)
      Logger.header("--- 6.1 Order Accounting ---");
      try {
        const accountingReq: OrderAccountingRequest = {
          order_reference_id: createdOrderRef,
        };
        const accRes = await sdk.orderAccounting(accountingReq);
        Logger.info("Order Accounting:", accRes);
      } catch (e: any) {
        Logger.warn("Order Accounting Note:", e.message);
      }
      await sleep(1000);

      // 6.2 Order Post Auth (New)
      Logger.header("--- 6.2 Order Post Auth ---");
      try {
        const postAuthReq: OrderPostAuthRequest = {
          reference_id: createdOrderRef,
          amount: 50.0, // Partial capture example
        };
        const paRes = await sdk.orderPostAuth(postAuthReq);
        Logger.info("Order Post Auth:", paRes);
      } catch (e: any) {
        Logger.warn("Order Post Auth Note:", e.message);
      }
      await sleep(1000);

      // 7. Create Payment Term (Installment) inside Order
      Logger.header("--- 7. Create Payment Term ---");
      const termRef = `TRM-${Date.now()}`;
      try {
        const termPayload: OrderPaymentTermCreateDTO = {
          order_id: createdOrderId,
          term_reference_id: termRef,
          amount: 50.0,
          due_date: new Date(Date.now() + 86400000).toISOString(),
          term_sequence: 1,
          required: true,
          status: "WAITING",
        };

        const term = await sdk.createOrderTerm(termPayload);
        Logger.info("Payment Term Created:", term);
      } catch (e: any) {
        Logger.warn("Create Term Note:", e.message);
      }
      await sleep(1000);

      // 8. Update Payment Term
      Logger.header("--- 8. Update Payment Term ---");
      try {
        const updatePayload: OrderPaymentTermUpdateDTO = {
          term_reference_id: termRef,
          amount: 55.0,
        };
        const updatedTerm = await sdk.updateOrderTerm(updatePayload);
        Logger.info("Payment Term Updated:", updatedTerm);
      } catch (e: any) {
        Logger.warn("Update Term Note:", e.message);
      }
      await sleep(1000);

      // 9. Get Payment Term
      Logger.header("--- 9. Get Payment Term ---");
      try {
        const termDetails = await sdk.getOrderTerm(termRef);
        Logger.info("Payment Term Details:", termDetails);
      } catch (e: any) {
        Logger.warn("Get Term Note:", e.message);
      }
      await sleep(1000);

      // 10. Delete Payment Term
      Logger.header("--- 10. Delete Payment Term ---");
      try {
        const deletePayload: PaymentTermDeleteRequest = {
          term_reference_id: termRef,
        };
        const deleted = await sdk.deleteOrderTerm(deletePayload);
        Logger.info("Payment Term Deleted:", deleted);
      } catch (e: any) {
        Logger.warn("Delete Term Note:", e.message);
      }
      await sleep(1000);

      // 11. Cancel Order
      Logger.header("--- 11. Cancel Order ---");
      try {
        const cancelled = await sdk.cancelOrder(createdOrderRef);
        Logger.info("Order Cancelled:", cancelled);
      } catch (e: any) {
        Logger.warn("Cancel Order Note:", e.message);
      }
      await sleep(1000);
    }

    // 12. List Orders
    Logger.header("--- 12. List Orders ---");
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const orders = await sdk.getOrders({
        start_date: yesterday.toISOString().split("T")[0],
        end_date: tomorrow.toISOString().split("T")[0],
        per_page: 5,
      });

      const orderList =
        (orders as any).data ||
        (orders as any).items ||
        (orders as any).rows ||
        [];

      Logger.info("Orders Listed:", orderList.length, "items");
    } catch (e: any) {
      Logger.warn("List Orders Note:", e.message);
    }
    await sleep(1000);

    // --- Subscription Section ---
    Logger.header("\n--- Subscription Features ---");

    // 13. Create Subscription
    Logger.header("--- 13. Create Subscription ---");
    const subRef = `SUB-${Date.now()}`;
    const mockSub: SubscriptionCreateRequest = {
      title: "Monthly Plan",
      period: 1, // Monthly
      payment_date: new Date().getDate(), // Today
      amount: 99.9,
      currency: "TRY",
      external_reference_id: subRef,
      user: {
        first_name: "Jane",
        last_name: "Doe",
        email: "jane.doe@example.com",
        phone: "+905559876543",
      },
    };

    let createdSubRef = "";
    try {
      const subscription = await sdk.createSubscription(mockSub);
      Logger.info("Subscription Created:", subscription);
      createdSubRef = subscription.reference_id || "";
    } catch (e: any) {
      Logger.warn("Create Subscription Note:", e.message);
      createdSubRef = subRef; // Fallback
    }
    await sleep(1000);

    if (createdSubRef) {
      // 14. Get Subscription Details
      Logger.header("--- 14. Get Subscription Details ---");
      try {
        const subDetails = await sdk.getSubscription({
          reference_id: createdSubRef,
        });
        Logger.info("Subscription Details:", subDetails);
      } catch (e: any) {
        Logger.warn("Get Subscription Note:", e.message);
      }
      await sleep(1000);

      // TODO : Link is not working, check this!
      // 15. Redirect Subscription (Get Payment Link)
      Logger.header("--- 15. Get Subscription Payment Link ---");
      try {
        const redirect = await sdk.redirectSubscription({
          subscription_id: createdSubRef,
        });
        Logger.info("Subscription Payment Link:", redirect);
      } catch (e: any) {
        Logger.warn("Subscription Redirect Note:", e.message);
      }
      await sleep(1000);

      // 16. Cancel Subscription
      Logger.header("--- 16. Cancel Subscription ---");
      try {
        const cancelledSub = await sdk.cancelSubscription({
          reference_id: createdSubRef,
        });
        Logger.info("Subscription Cancelled:", cancelledSub);
      } catch (e: any) {
        Logger.warn("Cancel Subscription Note:", e.message);
      }
      await sleep(1000);
    }

    // 17. List Subscriptions
    Logger.header("--- 17. List Subscriptions ---");
    try {
      const subs = await sdk.listSubscriptions({ per_page: 5 });
      const subList =
        (subs as any).data || (subs as any).items || (subs as any).rows || [];
      Logger.info("Subscriptions Listed:", subList.length, "items");
    } catch (e: any) {
      Logger.warn("List Subscriptions Note:", e.message);
    }

    Logger.general("Walkthrough Completed!");
  } catch (error: any) {
    Logger.error("Critical Error in Walkthrough:", error);
  }
}

main();
