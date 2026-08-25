package com.risingfield.service;

import com.risingfield.model.Notification;
import com.risingfield.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository repo;

    public NotificationService(NotificationRepository repo) {
        this.repo = repo;
    }

    public void notify(Integer userId, String title, String message) {
        if (userId == null) return;
        repo.save(new Notification(userId, title, message));
    }

    public List<Notification> forUser(Integer userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long unreadCount(Integer userId) {
        return repo.countByUserIdAndReadFalse(userId);
    }

    public void markRead(Integer id) {
        repo.findById(id).ifPresent(n -> { n.setRead(true); repo.save(n); });
    }

    public void markAllRead(Integer userId) {
        var list = repo.findByUserIdOrderByCreatedAtDesc(userId);
        list.forEach(n -> n.setRead(true));
        repo.saveAll(list);
    }
}
