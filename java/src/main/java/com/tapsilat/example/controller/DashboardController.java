package com.tapsilat.example.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    @GetMapping("/")
    public String index(Model model) {
        return "index";
    }

    @GetMapping("/payment/success")
    public String success() {
        return "payment_success";
    }

    @GetMapping("/payment/failure")
    public String failure() {
        return "payment_failure";
    }
}
