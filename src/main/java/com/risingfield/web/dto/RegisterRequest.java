package com.risingfield.web.dto;

import com.risingfield.model.Role;

import java.util.List;

public class RegisterRequest {
    public String name;
    public String email;
    public String phone;
    public String password;
    public Role role;                 // FARMER / LABOUR / EQUIPMENT_OWNER
    public String preferredLanguage;  // en / gu / hi

    // location (all roles)
    public String village;
    public String district;
    public Double latitude;
    public Double longitude;

    // farmer optional
    public Double farmSizeVigha;

    // labour optional — separate price per unit (hour / day / vigha)
    public List<String> skills;
    public Double ratePerHour;
    public Double ratePerDay;
    public Double ratePerVigha;
}
