package com.agrsmrt.webapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "labourer", schema = "agrismart", indexes = {@Index(name = "manager_id",
        columnList = "manager_id")})
public class Labourer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Size(max = 20)
    @Column(name = "nic", length = 20)
    private String nic;

    @Column(name = "daily_rate", precision = 10, scale = 2)
    private BigDecimal dailyRate;

    @Column(name = "joined_date")
    private LocalDate joinedDate;

    @Size(max = 50)
    @Column(name = "role_type", length = 50)
    private String roleType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private LabourManager manager;

}