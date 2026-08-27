package com.risingfield.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "categories")
public class Category {

    @Id
    private Integer id;
    private String name;     // English name
    private String nameGu;   // ગુજરાતી name (optional)
    private String nameHi;   // हिंदी name (optional)
    private String type;   // "WORK" or "EQUIPMENT"
    private boolean active = true;

    public Category() {}

    public Category(String name, String type) {
        this.name = name;
        this.type = type;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getNameGu() { return nameGu; }
    public void setNameGu(String nameGu) { this.nameGu = nameGu; }

    public String getNameHi() { return nameHi; }
    public void setNameHi(String nameHi) { this.nameHi = nameHi; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
