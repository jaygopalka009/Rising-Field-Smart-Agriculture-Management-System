package com.risingfield.config;

import com.risingfield.model.*;
import com.risingfield.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/** Seeds the default admin, commission settings, and starter categories. */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Map<String, String[]> DEFAULT_CATEGORIES = new LinkedHashMap<>();
    static {
        // WORK: {gujarati, hindi, type}
        DEFAULT_CATEGORIES.put("Ploughing",  new String[]{"ખેડ",       "जुताई",   "WORK"});
        DEFAULT_CATEGORIES.put("Sowing",     new String[]{"વાવણી",     "बुवाई",   "WORK"});
        DEFAULT_CATEGORIES.put("Harvesting", new String[]{"લણણી",      "कटाई",    "WORK"});
        DEFAULT_CATEGORIES.put("Weeding",    new String[]{"નિંદામણ",   "निराई",   "WORK"});
        DEFAULT_CATEGORIES.put("Irrigation", new String[]{"સિંચાઈ",    "सिंचाई",  "WORK"});
        DEFAULT_CATEGORIES.put("Spraying",   new String[]{"છંટકાવ",    "छिड़काव", "WORK"});
        // EQUIPMENT: {gujarati, hindi, type}
        DEFAULT_CATEGORIES.put("Tractor",    new String[]{"ટ્રેક્ટર",   "ट्रैक्टर",  "EQUIPMENT"});
        DEFAULT_CATEGORIES.put("Rotavator",  new String[]{"રોટાવેટર",  "રોટાવાતાર", "EQUIPMENT"});
        DEFAULT_CATEGORIES.put("Harvester",  new String[]{"હાર્વેસ્ટર", "हार्वेस्टर", "EQUIPMENT"});
        DEFAULT_CATEGORIES.put("Seed Drill", new String[]{"બીજ વાવણી યંત્ર", "बीज बुवाई यंत्र", "EQUIPMENT"});
        DEFAULT_CATEGORIES.put("Water Pump", new String[]{"પાણીનો પંપ", "पानी का पंप", "EQUIPMENT"});
        DEFAULT_CATEGORIES.put("Sprayer",    new String[]{"છંટકાવ યંત્ર", "छिड़काव यंत्र", "EQUIPMENT"});
    }

    private final UserRepository userRepo;
    private final AdminProfileRepository adminProfileRepo;
    private final CategoryRepository categoryRepo;
    private final SettingsRepository settingsRepo;
    private final PasswordEncoder encoder;

    @Value("${risingfield.admin.email}")
    private String adminEmail;
    @Value("${risingfield.admin.password}")
    private String adminPassword;

    public DataSeeder(UserRepository userRepo, AdminProfileRepository adminProfileRepo,
                      CategoryRepository categoryRepo, SettingsRepository settingsRepo,
                      PasswordEncoder encoder) {
        this.userRepo = userRepo;
        this.adminProfileRepo = adminProfileRepo;
        this.categoryRepo = categoryRepo;
        this.settingsRepo = settingsRepo;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        // default admin
        if (!userRepo.existsByEmail(adminEmail.toLowerCase())) {
            User admin = new User();
            admin.setEmail(adminEmail.toLowerCase());
            admin.setPasswordHash(encoder.encode(adminPassword));
            admin.setRole(Role.ADMIN);
            User savedAdmin = userRepo.save(admin);
            
            // Create Admin Profile
            if (adminProfileRepo.findByUserId(savedAdmin.getId()).isEmpty()) {
                AdminProfile ap = new AdminProfile();
                ap.setId(savedAdmin.getId());
                ap.setUserId(savedAdmin.getId());
                ap.setName("Administrator");
                adminProfileRepo.save(ap);
            }
            System.out.println("[Seed] Admin created: " + adminEmail + " / " + adminPassword);
        }

        // settings singleton
        if (settingsRepo.findById(Settings.SINGLETON_ID).isEmpty()) {
            settingsRepo.save(new Settings());
        }

        // starter categories (with Gujarati + Hindi meanings)
        if (categoryRepo.count() == 0) {
            DEFAULT_CATEGORIES.forEach((en, v) -> {
                Category c = new Category(en, v[2]);
                c.setNameGu(v[0]);
                c.setNameHi(v[1]);
                categoryRepo.save(c);
            });
            System.out.println("[Seed] Starter categories created (en/gu/hi)");
        } else {
            // backfill Gujarati/Hindi names onto default categories already in the DB
            int updated = 0;
            for (Category c : categoryRepo.findAll()) {
                String[] v = DEFAULT_CATEGORIES.get(c.getName());
                if (v != null && (c.getNameGu() == null || c.getNameHi() == null)) {
                    if (c.getNameGu() == null) c.setNameGu(v[0]);
                    if (c.getNameHi() == null) c.setNameHi(v[1]);
                    categoryRepo.save(c);
                    updated++;
                }
            }
            if (updated > 0) System.out.println("[Seed] Backfilled gu/hi names on " + updated + " categories");
        }
    }
}
