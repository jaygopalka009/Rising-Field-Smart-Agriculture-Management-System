package com.risingfield.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "settings")
public class Settings {

    public static final Integer SINGLETON_ID = 1;

    @Id
    private Integer id = SINGLETON_ID;

    private Double commissionPercentHour = 10.0;
    private Double commissionPercentDay = 10.0;
    private Double commissionPercentVigha = 10.0;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Double getCommissionPercentHour() { return commissionPercentHour; }
    public void setCommissionPercentHour(Double commissionPercentHour) { this.commissionPercentHour = commissionPercentHour; }

    public Double getCommissionPercentDay() { return commissionPercentDay; }
    public void setCommissionPercentDay(Double commissionPercentDay) { this.commissionPercentDay = commissionPercentDay; }

    public Double getCommissionPercentVigha() { return commissionPercentVigha; }
    public void setCommissionPercentVigha(Double commissionPercentVigha) { this.commissionPercentVigha = commissionPercentVigha; }
}
