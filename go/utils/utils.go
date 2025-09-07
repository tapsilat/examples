package utils

import (
	"crypto/md5"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Utils provides utility functions for the application
type Utils struct{}

// GenerateReferenceID generates a unique reference ID
func (u *Utils) GenerateReferenceID(prefix string) string {
	if prefix == "" {
		prefix = "ORDER"
	}
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	hash := md5.Sum([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	uniqueHash := fmt.Sprintf("%x", hash)[:8]
	return fmt.Sprintf("%s_%s_%s", prefix, timestamp, uniqueHash)
}

// FormatPrice formats price for display
func (u *Utils) FormatPrice(price float64, currency string) string {
	if currency == "" {
		currency = "TRY"
	}
	symbol := "₺"
	if currency != "TRY" {
		symbol = currency
	}
	return fmt.Sprintf("%s%.2f", symbol, price)
}

// ValidatePhone validates phone number (generic validation)
func (u *Utils) ValidatePhone(phone string) (string, error) {
	// Simple validation - just ensure it's not empty and return as-is
	if strings.TrimSpace(phone) == "" {
		return "", fmt.Errorf("phone number cannot be empty")
	}

	return strings.TrimSpace(phone), nil
}

// ValidateID validates ID number (generic validation)
func (u *Utils) ValidateID(idNumber string) bool {
	// Simple validation - just ensure it's not empty
	return strings.TrimSpace(idNumber) != ""
}

// SanitizeInput sanitizes input data
func (u *Utils) SanitizeInput(data interface{}) interface{} {
	switch v := data.(type) {
	case map[string]interface{}:
		result := make(map[string]interface{})
		for key, value := range v {
			result[key] = u.SanitizeInput(value)
		}
		return result
	case []interface{}:
		result := make([]interface{}, len(v))
		for i, item := range v {
			result[i] = u.SanitizeInput(item)
		}
		return result
	case string:
		return strings.TrimSpace(v)
	default:
		return data
	}
}

// LogError logs error to file
func (u *Utils) LogError(message string, context interface{}) {
	// Get the directory of the current file
	currentDir, _ := os.Getwd()
	logDir := filepath.Join(currentDir, "logs")
	logFile := filepath.Join(logDir, "error.log")

	// Create logs directory if it doesn't exist
	err := os.MkdirAll(logDir, 0755)
	if err != nil {
		log.Printf("Failed to create logs directory: %v", err)
		return
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	contextStr := ""
	if context != nil {
		contextStr = fmt.Sprintf(" | Context: %v", context)
	}
	logEntry := fmt.Sprintf("[%s] %s%s\n", timestamp, message, contextStr)

	file, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Failed to open log file: %v", err)
		return
	}
	defer file.Close()

	_, err = file.WriteString(logEntry)
	if err != nil {
		log.Printf("Failed to write to log file: %v", err)
	}
}

// NewUtils creates a new Utils instance
func NewUtils() *Utils {
	return &Utils{}
}
