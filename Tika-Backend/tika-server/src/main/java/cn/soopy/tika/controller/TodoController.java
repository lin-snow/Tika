package cn.soopy.tika.controller;

import cn.soopy.tika.context.BaseContext;
import cn.soopy.tika.dto.TodoDTO;
import cn.soopy.tika.dto.TodoPageQueryDTO;
import cn.soopy.tika.dto.UpdateTodoDTO;
import cn.soopy.tika.result.PageResult;
import cn.soopy.tika.result.Result;
import cn.soopy.tika.service.TodoService;
import cn.soopy.tika.vo.CategoryVO;
import cn.soopy.tika.vo.TodoVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/todo")
@Slf4j
public class TodoController {

    @Autowired
    TodoService todoService;
    @Autowired
    private RedisTemplate<Object, Object> redisTemplate;


    /**
     * 添加to do
     * @param todoDTO
     * @return
     */
    @PostMapping("/addTodo")
    public Result addTodo(@RequestBody TodoDTO todoDTO) {
        todoService.addTodo(todoDTO);

        cleanCache("todos::user_" + BaseContext.getCurrentId() + "_*");
        return Result.success();
    }

    /**
     * 获取用户的分类数据
     * @return
     */
    @GetMapping("/categories")
//    @Cacheable(cacheNames = "categories", key = "'user_categories_' + #root.method")
    public Result<List<CategoryVO>> getCategories() {
        log.info("获取用户分类数据...");
        List<CategoryVO> list = todoService.getCategories();
        return Result.success(list);
    }

    /**
     * to do 分页查询
     * @return
     */
    @GetMapping("/page")
    @Cacheable(
            cacheNames = "todos",
            key = "'user_' + T(cn.soopy.tika.context.BaseContext).getCurrentId() + '_page_' + #todoPageQueryDTO.page + '_' + #todoPageQueryDTO.pageSize"
    )
    public Result<PageResult<TodoVO>> pageTodo(TodoPageQueryDTO todoPageQueryDTO) {
        PageResult<TodoVO> pageResult = todoService.pageQuery(todoPageQueryDTO);
        return Result.success(pageResult);
    }

    /**
     * to do 删除
     * @param id
     * @return
     */
    @DeleteMapping("/deleteTodo/{id}")
    @CacheEvict(cacheNames = "todos", allEntries = true) // 清空 todos 缓存
    public Result deleteTodo(@PathVariable Long id) {
        todoService.deleteTodo(id);
        return Result.success();
    }

    /**
     * 更新to do
     * @param updateTodoDTO
     * @return
     */
    @PutMapping("/updateTodo")
    @CacheEvict(cacheNames = "todos", allEntries = true) // 清空 todos 缓存
    public Result updateTodo(@RequestBody UpdateTodoDTO updateTodoDTO) {
        todoService.udpateTodo(updateTodoDTO);
        return Result.success();
    }

    /**
     * 清理缓存数据
     * @param pattern
     */
    private void cleanCache(String pattern) {
        Set<Object> keys = redisTemplate.keys(pattern);
        redisTemplate.delete(keys);
    }
}
