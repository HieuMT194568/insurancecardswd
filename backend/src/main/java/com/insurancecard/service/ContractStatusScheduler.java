package com.insurancecard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Chạy khi khởi động và mỗi giờ: chuyển hợp đồng quá hạn sang EXPIRED, huỷ hợp đồng không thanh toán. */
@Component
public class ContractStatusScheduler {

    private static final Logger log = LoggerFactory.getLogger(ContractStatusScheduler.class);

    private final ContractService contractService;

    public ContractStatusScheduler(ContractService contractService) {
        this.contractService = contractService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        run();
    }

    @Scheduled(cron = "0 1 * * * *", zone = "Asia/Ho_Chi_Minh")
    public void run() {
        int changed = contractService.refreshStatuses();
        if (changed > 0) {
            log.info("Cập nhật trạng thái tự động cho {} hợp đồng", changed);
        }
    }
}
