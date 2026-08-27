package com.risingfield.web;

import com.risingfield.model.Equipment;
import com.risingfield.model.Role;
import com.risingfield.model.User;
import com.risingfield.repository.CategoryRepository;
import com.risingfield.repository.EquipmentRepository;
import com.risingfield.security.CurrentUser;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    private final EquipmentRepository repo;
    private final CategoryRepository categoryRepo;
    private final CurrentUser currentUser;
    private final com.risingfield.repository.RatingRepository ratingRepo;

    public EquipmentController(EquipmentRepository repo, CategoryRepository categoryRepo,
                               CurrentUser currentUser,
                               com.risingfield.repository.RatingRepository ratingRepo) {
        this.repo = repo;
        this.categoryRepo = categoryRepo;
        this.currentUser = currentUser;
        this.ratingRepo = ratingRepo;
    }

    /** Owner: list my equipment. */
    @GetMapping("/mine")
    public List<Equipment> mine() {
        List<Equipment> list = repo.findByOwnerId(currentUser.id());
        list.forEach(this::fillCategoryName);
        return list;
    }

    /** Owner: add equipment. */
    @PostMapping
    public Equipment create(@RequestBody Equipment eq) {
        User u = currentUser.get();
        if (u.getRole() != Role.EQUIPMENT_OWNER) {
            throw new ResponseStatusException(FORBIDDEN, "Only equipment owners can add equipment");
        }
        eq.setId(null);
        eq.setOwnerId(u.getId());
        fillCategoryName(eq);
        return repo.save(eq);
    }

    /** Owner: edit equipment. */
    @PutMapping("/{id}")
    public Equipment update(@PathVariable Integer id, @RequestBody Equipment body) {
        Equipment eq = owned(id);
        eq.setName(body.getName());
        eq.setDescription(body.getDescription());
        eq.setRatePerHour(body.getRatePerHour());
        eq.setRatePerDay(body.getRatePerDay());
        eq.setRatePerVigha(body.getRatePerVigha());
        eq.setAvailable(body.isAvailable());
        if (body.getCategoryId() != null) eq.setCategoryId(body.getCategoryId());
        if (body.getPhotos() != null) eq.setPhotos(body.getPhotos());
        fillCategoryName(eq);
        return repo.save(eq);
    }

    /** Owner: delete equipment. */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Integer id) {
        owned(id);
        ratingRepo.deleteAll(ratingRepo.findByTargetIdAndResourceType(id, com.risingfield.model.ResourceType.EQUIPMENT));
        repo.deleteById(id);
    }

    /** Owner: toggle availability. */
    @PatchMapping("/{id}/availability")
    public Equipment availability(@PathVariable Integer id, @RequestParam boolean available) {
        Equipment eq = owned(id);
        eq.setAvailable(available);
        return repo.save(eq);
    }

    private Equipment owned(Integer id) {
        Equipment eq = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Equipment not found"));
        if (!eq.getOwnerId().equals(currentUser.id())) {
            throw new ResponseStatusException(FORBIDDEN, "Not your equipment");
        }
        fillCategoryName(eq);
        return eq;
    }

    private void fillCategoryName(Equipment eq) {
        if (eq.getCategoryId() != null) {
            categoryRepo.findById(eq.getCategoryId())
                    .ifPresent(c -> eq.setCategoryName(c.getName()));
        }
    }
}
