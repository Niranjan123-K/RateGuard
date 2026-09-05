package com.guard.api.dto;

public class RequestEvent {

    private final String clientId;
    private final String endpoint;
    private final String status;
    private final long timestamp;

    public RequestEvent(
            String clientId,
            String endpoint,
            String status,
            long timestamp) {

        this.clientId = clientId;
        this.endpoint = endpoint;
        this.status = status;
        this.timestamp = timestamp;
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