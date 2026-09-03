package com.risingfield.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "farmer_profiles")
public class FarmerProfile {

    @Id
    private Integer id;

    @Indexed(unique = true)
    private Integer userId;

    private String name;
    private String phone;
    private String village;
    private String district;
    private Double farmSizeVigha;

    public FarmerProfile() {}

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

    public Double getFarmSizeVigha() { return farmSizeVigha; }
    public void setFarmSizeVigha(Double farmSizeVigha) { this.farmSizeVigha = farmSizeVigha; }
}
