package com.guard.api.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.guard.api.entity.RequestLog;
import com.guard.api.repository.RequestLogRepository;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final RequestLogRepository repository;

    public AnalyticsController(RequestLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/history")
    public List<RequestLog> getHistory() {
        return repository.findAll();
    }
}