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
    private final AdminProfileRepository adminProfileRepo;
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
                       AdminProfileRepository adminProfileRepo,
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
        this.adminProfileRepo = adminProfileRepo;
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
        adminProfileRepo.findByUserId(userId).ifPresent(ap -> adminProfileRepo.deleteById(ap.getId()));

        // 2. Delete farms and equipments (plus equipment ratings)
        farmRepo.deleteAll(farmRepo.findByFarmerUserId(userId));
        List<Equipment> userEquipments = equipmentRepo.findByOwnerId(userId);
        for (Equipment eq : userEquipments) {
            ratingRepo.deleteAll(ratingRepo.findByTargetIdAndResourceType(eq.getId(), ResourceType.EQUIPMENT));
        }
        equipmentRepo.deleteAll(userEquipments);

        // 3. Delete notifications
        notificationRepo.deleteAll(notificationRepo.findByUserIdOrderByCreatedAtDesc(userId));

        // 4. Delete bookings and their associated payments/ratings
        List<Booking> bookings = new ArrayList<>();
        bookings.addAll(bookingRepo.findByFarmerIdOrderByCreatedAtDesc(userId));
        bookings.addAll(bookingRepo.findByProviderIdOrderByCreatedAtDesc(userId));

        for (Booking booking : bookings) {
            paymentRepo.findByBookingId(booking.getId()).forEach(paymentRepo::delete);
            ratingRepo.findByBookingId(booking.getId()).ifPresent(ratingRepo::delete);
            bookingRepo.delete(booking);
        }

        // 5. Delete any remaining direct ratings & payments associated with this user
        ratingRepo.deleteAll(ratingRepo.findByFarmerId(userId));
        ratingRepo.deleteAll(ratingRepo.findByTargetId(userId));
        paymentRepo.deleteAll(paymentRepo.findByFarmerIdOrderByCreatedAtDesc(userId));
        paymentRepo.deleteAll(paymentRepo.findByProviderIdOrderByCreatedAtDesc(userId));

        // 6. Delete the main User document from MongoDB
        userRepo.deleteById(userId);
    }
}
