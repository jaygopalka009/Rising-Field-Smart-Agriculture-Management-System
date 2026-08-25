package com.risingfield.security;

import com.risingfield.model.User;
import com.risingfield.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

/** Convenience accessor for the authenticated user (id stored as the principal). */
@Component
public class CurrentUser {

    private final UserRepository userRepository;

    public CurrentUser(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Integer id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Not authenticated");
        }
        try {
            return Integer.valueOf(auth.getPrincipal().toString());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid user ID format in token");
        }
    }

    public User get() {
        return userRepository.findById(id())
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "User not found"));
    }
}
