package com.guard.api.aspect;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.guard.api.annotation.RateLimit;
import com.guard.api.dto.RequestEvent;
import com.guard.api.exception.RateLimitExceededException;

import jakarta.servlet.http.HttpServletRequest;

import com.guard.api.entity.RequestLog;
import com.guard.api.repository.RequestLogRepository;
@Aspect
@Component
public class RateLimitAspect {

    private final Map<String, RequestCounter> counters =
        new ConcurrentHashMap<>();

private final SimpMessagingTemplate messagingTemplate;

private final RequestLogRepository requestLogRepository;

public RateLimitAspect(
        SimpMessagingTemplate messagingTemplate,
        RequestLogRepository requestLogRepository) {

    this.messagingTemplate = messagingTemplate;
    this.requestLogRepository = requestLogRepository;
}

    @Around("@annotation(rateLimit)")
    public Object checkRateLimit(
            ProceedingJoinPoint joinPoint,
            RateLimit rateLimit) throws Throwable {

         System.out.println("Aspect is running!");       
        String clientId = getClientIp();

        String methodKey =
                joinPoint.getSignature().toShortString();

        String key = clientId + ":" + methodKey;

        long windowMillis =
                rateLimit.unit().toMillis(rateLimit.duration());

        RequestCounter counter =
                counters.computeIfAbsent(
                        key,
                        k -> new RequestCounter()
                );

        synchronized (counter) {

            long now = System.currentTimeMillis();

            if (now - counter.windowStart > windowMillis) {
                counter.windowStart = now;
                counter.count = 0;
            }

            if (counter.count >= rateLimit.limit()) {

    RequestEvent event = new RequestEvent(
            clientId,
            methodKey,
            "BLOCKED",
            System.currentTimeMillis()
    );

    messagingTemplate.convertAndSend(
            "/topic/rate-limit-events",
            event
    );

    requestLogRepository.save(
            new RequestLog(
                    clientId,
                    methodKey,
                    "BLOCKED",
                    event.getTimestamp()
            )
    );

    throw new RateLimitExceededException(
            "Rate limit exceeded. Try again later."
    );
}

          counter.count++;

RequestEvent event = new RequestEvent(
        clientId,
        methodKey,
        "ALLOWED",
        System.currentTimeMillis()
);

messagingTemplate.convertAndSend(
        "/topic/rate-limit-events",
        event
);

requestLogRepository.save(
        new RequestLog(
                clientId,
                methodKey,
                "ALLOWED",
                event.getTimestamp()
        )
);

return joinPoint.proceed();
        }
    }

    private String getClientIp() {

        ServletRequestAttributes attrs =
                (ServletRequestAttributes)
                        RequestContextHolder.getRequestAttributes();

        HttpServletRequest request =
                attrs.getRequest();

        return request.getRemoteAddr();
    }

    private static class RequestCounter {

        long windowStart =
                System.currentTimeMillis();

        int count = 0;
    }
}