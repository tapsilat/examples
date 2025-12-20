package com.tapsilat.example.config;

import com.tapsilat.TapsilatClient;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TapsilatAppConfig {

    @Bean
    public TapsilatClient tapsilatClient() {
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        String apiKey = System.getenv("TAPSILAT_API_KEY");
        if (apiKey == null || apiKey.isEmpty()) {
            apiKey = dotenv.get("TAPSILAT_API_KEY");
        }

        if (apiKey == null || apiKey.isEmpty()) {
            throw new RuntimeException("TAPSILAT_API_KEY is not set in environment or .env file");
        }

        System.out.println("TapsilatClient initialized with API Key: " + apiKey.substring(0, 10) + "...");

        com.tapsilat.config.TapsilatConfig config = new com.tapsilat.config.TapsilatConfig();
        config.setBearerToken(apiKey);
        return new TapsilatClient(config);
    }
}
