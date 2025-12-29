using System.Text.Json.Serialization;

namespace Tapsilat.Example.Net.Models;

public class OrderViewModel
{
    [JsonPropertyName("cart")]
    public List<CartItemViewModel> Cart { get; set; } = new();

    [JsonPropertyName("billing")]
    public AddressViewModel Billing { get; set; } = new();

    [JsonPropertyName("shipping")]
    public AddressViewModel Shipping { get; set; } = new();

    [JsonPropertyName("installment")]
    public int Installment { get; set; } = 1;

    [JsonPropertyName("same_address")]
    public bool SameAddress { get; set; } = true;

    [JsonPropertyName("conversation_id")]
    public string ConversationId { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; }

    [JsonPropertyName("locale")]
    public string Locale { get; set; } = "tr";

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "TRY";

    [JsonPropertyName("three_d_force")]
    public bool ThreeDForce { get; set; }

    [JsonPropertyName("payment_methods")]
    public bool PaymentMethods { get; set; }

    [JsonPropertyName("payment_options")]
    public List<string> PaymentOptions { get; set; } = new();

    [JsonPropertyName("enabled_installments")]
    public List<int> EnabledInstallments { get; set; } = new();

    [JsonPropertyName("metadata")]
    public List<MetadataItemViewModel> Metadata { get; set; } = new();
}

public class MetadataItemViewModel
{
    [JsonPropertyName("key")]
    public string Key { get; set; }
    [JsonPropertyName("value")]
    public string Value { get; set; }
}

public class CartItemViewModel
{
    [JsonPropertyName("id")]
    public object Id { get; set; } // Can be string or int

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("price")]
    public decimal Price { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = "Electronics";
}

public class AddressViewModel
{
    [JsonPropertyName("contact_name")]
    public string ContactName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("contact_phone")]
    public string ContactPhone { get; set; } = string.Empty;

    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    [JsonPropertyName("city")]
    public string City { get; set; } = string.Empty;

    [JsonPropertyName("vat_number")]
    public string? VatNumber { get; set; }

    [JsonPropertyName("zip_code")]
    public string? ZipCode { get; set; }
}
