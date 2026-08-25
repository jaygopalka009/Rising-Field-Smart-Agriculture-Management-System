package com.risingfield.web;

import com.risingfield.model.*;
import com.risingfield.repository.*;
import com.risingfield.service.NotificationService;
import com.risingfield.service.UserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepo;
    private final EquipmentRepository equipmentRepo;
    private final BookingRepository bookingRepo;
    private final PaymentRepository paymentRepo;
    private final CategoryRepository categoryRepo;
    private final SettingsRepository settingsRepo;
    private final NotificationService notifications;
    private final LabourProfileRepository labourProfileRepo;
    private final FarmerProfileRepository farmerProfileRepo;
    private final EquipmentOwnerProfileRepository equipmentOwnerProfileRepo;
    private final AdminProfileRepository adminProfileRepo;
    private final RatingRepository ratingRepo;
    private final UserService userService;

    public AdminController(UserRepository userRepo, EquipmentRepository equipmentRepo,
                           BookingRepository bookingRepo, PaymentRepository paymentRepo,
                           CategoryRepository categoryRepo, SettingsRepository settingsRepo,
                           NotificationService notifications, LabourProfileRepository labourProfileRepo,
                           FarmerProfileRepository farmerProfileRepo,
                           EquipmentOwnerProfileRepository equipmentOwnerProfileRepo,
                           AdminProfileRepository adminProfileRepo,
                           RatingRepository ratingRepo,
                           UserService userService) {
        this.userRepo = userRepo;
        this.equipmentRepo = equipmentRepo;
        this.bookingRepo = bookingRepo;
        this.paymentRepo = paymentRepo;
        this.categoryRepo = categoryRepo;
        this.settingsRepo = settingsRepo;
        this.notifications = notifications;
        this.labourProfileRepo = labourProfileRepo;
        this.farmerProfileRepo = farmerProfileRepo;
        this.equipmentOwnerProfileRepo = equipmentOwnerProfileRepo;
        this.adminProfileRepo = adminProfileRepo;
        this.ratingRepo = ratingRepo;
        this.userService = userService;
    }

    // ---------- Dashboard ----------
    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        Map<String, Object> m = new HashMap<>();
        m.put("farmers", userRepo.countByRole(Role.FARMER));
        m.put("labour", userRepo.countByRole(Role.LABOUR));
        m.put("equipmentOwners", userRepo.countByRole(Role.EQUIPMENT_OWNER));
        m.put("equipmentCount", equipmentRepo.count());
        m.put("totalBookings", bookingRepo.count());
        m.put("pendingBookings", bookingRepo.countByStatus(BookingStatus.PENDING));
        m.put("completedBookings", bookingRepo.countByStatus(BookingStatus.COMPLETED));

        double revenue = 0, commission = 0;
        for (Payment p : paymentRepo.findAll()) {
            if (p.getStatus() == PaymentStatus.PAID) {
                revenue += p.getAmount() == null ? 0 : p.getAmount();
                commission += p.getCommission() == null ? 0 : p.getCommission();
            }
        }
        m.put("totalRevenue", round2(revenue));
        m.put("totalCommission", round2(commission));
        return m;
    }

    // ---------- Manage users ----------
    @GetMapping("/users")
    public List<Map<String, Object>> users(@RequestParam(required = false) Role role) {
        List<User> list = (role == null) ? userRepo.findAll() : userRepo.findByRole(role);
        return list.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("role", u.getRole());
            m.put("preferredLanguage", u.getPreferredLanguage());
            m.put("active", u.isActive());
            m.put("createdAt", u.getCreatedAt());

            if (u.getRole() == Role.FARMER) {
                farmerProfileRepo.findByUserId(u.getId()).ifPresent(fp -> {
                    m.put("name", fp.getName());
                    m.put("phone", fp.getPhone());
                    m.put("village", fp.getVillage());
                    m.put("district", fp.getDistrict());
                    m.put("farmSizeVigha", fp.getFarmSizeVigha());
                });
            } else if (u.getRole() == Role.LABOUR) {
                labourProfileRepo.findByUserId(u.getId()).ifPresent(lp -> {
                    m.put("name", lp.getName());
                    m.put("phone", lp.getPhone());
                    m.put("village", lp.getVillage());
                    m.put("district", lp.getDistrict());
                    m.put("available", lp.isAvailable());
                    m.put("skills", lp.getSkills());
                    m.put("ratePerHour", lp.getRatePerHour());
                    m.put("ratePerDay", lp.getRatePerDay());
                    m.put("ratePerVigha", lp.getRatePerVigha());
                });
            } else if (u.getRole() == Role.EQUIPMENT_OWNER) {
                equipmentOwnerProfileRepo.findByUserId(u.getId()).ifPresent(eop -> {
                    m.put("name", eop.getName());
                    m.put("phone", eop.getPhone());
                    m.put("village", eop.getVillage());
                    m.put("district", eop.getDistrict());
                });
            } else if (u.getRole() == Role.ADMIN) {
                adminProfileRepo.findByUserId(u.getId()).ifPresent(ap -> {
                    m.put("name", ap.getName());
                    m.put("phone", ap.getPhone());
                });
            }
            return m;
        }).toList();
    }

    @PatchMapping("/users/{id}/active")
    public User setActive(@PathVariable Integer id, @RequestParam boolean active) {
        User u = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        u.setActive(active);
        User saved = userRepo.save(u);
        saved.setPasswordHash(null);
        notifications.notify(id, active ? "Account Enabled" : "Account Blocked",
                active ? "Your account has been enabled by admin."
                       : "Your account has been blocked by admin.");
        return saved;
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Integer id) {
        userService.deleteUserCascade(id);
    }

    // ---------- Manage categories (work + equipment) ----------
    @GetMapping("/categories")
    public List<Category> categories(@RequestParam(required = false) String type) {
        return type == null ? categoryRepo.findAll() : categoryRepo.findByType(type);
    }

    @PostMapping("/categories")
    public Category addCategory(@RequestBody Category c) {
        c.setId(null);
        return categoryRepo.save(c);
    }

    @PutMapping("/categories/{id}")
    public Category editCategory(@PathVariable Integer id, @RequestBody Category body) {
        Category c = categoryRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));
        c.setName(body.getName());
        c.setNameGu(body.getNameGu());
        c.setNameHi(body.getNameHi());
        c.setActive(body.isActive());
        return categoryRepo.save(c);
    }

    @DeleteMapping("/categories/{id}")
    public void deleteCategory(@PathVariable Integer id) {
        categoryRepo.deleteById(id);
    }

    @GetMapping("/equipment")
    public List<Equipment> equipment() {
        List<Equipment> list = equipmentRepo.findAll();
        list.forEach(e -> {
            if (e.getCategoryId() != null) {
                categoryRepo.findById(e.getCategoryId())
                        .ifPresent(c -> e.setCategoryName(c.getName()));
            }
        });
        return list;
    }

    @DeleteMapping("/equipment/{id}")
    public void deleteEquipment(@PathVariable Integer id) {
        equipmentRepo.deleteById(id);
    }

    // ---------- Manage bookings ----------
    @GetMapping("/bookings")
    public List<Booking> bookings() {
        List<Booking> list = bookingRepo.findAll();
        list.forEach(this::populateTransientFields);
        return list;
    }

    // ---------- Manage payments ----------
    @GetMapping("/payments")
    public List<Payment> payments() {
        List<Payment> list = paymentRepo.findAll();
        list.forEach(this::populateTransientFields);
        return list;
    }

    // ---------- Commission settings ----------
    @GetMapping("/settings")
    public Settings getSettings() {
        return settingsRepo.findById(Settings.SINGLETON_ID).orElseGet(() -> {
            Settings s = new Settings();
            return settingsRepo.save(s);
        });
    }

    @PutMapping("/settings")
    public Settings updateSettings(@RequestBody Settings body) {
        Settings s = settingsRepo.findById(Settings.SINGLETON_ID).orElseGet(Settings::new);
        s.setId(Settings.SINGLETON_ID);
        if (body.getCommissionPercentHour() != null) s.setCommissionPercentHour(body.getCommissionPercentHour());
        if (body.getCommissionPercentDay() != null) s.setCommissionPercentDay(body.getCommissionPercentDay());
        if (body.getCommissionPercentVigha() != null) s.setCommissionPercentVigha(body.getCommissionPercentVigha());
        return settingsRepo.save(s);
    }

    // ---------- Reports ----------
    @GetMapping("/reports")
    public Map<String, Object> reports() {
        Map<String, Object> m = new HashMap<>();

        Map<String, Long> byStatus = new HashMap<>();
        for (BookingStatus st : BookingStatus.values()) {
            byStatus.put(st.name(), bookingRepo.countByStatus(st));
        }
        m.put("bookingsByStatus", byStatus);

        Map<String, Long> byResource = new HashMap<>();
        byResource.put("LABOUR", (long) bookingRepo.findByResourceType(ResourceType.LABOUR).size());
        byResource.put("EQUIPMENT", (long) bookingRepo.findByResourceType(ResourceType.EQUIPMENT).size());
        m.put("bookingsByResource", byResource);

        double revenue = 0, commission = 0, payouts = 0;
        long cash = 0, online = 0;
        for (Payment p : paymentRepo.findAll()) {
            if (p.getStatus() != PaymentStatus.PAID) continue;
            revenue += nz(p.getAmount());
            commission += nz(p.getCommission());
            payouts += nz(p.getProviderEarning());
            if (p.getMethod() == PaymentMethod.CASH) cash++; else online++;
        }
        m.put("totalRevenue", round2(revenue));
        m.put("totalCommission", round2(commission));
        m.put("totalProviderPayouts", round2(payouts));
        m.put("cashPayments", cash);
        m.put("onlinePayments", online);
        return m;
    }

    // ---------- Ratings ----------
    @GetMapping("/ratings")
    public List<Map<String, Object>> ratings() {
        return ratingRepo.findAll().stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("bookingId", r.getBookingId());
            m.put("farmerId", r.getFarmerId());
            m.put("resourceType", r.getResourceType());
            m.put("rating", r.getRating());
            m.put("review", r.getReview());
            m.put("createdAt", r.getCreatedAt());

            // Farmer name
            farmerProfileRepo.findByUserId(r.getFarmerId()).ifPresentOrElse(
                fp -> m.put("farmerName", fp.getName()),
                () -> m.put("farmerName", "Unknown Farmer")
            );

            // Target name (Labourer or Equipment)
            if (r.getResourceType() == ResourceType.LABOUR) {
                labourProfileRepo.findByUserId(r.getTargetId()).ifPresentOrElse(
                    lp -> m.put("targetName", lp.getName() + " (Labour)"),
                    () -> m.put("targetName", "Unknown Labourer")
                );
            } else {
                equipmentRepo.findById(r.getTargetId()).ifPresentOrElse(
                    eq -> m.put("targetName", eq.getName() + " (Equipment)"),
                    () -> m.put("targetName", "Unknown Equipment")
                );
            }

            return m;
        }).toList();
    }

    // ---------- Broadcast notification ----------
    @PostMapping("/notify")
    public Map<String, Object> broadcast(@RequestBody Map<String, String> body) {
        String title = body.getOrDefault("title", "Announcement");
        String message = body.getOrDefault("message", "");
        Role role = body.get("role") == null ? null : Role.valueOf(body.get("role"));
        List<User> targets = role == null ? userRepo.findAll() : userRepo.findByRole(role);
        int count = 0;
        for (User u : targets) {
            if (u.getRole() == Role.ADMIN) continue;
            notifications.notify(u.getId(), title, message);
            count++;
        }
        return Map.of("sent", count);
    }

    private double nz(Double d) { return d == null ? 0 : d; }
    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }

    private void populateTransientFields(Booking b) {
        if (b == null) return;
        farmerProfileRepo.findByUserId(b.getFarmerId()).ifPresent(fp -> {
            b.setFarmerName(fp.getName());
            b.setFarmerPhone(fp.getPhone());
        });
        if (b.getResourceType() == ResourceType.LABOUR) {
            labourProfileRepo.findByUserId(b.getResourceId()).ifPresent(lp -> {
                b.setResourceName(lp.getName());
                b.setProviderName(lp.getName());
            });
        } else {
            equipmentRepo.findById(b.getResourceId()).ifPresent(eq -> {
                b.setResourceName(eq.getName());
                b.setProviderId(eq.getOwnerId());
                equipmentOwnerProfileRepo.findByUserId(eq.getOwnerId()).ifPresent(owner -> {
                    b.setProviderName(owner.getName());
                });
            });
        }
    }

    private void populateTransientFields(Payment p) {
        if (p == null) return;
        farmerProfileRepo.findByUserId(p.getFarmerId()).ifPresent(fp -> {
            p.setFarmerName(fp.getName());
        });
        userRepo.findById(p.getProviderId()).ifPresent(user -> {
            if (user.getRole() == Role.LABOUR) {
                labourProfileRepo.findByUserId(p.getProviderId()).ifPresent(lp -> {
                    p.setProviderName(lp.getName());
                });
            } else if (user.getRole() == Role.EQUIPMENT_OWNER) {
                equipmentOwnerProfileRepo.findByUserId(p.getProviderId()).ifPresent(op -> {
                    p.setProviderName(op.getName());
                });
            }
        });
    }
}
