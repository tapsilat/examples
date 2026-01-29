package com.tapsilat.example.controller;

import com.tapsilat.TapsilatClient;
import com.tapsilat.builder.OrderRequestBuilder;
import com.tapsilat.exception.TapsilatException;
import com.tapsilat.model.common.*;
import com.tapsilat.model.order.*;
import com.tapsilat.model.subscription.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tapsilat.model.common.Metadata;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ApiController {

    @Autowired
    private TapsilatClient tapsilatClient;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String WEBHOOK_DIR = "webhooks";

    @PostMapping("/order")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> data, HttpServletRequest request) {
        String baseUrl = resolveBaseUrl(request);
        try {
            Map<String, Object> billingData = (Map<String, Object>) data.get("billing");
            List<Map<String, Object>> cartItems = (List<Map<String, Object>>) data.get("cart");

            // Buyer Mapping
            String contactName = (String) billingData.get("contact_name");
            String[] names = contactName.split(" ", 2);
            Buyer buyer = new Buyer(names[0], names.length > 1 ? names[1] : "User", (String) billingData.get("email"));
            buyer.setGsmNumber((String) billingData.get("contact_phone"));
            buyer.setIdentityNumber((String) billingData.get("vat_number"));
            buyer.setCity((String) billingData.get("city"));
            buyer.setRegistrationAddress((String) billingData.get("address"));
            buyer.setZipCode((String) billingData.get("zip_code"));
            buyer.setCountry("Turkey");

            // Basket Items Mapping
            List<BasketItem> basketItems = new ArrayList<>();
            BigDecimal total = BigDecimal.ZERO;
            for (Map<String, Object> item : cartItems) {
                BigDecimal price = new BigDecimal(item.get("price").toString());
                int qty = Integer.parseInt(item.get("quantity").toString());
                total = total.add(price.multiply(BigDecimal.valueOf(qty)));

                BasketItem bItem = new BasketItem();
                bItem.setId(UUID.randomUUID().toString().substring(0, 8));
                bItem.setName((String) item.get("name"));
                bItem.setPrice(price.doubleValue());
                bItem.setQuantity(qty);
                bItem.setItemType("PHYSICAL");
                basketItems.add(bItem);
            }

            OrderRequestBuilder builder = OrderRequestBuilder.newBuilder()
                    .amount(total)
                    .currency((String) data.getOrDefault("currency", "TRY"))
                    .locale((String) data.getOrDefault("locale", "tr"))
                    .buyer(buyer)
                    .description((String) data.getOrDefault("description", "Dashboard Order"))
                    .conversationId((String) data.getOrDefault("conversation_id", "CONV_" + System.currentTimeMillis()))
                    .callbackUrl(baseUrl + "/api/callback")
                    .paymentSuccessUrl(baseUrl + "/payment/success")
                    .paymentFailureUrl(baseUrl + "/payment/failure")
                    .threeDForce(Boolean.TRUE.equals(data.get("three_d_force")))
                    .basketItems(basketItems);

            // Handle payment_methods if it's sent as a list or boolean
            // Handle payment_methods if it's sent as a list or boolean
            Object pm = data.get("payment_methods");
            if (pm instanceof List) {
                builder.paymentOptions((List<String>) pm);
            } else if (Boolean.TRUE.equals(pm)) {
                builder.paymentMethods(true);
            }

            if (data.containsKey("payment_options") && data.get("payment_options") instanceof List) {
                builder.paymentOptions((List<String>) data.get("payment_options"));
            }

            if (data.containsKey("enabled_installments")) {
                builder.enabledInstallments((List<Integer>) data.get("enabled_installments"));
            }

            // Optional Shipping Address logic
            if (data.containsKey("shipping") && !Boolean.TRUE.equals(data.get("same_address"))) {
                Map<String, Object> shippingData = (Map<String, Object>) data.get("shipping");
                ShippingAddress shipping = new ShippingAddress();
                String shipName = (String) shippingData.get("contact_name");
                shipping.setContactName(shipName);
                shipping.setCity((String) shippingData.get("city"));
                shipping.setCountry("Turkey");
                shipping.setAddress((String) shippingData.get("address"));
                shipping.setZipCode((String) shippingData.get("zip_code"));
                builder.shippingAddress(shipping);
            } else {
                // Use billing as shipping if same_address or no shipping provided
                ShippingAddress shipping = new ShippingAddress();
                shipping.setContactName(contactName);
                shipping.setCity(buyer.getCity());
                shipping.setCountry(buyer.getCountry());
                shipping.setAddress(buyer.getRegistrationAddress());
                shipping.setZipCode(buyer.getZipCode());
                builder.shippingAddress(shipping);
            }

            // Metadata
            builder.metadata("cart_items_count", String.valueOf(cartItems.size()));
            if (data.containsKey("installment")) {
                builder.metadata("selected_installment", data.get("installment").toString());
            }
            builder.metadata("application_name", "Tapsilat Java SDK Example");

            OrderResponse response = tapsilatClient.orders().create(builder.build());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("reference_id", response.getReferenceId());
            result.put("checkout_url", response.getCheckoutUrl());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/order/list")
    public ResponseEntity<?> listOrders(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer per_page,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date,
            @RequestParam(required = false) String organization_id,
            @RequestParam(required = false) String related_reference_id,
            @RequestParam(required = false) String buyer_id) {
        try {
            // Convert empty strings to null for the SDK to ignore them
            String start = (start_date != null && !start_date.isEmpty()) ? start_date : null;
            String end = (end_date != null && !end_date.isEmpty()) ? end_date : null;
            String org = (organization_id != null && !organization_id.isEmpty()) ? organization_id : null;
            String related = (related_reference_id != null && !related_reference_id.isEmpty()) ? related_reference_id
                    : null;
            String buyer = (buyer_id != null && !buyer_id.isEmpty()) ? buyer_id : null;

            Map<String, Object> response = tapsilatClient.orders().list(page, per_page, start, end, org, related,
                    buyer);
            System.out.println("Fetched " + (response.containsKey("data") ? ((List<?>) response.get("data")).size() : 0)
                    + " orders.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/order/details/{ref}")
    public ResponseEntity<?> getOrder(@PathVariable String ref) {
        try {
            return ResponseEntity.ok(tapsilatClient.orders().get(ref));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/order/conversation/{conversationId}")
    public ResponseEntity<?> getOrderByConversation(@PathVariable String conversationId) {
        try {
            return ResponseEntity.ok(tapsilatClient.orders().getByConversationId(conversationId));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/order/transactions/{referenceId}")
    public ResponseEntity<?> getOrderTransactions(@PathVariable String referenceId) {
        try {
            return ResponseEntity.ok(tapsilatClient.orders().getTransactions(referenceId));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/payment/status/{referenceId}")
    public ResponseEntity<?> getPaymentStatus(@PathVariable String referenceId) {
        try {
            return ResponseEntity.ok(tapsilatClient.orders().getStatus(referenceId));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/order/submerchants")
    public ResponseEntity<?> getOrderSubmerchants(@RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer per_page) {
        try {
            return ResponseEntity.ok(tapsilatClient.orders().getSubmerchants(page, per_page));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/order/terminate")
    public ResponseEntity<?> terminateOrder(@RequestBody Map<String, String> req) {
        try {
            return ResponseEntity.ok(tapsilatClient.orders().terminate(req.get("reference_id")));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/order/manual-callback")
    public ResponseEntity<?> manualCallback(@RequestBody Map<String, String> req) {
        try {
            OrderManualCallbackRequest cbReq = new OrderManualCallbackRequest();
            cbReq.setReferenceId(req.get("reference_id"));
            cbReq.setConversationId(req.get("conversation_id"));
            return ResponseEntity.ok(tapsilatClient.orders().manualCallback(cbReq));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/order/cancel")
    public ResponseEntity<?> cancelOrder(@RequestBody Map<String, String> req) {
        try {
            return ResponseEntity.ok(tapsilatClient.orders().cancel(req.get("reference_id")));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/order/refund")
    public ResponseEntity<?> refundOrder(@RequestBody Map<String, Object> req) {
        try {
            RefundOrderRequest refundReq = new RefundOrderRequest();
            refundReq.setReferenceId((String) req.get("reference_id"));
            if (req.containsKey("amount")) {
                refundReq.setAmount(new BigDecimal(req.get("amount").toString()));
            }
            return ResponseEntity.ok(tapsilatClient.orders().refund(refundReq));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/subscription")
    public ResponseEntity<?> createSub(@RequestBody Map<String, Object> data, HttpServletRequest request) {
        String baseUrl = resolveBaseUrl(request);
        try {
            SubscriptionCreateRequest subReq = new SubscriptionCreateRequest();
            subReq.setTitle((String) data.get("name"));
            subReq.setAmount(new BigDecimal(data.get("amount").toString()));
            subReq.setPeriod(Integer.parseInt(data.getOrDefault("period", "1").toString()));
            subReq.setCurrency("TRY");
            subReq.setSuccessUrl(baseUrl + "/payment/success");
            subReq.setFailureUrl(baseUrl + "/payment/failure");

            SubscriptionUser user = new SubscriptionUser();
            user.setEmail((String) data.get("subscriber_email"));
            user.setPhone((String) data.get("subscriber_phone"));
            user.setFirstName("Subscriber");
            user.setLastName("User");
            subReq.setUser(user);

            return ResponseEntity.ok(tapsilatClient.subscriptions().create(subReq));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/subscription/list")
    public ResponseEntity<?> listSubs(@RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer per_page) {
        try {
            return ResponseEntity.ok(tapsilatClient.subscriptions().list(page, per_page));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/subscription/cancel")
    public ResponseEntity<?> cancelSub(@RequestBody Map<String, String> req) {
        try {
            SubscriptionCancelRequest cancelReq = new SubscriptionCancelRequest();
            cancelReq.setReferenceId(req.get("subscription_id"));
            return ResponseEntity.ok(tapsilatClient.subscriptions().cancel(cancelReq));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/term/create")
    public ResponseEntity<?> createTerm(@RequestBody Map<String, Object> data) {
        try {
            OrderPaymentTermCreateRequest req = new OrderPaymentTermCreateRequest();
            req.setOrderId((String) data.get("reference_id"));
            req.setAmount(new BigDecimal(data.get("amount").toString()));
            req.setDueDate((String) data.get("due_date"));
            return ResponseEntity.ok(tapsilatClient.orders().createTerm(req));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/term/{referenceId}")
    public ResponseEntity<?> getTerm(@PathVariable String referenceId) {
        try {
            return ResponseEntity.ok(tapsilatClient.orders().getTerm(referenceId));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/term/delete")
    public ResponseEntity<?> deleteTerm(@RequestBody Map<String, String> req) {
        try {
            return ResponseEntity
                    .ok(tapsilatClient.orders().deleteTerm(req.get("order_id"), req.get("term_reference_id")));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/term/update")
    public ResponseEntity<?> updateTerm(@RequestBody Map<String, Object> data) {
        try {
            OrderPaymentTermUpdateRequest req = new OrderPaymentTermUpdateRequest();
            req.setTermReferenceId((String) data.get("term_reference_id"));
            if (data.containsKey("amount")) {
                req.setAmount(new BigDecimal(data.get("amount").toString()));
            }
            if (data.containsKey("due_date")) {
                req.setDueDate((String) data.get("due_date"));
            }
            return ResponseEntity.ok(tapsilatClient.orders().updateTerm(req));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/term/refund")
    public ResponseEntity<?> refundTerm(@RequestBody Map<String, Object> data) {
        try {
            OrderTermRefundRequest req = new OrderTermRefundRequest();
            req.setReferenceId((String) data.get("term_reference_id"));
            if (data.containsKey("amount")) {
                req.setAmount(new BigDecimal(data.get("amount").toString()));
            }
            return ResponseEntity.ok(tapsilatClient.orders().refundTerm(req));
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @GetMapping("/term/scan")
    public ResponseEntity<?> scanTerms() {
        try {
            Map<String, Object> orders = tapsilatClient.orders().list(1, 20, null, null, null, null, null);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    @PostMapping("/callback")
    public ResponseEntity<?> callback(@RequestBody String body) {
        saveWebhook(body, "callback");
        return ResponseEntity.ok(Collections.singletonMap("status", "ok"));
    }

    @GetMapping("/webhooks")
    public ResponseEntity<?> getWebhooks() throws IOException {
        Path path = Paths.get(WEBHOOK_DIR);
        if (!Files.exists(path))
            return ResponseEntity.ok(Collections.emptyList());

        return ResponseEntity.ok(Files.list(path)
                .filter(f -> f.toString().endsWith(".json"))
                .sorted(Comparator.comparingLong(f -> f.toFile().lastModified() * -1))
                .limit(20)
                .map(f -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("filename", f.getFileName().toString());
                    try {
                        String content = Files.readString(f);
                        item.put("raw", content);
                        item.put("content", objectMapper.readValue(content, Object.class));
                    } catch (Exception e) {
                        item.put("error", e.getMessage());
                    }
                    return item;
                }).collect(Collectors.toList()));
    }

    private void saveWebhook(String body, String type) {
        try {
            Files.createDirectories(Paths.get(WEBHOOK_DIR));
            String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            Files.writeString(Paths.get(WEBHOOK_DIR, ts + "_" + type + ".json"), body);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private String resolveBaseUrl(HttpServletRequest request) {
        return request.getRequestURL().toString().replace(request.getRequestURI(), "");
    }

    @GetMapping("/organization/settings")
    public ResponseEntity<?> getOrganizationSettings() {
        try {
            return ResponseEntity.ok(tapsilatClient.orders().getOrganizationSettings());
        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    private ResponseEntity<?> error(String msg) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", false);
        res.put("message", msg);
        return ResponseEntity.badRequest().body(res);
    }
}
