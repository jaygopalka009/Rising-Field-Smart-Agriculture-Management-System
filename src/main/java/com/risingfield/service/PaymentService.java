package com.risingfield.service;

import com.risingfield.model.*;
import com.risingfield.repository.BookingRepository;
import com.risingfield.repository.PaymentRepository;
import com.risingfield.repository.SettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepo;
    private final BookingRepository bookingRepo;
    private final SettingsRepository settingsRepo;
    private final NotificationService notifications;
    private final RazorpayService razorpay;
    private final com.risingfield.repository.FarmerProfileRepository farmerProfileRepo;
    private final com.risingfield.repository.LabourProfileRepository labourProfileRepo;
    private final com.risingfield.repository.EquipmentOwnerProfileRepository equipmentOwnerProfileRepo;
    private final com.risingfield.repository.UserRepository userRepo;
    private final com.risingfield.repository.RatingRepository ratingRepo;
    private final com.risingfield.repository.EquipmentRepository equipmentRepo;

    public PaymentService(PaymentRepository paymentRepo, BookingRepository bookingRepo,
                          SettingsRepository settingsRepo, NotificationService notifications,
                          RazorpayService razorpay,
                          com.risingfield.repository.FarmerProfileRepository farmerProfileRepo,
                          com.risingfield.repository.LabourProfileRepository labourProfileRepo,
                          com.risingfield.repository.EquipmentOwnerProfileRepository equipmentOwnerProfileRepo,
                          com.risingfield.repository.UserRepository userRepo,
                          com.risingfield.repository.RatingRepository ratingRepo,
                          com.risingfield.repository.EquipmentRepository equipmentRepo) {
        this.paymentRepo = paymentRepo;
        this.bookingRepo = bookingRepo;
        this.settingsRepo = settingsRepo;
        this.notifications = notifications;
        this.razorpay = razorpay;
        this.farmerProfileRepo = farmerProfileRepo;
        this.labourProfileRepo = labourProfileRepo;
        this.equipmentOwnerProfileRepo = equipmentOwnerProfileRepo;
        this.userRepo = userRepo;
        this.ratingRepo = ratingRepo;
        this.equipmentRepo = equipmentRepo;
    }

    private double commissionPercent(RateUnit unit) {
        Settings s = settingsRepo.findById(Settings.SINGLETON_ID).orElse(null);
        if (s == null) return 10.0;
        Double p = switch (unit == null ? RateUnit.DAY : unit) {
            case HOUR -> s.getCommissionPercentHour();
            case DAY -> s.getCommissionPercentDay();
            case VIGHA -> s.getCommissionPercentVigha();
        };
        return p == null ? 10.0 : p;
    }

    public Map<String, Object> createRazorpayOrder(Integer farmerId, Integer bookingId) {
        Booking b = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Booking not found"));
        if (!farmerId.equals(b.getFarmerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.COMPLETED) {
            throw new ResponseStatusException(BAD_REQUEST, "Booking is not completed yet");
        }
        if (!paymentRepo.findByBookingId(bookingId).isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Payment already made for this booking");
        }

        double amount = b.getAmount() == null ? 0 : b.getAmount();
        if (amount <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid booking amount");
        }

        String orderId = razorpay.createOrder(amount, "booking_" + bookingId);

        Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("orderId", orderId);
        resp.put("amount", Math.round(amount * 100)); // paise, for checkout
        resp.put("currency", "INR");
        resp.put("key", razorpay.getKeyId());
        resp.put("bookingId", bookingId);
        resp.put("name", "RisingField");
        resp.put("description", "Payment for " + b.getResourceName());
        return resp;
    }

    public Payment verifyAndRecordRazorpayPayment(Integer farmerId, Integer bookingId,
                                                   String razorpayOrderId, String razorpayPaymentId,
                                                   String razorpaySignature) {
        Booking b = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Booking not found"));
        if (!farmerId.equals(b.getFarmerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (!paymentRepo.findByBookingId(bookingId).isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Payment already made for this booking");
        }

        boolean valid = razorpay.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!valid) {
            throw new ResponseStatusException(BAD_REQUEST, "Payment verification failed");
        }

        double amount = b.getAmount() == null ? 0 : b.getAmount();
        double commission = round2(amount * commissionPercent(b.getRateUnit()) / 100.0);
        double earning = round2(amount - commission);

        Payment p = new Payment();
        p.setBookingId(bookingId);
        p.setFarmerId(farmerId);
        p.setFarmerName(b.getFarmerName());
        p.setProviderId(b.getProviderId());
        p.setProviderName(b.getProviderName());
        p.setAmount(round2(amount));
        p.setCommission(commission);
        p.setProviderEarning(earning);
        p.setMethod(PaymentMethod.ONLINE);
        p.setStatus(PaymentStatus.PAID);
        p.setTransactionRef(razorpayPaymentId);
        p.setRazorpayOrderId(razorpayOrderId);
        p.setRazorpayPaymentId(razorpayPaymentId);
        p.setRazorpaySignature(razorpaySignature);

        b.setPaid(true);
        bookingRepo.save(b);

        Payment saved = paymentRepo.save(p);
        notifications.notify(b.getProviderId(), "Payment Received",
                "You earned ₹" + earning + " for " + b.getResourceName() +
                        " (commission ₹" + commission + ")");
        return saved;
    }

    public Payment pay(Integer farmerId, Integer bookingId, PaymentMethod method, Double amountOverride) {
        Booking b = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Booking not found"));
        if (!farmerId.equals(b.getFarmerId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your booking");
        }
        if (b.getStatus() != BookingStatus.COMPLETED) {
            throw new ResponseStatusException(BAD_REQUEST, "Booking is not completed yet");
        }
        if (!paymentRepo.findByBookingId(bookingId).isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Payment already made for this booking");
        }

        double amount = amountOverride != null ? amountOverride
                : (b.getAmount() == null ? 0 : b.getAmount());
        double commission = round2(amount * commissionPercent(b.getRateUnit()) / 100.0);
        double earning = round2(amount - commission);

        Payment p = new Payment();
        p.setBookingId(bookingId);
        p.setFarmerId(farmerId);
        p.setFarmerName(b.getFarmerName());
        p.setProviderId(b.getProviderId());
        p.setProviderName(b.getProviderName());
        p.setAmount(round2(amount));
        p.setCommission(commission);
        p.setProviderEarning(earning);
        p.setMethod(method);

        if (method == PaymentMethod.ONLINE) {
            p.setStatus(PaymentStatus.PAID);
            p.setTransactionRef("TXN-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        } else {
            p.setStatus(PaymentStatus.PAID);
            p.setTransactionRef("CASH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

        b.setPaid(true);
        bookingRepo.save(b);

        Payment saved = paymentRepo.save(p);
        notifications.notify(b.getProviderId(), "Payment Received",
                "You earned ₹" + earning + " for " + b.getResourceName() +
                        " (commission ₹" + commission + ")");
        return saved;
    }

    public void populateTransientFields(Payment p) {
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

    public List<Payment> forFarmer(Integer farmerId) {
        List<Payment> list = paymentRepo.findByFarmerIdOrderByCreatedAtDesc(farmerId);
        list.forEach(this::populateTransientFields);
        return list;
    }

    public List<Payment> forProvider(Integer providerId) {
        List<Payment> list = paymentRepo.findByProviderIdOrderByCreatedAtDesc(providerId);
        list.forEach(this::populateTransientFields);
        return list;
    }

    public List<Payment> all() {
        List<Payment> list = paymentRepo.findAll();
        list.forEach(this::populateTransientFields);
        return list;
    }

    public double totalEarnings(Integer providerId) {
        return round2(forProvider(providerId).stream()
                .filter(p -> p.getStatus() == PaymentStatus.PAID)
                .mapToDouble(p -> p.getProviderEarning() == null ? 0 : p.getProviderEarning())
                .sum());
    }

    public Map<String, Object> wallet(Integer providerId) {
        List<Payment> paid = forProvider(providerId).stream()
                .filter(p -> p.getStatus() == PaymentStatus.PAID)
                .toList();

        double balance = paid.stream()
                .mapToDouble(p -> p.getProviderEarning() == null ? 0 : p.getProviderEarning()).sum();
        double onlineCommission = paid.stream()
                .filter(p -> p.getMethod() == PaymentMethod.ONLINE)
                .mapToDouble(p -> p.getCommission() == null ? 0 : p.getCommission()).sum();
        double cashSettlementDue = paid.stream()
                .filter(p -> p.getMethod() == PaymentMethod.CASH)
                .mapToDouble(p -> p.getCommission() == null ? 0 : p.getCommission()).sum();

        Map<String, Object> w = new java.util.HashMap<>();
        w.put("balance", round2(balance));
        w.put("onlineCommission", round2(onlineCommission));
        w.put("cashSettlementDue", round2(cashSettlementDue));
        w.put("totalCommission", round2(onlineCommission + cashSettlementDue));
        w.put("transactions", paid.size());

        // Calculate rating statistics for Labour & Equipment Owner (for Wallet screen)
        userRepo.findById(providerId).ifPresent(user -> {
            if (user.getRole() == com.risingfield.model.Role.LABOUR) {
                List<com.risingfield.model.Rating> ratings = ratingRepo.findByTargetIdAndResourceType(providerId, com.risingfield.model.ResourceType.LABOUR);
                if (!ratings.isEmpty()) {
                    double avg = ratings.stream().mapToInt(com.risingfield.model.Rating::getRating).average().orElse(0.0);
                    avg = Math.round(avg * 10.0) / 10.0;
                    w.put("avgRating", avg);
                    w.put("ratingCount", ratings.size());
                } else {
                    w.put("avgRating", null);
                    w.put("ratingCount", 0);
                }
            } else if (user.getRole() == com.risingfield.model.Role.EQUIPMENT_OWNER) {
                List<com.risingfield.model.Equipment> eqList = equipmentRepo.findByOwnerId(providerId);
                List<com.risingfield.model.Rating> allRatings = new java.util.ArrayList<>();
                List<Map<String, Object>> eqRatings = new java.util.ArrayList<>();

                for (com.risingfield.model.Equipment eq : eqList) {
                    List<com.risingfield.model.Rating> rList = ratingRepo.findByTargetIdAndResourceType(eq.getId(), com.risingfield.model.ResourceType.EQUIPMENT);
                    allRatings.addAll(rList);
                    Map<String, Object> eqMap = new java.util.HashMap<>();
                    eqMap.put("equipmentId", eq.getId());
                    eqMap.put("equipmentName", eq.getName());
                    if (!rList.isEmpty()) {
                        double eqAvg = rList.stream().mapToInt(com.risingfield.model.Rating::getRating).average().orElse(0.0);
                        eqAvg = Math.round(eqAvg * 10.0) / 10.0;
                        eqMap.put("avgRating", eqAvg);
                        eqMap.put("ratingCount", rList.size());
                    } else {
                        eqMap.put("avgRating", null);
                        eqMap.put("ratingCount", 0);
                    }
                    eqRatings.add(eqMap);
                }

                w.put("equipmentRatings", eqRatings);
                if (!allRatings.isEmpty()) {
                    double avg = allRatings.stream().mapToInt(com.risingfield.model.Rating::getRating).average().orElse(0.0);
                    avg = Math.round(avg * 10.0) / 10.0;
                    w.put("avgRating", avg);
                    w.put("ratingCount", allRatings.size());
                } else {
                    w.put("avgRating", null);
                    w.put("ratingCount", 0);
                }
            }
        });

        return w;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
