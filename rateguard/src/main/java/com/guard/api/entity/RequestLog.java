package com.guard.api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "request_logs")
public class RequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String clientId;
    private String endpoint;
    private String status;
    private long timestamp;

    public RequestLog() {
    }

    public RequestLog(String clientId, String endpoint,
                      String status, long timestamp) {
        this.clientId = clientId;
        this.endpoint = endpoint;
        this.status = status;
        this.timestamp = timestamp;
    }

    public Long getId() {
        return id;
    }

    public String getClientId() {
        return clientId;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public String getStatus() {
        return status;
    }

    public long getTimestamp() {
        return timestamp;
    }
}