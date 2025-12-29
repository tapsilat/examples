using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Tapsilat.Example.Net.Models;

namespace Tapsilat.Example.Net.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        return View();
    }

    [Route("payment/success")]
    public IActionResult PaymentSuccess(string reference_id, string conversation_id)
    {
        ViewBag.ReferenceId = reference_id;
        ViewBag.ConversationId = conversation_id;
        return View();
    }

    [Route("payment/failure")]
    public IActionResult PaymentFailure(string reference_id, string conversation_id, string error_message)
    {
        ViewBag.ReferenceId = reference_id;
        ViewBag.ConversationId = conversation_id;
        ViewBag.ErrorMessage = error_message ?? "Payment failed";
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
