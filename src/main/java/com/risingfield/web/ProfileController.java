package com.risingfield.web;

import com.risingfield.model.*;
import com.risingfield.repository.*;
import com.risingfield.security.CurrentUser;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.risingfield.service.UserService;
import com.risingfield.service.AuthService;

import java.util.*;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepo;
    private final FarmerProfileRepository farmerProfileRepo;
    private final LabourProfileRepository labourProfileRepo;
    private final FarmRepository farmRepo;
    private final EquipmentRepository equipmentRepo;
    private final NotificationRepository notificationRepo;
    private final EquipmentOwnerProfileRepository equipmentOwnerProfileRepo;
    private final AdminProfileRepository adminProfileRepo;
    private final CurrentUser currentUser;
    private final UserService userService;
    private final AuthService authService;

    public ProfileController(UserRepository userRepo,
                             FarmerProfileRepository farmerProfileRepo,
                             LabourProfileRepository labourProfileRepo,
                             FarmRepository farmRepo,
                             EquipmentRepository equipmentRepo,
                             NotificationRepository notificationRepo,
                             EquipmentOwnerProfileRepository equipmentOwnerProfileRepo,
                             AdminProfileRepository adminProfileRepo,
                             CurrentUser currentUser,
                             UserService userService,
                             AuthService authService) {
        this.userRepo = userRepo;
        this.farmerProfileRepo = farmerProfileRepo;
        this.labourProfileRepo = labourProfileRepo;
        this.farmRepo = farmRepo;
        this.equipmentRepo = equipmentRepo;
        this.notificationRepo = notificationRepo;
        this.equipmentOwnerProfileRepo = equipmentOwnerProfileRepo;
        this.adminProfileRepo = adminProfileRepo;
        this.currentUser = currentUser;
        this.userService = userService;
        this.authService = authService;
    }

    @GetMapping
    public Map<String, Object> me() {
        User u = currentUser.get();
        return getMergedProfile(u);
    }

    @PutMapping
    public Map<String, Object> update(@RequestBody Map<String, Object> body) {
        User u = currentUser.get();
        if (body.containsKey("preferredLanguage")) {
            u.setPreferredLanguage((String) body.get("preferredLanguage"));
            userRepo.save(u);
        }

        if (body.containsKey("phone")) {
            String newPhone = (String) body.get("phone");
            if (newPhone != null && !newPhone.isBlank()) {
                newPhone = newPhone.trim();
                if (!newPhone.matches("^\\d{10}$")) {
                    throw new ResponseStatusException(BAD_REQUEST, "Phone number must be 10 digits / ફોન નંબર ૧૦ અંકનો હોવો જોઈએ");
                }
                if (authService.isPhoneRegistered(newPhone, u.getId())) {
                    throw new ResponseStatusException(CONFLICT, "Phone number is already registered / આ ફોન નંબર પહેલેથી રજિસ્ટર્ડ છે");
                }
            }
        }

        // Update role-specific fields
        if (u.getRole() == Role.FARMER) {
            FarmerProfile fp = farmerProfileRepo.findByUserId(u.getId()).orElseGet(() -> {
                FarmerProfile newFp = new FarmerProfile();
                newFp.setUserId(u.getId());
                return newFp;
            });
            if (body.containsKey("name")) fp.setName((String) body.get("name"));
            if (body.containsKey("phone")) fp.setPhone((String) body.get("phone"));
            if (body.containsKey("village")) fp.setVillage((String) body.get("village"));
            if (body.containsKey("district")) fp.setDistrict((String) body.get("district"));
            if (body.containsKey("farmSizeVigha")) fp.setFarmSizeVigha(toDouble(body.get("farmSizeVigha")));
            farmerProfileRepo.save(fp);
        } else if (u.getRole() == Role.LABOUR) {
            LabourProfile lp = labourProfileRepo.findByUserId(u.getId()).orElseGet(() -> {
                LabourProfile newLp = new LabourProfile();
                newLp.setUserId(u.getId());
                return newLp;
            });
            if (body.containsKey("name")) lp.setName((String) body.get("name"));
            if (body.containsKey("phone")) lp.setPhone((String) body.get("phone"));
            if (body.containsKey("village")) lp.setVillage((String) body.get("village"));
            if (body.containsKey("district")) lp.setDistrict((String) body.get("district"));
            if (body.containsKey("skills")) {
                //noinspection unchecked
                lp.setSkills((List<String>) body.get("skills"));
            }
            if (body.containsKey("available")) lp.setAvailable(Boolean.TRUE.equals(body.get("available")));
            if (body.containsKey("ratePerHour")) lp.setRatePerHour(toDouble(body.get("ratePerHour")));
            if (body.containsKey("ratePerDay")) lp.setRatePerDay(toDouble(body.get("ratePerDay")));
            if (body.containsKey("ratePerVigha")) lp.setRatePerVigha(toDouble(body.get("ratePerVigha")));
            labourProfileRepo.save(lp);
        } else if (u.getRole() == Role.EQUIPMENT_OWNER) {
            EquipmentOwnerProfile eop = equipmentOwnerProfileRepo.findByUserId(u.getId()).orElseGet(() -> {
                EquipmentOwnerProfile newEop = new EquipmentOwnerProfile();
                newEop.setUserId(u.getId());
                return newEop;
            });
            if (body.containsKey("name")) eop.setName((String) body.get("name"));
            if (body.containsKey("phone")) eop.setPhone((String) body.get("phone"));
            if (body.containsKey("village")) eop.setVillage((String) body.get("village"));
            if (body.containsKey("district")) eop.setDistrict((String) body.get("district"));
            equipmentOwnerProfileRepo.save(eop);
        } else if (u.getRole() == Role.ADMIN) {
            AdminProfile ap = adminProfileRepo.findByUserId(u.getId()).orElseGet(() -> {
                AdminProfile newAp = new AdminProfile();
                newAp.setUserId(u.getId());
                return newAp;
            });
            if (body.containsKey("name")) ap.setName((String) body.get("name"));
            if (body.containsKey("phone")) ap.setPhone((String) body.get("phone"));
            adminProfileRepo.save(ap);
        }

        return getMergedProfile(u);
    }

    // ---- Farmer farms management endpoints ----
    @GetMapping("/farms")
    public List<Farm> getFarms() {
        User u = currentUser.get();
        if (u.getRole() != Role.FARMER) {
            throw new ResponseStatusException(FORBIDDEN, "Only farmers have farms");
        }
        return farmRepo.findByFarmerUserId(u.getId());
    }

    @PostMapping("/farms")
    public Farm addFarm(@RequestBody Map<String, Object> body) {
        User u = currentUser.get();
        if (u.getRole() != Role.FARMER) {
            throw new ResponseStatusException(FORBIDDEN, "Only farmers can add farms");
        }
        FarmerProfile fp = farmerProfileRepo.findByUserId(u.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Farmer profile not found"));

        Farm farm = new Farm();
        farm.setFarmerProfileId(fp.getId());
        farm.setFarmerUserId(u.getId());
        farm.setName((String) body.get("name"));
        farm.setSizeVigha(toDouble(body.get("sizeVigha")));

        return farmRepo.save(farm);
    }

    @PutMapping("/farms/{id}")
    public Farm updateFarm(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        User u = currentUser.get();
        if (u.getRole() != Role.FARMER) {
            throw new ResponseStatusException(FORBIDDEN, "Only farmers can update farms");
        }
        Farm farm = farmRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Farm not found"));

        if (!u.getId().equals(farm.getFarmerUserId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your farm");
        }

        if (body.containsKey("name")) farm.setName((String) body.get("name"));
        if (body.containsKey("sizeVigha")) farm.setSizeVigha(toDouble(body.get("sizeVigha")));



        return farmRepo.save(farm);
    }

    @DeleteMapping("/farms/{id}")
    public Map<String, Object> deleteFarm(@PathVariable Integer id) {
        User u = currentUser.get();
        if (u.getRole() != Role.FARMER) {
            throw new ResponseStatusException(FORBIDDEN, "Only farmers can delete farms");
        }
        Farm farm = farmRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Farm not found"));

        if (!u.getId().equals(farm.getFarmerUserId())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your farm");
        }

        farmRepo.delete(farm);
        return Map.of("message", "Farm deleted");
    }



    // ---- Labour availability toggle ----
    @PatchMapping("/availability")
    public Map<String, Object> setAvailability(@RequestParam boolean available) {
        User u = currentUser.get();
        if (u.getRole() != Role.LABOUR) {
            throw new ResponseStatusException(FORBIDDEN, "Only labour has availability");
        }
        LabourProfile lp = labourProfileRepo.findByUserId(u.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Labour profile not found"));
        lp.setAvailable(available);
        labourProfileRepo.save(lp);
        return getMergedProfile(u);
    }

    // ---- Delete own account ----
    @DeleteMapping
    public Map<String, Object> deleteAccount() {
        User u = currentUser.get();
        if (u.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(FORBIDDEN, "Admin account cannot be deleted");
        }
        userService.deleteUserCascade(u.getId());
        return Map.of("message", "Account deleted");
    }

    private Double toDouble(Object o) {
        if (o == null) return null;
        return Double.valueOf(o.toString());
    }



    private Map<String, Object> getMergedProfile(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("email", u.getEmail());
        m.put("role", u.getRole());
        m.put("preferredLanguage", u.getPreferredLanguage());
        if (u.getRole() == Role.FARMER) {
            FarmerProfile fp = farmerProfileRepo.findByUserId(u.getId()).orElse(null);
            if (fp != null) {
                m.put("name", fp.getName());
                m.put("phone", fp.getPhone());
                m.put("village", fp.getVillage());
                m.put("district", fp.getDistrict());
                m.put("farmSizeVigha", fp.getFarmSizeVigha());
            }
        } else if (u.getRole() == Role.LABOUR) {
            LabourProfile lp = labourProfileRepo.findByUserId(u.getId()).orElse(null);
            if (lp != null) {
                m.put("name", lp.getName());
                m.put("phone", lp.getPhone());
                m.put("village", lp.getVillage());
                m.put("district", lp.getDistrict());
                m.put("available", lp.isAvailable());
                m.put("ratePerHour", lp.getRatePerHour());
                m.put("ratePerDay", lp.getRatePerDay());
                m.put("ratePerVigha", lp.getRatePerVigha());
                m.put("skills", lp.getSkills());
            }
        } else if (u.getRole() == Role.EQUIPMENT_OWNER) {
            EquipmentOwnerProfile eop = equipmentOwnerProfileRepo.findByUserId(u.getId()).orElse(null);
            if (eop != null) {
                m.put("name", eop.getName());
                m.put("phone", eop.getPhone());
                m.put("village", eop.getVillage());
                m.put("district", eop.getDistrict());
            }
        } else if (u.getRole() == Role.ADMIN) {
            AdminProfile ap = adminProfileRepo.findByUserId(u.getId()).orElse(null);
            if (ap != null) {
                m.put("name", ap.getName());
                m.put("phone", ap.getPhone());
            }
        }
        return m;
    }
}
