package com.insurancecard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.insurancecard.config.AppProperties;

/**
 * Gửi email qua SMTP khi app.mail.enabled=true. Ở chế độ demo (mặc định) chỉ ghi log
 * nội dung email; link xác thực được trả về cho frontend qua trường devLink.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final AppProperties props;
    private final ObjectProvider<JavaMailSender> mailSender;

    public MailService(AppProperties props, ObjectProvider<JavaMailSender> mailSender) {
        this.props = props;
        this.mailSender = mailSender;
    }

    public boolean isDemoMode() {
        return !props.mail().enabled();
    }

    public void send(String to, String subject, String body) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (isDemoMode() || sender == null) {
            log.info("[DEMO MAIL] To: {} | Subject: {}\n{}", to, subject, body);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(props.mail().from());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
        } catch (Exception e) {
            // Không làm hỏng giao dịch nghiệp vụ vì lỗi SMTP; người dùng có thể yêu cầu gửi lại.
            log.error("Gửi email tới {} thất bại: {}", to, e.getMessage());
        }
    }
}
