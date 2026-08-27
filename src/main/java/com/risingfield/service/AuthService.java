package com.risingfield.service;

import com.risingfield.model.*;
import com.risingfield.repository.*;
import com.risingfield.security.JwtService;
import com.risingfield.web.dto.LoginRequest;
import com.risingfield.web.dto.RegisterRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.http.HttpStatus.*;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final FarmerProfileRepository farmerProfileRepo;
    private final LabourProfileRepository labourProfileRepo;
    private final AdminProfileRepository adminProfileRepo;
    private final EquipmentOwnerProfileRepository equipmentOwnerProfileRepo;
    private final FarmRepository farmRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepo,
                       FarmerProfileRepository farmerProfileRepo,
                       LabourProfileRepository labourProfileRepo,
                       AdminProfileRepository adminProfileRepo,
                       EquipmentOwnerProfileRepository equipmentOwnerProfileRepo,
                       FarmRepository farmRepo,
                       PasswordEncoder encoder,
                       JwtService jwtService) {
        this.userRepo = userRepo;
        this.farmerProfileRepo = farmerProfileRepo;
        this.labourProfileRepo = labourProfileRepo;
        this.adminProfileRepo = adminProfileRepo;
        this.equipmentOwnerProfileRepo = equipmentOwnerProfileRepo;
        this.farmRepo = farmRepo;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    public Map<String, Object> register(RegisterRequest req) {
        // ---- required for every role: full profile must be filled before the account is created ----
        if (isBlank(req.name)) throw new ResponseStatusException(BAD_REQUEST, "Name is required");
        if (isBlank(req.email)) throw new ResponseStatusException(BAD_REQUEST, "Email is required");
        if (!req.email.trim().matches("^[\\w.+-]+@[\\w-]+\\.[\\w.]+$")) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid email address");
        }
        if (isBlank(req.phone)) throw new ResponseStatusException(BAD_REQUEST, "Phone is required");
        if (!req.phone.trim().matches("^\\d{10}$")) {
            throw new ResponseStatusException(BAD_REQUEST, "Phone must be 10 digits");
        }
        if (req.password == null || req.password.length() < 6) {
            throw new ResponseStatusException(BAD_REQUEST, "Password must be at least 6 characters");
        }
        if (req.role == null) throw new ResponseStatusException(BAD_REQUEST, "Role is required");
        if (req.role == Role.ADMIN) {
            throw new ResponseStatusException(FORBIDDEN, "Admin cannot self-register");
        }
        if (isBlank(req.village)) throw new ResponseStatusException(BAD_REQUEST, "Village is required");
        if (isBlank(req.district)) throw new ResponseStatusException(BAD_REQUEST, "District is required");

        // ---- role-specific required details ----
        if (req.role == Role.FARMER) {
            if (req.farmSizeVigha == null || req.farmSizeVigha <= 0) {
                throw new ResponseStatusException(BAD_REQUEST, "Farm size (vigha) is required");
            }
        } else if (req.role == Role.LABOUR) {
            if (req.skills == null || req.skills.isEmpty()) {
                throw new ResponseStatusException(BAD_REQUEST, "Select at least one skill");
            }
            boolean anyRate = (req.ratePerHour != null && req.ratePerHour > 0)
                    || (req.ratePerDay != null && req.ratePerDay > 0)
                    || (req.ratePerVigha != null && req.ratePerVigha > 0);
            if (!anyRate) {
                throw new ResponseStatusException(BAD_REQUEST, "Set at least one rate (hour / day / vigha)");
            }
        }

        String email = req.email.trim().toLowerCase();
        if (userRepo.existsByEmail(email)) {
            throw new ResponseStatusException(CONFLICT, "Email is already registered / આ ઈમેઈલ પહેલેથી રજિસ્ટર્ડ છે");
        }

        String phone = req.phone.trim();
        if (isPhoneRegistered(phone, null)) {
            throw new ResponseStatusException(CONFLICT, "Phone number is already registered / આ ફોન નંબર પહેલેથી રજિસ્ટર્ડ છે");
        }

        User u = new User();
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(req.password));
        u.setRole(req.role);
        if (req.preferredLanguage != null) u.setPreferredLanguage(req.preferredLanguage);

        User saved = userRepo.save(u);

        // ---- save separate profile based on role ----
        if (req.role == Role.FARMER) {
            FarmerProfile fp = new FarmerProfile();
            fp.setUserId(saved.getId());
            fp.setName(req.name.trim());
            fp.setPhone(req.phone);
            fp.setVillage(req.village);
            fp.setDistrict(req.district);
            fp.setFarmSizeVigha(req.farmSizeVigha);
            FarmerProfile savedProfile = farmerProfileRepo.save(fp);

            // Auto-create a default farm for the new farmer
            Farm farm = new Farm();
            farm.setFarmerProfileId(savedProfile.getId());
            farm.setFarmerUserId(saved.getId());
            farm.setName("Main Farm");
            farm.setSizeVigha(req.farmSizeVigha);
            farmRepo.save(farm);
        } else if (req.role == Role.LABOUR) {
            LabourProfile lp = new LabourProfile();
            lp.setUserId(saved.getId());
            lp.setName(req.name.trim());
            lp.setPhone(req.phone);
            lp.setVillage(req.village);
            lp.setDistrict(req.district);
            if (req.skills != null) lp.setSkills(req.skills);
            lp.setRatePerHour(req.ratePerHour);
            lp.setRatePerDay(req.ratePerDay);
            lp.setRatePerVigha(req.ratePerVigha);
            lp.setAvailable(true);
            labourProfileRepo.save(lp);
        } else if (req.role == Role.EQUIPMENT_OWNER) {
            EquipmentOwnerProfile eop = new EquipmentOwnerProfile();
            eop.setUserId(saved.getId());
            eop.setName(req.name.trim());
            eop.setPhone(req.phone);
            eop.setVillage(req.village);
            eop.setDistrict(req.district);
            equipmentOwnerProfileRepo.save(eop);
        }

        return tokenResponse(saved);
    }

    public Map<String, Object> login(LoginRequest req) {
        if (req.email == null || req.password == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Email and password required");
        }
        User u = userRepo.findByEmail(req.email.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid credentials"));
        if (!u.isActive()) {
            throw new ResponseStatusException(FORBIDDEN, "Account is blocked. Contact admin.");
        }
        if (!encoder.matches(req.password, u.getPasswordHash())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid credentials");
        }
        return tokenResponse(u);
    }

    public void resetPassword(String email, String phone, String newPassword) {
        if (email == null || phone == null || newPassword == null || newPassword.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Email, phone and new password are required");
        }
        User u = userRepo.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "No account with this email"));

        String profilePhone = null;
        if (u.getRole() == Role.FARMER) {
            profilePhone = farmerProfileRepo.findByUserId(u.getId()).map(FarmerProfile::getPhone).orElse(null);
        } else if (u.getRole() == Role.LABOUR) {
            profilePhone = labourProfileRepo.findByUserId(u.getId()).map(LabourProfile::getPhone).orElse(null);
        } else if (u.getRole() == Role.EQUIPMENT_OWNER) {
            profilePhone = equipmentOwnerProfileRepo.findByUserId(u.getId()).map(EquipmentOwnerProfile::getPhone).orElse(null);
        }

        if (profilePhone == null || !profilePhone.trim().equals(phone.trim())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Phone number does not match our records");
        }
        u.setPasswordHash(encoder.encode(newPassword));
        userRepo.save(u);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private Map<String, Object> tokenResponse(User u) {
        String token = jwtService.generateToken(u.getId(), u.getEmail(), u.getRole().name());
        Map<String, Object> res = new HashMap<>();
        res.put("token", token);
        res.put("user", publicUser(u));
        return res;
    }

    public Map<String, Object> publicUser(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("email", u.getEmail());
        m.put("role", u.getRole());
        m.put("preferredLanguage", u.getPreferredLanguage());

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
                m.put("skills", lp.getSkills());
                m.put("available", lp.isAvailable());
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
    }

    public boolean isPhoneRegistered(String phone, Integer excludeUserId) {
        if (phone == null || phone.isBlank()) return false;
        String trimmed = phone.trim();

        var fp = farmerProfileRepo.findByPhone(trimmed);
        if (fp.isPresent() && (excludeUserId == null || !fp.get().getUserId().equals(excludeUserId))) return true;

        var lp = labourProfileRepo.findByPhone(trimmed);
        if (lp.isPresent() && (excludeUserId == null || !lp.get().getUserId().equals(excludeUserId))) return true;

        var eop = equipmentOwnerProfileRepo.findByPhone(trimmed);
        if (eop.isPresent() && (excludeUserId == null || !eop.get().getUserId().equals(excludeUserId))) return true;

        var ap = adminProfileRepo.findByPhone(trimmed);
        if (ap.isPresent() && (excludeUserId == null || !ap.get().getUserId().equals(excludeUserId))) return true;

        return false;
    }
}
