package cn.soopy.tika.dto;

import lombok.Data;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class TodoDTO implements Serializable {
    private String title;
    private String content;
    private LocalDate dueDate;
    private Long categoryId;
}
