package com.risingfield.service;

import com.risingfield.model.*;
import com.risingfield.repository.BookingRepository;
import com.risingfield.repository.EquipmentRepository;
import com.risingfield.repository.LabourProfileRepository;
import com.risingfield.repository.UserRepository;
import com.risingfield.repository.RatingRepository;
import com.risingfield.repository.EquipmentOwnerProfileRepository;
import com.risingfield.repository.FarmerProfileRepository;
import com.risingfield.repository.FarmRepository;
import com.risingfield.web.dto.BookingRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.springframework.http.HttpStatus.*;

@Service
public class BookingService {

    // Statuses that reserve a resource's time (block overlaps).
    private static final List<BookingStatus> BLOCKING =
            List.of(BookingStatus.PENDING, BookingStatus.ACCEPTED,
                    BookingStatus.ONGOING, BookingStatus.SUBMITTED);

    private final BookingRepository bookingRepo;
    private final UserRepository userRepo;
    private final LabourProfileRepository labourProfileRepo;
    private final EquipmentRepository equipmentRepo;
    private final NotificationService notifications;
    private final RatingRepository ratingRepo;
    private final EquipmentOwnerProfileRepository equipmentOwnerProfileRepo;
    private final FarmerProfileRepository farmerProfileRepo;
    private final FarmRepository farmRepo;

    public BookingService(BookingRepository bookingRepo, UserRepository userRepo,
                           LabourProfileRepository labourProfileRepo,
                           EquipmentRepository equipmentRepo, NotificationService notifications,
                           RatingRepository ratingRepo,
                           EquipmentOwnerProfileRepository equipmentOwnerProfileRepo,
                           FarmerProfileRepository farmerProfileRepo,
                           FarmRepository farmRepo) {
        this.bookingRepo = bookingRepo;
        this.userRepo = userRepo;
        this.labourProfileRepo = labourProfileRepo;
        this.equipmentRepo = equipmentRepo;
        this.notifications = notifications;
        this.ratingRepo = ratingRepo;
        this.equipmentOwnerProfileRepo = equipmentOwnerProfileRepo;
        this.farmerProfileRepo = farmerProfileRepo;
        this.farmRepo = farmRepo;
    }

    public Booking create(User farmer, BookingRequest req) {
        if (farmer.getRole() != Role.FARMER) {
            throw new ResponseStatusException(FORBIDDEN, "Only farmers can book");
        }
        if (req.resourceType == null || req.resourceId == null || req.bookingType == null
                || req.startDate == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Missing booking fields");
        }
        if (req.startDate.isBefore(java.time.LocalDate.now())) {
            throw new ResponseStatusException(BAD_REQUEST, "Past dates cannot be booked");
        }


        FarmerProfile fp = farmerProfileRepo.findByUserId(farmer.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Farmer profile not found"));

        // which price the farmer books at: HOUR / DAY / VIGHA (default DAY)
        RateUnit unit = req.rateUnit != null ? req.rateUnit : RateUnit.DAY;

        Booking b = new Booking();
        b.setRateUnit(unit);
        b.setFarmerId(farmer.getId());
        b.setFarmerName(fp.getName());
        b.setFarmerPhone(fp.getPhone());
        b.setFarmId(req.farmId);
        
        if (req.farmId != null) {
            farmRepo.findById(req.farmId).ifPresent(farm -> {
                b.setFarmerLat(farm.getLatitude());
                b.setFarmerLng(farm.getLongitude());
            });
        }
        if (b.getFarmerLat() == null) {
            List<Farm> farms = farmRepo.findByFarmerUserId(farmer.getId());
            if (farms != null && !farms.isEmpty()) {
                Farm firstFarm = farms.get(0);
                b.setFarmerLat(firstFarm.getLatitude());
                b.setFarmerLng(firstFarm.getLongitude());
            }
        }
        b.setResourceType(req.resourceType);
        b.setResourceId(req.resourceId);
        b.setBookingType(req.bookingType);
        b.setStartDate(req.startDate);
        b.setStartTime(req.startTime);
        b.setEndTime(req.endTime);
        b.setWorkType(req.workType);

        // resolve provider + rate from the resource
        if (req.resourceType == ResourceType.LABOUR) {
            LabourProfile labourProfile = labourProfileRepo.findByUserId(req.resourceId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Labour profile not found"));
            b.setResourceName(labourProfile.getName());
            b.setProviderId(labourProfile.getUserId());
            b.setProviderName(labourProfile.getName());
            b.setProviderPhone(labourProfile.getPhone());
            b.setRate(rateFor(unit, labourProfile.getRatePerHour(), labourProfile.getRatePerDay(),
                    labourProfile.getRatePerVigha()));
        } else {
            Equipment eq = equipmentRepo.findById(req.resourceId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Equipment not found"));
            b.setResourceName(eq.getName());
            b.setProviderId(eq.getOwnerId());
            EquipmentOwnerProfile owner = equipmentOwnerProfileRepo.findByUserId(eq.getOwnerId()).orElse(null);
            b.setProviderName(owner == null ? "" : owner.getName());
            b.setProviderPhone(owner == null ? null : owner.getPhone());
            b.setRate(rateFor(unit, eq.getRatePerHour(), eq.getRatePerDay(),
                    eq.getRatePerVigha()));
        }

        applyPeriod(b, req);

        ensureNoOverlap(b);

        // Calculate days
        long days = java.time.temporal.ChronoUnit.DAYS.between(b.getStartDate(), b.getEndDate()) + 1;
        if (days <= 0) days = 1;

        double qty = req.quantity != null ? req.quantity : 1.0;
        if (qty <= 0) qty = 1.0;

        double amount = 0;
        if (unit == RateUnit.DAY) {
            amount = b.getRate() * days;
            b.setQuantity(1.0);
        } else if (unit == RateUnit.HOUR) {
            amount = b.getRate() * qty * days;
            b.setQuantity(qty);
        } else if (unit == RateUnit.VIGHA) {
            amount = b.getRate() * qty;
            b.setQuantity(qty);
        }
        b.setAmount(amount);

        Booking saved = bookingRepo.save(b);

        notifications.notify(saved.getProviderId(), "New Booking Request",
                fp.getName() + " requested your " +
                        (req.resourceType == ResourceType.LABOUR ? "service" : "equipment") +
                        " (" + saved.getResourceName() + ")");
        return saved;
    }

    private void applyPeriod(Booking b, BookingRequest req) {
        if (req.endDate == null) {
            b.setEndDate(req.startDate);
        } else {
            if (req.endDate.isBefore(req.startDate)) {
                throw new ResponseStatusException(BAD_REQUEST, "End date cannot be before start date");
            }
            b.setEndDate(req.endDate);
        }
    }

    private double rateFor(RateUnit unit, Double perHour, Double perDay, Double perVigha) {
        Double r = switch (unit) {
            case HOUR -> perHour;
            case DAY -> perDay;
            case VIGHA -> perVigha;
        };
        if (r == null || r <= 0) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "No rate set for the selected unit (" + unit + ")");
        }
        return r;
    }

    private static final java.time.format.DateTimeFormatter DATE_FMT = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private void ensureNoOverlap(Booking b) {
        List<Booking> existing = bookingRepo.findByResourceIdAndResourceTypeAndStatusIn(
                b.getResourceId(), b.getResourceType(), BLOCKING);
        LocalDate newStart = b.getStartDate();
        LocalDate newEnd = b.getEndDate() != null ? b.getEndDate() : LocalDate.of(9999, 12, 31);
        for (Booking e : existing) {
            if (b.getId() != null && b.getId().equals(e.getId())) {
                continue; // ignore ourselves when editing
            }
            LocalDate exStart = e.getStartDate();
            LocalDate exEnd = e.getEndDate() != null ? e.getEndDate() : LocalDate.of(9999, 12, 31);
            boolean datesOverlap = !newStart.isAfter(exEnd) && !exStart.isAfter(newEnd);
            if (datesOverlap) {
                String range = exStart.format(DATE_FMT);
                if (e.getEndDate() != null && !e.getEndDate().equals(exStart)) {
                    range += " to " + e.getEndDate().format(DATE_FMT);
                }
                if (e.getStartTime() != null && e.getEndTime() != null) {
                    range += " (" + e.getStartTime() + " - " + e.getEndTime() + ")";
                }
                String resLabel = (b.getResourceType() == ResourceType.LABOUR ? "Labour" : "Equipment");
                throw new ResponseStatusException(CONFLICT,
                        resLabel + " is already booked for " + range + "! Double booking is not allowed. / આ સંસાધન " + range + " માટે પહેલેથી બુક થયેલ છે.");
            }
        }
    }

    public void populateTransientFields(Booking b) {
        if (b == null) return;
        farmerProfileRepo.findByUserId(b.getFarmerId()).ifPresent(fp -> {
            b.setFarmerName(fp.getName());
            b.setFarmerPhone(fp.getPhone());
        });
        if (b.getFarmId() != null) {
            farmRepo.findById(b.getFarmId()).ifPresent(farm -> {
                b.setFarmerLat(farm.getLatitude());
                b.setFarmerLng(farm.getLongitude());
            });
        } else {
            List<Farm> farms = farmRepo.findByFarmerUserId(b.getFarmerId());
            if (farms != null && !farms.isEmpty()) {
                Farm firstFarm = farms.get(0);
                b.setFarmerLat(firstFarm.getLatitude());
                b.setFarmerLng(firstFarm.getLongitude());
            }
        }
        ratingRepo.findByBookingId(b.getId()).ifPresent(r -> b.setRating(r.getRating()));
        if (b.getResourceType() == ResourceType.LABOUR) {
            labourProfileRepo.findByUserId(b.getResourceId()).ifPresent(lp -> {
                b.setResourceName(lp.getName());
                b.setProviderName(lp.getName());
                b.setProviderPhone(lp.getPhone());
            });
        } else {
            equipmentRepo.findById(b.getResourceId()).ifPresent(eq -> {
                b.setResourceName(eq.getName());
                b.setProviderId(eq.getOwnerId());
                equipmentOwnerProfileRepo.findByUserId(eq.getOwnerId()).ifPresent(owner -> {
                    b.setProviderName(owner.getName());
                    b.setProviderPhone(owner.getPhone());
                });
            });
        }
    }

    public List<Booking> forFarmer(Integer farmerId) {
        List<Booking> list = bookingRepo.findByFarmerIdOrderByCreatedAtDesc(farmerId);
        list.forEach(this::populateTransientFields);
        return list;
    }

    public List<Booking> forProvider(Integer providerId) {
        List<Booking> list = bookingRepo.findByProviderIdOrderByCreatedAtDesc(providerId);
        list.forEach(this::populateTransientFields);
        return list;
    }

    public Booking get(Integer id) {
        Booking b = bookingRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Booking not found"));
        populateTransientFields(b);
        return b;
    }

    public Booking respond(Integer bookingId, Integer providerId, boolean accept) {
        Booking b = get(bookingId);
        if (!providerId.equals(b.getProviderId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(BAD_REQUEST, "Booking is not pending");
        }
        b.setStatus(accept ? BookingStatus.ACCEPTED : BookingStatus.REJECTED);
        Booking saved = bookingRepo.save(b);
        notifications.notify(b.getFarmerId(),
                "Booking " + (accept ? "Accepted" : "Rejected"),
                b.getResourceName() + " booking was " + (accept ? "accepted" : "rejected"));
        return saved;
    }

    public Booking start(Integer bookingId, Integer providerId) {
        Booking b = get(bookingId);
        if (!providerId.equals(b.getProviderId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.ACCEPTED) {
            throw new ResponseStatusException(BAD_REQUEST, "Booking must be accepted first");
        }
        b.setStatus(BookingStatus.ONGOING);
        Booking saved = bookingRepo.save(b);
        notifications.notify(b.getFarmerId(), "Work Started",
                b.getResourceName() + " work has started");
        return saved;
    }

    public Booking submitWork(Integer bookingId, Integer providerId, String photo) {
        Booking b = get(bookingId);
        if (!providerId.equals(b.getProviderId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.ONGOING && b.getStatus() != BookingStatus.ACCEPTED
                && b.getStatus() != BookingStatus.SUBMITTED) {
            throw new ResponseStatusException(BAD_REQUEST, "Work can be submitted only after it is started");
        }
        if (photo == null || photo.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "A work-completion photo is required");
        }
        b.setCompletionPhoto(photo);
        b.setStatus(BookingStatus.SUBMITTED);
        b.setRejectionReason(null); // Clear rejection reason on new submission
        Booking saved = bookingRepo.save(b);
        notifications.notify(b.getFarmerId(), "Work Submitted",
                b.getProviderName() + " finished " + b.getResourceName() +
                        " and sent a photo. Please review and approve.");
        return saved;
    }

    public Booking approve(Integer bookingId, Integer farmerId, LocalDate today) {
        Booking b = get(bookingId);
        if (!farmerId.equals(b.getFarmerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.SUBMITTED) {
            throw new ResponseStatusException(BAD_REQUEST, "Nothing submitted to approve yet");
        }
        b.setStatus(BookingStatus.COMPLETED);
        if (b.getEndDate() == null) b.setEndDate(today);
        Booking saved = bookingRepo.save(b);
        notifications.notify(b.getProviderId(), "Work Approved",
                b.getFarmerName() + " approved " + b.getResourceName() + ". Awaiting payment.");
        return saved;
    }

    public Booking complete(Integer bookingId, Integer providerId, LocalDate today) {
        Booking b = get(bookingId);
        if (!providerId.equals(b.getProviderId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.ONGOING && b.getStatus() != BookingStatus.ACCEPTED) {
            throw new ResponseStatusException(BAD_REQUEST, "Booking cannot be completed from current state");
        }
        b.setStatus(BookingStatus.COMPLETED);
        if (b.getEndDate() == null) b.setEndDate(today);
        Booking saved = bookingRepo.save(b);
        notifications.notify(b.getFarmerId(), "Work Completed",
                b.getResourceName() + " work is completed. Please make payment.");
        return saved;
    }

    public Booking cancel(Integer bookingId, Integer farmerId) {
        Booking b = get(bookingId);
        if (!farmerId.equals(b.getFarmerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.PENDING && b.getStatus() != BookingStatus.ACCEPTED) {
            throw new ResponseStatusException(BAD_REQUEST, "Cannot cancel now");
        }
        b.setStatus(BookingStatus.CANCELLED);
        Booking saved = bookingRepo.save(b);
        notifications.notify(b.getProviderId(), "Booking Cancelled",
                b.getFarmerName() + " cancelled the booking for " + b.getResourceName());
        return saved;
    }
    public Booking rejectWork(Integer bookingId, Integer farmerId, String reason) {
        Booking b = get(bookingId);
        if (!farmerId.equals(b.getFarmerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.SUBMITTED) {
            throw new ResponseStatusException(BAD_REQUEST, "Nothing submitted to reject yet");
        }
        b.setStatus(BookingStatus.ONGOING);
        b.setRejectionReason(reason);
        Booking saved = bookingRepo.save(b);
        notifications.notify(b.getProviderId(), "Work Rejected",
                b.getFarmerName() + " did not approve the work for " + b.getResourceName() +
                        ". Reason: " + (reason != null && !reason.isBlank() ? reason : "Please complete the work properly."));
        return saved;
    }

    public List<Booking> all() {
        List<Booking> list = bookingRepo.findAll();
        list.forEach(this::populateTransientFields);
        return list;
    }

    public Booking rate(Integer bookingId, Integer farmerId, Integer ratingValue, String review) {
        Booking b = get(bookingId);
        if (!farmerId.equals(b.getFarmerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.COMPLETED) {
            throw new ResponseStatusException(BAD_REQUEST, "Booking is not completed yet");
        }
        if (ratingValue == null || ratingValue < 1 || ratingValue > 10) {
            throw new ResponseStatusException(BAD_REQUEST, "Rating must be between 1 and 10");
        }
        if (ratingRepo.findByBookingId(bookingId).isPresent()) {
            throw new ResponseStatusException(CONFLICT, "This booking has already been rated");
        }

        Rating r = new Rating();
        r.setBookingId(bookingId);
        r.setFarmerId(farmerId);
        r.setTargetId(b.getResourceId());
        r.setResourceType(b.getResourceType());
        r.setRating(ratingValue);
        r.setReview(review);
        ratingRepo.save(r);
        Booking saved = bookingRepo.save(b);

        notifications.notify(b.getProviderId(), "Rating Received",
                "Farmer rated your service " + ratingValue + "/10 for " + b.getResourceName());
        return saved;
    }

    public Booking update(User farmer, Integer bookingId, BookingRequest req) {
        Booking b = get(bookingId);
        if (!b.getFarmerId().equals(farmer.getId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.PENDING && b.getStatus() != BookingStatus.ACCEPTED) {
            throw new ResponseStatusException(BAD_REQUEST, "Cannot update booking in status: " + b.getStatus());
        }

        RateUnit unit = req.rateUnit != null ? req.rateUnit : b.getRateUnit();
        b.setRateUnit(unit);
        b.setBookingType(req.bookingType);
        b.setStartDate(req.startDate);
        b.setEndDate(req.endDate);
        b.setStartTime(req.startTime);
        b.setEndTime(req.endTime);
        b.setWorkType(req.workType);
        if (req.farmerLat != null) b.setFarmerLat(req.farmerLat);
        if (req.farmerLng != null) b.setFarmerLng(req.farmerLng);
        if (req.farmId != null) b.setFarmId(req.farmId);

        if (b.getResourceType() == ResourceType.LABOUR) {
            LabourProfile labourProfile = labourProfileRepo.findByUserId(b.getResourceId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Labour profile not found"));
            b.setRate(rateFor(unit, labourProfile.getRatePerHour(), labourProfile.getRatePerDay(),
                    labourProfile.getRatePerVigha()));
        } else {
            Equipment eq = equipmentRepo.findById(b.getResourceId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Equipment not found"));
            b.setRate(rateFor(unit, eq.getRatePerHour(), eq.getRatePerDay(),
                    eq.getRatePerVigha()));
        }

        applyPeriod(b, req);

        long days = java.time.temporal.ChronoUnit.DAYS.between(b.getStartDate(), b.getEndDate()) + 1;
        if (days <= 0) days = 1;

        double qty = req.quantity != null ? req.quantity : (b.getQuantity() != null ? b.getQuantity() : 1.0);
        if (qty <= 0) qty = 1.0;

        double amount = 0;
        if (unit == RateUnit.DAY) {
            amount = b.getRate() * days;
            b.setQuantity(1.0);
        } else if (unit == RateUnit.HOUR) {
            amount = b.getRate() * qty * days;
            b.setQuantity(qty);
        } else if (unit == RateUnit.VIGHA) {
            amount = b.getRate() * qty;
            b.setQuantity(qty);
        }
        b.setAmount(amount);

        ensureNoOverlap(b);

        Booking saved = bookingRepo.save(b);
        notifications.notify(saved.getProviderId(), "Booking Updated",
                "Farmer updated the booking details for " + saved.getResourceName());
        return saved;
    }
}
