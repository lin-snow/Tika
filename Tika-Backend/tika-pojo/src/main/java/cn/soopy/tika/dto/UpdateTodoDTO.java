package cn.soopy.tika.dto;

import lombok.Data;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class UpdateTodoDTO implements Serializable {
    private Long id;
    private String title;
    private String content;
    private Long categoryId;
    private Integer status;
    private LocalDate dueDate;
    private Long userId;
}
