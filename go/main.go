package main

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"tapsilat-go-example/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/tapsilat/tapsilat-go"
)

// Product represents a product in the catalog
type Product struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
	Image       string  `json:"image"`
	Quantity    int     `json:"quantity,omitempty"`
}

// Address represents billing/shipping address
type Address struct {
	ContactName  string `json:"contact_name" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	ContactPhone string `json:"contact_phone" binding:"required"`
	Address      string `json:"address" binding:"required"`
	City         string `json:"city" binding:"required"`
	ZipCode      string `json:"zip_code"`
	VatNumber    string `json:"vat_number" binding:"required"`
}

// OrderRequest represents the order creation request
type OrderRequest struct {
	Cart                []Product                `json:"cart" binding:"required"`
	Installment         int                      `json:"installment"`
	EnabledInstallments []int                    `json:"enabled_installments"`
	Billing             Address                  `json:"billing" binding:"required"`
	Shipping            *Address                 `json:"shipping,omitempty"`
	SameAddress         bool                     `json:"same_address"`
	ConversationID      string                   `json:"conversation_id"`
	Description         string                   `json:"description"`
	Locale              string                   `json:"locale"`
	Currency            string                   `json:"currency"`
	ThreeDForce         bool                     `json:"three_d_force"`
	PaymentMethods      bool                     `json:"payment_methods"`
	PaymentOptions      []string                 `json:"payment_options"`
	Metadata            []tapsilat.OrderMetadata `json:"metadata"`
}

// OrderResponse represents the order creation response
type OrderResponse struct {
	Success     bool   `json:"success"`
	CheckoutURL string `json:"checkout_url,omitempty"`
	Error       string `json:"error,omitempty"`
	ReferenceID string `json:"reference_id,omitempty"`
}

// PaymentResult represents payment callback data
type PaymentResult struct {
	ReferenceID    string `form:"reference_id"`
	ConversationID string `form:"conversation_id"`
	Status         string `form:"status"`
	ErrorMessage   string `form:"error_message"`
}

// SubscriptionRequest represents subscription creation request
type SubscriptionRequest struct {
	Name            string  `json:"name"`
	Amount          float64 `json:"amount"`
	Period          int     `json:"period"` // 1: Monthly, etc.
	PaymentDate     int     `json:"payment_date"`
	CardID          string  `json:"card_id,omitempty"`
	SubscriberEmail string  `json:"subscriber_email"`
	SubscriberPhone string  `json:"subscriber_phone"`
}

// SubscriptionResponse represents subscription creation response
type SubscriptionResponse struct {
	Success     bool   `json:"success"`
	CheckoutURL string `json:"checkout_url,omitempty"` // For subscriptions, this might be a redirect URL
	Error       string `json:"error,omitempty"`
	ReferenceID string `json:"reference_id,omitempty"`
}

var utilsInstance *utils.Utils

func init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	utilsInstance = utils.NewUtils()
}

func main() {
	// Set Gin mode
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.DebugMode)
	}

	// Create Gin router
	r := gin.Default()

	// Load HTML templates
	r.LoadHTMLGlob("templates/*")

	// Serve static files
	r.Static("/static", "./static")

	// Routes
	r.GET("/", indexHandler)
	r.POST("/api", createOrderHandler)
	r.POST("/api/subscription", createSubscriptionHandler)
	r.POST("/api/cancel", cancelOrderHandler)
	r.POST("/api/refund", refundOrderHandler)
	r.GET("/payment/success", paymentSuccessHandler)
	r.GET("/payment/failure", paymentFailureHandler)
	r.GET("/api/payment/status/:reference_id", getPaymentStatusHandler)
	r.GET("/api/order/conversation/:conversation_id", getOrderByConversationIDHandler)
	r.GET("/api/order/details/:reference_id", getOrderDetailsHandler)
	r.GET("/api/order/transactions/:reference_id", getOrderTransactionsHandler)
	r.GET("/api/order/list", getOrderListHandler)
	r.GET("/api/order/submerchants", getOrderSubmerchantsHandler)

	// Subscription API
	r.GET("/api/subscription/list", listSubscriptionsHandler)
	r.POST("/api/subscription/cancel", cancelSubscriptionHandler)

	// Payment Terms API
	r.POST("/api/term/create", createOrderTermHandler)
	r.GET("/api/term/:reference_id", getOrderTermHandler)
	r.POST("/api/term/delete", deleteOrderTermHandler)
	r.POST("/api/term/update", updateOrderTermHandler)
	r.POST("/api/term/refund", refundOrderTermHandler)

	// Additional Order Management
	r.POST("/api/order/terminate", terminateOrderHandler)
	r.POST("/api/order/manual-callback", manualCallbackHandler)
	r.GET("/api/organization/settings", getOrganizationSettingsHandler)

	// Ensure webhooks directory exists
	if _, err := os.Stat("webhooks"); os.IsNotExist(err) {
		os.Mkdir("webhooks", 0755)
	}

	// Webhook Handlers - Save to File
	webhookHandler := func(c *gin.Context) {
		body, _ := io.ReadAll(c.Request.Body)
		timestamp := time.Now().Format("20060102_150405")
		// Use a random suffix to avoid collision in same second
		randSuffix := time.Now().UnixNano() % 1000
		filename := fmt.Sprintf("webhooks/%s_%d_%s.json", timestamp, randSuffix, c.Param("type"))

		err := os.WriteFile(filename, body, 0644)
		if err != nil {
			fmt.Println("Error writing webhook file:", err)
		} else {
			fmt.Println("Webhook saved:", filename)
		}

		c.JSON(http.StatusOK, gin.H{"status": "received"})
	}

	r.POST("/api/callback", func(c *gin.Context) { c.AddParam("type", "success"); webhookHandler(c) })
	r.POST("/api/fail_callback", func(c *gin.Context) { c.AddParam("type", "fail"); webhookHandler(c) })
	r.POST("/api/refund_callback", func(c *gin.Context) { c.AddParam("type", "refund"); webhookHandler(c) })
	r.POST("/api/cancel_callback", func(c *gin.Context) { c.AddParam("type", "cancel"); webhookHandler(c) })

	// List Recorded Webhooks
	r.GET("/api/webhooks", func(c *gin.Context) {
		files, err := os.ReadDir("webhooks")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Sort files by mod time desc (newest first)
		// ReadDir returns by name, which involves timestamp so it's roughly sorted, but let's just reverse iterate or sort
		// For simplicity, we just list them.

		type WebhookLog struct {
			Filename string      `json:"filename"`
			Content  interface{} `json:"content"`
			Raw      string      `json:"raw"`
		}

		var logs []WebhookLog
		// Loop backwards to show newest first? Or just sort later.
		for i := len(files) - 1; i >= 0; i-- {
			file := files[i]
			if file.IsDir() || filepath.Ext(file.Name()) != ".json" {
				continue
			}
			content, _ := os.ReadFile("webhooks/" + file.Name())
			var data interface{}
			json.Unmarshal(content, &data) // Try to parse JSON

			logs = append(logs, WebhookLog{
				Filename: file.Name(),
				Content:  data,
				Raw:      string(content),
			})
		}
		c.JSON(http.StatusOK, logs)
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5005"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("Application available at: http://localhost:%s", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

// indexHandler serves the main page
func indexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", gin.H{
		"title": "Tapsilat E-Commerce Cart",
	})
}

// createOrderHandler handles order creation
func createOrderHandler(c *gin.Context) {
	var req OrderRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utilsInstance.LogError("Invalid request data", err.Error())
		c.JSON(http.StatusBadRequest, OrderResponse{
			Success: false,
			Error:   "Invalid request data: " + err.Error(),
		})
		return
	}

	// Validate order data
	if err := validateOrderData(req); err != nil {
		utilsInstance.LogError("Order validation failed", err.Error())
		c.JSON(http.StatusBadRequest, OrderResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	// Get API client
	apiClient, err := getAPIClient()
	if err != nil {
		utilsInstance.LogError("Failed to create API client", err.Error())
		c.JSON(http.StatusInternalServerError, OrderResponse{
			Success: false,
			Error:   "Internal server error",
		})
		return
	}

	// Calculate total
	total := calculateTotal(req.Cart)

	// Create reference and conversation IDs
	referenceID := utilsInstance.GenerateReferenceID("ORDER")
	conversationID := generateConversationID()

	// Get base URL
	baseURL := getBaseURL(c.Request)

	// Create order
	order := createTapsilatOrder(req, total, referenceID, conversationID, baseURL)

	// Submit order to Tapsilat
	response, err := apiClient.CreateOrder(c.Request.Context(), order)
	if err != nil {
		utilsInstance.LogError("Tapsilat API error", map[string]interface{}{
			"error":           err.Error(),
			"reference_id":    referenceID,
			"conversation_id": conversationID,
		})
		c.JSON(http.StatusInternalServerError, OrderResponse{
			Success: false,
			Error:   "Failed to create order: " + err.Error(),
		})
		return
	}

	// Get checkout URL like Python/PHP implementations
	var checkoutURL string
	if response.ReferenceID != "" {
		checkoutURL, err = apiClient.GetCheckoutURL(c.Request.Context(), response.ReferenceID)
		if err != nil {
			log.Printf("Warning: Failed to get checkout URL: %v", err)
			// Continue anyway - some implementations might not need checkout URL
		}
	}

	log.Printf("Order created successfully: %s", response.ReferenceID)

	c.JSON(http.StatusOK, OrderResponse{
		Success:     true,
		CheckoutURL: checkoutURL,
		ReferenceID: response.ReferenceID,
	})
}

// paymentSuccessHandler handles successful payment callback
func paymentSuccessHandler(c *gin.Context) {
	var result PaymentResult
	c.ShouldBind(&result)

	log.Printf("Payment success callback: %+v", result)

	c.HTML(http.StatusOK, "payment_success.html", gin.H{
		"ReferenceID":    result.ReferenceID,
		"ConversationID": result.ConversationID,
	})
}

// paymentFailureHandler handles failed payment callback
func paymentFailureHandler(c *gin.Context) {
	var result PaymentResult
	c.ShouldBind(&result)

	log.Printf("Payment failure callback: %+v", result)

	c.HTML(http.StatusOK, "payment_failure.html", gin.H{
		"ReferenceID":    result.ReferenceID,
		"ConversationID": result.ConversationID,
		"ErrorMessage":   result.ErrorMessage,
	})
}

// getPaymentStatusHandler gets payment status
func getPaymentStatusHandler(c *gin.Context) {
	referenceID := c.Param("reference_id")

	if referenceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reference ID is required"})
		return
	}

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	status, err := apiClient.GetOrderStatus(c.Request.Context(), referenceID)
	if err != nil {
		utilsInstance.LogError("Failed to get order status", map[string]interface{}{
			"reference_id": referenceID,
			"error":        err.Error(),
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get order status"})
		return
	}

	c.JSON(http.StatusOK, status)
}

// getOrderByConversationIDHandler gets order by conversation ID
func getOrderByConversationIDHandler(c *gin.Context) {
	conversationID := c.Param("conversation_id")

	if conversationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Conversation ID is required"})
		return
	}

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	order, err := apiClient.GetOrderByConversationID(c.Request.Context(), conversationID)
	if err != nil {
		utilsInstance.LogError("Failed to get order by conversation ID", map[string]interface{}{
			"conversation_id": conversationID,
			"error":           err.Error(),
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get order details"})
		return
	}

	c.JSON(http.StatusOK, order)
}

// getOrderDetailsHandler gets detailed order information
func getOrderDetailsHandler(c *gin.Context) {
	referenceID := c.Param("reference_id")

	if referenceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reference ID is required"})
		return
	}

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	order, err := apiClient.GetOrder(c.Request.Context(), referenceID)
	if err != nil {
		utilsInstance.LogError("Failed to get order details", map[string]interface{}{
			"reference_id": referenceID,
			"error":        err.Error(),
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get order details"})
		return
	}

	c.JSON(http.StatusOK, order)
}

// Helper functions

func getAPIClient() (*tapsilat.API, error) {
	apiKey := os.Getenv("TAPSILAT_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TAPSILAT_API_KEY environment variable is required")
	}

	// Use the original Tapsilat API endpoint
	return tapsilat.NewAPI(apiKey), nil
}

func validateOrderData(req OrderRequest) error {
	if len(req.Cart) == 0 {
		return fmt.Errorf("cart cannot be empty")
	}

	if req.Installment < 1 || req.Installment > 12 {
		return fmt.Errorf("installment must be between 1 and 12")
	}

	// Basic validation without Turkish-specific checks
	if req.Billing.ContactPhone == "" {
		return fmt.Errorf("phone number is required")
	}

	if req.Billing.VatNumber == "" {
		return fmt.Errorf("vat number is required")
	}

	return nil
}

// createSubscriptionHandler handles subscription creation
func createSubscriptionHandler(c *gin.Context) {
	var req SubscriptionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, SubscriptionResponse{
			Success: false,
			Error:   "Invalid request data: " + err.Error(),
		})
		return
	}

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, SubscriptionResponse{
			Success: false,
			Error:   "Internal server error",
		})
		return
	}

	baseURL := getBaseURL(c.Request)
	subscription := createTapsilatSubscription(req, baseURL)

	response, err := apiClient.CreateSubscription(c.Request.Context(), subscription)
	if err != nil {
		utilsInstance.LogError("Tapsilat Subscription API error", err.Error())
		c.JSON(http.StatusInternalServerError, SubscriptionResponse{
			Success: false,
			Error:   "Failed to create subscription: " + err.Error(),
		})
		return
	}

	// If success, check for OrderReferenceID to get payment URL
	var checkoutURL string
	if response.OrderReferenceID != "" {
		url, err := apiClient.GetCheckoutURL(c.Request.Context(), response.OrderReferenceID)
		if err == nil {
			checkoutURL = url
		} else {
			// Log warning but don't fail, maybe manual redirect needed?
			utilsInstance.LogError("Failed to get subscription checkout URL", err.Error())
		}
	}

	c.JSON(http.StatusOK, SubscriptionResponse{
		Success:     true,
		ReferenceID: response.ReferenceID,
		CheckoutURL: checkoutURL,
	})
}

func createTapsilatSubscription(req SubscriptionRequest, baseURL string) tapsilat.SubscriptionCreateRequest {
	return tapsilat.SubscriptionCreateRequest{
		Title:    req.Name,
		Amount:   req.Amount,
		Currency: "TRY",
		Period:   req.Period,
		PaymentDate: func() int {
			if req.PaymentDate < 1 {
				return 1
			}
			return req.PaymentDate
		}(),
		Cycle:      12, // Default 1 year
		SuccessURL: fmt.Sprintf("%s/payment/success", baseURL),
		FailureURL: fmt.Sprintf("%s/payment/failure", baseURL),
		User: tapsilat.SubscriptionUser{
			FirstName:      "John",
			LastName:       "Doe",
			Email:          req.SubscriberEmail,
			Phone:          req.SubscriberPhone,
			Address:        "Mock Address",
			City:           "Istanbul",
			Country:        "Turkey",
			ZipCode:        "34000",
			IdentityNumber: "11111111111",
		},
		Billing: tapsilat.SubscriptionBilling{
			ContactName: "John Doe",
			Country:     "Turkey",
			City:        "Istanbul",
			Address:     "Mock Billing Address",
			ZipCode:     "34000",
		},
	}
}

func calculateTotal(cart []Product) float64 {
	total := 0.0
	for _, item := range cart {
		total += item.Price * float64(item.Quantity)
	}
	return total
}

func createTapsilatOrder(req OrderRequest, total float64, referenceID, conversationID, baseURL string) tapsilat.Order {
	// Create basket items - match Python/PHP implementation
	basketItems := make([]tapsilat.OrderBasketItem, 0, len(req.Cart))
	for _, item := range req.Cart {
		// Calculate total price for this item (unit price * quantity)
		totalPrice := item.Price * float64(item.Quantity)
		// Set quantity to 1 since price is already total - this is key for Tapsilat API
		quantity := 1

		basketItems = append(basketItems, tapsilat.OrderBasketItem{
			Id:        strconv.Itoa(item.ID),
			Name:      item.Name,
			Price:     totalPrice, // Total price (unit * quantity)
			Quantity:  &quantity,  // Always 1 since price is total
			Category1: "Electronics",
			Category2: "",
			ItemType:  "PHYSICAL",
		})
	}

	// Create shipping address (same as billing if not specified)
	shippingAddress := req.Billing
	if !req.SameAddress && req.Shipping != nil {
		shippingAddress = *req.Shipping
	}

	// Create metadata
	metadata := []tapsilat.OrderMetadata{
		{Key: "cart_items_count", Value: strconv.Itoa(len(req.Cart))},
		{Key: "selected_installment", Value: strconv.Itoa(req.Installment)},
		{Key: "same_billing_shipping", Value: strconv.FormatBool(req.SameAddress)},
		{Key: "application_name", Value: "Tapsilat Go SDK Example"},
		{Key: "framework", Value: "Gin"},
		{Key: "customer_city", Value: req.Billing.City},
	}
	if len(req.Metadata) > 0 {
		metadata = append(metadata, req.Metadata...)
	}

	// Create order
	order := tapsilat.Order{
		Locale:            "en",
		Currency:          "TRY",
		Amount:            total,
		ConversationID:    conversationID, // This default overwritten if req has it? No, passed as arg.
		PaymentSuccessUrl: fmt.Sprintf("%s/payment/success", baseURL),
		PaymentFailureUrl: fmt.Sprintf("%s/payment/failure", baseURL),
		Buyer: tapsilat.OrderBuyer{
			Id:                  generateBuyerID(),
			Name:                extractFirstName(req.Billing.ContactName),
			Surname:             extractLastName(req.Billing.ContactName),
			Email:               req.Billing.Email,
			GsmNumber:           req.Billing.ContactPhone,
			IdentityNumber:      req.Billing.VatNumber,
			RegistrationAddress: req.Billing.Address,
			City:                req.Billing.City,
			Country:             "Turkey",
			ZipCode:             getZipCode(req.Billing.ZipCode),
			Ip:                  "127.0.0.1",
		},
		BillingAddress: tapsilat.OrderBillingAddress{
			ContactName: req.Billing.ContactName,
			City:        req.Billing.City,
			Country:     "Turkey",
			Address:     req.Billing.Address,
			ZipCode:     getZipCode(req.Billing.ZipCode),
			VatNumber:   req.Billing.VatNumber,
		},
		ShippingAddress: tapsilat.OrderShippingAddress{
			ContactName: shippingAddress.ContactName,
			City:        shippingAddress.City,
			Country:     "Turkey",
			Address:     shippingAddress.Address,
			ZipCode:     getZipCode(shippingAddress.ZipCode),
		},
		BasketItems:         basketItems,
		Metadata:            metadata,
		ThreeDForce:         true,                              // Mock default: 3D Secure forced turned off
		PaymentMethods:      true,                              // Mock default: Show all payment methods or specific logic
		PaymentOptions:      []string{"card", "bank_transfer"}, // Mock default: Available payment options
		EnabledInstallments: []int{1, 2, 3, 6, 9, 12},          // Mock default: All installments enabled
	}

	// Overrides
	if req.ConversationID != "" {
		order.ConversationID = req.ConversationID
	}
	if req.Locale != "" {
		order.Locale = req.Locale
	}
	if req.Currency != "" {
		order.Currency = req.Currency
	}
	if len(req.EnabledInstallments) > 0 {
		order.EnabledInstallments = req.EnabledInstallments
	}
	if len(req.PaymentOptions) > 0 {
		order.PaymentOptions = req.PaymentOptions
	}
	// Note: Boolean fields like ThreeDForce are harder to check "if set" without pointers.
	// Assuming if the frontend sends them, we want to respect them.
	// The struct uses 'bool', so false is default. We might want to assume frontend sends explicit value.
	// But passing 'false' could be intentional. Let's assume req defaults are handled by frontend randomly.
	order.ThreeDForce = req.ThreeDForce
	order.PaymentMethods = req.PaymentMethods

	// Note: EnabledInstallments is already set above with defaults, but can be overridden
	if req.Installment > 1 {
		// If specific installment selected, maybe we want to restrict?
		// But for now, let's keep the mock default of all enabled
	}

	return order
}

func generateConversationID() string {
	timestamp := time.Now().Unix()
	uniqueID := uuid.New().String()[:8]
	return fmt.Sprintf("CONV_%d_%s", timestamp, uniqueID)
}

func generateBuyerID() string {
	hash := md5.Sum([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	return fmt.Sprintf("BUYER_%x", hash)[:16]
}

func extractFirstName(fullName string) string {
	parts := splitName(fullName)
	if len(parts) > 0 {
		return parts[0]
	}
	return "Customer"
}

func extractLastName(fullName string) string {
	parts := splitName(fullName)
	if len(parts) > 1 {
		return parts[len(parts)-1]
	}
	return "User"
}

func splitName(fullName string) []string {
	// Simple name splitting - split by spaces
	return strings.Fields(strings.TrimSpace(fullName))
}

// CancelRequest represents cancel request
type CancelRequest struct {
	ReferenceID string `json:"reference_id"`
}

// RefundRequest represents refund request
type RefundRequest struct {
	ReferenceID string `json:"reference_id"`
	Amount      string `json:"amount"` // Optional
}

// cancelOrderHandler handles order cancellation
func cancelOrderHandler(c *gin.Context) {
	var req CancelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	response, err := apiClient.CancelOrder(c.Request.Context(), tapsilat.CancelOrder{
		ReferenceID: req.ReferenceID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// refundOrderHandler handles order refund
func refundOrderHandler(c *gin.Context) {
	var req struct {
		ReferenceID string `json:"reference_id"`
		Amount      string `json:"amount"` // receive as string
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// Parse float
	amountVal, _ := strconv.ParseFloat(req.Amount, 64)

	response, err := apiClient.RefundOrder(c.Request.Context(), tapsilat.RefundOrder{
		ReferenceID: req.ReferenceID,
		Amount:      amountVal,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// --- New Handlers ---

// getOrderTransactionsHandler
func getOrderTransactionsHandler(c *gin.Context) {
	referenceID := c.Param("reference_id")
	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	response, err := apiClient.GetOrderTransactions(c.Request.Context(), referenceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// getOrderListHandler
func getOrderListHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	startDate := c.DefaultQuery("start_date", "")
	endDate := c.DefaultQuery("end_date", "")
	organizationID := c.DefaultQuery("organization_id", "")
	relatedRefID := c.DefaultQuery("related_reference_id", "")

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	response, err := apiClient.GetOrderList(c.Request.Context(), page, perPage, startDate, endDate, organizationID, relatedRefID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// getOrderSubmerchantsHandler
func getOrderSubmerchantsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	response, err := apiClient.GetOrderSubmerchants(c.Request.Context(), page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// listSubscriptionsHandler
// listSubscriptionsHandler
func listSubscriptionsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	response, err := apiClient.ListSubscriptions(c.Request.Context(), page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

type SubscriptionCancelRequest struct {
	SubscriptionID string `json:"subscription_id"`
}

// cancelSubscriptionHandler
func cancelSubscriptionHandler(c *gin.Context) {
	var req SubscriptionCancelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	err = apiClient.CancelSubscription(c.Request.Context(), tapsilat.SubscriptionCancelRequest{
		ReferenceID:    req.SubscriptionID,
		SubscriptionID: req.SubscriptionID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Subscription cancelled"})
}

// Order Term Handlers
// getOrderTermHandler
func getOrderTermHandler(c *gin.Context) {
	referenceID := c.Param("reference_id")
	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	response, err := apiClient.GetOrderTerm(c.Request.Context(), referenceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// createOrderTermHandler
func createOrderTermHandler(c *gin.Context) {
	var req tapsilat.OrderPaymentTermCreateDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	response, err := apiClient.CreateOrderTerm(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// deleteOrderTermHandler
func deleteOrderTermHandler(c *gin.Context) {
	var req struct {
		OrderID         string `json:"order_id"`
		TermReferenceID string `json:"term_reference_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	response, err := apiClient.DeleteOrderTerm(c.Request.Context(), req.OrderID, req.TermReferenceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// updateOrderTermHandler
func updateOrderTermHandler(c *gin.Context) {
	var req tapsilat.OrderPaymentTermUpdateDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	response, err := apiClient.UpdateOrderTerm(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// refundOrderTermHandler
func refundOrderTermHandler(c *gin.Context) {
	var req tapsilat.OrderTermRefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	// Note: Check if RefundOrderTerm is available in SDK. View in step 185 says yes.
	response, err := apiClient.RefundOrderTerm(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func getZipCode(zipCode string) string {
	if zipCode == "" {
		return "34000" // Default Istanbul zip code
	}
	return zipCode
}

// --- SSE Broker for Webhooks ---

type SSEBroker struct {
	Notifier       chan []byte
	NewClients     chan chan []byte
	ClosingClients chan chan []byte
	Clients        map[chan []byte]bool
}

func NewSSEBroker() *SSEBroker {
	broker := &SSEBroker{
		Notifier:       make(chan []byte, 1),
		NewClients:     make(chan chan []byte),
		ClosingClients: make(chan chan []byte),
		Clients:        make(map[chan []byte]bool),
	}
	go broker.listen()
	return broker
}

func (broker *SSEBroker) listen() {
	for {
		select {
		case s := <-broker.NewClients:
			broker.Clients[s] = true
		case s := <-broker.ClosingClients:
			delete(broker.Clients, s)
		case event := <-broker.Notifier:
			for clientMessageChan := range broker.Clients {
				clientMessageChan <- event
			}
		}
	}
}

func (broker *SSEBroker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	messageChan := make(chan []byte)
	broker.NewClients <- messageChan

	defer func() {
		broker.ClosingClients <- messageChan
	}()

	notify := r.Context().Done()

	go func() {
		<-notify
		broker.ClosingClients <- messageChan
	}()

	for {
		msg, open := <-messageChan
		if !open {
			break
		}
		fmt.Fprintf(w, "data: %s\n\n", msg)
		flusher.Flush()
	}
}

func getBaseURL(req *http.Request) string {
	scheme := "http"
	if req.TLS != nil {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s", scheme, req.Host)
}

// terminateOrderHandler
func terminateOrderHandler(c *gin.Context) {
	var req struct {
		ReferenceID string `json:"reference_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	response, err := apiClient.OrderTerminate(c.Request.Context(), req.ReferenceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// manualCallbackHandler
func manualCallbackHandler(c *gin.Context) {
	var req struct {
		ReferenceID    string `json:"reference_id"`
		ConversationID string `json:"conversation_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	response, err := apiClient.OrderManualCallback(c.Request.Context(), req.ReferenceID, req.ConversationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

// getOrganizationSettingsHandler gets organization settings
func getOrganizationSettingsHandler(c *gin.Context) {
	apiClient, err := getAPIClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	settings, err := apiClient.GetOrganizationSettings(c.Request.Context())
	if err != nil {
		utilsInstance.LogError("Failed to get organization settings", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get organization settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}
