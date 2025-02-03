package cn.soopy.tika;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;


@SpringBootApplication
@Slf4j
@EnableCaching // 启用 Spring Cache
public class TikaApplication {
    public static void main(String[] args) {
        SpringApplication.run(TikaApplication.class, args);
        log.info("Tika Server started!");
    }
}
