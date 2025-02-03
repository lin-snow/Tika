package cn.soopy.tika.dto;

import lombok.Data;

import java.io.Serializable;

@Data
public class TodoPageQueryDTO implements Serializable {
    private Integer page;
    private Integer pageSize;
    private Long categoryId;
    private Integer status;
}
