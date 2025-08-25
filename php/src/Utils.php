<?php
namespace App;

/**
 * Utility class for application helpers
 */
class Utils
{
    /**
     * Generate a unique reference ID
     */
    public static function generateReferenceId($prefix = 'ORDER')
    {
        return $prefix . '_' . time() . '_' . substr(md5(uniqid()), 0, 8);
    }

    /**
     * Format price for display
     */
    public static function formatPrice($price, $currency = 'TRY')
    {
        $symbol = $currency === 'TRY' ? '₺' : $currency;
        return $symbol . number_format($price, 2, '.', ',');
    }

    /**
     * Validate Turkish phone number
     */
    public static function validateTurkishPhone($phone)
    {
        // Remove all non-digit characters
        $clean = preg_replace('/[^0-9]/', '', $phone);

        // Check if it starts with country code
        if (strlen($clean) === 13 && substr($clean, 0, 2) === '90') {
            return '+' . $clean;
        }

        // Check if it starts with 0
        if (strlen($clean) === 11 && substr($clean, 0, 1) === '0') {
            return '+90' . substr($clean, 1);
        }

        // Check if it's 10 digits (without leading 0)
        if (strlen($clean) === 10) {
            return '+90' . $clean;
        }

        throw new \Exception('Geçersiz telefon numarası formatı');
    }

    /**
     * Validate Turkish ID number
     */
    public static function validateTurkishId($id)
    {
        $id = preg_replace('/[^0-9]/', '', $id);

        // TC kimlik numarası 11 haneli olmalı
        if (strlen($id) !== 11) {
            return false;
        }

        // İlk hane 0 olamaz
        if ($id[0] === '0') {
            return false;
        }

        // TC kimlik numarası algoritması
        $sum = 0;
        for ($i = 0; $i < 10; $i++) {
            $sum += (int)$id[$i];
        }

        return ($sum % 10) == (int)$id[10];
    }

    /**
     * Sanitize input data
     */
    public static function sanitizeInput($data)
    {
        if (is_array($data)) {
            return array_map([self::class, 'sanitizeInput'], $data);
        }

        return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Log error to file
     */
    public static function logError($message, $context = [])
    {
        $logFile = __DIR__ . '/../logs/error.log';
        $logDir = dirname($logFile);

        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' | Context: ' . json_encode($context) : '';
        $logEntry = "[{$timestamp}] {$message}{$contextStr}" . PHP_EOL;

        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
}
