package com.risingfield.web;

import com.risingfield.security.CurrentUser;
import com.risingfield.service.AuthService;
import com.risingfield.web.dto.LoginRequest;
import com.risingfield.web.dto.RegisterRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;

    public AuthController(AuthService authService, CurrentUser currentUser) {
        this.authService = authService;
        this.currentUser = currentUser;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest req) {
        return authService.login(req);
    }

    /** Reset password (email + registered phone). body: {email, phone, newPassword} */
    @PostMapping("/forgot-password")
    public Map<String, Object> forgotPassword(@RequestBody Map<String, String> body) {
        authService.resetPassword(body.get("email"), body.get("phone"), body.get("newPassword"));
        return Map.of("message", "Password reset successful");
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        return authService.publicUser(currentUser.get());
    }
}
