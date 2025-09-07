package main

import (
	"crypto/md5"
	"fmt"
	"log"
	"net/http"
	"os"
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
	Cart        []Product `json:"cart" binding:"required"`
	Installment int       `json:"installment"`
	Billing     Address   `json:"billing" binding:"required"`
	Shipping    *Address  `json:"shipping,omitempty"`
	SameAddress bool      `json:"same_address"`
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
	r.GET("/payment/success", paymentSuccessHandler)
	r.GET("/payment/failure", paymentFailureHandler)
	r.GET("/api/payment/status/:reference_id", getPaymentStatusHandler)
	r.GET("/api/order/conversation/:conversation_id", getOrderByConversationIDHandler)
	r.GET("/api/order/details/:reference_id", getOrderDetailsHandler)

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
	response, err := apiClient.CreateOrder(order)
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
		checkoutURL, err = apiClient.GetCheckoutURL(response.ReferenceID)
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

	status, err := apiClient.GetOrderStatus(referenceID)
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

	order, err := apiClient.GetOrderByConversationID(conversationID)
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

	order, err := apiClient.GetOrder(referenceID)
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

	// Create order
	order := tapsilat.Order{
		Locale:            "en",
		Currency:          "TRY",
		Amount:            total,
		ConversationID:    conversationID,
		PaymentSuccessUrl: fmt.Sprintf("%s/payment/success", baseURL),
		PaymentFailureUrl: fmt.Sprintf("%s/payment/failure", baseURL),
		Buyer: tapsilat.OrderBuyer{
			Id:                  generateBuyerID(),
			Name:                extractFirstName(req.Billing.ContactName),
			Surname:             extractLastName(req.Billing.ContactName),
			Email:               req.Billing.Email,
			GsmNumber:           req.Billing.ContactPhone, // Direct use without validation
			IdentityNumber:      req.Billing.VatNumber,
			RegistrationDate:    time.Now().Format("2006-01-02"),
			RegistrationAddress: req.Billing.Address,
			LastLoginDate:       time.Now().Format("2006-01-02"),
			City:                req.Billing.City,
			Country:             "Turkey",
			ZipCode:             getZipCode(req.Billing.ZipCode),
			Ip:                  "127.0.0.1",
			BirdthDate:          "1990-01-01", // Default birth date
		},
		ShippingAddress: tapsilat.OrderShippingAddress{
			Address:     shippingAddress.Address,
			ZipCode:     getZipCode(shippingAddress.ZipCode),
			City:        shippingAddress.City,
			Country:     "Turkey",
			ContactName: shippingAddress.ContactName,
		},
		BillingAddress: tapsilat.OrderBillingAddress{
			Address:     req.Billing.Address,
			ZipCode:     getZipCode(req.Billing.ZipCode),
			City:        req.Billing.City,
			Country:     "Turkey",
			ContactName: req.Billing.ContactName,
			VatNumber:   req.Billing.VatNumber,
		},
		BasketItems: basketItems,
		Metadata:    metadata,
	}

	// Add enabled installments if more than 1
	if req.Installment > 1 {
		order.EnabledInstallments = []int{1, req.Installment}
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

func getZipCode(zipCode string) string {
	if zipCode == "" {
		return "34000" // Default Istanbul zip code
	}
	return zipCode
}

func getBaseURL(req *http.Request) string {
	scheme := "http"
	if req.TLS != nil {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s", scheme, req.Host)
}
