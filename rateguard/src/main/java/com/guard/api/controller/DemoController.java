package com.guard.api.controller;

import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.guard.api.annotation.RateLimit;

@RestController
@RequestMapping("/api")
public class DemoController {

    @RateLimit(limit = 20, duration = 1, unit = TimeUnit.MINUTES)
    @GetMapping("/products")
    public List<String> getProducts() {
        return List.of("Laptop", "Phone", "Tablet");
    }

    @GetMapping("/orders")
    public List<String> getOrders() {
        return List.of("Order#1", "Order#2");
    }
}