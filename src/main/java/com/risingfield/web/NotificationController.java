package com.risingfield.web;

import com.risingfield.model.Notification;
import com.risingfield.security.CurrentUser;
import com.risingfield.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;
    private final CurrentUser currentUser;

    public NotificationController(NotificationService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<Notification> list() {
        return service.forUser(currentUser.id());
    }

    @GetMapping("/unread-count")
    public Map<String, Object> unread() {
        return Map.of("count", service.unreadCount(currentUser.id()));
    }

    @PostMapping("/{id}/read")
    public void read(@PathVariable Integer id) {
        service.markRead(id);
    }

    @PostMapping("/read-all")
    public void readAll() {
        service.markAllRead(currentUser.id());
    }
}
