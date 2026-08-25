package com.risingfield.service;

import com.risingfield.model.*;
import com.risingfield.repository.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepo;
    private final FarmerProfileRepository farmerProfileRepo;
    private final LabourProfileRepository labourProfileRepo;
    private final EquipmentOwnerProfileRepository equipmentOwnerProfileRepo;
    private final FarmRepository farmRepo;
    private final EquipmentRepository equipmentRepo;
    private final BookingRepository bookingRepo;
    private final PaymentRepository paymentRepo;
    private final RatingRepository ratingRepo;
    private final NotificationRepository notificationRepo;

    public UserService(UserRepository userRepo,
                       FarmerProfileRepository farmerProfileRepo,
                       LabourProfileRepository labourProfileRepo,
                       EquipmentOwnerProfileRepository equipmentOwnerProfileRepo,
                       FarmRepository farmRepo,
                       EquipmentRepository equipmentRepo,
                       BookingRepository bookingRepo,
                       PaymentRepository paymentRepo,
                       RatingRepository ratingRepo,
                       NotificationRepository notificationRepo) {
        this.userRepo = userRepo;
        this.farmerProfileRepo = farmerProfileRepo;
        this.labourProfileRepo = labourProfileRepo;
        this.equipmentOwnerProfileRepo = equipmentOwnerProfileRepo;
        this.farmRepo = farmRepo;
        this.equipmentRepo = equipmentRepo;
        this.bookingRepo = bookingRepo;
        this.paymentRepo = paymentRepo;
        this.ratingRepo = ratingRepo;
        this.notificationRepo = notificationRepo;
    }

    public void deleteUserCascade(Integer userId) {
        // 1. Delete profiles
        farmerProfileRepo.findByUserId(userId).ifPresent(fp -> farmerProfileRepo.deleteById(fp.getId()));
        labourProfileRepo.findByUserId(userId).ifPresent(lp -> labourProfileRepo.deleteById(lp.getId()));
        equipmentOwnerProfileRepo.findByUserId(userId).ifPresent(eop -> equipmentOwnerProfileRepo.deleteById(eop.getId()));

        // 2. Delete farms and equipments
        farmRepo.deleteAll(farmRepo.findByFarmerUserId(userId));
        equipmentRepo.deleteAll(equipmentRepo.findByOwnerId(userId));

        // 3. Delete notifications
        notificationRepo.deleteAll(notificationRepo.findByUserIdOrderByCreatedAtDesc(userId));

        // 4. Delete bookings and their payments/ratings
        List<Booking> bookings = new ArrayList<>();
        bookings.addAll(bookingRepo.findByFarmerIdOrderByCreatedAtDesc(userId));
        bookings.addAll(bookingRepo.findByProviderIdOrderByCreatedAtDesc(userId));

        for (Booking booking : bookings) {
            paymentRepo.findByBookingId(booking.getId()).forEach(paymentRepo::delete);
            ratingRepo.findByBookingId(booking.getId()).ifPresent(ratingRepo::delete);
            bookingRepo.delete(booking);
        }

        // 5. Delete the main User document
        userRepo.deleteById(userId);
    }
}
