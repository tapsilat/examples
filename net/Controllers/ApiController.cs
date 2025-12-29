using Microsoft.AspNetCore.Mvc;
using Tapsilat.Net;
using Tapsilat.Net.Models.Common;
using Tapsilat.Net.Models.Request;
using Tapsilat.Net.Models.Response;
using Tapsilat.Example.Net.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Tapsilat.Example.Net.Controllers;

[ApiController]
public class ApiController : ControllerBase
{
    private readonly TapsilatClient _tapsilatClient;
    private readonly ILogger<ApiController> _logger;
    private readonly string _webhookDir;

    public ApiController(TapsilatClient tapsilatClient, ILogger<ApiController> logger)
    {
        _tapsilatClient = tapsilatClient;
        _logger = logger;
        _webhookDir = Path.Combine(Directory.GetCurrentDirectory(), "webhooks");
        if (!Directory.Exists(_webhookDir))
        {
            Directory.CreateDirectory(_webhookDir);
        }
    }

    [HttpPost("api")]
    public async Task<IActionResult> CreateOrder([FromBody] OrderViewModel request)
    {
        try
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var conversationId = request.ConversationId ?? GenerateConversationId();

            var basketItems = request.Cart.Select(item => {
                var totalPrice = item.Price * item.Quantity;
                return new BasketItem
                {
                    Id = item.Id.ToString(),
                    Name = item.Name,
                    Category1 = item.Category,
                    ItemType = "PHYSICAL",
                    Price = totalPrice,
                    Quantity = 1,
                    Payer = new BasketItemPayer { ReferenceId = $"{item.Id}_payer", Type = "PERSONAL" }
                };
            }).ToList();

            var basketTotal = basketItems.Sum(x => x.Price);

            // Billing
            var billing = request.Billing;
            var shipping = request.SameAddress ? billing : request.Shipping;

            var metadata = request.Metadata.Select(m => new MetadataItem { Key = m.Key, Value = m.Value }).ToList();
            metadata.Add(new MetadataItem { Key = "cart_items_count", Value = request.Cart.Count.ToString() });
            metadata.Add(new MetadataItem { Key = "application_name", Value = "Tapsilat .NET SDK Example" });

            var orderRequest = new CreateOrderRequest
            {
                Amount = basketTotal ?? 0,
                Currency = request.Currency,
                Locale = request.Locale,
                Buyer = new BuyerInfo
                {
                    Name = billing.ContactName.Split(' ').FirstOrDefault() ?? "Guest",
                    Surname = billing.ContactName.Split(' ').LastOrDefault() ?? "",
                    Email = billing.Email,
                    GsmNumber = billing.ContactPhone,
                    City = billing.City,
                    Country = "Turkey",
                    ZipCode = billing.ZipCode,
                    RegistrationAddress = billing.Address,
                    IdentityNumber = billing.VatNumber ?? "11111111111"
                },
                BasketItems = basketItems,
                BillingAddress = new BillingAddress
                {
                    ContactName = billing.ContactName,
                    City = billing.City,
                    Country = "Turkey",
                    Address = billing.Address,
                    ZipCode = billing.ZipCode,
                    ContactPhone = billing.ContactPhone,
                    VatNumber = billing.VatNumber
                },
                ShippingAddress = new ShippingAddress
                {
                    ContactName = shipping.ContactName,
                    City = shipping.City,
                    Country = "Turkey",
                    Address = shipping.Address,
                    ZipCode = shipping.ZipCode,
                    ContactPhone = shipping.ContactPhone
                },
                ConversationId = conversationId,
                Metadata = metadata,
                PaymentSuccessUrl = $"{baseUrl}/payment/success",
                PaymentFailureUrl = $"{baseUrl}/payment/failure",
                Installment = request.Installment,
                ThreeDForce = request.ThreeDForce,
                PaymentMethods = request.PaymentMethods,
                PaymentOptions = request.PaymentOptions,
                EnabledInstallments = request.EnabledInstallments
            };

            var response = await _tapsilatClient.Orders.CreateAsync(orderRequest);

            string checkoutUrl = null;
            if (!string.IsNullOrEmpty(response.ReferenceId))
            {
                try {
                   checkoutUrl = await _tapsilatClient.Orders.GetCheckoutUrlAsync(response.ReferenceId);
                } catch {}
            }

            return Ok(new
            {
                success = true,
                order_id = response.ReferenceId,
                reference_id = response.ReferenceId,
                conversation_id = conversationId,
                checkout_url = checkoutUrl
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating order");
            return StatusCode(500, new { success = false, message = ex.Message, error = ex.Message });
        }
    }

    [HttpGet("api/order/list")]
    public async Task<IActionResult> GetOrderList([FromQuery] int page = 1, [FromQuery] int per_page = 10, [FromQuery] string start_date = "", [FromQuery] string end_date = "")
    {
        try
        {
            var response = await _tapsilatClient.Orders.GetListAsync(page, per_page, null, start_date, end_date);
            
            var rows = response.Rows.Select(o => new {
                reference_id = o.ReferenceId,
                amount = o.Total,
                currency = "TRY", 
                status = o.Status,
                created_at = "-",
                conversation_id = "" // Default
            });

            return Ok(new { rows = rows, total_count = response.Total });
        }
        catch (Exception ex)
        {
             _logger.LogError(ex, "List orders error");
             return Ok(new { rows = new object[] { } });
        }
    }

    [HttpGet("api/order/details/{referenceId}")]
    public async Task<IActionResult> GetOrderDetails(string referenceId)
    {
        try
        {
            var order = await _tapsilatClient.Orders.GetAsync(referenceId);
            return Ok(new { 
                amount = order.Amount,
                currency = order.Currency,
                status = order.Status,
                conversation_id = order.ConversationId,
                payment_status = order.Amount == order.PaidAmount ? "PAID" : "UNPAID", // Simplified logic since PaymentStatus property missing
                description = "-" // Description missing in SDK
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("api/order/transactions/{referenceId}")]
    public async Task<IActionResult> GetOrderTransactions(string referenceId)
    {
         try {
             var transactions = await _tapsilatClient.Orders.GetTransactionsAsync(referenceId);
             return Ok(transactions);
         } catch {
             return Ok(new object[] {});
         }
    }

    [HttpPost("api/subscription")]
    public async Task<IActionResult> CreateSubscription([FromBody] SubscriptionRequestModel req)
    {
        try
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var createReq = new SubscriptionCreateRequest
            {
                Title = req.Name,
                Amount = req.Amount,
                Currency = "TRY",
                Period = req.Period,
                PaymentDate = req.PaymentDate < 1 ? 1 : req.PaymentDate,
                Cycle = 12,
                SuccessUrl = $"{baseUrl}/payment/success",
                FailureUrl = $"{baseUrl}/payment/failure",
                Billing = new SubscriptionBilling
                {
                    ContactName = "John Doe",
                    City = "Istanbul",
                    Country = "Turkey",
                    ZipCode = "34000",
                    Address = "Subscription Address"
                },
                User = new SubscriptionUser
                {
                    Email = req.SubscriberEmail ?? "sub@test.com",
                    Phone = req.SubscriberPhone ?? "5551234567",
                    FirstName = "John",
                    LastName = "Doe",
                    IdentityNumber = "11111111111",
                    Address = "Istanbul"
                }
            };

            var response = await _tapsilatClient.Subscriptions.CreateAsync(createReq);
            var checkoutUrl = ""; 
            if(!string.IsNullOrEmpty(response.OrderReferenceId))
            {
                 try {
                    checkoutUrl = await _tapsilatClient.Orders.GetCheckoutUrlAsync(response.OrderReferenceId);
                 } catch {}
            }

            return Ok(new { success = true, reference_id = response.ReferenceId, checkout_url = checkoutUrl });
        }
        catch (Exception ex)
        {
             return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("api/subscription/list")]
    public async Task<IActionResult> ListSubscriptions()
    {
        try
        {
            var response = await _tapsilatClient.Subscriptions.GetListAsync(1, 100);
            var rows = response.Rows?.Select(s => new {
                reference_id = s.ReferenceId,
                amount = s.Amount,
                currency = s.Currency,
                period = s.Period,
                payment_status = s.PaymentStatus,
                is_active = s.IsActive,
                status = s.PaymentStatus
            }) ?? Enumerable.Empty<object>();
            return Ok(new { rows = rows });
        }
        catch (Exception ex)
        {
             return Ok(new { rows = new object[] {} });
        }
    }

    [HttpPost("api/subscription/cancel")]
    public async Task<IActionResult> CancelSubscription([FromBody] CancelSubscriptionRequestModel req)
    {
         try
         {
             await _tapsilatClient.Subscriptions.CancelAsync(new SubscriptionCancelRequest { SubscriptionId = req.SubscriptionId });
             return Ok(new { success = true });
         }
         catch (Exception ex)
         {
             return StatusCode(500, new { error = ex.Message });
         }
    }
    
    [HttpPost("api/cancel")]
    public async Task<IActionResult> CancelOrder([FromBody] CancelOrderModel req)
    {
         try
         {
             await _tapsilatClient.Orders.CancelAsync(req.ReferenceId);
             return Ok(new { success = true });
         }
         catch (Exception ex)
         {
             return StatusCode(500, new { error = ex.Message });
         }
    }

    [HttpPost("api/refund")]
    public async Task<IActionResult> RefundOrder([FromBody] RefundOrderModel req)
    {
         try
         {
             await _tapsilatClient.Orders.RefundAsync(new RefundOrderRequest { ReferenceId = req.ReferenceId, Amount = string.IsNullOrEmpty(req.Amount) ? 0 : decimal.Parse(req.Amount) });
             return Ok(new { success = true });
         }
         catch (Exception ex)
         {
             return StatusCode(500, new { error = ex.Message });
         }
    }

    [HttpGet("api/webhooks")]
    public IActionResult GetWebhooks()
    {
        var logs = new List<object>();
        var files = Directory.GetFiles(_webhookDir, "*.json").OrderByDescending(f => f);
        foreach (var file in files)
        {
             var content = System.IO.File.ReadAllText(file);
             object jsonContent = null;
             try { jsonContent = JsonSerializer.Deserialize<object>(content); } catch { }
             logs.Add(new { filename = Path.GetFileName(file), content = jsonContent, raw = content });
        }
        return Ok(logs);
    }

    private string GenerateConversationId()
    {
        return $"CONV_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}_{Guid.NewGuid().ToString("N").Substring(0, 8)}";
    }
}

public class SubscriptionRequestModel
{
    [JsonPropertyName("name")] public string Name { get; set; }
    [JsonPropertyName("amount")] public decimal Amount { get; set; }
    [JsonPropertyName("period")] public int Period { get; set; }
    [JsonPropertyName("payment_date")] public int PaymentDate { get; set; }
    [JsonPropertyName("subscriber_email")] public string? SubscriberEmail { get; set; }
    [JsonPropertyName("subscriber_phone")] public string? SubscriberPhone { get; set; }
}

public class CancelSubscriptionRequestModel
{
    [JsonPropertyName("subscription_id")] public string SubscriptionId { get; set; }
}

public class CancelOrderModel
{
    [JsonPropertyName("reference_id")] public string ReferenceId { get; set; }
}

public class RefundOrderModel
{
    [JsonPropertyName("reference_id")] public string ReferenceId { get; set; }
    [JsonPropertyName("amount")] public string Amount { get; set; }
}
