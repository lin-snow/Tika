package cn.soopy.tika.service.impl;

import cn.soopy.tika.constant.CategoryConstant;
import cn.soopy.tika.constant.MessageConstant;
import cn.soopy.tika.constant.StatusConstant;
import cn.soopy.tika.context.BaseContext;
import cn.soopy.tika.dto.TodoDTO;
import cn.soopy.tika.dto.TodoPageQueryDTO;
import cn.soopy.tika.dto.UpdateTodoDTO;
import cn.soopy.tika.entity.Category;
import cn.soopy.tika.entity.Todo;
import cn.soopy.tika.exception.BaseException;
import cn.soopy.tika.mapper.CategoryMapper;
import cn.soopy.tika.mapper.TodoMapper;
import cn.soopy.tika.result.PageResult;
import cn.soopy.tika.service.TodoService;
import cn.soopy.tika.vo.CategoryVO;
import cn.soopy.tika.vo.TodoVO;
import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TodoServiceImpl implements TodoService {
    @Autowired
    CategoryMapper categoryMapper;
    @Autowired
    TodoMapper todoMapper;


    /**
     * 添加to do
     * @param todoDTO
     */
    public void addTodo(TodoDTO todoDTO) {
        if (todoDTO.getTitle() == null || todoDTO.getTitle().isEmpty()) {
            throw new BaseException(MessageConstant.EMPTY_TITLE);
        }

        Todo todo = Todo.builder()
                .title(todoDTO.getTitle())
                .content(todoDTO.getContent())
                .categoryId(todoDTO.getCategoryId() != null ? todoDTO.getCategoryId() : categoryMapper.getDefaultCategoryId(BaseContext.getCurrentId(), CategoryConstant.DEFAULT_CATEGORY))
                .dueDate(todoDTO.getDueDate() == null ? null : todoDTO.getDueDate())
                .status(StatusConstant.ENABLED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .userId(BaseContext.getCurrentId())
                .build();

        todoMapper.insert(todo);
    }

    @Override
    public PageResult<TodoVO> pageQuery(TodoPageQueryDTO todoPageQueryDTO) {
        log.info("Todo分页查询: {}", todoPageQueryDTO);
        PageHelper.startPage(todoPageQueryDTO.getPage(), todoPageQueryDTO.getPageSize());
        Page<TodoVO> page = todoMapper.pageQuery(todoPageQueryDTO);
        return new PageResult<TodoVO>(page.getTotal(), page.getResult());
    }

    /**
     * 删除to do
     * @param id
     */
    public void deleteTodo(Long id) {
        todoMapper.deleteTodo(id);
    }

    /**
     * 更新to do
     * @param updateTodoDTO
     */
    public void udpateTodo(UpdateTodoDTO updateTodoDTO) {
        Todo todo = Todo.builder()
                .id(updateTodoDTO.getId())
                .title(updateTodoDTO.getTitle())
                .content(updateTodoDTO.getContent())
                .status(updateTodoDTO.getStatus())
                .dueDate(updateTodoDTO.getDueDate())
                .updatedAt(LocalDateTime.now())
                .categoryId(updateTodoDTO.getCategoryId())
                .userId(BaseContext.getCurrentId())
                .build();

        todoMapper.update(todo);
    }

    /**
     * 获取用户的分类数据
     * @return
     */
    public List<CategoryVO> getCategories() {
        List<Category> categories = categoryMapper.getCategoriesByUserId(BaseContext.getCurrentId());

        return categories.stream()
                .map(category -> new CategoryVO(category.getId(), category.getName()))
                .collect(Collectors.toList());
    }
}
