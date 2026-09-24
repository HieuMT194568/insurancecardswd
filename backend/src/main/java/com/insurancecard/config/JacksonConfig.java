package com.insurancecard.config;

import java.io.IOException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.deser.std.StdScalarDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;

@Configuration
public class JacksonConfig {

    /**
     * Mọi chuỗi JSON gửi lên đều được trim; chuỗi rỗng/chỉ có khoảng trắng -> null
     * (để @NotBlank/@NotNull bắt lỗi đúng). Trường mật khẩu dùng @RawString để giữ nguyên.
     * Spring Boot tự đăng ký mọi bean Module vào ObjectMapper.
     */
    @Bean
    public Module trimStringsModule() {
        SimpleModule module = new SimpleModule("TrimStrings");
        module.addDeserializer(String.class, new TrimmingStringDeserializer());
        return module;
    }

    static class TrimmingStringDeserializer extends StdScalarDeserializer<String> {
        TrimmingStringDeserializer() {
            super(String.class);
        }

        @Override
        public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            if (!p.hasToken(com.fasterxml.jackson.core.JsonToken.VALUE_STRING)) {
                // Số, boolean, object... gửi vào trường chuỗi -> báo lỗi kiểu dữ liệu
                return (String) ctxt.handleUnexpectedToken(String.class, p);
            }
            String trimmed = p.getText().strip();
            return trimmed.isEmpty() ? null : trimmed;
        }
    }
}
