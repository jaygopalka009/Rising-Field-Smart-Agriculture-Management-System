package com.risingfield.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "labour_profiles")
public class LabourProfile {

    @Id
    private Integer id;

    @Indexed(unique = true)
    private Integer userId;

    private String name;
    private String phone;
    private String village;
    private String district;

    private boolean available = true;
    private Double ratePerHour;
    private Double ratePerDay;
    private Double ratePerVigha;

    private List<String> skills = new ArrayList<>();

    public LabourProfile() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }

    public Double getRatePerHour() { return ratePerHour; }
    public void setRatePerHour(Double ratePerHour) { this.ratePerHour = ratePerHour; }

    public Double getRatePerDay() { return ratePerDay; }
    public void setRatePerDay(Double ratePerDay) { this.ratePerDay = ratePerDay; }

    public Double getRatePerVigha() { return ratePerVigha; }
    public void setRatePerVigha(Double ratePerVigha) { this.ratePerVigha = ratePerVigha; }

    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }
}
