package com.risingfield.web;

import com.risingfield.model.*;
import com.risingfield.repository.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** What farmers browse to book: available labour and available equipment. */
@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    // statuses that keep a resource reserved (same list as BookingService)
    private static final List<BookingStatus> BLOCKING =
            List.of(BookingStatus.PENDING, BookingStatus.ACCEPTED,
                    BookingStatus.ONGOING, BookingStatus.SUBMITTED);

    private final UserRepository userRepo;
    private final LabourProfileRepository labourProfileRepo;
    private final EquipmentRepository equipmentRepo;
    private final BookingRepository bookingRepo;
    private final RatingRepository ratingRepo;
    private final EquipmentOwnerProfileRepository equipmentOwnerProfileRepo;
    private final CategoryRepository categoryRepo;

    public CatalogController(UserRepository userRepo,
                             LabourProfileRepository labourProfileRepo,
                             EquipmentRepository equipmentRepo,
                             BookingRepository bookingRepo,
                             RatingRepository ratingRepo,
                             EquipmentOwnerProfileRepository equipmentOwnerProfileRepo,
                             CategoryRepository categoryRepo) {
        this.userRepo = userRepo;
        this.labourProfileRepo = labourProfileRepo;
        this.equipmentRepo = equipmentRepo;
        this.bookingRepo = bookingRepo;
        this.ratingRepo = ratingRepo;
        this.equipmentOwnerProfileRepo = equipmentOwnerProfileRepo;
        this.categoryRepo = categoryRepo;
    }

    /** Available labour; optional ?village= filters by village (partial, case-insensitive). */
    @GetMapping("/labour")
    public List<Map<String, Object>> labour(@RequestParam(required = false) String village) {
        return labourProfileRepo.findByAvailableTrue().stream()
                .filter(lp -> {
                    User u = userRepo.findById(lp.getUserId()).orElse(null);
                    if (u == null || !u.isActive()) return false;
                    return matchesVillage(lp.getVillage(), village);
                })
                .map(this::labourCard)
                .toList();
    }

    /** Available equipment; optional ?village= matches the OWNER's village. */
    @GetMapping("/equipment")
    public List<Map<String, Object>> equipment(@RequestParam(required = false) String village) {
        return equipmentRepo.findByAvailableTrue().stream()
                .filter(e -> {
                    User owner = userRepo.findById(e.getOwnerId()).orElse(null);
                    if (owner == null || !owner.isActive()) return false;
                    EquipmentOwnerProfile eop = equipmentOwnerProfileRepo.findByUserId(e.getOwnerId()).orElse(null);
                    return eop != null && matchesVillage(eop.getVillage(), village);
                })
                .map(this::equipmentCard)
                .toList();
    }

    private boolean matchesVillage(String userVillage, String query) {
        if (query == null || query.isBlank()) return true;
        return userVillage != null
                && userVillage.toLowerCase().contains(query.trim().toLowerCase());
    }

    /**
     * Busy info and booked date/time slots for a resource.
     */
    private void addBusyInfo(Map<String, Object> m, Integer resourceId, ResourceType resourceType) {
        List<Booking> active = bookingRepo.findByResourceIdAndResourceTypeAndStatusIn(resourceId, resourceType, BLOCKING);
        LocalDate today = LocalDate.now();
        boolean isCurrentlyBusy = false;
        LocalDate freeFrom = null;
        String busyUntilTime = null;
        List<Map<String, Object>> bookedSlots = new java.util.ArrayList<>();

        for (Booking e : active) {
            LocalDate start = e.getStartDate();
            LocalDate end = e.getEndDate() != null ? e.getEndDate() : start;
            if (start == null || end == null) continue;

            if (!end.isBefore(today)) {
                Map<String, Object> slot = new HashMap<>();
                slot.put("id", e.getId());
                slot.put("startDate", start.toString());
                slot.put("endDate", end.toString());
                slot.put("startTime", e.getStartTime());
                slot.put("endTime", e.getEndTime());
                slot.put("status", e.getStatus() != null ? e.getStatus().name() : "");
                slot.put("bookingType", e.getBookingType() != null ? e.getBookingType() : "");
                bookedSlots.add(slot);
            }

            if (!today.isBefore(start) && !today.isAfter(end)) {
                isCurrentlyBusy = true;
                if (e.getEndTime() != null) {
                    if (busyUntilTime == null || e.getEndTime().compareTo(busyUntilTime) > 0) {
                        busyUntilTime = e.getEndTime();
                    }
                }
            }
            LocalDate next = end.plusDays(1);
            if (freeFrom == null || next.isAfter(freeFrom)) freeFrom = next;
        }

        m.put("busy", isCurrentlyBusy || !bookedSlots.isEmpty());
        m.put("isCurrentlyBusy", isCurrentlyBusy);
        m.put("availableFrom", freeFrom == null ? null : freeFrom.toString());
        m.put("busyUntilTime", busyUntilTime);
        m.put("bookedSlots", bookedSlots);
    }

    private Map<String, Object> equipmentCard(Equipment e) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", e.getId());
        m.put("name", e.getName());
        String catName = e.getCategoryId() != null 
            ? categoryRepo.findById(e.getCategoryId()).map(Category::getName).orElse(null) 
            : null;
        m.put("categoryName", catName);
        m.put("description", e.getDescription());
        m.put("ratePerHour", e.getRatePerHour());
        m.put("ratePerDay", e.getRatePerDay());
        m.put("ratePerVigha", e.getRatePerVigha());
        m.put("photos", e.getPhotos());
        m.put("available", e.isAvailable());
        // owner contact
        EquipmentOwnerProfile owner = equipmentOwnerProfileRepo.findByUserId(e.getOwnerId()).orElse(null);
        m.put("ownerPhone", owner == null ? null : owner.getPhone());
        m.put("village", owner == null ? null : owner.getVillage());
        m.put("district", owner == null ? null : owner.getDistrict());
        addBusyInfo(m, e.getId(), ResourceType.EQUIPMENT);
        addRatingInfo(m, e.getId(), ResourceType.EQUIPMENT);
        return m;
    }

    private Map<String, Object> labourCard(LabourProfile lp) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", lp.getUserId());
        m.put("name", lp.getName());
        m.put("phone", lp.getPhone());
        m.put("village", lp.getVillage());
        m.put("district", lp.getDistrict());
        m.put("skills", lp.getSkills());
        m.put("ratePerHour", lp.getRatePerHour());
        m.put("ratePerDay", lp.getRatePerDay());
        m.put("ratePerVigha", lp.getRatePerVigha());
        addBusyInfo(m, lp.getUserId(), ResourceType.LABOUR);
        addRatingInfo(m, lp.getUserId(), ResourceType.LABOUR);
        return m;
    }

    private void addRatingInfo(Map<String, Object> m, Integer targetId, ResourceType type) {
        List<Rating> ratings = ratingRepo.findByTargetIdAndResourceType(targetId, type);
        double avg = 0.0;
        if (!ratings.isEmpty()) {
            avg = ratings.stream().mapToInt(Rating::getRating).average().orElse(0.0);
            avg = Math.round(avg * 10.0) / 10.0; // round to 1 decimal place
        }
        m.put("avgRating", avg > 0 ? avg : null);
        m.put("ratingCount", ratings.size());
    }
}
