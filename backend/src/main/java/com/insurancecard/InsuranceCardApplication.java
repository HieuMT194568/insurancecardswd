package com.insurancecard;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@ConfigurationPropertiesScan
public class InsuranceCardApplication {

    public static void main(String[] args) {
        // Mọi ngày giờ nghiệp vụ (hết hạn hợp đồng, hạn nộp phạt...) tính theo giờ Việt Nam
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SpringApplication.run(InsuranceCardApplication.class, args);
    }
}
